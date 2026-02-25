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
import { CreateSavedLyricDto } from './dto/create-saved-lyric.dto';
import { UpdateSavedLyricDto } from './dto/update-saved-lyric.dto';
import { AddTagDto } from './dto/add-tag.dto';
import { UpsertNoteDto } from './dto/upsert-note.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { SavedLyricsService } from './saved-lyrics.service';

type AuthedRequest = { user: { id: string } };

@Controller('saved-lyrics')
@UseGuards(JwtAuthGuard)
export class SavedLyricsController {
  constructor(private readonly service: SavedLyricsService) {}

  @Get()
  getAll(@Req() req: AuthedRequest) {
    return this.service.getAll(req.user.id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateSavedLyricDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  updateLyrics(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSavedLyricDto,
  ) {
    return this.service.updateLyrics(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }

  // ─── Note ─────────────────────────────────────────────────────────────────

  @Patch(':id/note')
  upsertNote(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpsertNoteDto,
  ) {
    return this.service.upsertNote(req.user.id, id, dto.text);
  }

  // ─── Tags ──────────────────────────────────────────────────────────────────

  @Get(':id/tags')
  getTags(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.getTags(req.user.id, id);
  }

  @Post(':id/tags')
  addTag(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: AddTagDto,
  ) {
    return this.service.addTag(req.user.id, id, dto);
  }

  @Delete(':id/tags/:tag')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTag(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('tag') tag: string,
  ) {
    return this.service.removeTag(req.user.id, id, tag);
  }

  // ─── Visibility ────────────────────────────────────────────────────────────

  @Patch(':id/visibility')
  updateVisibility(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateVisibilityDto,
  ) {
    return this.service.updateVisibility(req.user.id, id, dto.visibility);
  }
}
