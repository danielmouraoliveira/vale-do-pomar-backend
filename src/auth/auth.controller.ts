import {
  Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res,
  UnauthorizedException, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

const COOKIE_NAME = 'valedopomar_refresh';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const cookieOptions = () => ({
  httpOnly: true as const,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  // O jogo acessa o backend pelo domínio frontend em /api/auth/*.
  path: '/api/auth',
});
function readRefreshCookie(req: Request): string | null {
  const cookie = req.headers.cookie || '';
  const item = cookie.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE_NAME}=`));
  if (!item) return null;
  try { return decodeURIComponent(item.slice(COOKIE_NAME.length + 1)); }
  catch { return null; }
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    res.cookie(COOKIE_NAME, result.refreshToken, { ...cookieOptions(), maxAge: MAX_AGE_MS });
    return result.response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const response = await this.authService.refresh(readRefreshCookie(req));
    // Estende a validade do cookie, sempre vinculado ao token salvo no banco.
    const refresh = readRefreshCookie(req);
    if (refresh) res.cookie(COOKIE_NAME, refresh, { ...cookieOptions(), maxAge: MAX_AGE_MS });
    return response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(readRefreshCookie(req));
    res.clearCookie(COOKIE_NAME, cookieOptions());
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request & { user: { id: string } }) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, nickname: true, email: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    return user;
  }
}
