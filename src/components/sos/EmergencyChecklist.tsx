import { Surface } from '../ui';

const CHECKLIST_ITEMS = [
  'Проверь реакцию: позови по имени, слегка потряси за плечи.',
  'Проверь дыхание: грудная клетка должна подниматься.',
  'Позови человека рядом — не оставайся с этим один.',
  'Свяжись с экстренной службой и опиши состояние.',
  'Не оставляй человека одного до прибытия помощи.'
] as const;

/**
 * Offline first-response checklist. Static content, works without network.
 */
export function EmergencyChecklist() {
  return (
    <Surface variant="raised" className="p-4">
      <h3 className="text-sm font-bold text-usnee-text">Что делать прямо сейчас</h3>
      <ol className="mt-2 space-y-2" aria-label="Пошаговые действия при опасном состоянии">
        {CHECKLIST_ITEMS.map((item, index) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-usnee-text2">
            <span className="font-bold text-usnee-text" aria-hidden="true">
              {index + 1}.
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </Surface>
  );
}
