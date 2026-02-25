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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateLineAnnotationDto } from './dto/create-line-annotation.dto';
import { LineAnnotationsService } from './line-annotations.service';

type AuthedRequest = { user: { id: string } };

@Controller('line-annotations')
@UseGuards(JwtAuthGuard)
export class LineAnnotationsController {
  constructor(private readonly service: LineAnnotationsService) {}

  /** GET /line-annotations?lineId=xxx */
  @Get()
  getForLine(@Req() req: AuthedRequest, @Query('lineId') lineId: string) {
    return this.service.getForLine(req.user.id, lineId);
  }

  /** POST /line-annotations/:lineId */
  @Post(':lineId')
  create(
    @Req() req: AuthedRequest,
    @Param('lineId') lineId: string,
    @Body() dto: CreateLineAnnotationDto,
  ) {
    return this.service.create(req.user.id, lineId, dto);
  }

  /** PATCH /line-annotations/:id */
  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: CreateLineAnnotationDto,
  ) {
    return this.service.update(req.user.id, id, dto);
  }

  /** DELETE /line-annotations/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
