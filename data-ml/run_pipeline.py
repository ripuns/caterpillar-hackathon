"""
Reproducible end-to-end Data/ML pipeline.

Run this single script to regenerate everything from scratch:
  1. generate synthetic data
  2. validate it
  3. train + evaluate + save the model
  4. compute operator scores
  5. run cross-feature synthesis
  6. build alert reasoning
  7. compute machine health scores
  8. compute zone status + compound SOS
  9. write backend-facing JSON snapshots
"""

import json
import subprocess
import sys

import pandas as pd

from scoring import compute_all_scores
from cross_feature import synthesize_all
from alert_reasoning import build_alert_reasoning
from machine_scoring import compute_all_machine_scores
from zone_status import build_zone_status


def run_step(description, script_name):
    print(f"\n{'=' * 60}\n{description}\n{'=' * 60}")

    result = subprocess.run(
        [sys.executable, script_name],
        shell=False
    )

    if result.returncode != 0:
        print(f"FAILED: {description}")
        sys.exit(1)


def main():
    run_step("1/3 Generating synthetic data", "generate_data.py")
    run_step("2/3 Validating data", "validate.py")
    run_step("3/3 Training model", "train_model.py")

    print(f"\n{'=' * 60}\nBuilding backend-facing JSON snapshots\n{'=' * 60}")

    ops_df = pd.read_csv("data/operations.csv")
    tasks_df = pd.read_csv("data/tasks.csv")

    # ---------------------------------------------------------
    # Operator scoring
    # ---------------------------------------------------------
    scores = compute_all_scores(ops_df, tasks_df)

    with open("outputs/operator_scores.json", "w") as f:
        json.dump(scores, f, indent=2)

    print(f"outputs/operator_scores.json: {len(scores)} operators")

    # ---------------------------------------------------------
    # Cross-feature synthesis
    # ---------------------------------------------------------
    synthesis = synthesize_all(ops_df, tasks_df)

    with open("outputs/cross_feature_insights.json", "w") as f:
        json.dump(synthesis, f, indent=2)

    flagged = sum(
        1 for s in synthesis
        if s["operatorNeedsAttention"]
    )

    print(
        f"outputs/cross_feature_insights.json: "
        f"{flagged}/{len(synthesis)} operators flagged"
    )

    # ---------------------------------------------------------
    # Alert reasoning
    # ---------------------------------------------------------
    reasoning = build_alert_reasoning(ops_df)

    with open("outputs/alert_reasoning.json", "w") as f:
        json.dump(reasoning, f, indent=2)

    print(
        f"outputs/alert_reasoning.json: "
        f"{len(reasoning)} sessions with structured reasons"
    )

    # ---------------------------------------------------------
    # Machine health scoring
    # ---------------------------------------------------------
    machine_scores = compute_all_machine_scores(ops_df)

    with open("outputs/machine_scores.json", "w") as f:
        json.dump(machine_scores, f, indent=2)

    print(
        f"outputs/machine_scores.json: "
        f"{len(machine_scores)} machines"
    )

    # ---------------------------------------------------------
    # Zone status + compound SOS
    # ---------------------------------------------------------
    zone_status = build_zone_status(ops_df)

    with open("outputs/zone_status.json", "w") as f:
        json.dump(zone_status, f, indent=2)

    sos_count = sum(
        1 for machine in zone_status
        if machine["sosActive"]
    )

    print(
        f"outputs/zone_status.json: "
        f"{sos_count}/{len(zone_status)} machines with SOS active"
    )

    # ---------------------------------------------------------
    # Model metrics
    # ---------------------------------------------------------
    with open("model/metrics.json") as f:
        metrics = json.load(f)

    print(
        f"\nModel test metrics: "
        f"MAE={metrics['test']['mae']}, "
        f"RMSE={metrics['test']['rmse']}, "
        f"R2={metrics['test']['r2']}"
    )

    print("\nPipeline complete.")


if __name__ == "__main__":
    main()