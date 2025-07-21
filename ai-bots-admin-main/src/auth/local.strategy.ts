import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    console.log('[LocalStrategy] Attempting login for', email);

    const user = await this.authService.validateUser({ email, password });

    if (!user) {
      console.log('[LocalStrategy] Login failed for', email);
      throw new UnauthorizedException();
    }

    console.log('[LocalStrategy] Login success for', email);
    return user;
  }
}
