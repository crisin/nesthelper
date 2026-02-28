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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
import { SearchHistoryService } from './search-history.service';

type AuthedRequest = { user: { id: string } };

@Controller('search-history')
@UseGuards(JwtAuthGuard)
export class SearchHistoryController {
  constructor(private readonly service: SearchHistoryService) {}

  @Get()
  getAll(@Req() req: AuthedRequest) {
    return this.service.getAll(req.user.id);
  }

  /** Returns the last 100 searches across all users (for the community feed). */
  @Get('global')
  getGlobal() {
    return this.service.getGlobal();
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateSearchHistoryDto) {
    return this.service.create(req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
