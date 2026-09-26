import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
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

/**
 * REDIS_URL (what Railway's Redis plugin provides, password included) wins;
 * otherwise REDIS_HOST / REDIS_PORT / REDIS_PASSWORD. Without either the
 * lyrics queue is unavailable and fetches run in-process instead.
 */
function redisConnection(config: ConfigService) {
  const url = config.get<string>('REDIS_URL');
  if (url) {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      username: u.username ? decodeURIComponent(u.username) : undefined,
      password: u.password ? decodeURIComponent(u.password) : undefined,
      tls: u.protocol === 'rediss:' ? {} : undefined,
    };
  }
  return {
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: parseInt(config.get<string>('REDIS_PORT', '6379'), 10),
    password: config.get<string>('REDIS_PASSWORD') || undefined,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          ...redisConnection(config),
          // Railway's private network is IPv6-only; 0 lets ioredis use either.
          family: 0,
          lazyConnect: true,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          retryStrategy: () => null, // don't auto-reconnect if not configured
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
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
  // AppController was never registered, so GET /health 404'd — which is the
  // path railway.json points its healthcheck at. Unguarded on purpose.
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
