import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InboxService } from './inbox.service';

@UseGuards(JwtAuthGuard)
@Controller('inbox')
export class InboxController {
  constructor(private inbox: InboxService) {}

  @Get()
  list(@Req() req: any, @Query('take') take?: string) {
    return this.inbox.list(req.user.userId, Number(take ?? 20));
  }

  @Get('unread-count')
  async unread(@Req() req: any) {
    const count = await this.inbox.unreadCount(req.user.userId);
    return { count };
  }

  @Post(':id/read')
  read(@Req() req: any, @Param('id') id: string) {
    return this.inbox.markRead(req.user.userId, id);
  }

  @Post('read-all')
  readAll(@Req() req: any) {
    return this.inbox.markAllRead(req.user.userId);
  }

  @Post(':id/delete')
  del(@Req() req: any, @Param('id') id: string) {
    return this.inbox.remove(req.user.userId, id);
  }

  @Post('clear')
  clear(@Req() req: any) {
    return this.inbox.clear(req.user.userId);
  }
}
