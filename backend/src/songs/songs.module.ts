import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { SongsController } from './songs.controller'
import { SongsService } from './songs.service'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
