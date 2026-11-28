import { Module } from '@nestjs/common';

import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

/** Player financial + gaming history (rg-history agent). */
@Module({
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
