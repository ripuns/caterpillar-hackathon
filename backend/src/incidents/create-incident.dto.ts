import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateIncidentDto {
  @IsString()
  machineId: string;

  @IsString()
  operatorId: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsIn(['low', 'medium', 'high'])
  severity: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsString()
  requestId?: string;
}
