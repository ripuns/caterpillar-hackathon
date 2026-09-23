"""
Data validation.

Checks operations.csv and tasks.csv against the locked schema: required
columns, types, valid value sets/ranges, and internal consistency (e.g.
safety_alert_triggered actually matches the rule that should have set it).

Exits non-zero and prints failures if anything is wrong - meant to run
before training so a bad dataset never silently reaches the model.
"""

import sys
import pandas as pd

from thresholds import IDLE_TIME_THRESHOLD_MIN, PROXIMITY_THRESHOLD_M

errors = []
warnings = []


def check(condition, message, is_error=True):
    if not condition:
        (errors if is_error else warnings).append(message)


def validate_operations(df):
    required_cols = [
        "timestamp", "machine_id", "operator_id", "engine_hours", "fuel_used_l",
        "load_cycles", "idling_time_min", "seatbelt_status",
        "distance_to_nearest_object_m", "safety_alert_triggered", "training_completed_recent",
    ]
    check(list(df.columns) == required_cols, f"operations.csv columns mismatch: {list(df.columns)}")

    check(df.isnull().sum().sum() == 0, "operations.csv has null values")
    check(df["engine_hours"].between(0, 5000).all(), "engine_hours out of [0,5000]")
    check(df["fuel_used_l"].between(0, 50).all(), "fuel_used_l out of [0,50]")
    check(df["load_cycles"].between(0, 100).all(), "load_cycles out of [0,100]")
    check(df["idling_time_min"].between(0, 90).all(), "idling_time_min out of [0,90]")
    check(df["distance_to_nearest_object_m"].between(0.5, 20).all(), "distance out of [0.5,20]")
    check(set(df["seatbelt_status"].unique()) <= {"Fastened", "Unfastened"}, "invalid seatbelt_status values")
    check(set(df["safety_alert_triggered"].unique()) <= {"Yes", "No"}, "invalid safety_alert_triggered values")
    check(set(df["training_completed_recent"].unique()) <= {"Yes", "No"}, "invalid training_completed_recent values")
    check(df["operator_id"].str.match(r"^OP-\d{2}$").all(), "malformed operator_id")
    check(df["machine_id"].str.match(r"^M-\d{2}$").all(), "malformed machine_id")

    # consistency: safety_alert_triggered must match the rule it's supposed to encode
    expected = (
        (df["seatbelt_status"] == "Unfastened")
        | (df["distance_to_nearest_object_m"] < PROXIMITY_THRESHOLD_M)
        | (df["idling_time_min"] > IDLE_TIME_THRESHOLD_MIN)
    )
    mismatch = (expected != (df["safety_alert_triggered"] == "Yes")).sum()
    check(mismatch == 0, f"safety_alert_triggered inconsistent with rule on {mismatch} rows")

    row_count_ok = 300 <= len(df) <= 600
    check(row_count_ok, f"operations.csv row count {len(df)} outside expected 300-600 range", is_error=False)


def validate_tasks(df):
    required_cols = [
        "task_id", "operator_id", "timestamp", "task_type", "weather",
        "operator_skill", "machine_age_yrs", "estimated_time_min", "actual_time_min",
    ]
    check(list(df.columns) == required_cols, f"tasks.csv columns mismatch: {list(df.columns)}")

    check(df.isnull().sum().sum() == 0, "tasks.csv has null values")
    check(df["task_id"].is_unique, "duplicate task_id values")
    check(set(df["task_type"].unique()) <= {
        "Earth Excavation", "Trenching", "Material Loading", "Grading", "Demolition"
    }, "invalid task_type values")
    check(set(df["weather"].unique()) <= {"Sunny", "Rainy", "Cloudy", "Windy"}, "invalid weather values")
    check(set(df["operator_skill"].unique()) <= {"Beginner", "Intermediate", "Expert"}, "invalid operator_skill values")
    check(df["machine_age_yrs"].between(1, 10).all(), "machine_age_yrs out of [1,10]")
    check(df["estimated_time_min"].between(15, 120).all(), "estimated_time_min out of [15,120]")
    check(df["actual_time_min"].gt(0).all(), "actual_time_min must be positive")
    check(df["operator_id"].str.match(r"^OP-\d{2}$").all(), "malformed operator_id")

    row_count_ok = 150 <= len(df) <= 400
    check(row_count_ok, f"tasks.csv row count {len(df)} outside expected 150-400 range", is_error=False)


def cross_file_check(ops_df, tasks_df):
    ops_operators = set(ops_df["operator_id"].unique())
    task_operators = set(tasks_df["operator_id"].unique())
    check(task_operators <= ops_operators, "tasks.csv references operators not present in operations.csv")
    check(len(ops_operators) >= 5, "fewer than 5 distinct operators - not enough for trend/scoring analysis")


def main():
    ops_df = pd.read_csv("data/operations.csv", dtype={"machine_id": str, "operator_id": str})
    tasks_df = pd.read_csv("data/tasks.csv", dtype={"operator_id": str})

    validate_operations(ops_df)
    validate_tasks(tasks_df)
    cross_file_check(ops_df, tasks_df)

    print(f"operations.csv: {len(ops_df)} rows validated")
    print(f"tasks.csv:      {len(tasks_df)} rows validated")

    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print(f"  - {w}")

    if errors:
        print("\nERRORS:")
        for e in errors:
            print(f"  - {e}")
        print(f"\nVALIDATION FAILED ({len(errors)} error(s))")
        sys.exit(1)

    print("\nVALIDATION PASSED")


if __name__ == "__main__":
    main()
