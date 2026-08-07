# Screen-state matrix — foundation contract

Phase 0 defines shared states before Home, Quick Record, and SOS screen implementation.

| Concern | Loading | Ready | Empty | Offline/pending | Failed/conflict | Accessibility requirement |
|---|---|---|---|---|---|---|
| App shell | Stable screen frame; labelled progress | Content and navigation available | N/A | Offline state must not disable local navigation | Recoverable error remains inside content region | Skip target, visible focus, safe areas, 200% text |
| Batch data | Skeleton preserves card size | Derived ledger balance | Explicit no-active-batch state | Cached balance marked as local/pending | Never guess balance; identify malformed/conflicted data | Values include units; colour is not sole signal |
| Entry write | Button becomes busy after local transaction starts | Local record + outbox operation committed | N/A | Say `Ждёт отправки` | Preserve local record and expose retry/conflict | Busy state announced; focus moves to result notice |
| Sync | Neutral initialization | `Синхронизировано` only after acknowledgement | No pending operations | `Сохранено на устройстве` / `Ждёт отправки` | `Не удалось синхронизировать`; destructive conflicts require review | Badge has text plus optional icon/dot |
| Bottom navigation | Always stable | Five canonical destinations | N/A | Fully usable offline | Route error must not change destination semantics | Semantic `nav`, current page, 48 px targets |
| Modal/sheet | N/A | Focus moves inside; Escape/Back closes | N/A | Content must not depend on network | Error stays in sheet without losing input | Dialog semantics, focus return, scroll lock |
| SOS capability | N/A | Only local-basic actions visible | Missing trusted contact is explicit | Checklist and disclosure remain offline | Never claim automatic help or completed call | Emergency number is visible and action is user initiated |

## Canonical navigation

`Главная / История / Запись / Аналитика / Профиль`

- `/add` may hide the bottom navigation while the record flow is active.
- `/calendar`, `/partials`, `/settings`, and `/safety` remain valid deep links but are not primary bottom-navigation destinations.
- SOS remains a separate global entry point; its screen code is outside Phase 1.

## Copy invariants

- Local commit: **Сохранено на устройстве**.
- Pending outbox: **Ждёт отправки**.
- Server acknowledgement: **Синхронизировано**.
- Sync error: **Не удалось синхронизировать**.
- Never use **Помощь вызвана** unless a future integration can prove that state.
