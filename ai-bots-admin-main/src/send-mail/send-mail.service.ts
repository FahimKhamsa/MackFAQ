import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

export type SendgridConfig = {
  apiKey: string;
};

@Injectable()
export class SendMailService {
  constructor(private readonly mailerService: MailerService) {}

  public async sendMessage(
    email: string,
    params: {
      payload: any;
      template: string;
      sender?: string;
      subject?: string;
    },
  ) {
    return await this.mailerService.sendMail({
      subject: params.subject || null,
      to: email,
      template: params.template,
      context: params.payload,
      transporterName: `${params.sender ?? 'main'}`,
    });
  }
}
