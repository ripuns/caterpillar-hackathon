import { Controller, Get } from '@nestjs/common';

@Controller('behavior-flags')
export class BehaviorController {
  @Get()
  findAll() {
    return [
      {
        flagId: 'F001',
        machineId: 'M-12',
        operatorId: 'OP-04',
        timestamp: '2026-09-24T09:00:00Z',
        type: 'excessive_idling',
        value: 58,
        threshold: 45,
        message: 'Idling time 58 min exceeds 45 min threshold',
      },
    ];
  }
}
