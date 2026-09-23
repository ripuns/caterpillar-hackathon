# Smart Operator Assistant for CAT Machinery
## Caterpillar Hackathon — Implementation Plan

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

*(⚠️ Note: the problem statement document was only partially photographed/reviewed at time of writing — re-check for any additional outcomes, constraints, or judging criteria once the full doc is available. Sections below reflect a working assumption made on incomplete information — see the caveat immediately below.)*

**⚠️ Open question — do not treat "no ML/LLM" as settled.** The problem statement's own framing language — "an *intelligent* assistant," "*end-to-end application*," "think beyond just a tool — make it an *intelligent companion*" — is a real signal that the panel may expect some ML/LLM element, even though the 5 listed "expected outcomes" are individually achievable with rule-based logic alone. The outcomes list may be a **floor** (minimum deliverables), not a **ceiling** (the full scope). This is a genuine ambiguity, not yet resolved. Do not finalize the "rule-based only" decision below until the full problem statement (and ideally the judging rubric, if one exists) has been read in full.

**Event format:** 24-hour build. Two panel review checkpoints during the event (panel asks how/when/why questions on progress — treat these as mini pitch rehearsals, not just status checks).

**Team:** 3 people. Role/skill mapping not finalized — **to be assigned once teammates arrive** (see §6).

---

## 2. Key Design Decisions (Working, Not Fully Locked — See §1 Caveat)

**Core logic (safety, idling, task dashboard) → rule-based, deterministic. This part is solid regardless of the ML question.**
- Nothing in the problem statement's *outcomes list* or sample dataset mandates machine learning for these specific features — they're naturally rule-shaped (thresholds, boolean checks, lookups), and building them as rules first is correct even in the "yes, add ML/LLM" scenario, because:
  1. Rule-based safety logic is explainable/auditable, which is a genuinely strong feature to keep even if an ML layer is added elsewhere — safety-critical logic staying deterministic is a defensible design choice to state to the panel, not just a shortcut.
  2. It's the fastest path to a working demo, so build it first regardless, then layer intelligence on top if the fuller problem statement calls for it.
- **Safety features → rule-based, deterministic logic.** E.g.:
  - `if seatbelt_status == "Unfastened": trigger_alert("seatbelt")`
  - `if idling_time_min > THRESHOLD: flag("excessive_idling")`
  - `if distance_to_nearest_object < SAFE_DISTANCE: trigger_alert("proximity_hazard")`
  - Rule-based logic is a *feature*, not a shortcut: it's fully explainable and auditable, which is a strong story for the panel ("every alert traces to a specific, inspectable rule — no black box").
- **Task time estimation → simple average / weighted average, or basic linear regression** over historical task data (task type, environmental conditions). Not a trained ML classifier. This is the one place a very light "smart" layer is justified, to satisfy the "intelligent companion" framing, while safety logic stays fully deterministic.
- **Unusual behavior detection → rule/threshold-based**, same pattern as safety alerts (e.g., idling time above a configured threshold, operation patterns outside a defined normal range). Not anomaly-detection ML.

**Software type: standalone, with mission-oriented design principles layered on top.**
- Runs self-contained on one machine — no live network/cloud dependency required for core function.
- But deliberately designed as if it *could* extend to fleet-wide monitoring later: realistic telemetry-like data schema, modular architecture (rules engine separable from UI, data layer separable from logic), explainable/deterministic safety logic. This is a framing choice worth stating explicitly to the panel — it signals engineering maturity beyond "just a hackathon demo."

## 2.1 If "Intelligent Companion" Means Real ML/LLM Is Expected

Plausible readings of "intelligent... end-to-end companion," roughly ordered by likelihood/effort:

1. **A conversational assistant UI** — operator can ask the system questions in natural language ("what's my next task?", "why was I flagged?") and get an answer. This is the most literal reading of "companion" and the most demo-impressive. Implementable as a thin LLM layer (OpenAI/Gemini API call) that answers *only* from the app's own structured data (tasks, alerts, logs) — a grounded-response pattern (inject the structured facts into the prompt, constrain the answer to those facts) rather than a free-form response. This is a **NestJS-side addition** (direct HTTP call to the LLM API), not a separate Python service — no ML training involved.
2. **A trained ML model somewhere in the pipeline** — e.g., task-time estimation upgraded from weighted-average to a real regression/gradient-boosted model trained on the synthetic dataset, or unusual-behavior detection upgraded from thresholds to a learned anomaly score. If required, this is a small, isolated addition: one Python service (scikit-learn), one endpoint, called from NestJS — see §5.4 for the contract-first pattern to reuse.
3. **Both** — conversational layer *and* a trained model feeding it. Highest effort; only attempt if the full problem statement explicitly asks for both and there's clearly enough team bandwidth.

**Recommended posture until the full statement is read:** build the rule-based core first (§2) so there's always a working demo, and treat the LLM conversational layer (option 1) as the **first upgrade to add** if "intelligent companion" turns out to require more than rules — it's low-effort (an API call + prompt template, hours not days), high-narrative-value ("ask your assistant" is a compelling live demo moment), and doesn't require training anything. Only reach for a trained model (option 2) if the statement or panel explicitly asks for learned/predictive behavior beyond what a weighted average or clear rule can defensibly provide.

**Action item:** as soon as the rest of the problem statement is available, re-read it specifically hunting for the words "predict," "learn," "model," "natural language," "chat," "ask," or "conversational" — those are the tells that ML/LLM is an explicit requirement rather than optional flavor text.

---

**Tech stack: NestJS backend + React/Next.js frontend.**
- No Python/ML microservice needed unless §2.1's ML contingency is triggered. Default to one backend service.
- This plays directly to the team's demonstrated NestJS speed rather than defaulting to Streamlit/Flask, which would sideline that strength and put the whole team in less-familiar territory.
- Rule-based safety logic, task dashboard, training hub content, and the simple task-time estimate can all live comfortably in NestJS services — no need for Python at all unless the team specifically wants a regression library's convenience for task-time estimation, in which case treat it as a small optional Python microservice behind one endpoint (§5.4), not a requirement.
- Local persistence: SQLite or even just structured JSON/CSV files read by NestJS, given the standalone/local nature of the app — no need for a full external database setup under a 24-hour clock.

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
| Task time estimation | Weighted average of historical task durations by `task_type` + `environmental_conditions`, or basic linear regression if time allows | Start with the average; upgrade to regression only if core features are done early |

This table is a starting draft — revise once the full problem statement and any judging rubric are available, and once the team has picked its scope cuts (see §4.1).

### 4.1 Scope Cuts for 24 Hours (Draft — Revisit at Hour 0)

Given 24 hours and 3 people:
- **Must-have (core demo):** daily task dashboard, seatbelt + proximity safety rules with visible alerts, excessive-idling detection, one training-hub format (recommend e-learning/static content), basic task-time estimate (weighted average, not regression).
- **Nice-to-have if ahead of schedule:** incident logging as a full searchable log rather than a flat list, regression-based task-time estimate, a second training-hub format, a "mission-oriented" extensibility angle made visible in the UI (e.g., a toggle showing "this scales to fleet view").
- **Cut first if behind schedule:** instructor booking / simulation modules (high effort, low payoff vs. e-learning), regression modeling, elaborate incident-log search/filter UI.

Re-confirm this list as a team once roles are assigned and the full problem statement is reviewed.

---

## 5. Team Workflow

### 5.1 Roles — TO BE ASSIGNED

Skill mapping not done yet. **Placeholder buckets:**
- **Backend/Data** — NestJS services, rule engine, dataset generation/schema
- **Frontend/Dashboard** — React/Next.js UI for the 5 outcomes
- **Integration + Demo Prep** — wiring frontend↔backend, panel-review narrative, demo script, scope-cut calls under time pressure

*Update this section once the team is present and roles are confirmed — do not guess names in advance.*

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
- One branch per teammate/area (e.g. `backend`, `frontend`, matching §5.1 roles once assigned). Short-lived sub-branches are fine if someone splits their own work further, but don't let any branch live more than a few hours without merging back.

**Contract-first, not integration-last:**
- Before writing feature code, commit a `CONTRACTS.md` (or shared TypeScript interfaces / JSON schema file) to `main` defining the NestJS↔frontend API shapes (and the dataset schema from §3). This is what lets three people work in parallel without colliding later — branches diverge safely when the interface between them is fixed, and collide badly when someone silently reshapes a response mid-hackathon.
- The backend owner stubs fake API responses (hardcoded JSON matching the contract) so frontend work isn't blocked waiting on real rule-engine/data-layer completion. This decouples each branch's progress from the others' actual completion time.

**Integration checkpoints on a clock, not ad hoc:**
- Merge to `main` after every meaningful deliverable, not just once at the end — catching a broken contract early costs minutes; catching it late costs your buffer time.
- Every 4-6 hours, everyone stops and does a real merge-and-run-together pass, even if a piece is incomplete.
- One teammate owns watching `main` and unblocking merge conflicts — otherwise everyone stays heads-down in their own area and integration silently rots until it's too late to fix cheaply.

**Hygiene:**
- Small, frequent commits with clear messages — debugging a broken demo late at night is much harder against a single giant commit.

### 5.4 If a Python ML Microservice Becomes Necessary (§2.1 Contingency)

Only if the fuller problem statement or panel feedback makes a trained model necessary:
- Keep it to **one Python/FastAPI service** with a single, narrow endpoint (e.g. `POST /predict`), not a sprawling parallel backend.
- Lock the request/response JSON schema in `CONTRACTS.md` before either side writes code against it.
- Fixed local ports for each service, and a single command to boot both together (a root script with `concurrently`, or `docker-compose up`).
- The frontend talks only to NestJS; NestJS talks to Python server-to-server — so CORS never needs to be configured on the Python side.
- NestJS treats the Python call as fallible: timeout + graceful degradation (e.g., "estimate unavailable" for that item) rather than letting a Python-side failure take down the whole request.

---

## 6. Pre-Hackathon / Setup Checklist

### 6.1 Core Runtimes
- **Node.js** (v20 LTS or later) — for frontend (React/Next.js) and NestJS backend. Download: nodejs.org
- **Python** (3.10–3.12) — only needed if the §2.1/§5.4 ML contingency is triggered. Download: python.org
- **Git** — confirm with `git --version`.
- **npm/yarn/pnpm** — pick one and stick to it across the team to avoid lockfile conflicts.

### 6.2 Frontend Setup
- Scaffold a Next.js app in advance: `npx create-next-app@latest` (TypeScript + Tailwind CSS)
- Install a charting library ahead of time if the dashboard needs trend visuals: `npm install recharts`
- Optional UI component library for speed: `npm install @radix-ui/react-*` or just use Tailwind utility classes directly

### 6.3 Backend Setup
- **NestJS**: `npm install -g @nestjs/cli` and scaffold a project in advance. Owns: REST/WebSocket API for the dashboard, rule engine (safety, idling, task-time estimate), and — if triggered — the LLM conversational layer (direct HTTP calls to OpenAI/Gemini) and/or the outbound call to a Python `/predict` endpoint.
- Local persistence via SQLite or structured JSON/CSV files — no need for a full external database under a 24-hour clock.
- Decide local port and folder structure as a team before the event.

### 6.4 LLM API Access (only if §2.1 contingency applies — set up in advance regardless, since it's cheap insurance)
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
