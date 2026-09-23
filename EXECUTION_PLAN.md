# Execution Plan — First Review (T+0 to T+5h)

Team: **Anamika** (Frontend), **Ripun** (Backend/Rules + Model-Serving Integration), **Dev** (Data + Model Training + Training Hub).
Goal for the first review: a **working, demoable slice** — not everything, but what's shown must actually run live. See [`README.md`](./README.md) for the full problem statement and design reasoning behind these choices.

---

## Branching decision (see README §5.3 for the general rule)

**Use branches: `main`, `frontend`, `backend`, `data`.** Not single-branch, even though the work is logically separate — the risk isn't merge conflicts, it's that one person's broken/WIP commit on a shared branch blocks or corrupts what the other two are working on at any moment. With 5 hours to a live review, you can't afford someone else's half-finished commit breaking your ability to demo. Branches cost you almost nothing here since the work barely overlaps — merge to `main` every ~1 hour, not at the end.

`main` must always be in a runnable state going into the review — if something's half-done, it stays on its branch rather than breaking `main`.

---

## Hour 0 – 0:30 — Together: Lock the Contract

All three in the same room/call for this. Do not split up yet.

1. Review `CONTRACTS.md` together (already drafted — endpoint shapes, dataset schema, thresholds, ports) — adjust anything wrong, then treat it as locked.
2. Confirm ports: NestJS `3000`, Python `8001`, Next.js `3001` (or framework default).
3. Commit `CONTRACTS.md` to `main` (and log the confirmation in its Change Log table) before anyone writes feature code.

**Exit condition:** everyone can point to the same file and agree on shapes. No verbal-only agreements.

---

## Hour 0:30 – 3:00 — Parallel Build

### Anamika — Frontend
1. (0:30–1:00) Scaffold Next.js + Tailwind. Build page shells for all 5 outcomes (dashboard, safety, training hub, behavior flags, task-time) using **hardcoded mock data matching `CONTRACTS.md`** — do not wait for Ripun's real API.
2. (1:00–2:30) Build out real components: task list/cards, safety alert banners/badges, training-hub content viewer, behavior-flag list, task-time estimate display with input form (task type, weather, skill, machine age).
3. (2:30–3:00) Wire fetch calls to Ripun's endpoints using `CONTRACTS.md` shapes (against Ripun's stub responses if his real logic isn't done yet — see his stub step below).

**Deliverable by 3:00:** full UI navigable, calling real (possibly stubbed) backend endpoints, no dead mock data left in view code.

### Ripun — Backend/Rules + Model-Serving Integration
1. (0:30–1:00) Scaffold NestJS. Stand up all 5 endpoints from `CONTRACTS.md` **returning hardcoded stub JSON** immediately — unblocks Anamika right away.
2. (1:00–2:00) Replace stubs with real logic:
   - Rule engine: seatbelt, proximity, idling-threshold, unsafe-pattern rules → feeds `/safety-alerts` and `/behavior-flags`
   - `/tasks` reading from Dev's generated dataset (coordinate hand-off time with Dev)
   - `/training-hub` serving static content (coordinate content format with Dev)
3. (2:00–2:30) Build the **FastAPI wrapper skeleton** for `/predict-task-time` yourself (not Dev) — stub it to return a weighted-average estimate for now, matching `CONTRACTS.md`'s response shape. This unblocks the full chain immediately and gives you a working fallback regardless of the model's readiness.
4. (2:30–3:00) Build the NestJS→Python outbound call (timeout + graceful fallback). Once Dev hands off the validated model (~2:30, see below), drop it straight into the wrapper you already built — a swap, not a build-from-scratch.

**Deliverable by 3:00:** all endpoints live with real rule logic; task-time estimate live via your FastAPI wrapper, either the real trained model or the weighted-average fallback — never blocked.

### Dev — Data + Model Training (handoff to Ripun at ~2:30, then Training Hub)
1. (0:30–1:15) Write the synthetic dataset generator per `CONTRACTS.md`'s finalized schema: `operations.csv` (150-200 rows) and `tasks.csv` (80-120 rows), using the generation rule specified there so the ML signal is real. Output CSV, hand both files to Ripun as soon as ready — don't wait until fully polished.
2. (1:15–2:30) Train the task-time regression model (start with plain linear regression or a small decision tree — scikit-learn, few lines) on the dataset from step 1. Validate it produces sane predictions (sanity-check against the 5 known sample rows). **Hand the validated model file to Ripun at 2:30 regardless of polish** — he's already got the wrapper ready to receive it.
3. (2:30–3:00) Free to help Anamika if she's behind, otherwise produce training-hub content (recommend static e-learning-style content — a few short written/video-linked modules) — hand to Ripun/Anamika for serving.

**Deliverable by 3:00:** dataset available to Ripun, validated model handed off by 2:30 (or a documented reason it isn't, with the fallback already live), training-hub content ready if time allows.

**Why this split:** the original plan had Dev doing data-gen → train → validate → wrap-in-API → write training-hub content sequentially, solo — too much for 3 hours. Now Ripun owns both ends of the NestJS↔Python integration (he's building the NestJS side anyway) and has a working fallback in place from hour 2:00, so the 5-hour deadline never depends on Dev's model finishing on time. Dev's real bottleneck task — training and validating the model — stays focused and undistracted.

---

## Hour 3:00 – 4:00 — Integration Pass (Together)

1. Merge all three branches into `main`. Fix any contract mismatches immediately — this is expected, not a failure.
2. Run the full app end-to-end: frontend → NestJS → (rules + Python model) → back to frontend, live.
3. Fix the top 2-3 breakages only. Do not scope-creep here — if something's broken and not core, cut it (see README §4.1) rather than fixing it under time pressure.

**Exit condition:** `main` runs, all 5 outcomes are visibly present and functioning (even if some are simple).

---

## Hour 4:00 – 4:45 — Demo Prep

- Dev drafts the panel narrative: what's working, why this architecture (rule-based safety = explainable/auditable; ML task-time = genuine learned prediction, not a lookup — point at the dataset correlation as evidence), what's next.
- Anamika + Ripun do a live dry run of the actual demo flow, timed.
- Fix anything that breaks during the dry run — nothing else.

---

## Hour 4:45 – 5:00 — Buffer

Slack for whatever the dry run surfaced. If nothing's broken, polish UI copy/labels — don't add scope.

---

## Anti-patterns (don't do these under time pressure)

- Don't wait on another person's "real" implementation before starting — always build against the stubbed contract first.
- Don't let `main` go more than ~1 hour without a merge attempt — surface contract breaks early, not at hour 4.
- Don't start the optional conversational-LLM stretch (README §2.1) before the 5 core outcomes are solid and demoable.
- Don't debate architecture after Hour 0:30 — it's locked; if something's genuinely wrong, fix it fast and move on, don't relitigate.
