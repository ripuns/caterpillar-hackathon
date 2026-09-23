import { Controller, Get } from '@nestjs/common';

@Controller('safety-alerts')
export class SafetyController {
  @Get()
  findAll() {
    return [
      {
        alertId: 'A001',
        machineId: 'M-12',
        operatorId: 'OP-04',
        timestamp: '2026-09-24T08:15:00Z',
        type: 'seatbelt',
        message: 'Seatbelt unfastened while machine active',
        severity: 'high',
      },
    ];
  }
}
