# Execution Plan — Full Build Script

This document is written to be executed directly, step by step, with no open decisions left for whoever is executing it. Every command, file path, field name, and threshold is either given explicitly here or points to the exact section of `CONTRACTS.md` / `README.md` that defines it. If something is genuinely ambiguous and not resolvable from these three files, stop and flag it — do not guess silently and do not ask the user to re-decide something already decided here.

Team: **Anamika** (Frontend), **Ripun** (Backend/Rules + Model-Serving Integration), **Dev** (Data + Model Training + Training Hub).

Referenced files: [`README.md`](./README.md) (problem statement, design reasoning), [`CONTRACTS.md`](./CONTRACTS.md) (exact API/data shapes — the single source of truth for every field name and type used below).

---

## 0. Global Setup Facts (apply throughout — do not re-decide)

- **Repo root:** the directory containing this file.
- **Branches:** `main`, `frontend`, `backend`, `data`. Created once at the start (§1.2).
- **Ports:** NestJS `3000`, FastAPI `8001`, Next.js `3001`.
- **Package managers:** `npm` for both Node projects (NestJS backend, Next.js frontend). `pip` + a virtualenv for the Python service.
- **Folder layout (actual, as of the `data` branch merge — supersedes any earlier `/data` references below):**
  ```
  /backend          ← NestJS project
  /frontend         ← Next.js project
  /ml-service       ← FastAPI project (not yet created)
  /data-ml          ← Dev's data generation, validation, training, scoring, and handoff docs
    /data           ← generated CSVs (operations.csv, tasks.csv) live here, i.e. data-ml/data/
    /model          ← trained model artifacts (task_time_pipeline.joblib, metrics.json)
    /outputs        ← generated JSON snapshots (operator_scores.json, alert_reasoning.json, cross_feature_insights.json)
  CONTRACTS.md
  README.md
  EXECUTION_PLAN.md
  ```
  Originally specced as a repo-root `/data` folder — kept as `data-ml/` instead to avoid disrupting Dev's already-built, tested pipeline (his scripts' internal relative paths assume this structure). Any instruction below referencing `/data` or `data/operations.csv` means `data-ml/data/operations.csv` in the actual repo.
- **Naming convention:** CSV files use `snake_case` headers. All JSON over HTTP uses `camelCase`. The mapping table for each field is in `CONTRACTS.md`'s "API boundary mapping" notes — use those exact mappings, do not invent new ones.
- **Every timestamp** is ISO 8601 UTC (`2026-09-24T08:15:00Z` format).
- **Every ID field** uses the exact prefixes already fixed in `CONTRACTS.md`: `M-01`..`M-10` (machines), `OP-01`..`OP-15` (operators), `T001`, `T002`... (tasks), `A001`... (alerts), `F001`... (behavior flags), `TH001`... (training modules), `I001`... (incidents).

---

## 1. Hour 0 – 0:30 — Together: Confirm Contract, Set Up Git

All three people, same room/call. Do not split up before this is done.

### 1.1 Review `CONTRACTS.md`
Read it top to bottom together. It is already fully specified (endpoints §1–10, dataset schema, thresholds, production-hardening spec in §8). Confirm nothing needs changing. If something is genuinely wrong, edit `CONTRACTS.md` directly and add a row to its Change Log table with who changed what and when — do not discuss changes verbally only.

### 1.2 Git setup (Ripun runs these, others confirm access)
```
git checkout -b frontend
git push -u origin frontend
git checkout main
git checkout -b backend
git push -u origin backend
git checkout main
git checkout -b data
git push -u origin data
git checkout main
```
Each person now works exclusively on their own branch (`frontend`→Anamika, `backend`→Ripun, `data`→Dev) until an integration pass explicitly calls for a merge.

### 1.3 Commit the contract
```
git add CONTRACTS.md README.md EXECUTION_PLAN.md
git commit -m "Lock API contracts and execution plan"
git push origin main
```

**Exit condition:** all three branches exist and are pushed; `CONTRACTS.md` is committed to `main`; everyone has pulled `main` onto their own branch (`git checkout <branch> && git merge main`).

---

## 2. Hour 0:30 – 3:00 — Parallel Build (Core 5 Outcomes)

### 2.1 Anamika — Frontend

**Step 1 (0:30–1:00): Scaffold**
```
git checkout frontend
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd frontend
npm install recharts
```
When prompted by `create-next-app`, accept ESLint, decline Turbopack if asked (use default/stable webpack for compatibility), use the `app` router.

**Step 2 (0:30–1:00, continues in parallel): Build page shells with mock data**
Create these pages under `frontend/app/`:
- `app/page.tsx` — landing/dashboard entry, links to the 5 views below
- `app/tasks/page.tsx` — daily task dashboard
- `app/safety/page.tsx` — safety alerts
- `app/behavior/page.tsx` — unusual behavior flags
- `app/training/page.tsx` — training hub
- `app/task-time/page.tsx` — task time estimation form + result

For each page, hardcode 2-3 mock objects matching the exact JSON shape in `CONTRACTS.md` §1 (tasks), §2 (safety-alerts), §3 (behavior-flags), §5 (training-hub). Render them as simple lists/cards with Tailwind. Do not wait for Ripun's real API — use mock data as placeholder now, replace in Step 3.

**Step 3 (1:00–2:30): Real components**
- Task dashboard: list of task cards showing `taskId`, `taskType`, `machineId`, `operatorId`, `status` (color-coded: pending=gray, in_progress=blue, completed=green), `scheduledStart` (formatted local time), `estimatedTimeMin`.
- Safety alerts: list/banner per alert showing `type`, `message`, `severity` (color-coded: low=yellow, medium=orange, high=red), `timestamp`.
- Behavior flags: list showing `type`, `value` vs `threshold` (e.g. "58 min / 45 min threshold"), `message`.
- Training hub: list of modules (`title`, `content` rendered as plain text/markdown for `format: "article"`).
- Task-time page: a form with inputs for `taskType` (dropdown: the 5 fixed values from `CONTRACTS.md` §B), `weather` (dropdown: 4 fixed values), `operatorSkill` (dropdown: 3 fixed values), `machineAgeYears` (number input), `estimatedTimeMin` (number input). On submit, POST to the endpoint (wired in Step 4) and display `predictedTimeMin`, `source`, `confidence` in the result.

**Step 4 (2:30–3:00): Wire to real backend**
Create `frontend/lib/api.ts` with fetch functions for each endpoint, base URL `http://localhost:3000` (NestJS port, per §0). One function per endpoint:
```ts
export async function getTasks() { return fetch('http://localhost:3000/tasks').then(r => r.json()); }
export async function getSafetyAlerts() { return fetch('http://localhost:3000/safety-alerts').then(r => r.json()); }
export async function getBehaviorFlags() { return fetch('http://localhost:3000/behavior-flags').then(r => r.json()); }
export async function getTrainingHub() { return fetch('http://localhost:3000/training-hub').then(r => r.json()); }
export async function predictTaskTime(body: object) {
  return fetch('http://localhost:3000/predict-task-time', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.json());
}
```
Replace mock data in every page with calls to these functions (use `useEffect` + `useState`, or Next.js server components with `fetch` directly — either is fine, pick one approach and use it consistently across all 5 pages). This works against Ripun's stub responses from his Step 1 even before his real logic is done — do not wait.

**Deliverable by 3:00:** all 5 pages render live data from `http://localhost:3000`, no hardcoded mock objects remain in component code.

**Commit/push discipline:** commit after each step (1 commit per numbered step above, minimum), push to `frontend` branch each time.

---

### 2.2 Ripun — Backend/Rules + Model-Serving Integration

**Step 1 (0:30–1:00): Scaffold NestJS + stub all endpoints**
```
git checkout backend
npm i -g @nestjs/cli
nest new backend --package-manager npm
cd backend
npm install @nestjs/axios axios
```
Create one controller per resource: `src/tasks/tasks.controller.ts`, `src/safety/safety.controller.ts`, `src/behavior/behavior.controller.ts`, `src/training/training.controller.ts`, `src/prediction/prediction.controller.ts`. Generate with Nest CLI:
```
nest g controller tasks
nest g controller safety
nest g controller behavior
nest g controller training
nest g controller prediction
```
In each controller, implement the `GET`/`POST` route from `CONTRACTS.md` §1, §2, §3, §5, §4 respectively, returning a **hardcoded array/object matching the exact JSON shape** in `CONTRACTS.md` (copy the example JSON directly as the stub return value). Enable CORS in `src/main.ts` (`app.enableCors()`) so the frontend on port 3001 can call port 3000. Set the app to listen on port 3000 explicitly: `await app.listen(3000)`.

**Deliverable at 1:00:** `npm run start:dev` serves all 5 stub endpoints on port 3000 — push immediately so Anamika is unblocked.

**Step 2: Real rule logic**
Dev's `data-ml/data/operations.csv` and `data-ml/data/tasks.csv` are merged and available (see `data-ml/BACKEND_HANDOFF.md` for full integration notes — it documents field mappings, model loading, and gotchas in more detail than restated here).
- Create `src/data/data-loader.service.ts` — reads `operations.csv` and `tasks.csv` from `../data-ml/data/` at startup (use the `csv-parse` npm package: `npm install csv-parse`), parses into in-memory arrays of objects, converts `snake_case` CSV headers to `camelCase` per `CONTRACTS.md`'s API boundary mapping tables.
- Create `src/rules/rules.service.ts` implementing exactly these three rules, using the **finalized thresholds** from `CONTRACTS.md`'s "Thresholds (FINALIZED)" section — do not invent different numbers:
  ```ts
  const IDLING_THRESHOLD_MIN = 45;
  const PROXIMITY_THRESHOLD_M = 3;
  const UNSAFE_PATTERN_ALERT_COUNT = 3;

  function checkSeatbelt(row) {
    return row.seatbeltStatus === 'Unfastened';
  }
  function checkProximity(row) {
    return row.distanceToNearestObjectM < PROXIMITY_THRESHOLD_M;
  }
  function checkIdling(row) {
    return row.idlingTimeMin > IDLING_THRESHOLD_MIN;
  }
  ```
  `safety.controller.ts`'s `GET /safety-alerts` iterates loaded `operations.csv` rows, and for each row where `checkSeatbelt` or `checkProximity` is true, emits an alert object matching `CONTRACTS.md` §2's shape (`type: "seatbelt"` or `"proximity"`, `severity`: use `"high"` for seatbelt, `"medium"` for proximity — these are the only two severities used by rule-generated alerts; `"low"`/`"high"` severity for manually-logged incidents is decided at §5.2's incident endpoint, not here). `message` field: generate from a template, e.g. `` `Seatbelt unfastened while machine active` `` for seatbelt, `` `Distance to nearest object ${row.distanceToNearestObjectM}m is below ${PROXIMITY_THRESHOLD_M}m safe threshold` `` for proximity.

  `behavior.controller.ts`'s `GET /behavior-flags` iterates the same rows: emit `type: "excessive_idling"` when `checkIdling` is true (with `value`/`threshold` fields per §3's shape), and separately compute `unsafe_pattern`: group alerts by `operatorId`, and for any operator with `>= UNSAFE_PATTERN_ALERT_COUNT` alerts, emit one `type: "unsafe_pattern"` flag for that operator.

  `tasks.controller.ts`'s `GET /tasks` reads from `tasks.csv` (note: this dataset has no `scheduledStart`/`status` fields per the finalized schema — synthesize `scheduledStart` as the current date + a fixed hour offset per row index, and default every task's `status` to `"pending"` unless a §5.2 `PATCH` has changed it in memory).

  `training.controller.ts`'s `GET /training-hub` serves Dev's static content (hand-off target 2:45–3:00) — until received, keep it returning the stub from Step 1.

**Step 3 (2:00–2:30): FastAPI wrapper skeleton with fallback**
```
cd ..
mkdir ml-service
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn scikit-learn pandas pydantic
```
Create `ml-service/main.py` with a `POST /predict-task-time` route matching `CONTRACTS.md` §4's request/response shape exactly. **Before Dev's model is ready**, implement it as a weighted-average calculation (this is the permanent fallback, not just a placeholder — it stays in the code as the fallback path even after the real model exists):
```python
def weighted_average_fallback(task_type, weather, operator_skill, machine_age_years, estimated_time_min):
    multiplier = 1.0
    if operator_skill == "Beginner": multiplier *= 1.25
    elif operator_skill == "Intermediate": multiplier *= 1.05
    elif operator_skill == "Expert": multiplier *= 0.95
    if weather in ("Rainy", "Windy"): multiplier *= 1.10
    if machine_age_years > 5: multiplier *= 1.07
    return round(estimated_time_min * multiplier, 1)
```
This mirrors the exact same multiplier logic Dev uses to generate the training data (see §3 below), so the fallback is a sane approximation of what the real model should produce. Response includes `"source": "fallback_average"`, `"confidence": "low"` (per `CONTRACTS.md` §4's confidence rule) until the real model is swapped in.

Run it: `uvicorn main:app --port 8001 --reload`.

**Step 4 (2:30–3:00): NestJS→Python integration**
In `prediction.controller.ts`, replace the stub with a real HTTP call to `http://localhost:8001/predict-task-time` using `HttpService` from `@nestjs/axios`, with a 2-second timeout. On timeout or any error, catch it and fall back to calling the *same weighted-average formula* directly in NestJS (duplicate the formula from Step 3 in TypeScript) so `/predict-task-time` never fails outright — it always returns a valid response, either from Python or NestJS's own inline fallback, with `source` set accordingly (`"model"` or `"fallback_average"`).

When Dev hands off the trained model file (target 2:30, §3 below), replace the weighted-average function inside `ml-service/main.py` with `model.predict(...)` on the loaded model (load via `joblib` or `pickle` at service startup, not per-request), keeping the exact same request/response shape and only changing `"source"` to `"model"` and `"confidence"` to `"medium"`. This is a function-body swap only — no route signature or response shape changes.

**Deliverable by 3:00:** all 5 core endpoints live with real logic; `/predict-task-time` always returns a valid response regardless of Python service state.

---

### 2.3 Dev — Data + Model Training — SUPERSEDED, SEE NOTE

**✅ Status: complete, merged into `backend` from `origin/data`.** The steps below describe the *original* plan for this work; Dev's actual implementation went beyond it (15 operators with distinct behavioral archetypes for realistic correlated data rather than independent-random columns, a validation script gating training on schema/consistency checks, plus the Operator Performance Score, alert reasoning, and cross-feature synthesis — none of which were in the original scope). The steps below are kept for historical reference only — **do not re-run or redo this work.** For what actually exists and how to integrate it, read `data-ml/BACKEND_HANDOFF.md` and `data-ml/FRONTEND_HANDOFF.md` instead; those are the current source of truth for this layer.

<details>
<summary>Original plan (superseded — click to expand)</summary>

**Step 1 (0:30–1:15): Dataset generator**
```
git checkout data
mkdir data
cd data
python -m venv venv
venv\Scripts\activate
pip install pandas numpy
```
Create `data/generate_operations.py`. It must produce `data/operations.csv` with exactly the columns, types, and value ranges specified in `CONTRACTS.md`'s "A. `operations.csv`" table — 150–200 rows, multiple sessions per machine/operator pair, random values within each column's stated range, and `safety_alert_triggered` computed by the exact OR-rule given there (`seatbelt_status = Unfastened` OR `distance_to_nearest_object_m < 3` OR `idling_time_min > 45`) so the dataset's labels agree with Ripun's rule engine.

Create `data/generate_tasks.py`. It must produce `data/tasks.csv` with exactly the columns from `CONTRACTS.md`'s "B. `tasks.csv`" table (including `operator_id`, using the same `OP-01..OP-15` ID space as `operations.csv`) — 80–120 rows. Implement `actual_time_min` using the exact generation rule specified there:
```python
import random

def generate_actual_time(estimated_time_min, operator_skill, weather, machine_age_yrs):
    if operator_skill == "Beginner":
        multiplier = random.uniform(1.15, 1.40)
    elif operator_skill == "Intermediate":
        multiplier = random.uniform(0.95, 1.15)
    else:  # Expert
        multiplier = random.uniform(0.85, 1.05)
    if weather in ("Rainy", "Windy"):
        multiplier *= random.uniform(1.05, 1.15)
    if machine_age_yrs > 5:
        multiplier *= random.uniform(1.05, 1.10)
    noise = random.uniform(0.95, 1.05)
    return round(estimated_time_min * multiplier * noise)
```
Run both scripts, verify `data/operations.csv` and `data/tasks.csv` exist with the right headers, commit and push immediately — do not wait until polished:
```
git add data/operations.csv data/tasks.csv data/generate_operations.py data/generate_tasks.py
git commit -m "Add synthetic datasets"
git push origin data
```
Copy both CSVs into `backend/data/` as well (Ripun's NestJS reads from there per §2.2 Step 2) — either via a copy command or by agreeing the backend reads directly from the `/data` folder path; **decision: NestJS reads from the repo-root `/data` folder directly via a relative path (`../data/operations.csv` from `backend/`), no copy needed** — set this path in `data-loader.service.ts`.

**Step 2 (1:15–2:30): Train + validate the task-time model**
```
pip install scikit-learn joblib
```
Create `data/train_model.py`:
```python
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib

df = pd.read_csv("tasks.csv")
X = df[["task_type", "weather", "operator_skill", "machine_age_yrs", "estimated_time_min"]]
y = df["actual_time_min"]

categorical = ["task_type", "weather", "operator_skill"]
numeric = ["machine_age_yrs", "estimated_time_min"]

preprocessor = ColumnTransformer([
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical)
], remainder="passthrough")

model = Pipeline([
    ("preprocess", preprocessor),
    ("regress", LinearRegression())
])
model.fit(X, y)
joblib.dump(model, "task_time_model.joblib")
print("Model trained. Sample predictions on training data:")
print(model.predict(X.head(5)), "vs actual:", y.head(5).values)
```
Run it. **Validation step, required, not optional:** manually check the 5 known sample rows from `README.md` §3.1 (T001–T005) — plug their inputs into the trained model and confirm predictions are within ~15% of the given `actual_time_min` values. If not, the training data generation (Step 1) likely has a bug — fix the generation rule before proceeding, do not hand off a model that fails this check.

**Hand off at 2:30, regardless of polish:** copy `task_time_model.joblib` into `ml-service/` folder, notify Ripun directly (not just via commit — a direct message, since he's mid-integration and needs to know synchronously). Commit:
```
git add data/train_model.py
git commit -m "Add task-time model training script"
git push origin data
```
(Do not commit the `.joblib` binary to the `data` branch — copy it directly into `ml-service/` on Ripun's `backend` branch, or place it in a shared local folder both can access, since it's a build artifact, not source.)

</details>

**Actual outcome:** the model exists at `data-ml/model/task_time_pipeline.joblib` (already merged into `backend`), with real evaluation metrics in `data-ml/model/metrics.json` (test R² 0.93, MAE ~4 min — a legitimately validated model, not just fit-and-forget). `data-ml/predict.py` has a reference implementation for loading and calling it; `data-ml/BACKEND_HANDOFF.md` §1 has the exact FastAPI wiring code, including the correct field-name mapping and an explicit warning that `predict.py`'s own fallback is a placeholder, not the real weighted-average formula to use.

**Step 3: Training hub content — still outstanding, not yet done**
Write `data-ml/data/training-content.json` (or wherever the team agrees), an array of 3-4 objects matching `CONTRACTS.md` §5's shape (`moduleId`, `title`, `format: "article"`, `content`). Suggested titles: "Safe Excavation Practices," "Proper Seatbelt & Proximity Protocols," "Reading Your Task-Time Estimate," "Handling Adverse Weather Conditions." Content: 150-300 words of plausible plain-text guidance each. Hand the JSON file to Ripun to load into `training.controller.ts`. This is genuinely not done yet and isn't covered by anything in the data-ml handoff — needs explicit follow-up with Dev or Anamika.

---

## 3. Hour 3:00 – 4:00 — Integration Pass (Together)

1. Everyone pushes final commits to their own branch.
2. Ripun merges in this order (run from `main`):
   ```
   git checkout main
   git pull origin main
   git merge data
   git merge backend
   git merge frontend
   ```
   Resolve conflicts if any arise (expected mainly in `README.md`/`CONTRACTS.md` if someone edited them — take the more detailed/correct version, do not silently drop content). Push: `git push origin main`.
3. Boot all three services from `main`:
   ```
   cd ml-service && venv\Scripts\activate && uvicorn main:app --port 8001
   cd backend && npm run start:dev
   cd frontend && npm run dev
   ```
4. Manually click through all 5 frontend pages, confirm each shows live data (not mock, not empty, not an error).
5. Fix only what's broken and blocking a full click-through. If something is broken and non-core (e.g. training-hub styling), note it and move on — do not scope-creep here.

**Exit condition:** `main` boots all three services cleanly from a fresh `git clone`, and all 5 outcomes are visible and functioning end-to-end.

---

## 4. Hour 4:00 – 4:45 — Demo Prep

- Dev writes a 5-point spoken narrative (not a slide deck, just talking points) covering: (1) what's live right now, demoed in order tasks→safety→behavior→training→task-time; (2) why safety/behavior stay rule-based (explainability, point at `rules.service.ts`'s named threshold constants as evidence); (3) why task-time is a real trained model, not a lookup (point at the correlation pattern in the 5 sample rows from `README.md` §3.1 as the justification); (4) what's next (§5 features below); (5) the "mission-oriented" framing from `README.md` §2 (standalone today, schema/architecture built to extend to fleet-wide later).
- Anamika + Ripun do one full timed dry run of the click-through from step 4 above.
- Fix only what breaks during the dry run.

---

## 5. Hour 4:45 – 5:00 — Buffer

Fix anything the dry run surfaced. If nothing broke, spend remaining time on UI copy/label polish only — no new scope.

---

## 6. Hour 5+ — Differentiator Features (Only Start After §3's Integration Pass Is Clean)

Full rationale: `README.md` §7. Build order below is fixed — do not reorder.

### 6.1 Why-was-I-flagged (Anamika, ~30 min)
On the safety-alerts and behavior-flags pages, make each alert/flag card display its `message` field prominently (large text, not a tooltip) — this field already exists in the API response from §2.2 Step 2. No backend change. No new endpoint. Just a UI-prominence change.

### 6.2 Composite safety risk score (Dev trains, Ripun wraps + integrates, ~1–1.5 hrs)

**Dev's part:**
Create `data/train_risk_model.py`:
```python
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib

df = pd.read_csv("operations.csv")
X = df[["seatbelt_status", "distance_to_nearest_object_m", "idling_time_min"]]
y = df["safety_alert_triggered"].map({"Yes": 1, "No": 0})

preprocessor = ColumnTransformer([
    ("cat", OneHotEncoder(handle_unknown="ignore"), ["seatbelt_status"])
], remainder="passthrough")

model = Pipeline([
    ("preprocess", preprocessor),
    ("classify", LogisticRegression())
])
model.fit(X, y)
joblib.dump(model, "safety_risk_model.joblib")
```
Validate: run `model.predict_proba(X.head(10))`, confirm scores are sensible (unfastened + close proximity + high idling → score near 1.0; all-clear rows → score near 0.0). Hand `safety_risk_model.joblib` to Ripun.

**Ripun's part:**
Add `POST /predict-safety-risk` to `ml-service/main.py`, matching `CONTRACTS.md` §4.1's request/response shape exactly. Load the model at startup. To compute `topFactors`, extract the logistic regression's coefficients (`model.named_steps['classify'].coef_`) multiplied by each input's (one-hot-encoded) value, sorted descending by absolute contribution — return the top 3. Compute `riskTier` from `riskScore` using the thresholds in `CONTRACTS.md` §4.1 (`<0.3 low`, `0.3–0.6 medium`, `>0.6 high`).

Add `src/prediction/safety-risk.controller.ts` in NestJS calling this new Python endpoint the same way `/predict-task-time` is called (§2.2 Step 4's pattern), **except**: if the Python call fails, return `"source": "fallback_unavailable"` and no `riskScore`/`riskTier`/`topFactors` fields — per `CONTRACTS.md` §4.1, do not fabricate a risk number.

Surface it on the frontend (Anamika, small addition): on the safety-alerts page, show the risk score + top factors alongside each machine's current session if available.

### 6.3 Cross-feature synthesis (Dev: logic, Anamika: UI, ~1–1.5 hrs)

Requires `operator_id` already present in `tasks.csv` (added in §2.3 Step 1 — confirm it's there before starting this).

**Dev's part (as a NestJS service, not Python — this is a data join, not ML):**
Add `src/operators/operators.controller.ts` implementing `GET /operators/:operatorId/summary` per `CONTRACTS.md` §9. Logic:
```ts
function getOperatorSummary(operatorId: string) {
  const operatorTasks = tasksData.filter(t => t.operatorId === operatorId);
  const operatorAlerts = safetyAlertsComputed.filter(a => a.operatorId === operatorId);
  const totalTasks = operatorTasks.length;
  const safetyAlertCount = operatorAlerts.length;
  const avgOverrunPct = operatorTasks.length
    ? operatorTasks.reduce((sum, t) => sum + ((t.actualTimeMin - t.estimatedTimeMin) / t.estimatedTimeMin * 100), 0) / operatorTasks.length
    : 0;
  const flaggedForRetraining = safetyAlertCount >= 3 && avgOverrunPct > 15;
  return {
    operatorId, totalTasks, safetyAlertCount,
    avgTaskOverrunPct: Math.round(avgOverrunPct * 10) / 10,
    flaggedForRetraining,
    recommendedTrainingModules: flaggedForRetraining ? ["TH001"] : []
  };
}
```
(`3` alerts and `15%` overrun are the concrete thresholds for "flagged for retraining" — fixed here, not left to guesswork; adjust only if Dev+Ripun agree and log the change in `CONTRACTS.md`'s Change Log.)

**Anamika's part:** new page `app/operators/[operatorId]/page.tsx` showing the summary, with `flaggedForRetraining: true` rendering a visible banner linking to `/training` (the training hub page from §2.1).

**Stop condition:** if the second panel review is approaching and this isn't done, skip it — it's the lowest-priority of the remaining 3 differentiators (see `README.md` §7.3).

---

## 7. Hour ~8+ — Production Hardening (Only If §6 Is Fully Done and Stable)

Full spec: `CONTRACTS.md` §8. Ripun drives; Anamika wires any new frontend forms; Dev assists wherever needed. Execute in this exact order (matches the priority list in `CONTRACTS.md` §8):

1. **Input validation (~30 min).** In NestJS, install `class-validator class-transformer` (`npm install class-validator class-transformer`), create a DTO class per write endpoint (`UpdateTaskStatusDto`, `CreateIncidentDto`) with `@IsIn([...])`/`@IsString()` decorators matching the exact enum values in `CONTRACTS.md`, enable global validation in `main.ts` (`app.useGlobalPipes(new ValidationPipe())`). In FastAPI, define Pydantic models for both prediction endpoints' request bodies (already partially idiomatic — just make sure both `/predict-task-time` and `/predict-safety-risk` use typed Pydantic request models, not raw dicts).

2. **Standard error shape (~20 min).** In NestJS, create `src/common/filters/http-exception.filter.ts`, a global exception filter that catches all errors and reformats them into `{ "error": { "code": ..., "message": ..., "statusCode": ... } }` per `CONTRACTS.md` §8.3. Register globally in `main.ts` (`app.useGlobalFilters(new HttpExceptionFilter())`). In FastAPI, add an `@app.exception_handler` that does the same.

3. **Structured logging (~30 min).** In NestJS, add a simple middleware (`src/common/middleware/logger.middleware.ts`) logging `timestamp, method, path, statusCode, durationMs` for every request, applied globally in `AppModule`. Additionally, inside `rules.service.ts`, log every time a rule fires (`console.log` with rule name + the row data that triggered it) — this is the audit trail referenced in `CONTRACTS.md` §8.6. In `ml-service/main.py`, log every prediction request's input and output the same way.

4. **`GET /health` + circuit breaker (~30 min).** Add `src/health/health.controller.ts` in NestJS returning `{ status: "ok", uptime, pythonServiceReachable }` per `CONTRACTS.md` §10 — `pythonServiceReachable` computed by pinging `http://localhost:8001/health` (add this route to FastAPI too, trivially returning `{"status": "ok"}`) with a 1-second timeout. Store the last health-check result in a module-level variable, refreshed every 10 seconds via `setInterval`. In `prediction.controller.ts` and `safety-risk.controller.ts`, check this flag before attempting the Python call — if `false`, skip straight to fallback logic without waiting on a timeout.

5. **Write endpoints (~1 hr, split Ripun backend / Anamika frontend).**
   - `PATCH /tasks/:taskId` per `CONTRACTS.md` §6 — updates the in-memory task's `status` field, returns `404` (via the new error shape) if `taskId` not found, `400` if `status` isn't one of the 3 valid values.
   - `POST /incidents` and `GET /incidents` per `CONTRACTS.md` §7–8 — in-memory array, `loggedBy: "manual"` for POSTed incidents; also backfill `loggedBy: "system"` incident entries by mapping existing rule-generated safety alerts into the same incident shape so `GET /incidents` shows a unified view.
   - Anamika: add a status-change control (dropdown or buttons) to each task card on `app/tasks/page.tsx`, calling `PATCH`; add a simple incident-report form (machineId, operatorId, description, severity dropdown) somewhere reachable from the safety page, calling `POST /incidents`, and a list view of `GET /incidents` results.

6. **`GET /operators/:operatorId/summary` caching (~45 min, skip if §6.3 already handled this).** Wrap the summary computation from §6.3 in a simple in-memory cache: a `Map<operatorId, { data, expiresAt }>` with a 30-second TTL, checked before recomputing.

7. **Pagination (~30 min).** Add `?page=&pageSize=` query param handling to `GET /tasks`, `GET /safety-alerts`, `GET /behavior-flags`, `GET /incidents`. Wrap responses as `{ data: [...], page, pageSize, total }` per `CONTRACTS.md` §8.2. Update `frontend/lib/api.ts` functions to accept and pass these params (default `page=1&pageSize=20` if not specified), and update list-rendering pages to read `.data` instead of the raw array.

8. **API versioning (~20 min).** In NestJS, set a global prefix: `app.setGlobalPrefix('api/v1')` in `main.ts`. Update every `frontend/lib/api.ts` fetch URL to include `/api/v1/` before the resource path (e.g. `http://localhost:3000/api/v1/tasks`).

9. **Idempotency + basic auth (~30 min, cut first if short on time).** `POST /incidents` accepts an optional `requestId` field in the body; if a request with the same `requestId` was already processed (check an in-memory `Set`), return the original response instead of creating a duplicate. For auth: require a header `x-api-key: dev-shared-key` (any fixed string, agreed and written into `CONTRACTS.md`'s Change Log if implemented) on `PATCH /tasks/:taskId` and `POST /incidents`, checked via a simple NestJS guard; reject with `401` (new error shape) if missing/wrong.

**Hard stop rule:** if the second panel review is approaching and any of §2's core outcomes or §6's differentiators are broken, stop this section immediately and fix those instead. This section only has value once everything beneath it is solid.

---

## Anti-patterns (do not do these, ever, under time pressure)

- Do not wait on another person's "real" implementation before starting your own piece — always build against the stubbed/mocked contract first, exactly as specified in each person's Step 1 above.
- Do not let any branch go more than ~1 hour without an attempt to sync with `main`.
- Do not start §6 (differentiators) before §3's integration pass is clean, and do not start §7 (hardening) before §6 is stable — the order in this document is the order to execute in, not a menu.
- Do not invent new threshold numbers, field names, enum values, or endpoint shapes that aren't in `CONTRACTS.md` — if something seems to be missing, add it to `CONTRACTS.md` first (with a Change Log entry) and then build against that, rather than deciding it ad hoc in code only.
- Do not debate architecture after §1 is complete — it's locked. If something is genuinely broken, fix it and log the change in `CONTRACTS.md`; do not relitigate the decision from scratch.
