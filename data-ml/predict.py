"""
What-if / live task-time prediction.

No separate model - loads the same joblib pipeline trained in train_model.py
and exposes a single stateless predict_task_time() function. Safe to call
repeatedly with only one field changed (e.g. Sunny -> Rainy) since the
pipeline holds no state between calls.

This is what Ripun's FastAPI /predict-task-time endpoint wraps directly.
"""

import joblib
import pandas as pd

_PIPELINE = None
_MODEL_PATH = "model/task_time_pipeline.joblib"


def _load():
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = joblib.load(_MODEL_PATH)
    return _PIPELINE


def predict_task_time(task_type: str, weather: str, operator_skill: str,
                       machine_age_years: int, estimated_time_min: int) -> dict:
    """
    Matches CONTRACTS.md POST /predict-task-time request/response shape.
    Stateless: call this as many times as needed with different inputs.
    """
    pipeline = _load()
    X = pd.DataFrame([{
        "task_type": task_type,
        "weather": weather,
        "operator_skill": operator_skill,
        "machine_age_yrs": machine_age_years,
        "estimated_time_min": estimated_time_min,
    }])
    predicted = float(pipeline.predict(X)[0])
    return {
        "predictedTimeMin": round(predicted, 1),
        "source": "model",
        # PREDICTION CONFIDENCE (not to be confused with the Operator Performance
        # Score in scoring.py - unrelated concept, unrelated code path).
        # This is a FIXED heuristic label, not a statistical confidence interval
        # or calibrated probability - LinearRegression does not natively produce
        # one. Per CONTRACTS.md SS4: source="model" always returns "medium" here
        # for simplicity; a real prediction interval (e.g. from residual
        # variance) is documented as a nice-to-have, not implemented.
        "confidence": "medium",
    }


def fallback_average(estimated_time_min: int) -> dict:
    """
    NestJS-side fallback if the Python service is unreachable/times out.
    Matches CONTRACTS.md's documented fallback contract: source must be
    'fallback_average' and confidence must always be 'low'.
    """
    return {
        "predictedTimeMin": round(estimated_time_min * 1.1, 1),  # simple weighted bump
        "source": "fallback_average",
        "confidence": "low",
    }


if __name__ == "__main__":
    import json
    # demonstrate the what-if flow: same base request, one field changed each time
    base = dict(task_type="Earth Excavation", weather="Sunny",
                operator_skill="Expert", machine_age_years=2, estimated_time_min=60)

    print("Base:", json.dumps(predict_task_time(**base)))

    variant = dict(base, weather="Rainy")
    print("Weather -> Rainy:", json.dumps(predict_task_time(**variant)))

    variant2 = dict(variant, operator_skill="Beginner")
    print("Skill -> Beginner:", json.dumps(predict_task_time(**variant2)))
