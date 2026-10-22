import {
  Controller, Get, NotFoundException, Param, ParseUUIDPipe, Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

type SaveJson = Record<string, unknown>;

// Devolve somente campos VISUAIS; e-mails, senhas e tokens jamais saem da API.
function publicFarm(raw: unknown) {
  const doc = raw && typeof raw === 'object' ? raw as SaveJson : {};
  const data = doc.state && typeof doc.state === 'object' ? doc.state as SaveJson : doc;
  const plots = Array.isArray(data.plots) ? data.plots : [];
  const objects = Array.isArray(data.objects) ? data.objects : [];
  const number = (v: unknown, fallback=0) => typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const farmer = data.farmer && typeof data.farmer === 'object' ? data.farmer as SaveJson : {};
  return {
    level: Math.max(1, Math.trunc(number(data.level,1))),
    // Campos de economia em uma visita são valores neutros, não dados privados.
    coins: 0, diamonds: 0, xp: 0,
    expansionLevel: Math.max(0, Math.min(20, Math.trunc(number(data.expansionLevel)))),
    farmer: {
      x: number(farmer.x,768), y: number(farmer.y,615),
      dir: typeof farmer.dir==='string' ? farmer.dir : 'down',
      walkTime: 0, moving: false,
    },
    plots: plots.slice(0,2000).filter(p=>p && typeof p==='object').map(p=>{
      const plot=p as SaveJson;
      return {
        id:number(plot.id), x:number(plot.x), y:number(plot.y),
        state:typeof plot.state==='string'?plot.state:'virgin',
        crop:typeof plot.crop==='string'?plot.crop:undefined,
        plantedAt:number(plot.plantedAt),
      };
    }),
    objects: objects.slice(0,5000).filter(o=>o && typeof o==='object').map(o=>{
      const obj=o as SaveJson;
      return {
        id:number(obj.id), type:typeof obj.type==='string'?obj.type:'',
        x:number(obj.x), y:number(obj.y),
        variant:number(obj.variant), readyAt:number(obj.readyAt),
      };
    }),
  };
}

@Controller('visitors')
@UseGuards(JwtAuthGuard)
export class VisitorsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('farms')
  async farms(@Req() req: Request & { user: { id: string } }) {
    const saves = await this.prisma.farmSave.findMany({
      where: { userId: { not: req.user.id } },
      select: {
        userId: true, data: true,
        user: { select: { name: true, nickname: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { farms: saves.map(s=>{
      const data=(s.data && typeof s.data==='object' ? s.data : {}) as SaveJson;
      const world=(data.state && typeof data.state==='object' ? data.state : data) as SaveJson;
      return {
        userId: s.userId,
        name: s.user.name || s.user.nickname,
        level: typeof world.level==='number' ? world.level : 1,
        objects: Array.isArray(world.objects) ? world.objects.length : 0,
      };
    })};
  }

  @Get('farms/:userId')
  async visit(@Req() req: Request & { user: { id: string } },
              @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string) {
    if (userId === req.user.id) throw new NotFoundException('Esta é sua própria fazenda.');
    const save = await this.prisma.farmSave.findUnique({
      where: { userId },
      select: { user: {select: {name:true,nickname:true}}, data:true },
    });
    if (!save) throw new NotFoundException('Fazenda não disponível.');
    return { userId, name: save.user.name || save.user.nickname,
      save: { state: publicFarm(save.data) }, readonly: true };
  }
}
