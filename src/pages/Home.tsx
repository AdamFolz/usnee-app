import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  ActiveLocalStates,
  BatchHeroCard,
  HomeHeader,
  HomeSkeleton,
  LastEntryCard,
  QuickActionGrid,
  SyncStatus,
  WeeklySummaryCard
} from '../components/home';
import { Button, InlineNotice } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import { computeRecordXpDelta } from '../services/xpService';
import { getLevelName } from '../domain/gamification';
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
        const { feedback } = await computeRecordXpDelta(() => persistPreparedRecord(prepared));
        trackEvent('record_repeated');
        if (feedback?.leveledUp) {
          showToast({
            tone: 'success',
            title: `Уровень ${feedback.newLevel} — ${getLevelName(feedback.newLevel)}`,
            detail: `+${feedback.xpDelta} XP. Так держать.`
          });
        }
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
        <InlineNotice tone="danger" title="Что-то пошло не так">
          <p>Записи не пропали — они на устройстве. Прочитать не вышло.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={data.reload}>Попробовать ещё раз</Button>
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
        <LastEntryCard
          entry={null}
          substanceName=""
          now={now}
          onOpenHistory={() => navigate('/history')}
          onCreate={goRecord}
        />
      ) : (
        lastEntry && (
          <LastEntryCard
            entry={lastEntry}
            substanceName={getSubstanceName(lastEntry.substanceId)}
            now={now}
            onOpenHistory={() => navigate('/history')}
            onCreate={goRecord}
            onRepeat={() => void repeatLast()}
            repeating={repeating}
          />
        )
      )}

      {!lastEntry && data.errors.entries && !showFirstRecordEmpty && (
        <InlineNotice tone="danger" title="Журнал не читается">
          Последняя запись не отображается, чтобы не показывать устаревшее.
          {data.status !== 'error' && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={data.reload}>Попробовать ещё раз</Button>
          )}
        </InlineNotice>
      )}

      <QuickActionGrid
        onBatch={() => navigate('/partials')}
        onAnalytics={() => navigate('/progress')}
        onSafety={() => navigate('/safety')}
      />

      {!showFirstRecordEmpty && (
        <section aria-labelledby="home-summary" className="space-y-3">
          <h2 id="home-summary" className="text-title-md">Сводка</h2>
          <WeeklySummaryCard entries={entries} todayCount={todayCount} now={now} />
        </section>
      )}

      {showFirstRecordEmpty && !data.activeBatch && (
        <Button variant="ghost" className="w-full" onClick={() => navigate('/partials')}>
          Создать партию
        </Button>
      )}

      <ActiveLocalStates
        timers={timers}
        activeSleep={data.activeSleep}
        activeCheckIn={data.activeCheckIn}
        now={now}
      />

      {!online && (
        <InlineNotice tone="info" title="Работа без сети">
          Записи и навигация доступны. Отправка на сервер пока не выполняется.
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
