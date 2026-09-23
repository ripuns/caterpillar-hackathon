import { Injectable } from '@nestjs/common';
import { OperationRow } from '../data/data-loader.service';
import { MachineScoringService } from './machine-scoring.service';

/**
 * Port of data-ml/zone_status.py's build_zone_status() to TypeScript,
 * per CONTRACTS.md §13. Calls MachineScoringService internally rather
 * than duplicating the scoring logic (same discipline as the Python
 * reference).
 *
 * Compound SOS condition (README §7.5 / CONTRACTS.md §13), unchanged:
 *   sosActive = machineHealthScore < MACHINE_CRITICAL_SCORE_THRESHOLD (40)
 *               AND zoneDangerTier == "high"
 */

export const ZONE_DANGER_TIERS: Record<string, string> = {
  'Restricted Zone': 'high',
  'Active Work Zone': 'medium',
  'Maintenance Bay': 'low',
  'Idle Yard': 'low',
};

export const MACHINE_CRITICAL_SCORE_THRESHOLD = 40;

export interface ZoneStatus {
  machineId: string;
  currentZone: string;
  zoneDangerTier: string;
  machineHealthScore: number;
  sosActive: boolean;
  sosReason: string | null;
}

function getCurrentZone(machineId: string, operations: OperationRow[]): string | null {
  const rows = operations.filter((r) => r.machineId === machineId);
  if (rows.length === 0) return null;
  const latest = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp))[rows.length - 1];
  return latest.currentZone;
}

@Injectable()
export class ZoneStatusService {
  constructor(private readonly machineScoring: MachineScoringService) {}

  buildZoneStatus(operations: OperationRow[]): ZoneStatus[] {
    const machineIds = [...new Set(operations.map((r) => r.machineId))].sort();
    const out: ZoneStatus[] = [];

    for (const machineId of machineIds) {
      const currentZone = getCurrentZone(machineId, operations);
      if (currentZone === null || !(currentZone in ZONE_DANGER_TIERS)) {
        continue;
      }

      const zoneDangerTier = ZONE_DANGER_TIERS[currentZone];
      const machineScore = this.machineScoring.computeMachineScore(machineId, operations);

      const isCritical = machineScore.score < MACHINE_CRITICAL_SCORE_THRESHOLD;
      const isHighDanger = zoneDangerTier === 'high';
      const sosActive = isCritical && isHighDanger;
      const sosReason = sosActive
        ? `Machine health score ${machineScore.score} is below the CRITICAL threshold (${MACHINE_CRITICAL_SCORE_THRESHOLD}) while operating in a high-danger zone`
        : null;

      out.push({
        machineId,
        currentZone,
        zoneDangerTier,
        machineHealthScore: machineScore.score,
        sosActive,
        sosReason,
      });
    }

    return out;
  }
}
