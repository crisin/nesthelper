import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

type AuthedRequest = { user: { id: string } };

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('me/words')
  getTopWords(@Req() req: AuthedRequest) {
    return this.analytics.getTopWords(req.user.id);
  }

  @Get('me/emotions')
  getEmotions(@Req() req: AuthedRequest) {
    return this.analytics.getEmotions(req.user.id);
  }

  @Get('me/artists')
  getArtists(@Req() req: AuthedRequest) {
    return this.analytics.getArtists(req.user.id);
  }

  @Get('me/themes')
  getThemes(@Req() req: AuthedRequest) {
    return this.analytics.getThemes(req.user.id);
  }

  @Get('me/timeline')
  getTimeline(@Req() req: AuthedRequest) {
    return this.analytics.getTimeline(req.user.id);
  }
}
