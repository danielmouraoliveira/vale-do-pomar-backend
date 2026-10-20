
import {
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SaveFarmDto } from './dto/save-farm.dto.js';

@Injectable()
export class SavesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Carregar a fazenda do jogador
  async getSave(userId: string) {
    return this.prisma.farmSave.findUnique({
      where: {
        userId,
      },
      select: {
        data: true,
        version: true,
        revision: true,
        updatedAt: true,
      },
    });
  }

  // Salvar a fazenda do jogador
  async saveFarm(userId: string, dto: SaveFarmDto) {
    const data = dto.data as Prisma.InputJsonValue;

    // Primeiro salvamento da conta
    if (dto.revision === 0) {
      try {
        return await this.prisma.farmSave.create({
          data: {
            userId,
            data,
            version: dto.version,
            revision: 1,
          },
          select: {
            version: true,
            revision: true,
            updatedAt: true,
          },
        });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'Esta conta já possui uma fazenda salva. Carregue o progresso mais recente.',
          );
        }

        throw error;
      }
    }

    // Atualização protegida pela revisão
    const result = await this.prisma.farmSave.updateMany({
      where: {
        userId,
        revision: dto.revision,
      },
      data: {
        data,
        version: dto.version,
        revision: {
          increment: 1,
        },
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'O salvamento não foi realizado porque a fazenda foi alterada ou não existe. Carregue o progresso mais recente.',
      );
    }

    return this.getSave(userId);
  }
}
