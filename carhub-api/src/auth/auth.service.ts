import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma.service';
import * as crypto from 'crypto';
import { randomBytes, createHash } from 'crypto';
import { EmailChannel } from '../notifications/providers/email.channel';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken() {
  const raw = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailChannel,
  ) {}

  async register(email: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { email: email.trim().toLowerCase(), passwordHash },
        });

        // ✅ създаваме NotificationSettings веднага
        await tx.notificationSettings.create({
          data: {
            userId: u.id,
            emailEnabled: true, // по default OFF
            smsEnabled: false, // по default OFF
            email: u.email, // ✅ взима email-а от user
            phone: null,
            daysBefore: [7, 3, 1],
            sendHour: 9,
            sendMinute: 0,
            timezone: 'Europe/Sofia',
          },
        });

        return u;
      });
      await this.sendVerifyEmail(user.id);

      return { id: user.id, email: user.email };
    } catch (e: any) {
      // Prisma unique constraint за email
      if (e?.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw e;
    }
  }
  async sendVerifyEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified) return;

    const { raw, hash } = generateToken();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyToken: hash,
        emailVerifySentAt: new Date(),
      },
    });

    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${base}/verify-email?token=${raw}`;

    await this.email.sendHtml(
      user.email,
      'Потвърди имейла си',
      `
      <h2>Потвърждение на имейл</h2>
      <p>Натисни бутона по-долу:</p>
      <p><a href="${link}">Потвърди имейла</a></p>
      <p style="color:#666;font-size:12px">Ако не си ти – игнорирай този имейл.</p>
    `,
    );
  }

  async sendEmailVerification(userId: string, email: string) {
    const { raw, hash } = generateToken();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifyToken: hash,
        emailVerifySentAt: new Date(),
      },
    });

    const link = `${process.env.FRONTEND_URL}/verify-email?token=${raw}`;

    // TODO: пращане на имейл
    // await this.email.sendHtml(email, 'Потвърди имейла си', html);
  }

  async setRefreshToken(userId: string, token: string) {
    const hash = hashToken(token);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  async validateRefreshToken(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshTokenHash) return false;
    return user.refreshTokenHash === hashToken(token);
  }

  async clearRefreshToken(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  signAccessToken(userId: string) {
    return this.jwt.sign(
      { sub: userId },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' }, // препоръчвам по-кратко
    );
  }

  signRefreshToken(userId: string) {
    return this.jwt.sign(
      { sub: userId },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );
  }

  verifyRefreshToken(token: string): string {
    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
