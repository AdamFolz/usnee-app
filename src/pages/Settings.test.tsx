import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptData } from '../utils/crypto';
import Settings from './Settings';

const { getEntries, createObjectURL } = vi.hoisted(() => ({
  getEntries: vi.fn(),
  createObjectURL: vi.fn((..._args: unknown[]): string => 'blob:mock')
}));

vi.mock('../utils/db', () => ({
  getEntries: () => getEntries(),
  resetUserData: vi.fn(async () => undefined),
  importEntriesLocalOnly: vi.fn()
}));

vi.mock('../utils/crypto', () => ({
  hashPin: vi.fn(),
  verifyPin: vi.fn(),
  encryptData: vi.fn(),
  decryptData: vi.fn()
}));

vi.mock('../stores/appStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({
      settings: { pinHash: undefined, dailyLimit: undefined, limitSubstance: undefined, onboardingCompleted: true },
      updateSettings: vi.fn(),
      refreshEntries: vi.fn(async () => undefined),
      todayCount: 0
    })
}));

function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(blob);
  });
}

const makeSpies = () => ({
  alert: vi.spyOn(window, 'alert').mockImplementation(() => undefined),
  prompt: vi.spyOn(window, 'prompt').mockImplementation(() => 'secret-pass')
});

describe('Settings export (SEC: never silently downgrade to plaintext)', () => {
  let spies: ReturnType<typeof makeSpies>;

  beforeEach(() => {
    getEntries.mockResolvedValue([{ id: 'e1' }]);
    vi.mocked(encryptData).mockReset();
    spies = makeSpies();
    createObjectURL.mockClear();
    // jsdom's URL has no createObjectURL — stub it for the download pipeline.
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    // keep jsdom from attempting a real navigation on <a download>
    vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  async function clickExport() {
    const button = await screen.findByRole('button', { name: /Экспорт данных/ });
    await userEvent.click(button);
  }

  it('aborts the export when encryption fails instead of writing plaintext', async () => {
    vi.mocked(encryptData).mockRejectedValueOnce(new Error('crypto.subtle unavailable'));

    await clickExport();
    await waitFor(() => expect(spies.alert).toHaveBeenCalled());

    const message = String(spies.alert.mock.calls[0][0]);
    expect(message).toMatch(/прерван/i);
    // nothing must have been handed to the download pipeline
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('downloads an encrypted envelope when encryption succeeds', async () => {
    vi.mocked(encryptData).mockResolvedValueOnce('{"format":"usnee-export-aes"}');

    await clickExport();
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));

    expect(spies.alert).not.toHaveBeenCalled();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await blobText(blob)).toBe('{"format":"usnee-export-aes"}');
  });

  it('plaintext export only happens when the password field was left empty on purpose', async () => {
    spies.prompt.mockImplementation(() => '');

    await clickExport();
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));

    expect(encryptData).not.toHaveBeenCalled();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await blobText(blob)).toContain('"entries"');
  });
});
