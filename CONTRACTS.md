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

Response:
```json
[
  {
    "moduleId": "TH001",
    "title": "Safe Excavation Practices",
    "format": "article",
    "content": "..."
  }
]
```
`format`: fixed to `"article"` for this build (e-learning/static content — see README §4.1 scope decision). Extend only if time allows.

---

## 6. `PATCH /tasks/:taskId` — Update Task Status (§8, Production Hardening)

Request:
```json
{ "status": "in_progress" }
```
`status`: `"pending" | "in_progress" | "completed"`

Response: the updated task object (same shape as §1's list items).

Errors: `404` if `taskId` doesn't exist (see §8.3 error shape), `400` if `status` isn't a valid value.

---

## 7. `POST /incidents` — Manual Incident Logging (§8, Production Hardening)

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

Response: array of the incident objects from §7 (both `loggedBy` values), newest first. Supports pagination — see §8.2.

## 9. `GET /operators/:operatorId/summary` — Per-Operator Rollup (Supports §7.3)

Response:
```json
{
  "operatorId": "OP-04",
  "totalTasks": 12,
  "safetyAlertCount": 3,
  "avgTaskOverrunPct": 18.4,
  "flaggedForRetraining": true,
  "recommendedTrainingModules": ["TH001"]
}
```
This is the concrete endpoint behind §7.3's cross-feature synthesis — NestJS computes it by joining `operations.csv` (safety alert history) and `tasks.csv` (overrun history, via the now-shared `operator_id`) per operator, at request time or on a cached interval (see §8.4).

## 10. `GET /health` — Service Health Check (Both NestJS and FastAPI)

Response:
```json
{ "status": "ok", "uptime": 3421, "pythonServiceReachable": true }
```
NestJS's `/health` should itself check FastAPI's health (a short-timeout ping) and report `pythonServiceReachable` — this is what §8's circuit-breaker logic (below) uses to decide whether to call the model or go straight to fallback, instead of waiting for every request to time out individually.

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

---

## 8. Production Hardening (Hour 5+, Post-Core — See `EXECUTION_PLAN.md`)

Everything below is explicitly **not required for the first review**. It exists to take this from "working demo" toward "something that could plausibly run for real," which is the more ambitious bar the team is now building toward. Build only after the core 5 outcomes and the §7 differentiator features are solid.

### 8.1 Input Validation
- Every `POST`/`PATCH` body validated against its schema (NestJS: `class-validator` DTOs; FastAPI: Pydantic models — already idiomatic there). Reject malformed requests with `400` before they reach business logic, not after.
- Reject unknown enum values explicitly (e.g. `weather: "Foggy"` should `400`, not silently fall through to an undefined rule branch).

### 8.2 Pagination
- `GET /tasks`, `GET /safety-alerts`, `GET /behavior-flags`, `GET /incidents` accept `?page=1&pageSize=20` query params. Response wraps the array: `{ "data": [...], "page": 1, "pageSize": 20, "total": 147 }`. Prevents a growing dataset from dumping hundreds of rows into one response as the demo data grows during §7.3 work.

### 8.3 Standard Error Shape
All error responses, across both NestJS and FastAPI, use the same JSON shape so the frontend has one error-handling path:
```json
{ "error": { "code": "TASK_NOT_FOUND", "message": "Task T999 does not exist", "statusCode": 404 } }
```

### 8.4 Caching for Expensive Reads
- `GET /operators/:operatorId/summary` (§9) recomputes a join across both datasets — cache it in-memory (a simple `Map` with a short TTL, e.g. 30s) rather than recomputing per request. Not a real production cache, but demonstrates awareness of the cost.

### 8.5 Circuit Breaker for the Python Service
- Use `GET /health`'s `pythonServiceReachable` (§10) to short-circuit: if the last health check failed, skip the network call entirely and go straight to fallback (§4's `fallback_average` / §4.1's `fallback_unavailable`) instead of waiting out a timeout on every prediction request. Simple in-memory flag, refreshed every ~10s, is enough — no need for a real library.

### 8.6 Structured Logging
- Every request logged with: timestamp, method, path, status code, duration — plain `console.log`/Python `logging` is fine, but keep the format consistent so panel Q&A about "how would you debug this in production" has a real answer.
- Log every rule-engine trigger (which rule fired, on what data) and every ML prediction (input + output) — this becomes your audit trail, which directly supports the "explainable, not black-box" narrative (§2) with actual evidence, not just a claim.

### 8.7 Basic Auth Boundary (Optional, Time-Permitting)
- A single shared API key/header (`x-api-key`) required on write endpoints (`PATCH /tasks/:taskId`, `POST /incidents`) — not real multi-user auth, but demonstrates the team knows write endpoints shouldn't be wide open. Skip entirely if time is short; this is the lowest-priority item in §8.

### 8.8 Idempotency on Writes
- `POST /incidents` should be safe to retry (e.g. accept an optional client-generated `requestId`; if seen before, return the original response rather than creating a duplicate). Matters if the frontend ever retries a failed request automatically.

### 8.9 API Versioning
- Prefix all endpoints with `/api/v1/` (see note at top of this file) once §8 work begins — signals the API is designed to evolve without breaking existing clients, which ties directly into README §2's "mission-oriented, could extend to fleet-wide" framing.

**Priority order if time is limited:** 8.1 (validation) → 8.3 (error shape) → 8.6 (logging) → 8.5 (circuit breaker) → 8.2 (pagination) → 8.4 (caching) → 8.9 (versioning) → 8.8 (idempotency) → 8.7 (auth, cut first if short on time — least likely to come up in panel Q&A relative to effort).

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
| — | **pending, not yet applied:** Dev's `CONTRACTS_PATCH.md` on the `data` branch proposes adding `training_completed_recent` to `operations.csv` and `timestamp` to `tasks.csv` (needed for his completed Operator Performance Score / cross-feature work). `operator_id` on `tasks.csv` is already covered above. Review and apply before merging `data` branch. | Dev (proposed), awaiting Ripun's merge |
