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

_RISK_MODEL = None
_RISK_MODEL_PATH = "../data-ml/model/safety_risk_model.joblib"


def _load_model():
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = joblib.load(_MODEL_PATH)
    return _PIPELINE


def _load_risk_model():
    """
    Placeholder loader for the safety-risk model (CONTRACTS.md §4.1).
    Returns None until Dev drops safety_risk_model.joblib into data-ml/model/ —
    see that file's expected shape in the docstring on predict_safety_risk()
    below. Deliberately does NOT fall back to a fabricated score if missing;
    §4.1 is explicit that there's no safe rule-based fallback number for a
    risk score, unlike /predict-task-time.
    """
    global _RISK_MODEL
    if _RISK_MODEL is None:
        try:
            _RISK_MODEL = joblib.load(_RISK_MODEL_PATH)
        except FileNotFoundError:
            return None
    return _RISK_MODEL


class PredictTaskTimeRequest(BaseModel):
    taskType: str
    weather: str
    operatorSkill: str
    machineAgeYears: int
    estimatedTimeMin: int


class PredictSafetyRiskRequest(BaseModel):
    seatbeltStatus: str
    distanceToNearestObjectM: float
    idlingTimeMin: float


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


def _risk_tier(risk_score: float) -> str:
    if risk_score > 0.5532:
        return "high"
    if risk_score >= 0.2565:
        return "medium"
    return "low"


@app.post("/predict-safety-risk")
def predict_safety_risk(req: PredictSafetyRiskRequest):
    """
    Composite Safety Risk Score.

    Uses the trained safety_risk_model.joblib pipeline.

    The model predicts the probability of a safety incident occurring
    in the operator's next chronological operation.

    topFactors are calculated from the transformed Logistic Regression
    feature contributions and mapped back to the three API-level factors.
    """
    model = _load_risk_model()

    if model is None:
        return {
            "riskScore": None,
            "riskTier": None,
            "topFactors": [],
            "source": "fallback_unavailable",
        }

    try:
        X = pd.DataFrame(
            [
                {
                    "seatbelt_status": req.seatbeltStatus,
                    "distance_to_nearest_object_m": req.distanceToNearestObjectM,
                    "idling_time_min": req.idlingTimeMin,
                }
            ]
        )

        # Predict positive-class probability = future safety risk.
        risk_score = float(model.predict_proba(X)[0][1])

        # Get preprocessing + classifier from the trained Pipeline.
        preprocessor = model.named_steps["preprocessor"]
        classifier = model.named_steps["classifier"]

        # Transform the input exactly as the model sees it.
        transformed_X = preprocessor.transform(X)

        # Logistic Regression coefficients.
        coefficients = classifier.coef_[0]

        # Contribution = coefficient * transformed feature value.
        transformed_values = transformed_X.toarray()[0] if hasattr(
            transformed_X, "toarray"
        ) else transformed_X[0]

        contributions = coefficients * transformed_values

        # Get transformed feature names.
        feature_names = preprocessor.get_feature_names_out()

        factor_contributions = {
            "seatbeltStatus": 0.0,
            "distanceToNearestObjectM": 0.0,
            "idlingTimeMin": 0.0,
        }

        for feature_name, contribution in zip(
            feature_names, contributions
        ):
            contribution = float(contribution)

            if "seatbelt_status" in feature_name:
                factor_contributions["seatbeltStatus"] += contribution

            elif "distance_to_nearest_object_m" in feature_name:
                factor_contributions["distanceToNearestObjectM"] += contribution

            elif "idling_time_min" in feature_name:
                factor_contributions["idlingTimeMin"] += contribution

        # Sort by contribution magnitude so the strongest factors appear first.
        top_factors = [
            {
                "factor": factor,
                "contribution": round(contribution, 4),
            }
            for factor, contribution in sorted(
                factor_contributions.items(),
                key=lambda item: abs(item[1]),
                reverse=True,
            )
        ]

        return {
            "riskScore": round(risk_score, 2),
            "riskTier": _risk_tier(risk_score),
            "topFactors": top_factors,
            "source": "model",
        }

    except Exception:
        return {
            "riskScore": None,
            "riskTier": None,
            "topFactors": [],
            "source": "fallback_unavailable",
        }