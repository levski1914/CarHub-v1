import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ObligationType } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private svc: VehiclesService) {}

  @Get()
  list(@Req() req: any) {
    return this.svc.listVehicles(req.user.userId);
  }

  @Post()
  create(
    @Req() req: any,
    @Body() body: { plate: string; make: string; model: string },
  ) {
    return this.svc.createVehicle(req.user.userId, body);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.svc.getVehicle(req.user.userId, id);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { plate?: string; make?: string; model?: string },
  ) {
    return this.svc.updateVehicle(req.user.userId, id, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteVehicle(req.user.userId, id);
  }

  @Get(':id/obligations')
  listObligations(@Req() req: any, @Param('id') id: string) {
    return this.svc.listObligations(req.user.userId, id);
  }

  @Post(':id/obligations')
  createObligation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { type: ObligationType; dueDate: string },
  ) {
    return this.svc.createObligation(req.user.userId, id, body);
  }

  @Post(':id/enrich')
  enrich(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      plate?: string;
      vin?: string;
      checks?: ('Винетка' | 'Гражданска отговорност' | 'Технически преглед')[];
    },
  ) {
    return this.svc.enrichVehicle(req.user.userId, id, body);
  }
}
