# Dataview Queries

> Готовые DQL-запросы для вставки в заметки.

## Все заметки vault
```dataview
TABLE file.size as "Размер", file.mtime as "Изменён"
FROM ""
SORT file.mtime DESC
```

## Статус фаз (из roadmap)
```dataview
TASK
FROM "roadmap"
GROUP BY file.name
```

## Недавно изменённые
```dataview
TABLE file.mtime as "Изменён"
FROM ""
WHERE file.mtime >= date(today) - dur(7 days)
SORT file.mtime DESC
LIMIT 10
```

## Заметки по тегам
```dataview
LIST
FROM "#tag"
SORT file.name ASC
```
