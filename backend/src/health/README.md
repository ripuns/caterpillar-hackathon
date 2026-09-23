# backend/src/health/

## What

Serves the service health check, `GET /health` (§10), and provides the circuit-breaker reachability signal (§8.5) that `../prediction/` controllers consult before calling the Python `ml-service`.

## Why

Isolated here because the health check and the circuit breaker are the same underlying concern (is the ML service up?) viewed two ways — one as a public endpoint, one as internal state other services read.

## How

`ml-service-health.service.ts` background-pings FastAPI's `/health` every 10s with a 1s timeout, caching the result rather than checking on every request — this is what lets `PredictionController`/`SafetyRiskController` skip straight to fallback when the service is known-down instead of waiting out a timeout per call. `health.controller.ts` just reads that cached flag.

## File Responsibilities

- **`health.controller.ts`** — defines `HealthController`, routed at `/health`. Depends on `MlServiceHealthService`. Depended on by `../app.module.ts`.
- **`ml-service-health.service.ts`** — defines `MlServiceHealthService`. Background-refreshed on an interval (`OnModuleInit`/`OnModuleDestroy`). Depends on `HttpService`. Depended on by `../health/health.controller.ts` and both controllers in `../prediction/`.
