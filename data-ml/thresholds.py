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
