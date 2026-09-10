import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BottomSheet } from './BottomSheet';

vi.mock('../../integrations/telegram', () => ({ registerTelegramBackHandler: vi.fn(() => vi.fn()) }));

describe('BottomSheet', () => {
  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Тест">
        <button type="button">Внутри</button>
      </BottomSheet>
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('traps Tab focus inside the panel', async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Тест">
        <button type="button">Первый</button>
        <button type="button">Второй</button>
      </BottomSheet>
    );
    const [_backdrop, close] = screen.getAllByRole('button', { name: 'Закрыть' });
    await waitFor(() => expect(document.activeElement).toBe(close));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Первый' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Второй' }));
    await userEvent.tab();
    expect(document.activeElement).toBe(close);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Второй' }));
  });
});
