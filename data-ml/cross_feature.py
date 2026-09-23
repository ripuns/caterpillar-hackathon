"""
Cross-feature synthesis.

Deterministic reasoning layer (no LLM, no ML) that combines multiple signals
per operator into a single "needs attention" judgement, rather than treating
each alert type as independent. Trigger requires 2-of-3 categories, not a
single repeated event.

AUDIT FIX (see README SS2): the previous version derived its "safety" signal
from operations.csv's safety_alert_triggered column, which (per the locked
generation rule) fires on excessive idling too - so one idling session could
count as BOTH the "safety" signal and the "idling" signal, artificially
inflating the number of operators flagged. This version computes each
category directly from independent raw fields:

    SAFETY   = seatbelt_status == "Unfastened" OR distance_to_nearest_object_m < threshold
    BEHAVIOR = idling_time_min > threshold
    TASK     = actual_time_min overrun >= threshold, vs. estimated_time_min

These three no longer share any underlying event, so 2-of-3 firing together
is a genuine cross-feature signal, not double-counting one behavior.

Maps to a training-hub module/category so the frontend can deep-link
directly from a flagged operator to a relevant module.
"""

import pandas as pd

from thresholds import (
    IDLE_TIME_THRESHOLD_MIN,
    PROXIMITY_THRESHOLD_M,
    TASK_DELAY_THRESHOLD_PERCENT,
    TRAINING_TRIGGER_SAFETY_INCIDENT_COUNT,
    TRAINING_TRIGGER_IDLING_SESSION_COUNT,
    TRAINING_TRIGGER_OVERRUN_TASK_COUNT,
)

# Maps which independent category combination fired -> recommended training-hub module.
# Keys are frozensets over {"safety", "behavior", "task"}.
MODULE_MAP = {
    frozenset({"safety", "behavior"}): ("TH_SAFE_EFFICIENT_OPS", "Safe and Efficient Machine Operation"),
    frozenset({"safety", "task"}): ("TH_SAFETY_UNDER_PRESSURE", "Maintaining Safety Standards Under Time Pressure"),
    frozenset({"behavior", "task"}): ("TH_TIME_MANAGEMENT", "Task Time Management and Idle Reduction"),
    frozenset({"safety", "behavior", "task"}): ("TH_GENERAL_REFRESHER", "General Refresher: Safety, Efficiency and Machine Use"),
}


def synthesize(operator_id: str, ops_df: pd.DataFrame, tasks_df: pd.DataFrame) -> dict:
    ops_rows = ops_df[ops_df["operator_id"] == operator_id]
    task_rows = tasks_df[tasks_df["operator_id"] == operator_id]

    # SAFETY: seatbelt or proximity only - independent of idling.
    safety_incident_count = int((
        (ops_rows["seatbelt_status"] == "Unfastened")
        | (ops_rows["distance_to_nearest_object_m"] < PROXIMITY_THRESHOLD_M)
    ).sum())

    # BEHAVIOR: idling only - independent of seatbelt/proximity.
    idling_session_count = int((ops_rows["idling_time_min"] > IDLE_TIME_THRESHOLD_MIN).sum())

    # TASK: overrun only.
    overrun_pct = ((task_rows["actual_time_min"] - task_rows["estimated_time_min"])
                    / task_rows["estimated_time_min"] * 100) if len(task_rows) else pd.Series(dtype=float)
    overrun_task_count = int((overrun_pct >= TASK_DELAY_THRESHOLD_PERCENT).sum())

    signals_fired = set()
    if safety_incident_count >= TRAINING_TRIGGER_SAFETY_INCIDENT_COUNT:
        signals_fired.add("safety")
    if idling_session_count >= TRAINING_TRIGGER_IDLING_SESSION_COUNT:
        signals_fired.add("behavior")
    if overrun_task_count >= TRAINING_TRIGGER_OVERRUN_TASK_COUNT:
        signals_fired.add("task")

    # Attention requires at least 2 of the 3 INDEPENDENT categories (cross-feature,
    # not one behavior counted twice).
    operator_needs_attention = len(signals_fired) >= 2

    recommendation = None
    module_id, module_title = None, None
    if operator_needs_attention:
        if frozenset(signals_fired) in MODULE_MAP:
            module_id, module_title = MODULE_MAP[frozenset(signals_fired)]
        else:
            for combo, (mid, mtitle) in MODULE_MAP.items():
                if combo <= signals_fired:
                    module_id, module_title = mid, mtitle
                    break
        recommendation = f"Consider refresher training: {module_title}."

    return {
        "operatorId": operator_id,
        "operatorNeedsAttention": operator_needs_attention,
        "signalsFired": sorted(signals_fired),
        "evidence": {
            "safetyIncidentCount": safety_incident_count,
            "idlingSessionCount": idling_session_count,
            "overrunTaskCount": overrun_task_count,
        },
        "recommendation": recommendation,
        "recommendedModuleId": module_id,
        "recommendedModuleTitle": module_title,
    }


def synthesize_all(ops_df: pd.DataFrame, tasks_df: pd.DataFrame) -> list[dict]:
    operators = sorted(ops_df["operator_id"].unique())
    return [synthesize(op, ops_df, tasks_df) for op in operators]


if __name__ == "__main__":
    import json
    ops_df = pd.read_csv("data/operations.csv")
    tasks_df = pd.read_csv("data/tasks.csv")
    results = synthesize_all(ops_df, tasks_df)
    flagged = [r for r in results if r["operatorNeedsAttention"]]
    print(f"{len(flagged)} of {len(results)} operators flagged for attention:\n")
    print(json.dumps(flagged, indent=2))
