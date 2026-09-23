import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { DataLoaderService } from '../data/data-loader.service';
import { CrossFeatureService } from './cross-feature.service';
import { TtlCache } from '../common/ttl-cache';
import type { OperatorSummary } from './cross-feature.service';

const CACHE_TTL_MS = 30_000; // CONTRACTS.md §8.4: 30s TTL

@Controller('operators')
export class OperatorsController {
  private readonly cache = new TtlCache<OperatorSummary>(CACHE_TTL_MS);

  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly crossFeature: CrossFeatureService,
  ) {}

  @Get(':operatorId/summary')
  getSummary(@Param('operatorId') operatorId: string) {
    const cached = this.cache.get(operatorId);
    if (cached) return cached;

    const operations = this.dataLoader.getOperations();
    const tasks = this.dataLoader.getTasks();

    const knownOperatorIds = new Set([
      ...operations.map((r) => r.operatorId),
      ...tasks.map((r) => r.operatorId),
    ]);
    if (!knownOperatorIds.has(operatorId)) {
      throw new NotFoundException(`Operator ${operatorId} not found`);
    }

    const result = this.crossFeature.synthesize(operatorId, operations, tasks);
    this.cache.set(operatorId, result);
    return result;
  }
}
