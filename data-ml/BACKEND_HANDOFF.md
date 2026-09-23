# Backend Handoff — Data/ML Layer → Ripun

Everything in this repo's `data-ml/` is Dev's completed data + ML layer.
This doc is what you need to wire it into NestJS/FastAPI. Nothing here
changes the endpoint shapes you already locked in `CONTRACTS.md` — the one
addition is documented in `CONTRACTS_PATCH.md`, apply that to the real
`CONTRACTS.md` yourself.

## 1. `POST /predict-task-time`

Request/response shape is unchanged from `CONTRACTS.md` §4:

```json
// request
{
  "taskType": "Material Loading",
  "weather": "Cloudy",
  "operatorSkill": "Beginner",
  "machineAgeYears": 3,
  "estimatedTimeMin": 30
}
```

```json
// response
{
  "predictedTimeMin": 41.5,
  "source": "model",
  "confidence": "medium"
}
```

**How to wire it in FastAPI:** load the model once at service startup
(not per-request), then call `predict.py`'s `predict_task_time()` directly,
or replicate its few lines inline:

```python
import joblib, pandas as pd

pipeline = joblib.load("data-ml/model/task_time_pipeline.joblib")

def predict_task_time(task_type, weather, operator_skill, machine_age_years, estimated_time_min):
    X = pd.DataFrame([{
        "task_type": task_type,
        "weather": weather,
        "operator_skill": operator_skill,
        "machine_age_yrs": machine_age_years,
        "estimated_time_min": estimated_time_min,
    }])
    predicted = float(pipeline.predict(X)[0])
    return {"predictedTimeMin": round(predicted, 1), "source": "model", "confidence": "medium"}
```

Field name mapping (JSON camelCase → model's snake_case columns):
`taskType`→`task_type`, `weather`→`weather`, `operatorSkill`→`operator_skill`,
`machineAgeYears`→`machine_age_yrs`, `estimatedTimeMin`→`estimated_time_min`.

**Model artifact path:** `data-ml/model/task_time_pipeline.joblib` (adjust
relative path to wherever `ml-service/` actually sits relative to `data-ml/`
once merged into the real repo layout).

**Fallback:** `predict.py`'s `fallback_average()` is a minimal placeholder
(`estimated_time_min * 1.1`) meant only to demonstrate the response shape —
it is **not** the same weighted-average formula documented in
`EXECUTION_PLAN.md` §2.2 Step 3 (which varies the multiplier by skill/
weather/machine-age). Use the `EXECUTION_PLAN.md` formula for the real
NestJS/FastAPI fallback path; `predict.py`'s version is a stand-in only.
Flagging this explicitly so it isn't copy-pasted as the real fallback.

## 2. Operator Performance Score — `data-ml/outputs/operator_scores.json`

Not a live endpoint yet — this is Dev's generated snapshot. If you want it
served live, the logic to port is `scoring.py`'s `compute_all_scores(ops_df,
tasks_df)` / `compute_operator_score(operator_id, ops_df, tasks_df)`, which
take the already-loaded `operations.csv`/`tasks.csv` DataFrames you already
read in `data-loader.service.ts` (or re-implement identically in
TypeScript — it's a pure formula, no ML, see below).

Shape (one object per operator, 15 total):

```json
{
  "operatorId": "OP-01",
  "score": 96,
  "status": "EXCELLENT",
  "componentScores": {
    "safetyCompliance": 36.5,
    "taskPerformance": 29.8,
    "machineUseBehavior": 20.0,
    "trainingStatus": 10
  },
  "contributingFactors": [
    "2 session(s) with proximity below 3.0m",
    "0% average task-time overrun across 14 tasks",
    "no excessive-idling sessions on record",
    "training completed recently"
  ],
  "sessionsAnalyzed": 34,
  "tasksAnalyzed": 14
}
```

`status` bands: `EXCELLENT` 85-100, `GOOD` 65-84, `NEEDS_ATTENTION` 40-64,
`CRITICAL` 0-39. Weights: safety compliance 40, task performance 30,
machine-use behavior 20, training status 10 (sum to 100).

**This is not the same thing as prediction `confidence`** — see §5 below.
Don't merge these two concepts into one field or endpoint.

## 3. Alert reasoning — `data-ml/outputs/alert_reasoning.json`

201 session objects, each: `{alertType, severity, triggered, reason,
observedValue, threshold}`. This is additive to your existing
`/safety-alerts` `message` field (§7.1's "why was I flagged" story) — logic
lives in `alert_reasoning.py`'s `build_alert_reasoning(ops_df)`, pure
rule-based, no ML, safe to port to TypeScript if you'd rather keep it in
NestJS.

## 4. Cross-feature synthesis — `data-ml/outputs/cross_feature_insights.json`

Backing data for `GET /operators/:operatorId/summary` (`CONTRACTS.md` §9).
Logic is `cross_feature.py`'s `synthesize(operator_id, ops_df, tasks_df)`.
**Important:** flags `operatorNeedsAttention` only when **2 of 3
independent** categories fire — `safety` (seatbelt OR proximity, not
idling), `behavior` (idling only), `task` (overrun only). Do not reuse
`safety_alert_triggered` directly for the `safety` category here — that
column also fires on idling per the locked generation rule, which is
exactly the double-counting bug this was already fixed to avoid. Recompute
`safety` from `seatbelt_status`/`distance_to_nearest_object_m` directly, as
`cross_feature.py` does.

```json
{
  "operatorId": "OP-06",
  "operatorNeedsAttention": true,
  "signalsFired": ["behavior", "safety"],
  "evidence": {
    "safetyIncidentCount": 2,
    "idlingSessionCount": 25,
    "overrunTaskCount": 0
  },
  "recommendation": "Consider refresher training: Safe and Efficient Machine Operation.",
  "recommendedModuleId": "TH_SAFE_EFFICIENT_OPS",
  "recommendedModuleTitle": "Safe and Efficient Machine Operation"
}
```

## 5. Operator score vs. prediction confidence — do not conflate

| | Operator Performance Score | Prediction `confidence` |
|---|---|---|
| Where | `scoring.py` / `operator_scores.json` | `predict.py` / `/predict-task-time` response |
| Scope | one operator's historical behavior | one single task-time prediction |
| How computed | weighted formula over real counts | fixed heuristic label |
| Statistical meaning | none claimed | none — not a calibrated confidence interval |

`confidence` is always `"medium"` when `source == "model"` and always
`"low"` when `source == "fallback_average"` — a fixed label per
`CONTRACTS.md` §4, not derived from model uncertainty.

## 6. Deterministic safety rules vs. ML — unchanged split

Individual violation detection (seatbelt, proximity, idling threshold,
unsafe-pattern count) stays exactly as you already built it — rule-based,
deterministic, using `thresholds.py`'s constants, which are identical to
`CONTRACTS.md`'s locked thresholds:

```
IDLE_TIME_THRESHOLD_MIN = 45.0
PROXIMITY_THRESHOLD_M = 3.0
SAFETY_ALERT_COUNT_THRESHOLD = 3
```

Only the task-time prediction (`/predict-task-time`) and, if you build
§7.2's stretch, the composite safety risk score are ML. The Operator
Performance Score and cross-feature synthesis (this handoff, §2 and §4)
are also rule/formula-based, not ML — same explainability story applies.

## 7. Additional thresholds (new, for score/synthesis — not in original CONTRACTS.md)

```
TASK_DELAY_THRESHOLD_PERCENT = 15.0
OPERATOR_OVERRUN_THRESHOLD_PERCENT = 15.0
TRAINING_TRIGGER_SAFETY_INCIDENT_COUNT = 2
TRAINING_TRIGGER_IDLING_SESSION_COUNT = 2
TRAINING_TRIGGER_OVERRUN_TASK_COUNT = 2
```

All defined once in `thresholds.py` — treat that file as the single source
of truth if you port any of this logic into TypeScript, so the numbers
never drift between the two languages.

## 8. Commands

```bash
cd data-ml
pip install -r requirements.txt
python3 run_pipeline.py      # generate -> validate -> train -> score -> synthesize -> reason
```

Individual steps: `python3 generate_data.py`, `validate.py`,
`train_model.py`, `scoring.py`, `cross_feature.py`, `alert_reasoning.py`,
`predict.py` (each also runnable standalone with a small demo in
`if __name__ == "__main__"`).
