# backend/src/rules/

## What

Shared rule-based detection logic for safety alerts and behavior flags — fixed, deterministic thresholds, not a model. No routes of its own; consumed by `../safety/`, `../behavior/`, and `../operators/cross-feature.service.ts`.

## Why

Deliberately rule-based rather than ML for these two outcomes, per the root `README.md` §2's design decision: safety/behavior detection needs to be explainable and auditable (every alert traces to a named threshold), unlike task-time prediction which is the one outcome that genuinely benefits from a trained model.

## How

`rules.service.ts` exports the finalized thresholds (`IDLING_THRESHOLD_MIN = 45`, `PROXIMITY_THRESHOLD_M = 3`, `UNSAFE_PATTERN_ALERT_COUNT = 3`) and two compute methods that scan `OperationRow[]` and emit `SafetyAlert[]`/`BehaviorFlag[]`. Every rule firing is logged at decision level (`RULE FIRED ...`, §8.6) with the exact input values that triggered it — the evidence behind the "explainable, not black-box" narrative. These constants must stay identical to `data-ml/thresholds.py`'s constants of the same name; if either changes, the other must too.

## File Responsibilities

- **`rules.service.ts`** — defines `RulesService`, `SafetyAlert`, `BehaviorFlag`, and the three threshold constants. Depends on `../data/data-loader.service.ts`'s `OperationRow` type. Depended on by `../safety/safety.controller.ts`, `../behavior/behavior.controller.ts`, `../incidents/incidents.controller.ts` (for backfilling system incidents), and `../operators/cross-feature.service.ts` (imports the threshold constants).
