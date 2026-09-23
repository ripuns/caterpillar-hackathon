import { Controller, Get, Query } from '@nestjs/common';
import { DataLoaderService } from '../data/data-loader.service';
import { RulesService } from '../rules/rules.service';
import { paginate } from '../common/pagination';

@Controller('behavior-flags')
export class BehaviorController {
  constructor(
    private readonly dataLoader: DataLoaderService,
    private readonly rules: RulesService,
  ) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const flags = this.rules.computeBehaviorFlags(this.dataLoader.getOperations());
    return paginate(flags, page, pageSize);
  }
}
