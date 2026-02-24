import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SpotifyModule } from './spotify/spotify.module';
import { SearchHistoryModule } from './search-history/search-history.module';
import { SavedLyricsModule } from './saved-lyrics/saved-lyrics.module';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SpotifyModule,
    SearchHistoryModule,
    SavedLyricsModule,
    LibraryModule,
  ],
})
export class AppModule {}
