import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';
import {
  ActiveLocalStates,
  BatchHeroCard,
  HomeHeader,
  HomeSkeleton,
  IntervalCard,
  LastEntryCard,
  QuickActionGrid,
  SyncStatus,
  WeeklySummaryCard
} from '../components/home';
import { Button, InlineNotice, Surface } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { SUBSTANCES } from '../constants/substances';
import { buildLastRecordContext, type QuickRecordDraft } from '../domain/record';
import { useHomeData } from '../hooks/useHomeData';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAppStore } from '../stores/appStore';
import { prepareRecordCommand, persistPreparedRecord } from '../services/recordPersistence';
import { trackEvent } from '../integrations/analytics';
import { adaptLegacyBatch } from '../utils/batchPresentation';

function getSubstanceName(id?: string): string {
  if (!id) return 'Неизвестное вещество';
  return SUBSTANCES.find((substance) => substance.id === id)?.name ?? 'Свой вариант';
}

export default function Home() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const data = useHomeData();
  const timers = useAppStore((state) => state.timers);
  const refreshEntries = useAppStore((state) => state.refreshEntries);
  const setLastRecordContext = useAppStore((state) => state.setLastRecordContext);
  const showToast = useToast().showToast;
  const [now, setNow] = useState(Date.now());
  const [repeating, setRepeating] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data.status !== 'loading' && !data.errors.entries) void refreshEntries();
  }, [data.status, data.errors.entries, refreshEntries]);

  const entries = Array.isArray(data.entries) ? data.entries : [];
  const lastEntry = entries[0] ?? null;
  const todayCount = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return entries.filter((entry) => entry.timestamp >= start.getTime() && entry.timestamp <= now).length;
  }, [entries, now]);
  const batchPresentation = useMemo(
    () => data.activeBatch ? adaptLegacyBatch(data.activeBatch) : null,
    [data.activeBatch]
  );

  const hasEntries = entries.length > 0;
    // Cold skeleton only when there is nothing to show yet. Existing records must stay visible.
    const showColdSkeleton = data.status === 'loading' && !data.hasLoadedOnce && !hasEntries;
    const showFirstRecordEmpty = data.hasLoadedOnce && !data.errors.entries && !hasEntries;
    const goRecord = () => navigate('/add');

    const repeatLast = async () => {
      if (!lastEntry || repeating) return;
      setRepeating(true);
      try {
        const batch = data.activeBatch && data.activeBatch.substanceId === lastEntry.substanceId ? data.activeBatch : null;
        const draft: QuickRecordDraft = {
          substanceId: lastEntry.substanceId,
          substanceName: lastEntry.substanceName,
          methodId: lastEntry.methodId,
          methodName: lastEntry.methodName,
          amountInput: String(lastEntry.dose),
          amountUnit: lastEntry.doseUnit,
          occurredAt: Date.now(),
          alone: Boolean(lastEntry.alone),
          batchId: batch?.id,
          methodDetails: lastEntry.methodDetails ?? {}
        };
        const prepared = prepareRecordCommand(draft, batch);
        await persistPreparedRecord(prepared);
        trackEvent('record_repeated');
        await refreshEntries();
        setLastRecordContext(
          buildLastRecordContext({
            substanceId: prepared.entry.substanceId,
            substanceName: prepared.entry.substanceName,
            methodId: prepared.entry.methodId,
            methodName: prepared.entry.methodName,
            amountUnit: prepared.entry.doseUnit,
            batchId: prepared.batchId,
            methodDetails: prepared.entry.methodDetails,
            injectionSite: prepared.entry.injectionSite
          })
        );
        showToast({
          tone: 'success',
          title: 'Записано',
          detail: `${prepared.entry.substanceName} · ${prepared.entry.dose} ${prepared.entry.doseUnit}`
        });
      } catch (error) {
        showToast({
          tone: 'danger',
          title: 'Не сохранилось',
          detail: error instanceof Error ? error.message : 'Что-то пошло не так'
        });
      } finally {
        setRepeating(false);
      }
    };

  if (showColdSkeleton) {
    return (
      <div className="flex flex-col gap-5 pb-8">
        <HomeHeader
          now={now}
          status={<SyncStatus online={online} state="local-only" />}
        />
        <HomeSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <HomeHeader
        now={now}
        status={<SyncStatus online={online} state="local-only" />}
      />

      {data.status === 'error' && (
        <InlineNotice tone="danger" title="Не удалось загрузить локальные данные">
          <p>Данные не удалены. Попробуйте прочитать их ещё раз.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={data.reload}>Повторить</Button>
        </InlineNotice>
      )}
      {data.status === 'partial-error' && (
        <InlineNotice tone="pending" title="Часть локальных данных недоступна">
          Доступные сведения продолжают отображаться. Можно повторить загрузку.
        </InlineNotice>
      )}

      {(data.activeBatch || data.errors.batch || batchPresentation?.ok === false) && (
        <BatchHeroCard
          batch={batchPresentation?.ok ? batchPresentation.value : null}
          malformed={Boolean(data.errors.batch) || batchPresentation?.ok === false}
          onOpenBatch={() => navigate('/partials')}
          onRecordWithoutBatch={goRecord}
        />
      )}

      {showFirstRecordEmpty ? (
        <Surface className="p-5 text-center">
          <h2 className="text-title-lg">Пока нет записей</h2>
          <p className="mt-2 text-body-sm text-usnee-text2">
            Начни с короткой записи — она сохранится только на этом устройстве. Сеть не нужна.
          </p>
          <Button size="lg" className="mt-4 w-full" onClick={goRecord}>
            <Plus className="h-5 w-5" aria-hidden="true" /> Сделать первую запись
          </Button>
          {!data.activeBatch && (
            <Button variant="ghost" className="mt-2 w-full" onClick={() => navigate('/partials')}>
              Создать партию
            </Button>
          )}
        </Surface>
      ) : (
        <Button size="lg" className="w-full" onClick={goRecord}>
          <Plus className="h-5 w-5" aria-hidden="true" /> Новая запись
        </Button>
      )}

      {!showFirstRecordEmpty && (
        <QuickActionGrid
          onRecord={goRecord}
          onBatch={() => navigate('/partials')}
          onAnalytics={() => navigate('/stats')}
          onSafety={() => navigate('/safety')}
        />
      )}

      {!showFirstRecordEmpty && (
        <section aria-labelledby="home-summary" className="space-y-3">
          <h2 id="home-summary" className="text-title-md">Сводка</h2>
          <div className="grid grid-cols-2 gap-3">
            <IntervalCard lastTimestamp={lastEntry?.timestamp} now={now} />
            <WeeklySummaryCard entries={entries} todayCount={todayCount} now={now} />
          </div>
        </section>
      )}

      {lastEntry ? (
        <LastEntryCard
          entry={lastEntry}
          substanceName={getSubstanceName(lastEntry.substanceId)}
          onOpenHistory={() => navigate('/history')}
          onCreate={goRecord}
          onRepeat={() => void repeatLast()}
          repeating={repeating}
        />
      ) : data.errors.entries ? (
        <InlineNotice tone="danger" title="История временно недоступна">
          Последняя запись не отображается, чтобы не показывать устаревшие сведения.
          {data.status !== 'error' && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={data.reload}>Повторить</Button>
          )}
        </InlineNotice>
      ) : null}

      <ActiveLocalStates
        timers={timers}
        activeSleep={data.activeSleep}
        activeCheckIn={data.activeCheckIn}
        now={now}
      />

      {!online && (
        <InlineNotice tone="info" title="Работа без сети">
          Локальные записи и навигация доступны. Серверная отправка сейчас не выполняется.
        </InlineNotice>
      )}

      {data.activeBatch && batchPresentation?.ok === false && (
        <p className="flex items-center gap-2 text-caption text-usnee-warning">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Баланс партии не был угадан или исправлен автоматически.
        </p>
      )}
    </div>
  );
}
