import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { UpdateSongLyricsDto } from './dto/update-song-lyrics.dto'
import { UpdateTimestampsDto } from './dto/update-timestamps.dto'
import { SongLyricsService } from './song-lyrics.service'

type AuthedRequest = { user: { id: string } }

@Controller('songs')
@UseGuards(JwtAuthGuard)
export class SongLyricsController {
  constructor(private readonly service: SongLyricsService) {}

  /** GET /songs/:spotifyId/lyrics */
  @Get(':spotifyId/lyrics')
  get(@Param('spotifyId') spotifyId: string) {
    return this.service.get(spotifyId)
  }

  /** PUT /songs/:spotifyId/lyrics */
  @Put(':spotifyId/lyrics')
  upsert(
    @Req() req: AuthedRequest,
    @Param('spotifyId') spotifyId: string,
    @Body() dto: UpdateSongLyricsDto,
  ) {
    return this.service.upsert(req.user.id, spotifyId, dto.rawText, dto.version)
  }

  /** POST /songs/:spotifyId/lyrics/restore/:version */
  @Post(':spotifyId/lyrics/restore/:version')
  restore(
    @Req() req: AuthedRequest,
    @Param('spotifyId') spotifyId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.service.restoreVersion(req.user.id, spotifyId, version)
  }

  /** POST /songs/:spotifyId/lyrics/fetch — trigger BullMQ fetch */
  @Post(':spotifyId/lyrics/fetch')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueFetch(@Param('spotifyId') spotifyId: string) {
    return this.service.enqueueFetch(spotifyId)
  }

  /** PATCH /songs/:spotifyId/lyrics/timestamps — update only timestamps, no version bump */
  @Patch(':spotifyId/lyrics/timestamps')
  @HttpCode(HttpStatus.OK)
  updateTimestamps(
    @Param('spotifyId') spotifyId: string,
    @Body() dto: UpdateTimestampsDto,
  ) {
    return this.service.updateTimestamps(spotifyId, dto.lines)
  }

  /** GET /songs/:spotifyId/lyrics/lrclib-preview — fetch LRCLib suggestion without saving */
  @Get(':spotifyId/lyrics/lrclib-preview')
  lrclibPreview(@Param('spotifyId') spotifyId: string) {
    return this.service.lrclibPreview(spotifyId)
  }
}
