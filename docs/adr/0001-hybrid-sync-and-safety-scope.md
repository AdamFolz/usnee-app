# ADR 0001: Hybrid sync, Batch ledger and SOS capability boundary

- Status: Accepted
- Date: 2026-08-07
- Scope: Phase 0 contracts for the USNEE Mini App vertical slice

## Context

USNEE keeps offline-first interaction while adding a backend and mandatory Telegram bot. The current client stores records in IndexedDB and contains a legacy `Batch.remaining` field whose unit is implicit. The product must avoid duplicate writes during retries and must not claim emergency capabilities that are not implemented.

## Decision

### 1. Ownership and identifiers

- The client creates stable UUIDs before any local write: `entityId` for the domain entity and `operationId` for the mutation.
- The same IDs are sent on every retry. They are never regenerated for an existing operation.
- IndexedDB is the immediate local cache and outbox. The server database is the durable authority after acknowledgement.
- A server acknowledgement does not replace the client entity ID. Optional server metadata may be attached separately.
- Every synchronizable entity carries `revision`, `createdAt`, `updatedAt`, and a sync state.

### 2. Batch contract

A new batch is explicit about its physical form:

- `solution`: initial mass and initial solution volume are required; concentration is derived and stored as a validated snapshot.
- `dry`: initial mass is required; volume and concentration are absent.
- `other`: the original amount and unit are required; normalized mass is optional.

Remaining quantity is derived from an append-only `BatchMovement` ledger, not independently mutated fields.

- `initial` establishes the opening amount with a positive delta.
- `consume` references an entry when consumption created it and carries a negative delta.
- `refill` adds quantity with a positive delta.
- `correction` records an auditable signed adjustment.
- `reverse` carries the exact inverse delta of the referenced movement; existing movements are not deleted in normal operation.

For a solution:

```text
remainingVolumeMl = initialVolumeMl + sum(signed movement volume)
remainingMassMg = remainingVolumeMl * concentrationMgMl
```

For a dry batch:

```text
remainingMassMg = initialMassMg + sum(signed movement mass)
```

The legacy `Batch` interface remains temporarily for IndexedDB v1 compatibility. It is not the contract for new server work. Migration of stored data requires a separately tested IndexedDB migration.

### 3. Sync protocol

A local mutation is committed to its entity store and outbox in one IndexedDB transaction before the UI reports success.

State machine:

```text
local-only -> pending -> syncing -> synced
                    \-> failed -> pending (retry)
                    \-> conflicted
```

- `local-only`: local entity exists but is intentionally outside sync scope.
- `pending`: durable outbox operation is waiting for a network attempt.
- `syncing`: transient in-memory presentation state; a crashed client resumes from the durable pending operation.
- `synced`: server acknowledged this operation and returned the resulting revision.
- `failed`: retryable or terminal failure is recorded with a safe error code.
- `conflicted`: server revision cannot be merged automatically.

Each request carries `operationId` as its idempotency key, `entityId`, `baseRevision`, operation kind, payload, and client timestamp. The server stores the idempotency result and returns the same acknowledgement for repeat requests.

Conflict policy for the first slice:

- append-only entry creation and batch movements deduplicate by `operationId`;
- simple profile preferences use server revision plus last-write-wins only where explicitly allowed;
- destructive operations and competing batch corrections never auto-merge; they become `conflicted`;
- server validation rejection preserves the local record and exposes a failed state instead of silently discarding it.

Undo creates a compensating operation. It does not remove an already acknowledged operation from history.

### 4. Create-entry operation

`CreateEntryPayload` contains substance, method, amount, unit, timestamp, `alone`, and optional batch reference. When a batch is used, the same envelope includes or causally links the deterministic consumption movement. Server processing is atomic: it accepts both or neither.

The UI may say only one of:

- `Сохранено на устройстве` after the local transaction;
- `Ждёт отправки` while pending/offline;
- `Синхронизировано` after acknowledgement;
- `Не удалось синхронизировать` on failure.

### 5. SOS scope

Current SOS capability is `local-basic`:

Included:

- offline emergency checklist;
- user-initiated `tel:` action showing the configured number;
- user-initiated call to a trusted contact when configured;
- navigation to Safety Hub;
- a local check-in timer only while the Mini App remains active.

Not included and never implied:

- automatic emergency-service calls;
- automatic trusted-contact messages;
- guaranteed monitoring after the Mini App closes or is suspended;
- confirmed call completion;
- geolocation escalation;
- backend or bot monitoring.

Required disclosure:

> USNEE не вызывает помощь автоматически. Звонок начнётся только после вашего нажатия и подтверждения телефоном.

A future `server-assisted` capability requires a separate ADR, explicit consent, operational monitoring, legal/medical review, and working backend/bot infrastructure. Until then it must remain hidden or disabled.

## Consequences

- Existing screens can continue reading IndexedDB v1 while the new contract is introduced additively.
- New write flows must use atomic entity + outbox transactions before server integration is enabled.
- Batch balance can be rebuilt, audited, reversed and deduplicated.
- UI copy is constrained by actual safety capability.
- Database migration, API transport implementation and SOS screen implementation are intentionally outside Phase 0/1.
