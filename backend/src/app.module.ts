import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
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
import { LyricsFetchModule } from './lyrics-fetch/lyrics-fetch.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: parseInt(config.get('REDIS_PORT', '6379'), 10),
        },
      }),
    }),
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
    LyricsFetchModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
