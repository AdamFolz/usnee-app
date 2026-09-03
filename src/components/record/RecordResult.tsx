import { useEffect } from 'react';
import { CheckCircle2, Home, Plus, Undo2, Zap } from 'lucide-react';
import { Button, InlineNotice, Surface } from '../ui';
import { XP, getLevelName } from '../../domain/gamification';
import { hapticNotification } from '../../integrations/telegram';
import type { RecordXpFeedback } from '../../domain/gamificationFeedback';

export function RecordResult({
  undoing,
  feedback,
  onHome,
  onAnother,
  onUndo
}: {
  undoing: boolean;
  feedback?: RecordXpFeedback | null;
  onHome: () => void;
  onAnother: () => void;
  onUndo: () => void;
}) {
  const showXp = Boolean(feedback && (feedback.xpDelta > 0 || feedback.leveledUp || feedback.newAchievements.length > 0));

  useEffect(() => {
    hapticNotification('success');
  }, []);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-usnee-success/15 animate-level-up">
        <CheckCircle2 className="h-10 w-10 text-usnee-success" />
      </div>
      <div>
        <h1 className="text-title-xl">Сохранено на устройстве</h1>
        <p className="mt-2 text-body-sm text-usnee-text2">
          Запись доступна в Истории и Аналитике. Отправка на сервер появится позже.
        </p>
        {!showXp && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-usnee-brand/15 px-3 py-1 text-body-sm font-semibold text-usnee-brand animate-count-up">
            <Zap className="h-4 w-4" aria-hidden="true" />
            +{XP.PER_ENTRY} XP
          </div>
        )}
      </div>
      {showXp && feedback && (
        <Surface variant="glass" className="w-full max-w-sm p-4 text-left" data-testid="xp-card">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-label uppercase text-usnee-text3">
              <Zap className="h-4 w-4 text-usnee-brand" />
              Опыт
            </span>
            <span className="text-title-md font-bold tabular-nums text-usnee-brand">+{feedback.xpDelta} XP</span>
          </div>

          {feedback.leveledUp && (
            <p className="mt-2 text-body-sm font-semibold text-usnee-brand" data-testid="level-up">
              Новый уровень: {feedback.newLevel} — {getLevelName(feedback.newLevel)}
            </p>
          )}

          {feedback.newAchievements.length > 0 && (
            <p className="mt-2 text-body-sm text-usnee-text2" data-testid="new-achievements">
              {feedback.newAchievements.length === 1 ? 'Новая ачивка' : `Новых ачивок: ${feedback.newAchievements.length}`}
            </p>
          )}

          <p className="mt-2 text-caption text-usnee-text3">
            Подробности на экране «Прогресс»
          </p>
        </Surface>
      )}
      <InlineNotice tone="pending" title="На устройстве">
        Синхронизация появится, когда будет подключён серверный транспорт.
      </InlineNotice>
      <div className="flex w-full flex-col gap-2">
        <Button variant="danger" loading={undoing} onClick={onUndo}>
          <Undo2 className="h-4 w-4" />
          Отменить запись
        </Button>
        <Button variant="secondary" onClick={onAnother}>
          <Plus className="h-4 w-4" />
          Записать ещё
        </Button>
        <Button onClick={onHome}>
          <Home className="h-4 w-4" />
          На главную
        </Button>
      </div>
    </div>
  );
}
