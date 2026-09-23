import { Controller, Get } from '@nestjs/common';
import { MlServiceHealthService } from './ml-service-health.service';

/**
 * CONTRACTS.md §10: service health check. Reports NestJS's own status plus
 * MlServiceHealthService's cached reachability signal (refreshed on an
 * interval, not re-checked per request — see that service for the circuit
 * breaker logic §8.5 depends on).
 */
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly mlServiceHealth: MlServiceHealthService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      pythonServiceReachable: this.mlServiceHealth.isReachable(),
    };
  }
}
