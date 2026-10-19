import {
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const nickname = dto.nickname.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { nickname },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Email ou nickname já está em uso',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          nickname,
          email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          email: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Email ou nickname já está em uso',
        );
      }
      throw error;
    }
  }

  async findByLogin(login: string) {
    const normalizedLogin = login.trim().toLowerCase();

    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedLogin },
          { nickname: normalizedLogin },
        ],
      },
    });
  }
}