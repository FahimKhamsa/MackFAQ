import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SendMailService } from './send-mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const m = {
          transports: {
            main: {
              host: configService.get<string>('MAILER_HOST', 'smtp.gmail.com'),
              secure: false,
              auth: {
                user: configService.get<string>('MAILER_USER', 'your-email@gmail.com'),
                pass: configService.get<string>('MAILER_PASS', 'your-app-password'),
              },
            }
          },
          defaults: {
            // from: '"Test Test" <qhfqoifuiqoklrfj@gmail.com>',
          },
          template: {
            dir: join(__dirname, '../mail-static/templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };

        return m;
      },
      inject: [ConfigService],
    }),
  ],
  providers: [SendMailService],
  exports: [SendMailService],
})
export class SendMailModule { }
