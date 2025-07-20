import { Body, Controller, Get, Header, Headers, Post, Render, Req, Request, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { NamedModuleInterceptor } from 'src/module.interceptor';
import { UserModel } from 'src/users/entities/user.model';
import { AuthService } from './auth.service';
import { I2FaParams, ILoginParams } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { UseTwoFa } from './TwoFa.decorator';

@UseInterceptors(NamedModuleInterceptor)
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {

    }

    @UseTwoFa(false)
    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Body() payload: ILoginParams) {
        const token = await this.authService.login(payload);
        return {
            status: true,
            token: token,
            next: '/bots/create',
        }
    }

    @UseTwoFa(false)
    @UseGuards(JwtAuthGuard)
    @Post('2fa')
    async twofa(@Body() payload: I2FaParams, @Req() { user }: { user: UserModel }) {
        const { access_token } = await this.authService.protectLoginTwoFa(user.payload, payload);
        return {
            status: true,
            token: access_token,
            next: '/bots/create',
        }
    }
    @UseGuards(JwtAuthGuard)
    @Post('refresh-token')
    async refreshToken(@Request() req) {
        const user: UserModel = req.user;
        if (!user) return;
        const token = await this.authService.refreshToken(user.payload);
        return {
            status: true,
            token: token,
        }
    }

    @Get('login')
    @Render('pages/login')
    loginForm() { }
}
