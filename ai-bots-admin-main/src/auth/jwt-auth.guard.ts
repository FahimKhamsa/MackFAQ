import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

export const JWT_CONFIRMED_ONLY_META = 'JWT_CONFIRMED_ONLY_META';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        private readonly reflector: Reflector
    ) {
        super()
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // const isRequired
        const res = await super.canActivate(context) as boolean;

        if (!res) {
            return res;
        }

        const request = context.switchToHttp().getRequest();

        if (!request.user) {
            return res;
        }

        const is_login_confirmed = request.user.payload.is_confirmed;
        const isConfirmRequired = this.reflector.get(JWT_CONFIRMED_ONLY_META, context.getHandler()) ?? true;
        if (isConfirmRequired && !is_login_confirmed) {
            throw new ForbiddenException("2FA Is required");
        }

        return res;
    }
}