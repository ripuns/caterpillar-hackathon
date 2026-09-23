import { Controller, Get } from '@nestjs/common';
import { DataLoaderService } from '../data/data-loader.service';
import { CostEstimationService } from './cost-estimation.service';

@Controller('fleet')
export class FleetController {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly costEstimation: CostEstimationService,
  ) {}

  @Get('cost-summary')
  getCostSummary() {
    return this.costEstimation.computeFleetSummary(
      this.dataLoader.getOperations(),
      this.dataLoader.getTasks(),
    );
  }
}
