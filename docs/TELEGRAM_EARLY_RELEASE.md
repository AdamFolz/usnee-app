# Ранняя версия USNEE в Telegram

## Публичный URL

```text
https://adamfolz.github.io/usnee-app/
```

## Что работает

- Telegram Mini App bootstrap (`ready`, `expand`, цвета WebView);
- Telegram BackButton на экране записи и поверх открытых sheet/dialog;
- Quick Record и расширенная форма;
- локальное атомарное сохранение в IndexedDB;
- History с честными локальными/sync-статусами;
- базовая Stats за 7, 30 дней и всё время;
- offline outbox для будущей отправки на backend.

## Текущие ограничения

- backend transport ещё не подключён;
- операции в outbox не отправляются на сервер и остаются в статусе ожидания;
- Telegram `initData` пока не отправляется и не валидируется сервером;
- данные принадлежат конкретному Telegram WebView/устройству;
- очистка данных Telegram или браузера удалит локальную историю без серверной копии;
- Safety Hub не входит в текущий рабочий срез.

## Подключение через BotFather

1. Открыть BotFather и выбрать нужного бота.
2. Настроить Menu Button или Mini App.
3. Указать URL `https://adamfolz.github.io/usnee-app/`.
4. Открыть приложение именно из Telegram и проверить:
   - onboarding;
   - Quick Record;
   - повторное открытие WebView;
   - сохранность History;
   - Stats;
   - Telegram BackButton.

BotFather и токен бота не хранятся в frontend-репозитории.
