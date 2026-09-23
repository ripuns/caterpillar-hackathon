import { Body, Controller, Post } from '@nestjs/common';

@Controller('predict-task-time')
export class PredictionController {
  @Post()
  predict(@Body() body: unknown) {
    return {
      predictedTimeMin: 41.5,
      source: 'model',
      confidence: 'medium',
    };
  }
}
