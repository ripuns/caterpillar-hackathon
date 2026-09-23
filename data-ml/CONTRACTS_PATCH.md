# CONTRACTS.md patch — apply these additions manually, do not regenerate the file

## 1. In the `operations.csv` table, add one row:

| `training_completed_recent` | string | `Yes` \| `No` | whether operator completed training recently — feeds the Operator Performance Score (scoring.py) |

## 2. In the `tasks.csv` table, add two rows (after `task_id`):

| `operator_id` | string | `OP-01` … `OP-15` | operator who performed the task — join key for per-operator history, needed by scoring/cross-feature synthesis |
| `timestamp` | ISO 8601 string | e.g. `2026-09-24T09:00:00Z` | when the task occurred |

These are genuinely required, not optional: without `operator_id`/`timestamp`
on `tasks.csv`, the Operator Performance Score and cross-feature synthesis
cannot compute per-operator task-overrun history at all — that data would be
disconnected from any specific operator. `training_completed_recent` is the
only source for the score's training-status component.

## 3. Append to the Change Log table:

| Time | Change | Changed by |
|---|---|---|
| Post-audit, first-review build | Added `training_completed_recent` to `operations.csv`; added `operator_id`, `timestamp` to `tasks.csv` — required for Operator Performance Score and cross-feature synthesis (new P1 features). No existing field names or the `/predict-task-time` request/response shape changed. | Dev |

No other part of CONTRACTS.md changes. The `/predict-task-time` request/response
shape, all five endpoint shapes, and the three original thresholds are untouched.
