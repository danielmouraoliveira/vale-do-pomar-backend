import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';

const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

type PublicUser = { id: string; name: string; nickname: string; email: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private async issueAccessToken(user: PublicUser) {
    const payload = {
      sub: user.id,
      name: user.name,
      nickname: user.nickname,
      email: user.email,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      token_type: 'Bearer' as const,
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByLogin(dto.login);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email, nickname ou senha inválidos');
    }
    // Token longo é opaco e aleatório; no banco fica apenas seu SHA-256.
    // Nunca incluir o refresh token em JSON ou no JWT de uma hora.
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + SESSION_MS),
      },
    });
    return {
      response: await this.issueAccessToken(user),
      refreshToken,
    };
  }

  async refresh(token: string | null) {
    if (!token || token.length > 256) throw new UnauthorizedException('Sessão não encontrada');
    const tokenHash = hashToken(token);
    const now = new Date();
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
    if (!session || session.expiresAt <= now) {
      if (session) await this.prisma.refreshSession.deleteMany({ where: { tokenHash } });
      throw new UnauthorizedException('Sessão expirada ou revogada');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, nickname: true, email: true },
    });
    if (!user) {
      await this.prisma.refreshSession.deleteMany({ where: { tokenHash } });
      throw new UnauthorizedException('Conta não encontrada');
    }
    // Renovação deslizante: o login permanece por 30 dias a partir do
    // último uso. Atualização condicionada evita restaurar sessão revogada.
    const updated = await this.prisma.refreshSession.updateMany({
      where: { id: session.id, tokenHash, expiresAt: { gt: now } },
      data: { expiresAt: new Date(Date.now() + SESSION_MS), lastUsedAt: now },
    });
    if (updated.count !== 1) throw new UnauthorizedException('Sessão não está mais ativa');
    return await this.issueAccessToken(user);
  }

  async logout(token: string | null) {
    if (token && token.length < 256) {
      await this.prisma.refreshSession.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
    return { ok: true };
  }
}
