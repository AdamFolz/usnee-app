# USNEE — межсессионый мост

> Состояние проекта. Чат умирает, файлы остаются. Каждый заход: git status → git log → прочитать этот файл → работай.

## Текущее состояние

- **Ветка:** master, `ahead 3` от origin/main (f55dcba)
- **origin/main:** `f55dcba` feat(analytics): privacy-first PostHog usage analytics (EU) — сквош «USNEE Deploy», вся explicit-история сжата
- **Последний коммит master:** `36d515f` feat(history): dashboard with heatmap, dose sums, streaks
- **Незакоммичено:** `.hermes/`, `BOARD.md`, `media/` — не относится к USNEE-коду

## Что сделано (коммиты master поверх origin/main)

| Коммит | Что |
|--------|-----|
| `36d515f` | HistoryDashboard: хитмап (12 нед, 5 уровней), стрики (usage + clean), суммы доз мг, Progress label |
| `2d2f669` | stats.ts: канонические streak/dose/heatmap функции + 23 теста; achievements/Progress rewiring |
| `f55dcba` | (origin) PostHog EU analytics, allowlist 8 событий, autocapture off, Onboarding consent |

## Цепочка (проверена 02.09 16:26)

- `test:run` → **172/172 ✅**
- `typecheck` → ✅
- `build` → ✅ (PWA 8 precache, 1173 KiB)

## Фаза 3 — статус

- [x] Слой 1: `domain/stats.ts` — канонические функции + тесты (`2d2f669`)
- [x] Слой 2: achievements.ts + Progress.tsx rewired к каноническим (`2d2f669`)
- [x] Слой 3: HistoryDashboard в History.tsx, дашборд сверху, список ниже (`36d515f`)
- [ ] Слой 4: тесты дашборда (рендер хитмапа, суммы, стрики)
- [ ] Пуш master → origin (или review/phase3 ветка)
- [ ] Docs: PROJECT_STATE.md обновить

## Следующий заход — чеклист

1. `git status && git log --oneline -5` — убедиться что 36d515f и 2d2f669 на месте
2. Слой 4: тесты HistoryDashboard — рендер хитмапа, суммы, стриков
3. `npm run test:run && npm run typecheck && npm run build` — цепочка
4. Коммит + пуш (master → origin/main, или review/phase3 ветка)
5. Решение по /stats — поглощать в дашборд или оставить отдельной страницей
6. WeeklySummaryCard — привести к календарной неделе (Mon-start), если не совпадает
7. **docs-коммит:** PROJECT_STATE.md — статус фаз, RecordSummary/AdvancedRecordForm

## Правила процесса

1. **Коммити малыми кусками после каждого слоя**, не копи WIP
2. **Цепочка перед каждым коммитом:** test:run → typecheck → build
3. **Не коммить analytics-импорты без `src/integrations/analytics.ts`** (уже была авария CI)
4. **History main сквошится force-push'ем «USNEE Deploy»** — explicit-коммиты живут только локально. Не пытайся сохранить их на remote; после push они станут одним блобом
5. **Суммы доз:** мг только через `batch.concentration`. Без концентрации — счётчиками, не выдуманной суммой
6. **Streaks:** `usageStreak` (дни с записями подряд), `cleanStreak` (дни без записей подряд от сегодня назад)
7. **Heatmap:** календарная неделя (Mon-start), 84 дня, 5 уровней интенсивности, aria-label на ячейках

## Хвосты владельца

- [ ] **Ротация Krea-ключа** — ключ `3c702185...` был публично в истории репо и в живом бандле часами. Прод чист, но история публична → ключ скомпрометирован НАВСЕГДА. Ротация в Krea dashboard — единственный пункт, который нельзя восстановить из git
- [ ] **PostHog EU** — аналитика в проде. Реальный ключ запинен в `analytics.public.ts` (PostHog write-only, безопасно в клиенте). Подтвердить что это осознанное решение

## Хвосты агента (не владельца — задачи кода)

- [ ] **screen_view** — объявлен в allowlist, но не эмитится. Доделать: useEffect на смену роута в App
- [ ] **property_blacklist** → `property_denylist` в posthog-js ^1.424 (устаревшее имя опции)
- [ ] **app_open source** для standalone-PWA (сейчас `source: 'telegram'` хардкод)
- [ ] **byMethod label** = сырой methodId (`'inject'`) — использовать METHODS, как bySubstance использует SUBSTANCES
- [ ] **getCalendarWeekEntries** — мёртвый экспорт, подключить в WeeklySummaryCard (Home)
- [ ] **Слой 4:** тесты самого HistoryDashboard (компонент без тестов — только домен покрыт)
- [ ] **PROJECT_STATE.md** — четвёртый раз переносится

## Сессия 02.09 18:25 — второй пилот (review + fixes)

- **Сделано:** diff-ревью слоёв 1–3 по реальному коду (впервые по настоящим коммитам, не транскриптам). Найдены 3 бага: (A) usageStreak обнулялся в полночь, (B) last4Weeks misnomer, (C) плюрализация сломана в 3 местах (мёртвый тернарник). Все три исправлены: usageStreak считает со вчера если сегодня пусто, formatCountRu в header/aria/fallback, visibleWeeks. Тест перевёрнут + добавлен edge case.
- **Коммиты:** `1e4de72` fix(stats): usageStreak survives midnight, pluralization, rename last4Weeks
- **Цепочка:** 173/173 ✅ · typecheck ✅ · build ✅ (PWA 8 precache)
- **Не сделано:** слой 4 (тесты HistoryDashboard), getCalendarWeekEvents wiring, screen_view, PROJECT_STATE.md, /stats absorption
- **Следующий шаг:** слой 4 тесты HistoryDashboard → getCalendarWeekEvents → screen_view → PROJECT_STATE.md → /stats

## Стек

- Vite + React + TS + Tailwind, Telegram Mini App, PWA (8 precache)
- Vitest 173/173, tsc --noEmit, PWA build
- Bottom nav: /, /history, /add, /progress, /profile

## Формат конца сессии

В конце каждого захода:
1. Обнови этот файл: статус, что сделано, что осталось, хвосты
2. `git add .hermes/HANDOFF.md && git commit -m "docs: update handoff"`
3. Скажи второму пилоту: «Введись из .hermes/HANDOFF.md»
