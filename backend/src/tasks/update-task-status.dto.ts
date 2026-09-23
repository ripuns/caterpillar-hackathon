import { IsIn } from 'class-validator';
import type { TaskStatus } from './task-status.service';

export class UpdateTaskStatusDto {
  @IsIn(['pending', 'in_progress', 'completed'])
  status: TaskStatus;
}
