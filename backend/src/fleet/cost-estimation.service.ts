import { Injectable } from '@nestjs/common';
import { OperationRow, TaskRow } from '../data/data-loader.service';
import { MachineScoringService, SERVICE_INTERVAL_HOURS_THRESHOLD } from '../machines/machine-scoring.service';

/**
 * Illustrative cost constants for the demo (README §7.6 / CONTRACTS.md §14).
 * NOT real Caterpillar figures — grounded in plausible industry ranges so
 * the numbers are defensible if questioned, but explicitly demo assumptions,
 * same discipline as the rule thresholds in rules.service.ts. State this
 * plainly to the panel: illustrative, not sourced from CAT internal data.
 *
 * IDLE_COST_PER_MIN: heavy equipment idling burns roughly 0.5-1 gal/hr
 * diesel at ~$4/gal (~$0.03-0.06/min fuel only); real idling cost also
 * includes wear/depreciation, commonly modeled at 2-4x fuel cost alone.
 * $0.15/min is a round, defensible middle estimate covering both.
 *
 * OVERRUN_COST_PER_MIN: rough proxy for labor + equipment opportunity cost
 * of a task running over its estimate — operator time, delayed downstream
 * scheduling. $2/min ($120/hr) is a plausible blended rate for heavy
 * equipment operation, not a precise figure.
 *
 * INCIDENT_COST_ESTIMATE: flat estimate per safety incident, covering
 * investigation time, potential minor delay, and risk exposure — not
 * modeling actual injury/damage cost, which varies enormously and isn't
 * something a demo should claim to estimate.
 */
export const IDLE_COST_PER_MIN = 0.15;
export const OVERRUN_COST_PER_MIN = 2.0;
export const INCIDENT_COST_ESTIMATE = 150.0;

export interface FleetCostSummary {
  totalIdleCostEstimate: number;
  totalOverrunCostEstimate: number;
  totalIncidentCount: number;
  totalIncidentCostEstimate: number;
  topRiskOperators: Array<{ operatorId: string; estimatedCostImpact: number }>;
  topRiskMachines: Array<{ machineId: string; estimatedCostImpact: number }>;
  machinesNearingServiceInterval: Array<{
    machineId: string;
    estimatedDowntimeCostAvoided: number;
  }>;
  note: string;
}

@Injectable()
export class CostEstimationService {
  constructor(private readonly machineScoring: MachineScoringService) {}

  computeFleetSummary(operations: OperationRow[], tasks: TaskRow[]): FleetCostSummary {
    const totalIdlingMin = operations.reduce((sum, r) => sum + r.idlingTimeMin, 0);
    const totalIdleCostEstimate = Math.round(totalIdlingMin * IDLE_COST_PER_MIN * 100) / 100;

    const totalOverrunMin = tasks.reduce((sum, t) => {
      const overrun = t.actualTimeMin - t.estimatedTimeMin;
      return sum + Math.max(0, overrun);
    }, 0);
    const totalOverrunCostEstimate = Math.round(totalOverrunMin * OVERRUN_COST_PER_MIN * 100) / 100;

    const totalIncidentCount = operations.filter(
      (r) => r.seatbeltStatus === 'Unfastened' || r.distanceToNearestObjectM < 3,
    ).length;
    const totalIncidentCostEstimate = Math.round(totalIncidentCount * INCIDENT_COST_ESTIMATE * 100) / 100;

    const topRiskOperators = this.computeTopRiskOperators(operations, tasks);
    const topRiskMachines = this.computeTopRiskMachines(operations);
    const machinesNearingServiceInterval = this.computeMachinesNearingServiceInterval(operations);

    return {
      totalIdleCostEstimate,
      totalOverrunCostEstimate,
      totalIncidentCount,
      totalIncidentCostEstimate,
      topRiskOperators,
      topRiskMachines,
      machinesNearingServiceInterval,
      note: 'Cost figures are illustrative demo estimates, not sourced from real Caterpillar data.',
    };
  }

  private computeTopRiskMachines(
    operations: OperationRow[],
  ): Array<{ machineId: string; estimatedCostImpact: number }> {
    const scores = this.machineScoring.computeAllMachineScores(operations);

    return scores
      .map((s) => ({
        machineId: s.machineId,
        // Lower score = higher risk. Inverted onto the same cost-impact
        // framing as topRiskOperators so both lists sort descending by
        // "how much attention this needs."
        estimatedCostImpact: Math.round((100 - s.score) * 10) / 10,
      }))
      .sort((a, b) => b.estimatedCostImpact - a.estimatedCostImpact)
      .slice(0, 5)
      .filter((m) => m.estimatedCostImpact > 0);
  }

  private computeMachinesNearingServiceInterval(
    operations: OperationRow[],
  ): Array<{ machineId: string; estimatedDowntimeCostAvoided: number }> {
    const machineIds = [...new Set(operations.map((r) => r.machineId))].sort();

    return machineIds
      .map((machineId) => {
        const rows = operations.filter((r) => r.machineId === machineId);
        const latest = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp))[rows.length - 1];
        const hoursIntoInterval = latest.engineHours % SERVICE_INTERVAL_HOURS_THRESHOLD;
        const hoursRemaining = SERVICE_INTERVAL_HOURS_THRESHOLD - hoursIntoInterval;
        return { machineId, hoursRemaining };
      })
      .filter((m) => m.hoursRemaining <= 50) // within 50 engine hours of the simulated interval
      .sort((a, b) => a.hoursRemaining - b.hoursRemaining)
      .map((m) => ({
        machineId: m.machineId,
        // Illustrative avoided-downtime estimate: catching service proactively
        // vs. a reactive breakdown, same order of magnitude as the incident
        // cost estimate below — not a real CAT figure.
        estimatedDowntimeCostAvoided: INCIDENT_COST_ESTIMATE,
      }));
  }

  private computeTopRiskOperators(
    operations: OperationRow[],
    tasks: TaskRow[],
  ): Array<{ operatorId: string; estimatedCostImpact: number }> {
    const operatorIds = new Set([
      ...operations.map((r) => r.operatorId),
      ...tasks.map((r) => r.operatorId),
    ]);

    const impacts = [...operatorIds].map((operatorId) => {
      const opRows = operations.filter((r) => r.operatorId === operatorId);
      const taskRows = tasks.filter((t) => t.operatorId === operatorId);

      const idleCost = opRows.reduce((sum, r) => sum + r.idlingTimeMin, 0) * IDLE_COST_PER_MIN;
      const overrunCost =
        taskRows.reduce((sum, t) => sum + Math.max(0, t.actualTimeMin - t.estimatedTimeMin), 0) *
        OVERRUN_COST_PER_MIN;
      const incidentCost =
        opRows.filter((r) => r.seatbeltStatus === 'Unfastened' || r.distanceToNearestObjectM < 3)
          .length * INCIDENT_COST_ESTIMATE;

      return {
        operatorId,
        estimatedCostImpact: Math.round((idleCost + overrunCost + incidentCost) * 100) / 100,
      };
    });

    return impacts
      .sort((a, b) => b.estimatedCostImpact - a.estimatedCostImpact)
      .slice(0, 5)
      .filter((o) => o.estimatedCostImpact > 0);
  }
}
