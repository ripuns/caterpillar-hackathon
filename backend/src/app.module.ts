import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksController } from './tasks/tasks.controller';
import { SafetyController } from './safety/safety.controller';
import { BehaviorController } from './behavior/behavior.controller';
import { TrainingController } from './training/training.controller';
import { PredictionController } from './prediction/prediction.controller';
import { DataLoaderService } from './data/data-loader.service';
import { RulesService } from './rules/rules.service';

@Module({
  imports: [],
  controllers: [AppController, TasksController, SafetyController, BehaviorController, TrainingController, PredictionController],
  providers: [AppService, DataLoaderService, RulesService],
})
export class AppModule {}
