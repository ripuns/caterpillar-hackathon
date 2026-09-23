"""
Synthetic dataset generator.

Generates operations.csv and tasks.csv per the locked CONTRACTS.md schema
(plus the two agreed additions: training_completed_recent on operations.csv,
and operator_id/timestamp on tasks.csv).

Deliberately builds 15 operators with distinct behavioral archetypes so the
data has real, non-random structure for the operator score, cross-feature
synthesis, and the regression model to find - not uniform noise.

Fixed seed = 42 for full reproducibility.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

from thresholds import IDLE_TIME_THRESHOLD_MIN, PROXIMITY_THRESHOLD_M, ZONES

SEED = 42
rng = np.random.default_rng(SEED)

OPERATORS = [f"OP-{i:02d}" for i in range(1, 16)]     # OP-01 .. OP-15
MACHINES = [f"M-{i:02d}" for i in range(1, 11)]        # M-01 .. M-10
TASK_TYPES = ["Earth Excavation", "Trenching", "Material Loading", "Grading", "Demolition"]
WEATHERS = ["Sunny", "Rainy", "Cloudy", "Windy"]
SKILLS = ["Beginner", "Intermediate", "Expert"]

BASE_DURATION = {
    "Earth Excavation": 55,
    "Trenching": 48,
    "Material Loading": 32,
    "Grading": 40,
    "Demolition": 90,
}

# --- Operator archetypes: gives the dataset real, explainable structure ---
# safe            : low idling, low alerts, low overrun, trained
# idling_prone    : chronic excessive idling, otherwise unremarkable
# overrun_prone   : consistently runs long on tasks
# risky           : seatbelt/proximity violations -> safety alerts
# average         : middling on everything, some randomness
ARCHETYPES = {
    "OP-01": "safe", "OP-02": "safe", "OP-03": "safe", "OP-04": "safe", "OP-05": "safe",
    "OP-06": "idling_prone", "OP-07": "idling_prone", "OP-08": "idling_prone",
    "OP-09": "overrun_prone", "OP-10": "overrun_prone", "OP-11": "overrun_prone",
    "OP-12": "risky", "OP-13": "risky",
    "OP-14": "average", "OP-15": "average",
}

# Skill loosely correlates with archetype (not deterministic - real data isn't clean)
SKILL_WEIGHTS = {
    "safe": [0.05, 0.30, 0.65],          # mostly Expert/Intermediate
    "idling_prone": [0.30, 0.50, 0.20],
    "overrun_prone": [0.35, 0.45, 0.20],
    "risky": [0.55, 0.35, 0.10],         # mostly Beginner
    "average": [0.30, 0.45, 0.25],
}
OPERATOR_SKILL = {
    op: rng.choice(SKILLS, p=SKILL_WEIGHTS[ARCHETYPES[op]]) for op in OPERATORS
}

# training_completed_recent: safe operators mostly trained, risky mostly not
TRAINING_PROB_YES = {
    "safe": 0.85, "idling_prone": 0.5, "overrun_prone": 0.5, "risky": 0.2, "average": 0.55,
}
OPERATOR_TRAINING = {
    op: ("Yes" if rng.random() < TRAINING_PROB_YES[ARCHETYPES[op]] else "No") for op in OPERATORS
}

NOW = datetime(2026, 9, 24, 8, 0, 0)


def random_timestamp(days_back=60):
    offset_days = rng.uniform(0, days_back)
    offset_seconds = rng.uniform(0, 86400)
    ts = NOW - timedelta(days=offset_days, seconds=-offset_seconds)
    return ts.strftime("%Y-%m-%dT%H:%M:%SZ")


def gen_operations():
    rows = []
    for op in OPERATORS:
        archetype = ARCHETYPES[op]
        n_sessions = int(rng.integers(20, 36))  # 20-35 sessions per operator
        for _ in range(n_sessions):
            machine_id = rng.choice(MACHINES)

            # idling_time_min by archetype
            if archetype == "idling_prone":
                idling = float(np.clip(rng.normal(58, 14), 0, 90))
            elif archetype == "safe":
                idling = float(np.clip(rng.normal(14, 7), 0, 90))
            else:
                idling = float(np.clip(rng.normal(26, 14), 0, 90))
            idling = round(idling, 1)

            # seatbelt status by archetype
            unfastened_p = {"risky": 0.28, "safe": 0.02, "idling_prone": 0.05,
                             "overrun_prone": 0.05, "average": 0.08}[archetype]
            seatbelt = "Unfastened" if rng.random() < unfastened_p else "Fastened"

            # proximity by archetype
            close_call_p = {"risky": 0.22, "safe": 0.02, "idling_prone": 0.05,
                             "overrun_prone": 0.05, "average": 0.08}[archetype]
            if rng.random() < close_call_p:
                distance = round(float(rng.uniform(0.5, PROXIMITY_THRESHOLD_M)), 1)
            else:
                distance = round(float(rng.uniform(PROXIMITY_THRESHOLD_M, 20.0)), 1)

            safety_alert = "Yes" if (
                seatbelt == "Unfastened"
                or distance < PROXIMITY_THRESHOLD_M
                or idling > IDLE_TIME_THRESHOLD_MIN
            ) else "No"

            rows.append({
                "timestamp": random_timestamp(),
                "machine_id": machine_id,
                "operator_id": op,
                "engine_hours": round(float(rng.uniform(0, 5000)), 1),
                "fuel_used_l": round(float(rng.uniform(0, 50)), 1),
                "load_cycles": int(rng.integers(0, 101)),
                "idling_time_min": idling,
                "seatbelt_status": seatbelt,
                "distance_to_nearest_object_m": distance,
                "safety_alert_triggered": safety_alert,
                "training_completed_recent": OPERATOR_TRAINING[op], 
                "current_zone": ZONES[len(rows) % len(ZONES)],
            })
    df = pd.DataFrame(rows).sort_values("timestamp").reset_index(drop=True)
    return df


def gen_tasks():
    rows = []
    task_counter = 1
    for op in OPERATORS:
        archetype = ARCHETYPES[op]
        skill = OPERATOR_SKILL[op]
        n_tasks = int(rng.integers(10, 21))  # 10-20 tasks per operator
        for _ in range(n_tasks):
            task_type = rng.choice(TASK_TYPES)
            weather = rng.choice(WEATHERS)
            machine_age = int(rng.integers(1, 11))
            estimated = int(np.clip(BASE_DURATION[task_type] + rng.normal(0, 6), 15, 120))

            # --- generation rule per CONTRACTS.md, applied to actual_time_min ---
            mult = 1.0
            if skill == "Beginner":
                mult *= rng.uniform(1.15, 1.40)
            elif skill == "Intermediate":
                mult *= rng.uniform(0.95, 1.15)
            else:  # Expert
                mult *= rng.uniform(0.85, 1.05)

            if weather in ("Rainy", "Windy"):
                mult *= rng.uniform(1.05, 1.15)

            if machine_age > 5:
                mult *= rng.uniform(1.05, 1.10)

            # archetype-driven extra multiplier: overrun_prone operators run long
            # independent of skill/weather - this is what makes the per-operator
            # overrun signal real rather than fully explained by skill alone.
            if archetype == "overrun_prone":
                mult *= rng.uniform(1.10, 1.30)

            mult *= rng.uniform(0.95, 1.05)  # +/-5% noise

            actual = int(round(estimated * mult))
            actual = max(5, actual)

            rows.append({
                "task_id": f"T{task_counter:03d}",
                "operator_id": op,
                "timestamp": random_timestamp(),
                "task_type": task_type,
                "weather": weather,
                "operator_skill": skill,
                "machine_age_yrs": machine_age,
                "estimated_time_min": estimated,
                "actual_time_min": actual,
            })
            task_counter += 1
    df = pd.DataFrame(rows).sort_values("timestamp").reset_index(drop=True)
    return df


def main():
    ops_df = gen_operations()
    tasks_df = gen_tasks()

    ops_df.to_csv("data/operations.csv", index=False)
    tasks_df.to_csv("data/tasks.csv", index=False)

    print(f"operations.csv: {len(ops_df)} rows, {ops_df['operator_id'].nunique()} operators")
    print(f"tasks.csv:      {len(tasks_df)} rows, {tasks_df['operator_id'].nunique()} operators")
    print("\nArchetype distribution:")
    for op in OPERATORS:
        print(f"  {op}: {ARCHETYPES[op]:15s} skill={OPERATOR_SKILL[op]:12s} trained={OPERATOR_TRAINING[op]}")


if __name__ == "__main__":
    main()

