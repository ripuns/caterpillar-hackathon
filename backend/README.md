# backend/

## What

The NestJS API service for the Smart Operator Assistant. This is the single backend the frontend talks to — it owns the rule engine (safety/behavior detection), reads the generated datasets, and orchestrates calls to the Python ML microservice for predictions. Listens on port `3000`.

## Why

Chosen over a Python-only backend (e.g. Flask/Streamlit) because it plays to the team's existing NestJS speed, and none of the core outcomes (dashboard, rule-based safety, training hub) require Python — only the ML prediction pieces do, and those are isolated into a separate `ml-service` reached over HTTP. Keeping one language for the bulk of the app logic and confining Python to a narrow, swappable prediction service avoids polyglot overhead across most of the codebase. See the root [`README.md`](../README.md) §2 and `CONTRACTS.md` for the full reasoning.

## How

NestJS's standard module/controller structure. Each of the 5 core outcomes has its own controller in its own subfolder under `src/`. `app.module.ts` wires all controllers together. `main.ts` bootstraps the app, enables CORS (so the Next.js frontend on port `3001` can call this service), and starts listening on port `3000`. Endpoint shapes are not decided ad hoc here — they follow `../CONTRACTS.md` exactly; that file is the source of truth for every request/response field.

See [`src/README.md`](./src/README.md) for the internal module breakdown.

## Current State

Only the stub phase (`EXECUTION_PLAN.md` §2.2 Step 1) is complete: all 5 endpoints return hardcoded example data matching `CONTRACTS.md`, not real computed data yet. Real rule logic (Step 2) depends on Dev's generated CSV datasets, which don't exist yet — see root README's "Not started" status.
