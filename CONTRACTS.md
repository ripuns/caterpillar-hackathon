# API & Data Contracts

Endpoint shapes and dataset schema below are **finalized drafts** — concrete enough to build against immediately. Walk through this together in Hour 0–0:30 (see `EXECUTION_PLAN.md`), adjust anything wrong, then lock it. Once agreed, do not change unilaterally — flag changes to the other two before editing, and log them below.

**Ports:** NestJS `3000` · Python (FastAPI) `8001` · Next.js `3001` (or framework default)

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

**API boundary mapping:** `task_type`→`taskType`, `operator_skill`→`operatorSkill`, `machine_age_yrs`→`machineAgeYears`, `estimated_time_min`→`estimatedTimeMin`. This is the training data for the model behind `/predict-task-time` (§4) — the request shape there already matches these field names.

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
