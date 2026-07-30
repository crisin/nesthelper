import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LyricsFetchModule } from '../lyrics-fetch/lyrics-fetch.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SavedLyricsController } from './saved-lyrics.controller';
import { SavedLyricsService } from './saved-lyrics.service';

@Module({
  imports: [PrismaModule, AuthModule, LyricsFetchModule],
  controllers: [SavedLyricsController],
  providers: [SavedLyricsService],
  exports: [SavedLyricsService],
})
export class SavedLyricsModule {}
