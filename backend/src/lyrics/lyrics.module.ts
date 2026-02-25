import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LyricsController } from './lyrics.controller';
import { LyricsService } from './lyrics.service';

@Module({
  imports: [AuthModule],
  providers: [LyricsService],
  controllers: [LyricsController],
})
export class LyricsModule {}
