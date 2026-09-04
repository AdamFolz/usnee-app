# Screen State Matrix

> Канон: `docs/screen-state-matrix.md` в репо. Здесь — навигационная выжимка.

## Каноническая навигация
`Главная / История / Запись / Аналитика / Профиль`

- `/add` скрывает bottom nav во время записи
- `/calendar`, `/partials`, `/settings`, `/safety` — deep links, не primary

## Состояния экранов

| Concern | Loading | Ready | Empty | Offline | Failed |
|---|---|---|---|---|---|
| App shell | Stable frame + progress | Content + nav | N/A | Local nav usable | Error in content |
| Batch data | Skeleton | Derived balance | No-active state | Cached/pending | Identify malformed |
| Entry write | Button busy | Local + outbox | N/A | "Ждёт отправки" | Retry/conflict |
| Sync | Neutral init | "Синхронизировано" | No pending | "Сохранено локально" | "Не удалось синхронизировать" |
| Bottom nav | Always stable | 5 destinations | N/A | Fully offline | Route error ≠ dest change |
| Modal/sheet | N/A | Focus inside, Esc closes | N/A | No network dep | Error stays in sheet |
| SOS | N/A | Local-basic only | Missing contact explicit | Offline checklist | No auto-help claims |

## Accessibility
- Skip target, visible focus, safe areas, 200% text
- Values include units; colour ≠ sole signal
- 48px touch targets, semantic nav
