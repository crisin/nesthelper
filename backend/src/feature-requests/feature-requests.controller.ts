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
import {
  CreateFeatureRequestDto,
  UpdateFeatureRequestDto,
  UpdateStatusDto,
} from './dto/upsert-feature-request.dto';
import { FeatureRequestsService } from './feature-requests.service';

type AuthedRequest = { user: { id: string } };

@Controller('feature-requests')
@UseGuards(JwtAuthGuard)
export class FeatureRequestsController {
  constructor(private readonly service: FeatureRequestsService) {}

  /** GET /feature-requests?kind=feature|bug — filtered by kind */
  @Get()
  getAll(@Req() req: AuthedRequest, @Query('kind') kind?: string) {
    return this.service.getAll(req.user.id, kind);
  }

  /** POST /feature-requests */
  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateFeatureRequestDto) {
    return this.service.create(req.user.id, dto);
  }

  /** PATCH /feature-requests/:id — any user can edit */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFeatureRequestDto) {
    return this.service.update(id, dto);
  }

  /** PATCH /feature-requests/:id/status */
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  /** DELETE /feature-requests/:id — only creator */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(id, req.user.id);
  }

  /** POST /feature-requests/:id/vote — toggle vote */
  @Post(':id/vote')
  toggleVote(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.toggleVote(id, req.user.id);
  }
}
