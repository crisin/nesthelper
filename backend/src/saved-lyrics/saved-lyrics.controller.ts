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
}
