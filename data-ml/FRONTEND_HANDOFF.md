# Frontend Handoff — Data/ML Layer → Anamika

Everything below is data Dev's layer produces that's relevant to the
frontend. No endpoints are wired up on the backend yet for most of these —
this documents the JSON shape so you know what to build UI for once Ripun
exposes them (or ask him to prioritize a specific one first).

## 1. Operator Performance Score

One object per operator (15 total). Good fit for an operator detail page
or a small card on the dashboard.

```json
{
  "operatorId": "OP-01",
  "score": 96,
  "status": "EXCELLENT",
  "componentScores": {
    "safetyCompliance": 36.5,
    "taskPerformance": 29.8,
    "machineUseBehavior": 20.0,
    "trainingStatus": 10
  },
  "contributingFactors": [
    "2 session(s) with proximity below 3.0m",
    "0% average task-time overrun across 14 tasks",
    "no excessive-idling sessions on record",
    "training completed recently"
  ],
  "sessionsAnalyzed": 34,
  "tasksAnalyzed": 14
}
```

**Score status** — suggested color coding: `EXCELLENT` green, `GOOD` blue,
`NEEDS_ATTENTION` orange, `CRITICAL` red.

## 2. "Why am I being alerted?" (alert reasoning)

Per-session structured reasons behind each rule-engine trigger — this is
what §7.1 in `README.md` asks for (surface the exact rule and values in
plain language, prominently, not buried).

```json
{
  "alertType": "seatbelt",
  "severity": "high",
  "triggered": true,
  "reason": "Seatbelt unfastened while machine active",
  "observedValue": "Unfastened",
  "threshold": null
}
```

For threshold-based alerts (idling, proximity), `observedValue` and
`threshold` are both populated numerically so you can render something
like `"58 min / 45 min threshold"` directly from the data, no hardcoded
copy needed.

## 3. Cross-feature insight ("this operator needs attention")

```json
{
  "operatorId": "OP-06",
  "operatorNeedsAttention": true,
  "signalsFired": ["behavior", "safety"],
  "evidence": {
    "safetyIncidentCount": 2,
    "idlingSessionCount": 25,
    "overrunTaskCount": 0
  },
  "recommendation": "Consider refresher training: Safe and Efficient Machine Operation.",
  "recommendedModuleId": "TH_SAFE_EFFICIENT_OPS",
  "recommendedModuleTitle": "Safe and Efficient Machine Operation"
}
```

Suggested treatment (per `EXECUTION_PLAN.md` §6.3/§7 for the operator
summary page): when `operatorNeedsAttention` is `true`, show a visible
banner with `recommendation`, linking into the training hub filtered or
scrolled to `recommendedModuleId`.

## 4. Training recommendation

Comes bundled inside the cross-feature object above (`recommendation`,
`recommendedModuleId`, `recommendedModuleTitle`) — not a separate endpoint.
`recommendedModuleId` is `null` when `operatorNeedsAttention` is `false`.

## 5. What-if task-time prediction

Already covered by the existing task-time form (`app/task-time/page.tsx`
per `EXECUTION_PLAN.md` §2.1 Step 3) — no new UI needed, same
`POST /predict-task-time` request/response shape as `CONTRACTS.md` §4:

```json
// request
{
  "taskType": "Material Loading",
  "weather": "Cloudy",
  "operatorSkill": "Beginner",
  "machineAgeYears": 3,
  "estimatedTimeMin": 30
}
```

```json
// response
{
  "predictedTimeMin": 41.5,
  "source": "model",
  "confidence": "medium"
}
```

One UI note: `confidence` is a fixed label (`"medium"` for a real model
prediction, `"low"` for the fallback), not a statistical confidence
interval — safe to show as a small badge, but don't imply a probability
(e.g. avoid phrasing like "87% confident").

## 6. Operator score vs. prediction confidence — different UI elements

Don't render these as the same kind of thing:

- **Operator Performance Score** (`score`/`status`) — describes one
  operator's overall historical behavior, changes slowly over many
  sessions/tasks. Good for a profile/summary view.
- **Prediction `confidence`** — describes one single task-time prediction,
  a fixed `low`/`medium` label per request. Good for a small inline badge
  next to the predicted time, not a standalone page element.

## 7. Not yet live endpoints

None of §1–4 above are wired to a live NestJS endpoint yet as of this
handoff — the data exists as generated JSON in `data-ml/outputs/`. Confirm
with Ripun which of these he's exposing first (the operator summary
endpoint, `GET /operators/:operatorId/summary`, is the one already named
in `CONTRACTS.md` §9 and is the natural place for #1 and #3 to be served
together).
