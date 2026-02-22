import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SavedLyricsController } from './saved-lyrics.controller';
import { SavedLyricsService } from './saved-lyrics.service';

@Module({
  imports: [AuthModule],
  providers: [SavedLyricsService],
  controllers: [SavedLyricsController],
})
export class SavedLyricsModule {}
