# Machine Health Score + Zone/SOS — Handoff

New in this pass: `machine_scoring.py`, `zone_status.py`, plus additive changes
to `thresholds.py`, `generate_data.py`, `validate.py`. Nothing else was
touched — `scoring.py`, `cross_feature.py`, `alert_reasoning.py`, and the
task-time model are unchanged.

## New dataset field

`operations.csv` gains one column, appended after `training_completed_recent`:

| Column | Type | Values |
|---|---|---|
| `current_zone` | string | `Active Work Zone` \| `Maintenance Bay` \| `Restricted Zone` \| `Idle Yard` |

Generated as a uniform-random pick per session (`generate_data.py`) — no
archetype correlation, since none is specified. Regenerating the dataset
after this change shifts downstream random draws slightly (same seed, same
generation logic, different exact row counts/values than before
`current_zone` existed) — this is expected: inserting a new draw into the
shared seeded RNG stream shifts everything after it. Reproducibility (same
seed → same output every run, going forward) is preserved.

## New config (`thresholds.py`)

```python
MACHINE_SCORE_WEIGHTS = {
    "wearUsageLoad": 25, "fuelEfficiencyDrift": 20, "idlingBurden": 15,
    "incidentAssociation": 30, "serviceIntervalProximity": 10,
}  # sums to 100, validated in validate.py

SERVICE_INTERVAL_HOURS_THRESHOLD = 500.0
# HACKATHON SIMULATION CONSTANT ONLY - not an official Caterpillar interval.

ZONES = ["Active Work Zone", "Maintenance Bay", "Restricted Zone", "Idle Yard"]

ZONE_DANGER_TIERS = {
    "Restricted Zone": "high", "Active Work Zone": "medium",
    "Maintenance Bay": "low", "Idle Yard": "low",
}

MACHINE_CRITICAL_SCORE_THRESHOLD = 40  # CRITICAL band ceiling, from SCORE_STATUS_BANDS
```

## `GET /machines/:machineId/health` (CONTRACTS.md §11) — `machine_scoring.py`

`compute_machine_score(machine_id, ops_df) -> dict`, `compute_all_machine_scores(ops_df) -> list[dict]`.
Grouped by `machine_id`, sourced entirely from `operations.csv` (no `tasks.csv`).

Component formulas:
- **wearUsageLoad** (25): 50/50 blend of latest `engine_hours`/5000 and mean
  `load_cycles`/100 → `score = 25 * (1 - utilization)`.
- **fuelEfficiencyDrift** (20): baseline = mean `fuel_used_l/load_cycles` over
  this machine's *prior* sessions with `load_cycles > 0` (latest session and
  zero-load sessions excluded from the baseline); compares latest valid
  session against it. Full points if no valid history exists.
- **idlingBurden** (15): identical formula to `scoring.py`'s
  `_machine_use_score`, machine-grouped.
- **incidentAssociation** (30): `0.6 * general_alert_rate_component + 0.4 *
  proximity_rate_component` — proximity explicitly sub-weighted per README's
  "especially proximity" language.
- **serviceIntervalProximity** (10): `engine_hours % 500` → proximity ratio to
  the next simulated interval.

`componentScores` sum (pre-rounding) to `score` (rounded to nearest int) —
verified for all 10 machines in the current dataset. Score clamped to [0,100].
Status band reuses `scoring.py`'s `_status_for_score`/`SCORE_STATUS_BANDS`
unchanged (imported, not duplicated).

## `GET /machines/:machineId/zone-status` (CONTRACTS.md §13) — `zone_status.py`

`get_current_zone(machine_id, ops_df)` → `current_zone` of the max-timestamp
row for that machine. `build_zone_status(ops_df) -> list[dict]` calls
`compute_machine_score()` (does not duplicate scoring logic) and returns:

```json
{
  "machineId": "M-06",
  "currentZone": "Restricted Zone",
  "zoneDangerTier": "high",
  "machineHealthScore": 32,
  "sosActive": true,
  "sosReason": "Machine health score 32 is below the CRITICAL threshold (40) while operating in a high-danger zone"
}
```

**SOS condition (exact):** `machineHealthScore < 40 AND zoneDangerTier == "high"`.
Verified with a synthetic worst-case machine (unfastened seatbelt, close
proximity, heavy idling, high engine hours, Restricted Zone) — scored 32,
`sosActive: true`, reason string data-derived, matching
`alert_reasoning.py`'s structured-object convention.

**Demo note:** in the current randomly generated dataset, no machine's score
falls below 40, so `sosActive` is `false` for all 10 machines out of the box.
This is a data-realism outcome, not a logic bug — confirmed separately via
the synthetic test above. If a visible SOS demo is wanted, either bias one
operator/machine's archetype toward worse safety numbers in
`generate_data.py`, or seed one synthetic critical row — neither is done
here, since neither was requested.

## Validation changes (`validate.py`)

- `current_zone` added to `operations.csv`'s required-columns list and value-set check.
- New `validate_config()`: `ZONE_DANGER_TIERS` keys == `ZONES` exactly;
  `MACHINE_SCORE_WEIGHTS` sums to 100. Called from `main()`.

## Output snapshots (`outputs/`)

Regenerated, full (not sample) arrays for all five: `operator_scores.json`,
`cross_feature_insights.json`, `alert_reasoning.json`, `machine_scores.json`,
`zone_status.json`.

## Open items (unresolved, flagged not decided)

- Sub-weighting inside `wearUsageLoad` (50/50 engine_hours vs. load_cycles) and
  the `/50` divisor in `fuelEfficiencyDrift`'s penalty scaling are
  implementation choices mirroring `scoring.py`'s existing style, not values
  stated in README/CONTRACTS/EXECUTION_PLAN.
- No machine currently triggers SOS in the generated dataset (see Demo note above).
