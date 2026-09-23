import { Controller, Get } from '@nestjs/common';

@Controller('tasks')
export class TasksController {
  @Get()
  findAll() {
    return [
      {
        taskId: 'T001',
        taskType: 'Earth Excavation',
        machineId: 'M-12',
        operatorId: 'OP-04',
        scheduledStart: '2026-09-24T08:00:00Z',
        status: 'pending',
        weather: 'Sunny',
        estimatedTimeMin: 60,
      },
    ];
  }
}
