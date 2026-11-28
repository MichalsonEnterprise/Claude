import { Injectable, UseGuards, applyDecorators, type CanActivate } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AppConfig } from '../config/app-config';
import { AppError } from './errors';

/**
 * DEMO-only routes (simulated deposits, mock KYC approval…): 404 unless DEMO_MODE=true, REAL_MONEY_ENABLED=false
 * and NODE_ENV != production. They post the same ledger entries as the real flows and flag records isDemo.
 */
@Injectable()
export class DemoOnlyGuard implements CanActivate {
  constructor(private readonly config: AppConfig) {}

  canActivate(): boolean {
    if (!this.config.demoEndpointsEnabled) throw new AppError('NOT_FOUND', 'Not found');
    return true;
  }
}

export const DemoOnly = () => applyDecorators(UseGuards(DemoOnlyGuard), ApiTags('dev (DEMO only)'));
