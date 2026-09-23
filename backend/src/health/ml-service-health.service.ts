import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, timeout, of } from 'rxjs';

const ML_SERVICE_HEALTH_URL = 'http://localhost:8001/health';
const HEALTH_CHECK_TIMEOUT_MS = 1000;
const REFRESH_INTERVAL_MS = 10_000;

/**
 * CONTRACTS.md §8.5: circuit breaker for the Python ml-service. Keeps a
 * cached reachability flag, refreshed on an interval, so prediction.controller.ts
 * can skip straight to fallback when the service is known-down instead of
 * waiting out a timeout on every single request.
 */
@Injectable()
export class MlServiceHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MlServiceHealthService.name);
  private reachable = true; // optimistic default until the first check runs
  private intervalHandle: NodeJS.Timeout;

  constructor(private readonly httpService: HttpService) {}

  onModuleInit() {
    void this.refresh();
    this.intervalHandle = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.intervalHandle);
  }

  isReachable(): boolean {
    return this.reachable;
  }

  async refresh(): Promise<boolean> {
    const result = await firstValueFrom(
      this.httpService.get(ML_SERVICE_HEALTH_URL).pipe(
        timeout(HEALTH_CHECK_TIMEOUT_MS),
        catchError(() => of(null)),
      ),
    ).then((res) => res !== null);

    if (result !== this.reachable) {
      this.logger.log(`ml-service reachability changed: ${this.reachable} -> ${result}`);
    }
    this.reachable = result;
    return result;
  }
}
