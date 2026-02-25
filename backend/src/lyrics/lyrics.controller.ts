import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateLyricsDto } from './dto/update-lyrics.dto';
import { LyricsService } from './lyrics.service';

type AuthedRequest = { user: { id: string } };

@Controller('lyrics')
@UseGuards(JwtAuthGuard)
export class LyricsController {
  constructor(private readonly service: LyricsService) {}

  /** GET /lyrics/:savedLyricId — fetch structured lyrics with lines + version history */
  @Get(':savedLyricId')
  get(@Req() req: AuthedRequest, @Param('savedLyricId') savedLyricId: string) {
    return this.service.get(req.user.id, savedLyricId);
  }

  /** PUT /lyrics/:savedLyricId — save (create or update) structured lyrics */
  @Put(':savedLyricId')
  upsert(
    @Req() req: AuthedRequest,
    @Param('savedLyricId') savedLyricId: string,
    @Body() dto: UpdateLyricsDto,
  ) {
    return this.service.upsert(req.user.id, savedLyricId, dto.rawText);
  }

  /** POST /lyrics/:savedLyricId/restore/:version — restore a past version */
  @Post(':savedLyricId/restore/:version')
  restore(
    @Req() req: AuthedRequest,
    @Param('savedLyricId') savedLyricId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.service.restoreVersion(req.user.id, savedLyricId, version);
  }
}
