import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { SongTagsController } from './song-tags.controller'
import { SongTagsService } from './song-tags.service'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SongTagsController],
  providers: [SongTagsService],
  exports: [SongTagsService],
})
export class SongTagsModule {}
