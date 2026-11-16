import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LyricsTakesService } from './lyrics-takes.service';

type AuthedRequest = { user: { id: string } };

/** The user's takes from vizzy (sent in through /integrations/vizzy/takes). */
@Controller('lyrics-takes')
@UseGuards(JwtAuthGuard)
export class LyricsTakesController {
  constructor(private readonly service: LyricsTakesService) {}

  /** GET /lyrics-takes — all own takes, newest first, without lines */
  @Get()
  list(@Req() req: AuthedRequest) {
    return this.service.list(req.user.id);
  }

  /** GET /lyrics-takes/song/:spotifyId — own takes of one song, with lines */
  @Get('song/:spotifyId')
  forSong(@Req() req: AuthedRequest, @Param('spotifyId') spotifyId: string) {
    return this.service.forSong(req.user.id, spotifyId);
  }

  /** DELETE /lyrics-takes/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
