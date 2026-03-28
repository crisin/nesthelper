import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertNoteDto } from './dto/upsert-note.dto';
import { UpdateArtistColorsDto } from './dto/update-artist-colors.dto';
import { SavedLyricsService } from './saved-lyrics.service';

type AuthedRequest = { user: { id: string } };

@Controller('saved-lyrics')
@UseGuards(JwtAuthGuard)
export class SavedLyricsController {
  constructor(private readonly service: SavedLyricsService) {}

  // ─── Static routes first (before /:id) ────────────────────────────────────

  @Get()
  getAll(@Req() req: AuthedRequest) {
    return this.service.getAll(req.user.id);
  }

  @Get('favorites')
  getFavorites(@Req() req: AuthedRequest) {
    return this.service.getFavorites(req.user.id);
  }

  @Get('by-spotify/:spotifyId')
  ensureBySpotify(
    @Req() req: AuthedRequest,
    @Param('spotifyId') spotifyId: string,
  ) {
    return this.service.ensureBySpotifyId(req.user.id, spotifyId);
  }

  @Post('favorite/:spotifyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  addFavorite(
    @Req() req: AuthedRequest,
    @Param('spotifyId') spotifyId: string,
  ) {
    return this.service.setFavorite(req.user.id, spotifyId, true);
  }

  @Delete('favorite/:spotifyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFavorite(
    @Req() req: AuthedRequest,
    @Param('spotifyId') spotifyId: string,
  ) {
    return this.service.setFavorite(req.user.id, spotifyId, false);
  }

  // ─── Instance routes ───────────────────────────────────────────────────────

  @Get(':id')
  getOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.getOne(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }

  @Patch(':id/note')
  upsertNote(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpsertNoteDto,
  ) {
    return this.service.upsertNote(req.user.id, id, dto.text);
  }

  @Patch(':id/artist-colors')
  updateArtistColors(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateArtistColorsDto,
  ) {
    return this.service.updateArtistColors(req.user.id, id, dto.artistColors);
  }
}
