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
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddCollectionItemDto } from './dto/add-collection-item.dto';
import { ReorderCollectionItemsDto } from './dto/reorder-collection-items.dto';

type AuthedRequest = { user: { id: string } };

@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get()
  getAll(@Req() req: AuthedRequest) {
    return this.service.getAll(req.user.id);
  }

  @Get('public')
  getPublic() {
    return this.service.getPublic();
  }

  @Get(':id')
  getOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.getOne(req.user.id, id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateCollectionDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }

  @Post(':id/items')
  addItem(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: AddCollectionItemDto,
  ) {
    return this.service.addItem(req.user.id, id, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.service.removeItem(req.user.id, id, itemId);
  }

  @Patch(':id/items/reorder')
  reorder(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: ReorderCollectionItemsDto,
  ) {
    return this.service.reorder(req.user.id, id, dto);
  }
}
