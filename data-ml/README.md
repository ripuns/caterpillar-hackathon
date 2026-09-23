# Data / ML Layer — Smart Operator Assistant

Owned by Dev. Covers synthetic data, validation, the task-time regression
model, operator scoring, cross-feature synthesis, alert reasoning, and
what-if prediction. Run `python3 run_pipeline.py` to reproduce everything.

## 1. Schema

**`data/operations.csv`** (423 rows, 15 operators, 20-35 sessions each):
`timestamp, machine_id, operator_id, engine_hours, fuel_used_l, load_cycles,
idling_time_min, seatbelt_status, distance_to_nearest_object_m,
safety_alert_triggered, training_completed_recent`

**`data/tasks.csv`** (248 rows, 15 operators, 10-20 tasks each):
`task_id, operator_id, timestamp, task_type, weather, operator_skill,
machine_age_yrs, estimated_time_min, actual_time_min`

Two fields (`operator_id`, `timestamp` on `tasks.csv`; `training_completed_recent`
on `operations.csv`) were added to CONTRACTS.md's original schema — everything
else is unchanged and locked.

## 2. Data generation

`generate_data.py`, fixed seed `42` (fully reproducible — reran twice, byte-identical
row counts and metrics both times). 15 operators are assigned one of 5 behavioral
archetypes so the dataset has real, explainable structure instead of uniform noise:

| Archetype | Operators | Pattern |
|---|---|---|
| safe | OP-01–05 | low idling, low alerts, low overrun, mostly trained |
| idling_prone | OP-06–08 | chronic excessive idling |
| overrun_prone | OP-09–11 | consistently runs long on tasks |
| risky | OP-12–13 | seatbelt/proximity violations |
| average | OP-14–15 | middling, some randomness |

`safety_alert_triggered` is computed directly from the same rule the backend
uses (seatbelt unfastened OR proximity < 3m OR idling > 45min), so the label
is consistent with the rule engine by construction, not coincidence.

`actual_time_min` follows CONTRACTS.md's multiplier rule (skill × weather ×
machine-age × noise), plus an extra multiplier for `overrun_prone` operators
so the per-operator overrun pattern is real and not fully explained by skill
alone — needed for the operator score and cross-feature synthesis to have
genuine per-operator signal to find.

## 3. Validation

`validate.py` — required columns, types, valid value sets, numeric ranges,
uniqueness (`task_id`), and a **consistency check** that `safety_alert_triggered`
actually matches the rule that should have produced it. Also confirms every
operator referenced in `tasks.csv` exists in `operations.csv`. Exits non-zero
on any hard failure. Current run: **PASSED**, 0 errors.

## 4. Task-time regression model

`train_model.py` — `sklearn.Pipeline`: `ColumnTransformer(OneHotEncoder(handle_unknown="ignore"))`
on `[task_type, weather, operator_skill]`, numeric passthrough on
`[machine_age_yrs, estimated_time_min]`, feeding `LinearRegression`.
Target: `actual_time_min`. Never trained on `actual_time_min` itself.

70/15/15 train/validation/test split, seed 42. **Real metrics from the last run:**

| Split | MAE (min) | RMSE (min) | R² |
|---|---|---|---|
| Train | 4.59 | 6.24 | 0.933 |
| Validation | 7.58 | 10.87 | 0.898 |
| Test | 4.13 | 6.76 | 0.926 |

Sanity check against the 3 provided sample-row patterns (Expert+Sunny,
Beginner+Cloudy, Intermediate+Windy+Demolition) — predictions of 57.4 / 56.3
/ 108.8 min vs. sample actuals of 58 / 42 / 105. Direction and magnitude are
right for 2 of 3; the Beginner+Cloudy case is off because the synthetic
generator's `overrun_prone` archetype effect is folded into the aggregate
Beginner multiplier the model learns, so a single hand-picked sample row
won't reproduce exactly — expected given synthetic (not real) training data.

Artifact: `model/task_time_pipeline.joblib` (single file, preprocessing +
model together — the FastAPI wrapper just calls `.predict()` on a raw dict).

## 5. Operator Performance Score

`scoring.py` — **not a model, and NOT the same concept as prediction
"confidence"** (see §5a). A documented, weighted formula over observable
data only (README requirement: no black-box psychological assessment).
0-100, four components:

| Component | Weight | Signal |
|---|---|---|
| Safety compliance | 40 | seatbelt/proximity violations, overall alert rate |
| Task performance | 30 | average task-time overrun % |
| Machine-use behavior | 20 | excessive-idling session rate |
| Training status | 10 | `training_completed_recent` |

Each component score = weight × (1 − penalty), penalty scaled by the
relevant rate, floored at 0. Score is fully deterministic — same input data
always produces the same score (verified across two clean pipeline reruns,
seed 42).

**Status bands** (`thresholds.SCORE_STATUS_BANDS`):

| Range | Status |
|---|---|
| 85-100 | EXCELLENT |
| 65-84 | GOOD |
| 40-64 | NEEDS_ATTENTION |
| 0-39 | CRITICAL |

Every score returns a `contributingFactors` list built from the actual
counts in the data (e.g. `"2 recent safety alerts"`), never hardcoded text.

Verified against archetypes: safe operators scored 90-98 (EXCELLENT);
idling_prone/risky operators scored 30-72 (CRITICAL to GOOD) — the score
separates archetypes as intended. Weights (40/30/20/10) are a first-pass
judgment call, not empirically tuned.

### 5a. Operator Performance Score vs. Prediction Confidence — NOT the same thing

Two unrelated concepts exist in this codebase and must not be conflated:

| | Operator Performance Score | Prediction confidence |
|---|---|---|
| Field | `score` (0-100) + `status`, in `scoring.py` | `confidence` (`low`/`medium`/`high`), in `predict.py` |
| Scope | one operator's historical behavior | one single task-time prediction |
| How computed | weighted formula over real counts | **fixed heuristic label**, not computed from model uncertainty |
| Statistical meaning | none claimed — explicitly not a probability | none — LinearRegression does not natively produce a calibrated confidence interval |

`predict_task_time()` always returns `"confidence": "medium"` when
`source == "model"`, and `fallback_average()` always returns `"low"`. This
is a fixed label per CONTRACTS.md §4, not a statistical estimate — do not
present it to the panel as model uncertainty. A real prediction interval
(e.g. from residual variance) would be a legitimate future improvement, not
implemented here.

## 6. Cross-feature synthesis

`cross_feature.py` — deterministic, no LLM/ML. **Audit fix applied:** the
original version derived "safety" from `safety_alert_triggered`, which (per
the locked generation rule) also fires on excessive idling — so one idling
session could count as both the safety signal and the idling signal,
inflating flags. Categories are now computed from independent raw fields
with zero shared underlying events:

| Category | Computed from | Independent of |
|---|---|---|
| `safety` | `seatbelt_status == "Unfastened"` OR `distance_to_nearest_object_m < 3` | idling |
| `behavior` | `idling_time_min > 45` | seatbelt/proximity |
| `task` | task overrun ≥ 15% vs. estimate | safety/idling |

Requires **2 of these 3 independent categories** over threshold before
flagging `operatorNeedsAttention = true` — genuine cross-feature co-
occurrence, not one behavior double-counted. Exact category combination maps
to a training-hub module via `MODULE_MAP`. Current run: 10 of 15 operators
flagged, but the underlying evidence is now non-overlapping (e.g. OP-06's
safety count dropped from 25 pre-fix to 2 post-fix, since 25 was mostly the
same idling events being counted twice).

## 7. Alert reasoning

`alert_reasoning.py` — for every session where a rule fires, emits one or
more structured objects: `{alertType, severity, triggered, reason,
observedValue, threshold}`. `UNSAFE_PATTERN` uses a running per-operator
alert count in timestamp order (not future-looking). This is additive to
CONTRACTS.md's existing `message` field, not a replacement — lets the
frontend build "why am I being alerted" without hardcoded UI copy. Current
run: 201 sessions with at least one structured reason.

## 8. What-if prediction

`predict.py` — `predict_task_time(...)` loads the same joblib pipeline and
is fully stateless: no caching or session state keyed by operator, so
repeated calls with one field changed return correctly varying predictions.
Verified: Sunny→Rainy→Beginner chain produces 57.4 → 60.7 → 92.8 min,
each change moving in the expected direction.

`fallback_average(...)` is the documented fallback NestJS should call if the
Python service is unreachable — always returns `source: "fallback_average"`,
`confidence: "low"`, per CONTRACTS.md.

## 9. Thresholds

Centralized in `thresholds.py` — single source of truth, must match
CONTRACTS.md and Ripun's rule engine exactly:

```
IDLE_TIME_THRESHOLD_MIN = 45.0
PROXIMITY_THRESHOLD_M = 3.0
SAFETY_ALERT_COUNT_THRESHOLD = 3
TASK_DELAY_THRESHOLD_PERCENT = 15.0
OPERATOR_OVERRUN_THRESHOLD_PERCENT = 15.0
TRAINING_TRIGGER_SAFETY_ALERT_COUNT = 2
TRAINING_TRIGGER_IDLING_SESSION_COUNT = 2
TRAINING_TRIGGER_OVERRUN_TASK_COUNT = 2
```

These are demo/configuration values only, not official Caterpillar safety
limits.

## 10. Naming mapping (canonical, one contract)

| CSV / model column | Python function param | JSON request field | JSON response field |
|---|---|---|---|
| `task_type` | `task_type` | `taskType` | — |
| `weather` | `weather` | `weather` | — |
| `operator_skill` | `operator_skill` | `operatorSkill` | — |
| `machine_age_yrs` | `machine_age_years` | `machineAgeYears` | — |
| `estimated_time_min` | `estimated_time_min` | `estimatedTimeMin` | — |
| `actual_time_min` | — (never an input) | — | — |
| — | — | — | `predictedTimeMin`, `source`, `confidence` |

This matches CONTRACTS.md's existing "API boundary mapping" exactly — no
naming changes were needed. The one place a snake_case name differs from its
CSV column is `predict_task_time()`'s `machine_age_years` parameter (matches
the JSON `machineAgeYears`, translated internally to the `machine_age_yrs`
DataFrame column the model expects) — this is deliberate, not an
inconsistency.

## 11. Limitations

- Synthetic data, not real telemetry — the model's real-world accuracy is
  unverified; metrics reflect fit to this generator's own distribution, not
  real-world accuracy, and R² should not be described to the panel as
  "accuracy."
- LinearRegression is intentionally simple per the hackathon brief; a small
  decision tree was the documented alternative but wasn't needed given the
  clean synthetic signal (R² 0.93 on test).
- Operator score weights (40/30/20/10) are a first-pass judgment call, not
  empirically tuned — reasonable to state as such if pressed.
- Prediction `confidence` is a fixed heuristic label (see §5a), not a
  calibrated statistical confidence interval.

## 12. Reproduce everything

```bash
python3 run_pipeline.py
```

Runs generation → validation → training → scoring → synthesis → alert
reasoning → writes `outputs/*.json`, in order, failing fast on any error.
Individual steps can also be run standalone: `generate_data.py`,
`validate.py`, `train_model.py`, `scoring.py`, `cross_feature.py`,
`alert_reasoning.py`, `predict.py`.
