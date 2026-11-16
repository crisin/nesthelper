import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTokenGuard } from './api-token.guard';
import { ApiTokensService } from './api-tokens.service';
import { VizzyService } from './vizzy.service';
import { VizzyTakeDto } from './vizzy-take.dto';
import { VizzyTakesService } from './vizzy-takes.service';

type AuthedRequest = { user: { id: string } };

export class CreateApiTokenDto {
  @IsString()
  @MaxLength(60)
  name: string;
}

export class VizzySongQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  spotifyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  artist?: string;
}

/** Managing your own tokens — needs a normal login. */
@Controller('api-tokens')
@UseGuards(JwtAuthGuard)
export class ApiTokensController {
  constructor(private readonly tokens: ApiTokensService) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.tokens.list(req.user.id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateApiTokenDto) {
    return this.tokens.create(req.user.id, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.tokens.revoke(req.user.id, id);
  }
}

/** For the vizzy visualizer, with an API token: song lookup, and takes
 *  (what it heard) coming back. */
@Controller('integrations/vizzy')
@UseGuards(ApiTokenGuard)
export class VizzyController {
  constructor(
    private readonly vizzy: VizzyService,
    private readonly takes: VizzyTakesService,
  ) {}

  /** Cheap check that URL and token work. */
  @Get('ping')
  ping(@Req() req: AuthedRequest) {
    return { ok: true, userId: req.user.id };
  }

  @Get('song')
  song(@Req() req: AuthedRequest, @Query() q: VizzySongQueryDto) {
    return this.vizzy.song(req.user.id, q);
  }

  /** A take: the lines vizzy heard during one song, with song times. Kept
   *  next to the song as a draft; the lyrics themselves stay untouched. */
  @Post('takes')
  take(@Req() req: AuthedRequest, @Body() dto: VizzyTakeDto) {
    return this.takes.store(req.user.id, dto);
  }
}
