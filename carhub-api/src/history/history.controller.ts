import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HistoryService } from './history.service';

@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(private history: HistoryService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('vehicleId') vehicleId?: string,
    @Query('kind') kind?: string,
    @Query('take') take?: string,
  ) {
    const userId = req.user.userId;

    const takeNum = take ? Number(take) : undefined; // ✅ ако няма take -> undefined

    return this.history.list(userId, { vehicleId, kind, take: takeNum });
  }
}
