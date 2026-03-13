import {
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
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

@Injectable()
export class SpotifyService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  private readonly scope = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-recently-played',
    'playlist-modify-public',
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
  }

  async getStatus(userId: string) {
    const token = await this.prisma.spotifyToken.findUnique({
      where: { userId },
      select: { spotifyId: true, expiresAt: true },
    });
    return { connected: !!token, spotifyId: token?.spotifyId ?? null };
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.spotifyToken.deleteMany({ where: { userId } });
  }

  /**
   * Returns a valid Spotify access token for the user.
   * Automatically refreshes if the stored token is expired or about to expire.
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const record = await this.prisma.spotifyToken.findUnique({
      where: { userId },
    });

    if (!record) {
      throw new NotFoundException('Spotify not connected');
    }

    // Return early if token is still valid (1-minute buffer)
    if (record.expiresAt.getTime() > Date.now() + 60_000) {
      return record.accessToken;
    }

    // Refresh the token
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
      // Token is unrecoverable — force the user to reconnect
      await this.prisma.spotifyToken.delete({ where: { userId } });
      throw new UnauthorizedException(
        'Spotify session expired — please reconnect',
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

    return refreshed.access_token;
  }

  async getCurrentTrack(
    userId: string,
  ): Promise<SpotifyCurrentlyPlayingResponse | null> {
    const accessToken = await this.getValidAccessToken(userId);

    const res = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (res.status === 204) return null; // Nothing playing
    if (!res.ok) throw new Error('Failed to fetch current track from Spotify');

    return (await res.json()) as SpotifyCurrentlyPlayingResponse;
  }

  async seek(userId: string, positionMs: number): Promise<void> {
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
    if (!res.ok) return null;

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
    return (await res.json()) as SpotifyPage<{
      id: string;
      name: string;
      description: string | null;
      images: { url: string }[];
      tracks: { total: number };
      owner: { display_name: string };
    }>;
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
    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error('Failed to fetch playlist tracks');
    return (await res.json()) as SpotifyPage<{
      track: SpotifyTrackObject | null;
      added_at: string;
    }>;
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
