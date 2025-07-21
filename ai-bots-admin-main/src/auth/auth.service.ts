import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { ILoginParams } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';

export interface AuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  public async validateUser({ email, password }: ILoginParams): Promise<any> {
    console.log('Validating user with email:', email);
    console.log('Validating user with password:', password);
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isMatch = await user.validatePassword(password);
    if (!isMatch) return null;

    return user;
  }

  public async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      const user = await this.usersService.registration({
        email: registerDto.email,
        password: registerDto.password,
        ...(registerDto.username && { username: registerDto.username }),
      });
      const tokens = await this.generateTokens(user);

      return {
        user,
        ...tokens,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new ConflictException('User already exists');
      }
      throw new BadRequestException('Registration failed');
    }
  }

  public async login(payload: ILoginParams): Promise<AuthResponse> {
    console.log('authService Payload:', payload);
    const user = await this.validateUser(payload);
    console.log('User found:', user);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    return {
      user,
      ...tokens,
    };
  }

  public async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const accessToken = await this.generateAccessToken(user);
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(user: any): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<string>('JWT_EXPIRY', '24h'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d', // Refresh token expires in 7 days
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateAccessToken(user: any): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRY', '24h'),
    });
  }
}
