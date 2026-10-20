
import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SavesService } from './saves.service.js';
import { SaveFarmDto } from './dto/save-farm.dto.js';

@Controller('saves')
@UseGuards(JwtAuthGuard)
export class SavesController {
  constructor(
    private readonly savesService: SavesService,
  ) {}

  // Carregar a fazenda
 @Get('me')
async getMySave(@Req() req: { user: { id: string } }) {
  const save = await this.savesService.getSave(req.user.id);

  return {
    save,
  };
}

  // Salvar a fazenda
  @Put('me')
  async saveMyFarm(
    @Req() req: { user: { id: string } },
    @Body() dto: SaveFarmDto,
  ) {
    return this.savesService.saveFarm(req.user.id, dto);
  }
}
