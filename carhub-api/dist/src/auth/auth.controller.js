"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const express = __importStar(require("express"));
const auth_service_1 = require("./auth.service");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const prisma_service_1 = require("../prisma.service");
const crypto_1 = require("crypto");
let AuthController = class AuthController {
    auth;
    prisma;
    constructor(auth, prisma) {
        this.auth = auth;
        this.prisma = prisma;
    }
    async register(body) {
        return this.auth.register(body.email.trim().toLowerCase(), body.password);
    }
    async login(body, res) {
        const user = await this.auth.validateUser(body.email.trim().toLowerCase(), body.password);
        const accessToken = this.auth.signAccessToken(user.id);
        const refreshToken = this.auth.signRefreshToken(user.id);
        await this.auth.setRefreshToken(user.id, refreshToken);
        const cookieBase = {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        };
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
    async verifyEmail(body) {
        const hash = (0, crypto_1.createHash)('sha256').update(body.token).digest('hex');
        const user = await this.prisma.user.findFirst({
            where: { emailVerifyToken: hash },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid or expired token');
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
    async resendVerifyEmail(req) {
        const userId = req.user.userId;
        await this.auth.sendVerifyEmail(userId);
        return { ok: true };
    }
    async me(req) {
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
    async refresh(req, res) {
        const cookieBase = {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        };
        const token = req.cookies?.refresh_token;
        if (!token)
            throw new common_1.UnauthorizedException();
        const userId = this.auth.verifyRefreshToken(token);
        const ok = await this.auth.validateRefreshToken(userId, token);
        if (!ok)
            throw new common_1.UnauthorizedException();
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
    async logout(req, res) {
        const token = req.cookies?.refresh_token;
        if (token) {
            try {
                const userId = this.auth.verifyRefreshToken(token);
                await this.auth.clearRefreshToken(userId);
            }
            catch {
            }
        }
        const cookieBase = {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        };
        res.clearCookie('access_token', cookieBase);
        res.clearCookie('refresh_token', cookieBase);
        return { ok: true };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('resend-verify-email'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendVerifyEmail", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map