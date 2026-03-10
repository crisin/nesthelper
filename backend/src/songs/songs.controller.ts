import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { SongsService } from './songs.service'

@Controller('songs')
@UseGuards(JwtAuthGuard)
export class SongsController {
  constructor(private readonly service: SongsService) {}

  /** GET /songs — all songs (for Discover library tab) */
  @Get()
  getAll() {
    return this.service.getAll()
  }

  /** GET /songs/:spotifyId — full song with lyrics and tags */
  @Get(':spotifyId')
  async getOne(@Param('spotifyId') spotifyId: string) {
    const song = await this.service.getBySpotifyId(spotifyId)
    if (!song) throw new NotFoundException('Song not found')
    return song
  }

  /** GET /songs/:spotifyId/insights — save count, tag distribution, annotated lines */
  @Get(':spotifyId/insights')
  getInsights(@Param('spotifyId') spotifyId: string) {
    return this.service.getInsights(spotifyId)
  }

  /** PATCH /songs/:spotifyId/video — update shared video URL */
  @Patch(':spotifyId/video')
  @HttpCode(HttpStatus.OK)
  updateVideoUrl(
    @Param('spotifyId') spotifyId: string,
    @Body('url') url: string,
  ) {
    return this.service.updateVideoUrl(spotifyId, url ?? '')
  }
}
