"""
Machine Health Score.

Same design intent as the Operator Performance Score in scoring.py:
deliberately NOT a model - a documented, weighted formula over observable
operational data, so every score is explainable and auditable. Produces a
0-100 score plus a status band (reused unchanged from scoring.py) plus a
list of contributing factors generated from the actual data.

Grouped by machine_id instead of operator_id, and sourced entirely from
operations.csv - a machine has no task history, so tasks.csv is not used
here (unlike the operator score).

Components (see thresholds.MACHINE_SCORE_WEIGHTS for exact weights):
  - wearUsageLoad          (25 pts): latest engine_hours + mean load_cycles, utilization
  - fuelEfficiencyDrift    (20 pts): fuel_used_l/load_cycles vs. this machine's own history
  - idlingBurden           (15 pts): excessive-idling session rate (reuses operator formula)
  - incidentAssociation    (30 pts): safety-alert rate (60%) + proximity-hazard rate (40%)
  - serviceIntervalProximity (10 pts): latest engine_hours vs. SERVICE_INTERVAL_HOURS_THRESHOLD

NOT official Caterpillar scoring - see thresholds.py for the disclaimer on
SERVICE_INTERVAL_HOURS_THRESHOLD specifically.
"""

import pandas as pd

from scoring import _status_for_score  # reused unchanged - same status-band logic
from thresholds import (
    PROXIMITY_THRESHOLD_M,
    IDLE_TIME_THRESHOLD_MIN,
    MACHINE_SCORE_WEIGHTS,
    SCORE_STATUS_BANDS,  # noqa: F401  (kept for parity/import-site clarity; used inside _status_for_score)
    SERVICE_INTERVAL_HOURS_THRESHOLD,
)

ENGINE_HOURS_CEILING = 5000.0   # schema ceiling from CONTRACTS.md's operations.csv table
LOAD_CYCLES_CEILING = 100.0     # schema ceiling from CONTRACTS.md's operations.csv table


def _latest_row(rows: pd.DataFrame) -> pd.Series:
    """Row with the max timestamp - the "current reading" for a machine."""
    return rows.sort_values("timestamp").iloc[-1]


def _wear_usage_load_score(rows: pd.DataFrame) -> tuple[float, list[str]]:
    weight = MACHINE_SCORE_WEIGHTS["wearUsageLoad"]
    n = len(rows)
    if n == 0:
        return weight, []

    latest = _latest_row(rows)
    engine_hours_ratio = min(1.0, max(0.0, latest["engine_hours"] / ENGINE_HOURS_CEILING))
    mean_load_cycles = rows["load_cycles"].mean()
    load_cycles_ratio = min(1.0, max(0.0, mean_load_cycles / LOAD_CYCLES_CEILING))

    # Equal 50/50 split of the two normalized utilization values, per the
    # agreed decision.
    utilization = 0.5 * engine_hours_ratio + 0.5 * load_cycles_ratio
    score = weight * (1.0 - utilization)

    reasons = [
        f"engine hours {latest['engine_hours']:.0f} "
        f"({engine_hours_ratio * 100:.0f}% of {ENGINE_HOURS_CEILING:.0f}h schema ceiling)",
        f"mean load cycles {mean_load_cycles:.1f} per session "
        f"({load_cycles_ratio * 100:.0f}% of {LOAD_CYCLES_CEILING:.0f}-cycle ceiling)",
    ]
    return round(score, 1), reasons


def _fuel_efficiency_drift_score(rows: pd.DataFrame) -> tuple[float, list[str]]:
    weight = MACHINE_SCORE_WEIGHTS["fuelEfficiencyDrift"]
    if len(rows) == 0:
        return weight, []

    ordered = rows.sort_values("timestamp")
    # Zero-load sessions can't produce a fuel-per-load ratio - excluded entirely
    # from both the baseline and the evaluated session, per the agreed decision.
    valid = ordered[ordered["load_cycles"] > 0].copy()
    if len(valid) == 0:
        return weight, ["no sessions with load_cycles > 0 - fuel-efficiency drift not computable"]

    valid["fuel_per_cycle"] = valid["fuel_used_l"] / valid["load_cycles"]

    latest_valid = valid.iloc[-1]
    historical = valid.iloc[:-1]  # PREVIOUS valid sessions only, excludes the latest

    if len(historical) == 0:
        return weight, ["insufficient historical valid-load data for this machine - no drift signal, full points"]

    baseline = historical["fuel_per_cycle"].mean()
    current = latest_valid["fuel_per_cycle"]

    if baseline == 0:
        return weight, ["historical baseline fuel-per-cycle is 0 - no drift signal, full points"]

    drift_pct = (current - baseline) / baseline * 100
    # Same penalty-scaling style as scoring.py's overrun-percent formula
    # (score = weight * (1 - max(drift,0)/50)), floored at 0.
    score = weight * max(0.0, 1.0 - max(drift_pct, 0.0) / 50.0)

    if drift_pct > 0:
        reason = (f"fuel use trending {drift_pct:.0f}% above this machine's own "
                   f"baseline ({baseline:.2f} L/cycle over {len(historical)} prior session(s))")
    else:
        reason = (f"fuel use at or below this machine's own baseline "
                   f"({current:.2f} vs {baseline:.2f} L/cycle over {len(historical)} prior session(s))")

    return round(score, 1), [reason]


def _idling_burden_score(rows: pd.DataFrame) -> tuple[float, list[str]]:
    weight = MACHINE_SCORE_WEIGHTS["idlingBurden"]
    n = len(rows)
    if n == 0:
        return weight, []

    # Direct reuse of _machine_use_score's exact formula (scoring.py), machine-grouped.
    idling_sessions = int((rows["idling_time_min"] > IDLE_TIME_THRESHOLD_MIN).sum())
    idling_rate = idling_sessions / n
    score = weight * max(0.0, 1.0 - idling_rate * 1.5)

    if idling_sessions > 0:
        reasons = [f"excessive idling in {idling_sessions} of {n} session(s) on this machine"]
    else:
        reasons = ["no excessive-idling sessions on record for this machine"]

    return round(score, 1), reasons


def _incident_association_score(rows: pd.DataFrame) -> tuple[float, list[str]]:
    weight = MACHINE_SCORE_WEIGHTS["incidentAssociation"]
    n = len(rows)
    if n == 0:
        return weight, []

    alert_rate = (rows["safety_alert_triggered"] == "Yes").mean()
    proximity_count = int((rows["distance_to_nearest_object_m"] < PROXIMITY_THRESHOLD_M).sum())
    proximity_rate = proximity_count / n

    # 60% general safety-alert-rate / 40% proximity-hazard-rate, per the
    # agreed decision (README: incidents are "especially" concerned with
    # proximity, so it's explicitly sub-weighted here rather than folded
    # into the general rate untouched).
    general_component = max(0.0, 1.0 - alert_rate * 1.5)
    proximity_component = max(0.0, 1.0 - proximity_rate * 1.5)
    combined = 0.6 * general_component + 0.4 * proximity_component
    score = weight * combined

    reasons = []
    if proximity_count > 0:
        reasons.append(f"{proximity_count} proximity incident(s) recorded on this machine "
                        f"(below {PROXIMITY_THRESHOLD_M}m)")
    else:
        reasons.append("no proximity incidents recorded on this machine")
    alert_count = int((rows["safety_alert_triggered"] == "Yes").sum())
    reasons.append(f"safety alerts triggered on {alert_count} of {n} session(s) on this machine")

    return round(score, 1), reasons


def _service_interval_proximity_score(rows: pd.DataFrame) -> tuple[float, list[str]]:
    weight = MACHINE_SCORE_WEIGHTS["serviceIntervalProximity"]
    if len(rows) == 0:
        return weight, []

    latest = _latest_row(rows)
    engine_hours = latest["engine_hours"]

    # 500-hour recurring interval, hackathon simulation constant only - see
    # thresholds.py. engine_hours % threshold gives hours into the current
    # interval; proximity to the NEXT service point grows as that approaches
    # the threshold.
    hours_into_interval = engine_hours % SERVICE_INTERVAL_HOURS_THRESHOLD
    proximity_ratio = hours_into_interval / SERVICE_INTERVAL_HOURS_THRESHOLD
    hours_remaining = SERVICE_INTERVAL_HOURS_THRESHOLD - hours_into_interval

    score = weight * (1.0 - proximity_ratio)

    reasons = [
        f"approaching simulated {SERVICE_INTERVAL_HOURS_THRESHOLD:.0f}-hour service interval "
        f"(est. {hours_remaining:.0f} engine hours remaining; not an official Caterpillar interval)"
    ]
    return round(score, 1), reasons


def compute_machine_score(machine_id: str, ops_df: pd.DataFrame) -> dict:
    rows = ops_df[ops_df["machine_id"] == machine_id]

    wear_score, wear_reasons = _wear_usage_load_score(rows)
    fuel_score, fuel_reasons = _fuel_efficiency_drift_score(rows)
    idling_score, idling_reasons = _idling_burden_score(rows)
    incident_score, incident_reasons = _incident_association_score(rows)
    service_score, service_reasons = _service_interval_proximity_score(rows)

    total = round(wear_score + fuel_score + idling_score + incident_score + service_score)
    total = max(0, min(100, total))

    return {
        "machineId": machine_id,
        "score": total,
        "status": _status_for_score(total),
        "componentScores": {
            "wearUsageLoad": wear_score,
            "fuelEfficiencyDrift": fuel_score,
            "idlingBurden": idling_score,
            "incidentAssociation": incident_score,
            "serviceIntervalProximity": service_score,
        },
        "contributingFactors": wear_reasons + fuel_reasons + idling_reasons + incident_reasons + service_reasons,
        "sessionsAnalyzed": len(rows),
    }


def compute_all_machine_scores(ops_df: pd.DataFrame) -> list[dict]:
    machines = sorted(ops_df["machine_id"].unique())
    return [compute_machine_score(m, ops_df) for m in machines]


if __name__ == "__main__":
    import json
    ops_df = pd.read_csv("data/operations.csv")
    scores = compute_all_machine_scores(ops_df)
    print(json.dumps(scores, indent=2))
