"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailChannel = void 0;
const common_1 = require("@nestjs/common");
const resend_1 = require("resend");
let EmailChannel = class EmailChannel {
    resend = new resend_1.Resend(process.env.RESEND_API_KEY);
    async sendHtml(to, subject, html) {
        const from = process.env.EMAIL_FROM || 'CarHub <onboarding@resend.dev>';
        const { error } = await this.resend.emails.send({
            from,
            to,
            subject,
            html,
        });
        if (error) {
            throw new Error(error.message || 'Resend send failed');
        }
    }
};
exports.EmailChannel = EmailChannel;
exports.EmailChannel = EmailChannel = __decorate([
    (0, common_1.Injectable)()
], EmailChannel);
//# sourceMappingURL=email.channel.js.map