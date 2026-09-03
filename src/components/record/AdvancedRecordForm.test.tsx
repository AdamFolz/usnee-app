import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsumptionEntry } from '../../types';
import { prepareRecordCommand, persistPreparedRecord, reversePreparedRecord } from '../../services/recordPersistence';
import { getEntries } from '../../utils/db';

const store = vi.hoisted(() => ({
  refreshEntries: vi.fn(() => Promise.resolve()),
  setLastRecordContext: vi.fn(),
  lastRecordContext: null as null | {
    substanceId: string;
    substanceName?: string;
    methodId: string;
    methodName?: string;
    amountUnit: string;
    batchId?: string;
    injectionSite?: string;
  }
}));

const online = vi.hoisted(() => ({ value: true }));

vi.mock('../../stores/appStore', () => ({
  useAppStore: (selector: (s: typeof store) => unknown) => selector(store)
}));

vi.mock('../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => online.value
}));

vi.mock('../../utils/db', () => ({
  getActiveBatch: vi.fn(() => Promise.resolve(null)),
  getEntries: vi.fn(() => Promise.resolve(dbEntries))
}));

vi.mock('../../hooks/useHomeData', () => ({
  applyHomeBatchRemaining: vi.fn()
}));

vi.mock('../../integrations/telegram', () => ({
  registerTelegramBackHandler: vi.fn(() => () => undefined)
}));

vi.mock('../../services/recordPersistence', () => ({
  prepareRecordCommand: vi.fn((input: {
    substanceId: string;
    substanceName?: string;
    methodId: string;
    methodName?: string;
    amountInput: string;
    amountUnit: string;
  }) => ({
    entry: {
      id: 'e1',
      substanceId: input.substanceId,
      substanceName: input.substanceName,
      methodId: input.methodId,
      methodName: input.methodName,
      timestamp: 1,
      dose: Number(input.amountInput),
      doseUnit: input.amountUnit,
      methodDetails: {},
      alone: true,
      createdAt: 1,
      updatedAt: 1
    },
    operation: 'created',
    sync: { queued: false, reason: 'saved' }
  })),
  persistPreparedRecord: vi.fn(() => Promise.resolve('created')),
  reversePreparedRecord: vi.fn(() => Promise.resolve())
}));

import AdvancedRecordForm from './AdvancedRecordForm';

let dbEntries: ConsumptionEntry[] = [];
const mockedPrepare = vi.mocked(prepareRecordCommand);
const mockedPersist = vi.mocked(persistPreparedRecord);
const mockedReverse = vi.mocked(reversePreparedRecord);
const mockedGetEntries = vi.mocked(getEntries);

async function selectSniffWithDose(dose: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Нюхать' }));
  await userEvent.type(screen.getByLabelText('Доза'), dose);
}

async function fillMephSniff(dose: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Эйфоретики' }));
  await userEvent.click(screen.getByRole('button', { name: 'Мефедрон' }));
  await selectSniffWithDose(dose);
}

const saveButton = () => screen.getByRole('button', { name: 'Сохранить запись' });

function renderForm(routeState?: Record<string, unknown>) {
  return render(
    <MemoryRouter
      initialEntries={routeState ? [{ pathname: '/', state: routeState }] : ['/']}
    >
      <AdvancedRecordForm />
    </MemoryRouter>
  );
}

beforeEach(() => {
  dbEntries = [];
  online.value = true;
  store.lastRecordContext = null;
  store.refreshEntries.mockClear();
  store.setLastRecordContext.mockClear();
  mockedGetEntries.mockClear();
  mockedPrepare.mockClear();
  mockedPersist.mockClear();
  mockedPersist.mockResolvedValue('created');
  mockedReverse.mockClear();
});

describe('AdvancedRecordForm', () => {
  it('renders the empty form with categories and disabled save path intact', async () => {
    renderForm();
    expect(screen.getByRole('button', { name: 'Эйфоретики' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Сохранить запись' })).toBeInTheDocument();
  });

  it('shows the offline notice when useOnlineStatus is false', () => {
    online.value = false;
    renderForm();
    expect(screen.getByText('Работа без сети')).toBeInTheDocument();
  });

  it('prefills substance and method from the store lastRecordContext', async () => {
    store.lastRecordContext = {
      substanceId: 'meph',
      substanceName: 'Мефедрон',
      methodId: 'sniff',
      methodName: 'Нюхать',
      amountUnit: 'мг'
    };
    renderForm();

    const meph = await screen.findByRole('button', { name: 'Мефедрон' });
    expect(meph).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Нюхать' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('prefills substance, method and dose from router location.state', async () => {
    renderForm({
      substanceId: 'meph',
      methodId: 'oral',
      amountInput: '2',
      amountUnit: 'мг'
    });

    expect(screen.getByRole('button', { name: /Перорально/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Мефедрон' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Доза')).toHaveValue(2);
  });

  it('blocks save and shows a validation notice when required fields are missing', async () => {
    renderForm();

    await userEvent.click(saveButton());

    expect(await screen.findByText('Не хватает данных')).toBeInTheDocument();
    expect(mockedPrepare).not.toHaveBeenCalled();
    expect(mockedPersist).not.toHaveBeenCalled();
  });

  it('saves a complete record and refreshes entries + last-record context', async () => {
    renderForm();

    await fillMephSniff('5');
    await userEvent.click(saveButton());

    expect(await screen.findByText('Сохранено на устройстве')).toBeInTheDocument();
    expect(mockedPersist).toHaveBeenCalledTimes(1);
    const draft = mockedPrepare.mock.calls[0][0];
    expect(draft.substanceId).toBe('meph');
    expect(draft.methodId).toBe('sniff');
    expect(draft.amountInput).toBe('5');
    expect(store.refreshEntries).toHaveBeenCalledTimes(1);
    expect(store.setLastRecordContext).toHaveBeenCalledWith(
      expect.objectContaining({
        substanceId: 'meph',
        methodId: 'sniff',
        amountUnit: 'мг'
      })
    );
  });

  it('warns about a probable duplicate and only saves after explicit confirmation', async () => {
    dbEntries = [{
      id: 'recent',
      substanceId: 'meph',
      substanceName: 'Мефедрон',
      methodId: 'sniff',
      methodName: 'Нюхать',
      timestamp: Date.now() - 10 * 60 * 1000,
      dose: 5,
      doseUnit: 'мг',
      methodDetails: {},
      alone: true,
      createdAt: 1,
      updatedAt: 1
    }];
    renderForm();

    await fillMephSniff('5');
    await userEvent.click(saveButton());

    expect(await screen.findByText(/Похоже, двойная доза/)).toBeInTheDocument();
    expect(mockedPersist).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole('button', { name: 'Всё равно сохранить' })[0]);

    expect(await screen.findByText('Сохранено на устройстве')).toBeInTheDocument();
    expect(mockedPersist).toHaveBeenCalledTimes(1);
  });

  it('maps persistence error codes to a friendly message', async () => {
    mockedPersist.mockRejectedValueOnce(new Error('BATCH_INSUFFICIENT'));
    renderForm();

    await fillMephSniff('5');
    await userEvent.click(saveButton());

    expect(await screen.findByText('В партии недостаточно остатка')).toBeInTheDocument();
    expect(mockedPersist).toHaveBeenCalledTimes(1);
  });

  it('saves a custom substance using the typed name', async () => {
    renderForm();

    await userEvent.click(screen.getAllByRole('button', { name: 'Свой вариант' })[0]);
    await userEvent.type(screen.getByLabelText('Свой вариант вещества'), 'Вещество X');
    await selectSniffWithDose('2');
    await userEvent.click(saveButton());

    expect(await screen.findByText('Сохранено на устройстве')).toBeInTheDocument();
    const draft = mockedPrepare.mock.calls[0][0];
    expect(draft.substanceId).toBe('custom');
    expect(draft.substanceName).toBe('Вещество X');
  });

  it('undoes the saved record and returns to the form', async () => {
    renderForm();

    await fillMephSniff('5');
    await userEvent.click(saveButton());
    await screen.findByText('Сохранено на устройстве');

    await userEvent.click(screen.getByRole('button', { name: 'Отменить запись' }));

    expect(mockedReverse).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Сохранить запись' })).toBeInTheDocument();
    expect(screen.queryByText('Сохранено на устройстве')).not.toBeInTheDocument();
  });
});
