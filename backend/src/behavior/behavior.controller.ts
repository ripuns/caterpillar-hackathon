import { Controller, Get } from '@nestjs/common';
import { DataLoaderService } from '../data/data-loader.service';
import { RulesService } from '../rules/rules.service';

@Controller('behavior-flags')
export class BehaviorController {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly rules: RulesService,
  ) {}

  @Get()
  findAll() {
    return this.rules.computeBehaviorFlags(this.dataLoader.getOperations());
  }
}
