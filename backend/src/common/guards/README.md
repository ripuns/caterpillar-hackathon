# backend/src/common/guards/

## What

Route guard enforcing a shared API key on write endpoints (CONTRACTS.md §8.7).

## Why

Demonstrates write endpoints aren't left wide open, without building real multi-user auth — out of scope for a hackathon build with one shared demo key, documented openly rather than treated as a real secret.

## How

`api-key.guard.ts` checks the `x-api-key` request header against a fixed constant, throwing `401` if missing or wrong. Applied per-route via `@UseGuards(ApiKeyGuard)`, currently on `PATCH /tasks/:taskId` and `POST /incidents` — the two write endpoints in this build.

## File Responsibilities

- **`api-key.guard.ts`** — defines `ApiKeyGuard` and exports `DEMO_API_KEY = 'dev-shared-key'`. Depends on nothing else. Depended on by `../../tasks/tasks.controller.ts` and `../../incidents/incidents.controller.ts`.
