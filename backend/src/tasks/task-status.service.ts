import { Injectable } from '@nestjs/common';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

/**
 * In-memory status overlay for tasks.csv, which has no status column of its
 * own. tasks.csv is treated as read-only source data; status changes made
 * via PATCH /tasks/:taskId (CONTRACTS.md §6) are tracked here instead of
 * mutating the CSV, and default to "pending" for any task not yet touched.
 */
@Injectable()
export class TaskStatusService {
  private statusByTaskId = new Map<string, TaskStatus>();

  get(taskId: string): TaskStatus {
    return this.statusByTaskId.get(taskId) ?? 'pending';
  }

  set(taskId: string, status: TaskStatus): void {
    this.statusByTaskId.set(taskId, status);
  }
}
