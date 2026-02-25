import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SpotifyModule } from './spotify/spotify.module';
import { SearchHistoryModule } from './search-history/search-history.module';
import { SavedLyricsModule } from './saved-lyrics/saved-lyrics.module';
import { LibraryModule } from './library/library.module';
import { LyricsModule } from './lyrics/lyrics.module';
import { LineAnnotationsModule } from './line-annotations/line-annotations.module';
import { SearchModule } from './search/search.module';
import { CollectionsModule } from './collections/collections.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SpotifyModule,
    SearchHistoryModule,
    SavedLyricsModule,
    LibraryModule,
    LyricsModule,
    LineAnnotationsModule,
    SearchModule,
    CollectionsModule,
  ],
})
export class AppModule {}
