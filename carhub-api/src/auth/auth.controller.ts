import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    return this.auth.register(body.email.trim().toLowerCase(), body.password);
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const user = await this.auth.validateUser(
      body.email.trim().toLowerCase(),
      body.password,
    );

    const accessToken = this.auth.signAccessToken(user.id);
    const refreshToken = this.auth.signRefreshToken(user.id);

    const cookieBase = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: false, // true в prod
      path: '/',
    };

    res.cookie('access_token', accessToken, {
      ...cookieBase,
      maxAge: 24 * 60 * 60 * 1000, // 1 ден
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { ok: true };
  }

  @Post('refresh')
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException();

    const payload = this.auth.verifyRefreshToken(token);
    const accessToken = this.auth.signAccessToken(payload.sub());

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return { ok: true };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: express.Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // true в prod
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    // в guard-а ще сложим req.user = { userId }
    return { userId: req.user.userId };
  }
}
