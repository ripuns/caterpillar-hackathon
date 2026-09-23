import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CreateIncidentDto } from './create-incident.dto';
import { IncidentsService } from './incidents.service';
import type { Incident } from './incidents.service';
import { DataLoaderService } from '../data/data-loader.service';
import { RulesService } from '../rules/rules.service';
import { paginate } from '../common/pagination';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('incidents')
export class IncidentsController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly dataLoader: DataLoaderService,
    private readonly rules: RulesService,
  ) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  create(@Body() dto: CreateIncidentDto): Incident {
    return this.incidentsService.create(dto);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const manualIncidents = this.incidentsService.findAll();

    // Backfill system-generated incidents from the rule engine's safety
    // alerts, per CONTRACTS.md §7: "both should appear in a unified view."
    const alerts = this.rules.computeSafetyAlerts(this.dataLoader.getOperations());
    const systemIncidents: Incident[] = alerts.map((a) => ({
      incidentId: a.alertId,
      machineId: a.machineId,
      operatorId: a.operatorId,
      timestamp: a.timestamp,
      description: a.message,
      severity: a.severity,
      loggedBy: 'system',
    }));

    const all = [...manualIncidents, ...systemIncidents].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
    return paginate(all, page, pageSize);
  }
}
