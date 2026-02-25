import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LibraryService } from './library.service';

@Controller('library')
@UseGuards(JwtAuthGuard)
export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id/lyrics')
  getLyrics(@Param('id') id: string) {
    return this.service.getLyrics(id);
  }

  @Get('by-spotify/:spotifyId/insights')
  getInsights(@Param('spotifyId') spotifyId: string) {
    return this.service.getInsights(spotifyId);
  }
}
