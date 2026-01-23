import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GoService } from './go.service';

@UseGuards(JwtAuthGuard)
@Controller('integrations/go')
export class GoController {
  constructor(private go: GoService) {}

  @Post('start')
  start(@Body() body: { plate: string; vin?: string }) {
    return this.go.start(body.plate, body.vin);
  }

  @Post('solve')
  solve(@Body() body: { challengeId: string; code: string }) {
    return this.go.solve(body.challengeId, body.code);
  }
}
