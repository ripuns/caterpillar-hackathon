import { Injectable } from '@nestjs/common';
import { OperationRow } from '../data/data-loader.service';
import { statusForScore } from './score-status';
import { PROXIMITY_THRESHOLD_M, IDLING_THRESHOLD_MIN } from '../rules/rules.service';

/**
 * Port of data-ml/machine_scoring.py's compute_machine_score() to
 * TypeScript, per CONTRACTS.md §11/§12. Weighted, explainable, 0-100
 * score (NOT a model) grouped by machineId, sourced entirely from
 * operations.csv — a machine has no task history, so tasks.csv is not
 * used here (unlike the operator score).
 *
 * Weights and formulas match data-ml/thresholds.py's
 * MACHINE_SCORE_WEIGHTS exactly.
 */

export const MACHINE_SCORE_WEIGHTS = {
  wearUsageLoad: 25,
  fuelEfficiencyDrift: 20,
  idlingBurden: 15,
  incidentAssociation: 30,
  serviceIntervalProximity: 10,
};

export const SERVICE_INTERVAL_HOURS_THRESHOLD = 500.0;

const ENGINE_HOURS_CEILING = 5000.0;
const LOAD_CYCLES_CEILING = 100.0;

export interface MachineScore {
  machineId: string;
  score: number;
  status: string;
  componentScores: {
    wearUsageLoad: number;
    fuelEfficiencyDrift: number;
    idlingBurden: number;
    incidentAssociation: number;
    serviceIntervalProximity: number;
  };
  contributingFactors: string[];
  sessionsAnalyzed: number;
}

function latestRow(rows: OperationRow[]): OperationRow {
  return [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp))[rows.length - 1];
}

function wearUsageLoadScore(rows: OperationRow[]): { score: number; reasons: string[] } {
  const weight = MACHINE_SCORE_WEIGHTS.wearUsageLoad;
  if (rows.length === 0) return { score: weight, reasons: [] };

  const latest = latestRow(rows);
  const engineHoursRatio = Math.min(1, Math.max(0, latest.engineHours / ENGINE_HOURS_CEILING));
  const meanLoadCycles = rows.reduce((s, r) => s + r.loadCycles, 0) / rows.length;
  const loadCyclesRatio = Math.min(1, Math.max(0, meanLoadCycles / LOAD_CYCLES_CEILING));

  const utilization = 0.5 * engineHoursRatio + 0.5 * loadCyclesRatio;
  const score = weight * (1 - utilization);

  const reasons = [
    `engine hours ${latest.engineHours.toFixed(0)} (${(engineHoursRatio * 100).toFixed(0)}% of ${ENGINE_HOURS_CEILING.toFixed(0)}h schema ceiling)`,
    `mean load cycles ${meanLoadCycles.toFixed(1)} per session (${(loadCyclesRatio * 100).toFixed(0)}% of ${LOAD_CYCLES_CEILING.toFixed(0)}-cycle ceiling)`,
  ];
  return { score: Math.round(score * 10) / 10, reasons };
}

function fuelEfficiencyDriftScore(rows: OperationRow[]): { score: number; reasons: string[] } {
  const weight = MACHINE_SCORE_WEIGHTS.fuelEfficiencyDrift;
  if (rows.length === 0) return { score: weight, reasons: [] };

  const ordered = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const valid = ordered.filter((r) => r.loadCycles > 0);
  if (valid.length === 0) {
    return { score: weight, reasons: ['no sessions with load_cycles > 0 - fuel-efficiency drift not computable'] };
  }

  const fuelPerCycle = valid.map((r) => r.fuelUsedL / r.loadCycles);
  const current = fuelPerCycle[fuelPerCycle.length - 1];
  const historical = fuelPerCycle.slice(0, -1);

  if (historical.length === 0) {
    return { score: weight, reasons: ['insufficient historical valid-load data for this machine - no drift signal, full points'] };
  }

  const baseline = historical.reduce((s, v) => s + v, 0) / historical.length;
  if (baseline === 0) {
    return { score: weight, reasons: ['historical baseline fuel-per-cycle is 0 - no drift signal, full points'] };
  }

  const driftPct = ((current - baseline) / baseline) * 100;
  const score = weight * Math.max(0, 1 - Math.max(driftPct, 0) / 50);

  const reason =
    driftPct > 0
      ? `fuel use trending ${driftPct.toFixed(0)}% above this machine's own baseline (${baseline.toFixed(2)} L/cycle over ${historical.length} prior session(s))`
      : `fuel use at or below this machine's own baseline (${current.toFixed(2)} vs ${baseline.toFixed(2)} L/cycle over ${historical.length} prior session(s))`;

  return { score: Math.round(score * 10) / 10, reasons: [reason] };
}

function idlingBurdenScore(rows: OperationRow[]): { score: number; reasons: string[] } {
  const weight = MACHINE_SCORE_WEIGHTS.idlingBurden;
  const n = rows.length;
  if (n === 0) return { score: weight, reasons: [] };

  const idlingSessions = rows.filter((r) => r.idlingTimeMin > IDLING_THRESHOLD_MIN).length;
  const idlingRate = idlingSessions / n;
  const score = weight * Math.max(0, 1 - idlingRate * 1.5);

  const reasons =
    idlingSessions > 0
      ? [`excessive idling in ${idlingSessions} of ${n} session(s) on this machine`]
      : ['no excessive-idling sessions on record for this machine'];

  return { score: Math.round(score * 10) / 10, reasons };
}

function incidentAssociationScore(rows: OperationRow[]): { score: number; reasons: string[] } {
  const weight = MACHINE_SCORE_WEIGHTS.incidentAssociation;
  const n = rows.length;
  if (n === 0) return { score: weight, reasons: [] };

  const alertCount = rows.filter((r) => r.safetyAlertTriggered === 'Yes').length;
  const alertRate = alertCount / n;
  const proximityCount = rows.filter((r) => r.distanceToNearestObjectM < PROXIMITY_THRESHOLD_M).length;
  const proximityRate = proximityCount / n;

  const generalComponent = Math.max(0, 1 - alertRate * 1.5);
  const proximityComponent = Math.max(0, 1 - proximityRate * 1.5);
  const combined = 0.6 * generalComponent + 0.4 * proximityComponent;
  const score = weight * combined;

  const reasons = [
    proximityCount > 0
      ? `${proximityCount} proximity incident(s) recorded on this machine (below ${PROXIMITY_THRESHOLD_M.toFixed(1)}m)`
      : 'no proximity incidents recorded on this machine',
    `safety alerts triggered on ${alertCount} of ${n} session(s) on this machine`,
  ];

  return { score: Math.round(score * 10) / 10, reasons };
}

function serviceIntervalProximityScore(rows: OperationRow[]): { score: number; reasons: string[] } {
  const weight = MACHINE_SCORE_WEIGHTS.serviceIntervalProximity;
  if (rows.length === 0) return { score: weight, reasons: [] };

  const latest = latestRow(rows);
  const engineHours = latest.engineHours;

  const hoursIntoInterval = engineHours % SERVICE_INTERVAL_HOURS_THRESHOLD;
  const proximityRatio = hoursIntoInterval / SERVICE_INTERVAL_HOURS_THRESHOLD;
  const hoursRemaining = SERVICE_INTERVAL_HOURS_THRESHOLD - hoursIntoInterval;

  const score = weight * (1 - proximityRatio);

  const reasons = [
    `approaching simulated ${SERVICE_INTERVAL_HOURS_THRESHOLD.toFixed(0)}-hour service interval (est. ${hoursRemaining.toFixed(0)} engine hours remaining; not an official Caterpillar interval)`,
  ];
  return { score: Math.round(score * 10) / 10, reasons };
}

@Injectable()
export class MachineScoringService {
  computeMachineScore(machineId: string, operations: OperationRow[]): MachineScore {
    const rows = operations.filter((r) => r.machineId === machineId);

    const wear = wearUsageLoadScore(rows);
    const fuel = fuelEfficiencyDriftScore(rows);
    const idling = idlingBurdenScore(rows);
    const incident = incidentAssociationScore(rows);
    const service = serviceIntervalProximityScore(rows);

    let total = Math.round(wear.score + fuel.score + idling.score + incident.score + service.score);
    total = Math.max(0, Math.min(100, total));

    return {
      machineId,
      score: total,
      status: statusForScore(total),
      componentScores: {
        wearUsageLoad: wear.score,
        fuelEfficiencyDrift: fuel.score,
        idlingBurden: idling.score,
        incidentAssociation: incident.score,
        serviceIntervalProximity: service.score,
      },
      contributingFactors: [...wear.reasons, ...fuel.reasons, ...idling.reasons, ...incident.reasons, ...service.reasons],
      sessionsAnalyzed: rows.length,
    };
  }

  computeAllMachineScores(operations: OperationRow[]): MachineScore[] {
    const machineIds = [...new Set(operations.map((r) => r.machineId))].sort();
    return machineIds.map((id) => this.computeMachineScore(id, operations));
  }
}
