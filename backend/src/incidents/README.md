# backend/src/incidents/

## What

Serves manual incident logging, `POST /incidents` (§7), and the unified incident list, `GET /incidents` (§8) — directly addresses the problem statement's "incident logging" outcome, letting an operator/coordinator log something the sensors didn't catch (e.g. a near-miss).

## Why

Isolated into its own module/controller per the codebase's one-outcome-per-folder convention (see `../README.md`).

## How

`incidents.service.ts` holds manually-logged incidents in memory, with idempotent creation via an optional client-supplied `requestId` (§8.8) — a reused `requestId` returns the original incident instead of creating a duplicate. `incidents.controller.ts`'s `GET /incidents` backfills `loggedBy: "system"` entries live from `RulesService.computeSafetyAlerts()`, so the list always reflects current alert state without separate persistence, then merges and sorts both sources newest-first. `POST /incidents` requires the `x-api-key` header (§8.7).

## File Responsibilities

- **`incidents.controller.ts`** — defines `IncidentsController`, routed at `/incidents`. `create()` handles `POST`; `findAll()` handles `GET`, paginated (§8.2). Depends on `IncidentsService`, `DataLoaderService`, `RulesService`. Depended on by `../app.module.ts`.
- **`incidents.service.ts`** — defines `IncidentsService`, `Incident`. The `requestId → incidentId` idempotency map is kept separate from the `Incident` shape itself so it never leaks into the API response.
- **`create-incident.dto.ts`** — `class-validator` DTO for the `POST` request body, enforced by the global `ValidationPipe` (§8.1).
