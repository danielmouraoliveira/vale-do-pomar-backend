import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { VisitorsController } from './visitors.controller.js';

@Module({ imports:[PrismaModule], controllers:[VisitorsController] })
export class VisitorsModule {}
