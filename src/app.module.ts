import { VisitorsModule } from './visitors/visitors.module.js';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SavesModule } from './saves/saves.module.js';

@Module({
  imports: [VisitorsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    SavesModule,
  ],
})
export class AppModule {}
