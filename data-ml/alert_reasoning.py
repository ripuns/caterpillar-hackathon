"""
Alert reasoning.

Generates structured reason objects per session so the frontend can answer
"Why am I being alerted?" without hardcoding explanation text in the UI.
Every field is derived straight from the observed data + the threshold that
fired - nothing is invented per-alert.

This does not replace CONTRACTS.md's existing alert/flag response shape -
it's the extra structured detail (a "reasons" array) that would be added
alongside the existing flat "message" field.
"""

import pandas as pd

from thresholds import IDLE_TIME_THRESHOLD_MIN, PROXIMITY_THRESHOLD_M, SAFETY_ALERT_COUNT_THRESHOLD


def reasons_for_session(row: pd.Series, operator_recent_alert_count: int) -> list[dict]:
    """One session (a row of operations.csv) -> zero or more structured alert reasons."""
    reasons = []

    if row["seatbelt_status"] == "Unfastened":
        reasons.append({
            "alertType": "SEATBELT",
            "severity": "HIGH",
            "triggered": True,
            "reason": "Seatbelt unfastened while machine active",
            "observedValue": "Unfastened",
            "threshold": "Fastened required",
        })

    if row["distance_to_nearest_object_m"] < PROXIMITY_THRESHOLD_M:
        reasons.append({
            "alertType": "PROXIMITY",
            "severity": "HIGH",
            "triggered": True,
            "reason": "Distance to nearest object below safe threshold",
            "observedValue": float(row["distance_to_nearest_object_m"]),
            "threshold": PROXIMITY_THRESHOLD_M,
        })

    if row["idling_time_min"] > IDLE_TIME_THRESHOLD_MIN:
        reasons.append({
            "alertType": "EXCESSIVE_IDLING",
            "severity": "MEDIUM",
            "triggered": True,
            "reason": "Idling time exceeded configured threshold",
            "observedValue": float(row["idling_time_min"]),
            "threshold": IDLE_TIME_THRESHOLD_MIN,
        })

    if operator_recent_alert_count >= SAFETY_ALERT_COUNT_THRESHOLD:
        reasons.append({
            "alertType": "UNSAFE_PATTERN",
            "severity": "MEDIUM",
            "triggered": True,
            "reason": "Repeated safety alerts for this operator",
            "observedValue": operator_recent_alert_count,
            "threshold": SAFETY_ALERT_COUNT_THRESHOLD,
        })

    return reasons


def build_alert_reasoning(ops_df: pd.DataFrame) -> list[dict]:
    """Build a reasons payload per (operator, session-with-an-alert) row."""
    out = []
    # running per-operator alert count in timestamp order, so UNSAFE_PATTERN
    # reflects "alerts so far" rather than looking into the future
    ops_df = ops_df.sort_values("timestamp")
    running_counts = {}

    for _, row in ops_df.iterrows():
        op = row["operator_id"]
        running_counts.setdefault(op, 0)
        if row["safety_alert_triggered"] == "Yes":
            running_counts[op] += 1

        reasons = reasons_for_session(row, running_counts[op])
        if reasons:
            out.append({
                "operatorId": op,
                "machineId": row["machine_id"],
                "timestamp": row["timestamp"],
                "reasons": reasons,
            })
    return out


if __name__ == "__main__":
    import json
    ops_df = pd.read_csv("data/operations.csv")
    reasoning = build_alert_reasoning(ops_df)
    print(f"{len(reasoning)} sessions with at least one structured alert reason\n")
    print(json.dumps(reasoning[:3], indent=2))
