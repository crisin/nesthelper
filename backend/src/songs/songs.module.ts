import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { LineAnnotationsModule } from '../line-annotations/line-annotations.module'
import { SongNotesModule } from '../song-notes/song-notes.module'
import { SongsController } from './songs.controller'
import { SongsService } from './songs.service'

@Module({
  imports: [PrismaModule, AuthModule, LineAnnotationsModule, SongNotesModule],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
