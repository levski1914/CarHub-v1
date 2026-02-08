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
import { PrismaService } from 'src/prisma.service';
import { createHash as nodeCreateHash } from 'crypto';
import type { CookieOptions } from 'express';

function getCookieBase(): CookieOptions {
  // Ако е зададено в env — това е "истината"
  const sameSiteEnv = (process.env.COOKIE_SAMESITE || '').toLowerCase();
  const secureEnv = (process.env.COOKIE_SECURE || '').toLowerCase();

  const isProd = process.env.NODE_ENV === 'production';

  // 1) SameSite
  // - prod: none (за cross-site FE/BE)
  // - dev: lax
  const sameSite: CookieOptions['sameSite'] =
    sameSiteEnv === 'none'
      ? 'none'
      : sameSiteEnv === 'lax'
        ? 'lax'
        : sameSiteEnv === 'strict'
          ? 'strict'
          : isProd
            ? 'none'
            : 'lax';

  // 2) Secure
  // - ако SameSite=None → secure трябва да е true (браузърите го изискват)
  const secure =
    secureEnv === 'true'
      ? true
      : secureEnv === 'false'
        ? false
        : sameSite === 'none'
          ? true
          : isProd;

  return {
    httpOnly: true,
    sameSite,
    secure,
    path: '/',
  };
}
@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private prisma: PrismaService,
  ) {}

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

    await this.auth.setRefreshToken(user.id, refreshToken);

    const cookieBase = getCookieBase();

    res.cookie('access_token', accessToken, {
      ...cookieBase,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { ok: true };
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { token: string }) {
    const hash = nodeCreateHash('sha256').update(body.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: hash },
    });

    if (!user) throw new UnauthorizedException('Invalid or expired token');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifySentAt: null,
      },
    });

    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verify-email')
  async resendVerifyEmail(@Req() req: any) {
    const userId = req.user.userId;
    await this.auth.sendVerifyEmail(userId);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user.userId;
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });

    return {
      userId: u?.id,
      email: u?.email,
      emailVerified: !!u?.emailVerified,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const cookieBase = getCookieBase();

    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException();

    const userId = this.auth.verifyRefreshToken(token);
    const ok = await this.auth.validateRefreshToken(userId, token);
    if (!ok) throw new UnauthorizedException();

    const newAccess = this.auth.signAccessToken(userId);
    const newRefresh = this.auth.signRefreshToken(userId);
    await this.auth.setRefreshToken(userId, newRefresh);

    res.cookie('access_token', newAccess, {
      ...cookieBase,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', newRefresh, {
      ...cookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { ok: true };
  }

  @Post('logout')
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const token = req.cookies?.refresh_token;

    if (token) {
      try {
        const userId = this.auth.verifyRefreshToken(token);
        await this.auth.clearRefreshToken(userId);
      } catch {
        // ignore
      }
    }

    const cookieBase = getCookieBase();
    res.clearCookie('access_token', cookieBase);
    res.clearCookie('refresh_token', cookieBase);

    return { ok: true };
  }
}
