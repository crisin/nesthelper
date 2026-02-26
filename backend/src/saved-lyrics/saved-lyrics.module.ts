import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LyricsFetchModule } from '../lyrics-fetch/lyrics-fetch.module';
import { SavedLyricsController } from './saved-lyrics.controller';
import { SavedLyricsService } from './saved-lyrics.service';

@Module({
  imports: [AuthModule, LyricsFetchModule],
  providers: [SavedLyricsService],
  controllers: [SavedLyricsController],
})
export class SavedLyricsModule {}
