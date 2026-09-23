import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

export interface OperationRow {
  timestamp: string;
  machineId: string;
  operatorId: string;
  engineHours: number;
  fuelUsedL: number;
  loadCycles: number;
  idlingTimeMin: number;
  seatbeltStatus: 'Fastened' | 'Unfastened';
  distanceToNearestObjectM: number;
  safetyAlertTriggered: 'Yes' | 'No';
  trainingCompletedRecent: 'Yes' | 'No';
}

export interface TaskRow {
  taskId: string;
  machineId: string;
  operatorId: string;
  timestamp: string;
  taskType: string;
  weather: string;
  operatorSkill: string;
  machineAgeYrs: number;
  estimatedTimeMin: number;
  actualTimeMin: number;
}

/**
 * Loads operations.csv and tasks.csv from data-ml/data/ once at startup
 * and converts snake_case CSV headers to camelCase per CONTRACTS.md's
 * API boundary mapping tables. Kept in memory for the process lifetime —
 * no re-read per request.
 */
@Injectable()
export class DataLoaderService implements OnModuleInit {
  private readonly logger = new Logger(DataLoaderService.name);
  private operations: OperationRow[] = [];
  private tasks: TaskRow[] = [];

  onModuleInit() {
    this.operations = this.loadOperations();
    this.tasks = this.loadTasks();
    this.logger.log(
      `Loaded ${this.operations.length} operation rows and ${this.tasks.length} task rows`,
    );
  }

  getOperations(): OperationRow[] {
    return this.operations;
  }

  getTasks(): TaskRow[] {
    return this.tasks;
  }

  private loadOperations(): OperationRow[] {
    const filePath = join(process.cwd(), '..', 'data-ml', 'data', 'operations.csv');
    const raw = readFileSync(filePath, 'utf-8');
    const records: Record<string, string>[] = parse(raw, {
      columns: true,
      skip_empty_lines: true,
    });
    return records.map((r) => ({
      timestamp: r.timestamp,
      machineId: r.machine_id,
      operatorId: r.operator_id,
      engineHours: Number(r.engine_hours),
      fuelUsedL: Number(r.fuel_used_l),
      loadCycles: Number(r.load_cycles),
      idlingTimeMin: Number(r.idling_time_min),
      seatbeltStatus: r.seatbelt_status as OperationRow['seatbeltStatus'],
      distanceToNearestObjectM: Number(r.distance_to_nearest_object_m),
      safetyAlertTriggered: r.safety_alert_triggered as OperationRow['safetyAlertTriggered'],
      trainingCompletedRecent: r.training_completed_recent as OperationRow['trainingCompletedRecent'],
    }));
  }

  private loadTasks(): TaskRow[] {
    const filePath = join(process.cwd(), '..', 'data-ml', 'data', 'tasks.csv');
    const raw = readFileSync(filePath, 'utf-8');
    const records: Record<string, string>[] = parse(raw, {
      columns: true,
      skip_empty_lines: true,
    });
    return records.map((r) => ({
      taskId: r.task_id,
      machineId: r.machine_id,
      operatorId: r.operator_id,
      timestamp: r.timestamp,
      taskType: r.task_type,
      weather: r.weather,
      operatorSkill: r.operator_skill,
      machineAgeYrs: Number(r.machine_age_yrs),
      estimatedTimeMin: Number(r.estimated_time_min),
      actualTimeMin: Number(r.actual_time_min),
    }));
  }
}
