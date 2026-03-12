import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SpotifyModule } from './spotify/spotify.module';
import { SearchHistoryModule } from './search-history/search-history.module';
import { SavedLyricsModule } from './saved-lyrics/saved-lyrics.module';
import { SongsModule } from './songs/songs.module';
import { SongLyricsModule } from './song-lyrics/song-lyrics.module';
import { SongTagsModule } from './song-tags/song-tags.module';
import { SongNotesModule } from './song-notes/song-notes.module';
import { SearchModule } from './search/search.module';
import { CollectionsModule } from './collections/collections.module';
import { LyricsFetchModule } from './lyrics-fetch/lyrics-fetch.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DigestModule } from './digest/digest.module';
import { FeatureRequestsModule } from './feature-requests/feature-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: parseInt(config.get('REDIS_PORT', '6379'), 10),
          lazyConnect: true,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          retryStrategy: () => null, // don't auto-reconnect if not configured
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    SpotifyModule,
    SearchHistoryModule,
    SavedLyricsModule,
    SongsModule,
    SongLyricsModule,
    SongTagsModule,
    SongNotesModule,
    SearchModule,
    CollectionsModule,
    LyricsFetchModule,
    AnalyticsModule,
    DigestModule,
    FeatureRequestsModule,
  ],
})
export class AppModule {}
