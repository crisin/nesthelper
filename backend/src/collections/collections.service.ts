import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddCollectionItemDto } from './dto/add-collection-item.dto';
import { ReorderCollectionItemsDto } from './dto/reorder-collection-items.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      include: {
        _count: { select: { items: true } },
        items: {
          orderBy: { position: 'asc' },
          take: 4,
          include: {
            savedLyric: {
              include: {
                searchHistory: { select: { imgUrl: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  getPublic() {
    return this.prisma.collection.findMany({
      where: { isPublic: true },
      include: {
        _count: { select: { items: true } },
        user: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getOne(userId: string, id: string) {
    const collection = await this.prisma.collection.findFirst({
      where: {
        id,
        OR: [{ userId }, { isPublic: true }],
      },
      include: {
        items: {
          orderBy: { position: 'asc' },
          include: {
            savedLyric: {
              include: {
                searchHistory: { select: { imgUrl: true, url: true, spotifyId: true } },
                tags: true,
              },
            },
            line: {
              include: {
                lyrics: {
                  include: {
                    savedLyric: { select: { id: true, track: true, artist: true } },
                  },
                },
              },
            },
          },
        },
        user: { select: { name: true } },
      },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return collection;
  }

  create(userId: string, dto: CreateCollectionDto) {
    return this.prisma.collection.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? null,
        isPublic: dto.isPublic ?? false,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCollectionDto) {
    await this.assertOwner(userId, id);
    return this.prisma.collection.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.collection.delete({ where: { id } });
  }

  async addItem(userId: string, collectionId: string, dto: AddCollectionItemDto) {
    await this.assertOwner(userId, collectionId);
    const agg = await this.prisma.collectionItem.aggregate({
      where: { collectionId },
      _max: { position: true },
    });
    const nextPos = (agg._max.position ?? 0) + 1;
    return this.prisma.collectionItem.create({
      data: {
        collectionId,
        savedLyricId: dto.savedLyricId ?? null,
        lineId: dto.lineId ?? null,
        position: nextPos,
      },
    });
  }

  async removeItem(userId: string, collectionId: string, itemId: string) {
    await this.assertOwner(userId, collectionId);
    await this.prisma.collectionItem.delete({
      where: { id: itemId, collectionId },
    });
  }

  async reorder(userId: string, collectionId: string, dto: ReorderCollectionItemsDto) {
    await this.assertOwner(userId, collectionId);
    await this.prisma.$transaction(
      dto.orderedIds.map((itemId, i) =>
        this.prisma.collectionItem.update({
          where: { id: itemId, collectionId },
          data: { position: i + 1 },
        }),
      ),
    );
  }

  private async assertOwner(userId: string, collectionId: string) {
    const col = await this.prisma.collection.findFirst({
      where: { id: collectionId, userId },
      select: { id: true },
    });
    if (!col) throw new NotFoundException('Collection not found');
  }
}
