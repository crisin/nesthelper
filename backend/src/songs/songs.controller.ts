import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { SongsService } from './songs.service'
import { LineAnnotationsService, UpsertAnnotationDto } from '../line-annotations/line-annotations.service'
import { SongNotesService } from '../song-notes/song-notes.service'

type AuthedRequest = { user: { id: string } }

@Controller('songs')
@UseGuards(JwtAuthGuard)
export class SongsController {
  constructor(
    private readonly service: SongsService,
    private readonly annotations: LineAnnotationsService,
    private readonly notes: SongNotesService,
  ) {}

  // ── Song CRUD ──────────────────────────────────────────────────────────────

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

  /** GET /songs/:spotifyId/exists — always 200, used by SongAction to avoid console 404s */
  @Get(':spotifyId/exists')
  async exists(@Param('spotifyId') spotifyId: string) {
    const song = await this.service.getBySpotifyId(spotifyId)
    return { exists: !!song }
  }

  /** GET /songs/:spotifyId/insights */
  @Get(':spotifyId/insights')
  getInsights(@Param('spotifyId') spotifyId: string) {
    return this.service.getInsights(spotifyId)
  }

  /** PATCH /songs/:spotifyId/video */
  @Patch(':spotifyId/video')
  @HttpCode(HttpStatus.OK)
  updateVideoUrl(
    @Param('spotifyId') spotifyId: string,
    @Body('url') url: string,
  ) {
    return this.service.updateVideoUrl(spotifyId, url ?? '')
  }

  // ── Annotations ───────────────────────────────────────────────────────────

  /** GET /songs/:spotifyId/annotations → Record<lineId, AnnotationWithUser[]> */
  @Get(':spotifyId/annotations')
  getAnnotations(@Param('spotifyId') spotifyId: string) {
    return this.annotations.getForSong(spotifyId)
  }

  /** PUT /songs/:spotifyId/annotations/:lineId — upsert own annotation */
  @Put(':spotifyId/annotations/:lineId')
  upsertAnnotation(
    @Req() req: AuthedRequest,
    @Param('lineId') lineId: string,
    @Body() dto: UpsertAnnotationDto,
  ) {
    return this.annotations.upsert(req.user.id, lineId, dto)
  }

  /** DELETE /songs/:spotifyId/annotations/:lineId — delete own annotation */
  @Delete(':spotifyId/annotations/:lineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAnnotation(
    @Req() req: AuthedRequest,
    @Param('lineId') lineId: string,
  ) {
    return this.annotations.removeByLine(req.user.id, lineId)
  }

  // ── Song notes ────────────────────────────────────────────────────────────

  /** GET /songs/:spotifyId/notes → SongNoteWithUser[] */
  @Get(':spotifyId/notes')
  getNotes(@Param('spotifyId') spotifyId: string) {
    return this.notes.getForSong(spotifyId)
  }

  /** PUT /songs/:spotifyId/notes — upsert own note */
  @Put(':spotifyId/notes')
  upsertNote(
    @Req() req: AuthedRequest,
    @Param('spotifyId') spotifyId: string,
    @Body('text') text: string,
  ) {
    return this.notes.upsert(req.user.id, spotifyId, text ?? '')
  }

  /** DELETE /songs/:spotifyId/notes — delete own note */
  @Delete(':spotifyId/notes')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeNote(
    @Req() req: AuthedRequest,
    @Param('spotifyId') spotifyId: string,
  ) {
    return this.notes.remove(req.user.id, spotifyId)
  }
}
