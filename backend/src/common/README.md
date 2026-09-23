# backend/src/common/

## What

Cross-cutting production-hardening infrastructure (CONTRACTS.md §8) shared across every controller: pagination, caching, plus the `filters/`, `guards/`, `middleware/` subfolders. No routes of its own.

## Why

These concerns (error shape, auth, request logging) apply identically to every endpoint, so they're implemented once here and applied globally in `../main.ts`/`../app.module.ts` rather than duplicated per-controller.

## How

`pagination.ts` and `ttl-cache.ts` are plain utility exports, imported directly by controllers/services that need them (not registered as Nest providers). The three subfolders contain actual Nest constructs (a global filter, a route guard, a middleware) that plug into the Nest request lifecycle.

## File Responsibilities

- **`pagination.ts`** — exports `paginate()` and `PaginatedResponse<T>` (§8.2). Wraps any array as `{ data, page, pageSize, total }`. Used by every list endpoint (`tasks`, `safety`, `behavior`, `incidents`, `machines`).
- **`ttl-cache.ts`** — exports `TtlCache<T>` (§8.4), a generic in-memory TTL cache. Used by `../operators/operators.controller.ts` and `../machines/machines.controller.ts` for expensive recomputed reads.

## Subfolders

- [`filters/`](./filters/README.md) — global exception filter (§8.3)
- [`guards/`](./guards/README.md) — API key auth guard (§8.7)
- [`middleware/`](./middleware/README.md) — request logging middleware (§8.6)
