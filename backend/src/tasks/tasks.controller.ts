import { Body, Controller, Get, NotFoundException, Param, Patch } from '@nestjs/common';
import { DataLoaderService } from '../data/data-loader.service';
import { TaskStatusService } from './task-status.service';
import { UpdateTaskStatusDto } from './update-task-status.dto';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly taskStatus: TaskStatusService,
  ) {}

  @Get()
  findAll() {
    // tasks.csv has no scheduledStart column — synthesize it from timestamp,
    // per EXECUTION_PLAN.md §2.2 Step 2. status comes from the in-memory
    // overlay (TaskStatusService), defaulting to "pending" until changed via
    // PATCH /tasks/:taskId (CONTRACTS.md §6). machine_id was added to
    // tasks.csv separately (see data-ml/data/tasks.csv README) to satisfy
    // this endpoint's shape.
    return this.dataLoader.getTasks().map((task) => ({
      taskId: task.taskId,
      taskType: task.taskType,
      machineId: task.machineId,
      operatorId: task.operatorId,
      scheduledStart: task.timestamp,
      status: this.taskStatus.get(task.taskId),
      weather: task.weather,
      estimatedTimeMin: task.estimatedTimeMin,
    }));
  }

  @Patch(':taskId')
  updateStatus(@Param('taskId') taskId: string, @Body() dto: UpdateTaskStatusDto) {
    const task = this.dataLoader.getTasks().find((t) => t.taskId === taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} does not exist`);
    }

    this.taskStatus.set(taskId, dto.status);

    return {
      taskId: task.taskId,
      taskType: task.taskType,
      machineId: task.machineId,
      operatorId: task.operatorId,
      scheduledStart: task.timestamp,
      status: dto.status,
      weather: task.weather,
      estimatedTimeMin: task.estimatedTimeMin,
    };
  }
}
