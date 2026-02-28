import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DigestService } from './digest.service';

type AuthedRequest = { user: { id: string } };

@Controller('digest')
@UseGuards(JwtAuthGuard)
export class DigestController {
  constructor(private readonly digest: DigestService) {}

  @Get('latest')
  getLatest(@Req() req: AuthedRequest) {
    return this.digest.getLatest(req.user.id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.digest.markRead(req.user.id, id);
  }
}
