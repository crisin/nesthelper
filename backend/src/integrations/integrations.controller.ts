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

/** Read-only song lookup for the vizzy visualizer, with an API token. */
@Controller('integrations/vizzy')
@UseGuards(ApiTokenGuard)
export class VizzyController {
  constructor(private readonly vizzy: VizzyService) {}

  /** Cheap check that URL and token work. */
  @Get('ping')
  ping(@Req() req: AuthedRequest) {
    return { ok: true, userId: req.user.id };
  }

  @Get('song')
  song(@Req() req: AuthedRequest, @Query() q: VizzySongQueryDto) {
    return this.vizzy.song(req.user.id, q);
  }
}
