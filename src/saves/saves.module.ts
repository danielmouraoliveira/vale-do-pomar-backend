
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SavesController } from './saves.controller.js';
import { SavesService } from './saves.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [SavesController],
  providers: [SavesService],
})
export class SavesModule {}
