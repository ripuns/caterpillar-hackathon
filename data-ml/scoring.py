"""
Operator Performance Score.

NOT to be confused with the "confidence" field on POST /predict-task-time
(see predict.py) - that field describes reliability of one task-time
prediction. This score describes an operator's historical operational
performance. They are unrelated concepts computed by unrelated code paths;
naming them distinctly ("Operator Performance Score" vs. "prediction
confidence") avoids the two being conflated downstream.

Deliberately NOT a model - a documented, weighted formula over observable
operational data, so every score is explainable and auditable. Produces a
0-100 score plus a status band plus a list of contributing factors
generated from the actual data, never hardcoded text.

Components (see thresholds.SCORE_WEIGHTS for exact weights):
  - safety_compliance    (40 pts): seatbelt/proximity violation rate, alert rate
  - task_performance      (30 pts): average task-time overrun %
  - machine_use_behavior  (20 pts): excessive-idling session rate
  - training_status       (10 pts): training_completed_recent
"""

import pandas as pd

from thresholds import (
    IDLE_TIME_THRESHOLD_MIN,
    PROXIMITY_THRESHOLD_M,
    TASK_DELAY_THRESHOLD_PERCENT,
    SCORE_WEIGHTS,
    SCORE_STATUS_BANDS,
)


def _status_for_score(score: int) -> str:
    for low, high, label in SCORE_STATUS_BANDS:
        if low <= score <= high:
            return label
    return "UNKNOWN"


def _safety_compliance_score(ops_rows: pd.DataFrame) -> tuple[float, list[str]]:
    n = len(ops_rows)
    reasons = []
    if n == 0:
        return SCORE_WEIGHTS["safety_compliance"], reasons

    alert_rate = (ops_rows["safety_alert_triggered"] == "Yes").mean()
    unfastened_count = int((ops_rows["seatbelt_status"] == "Unfastened").sum())
    proximity_count = int((ops_rows["distance_to_nearest_object_m"] < PROXIMITY_THRESHOLD_M).sum())

    # Full points minus a penalty scaled by alert rate, floored at 0.
    score = SCORE_WEIGHTS["safety_compliance"] * max(0.0, 1.0 - alert_rate * 1.5)

    if unfastened_count > 0:
        reasons.append(f"{unfastened_count} session(s) with seatbelt unfastened")
    if proximity_count > 0:
        reasons.append(f"{proximity_count} session(s) with proximity below {PROXIMITY_THRESHOLD_M}m")
    if unfastened_count == 0 and proximity_count == 0:
        reasons.append("no seatbelt or proximity violations on record")

    return round(score, 1), reasons


def _task_performance_score(task_rows: pd.DataFrame) -> tuple[float, list[str]]:
    n = len(task_rows)
    reasons = []
    if n == 0:
        return SCORE_WEIGHTS["task_performance"], ["no task history on record"]

    overrun_pct = ((task_rows["actual_time_min"] - task_rows["estimated_time_min"])
                    / task_rows["estimated_time_min"] * 100)
    avg_overrun = overrun_pct.mean()
    overrun_task_count = int((overrun_pct >= TASK_DELAY_THRESHOLD_PERCENT).sum())

    # Full points minus a penalty scaled by avg overrun %, floored at 0.
    score = SCORE_WEIGHTS["task_performance"] * max(0.0, 1.0 - max(avg_overrun, 0) / 50.0)

    if avg_overrun > 0:
        reasons.append(f"{avg_overrun:.0f}% average task-time overrun across {n} tasks")
    else:
        reasons.append(f"tasks completed at or under estimate on average ({avg_overrun:.0f}%)")
    if overrun_task_count > 0:
        reasons.append(f"{overrun_task_count} task(s) overran by {TASK_DELAY_THRESHOLD_PERCENT:.0f}%+")

    return round(score, 1), reasons


def _machine_use_score(ops_rows: pd.DataFrame) -> tuple[float, list[str]]:
    n = len(ops_rows)
    reasons = []
    if n == 0:
        return SCORE_WEIGHTS["machine_use_behavior"], reasons

    idling_sessions = int((ops_rows["idling_time_min"] > IDLE_TIME_THRESHOLD_MIN).sum())
    idling_rate = idling_sessions / n

    score = SCORE_WEIGHTS["machine_use_behavior"] * max(0.0, 1.0 - idling_rate * 1.5)

    if idling_sessions > 0:
        reasons.append(f"excessive idling in {idling_sessions} of {n} session(s)")
    else:
        reasons.append("no excessive-idling sessions on record")

    return round(score, 1), reasons


def _training_score(ops_rows: pd.DataFrame) -> tuple[float, list[str]]:
    if len(ops_rows) == 0:
        return 0.0, ["no training status on record"]
    trained = (ops_rows["training_completed_recent"] == "Yes").any()
    if trained:
        return SCORE_WEIGHTS["training_status"], ["training completed recently"]
    return 0.0, ["no recent training on record"]


def compute_operator_score(operator_id: str, ops_df: pd.DataFrame, tasks_df: pd.DataFrame) -> dict:
    ops_rows = ops_df[ops_df["operator_id"] == operator_id]
    task_rows = tasks_df[tasks_df["operator_id"] == operator_id]

    safety_score, safety_reasons = _safety_compliance_score(ops_rows)
    perf_score, perf_reasons = _task_performance_score(task_rows)
    machine_score, machine_reasons = _machine_use_score(ops_rows)
    training_score, training_reasons = _training_score(ops_rows)

    total = round(safety_score + perf_score + machine_score + training_score)
    total = max(0, min(100, total))

    return {
        "operatorId": operator_id,
        "score": total,
        "status": _status_for_score(total),
        "componentScores": {
            "safetyCompliance": safety_score,
            "taskPerformance": perf_score,
            "machineUseBehavior": machine_score,
            "trainingStatus": training_score,
        },
        "contributingFactors": safety_reasons + perf_reasons + machine_reasons + training_reasons,
        "sessionsAnalyzed": len(ops_rows),
        "tasksAnalyzed": len(task_rows),
    }


def compute_all_scores(ops_df: pd.DataFrame, tasks_df: pd.DataFrame) -> list[dict]:
    operators = sorted(ops_df["operator_id"].unique())
    return [compute_operator_score(op, ops_df, tasks_df) for op in operators]


if __name__ == "__main__":
    import json
    ops_df = pd.read_csv("data/operations.csv")
    tasks_df = pd.read_csv("data/tasks.csv")
    scores = compute_all_scores(ops_df, tasks_df)
    print(json.dumps(scores, indent=2))
