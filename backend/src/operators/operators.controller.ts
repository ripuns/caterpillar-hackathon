import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { DataLoaderService } from '../data/data-loader.service';
import { CrossFeatureService } from './cross-feature.service';

@Controller('operators')
export class OperatorsController {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly crossFeature: CrossFeatureService,
  ) {}

  @Get(':operatorId/summary')
  getSummary(@Param('operatorId') operatorId: string) {
    const operations = this.dataLoader.getOperations();
    const tasks = this.dataLoader.getTasks();

    const knownOperatorIds = new Set([
      ...operations.map((r) => r.operatorId),
      ...tasks.map((r) => r.operatorId),
    ]);
    if (!knownOperatorIds.has(operatorId)) {
      throw new NotFoundException(`Operator ${operatorId} not found`);
    }

    return this.crossFeature.synthesize(operatorId, operations, tasks);
  }
}
