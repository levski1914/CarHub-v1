import { Injectable } from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class SmsChannel {
  private client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  );

  async send(to: string, body: string) {
    const from = process.env.TWILIO_FROM;
    if (!from) throw new Error('TWILIO_FROM липсва');

    await this.client.messages.create({ from, to, body });
  }
}
