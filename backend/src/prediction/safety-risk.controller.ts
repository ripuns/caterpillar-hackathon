import { Body, Controller, Logger, Post } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, timeout } from 'rxjs';
import { MlServiceHealthService } from '../health/ml-service-health.service';

const ML_SERVICE_URL = 'http://localhost:8000/predict-safety-risk';
const REQUEST_TIMEOUT_MS = 2000;

interface PredictSafetyRiskRequest {
  seatbeltStatus: string;
  distanceToNearestObjectM: number;
  idlingTimeMin: number;
}

interface RiskFactor {
  factor: string;
  contribution: number | null;
}

interface PredictSafetyRiskResponse {
  riskScore: number | null;
  riskTier: 'low' | 'medium' | 'high' | null;
  topFactors: RiskFactor[];
  source: 'model' | 'fallback_unavailable';
}

/**
 * CONTRACTS.md §4.1 — no safe rule-based fallback number exists for a risk
 * score (unlike /predict-task-time), so unlike PredictionController there is
 * no local formula here. If the Python service is unreachable, times out, or
 * has no model loaded yet, this always surfaces "fallback_unavailable"
 * rather than fabricate a score.
 */
const UNAVAILABLE_RESPONSE: PredictSafetyRiskResponse = {
  riskScore: null,
  riskTier: null,
  topFactors: [],
  source: 'fallback_unavailable',
};

@Controller('predict-safety-risk')
export class SafetyRiskController {
  private readonly logger = new Logger(SafetyRiskController.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly mlServiceHealth: MlServiceHealthService,
  ) {}

  @Post()
  async predict(@Body() body: PredictSafetyRiskRequest): Promise<PredictSafetyRiskResponse> {
    let result: PredictSafetyRiskResponse;

    // Circuit breaker (CONTRACTS.md §8.5), same pattern as PredictionController.
    if (!this.mlServiceHealth.isReachable()) {
      result = UNAVAILABLE_RESPONSE;
      this.logger.log(
        `predict-safety-risk SKIPPED (circuit open) input=${JSON.stringify(body)} output=${JSON.stringify(result)}`,
      );
      return result;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<PredictSafetyRiskResponse>(ML_SERVICE_URL, body).pipe(
          timeout(REQUEST_TIMEOUT_MS),
          catchError(() => {
            throw new Error('ml-service unreachable or timed out');
          }),
        ),
      );
      result = response.data;
    } catch {
      result = UNAVAILABLE_RESPONSE;
    }

    // Decision-level audit log (CONTRACTS.md §8.6), same convention as task-time.
    this.logger.log(`predict-safety-risk input=${JSON.stringify(body)} output=${JSON.stringify(result)}`);

    return result;
  }
}
