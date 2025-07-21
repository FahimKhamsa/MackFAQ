import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { RegistrationDTO } from './dto/registrer.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { BotsService } from 'src/bots/bots.service';
import { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(
    private userService: UsersService,
    private botService: BotsService,
  ) {}

  @Post('registration')
  async registration(@Body() payload: RegistrationDTO) {
    await this.userService.registration(payload);
    return {
      status: true,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const user = (req as any).user;
    return {
      status: true,
      user: user,
      default_bot: await this.botService.getDefaultBotForUser({
        user_id: user.id,
      }),
    };
  }
}
