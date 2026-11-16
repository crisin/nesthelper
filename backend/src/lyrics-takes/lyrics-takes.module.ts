import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LyricsTakesController } from './lyrics-takes.controller';
import { LyricsTakesService } from './lyrics-takes.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [LyricsTakesController],
  providers: [LyricsTakesService],
})
export class LyricsTakesModule {}
