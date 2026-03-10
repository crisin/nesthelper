import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SongNotesService } from './song-notes.service';

@Module({
  imports: [PrismaModule],
  providers: [SongNotesService],
  exports: [SongNotesService],
})
export class SongNotesModule {}
