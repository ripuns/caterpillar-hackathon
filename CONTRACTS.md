# API & Data Contracts

Endpoint shapes and dataset schema below are **finalized drafts** — concrete enough to build against immediately. Walk through this together in Hour 0–0:30 (see `EXECUTION_PLAN.md`), adjust anything wrong, then lock it. Once agreed, do not change unilaterally — flag changes to the other two before editing, and log them below.

**Ports:** NestJS `3000` · Python (FastAPI) `8001` · Next.js `3001` (or framework default)

**API base path:** all core endpoints below are versioned under `/api/v1/...` once §8 (Production Hardening) is implemented — e.g. `GET /api/v1/tasks`. Until then, unversioned paths (`GET /tasks`) are fine for the first-review demo; do not block core-hour work on adding the prefix. §8 covers the migration.

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

Errors: `404` if `taskId` doesn't exist, `400` if `status` isn't a valid value or the body contains unknown fields (global validation rejects both — see §8.1/§8.3).

---

## 7. `POST /incidents` — Manual Incident Logging (§8, Production Hardening)

**Implemented and verified**, including idempotency (§8.8) — an optional `requestId` field, if reused, returns the original incident rather than creating a duplicate.

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

Response: array of the same shape as §11, one entry per machine (10 total), for a fleet-overview dashboard view. Supports pagination — see §8.2.

## 13. `GET /machines/:machineId/zone-status` — Zone + Compound SOS Status (Supports README §7.5)

**Draft — not yet implemented, confirm shape with the team before building.**

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

**Implemented** (`backend/src/fleet/cost-estimation.service.ts` + `fleet.controller.ts`). `topRiskMachines` and `machinesNearingServiceInterval` currently always return `[]` — they depend on the Machine Health Score (§11/§12), which is blocked on Dev's `machine_scoring.py` and not yet available. Wire those in once that exists; do not fabricate values in the meantime.

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
  "topRiskMachines": [],
  "machinesNearingServiceInterval": [],
  "note": "Cost figures are illustrative demo estimates, not sourced from real Caterpillar data. topRiskMachines and machinesNearingServiceInterval are empty pending the Machine Health Score (README §7.4)."
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

### 8.2 Pagination — not yet implemented
- `GET /tasks`, `GET /safety-alerts`, `GET /behavior-flags`, `GET /incidents` accept `?page=1&pageSize=20` query params. Response wraps the array: `{ "data": [...], "page": 1, "pageSize": 20, "total": 147 }`. Prevents a growing dataset from dumping hundreds of rows into one response as the demo data grows during §7.3 work.

### 8.3 Standard Error Shape — ✅ Implemented and verified
Global exception filter (`backend/src/common/filters/http-exception.filter.ts`), registered in `main.ts`. All error responses, across NestJS, use:
```json
{ "error": { "code": "NOT_FOUND", "message": "Task T999 does not exist", "statusCode": 404 } }
```
FastAPI side not yet given the equivalent handler (currently returns default FastAPI/Pydantic error shapes) — low priority since `/predict-task-time` never actually errors out to the client (always falls back instead, per §4).

### 8.4 Caching for Expensive Reads — not yet implemented
- `GET /operators/:operatorId/summary` (§9) recomputes a join across both datasets — cache it in-memory (a simple `Map` with a short TTL, e.g. 30s) rather than recomputing per request. Not a real production cache, but demonstrates awareness of the cost.

### 8.5 Circuit Breaker for the Python Service — partially implemented
`GET /health` (§10) exists and correctly reports `pythonServiceReachable`, but `/predict-task-time` doesn't consult it yet — it still attempts the live call every time (own 2s timeout + fallback). Wiring the health signal in as an actual short-circuit is still open.

### 8.6 Structured Logging — ✅ Implemented and verified
- Global request logging via `LoggerMiddleware` (`backend/src/common/middleware/logger.middleware.ts`), applied to all routes in `AppModule`. Logs `method path statusCode durationMs` for every request — verified in practice.
- Rule-engine trigger logging and ML prediction input/output logging (the audit-trail half of this item) **not yet added** — current logging is request-level only, not decision-level.

### 8.7 Basic Auth Boundary (Optional, Time-Permitting) — not implemented, lowest priority, as planned
- A single shared API key/header (`x-api-key`) required on write endpoints (`PATCH /tasks/:taskId`, `POST /incidents`) — not real multi-user auth, but demonstrates the team knows write endpoints shouldn't be wide open. Skip entirely if time is short; this is the lowest-priority item in §8.

### 8.8 Idempotency on Writes — ✅ Implemented and verified
- `POST /incidents` accepts an optional `requestId`; if reused, `IncidentsService` returns the original incident rather than creating a duplicate. Verified: identical `requestId` sent twice returned the same `incidentId` both times.

### 8.9 API Versioning — not yet implemented
- Prefix all endpoints with `/api/v1/` (see note at top of this file) once §8 work begins — signals the API is designed to evolve without breaking existing clients, which ties directly into README §2's "mission-oriented, could extend to fleet-wide" framing.

**Priority order if time is limited:** 8.1 (validation) → 8.3 (error shape) → 8.6 (logging) → 8.5 (circuit breaker) → 8.2 (pagination) → 8.4 (caching) → 8.9 (versioning) → 8.8 (idempotency) → 8.7 (auth, cut first if short on time — least likely to come up in panel Q&A relative to effort).

**Status against that order: 8.1 ✅, 8.3 ✅, 8.6 ✅ (request-level only), 8.5 partial, 8.8 ✅ (done out of order since it was cheap alongside §7's implementation) — remaining: 8.2, 8.4, 8.9, 8.7, plus finishing 8.5/8.6's decision-level logging.**

---

## Dataset Schema (FINALIZED — Source of Truth for Dev's Generator)

File format: **CSV**, one file per dataset, `snake_case` column headers (converted to `camelCase` at the NestJS API boundary — see field mappings below). Dev generates both files by end of step 1 (0:30–1:15) and commits them to the `data` branch immediately, polished or not.

### A. `operations.csv` — Operational/Safety Dataset

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

**Row count:** 150–200 rows, one row = one machine-session. Generate multiple sessions per `machine_id`/`operator_id` pair across different timestamps so the dashboard has a believable history.

**API boundary mapping** (CSV `snake_case` → JSON `camelCase`, done in NestJS's data-loading layer, not in the CSV itself):
`machine_id`→`machineId`, `operator_id`→`operatorId`, `idling_time_min`→ used to compute `/behavior-flags` `value`, `seatbelt_status`/`distance_to_nearest_object_m` → used to compute `/safety-alerts` entries. Ripun's rule engine reads this CSV directly — it is not re-exposed as a raw passthrough endpoint.

### B. `tasks.csv` — Task Time Estimation Dataset

| Column (CSV header) | Type | Valid values / range | Notes |
|---|---|---|---|
| `task_id` | string | `T001`, `T002`, … | sequential |
| `operator_id` | string | `OP-01` … `OP-15` | **added for §7.3 cross-feature synthesis** — must use the same ID space as `operations.csv`'s `operator_id` so the two datasets can be joined per operator |
| `task_type` | string | `Earth Excavation` \| `Trenching` \| `Material Loading` \| `Grading` \| `Demolition` | fixed set, matches provided sample — do not invent new task types |
| `weather` | string | `Sunny` \| `Rainy` \| `Cloudy` \| `Windy` | fixed set, matches provided sample |
| `operator_skill` | string | `Beginner` \| `Intermediate` \| `Expert` | |
| `machine_age_yrs` | int | `1`–`10` | |
| `estimated_time_min` | int | `15`–`120` | |
| `actual_time_min` | int | derived, see generation rule below | **this is the regression target**, not `estimated_time_min` |

**Row count:** 80–120 rows.

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
