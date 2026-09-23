import { Controller, Get } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, timeout, of } from 'rxjs';

const ML_SERVICE_HEALTH_URL = 'http://localhost:8001/health';
const HEALTH_CHECK_TIMEOUT_MS = 1000;

/**
 * CONTRACTS.md §10: service health check. Pings the Python ml-service with
 * a short timeout and reports whether it's reachable — the signal §8.5's
 * circuit breaker (see prediction.controller.ts) uses to skip straight to
 * fallback instead of waiting out a timeout on every prediction request.
 */
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly httpService: HttpService) {}

  @Get()
  async check() {
    const pythonServiceReachable = await firstValueFrom(
      this.httpService.get(ML_SERVICE_HEALTH_URL).pipe(
        timeout(HEALTH_CHECK_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
    ).then((res) => res !== null);

    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      pythonServiceReachable,
    };
  }
}
