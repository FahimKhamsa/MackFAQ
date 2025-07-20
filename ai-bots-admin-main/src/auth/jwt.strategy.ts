import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { IncomingMessage } from 'http';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService, private configService: ConfigService) {
    super({
      jwtFromRequest: (req: any) => {
        let token = null;
        if (req && req.cookies) {
          token = req.cookies['jwt'];
        }
        if (!token && req && req.headers && req.headers.authorization) {
          const authHeader = req.headers.authorization;
          if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          }
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  getAuthCookie(cookie: string) {
    if (!cookie) return false;
    return cookie.match(/^(.*)a=([^;]+)(.*)$/)[2];
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload);

    if (!user) {
      return user;
    }

    if (payload.is_confirmed) {
      user.loginConfirmed();
    }

    user.set2FaToken(payload.twofa_token)

    return user;
  }
}
