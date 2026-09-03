# USNEE — межсессионый мост

> Состояние проекта. Чат умирает, файлы остаются. Каждый заход: git status → git log → прочитать этот файл → работай.

> **Правило файла:** append-only. Новый блок сессии — только дописыванием в конец, чужие блоки не редактировать. Секреты/токены/ключи сюда не класть никогда.

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

## Сессия 02.09 23:34 — Фаза 4: геймификация (XP + Level)

- **Сделано:**
  - `src/domain/gamification.ts` — полная система XP/Level:
    - XP константы (PER_ENTRY=10, PER_ACHIEVEMENT_BASE=25/RARE=50/LEGENDARY=100, PER_MOOD=5, PER_SLEEP=5, PER_WATER=2, PER_CLEAN_DAY=5, PER_USAGE_DAY=3)
    - `xpForLevel(level)` — XP для перехода на уровень (формула: floor(level * 100 * (1 + level * 0.1)))
    - `levelFromXp(xp)` — уровень из XP
    - `xpProgressInLevel(xp)` — прогресс внутри уровня (0..1)
    - `xpFromEntries/Moods/Sleep/Water/Achievements` — XP от активностей
    - `calculateXpSnapshot` — полный снапшот с breakdown
    - `getLevelName` — названия уровней (Начинающий → Просветлённый)
  - `src/domain/gamification.test.ts` — 39 тестов
  - `src/pages/Progress.tsx` — карточка XP/Level с:
    - Уровень + название
    - Всего XP (Zap icon)
    - Прогресс-бар уровня (gradient)
    - Breakdown: записи / ачивки / трекинг
  - `src/pages/Profile.tsx` — ачивки с XP tier (common/rare/legendary)
- **Цепочка:** 218/218 ✅ · typecheck ✅ · build ✅ (PWA 8 precache, 1179 KiB)
- **Хвосты:**
  - /stats absorption (решение pending)
  - Profile.tsx — показать ачивки с XP tier (done ✅)
  - Добавить больше UI для геймификации
- **Следующий шаг:** фаза 5 или /stats decision + интеграция XP в записи

## Сессия 03.09 13:48 — деплой phase 4

- **Действие:** пуш `arena/01a063cf-usnee-app` → `main` (`9f4937f`)
- **Цепочка верифицирована:** 218/218 ✅ typecheck ✅ build ✅
- **Следующий вход:** ревью/мерж phase 4 или новая фаза

---

*Второй пилот: «Введись из .hermes/HANDOFF.md»*
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

## Сессия 03.09 ~18:30 — merge #7, re-apply #6 → #8

- **Мёрж:** #7 (phase 4 HANDOFF, `1a06dc6`) → **#8** (`pr6-v2` = 85a0bed + 4615696 + union-патч, rebase на main) → `170517f`
- **#6 закрыт** как заменённый #8. CI CodeQL ✅, mergeable ✅
- **`.gitattributes`:** `/.hermes/HANDOFF.md merge=union` — на main. HANDOFF-конфликты между агентами самосольвятся
- **Гигиена:** PROJECT_STATE.md и krea.ts на main отсутствуют (404), секрет-скан дельты #8 чист
- **Следующий вход:** фаза 5 (интеграция XP в записи) или /stats decision

## Сессия 03.09 20:15 — rebase на main + пуш + деплой + /stats decision

- **Ребейз:** master rebase на `origin/main` (`98e8a54`) — забрал security PR #8 (fail-closed encrypted export, PBKDF2 clamp, SW runtime cache). Чисто, 3 коммита перекинуты.
- **Пуш:** `master → origin/main` (`98e8a54..e338d47`) — fast-forward, чисто. explicit-коммиты: `f0e98e0` (haptic helpers + CSS + ConfettiBurst), `e338d47` (level-up celebrate + haptic на nav + XP feedback на record save).
- **Цепочка:** 227/227 ✅ · typecheck ✅ · build ✅ (PWA 8 precache, 1183 KiB). Security PR добавил +9 тестов (218→227).
- **Деплой:** `gh-pages` branch published (`npx gh-pages -d dist`); GitHub Pages переключён с `workflow` → `legacy` mode, source = `gh-pages` branch. Build status: `built` ✅. Сайт живёт: https://adamfolz.github.io/usnee-app/ (HTTP 200, `text/html`, lang=ru).
- **/stats decision:** ОСТАВИТЬ отдельным роутом. Stats = табличный breakdown (byDay/bySubstance/byMethod/bySite + period filter), HistoryDashboard = визуал (heatmap, стрики, суммы). Комплементарно, не дублирующе. Единственный вход — Home → WeeklySummaryCard → onAnalytics → navigate('/stats').
- **Хакер-шара** `hackerai.co/share/033bb52c...` — недоступна (timeout extraction), пропущена.
- **Не сделано:** фаза 5 (XP feedback loop в момент записи — celebrate уже есть в UI, но без интеграции с gamification domain в save flow).
- **Следующий шаг:** фаза 5 — интеграция XP-награды в save-флоу записи (calculateXpSnapshot до/после → diff → celebrate level-up); иконки/картинки/анимации (новая директива владельца — визуальная жизнь всего приложения).

## Сессия 03.09 21:40 (arena/01a06865) — фаза 5 merged

- PR #9 (feat/xp-record-feedback, 6ec1e06) MERGED -> main d39340d. XP-фидбек записи: computeRecordXpFeedback (чистый дифф снапшотов), xpService (fail-open IO), XP-карточка в RecordResult, level-up тост в Home repeat, undo сбрасывает фидбек.
- Ребейз поверх e338d47 (confetti/haptic): конфликт RecordResult решён объединением — их haptic-эффект + моя карта реальной дельты; их статический бейдж +XP.PER_ENTRY остался только когда фидбека нет (иначе дубль/неверное число).
- Цепочка: 232/232, typecheck, build (PWA 8 precache 1181 KiB), CodeQL+Analyze green.
- XP = производное состояние: миграций нет, undo откатывает XP сам через данные.
- След.: фаза 6 (по плану PROJECT_STATE) или /stats decision; HANDOFF конвенция append-only + merge=union живая, конфликтов нет.
