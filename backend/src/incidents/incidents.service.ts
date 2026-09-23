import { Injectable } from '@nestjs/common';
import { CreateIncidentDto } from './create-incident.dto';

export interface Incident {
  incidentId: string;
  machineId: string;
  operatorId: string;
  timestamp: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  loggedBy: 'manual' | 'system';
}

/**
 * In-memory incident store (no database for this build, per README §2 —
 * standalone/local). Manual incidents (CONTRACTS.md §7) live here; system
 * incidents (from the rule engine's safety alerts) are backfilled into the
 * same shape by IncidentsController so GET /incidents shows a unified view.
 */
@Injectable()
export class IncidentsService {
  private incidents: Incident[] = [];
  // Maps a client-supplied requestId to the incidentId it originally created,
  // for idempotent retries (CONTRACTS.md §8.8) — kept out of the Incident
  // shape itself so it never leaks into the API response.
  private requestIdToIncidentId = new Map<string, string>();
  private counter = 1;

  create(dto: CreateIncidentDto): Incident {
    if (dto.requestId) {
      const existingId = this.requestIdToIncidentId.get(dto.requestId);
      if (existingId) {
        const existing = this.incidents.find((i) => i.incidentId === existingId);
        if (existing) return existing;
      }
    }

    const incident: Incident = {
      incidentId: `I${String(this.counter++).padStart(3, '0')}`,
      machineId: dto.machineId,
      operatorId: dto.operatorId,
      timestamp: new Date().toISOString(),
      description: dto.description,
      severity: dto.severity,
      loggedBy: 'manual',
    };

    if (dto.requestId) {
      this.requestIdToIncidentId.set(dto.requestId, incident.incidentId);
    }

    this.incidents.push(incident);
    return incident;
  }

  findAll(): Incident[] {
    return [...this.incidents].reverse();
  }
}
