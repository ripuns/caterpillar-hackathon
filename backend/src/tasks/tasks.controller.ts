import { Controller, Get } from '@nestjs/common';
import { DataLoaderService } from '../data/data-loader.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly dataLoader: DataLoaderService) {}

  @Get()
  findAll() {
    // tasks.csv has no scheduledStart/status columns — synthesize both,
    // per EXECUTION_PLAN.md §2.2 Step 2. All tasks default to "pending"
    // since there is no live state store yet (added in the write-endpoint
    // phase, CONTRACTS.md §6). machine_id was added to tasks.csv separately
    // (see data-ml/data/tasks.csv README) to satisfy this endpoint's shape.
    return this.dataLoader.getTasks().map((task) => ({
      taskId: task.taskId,
      taskType: task.taskType,
      machineId: task.machineId,
      operatorId: task.operatorId,
      scheduledStart: task.timestamp,
      status: 'pending' as const,
      weather: task.weather,
      estimatedTimeMin: task.estimatedTimeMin,
    }));
  }
}
