import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LYRICS_FETCH_QUEUE } from '../lyrics-fetch/lyrics-fetch.queue';

// ── Spotify Library types ─────────────────────────────────────────────────────

export interface SpotifyTrackObject {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { id: string; name: string; images: { url: string }[] };
  duration_ms: number;
  external_urls: { spotify: string };
}

export interface SpotifyPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

export interface BulkImportTrackDto {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
  external_urls: { spotify: string };
}

export interface AudioFeatures {
  tempo: number;
  energy: number;
  valence: number;
  danceability: number;
}

export interface SpotifyCurrentlyPlayingResponse {
  item: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
    duration_ms: number;
  } | null;
  progress_ms: number | null;
  is_playing: boolean;
}

/** The subset of Spotify's full track object this app reads. */
interface SpotifyFullTrack {
  name?: string;
  artists?: { name: string }[];
  duration_ms?: number;
  explicit?: boolean;
  track_number?: number;
  album?: {
    name?: string;
    album_type?: string;
    total_tracks?: number;
    release_date?: string;
    release_date_precision?: string;
    images?: { url: string }[];
  };
}

/** 429 for the client, carrying Spotify's Retry-After so the poll can back off. */
function rateLimited(retryAfter: number): HttpException {
  return new HttpException(
    { message: 'Spotify rate limit reached', retryAfter },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

/** A cached answer, with progress moved forward by the time it sat in cache. */
function withElapsedProgress(
  data: SpotifyCurrentlyPlayingResponse | null,
  at: number,
): SpotifyCurrentlyPlayingResponse | null {
  if (!data?.is_playing || data.progress_ms == null) return data;
  return { ...data, progress_ms: data.progress_ms + (Date.now() - at) };
}

function toSongMetadata(track: SpotifyFullTrack) {
  return {
    durationMs: track.duration_ms ?? null,
    explicit: track.explicit ?? null,
    trackNumber: track.track_number ?? null,
    albumName: track.album?.name ?? null,
    albumType: track.album?.album_type ?? null,
    albumTotalTracks: track.album?.total_tracks ?? null,
    releaseDate: track.album?.release_date ?? null,
    releaseDatePrecision: track.album?.release_date_precision ?? null,
    metadataFetchedAt: new Date(),
  };
}

@Injectable()
export class SpotifyService {
  /** Only log the audio-features restriction once per process. */
  private static audioFeaturesWarned = false;

  private readonly clientId: string;

  /**
   * Access tokens by user, so polling endpoints don't read the DB on every call.
   * Per process — fine for a single backend instance; with several, each one
   * just warms its own copy.
   */
  private readonly tokenCache = new Map<
    string,
    { accessToken: string; expiresAt: number }
  >();
  /** One refresh per user at a time; concurrent callers share the promise. */
  private readonly refreshInFlight = new Map<string, Promise<string>>();

  /**
   * Last currently-playing answer per user. Several tabs and components poll
   * this endpoint; within the TTL they all share one Spotify request.
   */
  private readonly currentTrackCache = new Map<
    string,
    { data: SpotifyCurrentlyPlayingResponse | null; at: number }
  >();
  private readonly currentTrackInFlight = new Map<
    string,
    Promise<SpotifyCurrentlyPlayingResponse | null>
  >();
  /** Per-user Retry-After deadline after Spotify answered 429. */
  private readonly rateLimitedUntil = new Map<string, number>();
  private static readonly CURRENT_TRACK_TTL_MS = 1_500;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // Every endpoint this service calls needs its scope listed here, or Spotify
  // answers 403 and the caller sees an empty list instead of an error.
  private readonly scope = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-recently-played',
    'playlist-modify-public',
    // getLikedTracks → GET /me/tracks
    'user-library-read',
    // getPlaylists → GET /me/playlists (private ones are the point)
    'playlist-read-private',
    'playlist-read-collaborative',
  ].join(' ');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional()
    @InjectQueue(LYRICS_FETCH_QUEUE)
    private readonly lyricsQueue: Queue | null,
  ) {
    this.clientId = config.getOrThrow('SPOTIFY_CLIENT_ID');
    this.clientSecret = config.getOrThrow('SPOTIFY_CLIENT_SECRET');
    this.redirectUri = config.getOrThrow('SPOTIFY_REDIRECT_URI');
  }

  /** Returns the Spotify authorization URL. Frontend navigates the browser there. */
  buildAuthUrl(userId: string): string {
    const state = this.encodeState(userId);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: this.scope,
      redirect_uri: this.redirectUri,
      state,
    });
    return `https://accounts.spotify.com/authorize?${params}`;
  }

  /** Exchanges authorization code for tokens, fetches Spotify profile, upserts DB record. */
  async handleCallback(code: string, state: string): Promise<void> {
    const userId = this.decodeState(state);

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw new UnauthorizedException('Spotify token exchange failed');
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) {
      throw new UnauthorizedException('Spotify profile lookup failed');
    }

    const profile = (await profileRes.json()) as { id: string };
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await this.prisma.spotifyToken.upsert({
      where: { userId },
      create: {
        userId,
        spotifyId: profile.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
      update: {
        spotifyId: profile.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
    });
    this.tokenCache.set(userId, {
      accessToken: tokens.access_token,
      expiresAt: expiresAt.getTime(),
    });
  }

  async getStatus(userId: string) {
    const token = await this.prisma.spotifyToken.findUnique({
      where: { userId },
      select: { spotifyId: true, expiresAt: true },
    });
    return { connected: !!token, spotifyId: token?.spotifyId ?? null };
  }

  async disconnect(userId: string): Promise<void> {
    this.tokenCache.delete(userId);
    this.currentTrackCache.delete(userId);
    await this.prisma.spotifyToken.deleteMany({ where: { userId } });
  }

  /** Drops the cached token, e.g. after Spotify rejected it with a 401. */
  invalidateAccessToken(userId: string): void {
    this.tokenCache.delete(userId);
  }

  /**
   * Returns a valid Spotify access token for the user, refreshing it when it
   * is about to expire. Served from memory while valid; concurrent refreshes
   * for the same user collapse into one request.
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const cached = this.tokenCache.get(userId);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.accessToken;
    }

    const inFlight = this.refreshInFlight.get(userId);
    if (inFlight) return inFlight;

    const pending = this.loadOrRefreshToken(userId).finally(() =>
      this.refreshInFlight.delete(userId),
    );
    this.refreshInFlight.set(userId, pending);
    return pending;
  }

  private async loadOrRefreshToken(userId: string): Promise<string> {
    const record = await this.prisma.spotifyToken.findUnique({
      where: { userId },
    });

    if (!record) {
      this.tokenCache.delete(userId);
      throw new NotFoundException('Spotify not connected');
    }

    // Still valid in the DB (1-minute buffer) — e.g. first call after a restart
    if (record.expiresAt.getTime() > Date.now() + 60_000) {
      this.tokenCache.set(userId, {
        accessToken: record.accessToken,
        expiresAt: record.expiresAt.getTime(),
      });
      return record.accessToken;
    }

    const refreshRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: record.refreshToken,
      }),
    });

    if (!refreshRes.ok) {
      const body = (await refreshRes.json().catch(() => ({}))) as {
        error?: string;
      };
      // Only a revoked/invalid refresh token is unrecoverable. A 429 or 5xx
      // from Spotify is transient — deleting the row there forced users to
      // reconnect for nothing.
      if (body.error === 'invalid_grant') {
        this.tokenCache.delete(userId);
        await this.prisma.spotifyToken.deleteMany({ where: { userId } });
        // 403, not 401: the frontend treats every 401 as an expired *app*
        // session and logs the user out.
        throw new ForbiddenException({
          message: 'Spotify session expired — please reconnect',
          code: 'SPOTIFY_RECONNECT_REQUIRED',
        });
      }
      throw new ServiceUnavailableException(
        'Spotify is temporarily unavailable',
      );
    }

    const refreshed = (await refreshRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await this.prisma.spotifyToken.update({
      where: { userId },
      data: {
        accessToken: refreshed.access_token,
        // Spotify sometimes rotates the refresh token
        ...(refreshed.refresh_token
          ? { refreshToken: refreshed.refresh_token }
          : {}),
        expiresAt,
      },
    });
    this.tokenCache.set(userId, {
      accessToken: refreshed.access_token,
      expiresAt: expiresAt.getTime(),
    });

    return refreshed.access_token;
  }

  async getCurrentTrack(
    userId: string,
  ): Promise<SpotifyCurrentlyPlayingResponse | null> {
    const cached = this.currentTrackCache.get(userId);
    if (
      cached &&
      Date.now() - cached.at < SpotifyService.CURRENT_TRACK_TTL_MS
    ) {
      return withElapsedProgress(cached.data, cached.at);
    }

    const blockedUntil = this.rateLimitedUntil.get(userId) ?? 0;
    if (blockedUntil > Date.now()) {
      throw rateLimited(Math.ceil((blockedUntil - Date.now()) / 1000));
    }

    const inFlight = this.currentTrackInFlight.get(userId);
    if (inFlight) return inFlight;

    const pending = this.fetchCurrentTrack(userId)
      .then((data) => {
        this.currentTrackCache.set(userId, { data, at: Date.now() });
        return data;
      })
      .finally(() => this.currentTrackInFlight.delete(userId));
    this.currentTrackInFlight.set(userId, pending);
    return pending;
  }

  private async fetchCurrentTrack(
    userId: string,
    retried = false,
  ): Promise<SpotifyCurrentlyPlayingResponse | null> {
    const accessToken = await this.getValidAccessToken(userId);

    const res = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (res.status === 204) return null; // Nothing playing
    if (res.status === 401 && !retried) {
      // The cached token was revoked or expired early — reload it once.
      this.invalidateAccessToken(userId);
      return this.fetchCurrentTrack(userId, true);
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after')) || 5;
      this.rateLimitedUntil.set(userId, Date.now() + retryAfter * 1000);
      throw rateLimited(retryAfter);
    }
    if (!res.ok) throw new Error('Failed to fetch current track from Spotify');

    return (await res.json()) as SpotifyCurrentlyPlayingResponse;
  }

  /**
   * One track from the catalogue, shaped as `Song` create data. Null when
   * Spotify doesn't know the id (or the user has no working session) — callers
   * treat that as "not found" rather than an error.
   */
  async getTrackAsSong(
    userId: string,
    spotifyId: string,
  ): Promise<Prisma.SongCreateInput | null> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      const res = await fetch(
        `https://api.spotify.com/v1/tracks/${encodeURIComponent(spotifyId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return null;

      const track = (await res.json()) as SpotifyFullTrack;
      const artists = track.artists?.map((a) => a.name) ?? [];
      return {
        spotifyId,
        title: track.name ?? '',
        artist: artists[0] ?? '',
        artists,
        imgUrl: track.album?.images?.[0]?.url ?? null,
        spotifyUrl: `https://open.spotify.com/track/${spotifyId}`,
        ...toSongMetadata(track),
      };
    } catch {
      return null;
    }
  }

  async seek(userId: string, positionMs: number): Promise<void> {
    // The next poll must see the new position, not a cached one.
    this.currentTrackCache.delete(userId);
    const accessToken = await this.getValidAccessToken(userId);
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`,
      { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok && res.status !== 204) {
      throw new Error('Spotify seek failed');
    }
  }

  // ── Play history ────────────────────────────────────────────────────────────

  async recordPlay(
    userId: string,
    dto: {
      spotifyId: string;
      track: string;
      artist: string;
      artists: string[];
      imgUrl?: string | null;
    },
  ): Promise<void> {
    // Dedup: skip if same song was recorded for this user within the last 5 minutes
    const since = new Date(Date.now() - 5 * 60 * 1000);
    const recent = await this.prisma.playHistory.findFirst({
      where: { userId, spotifyId: dto.spotifyId, playedAt: { gte: since } },
      select: { id: true },
    });
    if (recent) return;

    await this.prisma.playHistory.create({
      data: {
        userId,
        spotifyId: dto.spotifyId,
        track: dto.track,
        artist: dto.artist,
        artists: dto.artists,
        imgUrl: dto.imgUrl ?? null,
      },
    });

    await this.promoteRepeatedPlay(userId, dto);
  }

  /**
   * Turns a track you keep coming back to into a shared `Song`.
   *
   * Deliberately does NOT create a `SavedLyric`: that is the personal bookmark
   * and it already suffers from being auto-created on every search, which makes
   * "my collection" mean "everything I ever glanced at". `Song` is the shared
   * canonical entity — creating it enriches the library, the artist network and
   * lyrics lookup without claiming anything belongs to anyone.
   *
   * The second play is the filter: a track skipped after ten seconds is
   * recorded once and never promoted.
   */
  private async promoteRepeatedPlay(
    userId: string,
    dto: {
      spotifyId: string;
      track: string;
      artist: string;
      artists: string[];
      imgUrl?: string | null;
    },
  ): Promise<void> {
    const existing = await this.prisma.song.findUnique({
      where: { spotifyId: dto.spotifyId },
      select: { id: true },
    });
    if (existing) return;

    const plays = await this.prisma.playHistory.count({
      where: { userId, spotifyId: dto.spotifyId },
    });
    if (plays < 2) return;

    await this.prisma.song.create({
      data: {
        spotifyId: dto.spotifyId,
        title: dto.track,
        artist: dto.artist,
        artists: dto.artists,
        imgUrl: dto.imgUrl ?? null,
        spotifyUrl: `https://open.spotify.com/track/${dto.spotifyId}`,
      },
    });
  }

  async syncRecentlyPlayed(userId: string): Promise<{ synced: number }> {
    const token = await this.getValidAccessToken(userId);
    const res = await fetch(
      'https://api.spotify.com/v1/me/player/recently-played?limit=50',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok)
      throw new Error('Failed to fetch recently played from Spotify');

    const data = (await res.json()) as {
      items: {
        track: SpotifyTrackObject;
        played_at: string;
      }[];
    };

    let synced = 0;
    for (const item of data.items) {
      if (!item.track?.id) continue;
      const playedAt = new Date(item.played_at);

      // Skip if already stored (±1 s tolerance)
      const existing = await this.prisma.playHistory.findFirst({
        where: {
          userId,
          spotifyId: item.track.id,
          playedAt: {
            gte: new Date(playedAt.getTime() - 1000),
            lte: new Date(playedAt.getTime() + 1000),
          },
        },
        select: { id: true },
      });
      if (existing) continue;

      await this.prisma.playHistory.create({
        data: {
          userId,
          spotifyId: item.track.id,
          track: item.track.name,
          artist: item.track.artists[0]?.name ?? '',
          artists: item.track.artists.map((a) => a.name),
          imgUrl: item.track.album.images[0]?.url ?? null,
          playedAt,
        },
      });
      synced++;
    }
    return { synced };
  }

  async getPlayHistory(userId: string, limit = 100) {
    return this.prisma.playHistory.findMany({
      where: { userId },
      orderBy: { playedAt: 'desc' },
      take: limit,
    });
  }

  /** Turn a play history entry into a proper Song + SavedLyric bookmark. */
  async importPlayToLibrary(
    userId: string,
    spotifyId: string,
  ): Promise<{ imported: boolean }> {
    const play = await this.prisma.playHistory.findFirst({
      where: { userId, spotifyId },
      orderBy: { playedAt: 'desc' },
      select: { track: true, artist: true, artists: true, imgUrl: true },
    });

    if (!play) {
      throw new NotFoundException('No play history entry found for this track');
    }

    const song = await this.prisma.song.upsert({
      where: { spotifyId },
      create: {
        spotifyId,
        title: play.track,
        artist: play.artist,
        artists: play.artists,
        imgUrl: play.imgUrl,
        spotifyUrl: `https://open.spotify.com/track/${spotifyId}`,
      },
      update: { imgUrl: play.imgUrl },
      select: { id: true, fetchStatus: true },
    });

    const existing = await this.prisma.savedLyric.findUnique({
      where: { userId_songId: { userId, songId: song.id } },
      select: { id: true },
    });
    if (existing) return { imported: false };

    await this.prisma.savedLyric.create({ data: { userId, songId: song.id } });

    if (song.fetchStatus === 'IDLE' && this.lyricsQueue) {
      await this.prisma.song.update({
        where: { id: song.id },
        data: { fetchStatus: 'FETCHING' },
      });
      await this.lyricsQueue.add(
        'fetch',
        { songId: song.id, spotifyId, track: play.track, artist: play.artist },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
        },
      );
    }

    return { imported: true };
  }

  // ── Audio features ──────────────────────────────────────────────────────────

  async getAudioFeatures(
    userId: string,
    spotifyId: string,
  ): Promise<AudioFeatures | null> {
    // Return cached value if already stored on Song
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { audioFeatures: true },
    });
    if (song?.audioFeatures)
      return song.audioFeatures as unknown as AudioFeatures;

    // Fetch from Spotify API
    const token = await this.getValidAccessToken(userId);
    const res = await fetch(
      `https://api.spotify.com/v1/audio-features/${spotifyId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) {
      // Spotify restricted /audio-features for apps registered after
      // 2024-11-27. A silent null made this look like "no data yet" forever —
      // say it once so it is diagnosable instead of invisible.
      if (!SpotifyService.audioFeaturesWarned) {
        SpotifyService.audioFeaturesWarned = true;
        Logger.warn(
          `/audio-features returned ${res.status}. Spotify restricts this endpoint for apps registered after 2024-11-27; tempo/energy/valence will stay empty.`,
          'SpotifyService',
        );
      }
      return null;
    }

    const data = (await res.json()) as {
      tempo: number;
      energy: number;
      valence: number;
      danceability: number;
    };
    const features: AudioFeatures = {
      tempo: data.tempo,
      energy: data.energy,
      valence: data.valence,
      danceability: data.danceability,
    };

    // Cache on Song record if it exists
    await this.prisma.song.updateMany({
      where: { spotifyId },
      data: { audioFeatures: features as object },
    });

    return features;
  }

  // ── Library browsing ────────────────────────────────────────────────────────

  async getLikedTracks(
    userId: string,
    offset = 0,
    limit = 50,
  ): Promise<SpotifyPage<{ track: SpotifyTrackObject; added_at: string }>> {
    const token = await this.getValidAccessToken(userId);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`https://api.spotify.com/v1/me/tracks?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch liked tracks');
    return (await res.json()) as SpotifyPage<{
      track: SpotifyTrackObject;
      added_at: string;
    }>;
  }

  async getPlaylists(
    userId: string,
    offset = 0,
    limit = 50,
  ): Promise<
    SpotifyPage<{
      id: string;
      name: string;
      description: string | null;
      images: { url: string }[];
      tracks: { total: number };
      owner: { display_name: string };
    }>
  > {
    const token = await this.getValidAccessToken(userId);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(
      `https://api.spotify.com/v1/me/playlists?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) throw new Error('Failed to fetch playlists');

    // February 2026 renamed the playlist object's `tracks` field to `items`.
    // Accept either and hand the frontend the shape it already knows.
    const page = (await res.json()) as SpotifyPage<{
      id: string;
      name: string;
      description: string | null;
      images: { url: string }[];
      tracks?: { total: number };
      items?: { total: number };
      owner: { display_name: string };
    }>;

    return {
      ...page,
      items: page.items.map(({ items, tracks, ...playlist }) => ({
        ...playlist,
        tracks: { total: items?.total ?? tracks?.total ?? 0 },
      })),
    };
  }

  async getPlaylistTracks(
    userId: string,
    playlistId: string,
    offset = 0,
    limit = 50,
  ): Promise<
    SpotifyPage<{ track: SpotifyTrackObject | null; added_at: string }>
  > {
    const token = await this.getValidAccessToken(userId);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    // `/tracks` is deprecated in favour of `/items` (February 2026 rename).
    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/items?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch playlist tracks');
    return (await res.json()) as SpotifyPage<{
      track: SpotifyTrackObject | null;
      added_at: string;
    }>;
  }

  // ── Track metadata enrichment ───────────────────────────────────────────────

  /** How many songs still have no Spotify metadata. */
  async getEnrichmentStatus(): Promise<{
    total: number;
    enriched: number;
    remaining: number;
  }> {
    const [total, enriched] = await Promise.all([
      this.prisma.song.count(),
      this.prisma.song.count({ where: { metadataFetchedAt: { not: null } } }),
    ]);
    return { total, enriched, remaining: total - enriched };
  }

  /**
   * Fills in release date, duration, album and explicit flag for songs that
   * have none.
   *
   * February 2026 removed the multi-get endpoints, so this is one request per
   * track — deliberately capped per call and paced, so a few hundred songs
   * become a handful of quick calls rather than one request that hangs for
   * minutes. A track that 404s is still marked as fetched; otherwise it would
   * be retried on every single run forever.
   */
  async enrichTrackMetadata(
    userId: string,
    batchSize = 100,
  ): Promise<{ processed: number; failed: number; remaining: number }> {
    const pending = await this.prisma.song.findMany({
      where: { metadataFetchedAt: null },
      select: { id: true, spotifyId: true },
      orderBy: { firstSeenAt: 'desc' },
      take: batchSize,
    });
    if (!pending.length) {
      const { remaining } = await this.getEnrichmentStatus();
      return { processed: 0, failed: 0, remaining };
    }

    const token = await this.getValidAccessToken(userId);
    let processed = 0;
    let failed = 0;

    for (const song of pending) {
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/tracks/${song.spotifyId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.status === 429) {
          // Respect the backoff and stop this batch — the next call resumes.
          const retryAfter = Number(res.headers.get('retry-after') ?? '2');
          Logger.warn(
            `Rate limited while enriching; stopping batch, retry in ${retryAfter}s`,
            'SpotifyService',
          );
          break;
        }

        if (!res.ok) {
          // Unavailable in this market, removed, or a bad id — record the
          // attempt so the queue drains instead of looping on it.
          await this.prisma.song.update({
            where: { id: song.id },
            data: { metadataFetchedAt: new Date() },
          });
          failed++;
          continue;
        }

        const track = (await res.json()) as SpotifyFullTrack;

        await this.prisma.song.update({
          where: { id: song.id },
          data: toSongMetadata(track),
        });
        processed++;
      } catch {
        failed++;
      }

      // ~4 requests/second keeps a few hundred songs comfortably inside
      // Spotify's rolling window.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const { remaining } = await this.getEnrichmentStatus();
    return { processed, failed, remaining };
  }

  // ── Bulk import ─────────────────────────────────────────────────────────────

  async bulkImport(
    userId: string,
    tracks: BulkImportTrackDto[],
  ): Promise<{ imported: number; alreadyExisted: number }> {
    let imported = 0;
    let alreadyExisted = 0;

    for (const track of tracks) {
      const artist = track.artists[0]?.name ?? '';
      const artists = track.artists.map((a) => a.name);
      const imgUrl = track.album.images[0]?.url ?? null;

      // Upsert the shared Song record
      const song = await this.prisma.song.upsert({
        where: { spotifyId: track.id },
        create: {
          spotifyId: track.id,
          title: track.name,
          artist,
          artists,
          imgUrl,
          spotifyUrl: track.external_urls.spotify,
        },
        update: { artists, imgUrl, spotifyUrl: track.external_urls.spotify },
        select: { id: true, fetchStatus: true },
      });

      // Create per-user bookmark (skip if already saved)
      const existing = await this.prisma.savedLyric.findUnique({
        where: { userId_songId: { userId, songId: song.id } },
        select: { id: true },
      });

      if (existing) {
        alreadyExisted++;
      } else {
        await this.prisma.savedLyric.create({
          data: { userId, songId: song.id },
        });
        imported++;

        // Queue lyrics fetch if song has no lyrics yet
        if (song.fetchStatus === 'IDLE' && this.lyricsQueue) {
          await this.prisma.song.update({
            where: { id: song.id },
            data: { fetchStatus: 'FETCHING' },
          });
          await this.lyricsQueue.add(
            'fetch',
            {
              songId: song.id,
              spotifyId: track.id,
              track: track.name,
              artist,
              durationMs: track.duration_ms,
            },
            {
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 },
              removeOnComplete: true,
            },
          );
        }
      }
    }

    return { imported, alreadyExisted };
  }

  // ---------------------------------------------------------------------------
  // State encoding: base64url(userId:timestamp:hmac[:8])
  // Expires after 10 minutes; verified against JWT_SECRET to prevent forgery.
  // ---------------------------------------------------------------------------

  private encodeState(userId: string): string {
    const ts = Date.now().toString();
    const payload = `${userId}:${ts}`;
    const sig = createHmac('sha256', this.config.getOrThrow('JWT_SECRET'))
      .update(payload)
      .digest('hex')
      .slice(0, 16);
    return Buffer.from(`${payload}:${sig}`).toString('base64url');
  }

  private decodeState(state: string): string {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length !== 3) throw new Error('bad format');

      const [userId, ts, sig] = parts;

      if (Date.now() - parseInt(ts) > 10 * 60 * 1000) {
        throw new Error('state expired');
      }

      const expected = createHmac(
        'sha256',
        this.config.getOrThrow('JWT_SECRET'),
      )
        .update(`${userId}:${ts}`)
        .digest('hex')
        .slice(0, 16);

      if (sig !== expected) throw new Error('invalid signature');

      return userId;
    } catch {
      throw new UnauthorizedException('Invalid OAuth state parameter');
    }
  }
}
