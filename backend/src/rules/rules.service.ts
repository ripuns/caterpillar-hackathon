import { Injectable } from '@nestjs/common';
import { OperationRow } from '../data/data-loader.service';

/**
 * Finalized thresholds per CONTRACTS.md "Thresholds (FINALIZED)" section.
 * Must stay identical to data-ml/thresholds.py's constants of the same name.
 */
export const IDLING_THRESHOLD_MIN = 45;
export const PROXIMITY_THRESHOLD_M = 3;
export const UNSAFE_PATTERN_ALERT_COUNT = 3;

export interface SafetyAlert {
  alertId: string;
  machineId: string;
  operatorId: string;
  timestamp: string;
  type: 'seatbelt' | 'proximity';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface BehaviorFlag {
  flagId: string;
  machineId: string;
  operatorId: string;
  timestamp: string;
  type: 'excessive_idling' | 'unsafe_pattern';
  value: number;
  threshold: number;
  message: string;
}

@Injectable()
export class RulesService {
  checkSeatbelt(row: OperationRow): boolean {
    return row.seatbeltStatus === 'Unfastened';
  }

  checkProximity(row: OperationRow): boolean {
    return row.distanceToNearestObjectM < PROXIMITY_THRESHOLD_M;
  }

  checkIdling(row: OperationRow): boolean {
    return row.idlingTimeMin > IDLING_THRESHOLD_MIN;
  }

  computeSafetyAlerts(operations: OperationRow[]): SafetyAlert[] {
    const alerts: SafetyAlert[] = [];
    let counter = 1;

    for (const row of operations) {
      if (this.checkSeatbelt(row)) {
        alerts.push({
          alertId: `A${String(counter++).padStart(3, '0')}`,
          machineId: row.machineId,
          operatorId: row.operatorId,
          timestamp: row.timestamp,
          type: 'seatbelt',
          message: 'Seatbelt unfastened while machine active',
          severity: 'high',
        });
      }
      if (this.checkProximity(row)) {
        alerts.push({
          alertId: `A${String(counter++).padStart(3, '0')}`,
          machineId: row.machineId,
          operatorId: row.operatorId,
          timestamp: row.timestamp,
          type: 'proximity',
          message: `Distance to nearest object ${row.distanceToNearestObjectM}m is below ${PROXIMITY_THRESHOLD_M}m safe threshold`,
          severity: 'medium',
        });
      }
    }

    return alerts;
  }

  computeBehaviorFlags(operations: OperationRow[]): BehaviorFlag[] {
    const flags: BehaviorFlag[] = [];
    let counter = 1;

    for (const row of operations) {
      if (this.checkIdling(row)) {
        flags.push({
          flagId: `F${String(counter++).padStart(3, '0')}`,
          machineId: row.machineId,
          operatorId: row.operatorId,
          timestamp: row.timestamp,
          type: 'excessive_idling',
          value: row.idlingTimeMin,
          threshold: IDLING_THRESHOLD_MIN,
          message: `Idling time ${row.idlingTimeMin} min exceeds ${IDLING_THRESHOLD_MIN} min threshold`,
        });
      }
    }

    const alertCountByOperator = new Map<string, number>();
    for (const row of operations) {
      if (this.checkSeatbelt(row) || this.checkProximity(row)) {
        alertCountByOperator.set(
          row.operatorId,
          (alertCountByOperator.get(row.operatorId) ?? 0) + 1,
        );
      }
    }

    for (const [operatorId, count] of alertCountByOperator) {
      if (count >= UNSAFE_PATTERN_ALERT_COUNT) {
        const lastRowForOperator = [...operations]
          .reverse()
          .find((r) => r.operatorId === operatorId);
        flags.push({
          flagId: `F${String(counter++).padStart(3, '0')}`,
          machineId: lastRowForOperator?.machineId ?? '',
          operatorId,
          timestamp: lastRowForOperator?.timestamp ?? '',
          type: 'unsafe_pattern',
          value: count,
          threshold: UNSAFE_PATTERN_ALERT_COUNT,
          message: `Operator has ${count} safety alerts, meeting or exceeding the unsafe-pattern threshold of ${UNSAFE_PATTERN_ALERT_COUNT}`,
        });
      }
    }

    return flags;
  }
}
