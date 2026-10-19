import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // Busca por email ou nickname
    const user = await this.usersService.findByLogin(
      dto.login,
    );

    if (!user) {
      throw new UnauthorizedException(
        'Email, nickname ou senha inválidos',
      );
    }

    // Compara a senha informada com o hash salvo
    const validPassword = await bcrypt.compare(
      dto.password,
      user.password,
    );

    if (!validPassword) {
      throw new UnauthorizedException(
        'Email, nickname ou senha inválidos',
      );
    }

    // Dados públicos incluídos no JWT
    const payload = {
      sub: user.id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
    };

    const accessToken =
      await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
      },
    };
  }
}