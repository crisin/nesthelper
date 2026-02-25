import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

type AuthedRequest = { user: { id: string } };

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly service: SearchService) {}

  /** GET /search?q=sometext */
  @Get()
  search(@Req() req: AuthedRequest, @Query('q') q = '') {
    return this.service.search(req.user.id, q);
  }
}
