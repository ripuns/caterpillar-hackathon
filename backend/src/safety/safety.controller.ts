import { Controller, Get } from '@nestjs/common';
import { DataLoaderService } from '../data/data-loader.service';
import { RulesService } from '../rules/rules.service';

@Controller('safety-alerts')
export class SafetyController {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly rules: RulesService,
  ) {}

  @Get()
  findAll() {
    return this.rules.computeSafetyAlerts(this.dataLoader.getOperations());
  }
}
