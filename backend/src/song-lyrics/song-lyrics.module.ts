import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { LyricsFetchModule } from '../lyrics-fetch/lyrics-fetch.module'
import { SongLyricsController } from './song-lyrics.controller'
import { SongLyricsService } from './song-lyrics.service'

@Module({
  imports: [PrismaModule, AuthModule, LyricsFetchModule],
  controllers: [SongLyricsController],
  providers: [SongLyricsService],
  exports: [SongLyricsService],
})
export class SongLyricsModule {}
