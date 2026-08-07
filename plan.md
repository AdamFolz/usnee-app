# USNEE — актуальный план разработки

> Каноническое состояние и классификация версий находятся в `PROJECT_STATE.md`.

## Зафиксированные решения

- **Архитектура:** hybrid — локальный offline-first клиент + обязательная серверная синхронизация.
- **Платформа:** Telegram Mini App; Telegram bot обязателен.
- **Функциональность:** широкий продуктовый scope сохраняется.
- **Дизайн:** premium dark fintech 2086.
- **Ранняя публикация:** GitHub Pages по адресу `https://adamfolz.github.io/usnee-app/`.

## Текущий рабочий срез

1. **Запись инъекций**
   - Quick Record — основной быстрый путь;
   - Add Entry — расширенная форма;
   - обязательные вещество, способ и положительный объём/доза;
   - duplicate guard;
   - локальная атомарная транзакция;
   - outbox и стабильные operation IDs;
   - компенсирующая отмена.
2. **History**
   - сортировка от новых к старым;
   - честные статусы локального сохранения и синхронизации;
   - просмотр;
   - безопасное изменение времени и заметки;
   - компенсирующее удаление новых записей;
   - запрет небезопасного удаления legacy-записей.
3. **Базовая Stats**
   - количество записей;
   - периоды 7 дней, 30 дней и всё время;
   - группировка по дням;
   - группировка по веществам;
   - без суммирования несовместимых единиц.

## Что работает в ранней Telegram-версии

- Telegram WebApp bootstrap (`ready`, `expand`, цвета WebView);
- Telegram viewport CSS variables;
- Telegram BackButton для записи и открытых sheet/dialog;
- IndexedDB v2;
- локальное сохранение записей и outbox;
- History и базовая Stats;
- PWA/service worker;
- GitHub Pages deploy workflow с typecheck, тестами и build.

## Честные ограничения ранней версии

- backend transport ещё не подключён;
- outbox пока не отправляется на сервер;
- `initData` пока не валидируется backend;
- `Синхронизировано` допустимо только после будущего серверного acknowledgement;
- локальные данные принадлежат конкретному WebView/устройству;
- Safety Hub и дальнейшее развитие SOS отложены;
- существующий SOS-sheet не вызывает помощь автоматически.

## Следующий интеграционный этап

1. Зафиксировать Telegram-authenticated API contract.
2. Реализовать backend endpoint для create/update/reverse операций.
3. Валидировать Telegram `initData` на backend.
4. Добавить outbox transport с retry/backoff.
5. Хранить idempotency result по `operationId`.
6. Обновлять `entrySync` только после реального acknowledgement.
7. Добавить multi-device reconciliation и conflict states.

## Обязательные проверки перед публикацией

```text
npm run test:run
npm run typecheck
npm run build
git diff --check
```

После deploy дополнительно проверяются URL приложения, manifest, service worker, иконки и основные asset-файлы.
