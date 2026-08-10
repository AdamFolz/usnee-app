import type { ConsumptionMethod } from '../types';

/**
 * Harm-reduction guidance per consumption method.
 *
 * Scope & honesty rules (matches `safety.ts`):
 * - No promises of safety. No fabricated statistics or percentages.
 * - Never claim USNEE teaches medicine or substitutes for professional advice.
 * - When in doubt, frame as «общее правило» / «часто рекомендуется».
 * - This is the same scope as the SOS sheet — capability disclosure, not cure.
 */

export interface MethodGuidanceItem {
  /** Short heading visible in the surface. */
  heading: string;
  /** Short body lines rendered as a list. Each entry is one rule. */
  items: string[];
  /**
   * Optional capability disclosure shown under the rules.
   * Always visible in the surface and talks about scope, not effects.
   */
  scopeNote: string;
}

export const METHOD_GUIDANCE_DISCLOSURE =
  'Это общие правила снижения вреда, а не медицинская инструкция. При сомнениях — обсуди с врачом или консультантом.';

const INJECT: MethodGuidanceItem = {
  heading: 'Если выбрана инъекция',
  items: [
    'Используй только свой инструмент. Общий инструмент — путь передачи инфекций.',
    'Перед уколом вымой руки и место инъекции. Чистое место снижает риск воспаления.',
    'Растворяй в стерильной воде. Не используй случайные растворители.',
    'При промахе в вену не делай повторных попыток в то же место. Смени зону или остановись.',
    'При инъекции в мышцу выбирай большую мышцу. Ориентируйся на анатомические ориентиры, а не «угадай глубину».',
    'Лучше делать это рядом с человеком, которому доверяешь.',
  ],
  scopeNote: 'Если место инъекции покраснело, болит или появилось уплотнение — обратись к врачу.'
};

const ORAL: MethodGuidanceItem = {
  heading: 'Если выбран пероральный приём',
  items: [
    'Эффект наступает не сразу — обычно 20–60 минут. Не «догоняй» вторую дозу до этого окна.',
    'Полный желудок меняет ощущение и пик. Еда или её отсутствие — самостоятельный фактор.',
    'Запивай водой, не алкоголем и не энергетиками.',
    'Таблетки с оболочкой и без действуют по-разному. Не ломай оболочку, если не уверен в препарате.',
    'Если планируешь сон — оставляй заметку рядом и предупреди человека, которому доверяешь.',
  ],
  scopeNote: 'Сильная тошнота, боль в груди или спутанность — повод прекратить приём и обратиться за помощью.'
};

const SNIFF: MethodGuidanceItem = {
  heading: 'Если выбрано нюхание',
  items: [
    'Не делись трубками, купюрами и прочими предметами для вдыхания. Это передаёт инфекции.',
    'Слизистая повреждается от частого нюхания. Делай перерывы и следи за кровотечениями.',
    'Измельчённое крупнее — хуже всасывается и сильнее травмирует.',
    'Чередуй стороны или откажись от метода, если слизистая уже раздражена.',
  ],
  scopeNote: 'Частое нюхание связано с повреждением носовой перегородки. При кровотечениях, не заживающих корках — обратись к врачу.'
};

const SMOKE: MethodGuidanceItem = {
  heading: 'Если выбрано курение',
  items: [
    'Трубка/устройство, которые не обугливаются полностью — лучше фольги или самокрутки без фильтра.',
    'Не нагревай до чёрного дыма. Обугленные остатки — лишние примеси.',
    'Используй своё устройство. Общее — путь передачи инфекций.',
    'При курении из фольги — гладкая сторона фольги, без острых краёв, чистая поверхность.',
  ],
  scopeNote: 'Если после курения появилась сильная одышка, боль в груди или кашель с кровью — это повод обратиться за помощью.'
};

/** Map `method.id` to the guidance rendered for it. */
export const METHOD_GUIDANCE: Partial<Record<ConsumptionMethod['id'], MethodGuidanceItem>> = {
  inject: INJECT,
  oral: ORAL,
  sniff: SNIFF,
  smoke: SMOKE,
};

export function getMethodGuidance(methodId: string | null | undefined): MethodGuidanceItem | undefined {
  if (!methodId) return undefined;
  return METHOD_GUIDANCE[methodId as ConsumptionMethod['id']];
}
