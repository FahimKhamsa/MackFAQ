import {
  Body,
  Controller,
  Get,
  Post,
  Render,
  Request,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NamedModuleInterceptor } from 'src/module.interceptor';
import { AuthService } from './auth.service';
import { ILoginParams, RefreshTokenDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';

@UseInterceptors(NamedModuleInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      status: true,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req, @Body() loginDto: ILoginParams) {
    console.log('Login request received:', loginDto);
    const result = await this.authService.login(loginDto);
    return {
      status: true,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      next: '/bots/create',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(
      refreshTokenDto.refreshToken,
    );
    return {
      status: true,
      accessToken: result.accessToken,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return {
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    return {
      status: true,
      message: 'Logged out successfully',
    };
  }

  @Get('login')
  @Render('pages/login')
  loginForm() {
    return {};
  }
}
