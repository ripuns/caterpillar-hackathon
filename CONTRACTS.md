# API & Data Contracts

Endpoint shapes and dataset schema below are **finalized drafts** — concrete enough to build against immediately. Walk through this together in Hour 0–0:30 (see `EXECUTION_PLAN.md`), adjust anything wrong, then lock it. Once agreed, do not change unilaterally — flag changes to the other two before editing, and log them below.

**Ports:** NestJS `3000` · Python (FastAPI) `8001` · Next.js `3001` (or framework default)

**API base path:** ⚠️ **all endpoints below are now live under `/api/v1/...`** (e.g. `GET /api/v1/tasks`, not `GET /tasks`) — `app.setGlobalPrefix('api/v1')` applied in `main.ts` as part of the §8.9 production-hardening batch. Endpoint paths documented below omit the prefix for brevity; add it when actually calling the API. Old unversioned paths now 404.

---

## 1. `GET /tasks` — Daily Task Dashboard

Response:
```json
[
  {
    "taskId": "T001",
    "taskType": "Earth Excavation",
    "machineId": "M-12",
    "operatorId": "OP-04",
    "scheduledStart": "2026-09-24T08:00:00Z",
    "status": "pending",
    "weather": "Sunny",
    "estimatedTimeMin": 60
  }
]
```
`status`: `"pending" | "in_progress" | "completed"`

---

## 2. `GET /safety-alerts`

Response:
```json
[
  {
    "alertId": "A001",
    "machineId": "M-12",
    "operatorId": "OP-04",
    "timestamp": "2026-09-24T08:15:00Z",
    "type": "seatbelt",
    "message": "Seatbelt unfastened while machine active",
    "severity": "high"
  }
]
```
`type`: `"seatbelt" | "proximity" | "incident"`
`severity`: `"low" | "medium" | "high"`

---

## 3. `GET /behavior-flags` — Unusual Behavior Detection

Response:
```json
[
  {
    "flagId": "F001",
    "machineId": "M-12",
    "operatorId": "OP-04",
    "timestamp": "2026-09-24T09:00:00Z",
    "type": "excessive_idling",
    "value": 58,
    "threshold": 45,
    "message": "Idling time 58 min exceeds 45 min threshold"
  }
]
```
`type`: `"excessive_idling" | "unsafe_pattern"`

---

## 4. `POST /predict-task-time` — Task Time Estimation

**Called by:** NestJS → Python service (or NestJS's own fallback if Python isn't ready — same response shape either way).

Request:
```json
{
  "taskType": "Material Loading",
  "weather": "Cloudy",
  "operatorSkill": "Beginner",
  "machineAgeYears": 3,
  "estimatedTimeMin": 30
}
```

Response:
```json
{
  "predictedTimeMin": 41.5,
  "source": "model",
  "confidence": "medium"
}
```
`source`: `"model" | "fallback_average"` — lets the frontend/panel know whether the real trained model or the weighted-average fallback answered. **Never omit this field** — it's the honesty mechanism if the model isn't ready by the first review.
`confidence`: `"low" | "medium" | "high"` — when `source = "fallback_average"`, always return `"low"`. When `source = "model"`, Dev's model service can return a fixed `"medium"` for simplicity (a real confidence interval is a nice-to-have, not required — see README §4.1).

---

## 4.1 `POST /predict-safety-risk` — Composite Safety Risk Score (Stretch, §7.2)

**Called by:** NestJS → Python service, same pattern as `/predict-task-time`.

Request:
```json
{
  "seatbeltStatus": "Unfastened",
  "distanceToNearestObjectM": 1.8,
  "idlingTimeMin": 52
}
```

Response:
```json
{
  "riskScore": 0.72,
  "riskTier": "high",
  "topFactors": [
    { "factor": "seatbeltStatus", "contribution": 0.31 },
    { "factor": "distanceToNearestObjectM", "contribution": 0.28 },
    { "factor": "idlingTimeMin", "contribution": 0.13 }
  ],
  "source": "model"
}
```
`riskTier`: `"low" | "medium" | "high"`, thresholded from `riskScore` (e.g. `<0.3 low`, `0.3–0.6 medium`, `>0.6 high` — Dev to tune against training data).
`topFactors`: **required, not optional** — logistic regression coefficients × input values, sorted descending. This is the explainability mechanism (§7.2) — never return `riskScore` without it.
`source`: `"model" | "fallback_unavailable"` — if the Python service is down, NestJS should surface `fallback_unavailable` rather than fabricate a score (unlike task-time, there is no safe rule-based fallback number for a risk score — degrade to "risk score unavailable, see individual alerts" in the UI instead).

---

## 5. `GET /training-hub`

**Implemented.** Serves `data-ml/data/training-content.json`, 4 fixed modules whose `moduleId`s match exactly what §9's cross-feature synthesis references (`TH_SAFE_EFFICIENT_OPS`, `TH_SAFETY_UNDER_PRESSURE`, `TH_TIME_MANAGEMENT`, `TH_GENERAL_REFRESHER`) — these IDs are not arbitrary, they correspond to which combination of safety/behavior/task signals triggered the recommendation.

Response:
```json
[
  {
    "moduleId": "TH_SAFE_EFFICIENT_OPS",
    "title": "Safe and Efficient Machine Operation",
    "format": "article",
    "content": "..."
  }
]
```
`format`: fixed to `"article"` for this build (e-learning/static content — see README §4.1 scope decision). Extend only if time allows.

---

## 6. `PATCH /tasks/:taskId` — Update Task Status (§8, Production Hardening)

**Implemented and verified.** Status is tracked in an in-memory overlay (`backend/src/tasks/task-status.service.ts`) since `tasks.csv` has no status column and is treated as read-only source data — a task's status defaults to `"pending"` until changed, and persists across requests for the process lifetime (not written back to the CSV, no database in this build).

Request:
```json
{ "status": "in_progress" }
```
`status`: `"pending" | "in_progress" | "completed"`

Response: the updated task object (same shape as §1's list items).

Errors: `404` if `taskId` doesn't exist, `400` if `status` isn't a valid value or the body contains unknown fields (global validation rejects both — see §8.1/§8.3), `401` if the `x-api-key` header is missing/wrong (see §8.7).

---

## 7. `POST /incidents` — Manual Incident Logging (§8, Production Hardening)

**Implemented and verified**, including idempotency (§8.8) — an optional `requestId` field, if reused, returns the original incident rather than creating a duplicate. Requires the `x-api-key` header (§8.7), same as §6.

Directly addresses the problem statement's "incident logging" outcome — currently only system-generated alerts exist (§2); this lets an operator/coordinator log something manually (e.g. a near-miss the sensors didn't catch).

Request:
```json
{
  "machineId": "M-12",
  "operatorId": "OP-04",
  "description": "Loose debris near loading zone, cleared manually.",
  "severity": "medium"
}
```

Response:
```json
{
  "incidentId": "I001",
  "machineId": "M-12",
  "operatorId": "OP-04",
  "timestamp": "2026-09-24T10:02:00Z",
  "description": "Loose debris near loading zone, cleared manually.",
  "severity": "medium",
  "loggedBy": "manual"
}
```
`severity`: `"low" | "medium" | "high"`. `loggedBy`: `"manual" | "system"` — distinguishes operator-entered incidents from rule-engine-generated ones, both of which should appear in a unified incident view.

## 8. `GET /incidents` — List Incidents

**Implemented and verified.** Response: array of the incident objects from §7 (both `loggedBy` values), newest first. Manual incidents come from the in-memory store; `loggedBy: "system"` entries are backfilled live from the rule engine's computed safety alerts (§2), so this endpoint always reflects current alert state without needing separate persistence. Pagination not yet added — see §8.2.

## 9. `GET /operators/:operatorId/summary` — Per-Operator Rollup (Supports §7.3)

**Implemented, matching Dev's `data-ml/cross_feature.py` reference logic exactly** (see `data-ml/BACKEND_HANDOFF.md` §4 and `backend/src/operators/cross-feature.service.ts`). This shape supersedes an earlier placeholder written before that logic existed.

Response:
```json
{
  "operatorId": "OP-03",
  "operatorNeedsAttention": true,
  "signalsFired": ["safety", "task"],
  "evidence": {
    "safetyIncidentCount": 2,
    "idlingSessionCount": 0,
    "overrunTaskCount": 2
  },
  "recommendation": "Consider refresher training: Maintaining Safety Standards Under Time Pressure.",
  "recommendedModuleId": "TH_SAFETY_UNDER_PRESSURE",
  "recommendedModuleTitle": "Maintaining Safety Standards Under Time Pressure"
}
```

`signalsFired`: subset of `["safety", "behavior", "task"]`, each computed independently (safety = seatbelt/proximity only, behavior = idling only, task = overrun only — deliberately not derived from `safety_alert_triggered`, which conflates idling with safety per the dataset's generation rule; see `data-ml/cross_feature.py`'s "AUDIT FIX" note). `operatorNeedsAttention` requires **2 of 3** signals fired, not just one. `recommendedModuleId` is one of the 4 fixed training-hub module IDs (`TH_SAFE_EFFICIENT_OPS`, `TH_SAFETY_UNDER_PRESSURE`, `TH_TIME_MANAGEMENT`, `TH_GENERAL_REFRESHER`), matching `GET /training-hub`'s actual content — see §5.

Returns `404` if `operatorId` doesn't exist in either dataset. Thresholds (safety incident count ≥2, idling session count ≥2, overrun task count ≥2, task overrun ≥15%) are fixed constants matching `data-ml/thresholds.py` exactly — do not diverge between the TypeScript and Python implementations.

NestJS computes this by filtering the in-memory `operations.csv`/`tasks.csv` (loaded once at startup) per operator — see §8.4 for the caching recommendation once this becomes an expensive/frequent call.

## 10. `GET /health` — Service Health Check (Both NestJS and FastAPI)

**Implemented on NestJS side and verified** (`backend/src/health/health.controller.ts`). FastAPI's own `/health` already existed from `ml-service/main.py`'s Step 3 build.

Response:
```json
{ "status": "ok", "uptime": 3421, "pythonServiceReachable": true }
```
NestJS's `/health` pings FastAPI's `/health` with a 1-second timeout and reports `pythonServiceReachable`. **Not yet wired as an actual circuit breaker** — `/predict-task-time` still attempts the real call every time (with its own 2s timeout + fallback, per §4), rather than checking this cached signal first to skip straight to fallback. §8.5's circuit-breaker optimization is still open.

## 11. `GET /machines/:machineId/health` — Machine Health Score (Supports §7.4)

**Implemented** (`backend/src/machines/machine-scoring.service.ts` + `machines.controller.ts`). Ported from Dev's `data-ml/machine_scoring.py`, verified byte-for-byte against `data-ml/outputs/machine_scores.json` for every machine.

Response:
```json
{
  "machineId": "M-06",
  "score": 58,
  "status": "NEEDS_ATTENTION",
  "componentScores": {
    "wearUsageLoad": 12.0,
    "fuelEfficiencyDrift": 8.5,
    "idlingBurden": 10.0,
    "incidentAssociation": 15.0,
    "serviceIntervalProximity": 12.5
  },
  "contributingFactors": [
    "engine hours 4210 — above fleet median",
    "fuel use trending 14% above this machine's own baseline",
    "9 sessions with idling over 45 min threshold",
    "2 proximity incidents recorded on this machine",
    "approaching typical service interval (est. 290 engine hours remaining)"
  ],
  "sessionsAnalyzed": 41
}
```
`status` bands, matching the Operator Score's convention exactly: `EXCELLENT` 85-100, `GOOD` 65-84, `NEEDS_ATTENTION` 40-64, `CRITICAL` 0-39. `componentScores` sum to `score`; exact weights TBD by Dev when implemented (mirror the Operator Score's approach of weighting the most safety-relevant component highest — likely `incidentAssociation` or `wearUsageLoad`).

Computed by aggregating `operations.csv` per `machine_id` instead of per `operator_id` — same computation pattern as the Operator Performance Score (see data/ML handoff docs), no new data fields required.

## 12. `GET /machines` — Fleet-Wide Machine Health List (Supports §7.4)

**Implemented.** Response: array of the same shape as §11, one entry per machine (10 total), for a fleet-overview dashboard view. Supports pagination — see §8.2.

## 13. `GET /machines/:machineId/zone-status` — Zone + Compound SOS Status (Supports README §7.5)

**Implemented** (`backend/src/machines/zone-status.service.ts`). Ported from Dev's `data-ml/zone_status.py`, calls `MachineScoringService` internally rather than duplicating the scoring logic, verified against `data-ml/outputs/zone_status.json`. As noted in the merge Change Log entry, no machine in the current dataset triggers `sosActive: true` (lowest score is 56, threshold is 40) — this is a data-realism gap, not a logic bug; the response shape and compound-trigger logic are confirmed correct.

Response:
```json
{
  "machineId": "M-06",
  "currentZone": "Restricted Zone",
  "zoneDangerTier": "high",
  "machineHealthScore": 32,
  "sosActive": true,
  "sosReason": "Machine health score 32 (below CRITICAL threshold) while in a high-danger zone"
}
```
`sosActive` is the compound trigger from README §7.5: `true` only when `machineHealthScore` is below the CRITICAL threshold (see §11's status bands — below 40) **and** `zoneDangerTier == "high"`. Requires §11's Machine Health Score to already be computed — this endpoint calls that logic internally rather than duplicating it. Requires `current_zone` added to `operations.csv` (not yet present — new data requirement, see README §7.5).

## 14. `GET /fleet/cost-summary` — Site-Wide Cost/ROI Rollup (Supports README §7.6)

**Implemented** (`backend/src/fleet/cost-estimation.service.ts` + `fleet.controller.ts`). `topRiskMachines` and `machinesNearingServiceInterval` are now wired to the Machine Health Score (§11/§12) — `topRiskMachines` ranks by `100 - score` (top 5, nonzero only); `machinesNearingServiceInterval` lists machines within 50 simulated engine hours of the service interval, each with a flat illustrative `estimatedDowntimeCostAvoided` (reuses `INCIDENT_COST_ESTIMATE`).

Response (real example, from the actual synthetic dataset):
```json
{
  "totalIdleCostEstimate": 1812.66,
  "totalOverrunCostEstimate": 4030,
  "totalIncidentCount": 52,
  "totalIncidentCostEstimate": 7800,
  "topRiskOperators": [
    { "operatorId": "OP-12", "estimatedCostImpact": 2663.43 }
  ],
  "topRiskMachines": [
    { "machineId": "M-03", "estimatedCostImpact": 44 }
  ],
  "machinesNearingServiceInterval": [
    { "machineId": "M-03", "estimatedDowntimeCostAvoided": 150 }
  ],
  "note": "Cost figures are illustrative demo estimates, not sourced from real Caterpillar data."
}
```

**Fixed cost constants** (illustrative demo assumptions, not real CAT figures — documented in `cost-estimation.service.ts`, never diverge from these without updating both places):
- `IDLE_COST_PER_MIN = 0.15` — fuel + wear/depreciation estimate
- `OVERRUN_COST_PER_MIN = 2.0` — blended labor/opportunity cost estimate
- `INCIDENT_COST_ESTIMATE = 150.0` — flat per-incident estimate (investigation/delay/risk exposure, not modeling actual injury/damage cost)

`topRiskOperators`: top 5 operators by total estimated cost impact (idle + overrun + incident costs combined), descending, operators with $0 impact excluded. Pure aggregation over §9's underlying data (`operations.csv`/`tasks.csv`) — no new data or ML required. The `note` field is always present and should be surfaced to the panel/UI verbatim — it's the honesty mechanism for the illustrative-numbers disclosure and the machine-data gap.

---

## 8. Production Hardening (Hour 5+, Post-Core — See `EXECUTION_PLAN.md`)

Everything below is explicitly **not required for the first review**. It exists to take this from "working demo" toward "something that could plausibly run for real," which is the more ambitious bar the team is now building toward. Build only after the core 5 outcomes and the §7 differentiator features are solid.

### 8.1 Input Validation — ✅ Implemented and verified
- NestJS: `class-validator` DTOs (`CreateIncidentDto`, `UpdateTaskStatusDto`) + a global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`) in `main.ts` — rejects malformed bodies and unknown fields with `400` before they reach business logic. Verified: invalid enum values and extra fields both correctly rejected.
- FastAPI: Pydantic models already in place since Step 3 (`PredictTaskTimeRequest`).

### 8.2 Pagination — ✅ Implemented and verified
- `GET /tasks`, `GET /safety-alerts`, `GET /behavior-flags`, `GET /incidents` accept `?page=1&pageSize=20` query params via a shared `paginate()` helper (`backend/src/common/pagination.ts`). Response wraps the array: `{ "data": [...], "page": 1, "pageSize": 20, "total": 147 }`. Verified: `?page=1&pageSize=3` on `/tasks` correctly returned 3 items with `total: 248`.

### 8.3 Standard Error Shape — ✅ Implemented and verified
Global exception filter (`backend/src/common/filters/http-exception.filter.ts`), registered in `main.ts`. All error responses, across NestJS, use:
```json
{ "error": { "code": "NOT_FOUND", "message": "Task T999 does not exist", "statusCode": 404 } }
```
FastAPI side not yet given the equivalent handler (currently returns default FastAPI/Pydantic error shapes) — low priority since `/predict-task-time` never actually errors out to the client (always falls back instead, per §4).

### 8.4 Caching for Expensive Reads — ✅ Implemented
- `GET /operators/:operatorId/summary` (§9) cached in-memory via a shared `TtlCache` (`backend/src/common/ttl-cache.ts`), 30s TTL, keyed by `operatorId`. Correct by code inspection (cache checked before recompute, set only on miss); the underlying `operations.csv`/`tasks.csv` never changes at runtime, so this cache can never serve stale data within a session.

### 8.5 Circuit Breaker for the Python Service — ✅ Implemented and verified
`MlServiceHealthService` (`backend/src/health/ml-service-health.service.ts`) pings `ml-service`'s `/health` every 10s (background interval, not per-request) and caches the result. `PredictionController` consults `isReachable()` first and, if `false`, skips the live HTTP call entirely and returns the fallback immediately — verified in logs: `predict-task-time SKIPPED (circuit open) ...` when `ml-service` was down.

### 8.6 Structured Logging — ✅ Implemented and verified (both halves)
- Global request logging via `LoggerMiddleware` (`backend/src/common/middleware/logger.middleware.ts`), applied to all routes in `AppModule`. Logs `method path statusCode durationMs` for every request.
- Decision-level audit logging: `RulesService` logs every rule firing (`RULE FIRED seatbelt/proximity/excessive_idling ...` with the triggering values) in `computeSafetyAlerts`/`computeBehaviorFlags`; `PredictionController` logs every prediction's input, output, and which path answered (model vs. fallback vs. circuit-open). This is the actual evidence behind the "explainable, not black-box" narrative (README §2), not just a claim.

### 8.7 Basic Auth Boundary — ✅ Implemented and verified
- `ApiKeyGuard` (`backend/src/common/guards/api-key.guard.ts`) applied to `PATCH /tasks/:taskId` and `POST /incidents` — requires header `x-api-key: dev-shared-key` (fixed demo value, documented here, not a real secret — this is a local-only hackathon service). Verified: request without the header returns `401`; with the correct header, succeeds. Not real multi-user auth — demonstrates write endpoints aren't left wide open.

### 8.8 Idempotency on Writes — ✅ Implemented and verified
- `POST /incidents` accepts an optional `requestId`; if reused, `IncidentsService` returns the original incident rather than creating a duplicate. Verified: identical `requestId` sent twice returned the same `incidentId` both times.

### 8.9 API Versioning — ✅ Implemented and verified
- `app.setGlobalPrefix('api/v1')` in `main.ts` — every endpoint now lives under `/api/v1/...` (see the base-path note at the top of this file). Verified: old unversioned paths now correctly `404`.

**Status: all 9 items in §8 are now implemented and verified**, except FastAPI's own error-shape handler (§8.3's Python half, low priority as noted) and using §8.4's caching pattern anywhere beyond §9 (not needed elsewhere yet). Done ahead of Anamika's frontend integration specifically so the API surface (paths, pagination wrapper, error shape, auth requirement) is stable before she starts wiring, rather than changing under her mid-integration.

**Status against that order: 8.1 ✅, 8.3 ✅, 8.6 ✅ (request-level only), 8.5 partial, 8.8 ✅ (done out of order since it was cheap alongside §7's implementation) — remaining: 8.2, 8.4, 8.9, 8.7, plus finishing 8.5/8.6's decision-level logging.**

---

## Dataset Schema (FINALIZED — Source of Truth for Dev's Generator)

File format: **CSV**, one file per dataset, `snake_case` column headers (converted to `camelCase` at the NestJS API boundary — see field mappings below). Dev generates both files by end of step 1 (0:30–1:15) and commits them to the `data` branch immediately, polished or not.

**⚠️ This section documents the schema as originally planned. The actual current files have drifted from it — see the real header rows and notes below each table, which reflect what's genuinely in `data-ml/data/*.csv` right now.**

### A. `operations.csv` — Operational/Safety Dataset

**Actual current header:** `timestamp,machine_id,operator_id,engine_hours,fuel_used_l,load_cycles,idling_time_min,seatbelt_status,distance_to_nearest_object_m,safety_alert_triggered,training_completed_recent,current_zone` (424 rows including header, 423 data rows)

| Column (CSV header) | Type | Valid values / range | Notes |
|---|---|---|---|
| `timestamp` | ISO 8601 string | e.g. `2026-09-24T08:15:00Z` | |
| `machine_id` | string | `M-01` … `M-10` | 10 machines |
| `operator_id` | string | `OP-01` … `OP-15` | 15 operators |
| `engine_hours` | float | `0.0`–`5000.0` | cumulative |
| `fuel_used_l` | float | `0.0`–`50.0` | per session |
| `load_cycles` | int | `0`–`100` | per session |
| `idling_time_min` | float | `0.0`–`90.0` | per session |
| `seatbelt_status` | string | `Fastened` \| `Unfastened` | |
| `distance_to_nearest_object_m` | float | `0.5`–`20.0` | |
| `safety_alert_triggered` | string | `Yes` \| `No` | ground-truth label, generator sets `Yes` when `seatbelt_status = Unfastened` OR `distance_to_nearest_object_m < 3` OR `idling_time_min > 45` (mirrors the rules in §3 below — dataset and rule engine must agree) |
| `training_completed_recent` | string | `Yes` \| `No` | **added post-lock**, feeds the Operator Performance Score's training-status component (see `data-ml/BACKEND_HANDOFF.md` §2) |
| `current_zone` | string | `Active Work Zone` \| `Maintenance Bay` \| `Restricted Zone` \| `Idle Yard` | **added post-lock** for §13's zone/SOS feature — uniform-random per session, no archetype correlation. Danger tiers: Restricted=high, Active Work=medium, Maintenance Bay/Idle Yard=low (`thresholds.py`'s `ZONE_DANGER_TIERS`) |

**Row count:** 423 data rows (originally spec'd 150–200; actual generator produces more, ~20-35 sessions per operator × 15 operators — not a problem, just larger than the original minimum).

**API boundary mapping** (CSV `snake_case` → JSON `camelCase`, done in NestJS's data-loading layer, not in the CSV itself):
`machine_id`→`machineId`, `operator_id`→`operatorId`, `idling_time_min`→ used to compute `/behavior-flags` `value`, `seatbelt_status`/`distance_to_nearest_object_m` → used to compute `/safety-alerts` entries. Ripun's rule engine reads this CSV directly — it is not re-exposed as a raw passthrough endpoint.

### B. `tasks.csv` — Task Time Estimation Dataset

**Actual current header:** `task_id,machine_id,operator_id,timestamp,task_type,weather,operator_skill,machine_age_yrs,estimated_time_min,actual_time_min` (249 rows including header, 248 data rows)

| Column (CSV header) | Type | Valid values / range | Notes |
|---|---|---|---|
| `task_id` | string | `T001`, `T002`, … | sequential |
| `machine_id` | string | `M-01` … `M-10` | **added post-lock by Ripun** (not in Dev's original generator) — required for §1's `/tasks` response shape. No real operator-machine affinity exists in `operations.csv` to preserve, so assigned via seeded deterministic randomization, applied identically to this file on both `backend` and `data` branches to avoid drift |
| `operator_id` | string | `OP-01` … `OP-15` | **added for §7.3 cross-feature synthesis** — must use the same ID space as `operations.csv`'s `operator_id` so the two datasets can be joined per operator |
| `timestamp` | ISO 8601 string | e.g. `2026-09-24T09:00:00Z` | **added post-lock by Dev** for the cross-feature join (per-operator task-time history needs a timestamp) |
| `task_type` | string | `Earth Excavation` \| `Trenching` \| `Material Loading` \| `Grading` \| `Demolition` | fixed set, matches provided sample — do not invent new task types |
| `weather` | string | `Sunny` \| `Rainy` \| `Cloudy` \| `Windy` | fixed set, matches provided sample |
| `operator_skill` | string | `Beginner` \| `Intermediate` \| `Expert` | |
| `machine_age_yrs` | int | `1`–`10` | |
| `estimated_time_min` | int | `15`–`120` | |
| `actual_time_min` | int | derived, see generation rule below | **this is the regression target**, not `estimated_time_min` |

**Row count:** 248 data rows (originally spec'd 80–120; actual generator produces more, ~10-20 tasks per operator × 15 operators).

**Generation rule for `actual_time_min`** (so the dataset preserves the real signal from the provided sample rather than being random noise): start from `estimated_time_min`, then apply a multiplier:
- `operator_skill = Beginner` → ×1.15–1.40
- `operator_skill = Intermediate` → ×0.95–1.15
- `operator_skill = Expert` → ×0.85–1.05
- `weather ∈ {Rainy, Windy}` → additional ×1.05–1.15
- `weather ∈ {Sunny, Cloudy}` → no additional adjustment
- `machine_age_yrs > 5` → additional ×1.05–1.10
- Add small random noise (±5%) on top so the model has to generalize, not memorize a formula

This keeps the synthetic data consistent with the 5 provided sample rows (Dev should verify: plugging those 5 rows' inputs into this rule should approximately reproduce their given `actual_time_min` values).

**API boundary mapping:** `operator_id`→`operatorId`, `task_type`→`taskType`, `operator_skill`→`operatorSkill`, `machine_age_yrs`→`machineAgeYears`, `estimated_time_min`→`estimatedTimeMin`. This is the training data for the model behind `/predict-task-time` (§4) — the request shape there already matches these field names (note: `/predict-task-time`'s request doesn't need `operatorId` — that field is only for the §7.3 join, not the model input).

### Thresholds (FINALIZED)
- Excessive idling: `idling_time_min > 45`
- Proximity hazard: `distance_to_nearest_object_m < 3`
- Unsafe pattern (behavior flag): `>= 3` safety alerts for the same `operator_id` within the dataset's session history

These three numbers must be identical in: Dev's dataset-generation logic (label consistency), Ripun's NestJS rule engine (`/safety-alerts`, `/behavior-flags`), and any documentation shown to the panel. If one of you needs to change a threshold, update it here first and flag the other two — do not tune it silently in code only.

### Additional Thresholds (Machine Health / Zone-SOS, added post-lock — see `data-ml/thresholds.py`)
- `SERVICE_INTERVAL_HOURS_THRESHOLD = 500.0` — simulated service interval for §11's `serviceIntervalProximity` component. **Explicitly not an official Caterpillar interval** — state this plainly if asked by the panel.
- `MACHINE_CRITICAL_SCORE_THRESHOLD = 40` — same as the shared `SCORE_STATUS_BANDS` CRITICAL ceiling, used as the SOS trigger's health-score condition (§13).
- `MACHINE_SCORE_WEIGHTS`: `wearUsageLoad` 25, `fuelEfficiencyDrift` 20, `idlingBurden` 15, `incidentAssociation` 30, `serviceIntervalProximity` 10 (sums to 100).
- `ZONE_DANGER_TIERS`: `Restricted Zone`→high, `Active Work Zone`→medium, `Maintenance Bay`→low, `Idle Yard`→low.
- **SOS condition (exact):** `machineHealthScore < 40 AND zoneDangerTier == "high"`. See §13's known gap note — no machine currently meets this in the generated dataset.

---

## Change Log

Record any change made after the Hour 0:30 lock, so nobody works against a stale copy:

| Time | Change | Changed by |
|---|---|---|
| — | initial draft | Ripun (drafted solo, pending team confirmation) |
| — | added `POST /predict-safety-risk` (§4.1), added `operator_id` to `tasks.csv` for §7.3 cross-feature synthesis | Ripun, per team decision on 4 differentiator features |
| — | added `GET /machines/:machineId/health` (§11) and `GET /machines` (§12) for §7.4 Machine Health Score — no changes to any existing endpoint or dataset schema, uses existing `operations.csv` fields aggregated by `machine_id` | Ripun, per new feature decision |
| — | **applied:** Dev's `CONTRACTS_PATCH.md` fields (`training_completed_recent` on `operations.csv`, `timestamp` on `tasks.csv`, `operator_id` already covered above) confirmed present after merging `data` branch into `backend`. | Ripun, after merge |
| — | added `machine_id` to `tasks.csv` (was missing — no operator-machine affinity exists in `operations.csv` to preserve, so assigned via seeded deterministic randomization) to satisfy §1's `/tasks` response shape. Applied identically on both `backend` and `data` branches. | Ripun |
| — | rewrote §9 `/operators/:operatorId/summary` response shape to match Dev's actual `cross_feature.py` output (`operatorNeedsAttention`/`signalsFired`/`evidence`/`recommendation`) — the original placeholder shape was written before that logic existed and is no longer accurate. Implemented and verified to match Dev's reference output exactly. | Ripun |
| — | `GET /training-hub` implemented — serves `data-ml/data/training-content.json`, 4 modules with IDs matching §9's cross-feature module recommendations exactly. | Ripun |
| — | added draft (not yet implemented) endpoints `GET /machines/:machineId/zone-status` (§13, supports README §7.5 zone tracker + compound SOS) and `GET /fleet/cost-summary` (§14, supports README §7.6 cost/ROI + fleet rollup). Reconciles README §7's differentiator list with CONTRACTS.md, which was missing these two features entirely despite being discussed and agreed on. | Ripun |
| — | `GET /fleet/cost-summary` (§14) implemented and verified against real data. `topRiskMachines`/`machinesNearingServiceInterval` return `[]` pending Machine Health Score — not fabricated. Fixed cost constants documented in `cost-estimation.service.ts` and §14. | Ripun |
| — | Production hardening batch: implemented and verified §8.1 (validation), §8.3 (standard error shape), §8.6 (request-level logging), §8.8 (idempotency); §8.5 (circuit breaker) partial — `/health` exists but not yet consulted by `/predict-task-time`. Implemented `PATCH /tasks/:taskId` (§6, in-memory status overlay), `POST`/`GET /incidents` (§7/§8, includes live backfill of system incidents from safety alerts). Done now (before Anamika starts frontend integration) specifically so the API surface is stable when she begins wiring, rather than risking a contract change mid-integration. | Ripun |
| — | **Completed remaining §8 items**, all verified: §8.2 pagination (`?page&pageSize` on all 4 list endpoints), §8.4 caching (30s TTL on `/operators/:id/summary`), §8.5 circuit breaker now fully wired (`MlServiceHealthService`, background-refreshed reachability, `PredictionController` skips the live call when down), §8.6's decision-level half (rule-firing + prediction audit logs, not just request logs), §8.7 auth (`x-api-key` guard on both write endpoints), §8.9 versioning (`/api/v1/` global prefix — **breaking change, every path now requires the prefix**). §8 is now fully implemented. | Ripun |
| — | Merged Dev's `machine_scoring.py` + `zone_status.py` (data branch) into `backend`. Real Machine Health Score and zone/SOS computation now exist in `data-ml/`, documented in `data-ml/MACHINE_HEALTH_HANDOFF.md` (more detailed/authoritative than §11/§13 below — read that first). `current_zone` added to `operations.csv`. §11/§13 updated to match Dev's real component formulas and response shape. **Known gap, deliberately deferred, not fixed here:** no machine in the current dataset scores below the CRITICAL threshold (lowest is 56), so `sosActive` is `false` for all machines out of the box — confirmed as a data-realism outcome, not a logic bug, via Dev's synthetic worst-case test. Revisit before demo if a live SOS trigger needs to be shown — fix is contained to `data-ml/generate_data.py` (bias one machine's synthetic values), no backend/frontend changes required. | Ripun, after merging Dev's work |
| — | **Ported Dev's `machine_scoring.py` and `zone_status.py` to NestJS**, implementing §11/§12/§13 (`backend/src/machines/`: `machine-scoring.service.ts`, `zone-status.service.ts`, `machines.controller.ts`, `score-status.ts`). Added `currentZone` to `DataLoaderService`'s `OperationRow`. Verified byte-for-byte against `data-ml/outputs/machine_scores.json` and `zone_status.json` for every machine (10/10 match, including the M-03/M-06 examples now used in §11/§13). Wired `topRiskMachines`/`machinesNearingServiceInterval` into `/fleet/cost-summary` (§14) using the new Machine Health Score — no longer returns `[]`. Confirmed §4.1 `POST /predict-safety-risk` has no corresponding model or scaffolding anywhere in `data-ml/` — correctly still unbuilt, deferred until Dev trains a risk model; not attempted here. | Ripun |
