import * as express from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma.service';
export declare class AuthController {
    private auth;
    private prisma;
    constructor(auth: AuthService, prisma: PrismaService);
    register(body: {
        email: string;
        password: string;
    }): Promise<{
        id: string;
        email: string;
    }>;
    login(body: {
        email: string;
        password: string;
    }, res: express.Response): Promise<{
        ok: boolean;
    }>;
    verifyEmail(body: {
        token: string;
    }): Promise<{
        ok: boolean;
    }>;
    resendVerifyEmail(req: any): Promise<{
        ok: boolean;
    }>;
    me(req: any): Promise<{
        userId: string | undefined;
        email: string | undefined;
        emailVerified: boolean;
    }>;
    refresh(req: any, res: express.Response): Promise<{
        ok: boolean;
    }>;
    logout(req: any, res: express.Response): Promise<{
        ok: boolean;
    }>;
}
