# Roadmap

Статусы фаз (сверь с plan.md / HANDOFF при апдейте).

## Готово
- [x] Фаза 0 — контракты, screen-state-matrix, ADR-0001
- [x] Фаза 1 — база, IndexedDB, AppShell, BottomNav
- [x] Фаза 2 — Quick Record, запись в 1 тап
- [x] Фаза 3 — HistoryDashboard: хитмап, стрики, аналитика, 172 теста зелёные
- [x] PR #7/#8 merged (security: fail-closed export, PBKDF2, SW cache)
- [x] Конфетти/haptic — `e338d47`, ConfettiBurst component

- [x] Фаза 5 — XP-фидбек записи: `computeXpGain`, `+N XP` в RecordResult, level-up конфетти (04.09, PR #9)
- [x] Фаза 4 — геймификация: streak (HistoryDashboard/Progress), XP + уровни (gamification.ts), ачивки в UI (Profile/Progress/RecordResult). Проверено 04.09: всё в src, тесты 241/241 ✅

## В работе
- [ ] Решение по /stats — поглотить дашбордом или отдельный роут (аудит + рекомендация: см. [[сессия-2026-09-04]] §Дополнение ~05:45 — поглотить /stats в /progress; ждёт ок)

## Очередь
- [ ] Telegram Mini App: бот, deep links, TG-нативный UX
- [ ] Серверная синхронизация: batch ledger, outbox drain
- [ ] SOS capability boundary (только локальные действия)

## Метрики (04.09.2026 07:12)
- master: `193cedd` (copy-волна 30.08 закоммичена; push не делался, ahead 1)
- Тестов: **242/242 ✅** (28 файлов; db.v2 — флак hookTimeout, вне очереди 9/9 за 39 мс)
- PWA: 8 precache, 1183.73 KiB
- typecheck (`tsc --noEmit`): ✅ без ошибок
- build (`vite build`): ✅ PWA v0.20.5

## Правила
- Merge = union для HANDOFF.md
- Перед пушем — скан дельты на секреты
- push только по явной команде пользователя
