import { Controller, Get, Query } from '@nestjs/common';
import { DataLoaderService } from '../data/data-loader.service';
import { RulesService } from '../rules/rules.service';
import { paginate } from '../common/pagination';

@Controller('safety-alerts')
export class SafetyController {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly rules: RulesService,
  ) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const alerts = this.rules.computeSafetyAlerts(this.dataLoader.getOperations());
    return paginate(alerts, page, pageSize);
  }
}
