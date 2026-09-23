# backend/src/data/

## What

Loads `data-ml/data/operations.csv` and `tasks.csv` once at startup, converts snake_case CSV headers to camelCase, and holds them in memory for the process lifetime. No routes of its own — every other feature module reads from this.

## Why

Centralizing the CSV parse in one place means every controller/service works with the same typed, camelCase row shape, and the file is only read once rather than per-request. This is also the single point of contact with Dev's `data-ml/` dataset — if the CSV schema changes, only this file's mapping needs updating.

## How

`data-loader.service.ts` implements `OnModuleInit`, reading both CSVs via `csv-parse/sync` on startup and exposing `getOperations()`/`getTasks()`. The `OperationRow`/`TaskRow` interfaces are the camelCase contract every other module codes against — see CONTRACTS.md's Dataset Schema section for the exact CSV → API field mapping.

## File Responsibilities

- **`data-loader.service.ts`** — defines `DataLoaderService`, `OperationRow`, `TaskRow`. Depends on nothing else. Depended on by nearly every controller/service in the codebase (`rules`, `operators`, `machines`, `fleet`, `tasks`, `safety`, `behavior`, `incidents`).
