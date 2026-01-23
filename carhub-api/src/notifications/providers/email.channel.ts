// src/notifications/providers/email.channel.ts
import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailChannel {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendHtml(to: string, subject: string, html: string) {
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
}
