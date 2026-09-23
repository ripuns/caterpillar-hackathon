import { Injectable } from '@nestjs/common';
import { OperationRow, TaskRow } from '../data/data-loader.service';
import { PROXIMITY_THRESHOLD_M, IDLING_THRESHOLD_MIN } from '../rules/rules.service';

/**
 * Port of data-ml/cross_feature.py's synthesize() to TypeScript, per
 * CONTRACTS.md §9 (updated to match Dev's actual output shape — see
 * Change Log). Thresholds match data-ml/thresholds.py exactly.
 *
 * Deliberately conjunctive (2-of-3 categories), not "any one alert fires" —
 * this is what makes it cross-feature rather than counting duplicate
 * manifestations of the same underlying event. Categories are kept
 * INDEPENDENT of each other (see data-ml/cross_feature.py's "AUDIT FIX"
 * comment): safety_alert_triggered is NOT used directly here, because that
 * column also fires on idling per the dataset's generation rule, which
 * would double-count one idling event as both a "safety" and "behavior"
 * signal.
 */

export const TASK_DELAY_THRESHOLD_PERCENT = 15;
export const TRAINING_TRIGGER_SAFETY_INCIDENT_COUNT = 2;
export const TRAINING_TRIGGER_IDLING_SESSION_COUNT = 2;
export const TRAINING_TRIGGER_OVERRUN_TASK_COUNT = 2;

type Signal = 'safety' | 'behavior' | 'task';

const MODULE_MAP: Array<{ signals: Signal[]; moduleId: string; moduleTitle: string }> = [
  { signals: ['safety', 'behavior'], moduleId: 'TH_SAFE_EFFICIENT_OPS', moduleTitle: 'Safe and Efficient Machine Operation' },
  { signals: ['safety', 'task'], moduleId: 'TH_SAFETY_UNDER_PRESSURE', moduleTitle: 'Maintaining Safety Standards Under Time Pressure' },
  { signals: ['behavior', 'task'], moduleId: 'TH_TIME_MANAGEMENT', moduleTitle: 'Task Time Management and Idle Reduction' },
  { signals: ['safety', 'behavior', 'task'], moduleId: 'TH_GENERAL_REFRESHER', moduleTitle: 'General Refresher: Safety, Efficiency and Machine Use' },
];

export interface OperatorSummary {
  operatorId: string;
  operatorNeedsAttention: boolean;
  signalsFired: Signal[];
  evidence: {
    safetyIncidentCount: number;
    idlingSessionCount: number;
    overrunTaskCount: number;
  };
  recommendation: string | null;
  recommendedModuleId: string | null;
  recommendedModuleTitle: string | null;
}

function findModuleForSignals(signalsFired: Set<Signal>): { moduleId: string; moduleTitle: string } | null {
  const exact = MODULE_MAP.find(
    (m) => m.signals.length === signalsFired.size && m.signals.every((s) => signalsFired.has(s)),
  );
  if (exact) return exact;

  const subset = MODULE_MAP.find((m) => m.signals.every((s) => signalsFired.has(s)));
  return subset ?? null;
}

@Injectable()
export class CrossFeatureService {
  synthesize(operatorId: string, operations: OperationRow[], tasks: TaskRow[]): OperatorSummary {
    const opsRows = operations.filter((r) => r.operatorId === operatorId);
    const taskRows = tasks.filter((r) => r.operatorId === operatorId);

    const safetyIncidentCount = opsRows.filter(
      (r) => r.seatbeltStatus === 'Unfastened' || r.distanceToNearestObjectM < PROXIMITY_THRESHOLD_M,
    ).length;

    const idlingSessionCount = opsRows.filter((r) => r.idlingTimeMin > IDLING_THRESHOLD_MIN).length;

    const overrunTaskCount = taskRows.filter((t) => {
      if (t.estimatedTimeMin === 0) return false;
      const overrunPct = ((t.actualTimeMin - t.estimatedTimeMin) / t.estimatedTimeMin) * 100;
      return overrunPct >= TASK_DELAY_THRESHOLD_PERCENT;
    }).length;

    const signalsFired = new Set<Signal>();
    if (safetyIncidentCount >= TRAINING_TRIGGER_SAFETY_INCIDENT_COUNT) signalsFired.add('safety');
    if (idlingSessionCount >= TRAINING_TRIGGER_IDLING_SESSION_COUNT) signalsFired.add('behavior');
    if (overrunTaskCount >= TRAINING_TRIGGER_OVERRUN_TASK_COUNT) signalsFired.add('task');

    const operatorNeedsAttention = signalsFired.size >= 2;

    let recommendation: string | null = null;
    let recommendedModuleId: string | null = null;
    let recommendedModuleTitle: string | null = null;

    if (operatorNeedsAttention) {
      const match = findModuleForSignals(signalsFired);
      if (match) {
        recommendedModuleId = match.moduleId;
        recommendedModuleTitle = match.moduleTitle;
        recommendation = `Consider refresher training: ${match.moduleTitle}.`;
      }
    }

    return {
      operatorId,
      operatorNeedsAttention,
      signalsFired: [...signalsFired].sort(),
      evidence: {
        safetyIncidentCount,
        idlingSessionCount,
        overrunTaskCount,
      },
      recommendation,
      recommendedModuleId,
      recommendedModuleTitle,
    };
  }
}
