"""
Task-time regression model: train, evaluate, save artifact.

Pipeline: ColumnTransformer(OneHotEncoder) -> LinearRegression, wrapped in a
single sklearn Pipeline so preprocessing + model travel together as one
joblib artifact - Ripun's FastAPI wrapper just calls .predict() on it with
a raw feature dict, no separate encoding logic on his side.

Target: actual_time_min. Features: task_type, weather, operator_skill,
machine_age_yrs, estimated_time_min. Never uses actual_time_min or anything
derived from it as an input.
"""

import json

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

SEED = 42

CATEGORICAL_FEATURES = ["task_type", "weather", "operator_skill"]
NUMERIC_FEATURES = ["machine_age_yrs", "estimated_time_min"]
FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET = "actual_time_min"


def build_pipeline():
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ],
        remainder="passthrough",  # numeric features pass through unchanged
    )
    return Pipeline(steps=[
        ("preprocess", preprocessor),
        ("model", LinearRegression()),
    ])


def evaluate(y_true, y_pred):
    return {
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 3),
        "r2": round(float(r2_score(y_true, y_pred)), 4),
    }


def main():
    df = pd.read_csv("data/tasks.csv")

    X = df[FEATURES]
    y = df[TARGET]

    # 70% train / 15% val / 15% test
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, random_state=SEED)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, random_state=SEED)

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    metrics = {
        "train": evaluate(y_train, pipeline.predict(X_train)),
        "validation": evaluate(y_val, pipeline.predict(X_val)),
        "test": evaluate(y_test, pipeline.predict(X_test)),
        "n_train": len(X_train),
        "n_val": len(X_val),
        "n_test": len(X_test),
        "features": FEATURES,
        "target": TARGET,
        "seed": SEED,
    }

    joblib.dump(pipeline, "model/task_time_pipeline.joblib")
    with open("model/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(json.dumps(metrics, indent=2))

    # sanity check: does the model roughly reproduce the 5 provided sample rows'
    # direction of effect (Beginner+Cloudy overrun, Expert+Sunny under, etc.)?
    sample_checks = pd.DataFrame([
        {"task_type": "Earth Excavation", "weather": "Sunny", "operator_skill": "Expert",
         "machine_age_yrs": 2, "estimated_time_min": 60},
        {"task_type": "Material Loading", "weather": "Cloudy", "operator_skill": "Beginner",
         "machine_age_yrs": 3, "estimated_time_min": 30},
        {"task_type": "Demolition", "weather": "Windy", "operator_skill": "Intermediate",
         "machine_age_yrs": 6, "estimated_time_min": 90},
    ])
    preds = pipeline.predict(sample_checks)
    print("\nSanity check (provided sample rows, approx expected: 58, 42, 105):")
    for row, pred in zip(sample_checks.itertuples(), preds):
        print(f"  {row.task_type} / {row.weather} / {row.operator_skill} -> predicted {pred:.1f} min")


if __name__ == "__main__":
    main()
