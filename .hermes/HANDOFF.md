# USNEE — межсессионый мост

> Состояние проекта. Чат умирает, файлы остаются. Каждый заход: git status → git log → прочитать этот файл → работай.

## Текущее состояние

- **Ветка:** master, `3cd94a7` == origin/main (актуален, пуш не требуется)
- **origin/main:** `3cd94a7` — все 16 explicit-коммитов поверх `186ec51` запушены
- **origin/master:** `accc7b1` — устаревший remote, отстаёт на 16; не использовать
- **review/phase3:** ветка создана и запушена (`3cd94a7`) — для ревью вторым пилотом
- **Незакоммичено:** `.hermes/` (кроме HANDOFF), `BOARD.md`, `media/` — не относится к USNEE-коду

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
- [x] Слой 4: тесты дашборда — 6 тестов HistoryDashboard (`e894569`)
- [x] Хвосты агента: screen_view, property_denylist, app_open source, byMethod, getCalendarWeekEntries (`8b65f31`)
- [x] Пуш master → origin/main (актуален: `3cd94a7`)
- [x] Ветка review/phase3 создана и запушена
- [x] Docs: PROJECT_STATE.md обновлён (секция 8, фаза 3)
- [ ] Решение по /stats — поглотить дашбордом или оставить отдельным роутом (pending)
- [ ] Фаза 4: геймификация (streak + XP + уровни + ачивки в UI)

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

## Сессия 02.09 21:00 — баг-фикс C + слой 4 + хвосты

- **Сделано:** баг C (дубль `2 × 2 записи` в dose fallback — вылечен одной строкой); слой 4: 6 тестов HistoryDashboard (стрики, heatmap aria, мг-сумма, fallback без дубля, пустой); getCalendarWeekEntries → WeeklySummaryCard (календарная Mon–Sun вместо rolling-7, синхрон с дашбордом); screen_view на смену роута (useLocation + useEffect); app_open source = telegram|pwa; property_denylist; byMethod label = METHODS name; HomeComponents.test — календарная неделя; PROJECT_STATE.md — секция 8 (фаза 3).
- **Коммиты:** `e894569` (баг C + слой 4), `8b65f31` (calendar week + screen_view + analytics), PROJECT_STATE + HANDOFF
- **Цепочка:** 179/179 ✅ · typecheck ✅ · build ✅ (PWA 8 precache, 1174 KiB)
- **Не сделано:** /stats absorption (решение pending)
- **Следующий шаг:** решение по /stats — поглотить дашбордом или оставить отдельным роутом; потом фаза 4 (gamification)

## Сессия 02.09 23:25 — верификация цепочки + пуш + review/phase3

- **Сделано:** цепочка test:run (179/179 ✅) → typecheck ✅ → build ✅ (PWA 8 precache, 1174 KiB); подтверждено что origin/main уже актуален (`3cd94a7` == master); ветка `review/phase3` создана и запушена для ревью вторым пилотом; HANDOFF обновлён.
- **Пуш:** master → origin/main не потребовался (уже `3cd94a7`). `origin/master` устаревший (`accc7b1`), не использовать.
- **Не сделано:** /stats absorption (решение pending)
- **Следующий шаг:** решение по /stats; старт фазы 4 (геймификация: streak + XP + уровни + ачивки в UI поверх существующего домена)

## Стек

- Vite + React + TS + Tailwind, Telegram Mini App, PWA (8 precache)
- Vitest 179/179, tsc --noEmit, PWA build
- Bottom nav: /, /history, /add, /progress, /profile

## Формат конца сессии

В конце каждого захода:
1. Обнови этот файл: статус, что сделано, что осталось, хвосты
2. `git add .hermes/HANDOFF.md && git commit -m "docs: update handoff"`
3. Скажи второму пилоту: «Введись из .hermes/HANDOFF.md»
