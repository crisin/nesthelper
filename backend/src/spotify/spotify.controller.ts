import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpotifyService, BulkImportTrackDto } from './spotify.service';

type AuthedRequest = { user: { id: string } };

@Controller('spotify')
export class SpotifyController {
  constructor(
    private readonly spotify: SpotifyService,
    private readonly config: ConfigService,
  ) {}

  @Get('connect')
  @UseGuards(JwtAuthGuard)
  getConnectUrl(@Req() req: AuthedRequest) {
    return { url: this.spotify.buildAuthUrl(req.user.id) };
  }

  @Get('callback')
  @Redirect()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
  ) {
    const base = this.config.get<string>('FRONTEND_URL') ?? 'http://127.0.0.1:5173';
    if (error || !code || !state) return { url: `${base}/dashboard?spotify=error` };
    try {
      await this.spotify.handleCallback(code, state);
      return { url: `${base}/dashboard?spotify=connected` };
    } catch {
      return { url: `${base}/dashboard?spotify=error` };
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(@Req() req: AuthedRequest) {
    return this.spotify.getStatus(req.user.id);
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@Req() req: AuthedRequest) {
    await this.spotify.disconnect(req.user.id);
  }

  @Get('current-track')
  @UseGuards(JwtAuthGuard)
  currentTrack(@Req() req: AuthedRequest) {
    return this.spotify.getCurrentTrack(req.user.id);
  }

  @Post('seek')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  seek(@Req() req: AuthedRequest, @Query('positionMs') positionMs: string) {
    return this.spotify.seek(req.user.id, parseInt(positionMs, 10));
  }

  // ── Library browsing ────────────────────────────────────────────────────────

  /** GET /spotify/library/tracks?offset=0&limit=50 */
  @Get('library/tracks')
  @UseGuards(JwtAuthGuard)
  getLikedTracks(
    @Req() req: AuthedRequest,
    @Query('offset') offset = '0',
    @Query('limit') limit = '50',
  ) {
    return this.spotify.getLikedTracks(req.user.id, parseInt(offset), parseInt(limit));
  }

  /** GET /spotify/library/playlists?offset=0&limit=50 */
  @Get('library/playlists')
  @UseGuards(JwtAuthGuard)
  getPlaylists(
    @Req() req: AuthedRequest,
    @Query('offset') offset = '0',
    @Query('limit') limit = '50',
  ) {
    return this.spotify.getPlaylists(req.user.id, parseInt(offset), parseInt(limit));
  }

  /** GET /spotify/library/playlists/:id/tracks?offset=0&limit=50 */
  @Get('library/playlists/:id/tracks')
  @UseGuards(JwtAuthGuard)
  getPlaylistTracks(
    @Req() req: AuthedRequest,
    @Param('id') playlistId: string,
    @Query('offset') offset = '0',
    @Query('limit') limit = '50',
  ) {
    return this.spotify.getPlaylistTracks(req.user.id, playlistId, parseInt(offset), parseInt(limit));
  }

  /** POST /spotify/library/import — bulk-import tracks as bookmarks */
  @Post('library/import')
  @UseGuards(JwtAuthGuard)
  bulkImport(@Req() req: AuthedRequest, @Body() body: { tracks: BulkImportTrackDto[] }) {
    return this.spotify.bulkImport(req.user.id, body.tracks);
  }

  // ── Play history ─────────────────────────────────────────────────────────────

  /** POST /spotify/plays — record a single play event (called on track change) */
  @Post('plays')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  recordPlay(
    @Req() req: AuthedRequest,
    @Body() body: { spotifyId: string; track: string; artist: string; artists: string[]; imgUrl?: string },
  ) {
    return this.spotify.recordPlay(req.user.id, body);
  }

  /** POST /spotify/sync-history — pull last 50 plays from Spotify recently-played API */
  @Post('sync-history')
  @UseGuards(JwtAuthGuard)
  syncHistory(@Req() req: AuthedRequest) {
    return this.spotify.syncRecentlyPlayed(req.user.id);
  }

  /** GET /spotify/plays?limit=100 */
  @Get('plays')
  @UseGuards(JwtAuthGuard)
  getPlays(@Req() req: AuthedRequest, @Query('limit') limit = '100') {
    return this.spotify.getPlayHistory(req.user.id, parseInt(limit, 10));
  }

  /** POST /spotify/plays/:spotifyId/import — save play history entry as a proper song bookmark */
  @Post('plays/:spotifyId/import')
  @UseGuards(JwtAuthGuard)
  importPlay(@Req() req: AuthedRequest, @Param('spotifyId') spotifyId: string) {
    return this.spotify.importPlayToLibrary(req.user.id, spotifyId);
  }

  // ── Audio features ────────────────────────────────────────────────────────────

  /** GET /spotify/audio-features/:spotifyId */
  @Get('audio-features/:spotifyId')
  @UseGuards(JwtAuthGuard)
  getAudioFeatures(@Req() req: AuthedRequest, @Param('spotifyId') spotifyId: string) {
    return this.spotify.getAudioFeatures(req.user.id, spotifyId);
  }
}
