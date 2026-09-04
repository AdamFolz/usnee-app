# Roadmap

Статусы фаз (сверь с plan.md / HANDOFF при апдейте).

## Готово
- [x] Фаза 0 — контракты, screen-state-matrix, ADR-0001
- [x] Фаза 1 — база, IndexedDB, AppShell, BottomNav
- [x] Фаза 2 — Quick Record, запись в 1 тап
- [x] Фаза 3 — HistoryDashboard: хитмап, стрики, аналитика, 172 теста зелёные
- [x] PR #7/#8 merged (security: fail-closed export, PBKDF2, SW cache)
- [x] Конфетти/haptic — `e338d47`, ConfettiBurst component

## Готово
- [x] Фаза 5 — XP-фидбек записи: `computeXpGain` (domain/gamification.ts), реальный `+N XP` в RecordResult, level-up конфетти. Тесты 231/231 ✅ (04.09, коммиты c826820/62d23c7)

## В работе
- [ ] Решение по /stats — поглотить дашбордом или отдельный роут

## Очередь
- [ ] Фаза 4 — геймификация (streak + XP + уровни + ачивки в UI)
- [ ] Telegram Mini App: бот, deep links, TG-нативный UX
- [ ] Серверная синхронизация: batch ledger, outbox drain
- [ ] SOS capability boundary (только локальные действия)

## Метрики (04.09.2026 02:05)
- master: `e913be9` (фаза 5 + тесты AdvancedRecordForm; push не делался)
- Тестов: **241/241 ✅** (27 файлов, vitest run singleThread)
- PWA: 8 precache, 1183.73 KiB
- typecheck (`tsc --noEmit`): ✅ без ошибок
- build (`vite build`): ✅ PWA v0.20.5

## Правила
- Merge = union для HANDOFF.md
- Перед пушем — скан дельты на секреты
- push только по явной команде пользователя
