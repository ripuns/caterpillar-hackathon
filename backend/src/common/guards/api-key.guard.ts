import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

/**
 * CONTRACTS.md §8.7: single shared API key on write endpoints. Not real
 * multi-user auth — demonstrates write endpoints aren't left wide open.
 * Key is a fixed demo value, documented in CONTRACTS.md; not a secret
 * worth protecting beyond this scope (hackathon build, local-only service).
 */
export const DEMO_API_KEY = 'dev-shared-key';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.headers['x-api-key'];
    if (key !== DEMO_API_KEY) {
      throw new UnauthorizedException('Missing or invalid x-api-key header');
    }
    return true;
  }
}
