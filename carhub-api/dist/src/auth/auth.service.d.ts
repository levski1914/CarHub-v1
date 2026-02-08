import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { EmailChannel } from '../notifications/providers/email.channel';
export declare class AuthService {
    private prisma;
    private jwt;
    private email;
    constructor(prisma: PrismaService, jwt: JwtService, email: EmailChannel);
    register(email: string, password: string): Promise<{
        id: string;
        email: string;
    }>;
    sendVerifyEmail(userId: string): Promise<void>;
    sendEmailVerification(userId: string, email: string): Promise<void>;
    setRefreshToken(userId: string, token: string): Promise<void>;
    validateRefreshToken(userId: string, token: string): Promise<boolean>;
    clearRefreshToken(userId: string): Promise<void>;
    validateUser(email: string, password: string): Promise<{
        id: string;
        createdAt: Date;
        email: string;
        passwordHash: string;
        refreshTokenHash: string | null;
        emailVerified: boolean;
        emailVerifyToken: string | null;
        emailVerifySentAt: Date | null;
    }>;
    signAccessToken(userId: string): string;
    signRefreshToken(userId: string): string;
    verifyRefreshToken(token: string): string;
}
