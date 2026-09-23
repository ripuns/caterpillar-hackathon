import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { DataLoaderService } from '../data/data-loader.service';
import { MachineScoringService } from './machine-scoring.service';
import { ZoneStatusService } from './zone-status.service';
import { TtlCache } from '../common/ttl-cache';
import { paginate } from '../common/pagination';
import type { MachineScore } from './machine-scoring.service';
import type { ZoneStatus } from './zone-status.service';

const CACHE_TTL_MS = 30_000; // same TTL convention as operators.controller.ts (CONTRACTS.md §8.4)

@Controller('machines')
export class MachinesController {
  private readonly healthCache = new TtlCache<MachineScore>(CACHE_TTL_MS);
  private readonly zoneCache = new TtlCache<ZoneStatus>(CACHE_TTL_MS);

  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly machineScoring: MachineScoringService,
    private readonly zoneStatus: ZoneStatusService,
  ) {}

  private knownMachineIds(): Set<string> {
    return new Set(this.dataLoader.getOperations().map((r) => r.machineId));
  }

  @Get()
  getAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const operations = this.dataLoader.getOperations();
    const scores = this.machineScoring.computeAllMachineScores(operations);
    return paginate(scores, page, pageSize);
  }

  @Get(':machineId/health')
  getHealth(@Param('machineId') machineId: string) {
    if (!this.knownMachineIds().has(machineId)) {
      throw new NotFoundException(`Machine ${machineId} not found`);
    }

    const cached = this.healthCache.get(machineId);
    if (cached) return cached;

    const result = this.machineScoring.computeMachineScore(machineId, this.dataLoader.getOperations());
    this.healthCache.set(machineId, result);
    return result;
  }

  @Get(':machineId/zone-status')
  getZoneStatus(@Param('machineId') machineId: string) {
    if (!this.knownMachineIds().has(machineId)) {
      throw new NotFoundException(`Machine ${machineId} not found`);
    }

    const cached = this.zoneCache.get(machineId);
    if (cached) return cached;

    const all = this.zoneStatus.buildZoneStatus(this.dataLoader.getOperations());
    const result = all.find((z) => z.machineId === machineId);
    if (!result) {
      throw new NotFoundException(`Machine ${machineId} has no recognized current_zone on record`);
    }

    this.zoneCache.set(machineId, result);
    return result;
  }
}
