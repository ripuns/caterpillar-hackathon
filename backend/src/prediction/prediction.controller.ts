import { Body, Controller, Logger, Post } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, timeout } from 'rxjs';
import { MlServiceHealthService } from '../health/ml-service-health.service';

const ML_SERVICE_URL = 'http://localhost:8000/predict-task-time';
const REQUEST_TIMEOUT_MS = 2000;

interface PredictTaskTimeRequest {
  taskType: string;
  weather: string;
  operatorSkill: string;
  machineAgeYears: number;
  estimatedTimeMin: number;
}

interface PredictTaskTimeResponse {
  predictedTimeMin: number;
  source: 'model' | 'fallback_average';
  confidence: 'low' | 'medium' | 'high';
}

/**
 * NestJS-side fallback, mirroring ml-service/main.py's weighted_average_fallback()
 * exactly (EXECUTION_PLAN.md §2.2 Step 3's formula) so both fallback paths agree.
 * Used only if the Python service is unreachable or times out.
 */
function weightedAverageFallback(req: PredictTaskTimeRequest): PredictTaskTimeResponse {
  let multiplier = 1.0;
  if (req.operatorSkill === 'Beginner') multiplier *= 1.25;
  else if (req.operatorSkill === 'Intermediate') multiplier *= 1.05;
  else if (req.operatorSkill === 'Expert') multiplier *= 0.95;
  if (req.weather === 'Rainy' || req.weather === 'Windy') multiplier *= 1.1;
  if (req.machineAgeYears > 5) multiplier *= 1.07;

  return {
    predictedTimeMin: Math.round(req.estimatedTimeMin * multiplier * 10) / 10,
    source: 'fallback_average',
    confidence: 'low',
  };
}

@Controller('predict-task-time')
export class PredictionController {
  private readonly logger = new Logger(PredictionController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly mlServiceHealth: MlServiceHealthService,
  ) {}

  @Post()
  async predict(@Body() body: PredictTaskTimeRequest): Promise<PredictTaskTimeResponse> {
    let result: PredictTaskTimeResponse;

    // Circuit breaker (CONTRACTS.md §8.5): skip the live call entirely if the
    // last health check found the ml-service down, rather than waiting out
    // a timeout on every request.
    if (!this.mlServiceHealth.isReachable()) {
      result = weightedAverageFallback(body);
      this.logger.log(
        `predict-task-time SKIPPED (circuit open) input=${JSON.stringify(body)} output=${JSON.stringify(result)}`,
      );
      return result;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<PredictTaskTimeResponse>(ML_SERVICE_URL, body).pipe(
          timeout(REQUEST_TIMEOUT_MS),
          catchError(() => {
            throw new Error('ml-service unreachable or timed out');
          }),
        ),
      );
      result = response.data;
    } catch {
      result = weightedAverageFallback(body);
    }

    // Decision-level audit log (CONTRACTS.md §8.6): every prediction's input,
    // output, and which path answered — the evidence behind the "explainable,
    // not black-box" narrative (README §2).
    this.logger.log(`predict-task-time input=${JSON.stringify(body)} output=${JSON.stringify(result)}`);

    return result;
  }
}
