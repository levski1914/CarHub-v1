import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
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
            emailEnabled: false, // по default OFF
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

      return { id: user.id, email: user.email };
    } catch (e: any) {
      // Prisma unique constraint за email
      if (e?.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw e;
    }
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
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '1d' }, // препоръчвам по-кратко
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
