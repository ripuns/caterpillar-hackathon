# backend/src/

## What

Application source code for the NestJS backend. Contains the root module/bootstrap files plus one subfolder per core outcome, differentiator feature, or cross-cutting concern.

## Why

Each feature is isolated into its own subfolder so endpoints can be worked on independently without files colliding, matching the contract-first, per-endpoint structure defined in `../../CONTRACTS.md`.

## How

`main.ts` bootstraps the Nest application: sets the global `/api/v1` prefix (§8.9), registers the global `ValidationPipe` (§8.1) and `HttpExceptionFilter` (§8.3), and starts the HTTP listener on port `3000`. `app.module.ts` is the root module that imports and registers every controller/provider, and applies `LoggerMiddleware` (§8.6) globally. `app.controller.ts` / `app.service.ts` are the Nest CLI's default scaffold files, currently unused by the actual feature set but left in place since removing them wasn't requested.

## File Responsibilities

- **`main.ts`** — application entry point. Depends on `app.module.ts`. Nothing depends on it.
- **`app.module.ts`** — the root Nest module. Imports every controller and provider across all subfolders below, wiring Nest's DI container. `main.ts` depends on this file.
- **`app.controller.ts`** / **`app.service.ts`** — Nest CLI default scaffold (root `GET /` route). Not part of the defined API contract in `CONTRACTS.md`.

## Subfolders

- [`tasks/`](./tasks/README.md) — `GET /tasks`, `PATCH /tasks/:taskId`
- [`safety/`](./safety/README.md) — `GET /safety-alerts`
- [`behavior/`](./behavior/README.md) — `GET /behavior-flags`
- [`training/`](./training/README.md) — `GET /training-hub`
- [`prediction/`](./prediction/README.md) — `POST /predict-task-time`, `POST /predict-safety-risk`
- [`operators/`](./operators/README.md) — `GET /operators/:operatorId/summary`
- [`machines/`](./machines/README.md) — `GET /machines`, `GET /machines/:machineId/health`, `GET /machines/:machineId/zone-status`
- [`fleet/`](./fleet/README.md) — `GET /fleet/cost-summary`
- [`incidents/`](./incidents/README.md) — `POST /incidents`, `GET /incidents`
- [`health/`](./health/README.md) — `GET /health`
- [`data/`](./data/README.md) — shared CSV loading, no routes
- [`rules/`](./rules/README.md) — shared rule-based detection logic, no routes
- [`common/`](./common/README.md) — cross-cutting production-hardening infrastructure (§8), no routes
