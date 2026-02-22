import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

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
    'playlist-modify-public',
  ].join(' ');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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

  async getCurrentTrack(userId: string) {
    const accessToken = await this.getValidAccessToken(userId);

    const res = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (res.status === 204) return null; // Nothing playing
    if (!res.ok) throw new Error('Failed to fetch current track from Spotify');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return res.json();
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
