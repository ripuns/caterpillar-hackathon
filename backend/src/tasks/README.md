# backend/src/tasks/

## What

Serves the daily task dashboard endpoint, `GET /tasks`, plus status updates via `PATCH /tasks/:taskId` (§6) — one of the problem statement's 5 required outcomes.

## Why

Isolated into its own module/controller per the codebase's one-outcome-per-folder convention (see `../README.md`), so this endpoint can be built and reviewed independently of the other 4.

## How

`tasks.controller.ts` exposes `GET /tasks` (paginated, §8.2) reading from the real `tasks.csv` via `DataLoaderService`, synthesizing `scheduledStart` from `timestamp` and layering `status` from the in-memory overlay (`task-status.service.ts`, since `tasks.csv` has no status column). `PATCH /tasks/:taskId` updates that overlay and requires the `x-api-key` header (§8.7).

## File Responsibilities

- **`tasks.controller.ts`** — defines `TasksController`, routed at `/tasks`. `findAll()` handles `GET /tasks`; `updateStatus()` handles `PATCH /tasks/:taskId`, throwing `404` if the task doesn't exist. Depends on `DataLoaderService` and `TaskStatusService`. Depended on by `../app.module.ts`.
- **`task-status.service.ts`** — in-memory `Map<taskId, status>` overlay, defaulting to `"pending"`. Not persisted to the CSV or a database — process-lifetime only, per the "no database in this build" scope decision.
- **`update-task-status.dto.ts`** — `class-validator` DTO for the `PATCH` request body, enforced by the global `ValidationPipe` (§8.1).
