import { Body, Controller, Post } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, timeout } from 'rxjs';

const ML_SERVICE_URL = 'http://localhost:8001/predict-task-time';
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
  constructor(private readonly httpService: HttpService) {}

  @Post()
  async predict(@Body() body: PredictTaskTimeRequest): Promise<PredictTaskTimeResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<PredictTaskTimeResponse>(ML_SERVICE_URL, body).pipe(
          timeout(REQUEST_TIMEOUT_MS),
          catchError(() => {
            throw new Error('ml-service unreachable or timed out');
          }),
        ),
      );
      return response.data;
    } catch {
      return weightedAverageFallback(body);
    }
  }
}
