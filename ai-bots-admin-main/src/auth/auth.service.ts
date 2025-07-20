import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { ILoginPayload } from './dto/login-payload.dto';
import { ILoginParams, ILoginWithToken } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { SendMailService } from 'src/send-mail/send-mail.service';

const TWO_FA_TYPE_LOGIN = 'LOGIN';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private sendMailService: SendMailService,
    ) {

    }
    public async validateUser({ email, ...additional }: ILoginParams | ILoginWithToken) {
        const user = await this.usersService.findByEmail(email);
        if (!user) return false;
        return (!('password' in additional) || additional.password && user.validatePassword(additional.password)) && user;
    }
    public async login(payload: ILoginParams) {
        const user = await this.usersService.findByEmail(payload.email);
        const is2faSkipped = user.email === 'demosupertech';
        const twofatoken = !is2faSkipped && await this.protectLoginTwoFa(user.payload, null);
        return this.getAuthToken({ ...user.payload, is_confirmed: is2faSkipped, twofa_token: twofatoken?.token });
    }
    public async generate2FaSecretHash(payload: { integrity_check: any, code: string }) {
        const key = this.configService.getOrThrow<string>('2FA_KEY');
        return createHash('sha256').update(`${payload.code} ${JSON.stringify(payload.integrity_check)} ${key}`).digest('base64url');
    }

    public async send2FaToken(payload: { integrity_check: any, email: string }) {
        const code = Math.floor(Math.random() * 8999 + 1000).toString();
        const secret = await this.generate2FaSecretHash({
            ...payload,
            code
        });
        const token = bcrypt.hashSync(secret, 12);

        await this.sendMailService.sendMessage(payload.email, { payload: { code }, subject: `Supertech 2FA Verification code: ${code}`, template: 'confirmations/user-confirmation' });

        return {
            token,
        };
    }

    public async validate2Fa(payload: { code: string, token: string, user_id: number }) {
        const token = await this.generate2FaSecretHash({ integrity_check: [payload.user_id, TWO_FA_TYPE_LOGIN], code: payload.code });
        return bcrypt.compareSync(token, payload.token);
    }

    public async protectLoginTwoFa(loginPayload: ILoginPayload, payload: { code: string }): Promise<{ access_token: string }>
    public async protectLoginTwoFa(loginPayload: ILoginPayload, payload: null): Promise<{ token: string }>
    public async protectLoginTwoFa(loginPayload: ILoginPayload, payload: { code: string } | null) {
        if (payload === null) {
            return await this.send2FaToken({ integrity_check: [loginPayload.sub, TWO_FA_TYPE_LOGIN], email: loginPayload.email });
        }
        
        if (!await this.validate2Fa({ code: payload.code, token: loginPayload.twofa_token, user_id: loginPayload.sub })) {
            throw new BadRequestException("Validation failed");
        }

        return {
            access_token: await this.refreshToken({ ...loginPayload, is_confirmed: true }),
        };
    }


    public async refreshToken(payload: ILoginPayload) {
        return this.getAuthToken(payload);
    }
    public async getAuthToken(payload: ILoginPayload) {
        return await this.jwtService.signAsync(payload);
    }
}
