import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { paginationQuerySchema } from '@gp/shared/schemas';
import { z } from 'zod';

import { CurrentUser, type AuthUser } from '../../common/request';
import { createZodDto } from '../../common/zod';
import { PlayerAuth } from '../auth/guards';
import { NOTIFICATION_CATEGORY_FILTERS, NotificationsService } from './notifications.service';

class NotificationsQueryDto extends createZodDto(
  paginationQuerySchema.extend({
    unread: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    category: z.enum(NOTIFICATION_CATEGORY_FILTERS).optional(),
  }),
) {}

@ApiTags('notifications')
@PlayerAuth({ onboarded: false })
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Notifications (paginated, ?unread=true, ?category=security|transactions|rounds|promotions|account)',
  })
  list(@CurrentUser() user: AuthUser, @Query() query: NotificationsQueryDto) {
    return this.notifications.list(user.id, query);
  }

  @Post(':id/read')
  @HttpCode(200)
  read(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @HttpCode(200)
  readAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }
}
