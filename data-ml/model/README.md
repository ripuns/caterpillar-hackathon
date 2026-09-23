# model/

## `task_time_pipeline.joblib`

A single `sklearn.Pipeline` object (preprocessing + model together):

```
ColumnTransformer(
    OneHotEncoder(handle_unknown="ignore") on [task_type, weather, operator_skill],
    passthrough on [machine_age_yrs, estimated_time_min]
) -> LinearRegression
```

**Features:** `task_type`, `weather`, `operator_skill`, `machine_age_yrs`,
`estimated_time_min`.
**Target:** `actual_time_min` (never used as an input feature).

Load and call directly — no separate preprocessing step needed:

```python
import joblib, pandas as pd
pipeline = joblib.load("model/task_time_pipeline.joblib")
X = pd.DataFrame([{
    "task_type": "Material Loading",
    "weather": "Cloudy",
    "operator_skill": "Beginner",
    "machine_age_yrs": 3,
    "estimated_time_min": 30,
}])
predicted = float(pipeline.predict(X)[0])
```

This is exactly what `../predict.py`'s `predict_task_time()` does, and what
Ripun's FastAPI `/predict-task-time` wrapper should call `.predict()` on
directly (see `../BACKEND_HANDOFF.md`).

## `metrics.json`

Real metrics from the last training run (70/15/15 train/validation/test
split, seed 42):

| Split | MAE (min) | RMSE (min) | R² |
|---|---|---|---|
| Train | 4.588 | 6.236 | 0.933 |
| Validation | 7.581 | 10.873 | 0.898 |
| Test | 4.127 | 6.761 | 0.926 |

`n_train`/`n_val`/`n_test` and the exact `features`/`target` list are also
recorded in the file. **R² is not "accuracy"** — do not describe it that way
to the panel.

## Regenerating

```bash
cd data-ml
python3 train_model.py   # writes model/task_time_pipeline.joblib and model/metrics.json
```

Verified reproducible: regenerating from `data/tasks.csv` (seed 42)
reproduces byte-identical `metrics.json` and an identical-size model
artifact.
