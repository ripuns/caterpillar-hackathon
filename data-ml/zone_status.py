"""
Zone tracking + compound SOS.

Mirrors alert_reasoning.py's structured-reasoning conventions: every SOS
determination is a structured object with an explicit trigger, observed
values, and the threshold that fired - nothing hardcoded per-machine.

Deliberately kept separate from machine_scoring.py and calls
compute_machine_score() rather than duplicating the scoring logic (per
CONTRACTS.md §13: "calls that logic internally rather than duplicating it").

Compound SOS condition (README §7.5 / CONTRACTS.md §13), unchanged:

    sosActive = machineHealthScore < MACHINE_CRITICAL_SCORE_THRESHOLD (40)
                AND zoneDangerTier == "high"

"Current zone" for a machine = the current_zone value on the operations.csv
row with the latest timestamp for that machine_id (session-history data,
not a literal live feed - same honesty note as EXECUTION_PLAN §7.5).
"""

import pandas as pd

from machine_scoring import compute_machine_score
from thresholds import ZONES, ZONE_DANGER_TIERS, MACHINE_CRITICAL_SCORE_THRESHOLD


def get_current_zone(machine_id: str, ops_df: pd.DataFrame) -> str | None:
    """Latest-timestamp row's current_zone for this machine, or None if no rows."""
    rows = ops_df[ops_df["machine_id"] == machine_id]
    if len(rows) == 0:
        return None
    latest = rows.sort_values("timestamp").iloc[-1]
    return latest["current_zone"]


def _sos_reason(machine_id: str, machine_score: dict, zone_tier: str) -> dict | None:
    """Structured SOS determination for one machine - mirrors reasons_for_session's shape."""
    is_critical = machine_score["score"] < MACHINE_CRITICAL_SCORE_THRESHOLD
    is_high_danger = zone_tier == "high"

    if not (is_critical and is_high_danger):
        return None

    return {
        "alertType": "SOS",
        "severity": "HIGH",
        "triggered": True,
        "reason": (
            f"Machine health score {machine_score['score']} is below the CRITICAL "
            f"threshold ({MACHINE_CRITICAL_SCORE_THRESHOLD}) while operating in a "
            f"high-danger zone"
        ),
        "observedValue": machine_score["score"],
        "threshold": MACHINE_CRITICAL_SCORE_THRESHOLD,
    }


def build_zone_status(ops_df: pd.DataFrame) -> list[dict]:
    """One entry per machine_id, matching CONTRACTS.md §13's response shape."""
    machine_ids = sorted(ops_df["machine_id"].unique())
    out = []

    for machine_id in machine_ids:
        current_zone = get_current_zone(machine_id, ops_df)
        if current_zone is None or current_zone not in ZONE_DANGER_TIERS:
            # No data / unrecognized zone value - skip rather than fabricate a tier.
            continue

        zone_tier = ZONE_DANGER_TIERS[current_zone]
        machine_score = compute_machine_score(machine_id, ops_df)
        sos = _sos_reason(machine_id, machine_score, zone_tier)

        out.append({
            "machineId": machine_id,
            "currentZone": current_zone,
            "zoneDangerTier": zone_tier,
            "machineHealthScore": machine_score["score"],
            "sosActive": sos is not None,
            "sosReason": sos["reason"] if sos else None,
        })

    return out


if __name__ == "__main__":
    import json
    ops_df = pd.read_csv("data/operations.csv")
    statuses = build_zone_status(ops_df)
    sos_active = [s for s in statuses if s["sosActive"]]
    print(f"{len(sos_active)} of {len(statuses)} machines with SOS active\n")
    print(json.dumps(statuses, indent=2))
