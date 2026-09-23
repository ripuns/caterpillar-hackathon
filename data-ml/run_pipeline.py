"""
Reproducible end-to-end pipeline.

Run this single script to regenerate everything from scratch:
  1. generate synthetic data (fixed seed)
  2. validate it
  3. train + evaluate + save the model
  4. compute operator scores
  5. run cross-feature synthesis
  6. build alert reasoning
  7. write backend-facing JSON snapshots to outputs/

This is what "python run_pipeline.py" does end to end - the single command
for reproducing the whole data/ML layer.
"""

import json
import subprocess
import sys

import pandas as pd

from scoring import compute_all_scores
from cross_feature import synthesize_all
from alert_reasoning import build_alert_reasoning


def run_step(description, cmd):
    print(f"\n{'=' * 60}\n{description}\n{'=' * 60}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"FAILED: {description}")
        sys.exit(1)


def main():
    run_step("1/3 Generating synthetic data", "python3 generate_data.py")
    run_step("2/3 Validating data", "python3 validate.py")
    run_step("3/3 Training model", "python3 train_model.py")

    print(f"\n{'=' * 60}\nBuilding backend-facing JSON snapshots\n{'=' * 60}")
    ops_df = pd.read_csv("data/operations.csv")
    tasks_df = pd.read_csv("data/tasks.csv")

    scores = compute_all_scores(ops_df, tasks_df)
    with open("outputs/operator_scores.json", "w") as f:
        json.dump(scores, f, indent=2)
    print(f"outputs/operator_scores.json: {len(scores)} operators")

    synthesis = synthesize_all(ops_df, tasks_df)
    with open("outputs/cross_feature_insights.json", "w") as f:
        json.dump(synthesis, f, indent=2)
    flagged = sum(1 for s in synthesis if s["operatorNeedsAttention"])
    print(f"outputs/cross_feature_insights.json: {flagged}/{len(synthesis)} operators flagged")

    reasoning = build_alert_reasoning(ops_df)
    with open("outputs/alert_reasoning.json", "w") as f:
        json.dump(reasoning, f, indent=2)
    print(f"outputs/alert_reasoning.json: {len(reasoning)} sessions with structured reasons")

    with open("model/metrics.json") as f:
        metrics = json.load(f)
    print(f"\nModel test metrics: MAE={metrics['test']['mae']}, "
          f"RMSE={metrics['test']['rmse']}, R2={metrics['test']['r2']}")

    print("\nPipeline complete.")


if __name__ == "__main__":
    main()
