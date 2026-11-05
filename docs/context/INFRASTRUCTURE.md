# Инфраструктура (восстановленный блупринт)

> Источник: `USNEE_Final_Report.md`, `USNEE_Infrastructure_Blueprint.md`, `USNEE_Cloud4Box_Analysis_Report.md` (июль 2026, Kimi). Ничего из этого ещё не развёрнуто.

## Стек, который планировался

- Backend: FastAPI 0.109 + Uvicorn, SQLAlchemy 2 async, asyncpg, Alembic, pydantic-settings.
- БД: PostgreSQL 16 (том `postgres_data`, `pgcrypto`), Redis 7 (кэш/сессии, RDB, `allkeys-lru`).
- Бот: aiogram 3.4, long-polling (webhook при 1000+ пользователей).
- Прокси: Nginx + certbot, домены `seksov.love` и `api.seksov.love`.
- Контейнеры: docker-compose, отдельные непривилегированные пользователи, healthcheck.
- Бэкап: `pg_dump` по cron 04:00 + rclone на внешний диск, проверка восстановлением.
- Наблюдение: health-check каждые 5 минут, алерты в Telegram, logrotate.

## Минимальные требования (production)

| Компонент | CPU | RAM | Диск |
|---|---|---|---|
| PostgreSQL | 0.5–1 | 256–1024 МБ | 20+ ГБ |
| Redis | 0.1–0.25 | 32–128 МБ | — |
| Backend | 0.25–1 | 128–512 МБ | — |
| Бот | 0.1–0.25 | 64–128 МБ | — |
| Nginx + ОС | — | — | 10 ГБ |

Наружу открываются только 80/443; 5432 и 6379 — только внутри docker-сети.

## Вердикты

1. **Shared-хостинг Cloud4Box не подходит** для полного стека: нет Docker, нет long-polling процессов, PostgreSQL недоступен.
2. **Гибрид (фронт на шаред, бэк и бот на VPS)** — рабочий обход, но два места эксплуатации.
3. **Рекомендация отчёта — один VPS** (Вариант A), 2 vCPU / 4 ГБ / 60 ГБ, с UFW, fail2ban, отдельным пользователем БД.
4. Текущий VPS `201.3.225.93` (1.9 ГБ RAM) для полного стека слаб: хватит только на бота или прокси.

## Что нужно для запуска синхронизации

1. Контракт `create/update/reverse` с идемпотентностью по `operationId`.
2. Валидация Telegram `initData` (HMAC, срок), привязка `user_id`.
3. Outbox transport с retry/backoff и честным `entrySync` только после ack.
4. Мультиустройство: разрешение конфликтов, состояния `conflicted`.
5. Шифрование чувствительных полей (Fernet/`pgcrypto`), бэкап-проверка.

## Секреты (имена, без значений)

`TELEGRAM_BOT_TOKEN`, `POSTGRES_PASSWORD`, `SECRET_KEY`, `ENCRYPTION_KEY`, `TELEGRAM_WEBHOOK_SECRET`, `CORS_ORIGINS`, `ENVIRONMENT`.

## Открытые вопросы

- Домен: `seksov.love` из блупринта или новый.
- 152-ФЗ: нужен ли хостинг в РФ.
- Кто владелец VPS и оплаты.
