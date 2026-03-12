import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LyricsFetchModule } from '../lyrics-fetch/lyrics-fetch.module';
import { SpotifyController } from './spotify.controller';
import { SpotifyService } from './spotify.service';

@Module({
  imports: [AuthModule, LyricsFetchModule],
  providers: [SpotifyService],
  controllers: [SpotifyController],
  exports: [SpotifyService],
})
export class SpotifyModule {}
