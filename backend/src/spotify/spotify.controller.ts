import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpotifyService } from './spotify.service';

type AuthedRequest = { user: { id: string } };

@Controller('spotify')
export class SpotifyController {
  constructor(
    private readonly spotify: SpotifyService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Returns the Spotify authorization URL as JSON.
   * The frontend fetches this (with Bearer token) then navigates the browser to the URL.
   */
  @Get('connect')
  @UseGuards(JwtAuthGuard)
  getConnectUrl(@Req() req: AuthedRequest) {
    const url = this.spotify.buildAuthUrl(req.user.id);
    return { url };
  }

  /**
   * Spotify redirects the browser here after the user authorizes.
   * We exchange the code, save tokens, then redirect back to the frontend.
   */
  @Get('callback')
  @Redirect()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
  ) {
    const base = this.config.get('FRONTEND_URL') ?? 'http://127.0.0.1:5173';

    if (error || !code || !state) {
      return { url: `${base}/dashboard?spotify=error` };
    }

    try {
      await this.spotify.handleCallback(code, state);
      return { url: `${base}/dashboard?spotify=connected` };
    } catch {
      return { url: `${base}/dashboard?spotify=error` };
    }
  }

  /** Returns whether the current user has a Spotify connection saved. */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  status(@Req() req: AuthedRequest) {
    return this.spotify.getStatus(req.user.id);
  }

  /** Removes the stored Spotify tokens for the current user. */
  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@Req() req: AuthedRequest) {
    await this.spotify.disconnect(req.user.id);
  }

  /** Returns the currently playing track from Spotify (auto-refreshes token if needed). */
  @Get('current-track')
  @UseGuards(JwtAuthGuard)
  currentTrack(@Req() req: AuthedRequest) {
    return this.spotify.getCurrentTrack(req.user.id);
  }
}
