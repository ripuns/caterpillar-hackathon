import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksController } from './tasks/tasks.controller';
import { SafetyController } from './safety/safety.controller';
import { BehaviorController } from './behavior/behavior.controller';
import { TrainingController } from './training/training.controller';
import { PredictionController } from './prediction/prediction.controller';
import { OperatorsController } from './operators/operators.controller';
import { FleetController } from './fleet/fleet.controller';
import { HealthController } from './health/health.controller';
import { IncidentsController } from './incidents/incidents.controller';
import { DataLoaderService } from './data/data-loader.service';
import { RulesService } from './rules/rules.service';
import { CrossFeatureService } from './operators/cross-feature.service';
import { CostEstimationService } from './fleet/cost-estimation.service';
import { TaskStatusService } from './tasks/task-status.service';
import { IncidentsService } from './incidents/incidents.service';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { MlServiceHealthService } from './health/ml-service-health.service';

@Module({
  imports: [HttpModule],
  controllers: [
    AppController,
    TasksController,
    SafetyController,
    BehaviorController,
    TrainingController,
    PredictionController,
    OperatorsController,
    FleetController,
    HealthController,
    IncidentsController,
  ],
  providers: [
    AppService,
    DataLoaderService,
    RulesService,
    CrossFeatureService,
    CostEstimationService,
    TaskStatusService,
    IncidentsService,
    MlServiceHealthService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
