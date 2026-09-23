"""
FastAPI model-serving layer.

Wraps the trained task-time regression model (data-ml/model/task_time_pipeline.joblib,
see data-ml/BACKEND_HANDOFF.md ss1 for the reference wiring this follows) behind
POST /predict-task-time, matching CONTRACTS.md ss4's request/response shape exactly.

The fallback here is the real weighted-average formula from EXECUTION_PLAN.md
ss2.2 Step 3 (skill/weather/machine-age multipliers) - NOT data-ml/predict.py's
fallback_average(), which BACKEND_HANDOFF.md ss1 explicitly flags as a placeholder
only meant to demonstrate the response shape. This mirrors the identical formula
implemented in NestJS's own inline fallback, so both fallback paths agree.
"""

from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI()

_PIPELINE = None
_MODEL_PATH = "../data-ml/model/task_time_pipeline.joblib"


def _load_model():
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = joblib.load(_MODEL_PATH)
    return _PIPELINE


class PredictTaskTimeRequest(BaseModel):
    taskType: str
    weather: str
    operatorSkill: str
    machineAgeYears: int
    estimatedTimeMin: int


def weighted_average_fallback(
    estimated_time_min: int, operator_skill: str, weather: str, machine_age_years: int
) -> float:
    multiplier = 1.0
    if operator_skill == "Beginner":
        multiplier *= 1.25
    elif operator_skill == "Intermediate":
        multiplier *= 1.05
    elif operator_skill == "Expert":
        multiplier *= 0.95
    if weather in ("Rainy", "Windy"):
        multiplier *= 1.10
    if machine_age_years > 5:
        multiplier *= 1.07
    return round(estimated_time_min * multiplier, 1)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict-task-time")
def predict_task_time(req: PredictTaskTimeRequest):
    try:
        pipeline = _load_model()
        X = pd.DataFrame(
            [
                {
                    "task_type": req.taskType,
                    "weather": req.weather,
                    "operator_skill": req.operatorSkill,
                    "machine_age_yrs": req.machineAgeYears,
                    "estimated_time_min": req.estimatedTimeMin,
                }
            ]
        )
        predicted = float(pipeline.predict(X)[0])
        return {
            "predictedTimeMin": round(predicted, 1),
            "source": "model",
            "confidence": "medium",
        }
    except Exception:
        # Model unavailable/errored - fall back rather than fail the request.
        # Mirrors NestJS's own inline fallback (EXECUTION_PLAN.md ss2.2 Step 4),
        # so both layers of fallback agree on the exact formula.
        fallback_value = weighted_average_fallback(
            req.estimatedTimeMin, req.operatorSkill, req.weather, req.machineAgeYears
        )
        return {
            "predictedTimeMin": fallback_value,
            "source": "fallback_average",
            "confidence": "low",
        }
