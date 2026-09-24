# Smart Operator Assistant for CAT Machinery
## Caterpillar Hackathon — Implementation Plan

---

## 0. Current Build Status (As of Final Review Prep)

**Everything below §0 is the original pre-hackathon plan, kept intact for its design rationale — it does not reflect what's actually built.** For exact endpoint shapes and per-endpoint implementation status, `CONTRACTS.md` is the source of truth; this section is the plain-language summary.

**All 5 core outcomes: implemented.** Task dashboard, safety alerts, behavior flags, training hub, task-time prediction — all live, backed by real (not stubbed) data and logic.

**All 6 differentiator features (§7.1–§7.6): implemented.** Including §7.2's Composite Safety Risk Score — the one ML model considered a stretch/at-risk in the original plan — which is now fully trained and live, not just scaffolded.

**Production hardening (§7.7): fully implemented.** All 9 items in `CONTRACTS.md` §8 (validation, error shape, pagination, caching, circuit breaker, structured logging, versioning, auth, idempotency).

**Frontend: complete**, built by Anamika against the real API (not a mock), covering all core outcomes and differentiators with a custom industrial-HMI-inspired UI (not a generic SaaS dashboard).

**Known, deliberately deferred gap:** no machine in the current synthetic dataset triggers the compound SOS alert (§7.5) — confirmed as a data-realism outcome, not a logic bug (lowest machine health score is 56, threshold is 40). The fix is small and contained to `data-ml/generate_data.py`; not required for the core demo to be honest and complete.

See `CONTRACTS.md`'s Change Log for the full, dated history of what was built, in what order, and by whom.

---

## 1. Problem Statement (As Assigned)

**Background:** Construction equipment (excavators, loaders) is increasingly digitalized, but tools available to machine operators remain basic. Build an intelligent, end-to-end assistant that supports operators throughout their workday — improving efficiency, safety, and training.

**Challenge:** Design and build a multi-functional operator interface for CAT machine operators. Go beyond a simple tool — make it an intelligent *companion* for the operator's daily experience.

**Expected outcomes (from the problem statement):**
1. **Daily task dashboard** — view scheduled tasks for the day
2. **Safety features** — real-time operator safety using available/assumed data: seatbelt compliance, proximity hazards, incident logging (working conditions to be considered)
3. **Operator training hub** — pick one creative format: e-learning videos, instructor booking, or simulation modules
4. **Unusual behavior detection** — e.g. excessive idling, unsafe operation patterns
5. **Task time estimation** — predict time to complete a task based on past data and environmental conditions

**Full problem statement now reviewed** . A second sample dataset was provided — see §3.1 — which resolves the ML ambiguity below.

**Resolved: ML is warranted for task-time estimation specifically.** The `Task Time Estimation` sample data (Task Type, Weather, Operator Skill, Machine Age → Estimated vs Actual Time) shows real, learnable structure: Beginner+Cloudy overruns estimate by 40%, Expert+Sunny finishes under estimate, Windy+Demolition overruns — the delta correlates with skill/weather/machine-age in a way a plain average can't capture. Combined with the "intelligent companion" framing, this is Caterpillar signaling that task-time estimation specifically should be a genuine regression model, not a lookup average. **Safety features and unusual-behavior detection remain rule-based** (deterministic, explainable — still the right call for safety-critical logic, and defensible to the panel as a deliberate choice, not a shortcut).

**Event format:** 24-hour build. Two panel review checkpoints during the event (panel asks how/when/why questions on progress — treat these as mini pitch rehearsals, not just status checks). **First review in ~5 hours from kickoff.**

**Team & Roles (confirmed):**
- **Anamika** — Frontend/Dashboard
- **Ripun** — Backend/Rules
- **Dev** — Data + Training Hub + Integration

See [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md) for the detailed phase-by-phase, per-person plan to the first review.

---

## 2. Key Design Decisions (Locked — See §2.1 for ML Scope)

**Safety, idling detection, task dashboard → rule-based, deterministic.**
- These are naturally rule-shaped (thresholds, boolean checks, lookups), explainable/auditable, and the fastest path to a working demo.
- **Safety features → rule-based, deterministic logic.** E.g.:
  - `if seatbelt_status == "Unfastened": trigger_alert("seatbelt")`
  - `if idling_time_min > THRESHOLD: flag("excessive_idling")`
  - `if distance_to_nearest_object < SAFE_DISTANCE: trigger_alert("proximity_hazard")`
  - Rule-based logic is a *feature*, not a shortcut: it's fully explainable and auditable, which is a strong story for the panel ("every alert traces to a specific, inspectable rule — no black box").
- **Task time estimation → real trained regression model.** See §2.1 — resolved, not a weighted average. A weighted-average calculation exists only as Ripun's fallback if the trained model isn't ready in time (see `EXECUTION_PLAN.md`), never as the primary design.
- **Unusual behavior detection → rule/threshold-based**, same pattern as safety alerts (e.g., idling time above a configured threshold, operation patterns outside a defined normal range). Not anomaly-detection ML.

**Software type: standalone, with mission-oriented design principles layered on top.**
- Runs self-contained on one machine — no live network/cloud dependency required for core function.
- But deliberately designed as if it *could* extend to fleet-wide monitoring later: realistic telemetry-like data schema, modular architecture (rules engine separable from UI, data layer separable from logic), explainable/deterministic safety logic. This is a framing choice worth stating explicitly to the panel — it signals engineering maturity beyond "just a hackathon demo."

## 2.1 ML Scope (Resolved)

**Task time estimation → real regression model.** Train on `Task Type, Weather, Operator Skill, Machine Age → Actual Time` (§3.1). A small Python/scikit-learn model (even plain linear regression or a small decision tree) trained on the synthetic dataset, wrapped in one endpoint (`POST /predict-task-time`), called from NestJS. This is the genuine "intelligent" element and the strongest panel talking point — it's real learned prediction, not a hardcoded average.

**Individual safety-rule detection and unusual-behavior detection stay rule-based** (seatbelt, proximity, idling threshold) — deliberate choice, not a shortcut: deterministic per-violation logic is auditable and appropriate for safety-critical features. **Composite safety risk scoring is a second ML model, layered on top of those same rule-detected features** — see §7.2 (now implemented, not just planned). This is not a contradiction: the inputs to the score are still rule-computed and inspectable; only the *combination* into a single risk number is learned, and it's always shown with its contributing factors so it stays explainable.

**Optional stretch (only if core is done early):** a thin conversational layer — operator asks "what's my next task?" — as a direct LLM API call from NestJS, grounded in the app's own data. Not required; do not start this before the must-haves are solid.

---

**Tech stack: NestJS backend + React/Next.js frontend + one Python microservice hosting both ML models.**
- NestJS: dashboard API, rule engine, persistence, orchestration — plays to the team's speed.
- Python/FastAPI: `/predict-task-time` (core, §2.1) and `/predict-safety-risk` (stretch, §7.2) — two endpoints in the same service, both scikit-learn models trained on the same dataset files. Kept deliberately narrow — see §5.4 for the integration contract.
- Local persistence: SQLite or structured JSON/CSV files read by NestJS — no external DB needed under this timeline.

---

## 3. Dataset

**Sample schema observed:** `Timestamp, Machine ID, Operator ID, Engine Hours, Fuel Used (L), Load Cycles, Idling Time (min), Seatbelt Status, Safety Alert Triggered`

**Observed pattern in sample data:**
- `Safety Alert Triggered = Yes` correlates with `Seatbelt Status = Unfastened`
- High `Idling Time` (55–60 min range) also correlates with alert rows

**Schema is flexible — team builds its own synthetic dataset.** Can extend beyond the sample, e.g.:
- `distance_to_nearest_object` (for proximity hazard rules)
- `task_type` (for task-time estimation and dashboard scheduling)
- `environmental_conditions` (weather/terrain — for task-time estimation, per the problem statement's explicit mention of environmental conditions)
- `incident_log_entries` (for incident logging feature)

**Action item:** finalize the extended schema as a team in the first working session, write it down (same contract-first discipline as §5.4), and generate a synthetic CSV/SQLite dataset early so dashboard, safety-rules, and task-time-estimation work can all proceed in parallel against the same fixture data.

### 3.1 Task Time Estimation Dataset (Provided Sample)

`Task ID, Task Type, Weather, Operator Skill, Machine Age (yrs), Estimated Time (min), Actual Time (min)`

| Task ID | Task Type | Weather | Operator Skill | Machine Age | Estimated | Actual |
|---|---|---|---|---|---|---|
| T001 | Earth Excavation | Sunny | Expert | 2 | 60 | 58 |
| T002 | Trenching | Rainy | Intermediate | 4 | 45 | 52 |
| T003 | Material Loading | Cloudy | Beginner | 3 | 30 | 42 |
| T004 | Grading | Sunny | Expert | 5 | 35 | 33 |
| T005 | Demolition | Windy | Intermediate | 6 | 90 | 105 |

**Signal observed:** actual time deviates from estimate in a way that correlates with skill, weather, and machine age (Beginner+Cloudy → +40% over; Expert+Sunny → under; poor weather + higher machine age → overrun). This is real regression signal, not noise — confirms §2.1's decision to build a trained model here rather than a static average. Dev should treat the *target* as `Actual Time` (what really happens) with `Estimated Time` as just one input feature, not the ground truth to reproduce.

---

## 4. Feature-to-Rule Mapping (Working Draft)

| Outcome | Approach | Notes |
|---|---|---|
| Daily task dashboard | Straightforward CRUD/read view over scheduled tasks | No special logic — standard list/detail UI |
| Safety: seatbelt compliance | Rule: alert if unfastened while machine active | Deterministic |
| Safety: proximity hazards | Rule: alert if `distance_to_nearest_object < threshold` | Needs a plausible threshold + assumed sensor field |
| Safety: incident logging | Simple log/append-only record, timestamped, linked to operator + machine | Basic data feature, not detection |
| Operator training hub | Pick **one** format per problem statement — recommend e-learning videos (static content, fastest to build) unless a teammate has a strong reason to build instructor booking (scheduling UI) or simulation modules (higher effort, likely not worth it in 24h) | Scope-cut candidate if time is tight |
| Unusual behavior detection | Rule/threshold: excessive idling (`idling_time > X`), unsafe patterns (e.g. repeated safety alerts in a session) | Same rule-engine as safety features — can share code |
| Task time estimation | Trained regression model (scikit-learn) on §3.1 dataset: `Task Type, Weather, Operator Skill, Machine Age → Actual Time` | Real ML, per §2.1 — served via Python `/predict-task-time` endpoint |

This table is a starting draft — revise once the full problem statement and any judging rubric are available, and once the team has picked its scope cuts (see §4.1).

### 4.1 Scope Cuts for 24 Hours (Draft — Revisit at Hour 0)

Given 24 hours and 3 people:
- **Must-have (core demo):** daily task dashboard, seatbelt + proximity safety rules with visible alerts, excessive-idling detection, one training-hub format (recommend e-learning/static content), task-time estimate live (real trained model if ready by the integration pass, Ripun's weighted-average fallback otherwise — either is an acceptable must-have result, per `EXECUTION_PLAN.md`).
- **Nice-to-have if ahead of schedule:** the 6 differentiator features in §7 (build only after the must-haves above are solid, and in the order given — later ones depend on earlier ones), incident logging as a full searchable log rather than a flat list, tuning/improving the regression model's accuracy, a second training-hub format.
- **Cut first if behind schedule:** instructor booking / simulation modules (high effort, low payoff vs. e-learning), elaborate incident-log search/filter UI.

Re-confirm this list as a team once roles are assigned and the full problem statement is reviewed.

---

## 7. Differentiator Features (Post-Core, Stretch — Build After §4.1 Must-Haves Are Solid)

These exist to make the build stand out beyond the baseline 5 outcomes — the panel's stated interest is in ideas that could genuinely solve problems for Caterpillar, not just a completed checklist. Build order below is deliberate: cheapest/lowest-risk first, riskiest (new ML model) after the core is proven stable.

### 7.1 Why-Was-I-Flagged (Alert Transparency) — ✅ Implemented

Surface the exact rule and values behind each safety alert in plain language on the frontend, prominently — not buried. The data already exists in `/safety-alerts`' `message` field (`CONTRACTS.md` §2); this is a UI treatment change, not new backend work. Reinforces the "explainable, not black-box" story that's already core to your safety architecture.

**Owner:** Anamika (pure frontend). **Effort:** near-zero — no new endpoint needed.

### 7.2 Composite Safety Risk Score (ML-Based) — ✅ Implemented

**Fully trained and live** — `data-ml/train_safety_risk.py`, model at `data-ml/model/safety_risk_model.joblib`, served via `POST /predict-safety-risk` (`CONTRACTS.md` §4.1). `topFactors` computed from the real pipeline's transformed coefficients × feature values, not a placeholder. `riskTier` thresholds tuned against the actual trained score distribution. Verified end-to-end with both high-risk and low-risk test inputs returning sensible, differentiated scores.

A second trained model — logistic regression, chosen specifically for interpretability — outputs a continuous safety risk score (0–1) per session, trained on `operations.csv`'s rule-violation features (seatbelt status, proximity, idling time). **Not a re-encoding of the existing OR-based alert rule** — the model should capture *interactions* between features (e.g., unfastened + high idling together carries disproportionately higher risk than either alone) that a simple OR rule can't express.

**Why logistic regression specifically:** its coefficients are directly inspectable, the same way the task-time regression's are. This keeps the safety layer defensible to the panel — every score must be shown alongside its contributing factors (§7.1's transparency pattern applies here too), never presented as an opaque number. This is a deliberate reframe of §2's "safety is fully rule-based" language: **individual violation detection stays rule-based** (seatbelt/proximity/idling — these are the model's input features, computed exactly as before), **while composite risk scoring is now genuinely ML-based**, always shown with its contributing factors.

Served via a new endpoint, `POST /predict-safety-risk` (see `CONTRACTS.md`) — same Python/FastAPI service and integration pattern as `/predict-task-time`, so the architectural cost is low; it's the same pipeline, a second model.

**Owner:** Dev (train/validate model), Ripun (FastAPI wrapper + NestJS integration — same split reasoning as §5.4 for task-time). **Effort:** moderate — reuses an already-built pattern.

### 7.3 Cross-Feature Synthesis — ✅ Implemented

Dashboard surfaces correlations across an operator's own history — e.g., "this operator has 3+ safety alerts and consistently overruns estimated task time — may need retraining," with a direct link into the training hub. This is the feature that most literally fulfills "end-to-end intelligent companion": it's the difference between 5 disconnected features and a system that reasons across its own data.

**Requires:** `operator_id` added to `tasks.csv` (currently missing — see `CONTRACTS.md` schema update) so safety-alert history and task-time-overrun history can be joined per operator. Without this field, this feature cannot be built — confirm the schema change with Dev before he finalizes data generation.

**Owner:** Dev (the join/aggregation logic) + Anamika (surfacing it on the dashboard). **Effort:** moderate-high — build last, after §7.1–7.2 are done, since it depends on data from both datasets being stable.

**Backing endpoint:** `GET /operators/:operatorId/summary` — see `CONTRACTS.md` §9.

### 7.4 Machine Health Score — ✅ Implemented

A per-machine composite health score, structurally mirroring the Operator Performance Score (see the data/ML handoff docs): a weighted, explainable, band-classified score (`EXCELLENT`/`GOOD`/`NEEDS_ATTENTION`/`CRITICAL`) computed entirely from fields already present in `operations.csv` — no new data collection required. This completes a symmetry the system is already building: the Operator Score answers "is the *person* the risk factor," this answers "is the *equipment* the risk factor" — together they let the system distinguish an operator problem from a machine problem for the same incident, which is a materially stronger diagnostic story than either alone.

**Component factors (all derived from existing `operations.csv` fields, aggregated per `machine_id` instead of per `operator_id`):**
- **Wear/usage load** — cumulative `engine_hours` and per-session `load_cycles`; a machine working harder than its peers carries elevated risk independent of any single incident.
- **Fuel efficiency drift** — `fuel_used_l` per session compared against the machine's own historical baseline for similar load; rising fuel use relative to its own past is a known leading indicator of mechanical degradation.
- **Idling burden** — `idling_time_min` aggregated per machine rather than per operator; idling accumulates engine hours without productive work, affecting both wear and cost.
- **Incident association** — safety alerts (especially proximity) tied to this specific machine regardless of which operator was driving it, isolating equipment-side risk from operator-side risk.
- **Service-interval proximity** — `engine_hours` measured against a defined service-interval threshold; this component doubles as the trigger for the predictive-maintenance cost-avoidance feature (§7.6) — one computation feeding two features.

**Owner:** Dev (score computation — same pattern as `scoring.py`, aggregated per-machine instead of per-operator) + Ripun (endpoint) + Anamika (dashboard card/gauge, same visual language as the operator score cards). **Effort:** low-moderate — reuses the exact aggregation pattern already built for the Operator Score, applied to a different grouping key over the same dataset.

**Backing endpoints:** `GET /machines/:machineId/health` (single machine) and `GET /machines` (fleet-wide list) — see `CONTRACTS.md` §11.

### 7.5 Zone-Based Asset Tracker + Compound SOS Alerting — ✅ Implemented (known data gap, see §0)

A simulated 2D site map divided into zones (e.g. "Active Work Zone," "Maintenance Bay," "Restricted Zone," "Idle Yard"), each tagged with a danger tier, with each machine's current zone tracked and rendered live. The novelty isn't the map itself — it's the **compound trigger**: a machine's health score degrading *and* the machine being in a zone where that degradation is actually dangerous. A tired machine sitting in the idle yard is a maintenance note; a tired machine in an active excavation zone is an SOS. This is the feature that most visibly demonstrates the system's core thesis — reasoning *across* signals rather than treating them independently — in a single glance: a judge sees a red dot in a restricted zone and immediately understands the system caught something a simple health gauge or a simple map alone would each miss.

**Directly consumes §7.4's Machine Health Score** — this is not an independent subsystem, it's the natural next consumer of that score. Build order: must come after §7.4 is working, never before.

**Data requirements (genuinely new, unlike §7.1–7.4 which reuse existing fields):**
- `current_zone` per session in `operations.csv` (fixed set of 4-5 zones)
- A small static zone → danger-tier config (not per-row data), e.g. `{"Restricted Zone": "high", "Active Work Zone": "medium", "Maintenance Bay": "low", "Idle Yard": "low"}`
- Optional `x, y` simulated coordinates if the map should show actual positions within a zone, not just zone membership (nice-to-have, not required for the compound-trigger logic to work)

**Compound rule:** `if machineHealthScore < CRITICAL_THRESHOLD AND currentZone.dangerTier == "high": trigger SOS alert`. This is one new rule added to the existing rule engine (same pattern as seatbelt/proximity/idling), not new infrastructure — but it depends on §7.4's score being computed first.

**SOS alert should be visually distinct** from a normal safety alert (different color/icon, pulsing marker on the map, dedicated banner) since it's a compound, higher-severity condition.

**Honesty note for the panel:** since the app is standalone/local (§2), "real-time" here means the dashboard polls/refreshes machine position + health together on a short interval, not a literal live GPS feed. State this plainly as a deliberate simulation choice, not a limitation being hidden.

**Owner:** Dev (add `current_zone` to the generator, build the compound SOS trigger logic — mirrors the pattern of `alert_reasoning.py`) + Ripun (endpoint) + Anamika (the 2D canvas/map component — this is genuinely new, non-trivial frontend work compared to the list-based views already built, budget accordingly). **Effort:** moderate — the backend logic is cheap once §7.4 exists, but the frontend map view is a real lift, not a small addition.

**Backing endpoint:** `GET /machines/:machineId/zone-status` (or folded into §7.4's `GET /machines/:machineId/health` response as an additional field — decide at implementation time based on how Anamika wants to consume it) — not yet formally specified in `CONTRACTS.md`, add before building against it.

### 7.6 Cost/ROI Translation + Fleet-Level Rollup — ✅ Implemented

Translates the system's existing detection into a language a fleet manager or the panel actually responds to: cost. Reuses data already being collected — no new instrumentation, purely a computation/aggregation layer on top of what already exists.

**Three components:**
1. **Cost translation** — idling time, task overruns, and safety incidents converted into dollar terms: a fuel-cost-per-idle-minute multiplier on `fuel_used_l`/`idling_time_min`, a delay-cost-per-overrun-minute multiplier on task-time overrun data. Pure arithmetic on existing fields, no new model.
2. **Fleet/site-level rollup** — aggregates the per-operator (§7.3) and per-machine (§7.4) views into a supervisor-facing dashboard: total idle-cost across the site, which operators/machines carry the highest risk, total overrun-hours this week. Turns a single-cab tool into operations intelligence — reuses the exact aggregation pattern already built for Operator/Machine scores, just summed across all operators/machines instead of returned per-entity.
3. **Predictive-maintenance cost avoidance** — extends §7.4's service-interval-proximity component with a dollar estimate: "flagging this now avoids an estimated $X unplanned-downtime cost." Directly ties the system to what the problem statement's own background section identifies as the industry's largest cost driver (§2).

**Why this matters more than it sounds:** every other differentiator so far answers "what's wrong." This is the one that answers "so what" — which is the question an industrial client actually asks after a demo. Deliberately built as direct, auditable arithmetic (not AI) so a dollar figure shown to a supervisor is always defensible on the spot, not another model's guess.

**Owner:** whoever's least loaded once §7.1–7.5 are stable — likely Ripun (aggregation/endpoint logic, low complexity) + Anamika (supervisor rollup view). **Effort:** low for cost translation and predictive-maintenance flag (pure multipliers), moderate for the fleet rollup view (new aggregation endpoint + new UI, but no new data or ML).

**Backing endpoints:** not yet formally specified in `CONTRACTS.md` — suggested: `GET /fleet/cost-summary` (site-wide rollup) and a `costEstimate` field added to §7.4's machine health response (predictive-maintenance dollar figure). Add to `CONTRACTS.md` before building against it.

---

## 7.7 Production Hardening (Post-Differentiators — See `CONTRACTS.md` §8) — ✅ Fully Implemented

All 9 items below are done and verified — see `CONTRACTS.md` §8 for per-item implementation detail. This pushed the build from "working demo" toward "something that could plausibly run for real" — this is what separates a hackathon checklist from something Caterpillar mentors would actually see as a credible engineering pattern, not just a feature list:

- **Write endpoints**: `PATCH /tasks/:taskId` (status updates), `POST /incidents` (manual incident logging — this one directly closes a gap against the problem statement's own "incident logging" outcome, which until now only had system-generated alerts, not operator-entered ones).
- **Input validation** on every write (reject malformed/unknown-enum data with `400` before it reaches business logic).
- **Pagination** on list endpoints so a growing dataset doesn't dump hundreds of rows per response.
- **Standard error shape** shared across NestJS and FastAPI, so the frontend has one error-handling path.
- **Caching** on the expensive per-operator rollup (§7.3's backing endpoint).
- **Circuit breaker** on the NestJS→Python call, using a `/health` check, instead of waiting out a timeout on every prediction.
- **Structured logging** of every rule trigger and every ML prediction (input + output) — this becomes a real audit trail, giving the "explainable, not black-box" narrative (§2) actual evidence rather than just a claim.
- **API versioning** (`/api/v1/...`) — ties into the "mission-oriented, could extend to fleet-wide" framing already in §2.
- **Basic write-endpoint auth** and **idempotent retries** on `POST /incidents` — lowest priority, cut first if time is short.

Full endpoint shapes, priority order, and detail: `CONTRACTS.md` §6–§10 (new endpoints) and §8 (hardening checklist). Do not start this before §7's differentiators — this is depth on top of features that already exist, not a replacement for having the features.

---

## 5. Team Workflow

### 5.1 Roles (Confirmed)

- **Anamika — Frontend/Dashboard**: React/Next.js UI for all 5 outcomes
- **Ripun — Backend/Rules**: NestJS services, rule engine, API, persistence, integration of the Python model endpoint
- **Dev — Data + Training Hub + Integration**: synthetic dataset generation, the task-time regression model (Python/scikit-learn), training-hub content, and pairing on final integration + demo/panel narrative

Full phase-by-phase breakdown: see [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md).

### 5.2 Panel Review Prep (Two Checkpoints During the Event)

The panel will ask **how/when/why** questions on progress — treat both checkpoints as short pitch rehearsals, not just status updates.

For each checkpoint, be ready with:
- **What's working right now** (demo it live if possible, even if incomplete)
- **Why this architecture** (rule-based/explainable safety logic vs. black-box ML — this is a genuine differentiator, state it plainly)
- **What's next** (honest, specific — shows planning, not panic)
- **The "mission-oriented" framing** (§2) — standalone today, architected so the same rule engine and data schema could extend to fleet-wide monitoring later

Keep a visible, updated task/progress board (physical or digital) so panel questions about "where are you" have an immediate visual answer rather than a verbal reconstruction.

### 5.3 Branching & Integration

**Branch structure:**
- `main` — always demo-able. Nothing merges here unless it's tested and working.
- `frontend` (Anamika), `backend` (Ripun), `data` (Dev) — one branch per person, matching §5.1 roles. Short-lived sub-branches are fine if someone splits their own work further, but don't let any branch live more than a few hours without merging back.

**Contract-first, not integration-last:**
- Before writing feature code, commit a `CONTRACTS.md` (or shared TypeScript interfaces / JSON schema file) to `main` defining the NestJS↔frontend API shapes (and the dataset schema from §3). This is what lets three people work in parallel without colliding later — branches diverge safely when the interface between them is fixed, and collide badly when someone silently reshapes a response mid-hackathon.
- The backend owner stubs fake API responses (hardcoded JSON matching the contract) so frontend work isn't blocked waiting on real rule-engine/data-layer completion. This decouples each branch's progress from the others' actual completion time.

**Integration checkpoints on a clock, not ad hoc:**
- Merge to `main` after every meaningful deliverable, not just once at the end — catching a broken contract early costs minutes; catching it late costs your buffer time.
- Every 4-6 hours, everyone stops and does a real merge-and-run-together pass, even if a piece is incomplete.
- One teammate owns watching `main` and unblocking merge conflicts — otherwise everyone stays heads-down in their own area and integration silently rots until it's too late to fix cheaply.

**Hygiene:**
- Small, frequent commits with clear messages — debugging a broken demo late at night is much harder against a single giant commit.

**Daily workflow (each person, on their own branch):**
```
git checkout <your-branch>
git pull origin <your-branch>          # get your own latest
# ...do work...
git add .
git commit -m "clear message"
git push origin <your-branch>
```

**Merging to `main` (every ~1hr, per person):**
```
git checkout main
git pull origin main
git merge <your-branch>
# fix conflicts if any, then:
git push origin main
```

**Then sync your branch with the updated `main`:**
```
git checkout <your-branch>
git merge main
git push origin <your-branch>
```

### 5.4 Python ML Microservice (§2.1 — Locked, Not Contingent)

Per §2.1, the task-time model is a locked part of the build, not a maybe:
- Keep it to **one Python/FastAPI service** with a single, narrow endpoint (`POST /predict-task-time`, see `CONTRACTS.md`), not a sprawling parallel backend.
- Ripun owns the FastAPI wrapper and the NestJS↔Python integration (see `EXECUTION_PLAN.md` for the reasoning — this was reassigned from Dev to avoid overloading him); Dev owns training and validating the model itself, handing off the model file to Ripun mid-build.
- Request/response JSON schema is locked in `CONTRACTS.md` before either side writes code against it.
- Fixed local ports for each service (`CONTRACTS.md`), and a single command to boot both together (a root script with `concurrently`, or `docker-compose up`).
- The frontend talks only to NestJS; NestJS talks to Python server-to-server — so CORS never needs to be configured on the Python side.
- NestJS treats the Python call as fallible: timeout + graceful degradation to a weighted-average fallback (see `CONTRACTS.md`'s `source` field) rather than letting a Python-side failure take down the whole request.

---

## 6. Pre-Hackathon / Setup Checklist

### 6.1 Core Runtimes
- **Node.js** (v20 LTS or later) — for frontend (React/Next.js) and NestJS backend. Download: nodejs.org
- **Python** (3.10–3.12) — for the task-time model service (§2.1/§5.4). Download: python.org
- **Git** — confirm with `git --version`.
- **npm/yarn/pnpm** — pick one and stick to it across the team to avoid lockfile conflicts.

### 6.2 Frontend Setup
- Scaffold a Next.js app in advance: `npx create-next-app@latest` (TypeScript + Tailwind CSS)
- Install a charting library ahead of time if the dashboard needs trend visuals: `npm install recharts`
- Optional UI component library for speed: `npm install @radix-ui/react-*` or just use Tailwind utility classes directly

### 6.3 Backend Setup
- **NestJS**: `npm install -g @nestjs/cli` and scaffold a project in advance. Owns: REST/WebSocket API for the dashboard, rule engine (safety, idling), the outbound call to the Python `/predict-task-time` endpoint (§5.4), and — only as an optional stretch, see §2.1 — a direct LLM conversational layer.
- **FastAPI** (Python): single `/predict-task-time` endpoint (§5.4) — `pip install fastapi uvicorn scikit-learn pandas`.
- Local persistence via SQLite or structured JSON/CSV files — no need for a full external database under a 24-hour clock.
- Decide local port and folder structure as a team before the event — see `CONTRACTS.md` for the agreed ports.

### 6.4 LLM API Access (only for the optional conversational stretch in §2.1 — not required for the core build; set up in advance regardless, since it's cheap insurance)
- **OpenAI API key** (GPT-4o-mini or similar cost-effective model) — sign up at platform.openai.com, generate an API key, add a small amount of credit
- **Alternative/backup**: Google Gemini API (generous free tier — aistudio.google.com)
- Test the API key works with a simple curl/request **before** the hackathon
- Store keys in a `.env` file locally, never commit to a shared repo (add `.env` to `.gitignore` immediately)

### 6.5 Development Tools
- **VS Code** (or preferred IDE) with extensions: ESLint/Prettier, Tailwind CSS IntelliSense
- **Postman** or **Thunder Client** — for testing backend API endpoints independently before frontend integration
- **GitHub repo created in advance** — initialize the repo, add `.gitignore`, invite all 3 teammates as collaborators, agree on branch strategy beforehand

### 6.6 Demo Day Logistics
- Fully charged laptops + backup charger/power bank
- Mobile hotspot as backup internet (only strictly needed if the LLM contingency is in play; otherwise the app is standalone)
- A pre-recorded backup demo video/GIF of the working system, in case live demo fails during presentation

### 6.7 Pre-Event Team Sync
- Agree on: repo structure, the frontend↔backend API contract, port assignments, and API key sharing method (e.g., a shared password manager entry, not pasted in plain chat)
- Assign ownership per §5.1 once teammates arrive
- Do one dry-run "hello world" test of the chain (frontend → NestJS → response displayed) together before the hackathon starts, so integration issues surface early
