# ml-service/

## What

Standalone FastAPI model-serving layer, called by the NestJS backend over HTTP (`../backend/src/prediction/`). Serves `POST /predict-task-time` (one of the 5 core outcomes) and `POST /predict-safety-risk` (§4.1, stretch differentiator).

## Why

Kept as a separate Python process rather than embedded in NestJS because the trained model (`../data-ml/model/task_time_pipeline.joblib`) is a scikit-learn pipeline — Python's native ecosystem, not something to reimplement in TypeScript. NestJS calls it over HTTP with a timeout + circuit breaker (§8.5) rather than depending on it being up, per the root `README.md` §2's "always return a valid response" design decision.

## How

`main.py` loads `task_time_pipeline.joblib` lazily (once, cached) and serves predictions with `confidence: "medium"`; if the model errors, it falls back to `weighted_average_fallback()` — a formula duplicated exactly in NestJS's own inline fallback, so both layers agree regardless of which one answers. `/predict-safety-risk` follows the same lazy-load pattern for `safety_risk_model.joblib`, but has no fallback formula (per §4.1, no safe rule-based risk number exists) — it returns `source: "fallback_unavailable"` until that model file exists. `requirements.txt` pins `scikit-learn` to match whatever version last (re-)serialized the model — must be re-pinned any time Dev retrains and re-saves it, or predictions will emit version-mismatch warnings.

## File Responsibilities

- **`main.py`** — the FastAPI app. `GET /health`, `POST /predict-task-time`, `POST /predict-safety-risk`. Depends on `../data-ml/model/task_time_pipeline.joblib` and (once it exists) `../data-ml/model/safety_risk_model.joblib`. Depended on by `../backend/src/prediction/prediction.controller.ts` and `safety-risk.controller.ts`, and by `../backend/src/health/ml-service-health.service.ts` for the circuit-breaker ping.
- **`requirements.txt`** — pinned dependencies, notably `scikit-learn` (version-sensitive — see How above).
