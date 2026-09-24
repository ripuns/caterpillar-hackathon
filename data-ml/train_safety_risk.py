"""
Train the composite safety-risk model.

Target:
    Whether the operator's NEXT chronological operation triggers
    a safety incident.

This intentionally does NOT train directly on the current row's
safety_alert_triggered label, because that label is deterministically
constructed from the same three model features.

Model:
    scikit-learn Pipeline
    OneHotEncoder for seatbelt_status
    LogisticRegression

Artifact:
    model/safety_risk_model.joblib
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "operations.csv"
MODEL_PATH = BASE_DIR / "model" / "safety_risk_model.joblib"
METRICS_PATH = BASE_DIR / "model" / "safety_risk_metrics.json"

FEATURES = [
    "seatbelt_status",
    "distance_to_nearest_object_m",
    "idling_time_min",
]


def build_future_risk_target(df: pd.DataFrame) -> pd.DataFrame:
    """
    For each operator, sort sessions chronologically and assign the
    next session's safety_alert_triggered value as the current row's
    target.

    The final session for each operator has no future observation and
    is therefore dropped.
    """
    work = df.copy()
    work["timestamp"] = pd.to_datetime(work["timestamp"])

    work = work.sort_values(
        ["operator_id", "timestamp"]
    ).reset_index(drop=True)

    work["future_safety_risk"] = (
        work.groupby("operator_id")["safety_alert_triggered"]
        .shift(-1)
        .map({"Yes": 1, "No": 0})
    )

    work = work.dropna(subset=["future_safety_risk"]).copy()
    work["future_safety_risk"] = work["future_safety_risk"].astype(int)

    return work


def main():
    df = pd.read_csv(DATA_PATH)

    required = FEATURES + [
        "operator_id",
        "timestamp",
        "safety_alert_triggered",
    ]

    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    data = build_future_risk_target(df)

    X = data[FEATURES].copy()
    y = data["future_safety_risk"].copy()

    print("=" * 60)
    print("SAFETY RISK MODEL TRAINING")
    print("=" * 60)

    print(f"Original rows: {len(df)}")
    print(f"Training rows: {len(data)}")
    print("\nTarget distribution:")
    print(y.value_counts().sort_index())
    print("\nTarget proportions:")
    print(y.value_counts(normalize=True).sort_index())

    # Keep chronological/future structure intact as much as possible.
    # Stratified random split is used only for model evaluation.
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    categorical_features = ["seatbelt_status"]
    numeric_features = [
        "distance_to_nearest_object_m",
        "idling_time_min",
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(
                    handle_unknown="ignore",
                    drop="if_binary",
                ),
                categorical_features,
            ),
            (
                "numeric",
                StandardScaler(),
                numeric_features,
            ),
        ]
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                LogisticRegression(
                    max_iter=1000,
                    random_state=42,
                ),
            ),
        ]
    )

    pipeline.fit(X_train, y_train)

    probabilities = pipeline.predict_proba(X_test)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)

    auc = roc_auc_score(y_test, probabilities)
    accuracy = accuracy_score(y_test, predictions)
    cm = confusion_matrix(y_test, predictions)

    print("\nEvaluation:")
    print(f"ROC-AUC:  {auc:.4f}")
    print(f"Accuracy: {accuracy:.4f}")
    print("\nConfusion matrix:")
    print(cm)

    print("\nClassification report:")
    print(classification_report(y_test, predictions))

    # Full-dataset probability distribution for threshold tuning.
    all_probabilities = pipeline.predict_proba(X)[:, 1]

    print("\nRisk-score distribution:")
    print(f"min:    {all_probabilities.min():.4f}")
    print(f"25%:    {np.percentile(all_probabilities, 25):.4f}")
    print(f"median: {np.percentile(all_probabilities, 50):.4f}")
    print(f"75%:    {np.percentile(all_probabilities, 75):.4f}")
    print(f"max:    {all_probabilities.max():.4f}")

    # Candidate thresholds based on the actual score distribution.
    thresholds = {
        "low_medium": float(np.percentile(all_probabilities, 60)),
        "medium_high": float(np.percentile(all_probabilities, 85)),
    }

    print("\nTuned risk-tier thresholds:")
    print(f"low -> medium:  {thresholds['low_medium']:.4f}")
    print(f"medium -> high: {thresholds['medium_high']:.4f}")

    # Save model.
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)

    metrics = {
        "target": "next chronological safety incident for same operator",
        "features": FEATURES,
        "seed": 42,
        "rows_original": int(len(df)),
        "rows_used": int(len(data)),
        "positive_rate": float(y.mean()),
        "roc_auc": round(float(auc), 4),
        "accuracy": round(float(accuracy), 4),
        "thresholds": {
            "low_medium": round(thresholds["low_medium"], 4),
            "medium_high": round(thresholds["medium_high"], 4),
        },
        "score_distribution": {
            "min": round(float(all_probabilities.min()), 4),
            "p25": round(float(np.percentile(all_probabilities, 25)), 4),
            "median": round(float(np.percentile(all_probabilities, 50)), 4),
            "p75": round(float(np.percentile(all_probabilities, 75)), 4),
            "max": round(float(all_probabilities.max()), 4),
        },
        "confusion_matrix": cm.tolist(),
    }

    METRICS_PATH.write_text(
        json.dumps(metrics, indent=2),
        encoding="utf-8",
    )

    print("\nSaved:")
    print(f"  {MODEL_PATH}")
    print(f"  {METRICS_PATH}")


if __name__ == "__main__":
    main()