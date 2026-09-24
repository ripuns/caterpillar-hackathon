import {
  INITIAL_TASKS,
  INITIAL_SAFETY_ALERTS,
  INITIAL_BEHAVIOR_FLAGS,
  INITIAL_TRAINING_MODULES,
  calculateTaskTimePrediction,
} from './mockData.js';

// NestJS backend runs on port 3000 with global prefix /api/v1 as per CONTRACTS.md §8.9
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:3000/api/v1';
const SHARED_API_KEY = 'dev-shared-key';
const REQUEST_TIMEOUT_MS = 3000;

/**
 * Robust fetch wrapper with timeout, pagination unwrapping, and fixture fallback
 */
async function fetchWithFallback(endpoint, options = {}, fallbackValue) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[API] Server responded with HTTP ${res.status} on ${endpoint}, falling back gracefully.`);
      return { data: fallbackValue, isMock: true, status: res.status };
    }

    let payload = await res.json();

    // §8.2 Pagination wrapper handling: if { data: [...], total, page }, unwrap cleanly
    if (payload && typeof payload === 'object' && Array.isArray(payload.data)) {
      payload = payload.data;
    }

    return { data: payload, isMock: false, status: res.status };
  } catch (err) {
    clearTimeout(timeoutId);
    return { data: fallbackValue, isMock: true, error: err.message };
  }
}

/**
 * 1. GET /api/v1/tasks - Daily Task Dashboard (§1)
 */
export async function getTasks(params = {}) {
  const query = new URLSearchParams(params).toString();
  const endpoint = query ? `/tasks?${query}` : '/tasks';
  return fetchWithFallback(endpoint, { method: 'GET' }, INITIAL_TASKS);
}

/**
 * 2. PATCH /api/v1/tasks/:taskId - Task Status Update (§6, requires x-api-key)
 */
export async function updateTaskStatus(taskId, status) {
  return fetchWithFallback(
    `/tasks/${taskId}`,
    {
      method: 'PATCH',
      headers: {
        'x-api-key': SHARED_API_KEY,
      },
      body: JSON.stringify({ status }),
    },
    { taskId, status }
  );
}

/**
 * 3. GET /api/v1/safety-alerts - Safety Alerts (§2)
 */
export async function getSafetyAlerts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const endpoint = query ? `/safety-alerts?${query}` : '/safety-alerts';
  return fetchWithFallback(endpoint, { method: 'GET' }, INITIAL_SAFETY_ALERTS);
}

/**
 * 4. POST /api/v1/incidents - Manual Incident Logging (§7, requires x-api-key)
 */
export async function logIncident(incidentData) {
  const fallback = {
    incidentId: `I-${Date.now().toString().slice(-4)}`,
    machineId: incidentData.machineId || 'M-12',
    operatorId: incidentData.operatorId || 'OP-04',
    timestamp: new Date().toISOString(),
    description: incidentData.description || 'Manual in-cab incident log',
    severity: incidentData.severity || 'medium',
    loggedBy: 'manual',
  };

  return fetchWithFallback(
    '/incidents',
    {
      method: 'POST',
      headers: {
        'x-api-key': SHARED_API_KEY,
      },
      body: JSON.stringify({
        machineId: incidentData.machineId,
        operatorId: incidentData.operatorId,
        description: incidentData.description,
        severity: incidentData.severity,
        requestId: incidentData.requestId || `req-${Date.now()}`,
      }),
    },
    fallback
  );
}

/**
 * 5. GET /api/v1/incidents - Incident List (§8)
 */
export async function getIncidents() {
  return fetchWithFallback('/incidents', { method: 'GET' }, []);
}

/**
 * 6. GET /api/v1/behavior-flags - Unusual Behavior Detection (§3)
 */
export async function getBehaviorFlags(params = {}) {
  const query = new URLSearchParams(params).toString();
  const endpoint = query ? `/behavior-flags?${query}` : '/behavior-flags';
  return fetchWithFallback(endpoint, { method: 'GET' }, INITIAL_BEHAVIOR_FLAGS);
}

/**
 * 7. POST /api/v1/predict-task-time - Task Time Estimation (ML / Fallback) (§4)
 */
export async function predictTaskTime(payload) {
  const fallback = calculateTaskTimePrediction(payload);
  const res = await fetchWithFallback(
    '/predict-task-time',
    {
      method: 'POST',
      body: JSON.stringify({
        taskType: payload.taskType,
        weather: payload.weather,
        operatorSkill: payload.operatorSkill,
        machineAgeYears: Number(payload.machineAgeYears),
        estimatedTimeMin: Number(payload.estimatedTimeMin),
      }),
    },
    fallback
  );

  if (res.data) {
    const baseline = Number(payload.estimatedTimeMin);
    const predicted = Number(res.data.predictedTimeMin || fallback.predictedTimeMin);
    res.data.predictedTimeMin = predicted;
    res.data.deltaMin = Math.round((predicted - baseline) * 10) / 10;
    res.data.deltaPct = Math.round(((predicted - baseline) / baseline) * 100);
    if (!res.data.source) res.data.source = res.isMock ? 'fallback_average' : 'model';
    if (!res.data.confidence) res.data.confidence = 'medium';
  }

  return res;
}

/**
 * 8. POST /api/v1/predict-safety-risk - Composite Safety Risk Score (§4.1)
 */
export async function predictSafetyRisk(payload) {
  return fetchWithFallback(
    '/predict-safety-risk',
    {
      method: 'POST',
      body: JSON.stringify({
        seatbeltStatus: payload.seatbeltStatus,
        distanceToNearestObjectM: Number(payload.distanceToNearestObjectM),
        idlingTimeMin: Number(payload.idlingTimeMin),
      }),
    },
    {
      riskScore: payload.distanceToNearestObjectM < 3.0 || payload.seatbeltStatus === 'Unfastened' ? 0.72 : 0.18,
      riskTier: payload.distanceToNearestObjectM < 3.0 || payload.seatbeltStatus === 'Unfastened' ? 'high' : 'low',
      topFactors: [
        { factor: 'seatbeltStatus', contribution: payload.seatbeltStatus === 'Unfastened' ? 0.35 : 0.05 },
        { factor: 'distanceToNearestObjectM', contribution: payload.distanceToNearestObjectM < 3.0 ? 0.3 : 0.05 },
      ],
      source: 'fallback_unavailable',
    }
  );
}

/**
 * 9. GET /api/v1/training-hub - Training Hub (§5)
 */
export async function getTrainingModules() {
  return fetchWithFallback('/training-hub', { method: 'GET' }, INITIAL_TRAINING_MODULES);
}

/**
 * 10. GET /api/v1/operators/:operatorId/summary - Cross-Feature Synthesis (§9)
 */
export async function getOperatorSummary(operatorId = 'OP-04') {
  return fetchWithFallback(
    `/operators/${operatorId}/summary`,
    { method: 'GET' },
    {
      operatorId,
      operatorNeedsAttention: false,
      signalsFired: [],
      evidence: { safetyIncidentCount: 1, idlingSessionCount: 0, overrunTaskCount: 0 },
      recommendation: 'Operator performing within standard safety and efficiency baselines.',
    }
  );
}

/**
 * 11. GET /api/v1/fleet/cost-summary - Fleet Cost & ROI Rollup (§14)
 */
export async function getFleetCostSummary() {
  return fetchWithFallback('/fleet/cost-summary', { method: 'GET' }, null);
}

/**
 * 12. GET /api/v1/machines/:machineId/health & GET /api/v1/machines (§11, §12)
 */
export async function getMachineHealth(machineId = 'M-12') {
  return fetchWithFallback(`/machines/${machineId}/health`, { method: 'GET' }, null);
}

export async function getMachinesList() {
  return fetchWithFallback('/machines', { method: 'GET' }, []);
}

/**
 * Backend health probe (§10)
 */
export async function checkBackendStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      return json.status === 'ok' || res.ok;
    }
    // Fallback probe to tasks endpoint
    const res2 = await fetch(`${API_BASE}/tasks`, { signal: controller.signal });
    return res2.ok;
  } catch {
    return false;
  }
}
