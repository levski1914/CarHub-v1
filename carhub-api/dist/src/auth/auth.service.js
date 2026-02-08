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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma.service");
const crypto = __importStar(require("crypto"));
const crypto_1 = require("crypto");
const email_channel_1 = require("../notifications/providers/email.channel");
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
function generateToken() {
    const raw = (0, crypto_1.randomBytes)(32).toString('hex');
    const hash = (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
    return { raw, hash };
}
let AuthService = class AuthService {
    prisma;
    jwt;
    email;
    constructor(prisma, jwt, email) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.email = email;
    }
    async register(email, password) {
        const passwordHash = await bcrypt.hash(password, 10);
        try {
            const user = await this.prisma.$transaction(async (tx) => {
                const u = await tx.user.create({
                    data: { email: email.trim().toLowerCase(), passwordHash },
                });
                await tx.notificationSettings.create({
                    data: {
                        userId: u.id,
                        emailEnabled: true,
                        smsEnabled: false,
                        email: u.email,
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
        }
        catch (e) {
            if (e?.code === 'P2002') {
                throw new common_1.ConflictException('Email already exists');
            }
            throw e;
        }
    }
    async sendVerifyEmail(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.UnauthorizedException();
        if (user.emailVerified)
            return;
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
        await this.email.sendHtml(user.email, 'Потвърди имейла си', `
      <h2>Потвърждение на имейл</h2>
      <p>Натисни бутона по-долу:</p>
      <p><a href="${link}">Потвърди имейла</a></p>
      <p style="color:#666;font-size:12px">Ако не си ти – игнорирай този имейл.</p>
    `);
    }
    async sendEmailVerification(userId, email) {
        const { raw, hash } = generateToken();
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                emailVerifyToken: hash,
                emailVerifySentAt: new Date(),
            },
        });
        const link = `${process.env.FRONTEND_URL}/verify-email?token=${raw}`;
    }
    async setRefreshToken(userId, token) {
        const hash = hashToken(token);
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: hash },
        });
    }
    async validateRefreshToken(userId, token) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.refreshTokenHash)
            return false;
        return user.refreshTokenHash === hashToken(token);
    }
    async clearRefreshToken(userId) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshTokenHash: null },
        });
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid credentials');
        return user;
    }
    signAccessToken(userId) {
        return this.jwt.sign({ sub: userId }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' });
    }
    signRefreshToken(userId) {
        return this.jwt.sign({ sub: userId }, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' });
    }
    verifyRefreshToken(token) {
        try {
            const payload = this.jwt.verify(token, {
                secret: process.env.JWT_REFRESH_SECRET,
            });
            return payload.sub;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        email_channel_1.EmailChannel])
], AuthService);
//# sourceMappingURL=auth.service.js.map