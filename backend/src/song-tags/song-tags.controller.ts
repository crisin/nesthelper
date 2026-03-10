import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AddTagDto } from '../saved-lyrics/dto/add-tag.dto'
import { SongTagsService } from './song-tags.service'

type AuthedRequest = { user: { id: string } }

@Controller('songs')
@UseGuards(JwtAuthGuard)
export class SongTagsController {
  constructor(private readonly service: SongTagsService) {}

  @Get(':spotifyId/tags')
  getTags(@Param('spotifyId') spotifyId: string) {
    return this.service.getTags(spotifyId)
  }

  @Post(':spotifyId/tags')
  addTag(
    @Req() req: AuthedRequest,
    @Param('spotifyId') spotifyId: string,
    @Body() dto: AddTagDto,
  ) {
    return this.service.addTag(req.user.id, spotifyId, dto)
  }

  @Delete(':spotifyId/tags/:tag')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTag(
    @Param('spotifyId') spotifyId: string,
    @Param('tag') tag: string,
  ) {
    return this.service.removeTag(spotifyId, tag)
  }
}
