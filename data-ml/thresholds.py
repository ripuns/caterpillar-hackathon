"""
Centralized threshold configuration.

These are DEMO / HACKATHON configuration values only — not official
Caterpillar safety limits. They must stay identical across:
  - this data/ML layer (label generation + scoring)
  - Ripun's NestJS rule engine (/safety-alerts, /behavior-flags)
  - CONTRACTS.md's threshold table
If any of these change, update here first and flag the other two teammates.
"""

# --- Rule thresholds (from CONTRACTS.md, locked at Hour 0) ---
IDLE_TIME_THRESHOLD_MIN = 45.0          # idling_time_min > this -> excessive idling
PROXIMITY_THRESHOLD_M = 3.0             # distance_to_nearest_object_m < this -> proximity hazard
SAFETY_ALERT_COUNT_THRESHOLD = 3        # >= this many alerts for one operator -> unsafe pattern

# --- New thresholds (added for scoring / cross-feature synthesis) ---
TASK_DELAY_THRESHOLD_PERCENT = 15.0     # actual > estimated * (1 + this/100) -> task overrun
OPERATOR_OVERRUN_THRESHOLD_PERCENT = 15.0  # avg overrun % >= this -> counts against score / triggers synthesis

# --- Cross-feature synthesis trigger (training recommendation) ---
# Deliberately conjunctive (2-of-3 categories), not "any one alert fires" - this
# is what makes it cross-feature rather than counting duplicate manifestations
# of the same underlying event. Categories are kept INDEPENDENT of each other:
#   SAFETY   = seatbelt violation OR proximity hazard only (NOT idling)
#   BEHAVIOR = excessive idling sessions only (NOT seatbelt/proximity)
#   TASK     = task-time overrun only
# safety_alert_triggered in operations.csv is NOT used here directly, because
# that column (per the locked rule) fires on idling too - using it would count
# one idling event as both a "safety" and a "behavior" signal. See README §2.
TRAINING_TRIGGER_SAFETY_INCIDENT_COUNT = 2   # seatbelt-unfastened OR proximity<threshold sessions
TRAINING_TRIGGER_IDLING_SESSION_COUNT = 2    # sessions with idling_time_min > IDLE_TIME_THRESHOLD_MIN
TRAINING_TRIGGER_OVERRUN_TASK_COUNT = 2      # tasks with overrun >= TASK_DELAY_THRESHOLD_PERCENT

# --- Operator score status categories (documentation/display banding only) ---
SCORE_STATUS_BANDS = [
    (85, 100, "EXCELLENT"),
    (65, 84, "GOOD"),
    (40, 64, "NEEDS_ATTENTION"),
    (0, 39, "CRITICAL"),
]

# --- Operator score weights (must sum to 100; documented in README) ---
SCORE_WEIGHTS = {
    "safety_compliance": 40,   # seatbelt + proximity + overall safety-alert rate
    "task_performance": 30,    # avg task-time overrun %
    "machine_use_behavior": 20,  # idling behavior
    "training_status": 10,     # training_completed_recent
}

# --- Machine Health Score (README §7.4 / CONTRACTS.md §11) ---
# Same weighted, explainable, 0-100 + status-band pattern as the Operator
# Score above, but grouped by machine_id and sourced entirely from
# operations.csv (no tasks.csv - a machine has no "task performance").
# SCORE_STATUS_BANDS above is reused unchanged for machine status.
MACHINE_SCORE_WEIGHTS = {
    "wearUsageLoad": 25,           # engine_hours + load_cycles utilization
    "fuelEfficiencyDrift": 20,     # fuel_used_l per load_cycle vs. this machine's own baseline
    "idlingBurden": 15,            # idling_time_min, machine-grouped (reuses operator idling formula)
    "incidentAssociation": 30,     # safety-alert rate + proximity-hazard rate, this machine
    "serviceIntervalProximity": 10,  # engine_hours vs. SERVICE_INTERVAL_HOURS_THRESHOLD
}

# HACKATHON SIMULATION CONSTANT ONLY - this is not an official Caterpillar
# service interval. Treated as a recurring interval (engine_hours % this)
# purely to give the demo a deterministic "approaching service" signal.
SERVICE_INTERVAL_HOURS_THRESHOLD = 500.0

# --- Zone tracking + compound SOS (README §7.5 / CONTRACTS.md §13) ---
# Fixed zone set and static zone -> danger-tier config, per the locked
# decision. Not per-row generated data - a small config lookup table.
ZONES = ["Active Work Zone", "Maintenance Bay", "Restricted Zone", "Idle Yard"]

ZONE_DANGER_TIERS = {
    "Restricted Zone": "high",
    "Active Work Zone": "medium",
    "Maintenance Bay": "low",
    "Idle Yard": "low",
}

# Compound SOS trigger threshold: CRITICAL band ceiling from SCORE_STATUS_BANDS.
# Kept as an explicit constant here (rather than re-deriving it) so the
# condition in zone_status.py reads directly against a named threshold,
# same discipline as every other rule in this file.
MACHINE_CRITICAL_SCORE_THRESHOLD = 40
