import { Injectable, NotFoundException } from '@nestjs/common';
import { FeatureStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const REQUEST_INCLUDE = {
  user: { select: { id: true, name: true } },
  votes: { select: { userId: true } },
} satisfies Prisma.FeatureRequestInclude;

export type FeatureRequestWithMeta = Prisma.FeatureRequestGetPayload<{
  include: typeof REQUEST_INCLUDE;
}>;

@Injectable()
export class FeatureRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  getAll(requestingUserId: string, kind?: string): Promise<FeatureRequestWithMeta[]> {
    return this.prisma.featureRequest.findMany({
      where: kind ? { kind } : undefined,
      include: REQUEST_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async create(
    userId: string,
    data: { kind?: string; title?: string; content: string; page?: string },
  ): Promise<FeatureRequestWithMeta> {
    return this.prisma.featureRequest.create({
      data: { userId, kind: data.kind ?? 'feature', ...data },
      include: REQUEST_INCLUDE,
    });
  }

  async update(
    id: string,
    data: { title?: string | null; content?: string; page?: string | null },
  ): Promise<FeatureRequestWithMeta> {
    await this.findOrThrow(id);
    return this.prisma.featureRequest.update({
      where: { id },
      data,
      include: REQUEST_INCLUDE,
    });
  }

  async updateStatus(id: string, status: FeatureStatus): Promise<FeatureRequestWithMeta> {
    await this.findOrThrow(id);
    return this.prisma.featureRequest.update({
      where: { id },
      data: { status },
      include: REQUEST_INCLUDE,
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const req = await this.findOrThrow(id);
    // Only creator can delete
    if (req.userId !== userId) throw new NotFoundException('Not your request');
    await this.prisma.featureRequest.delete({ where: { id } });
  }

  /** Toggle vote — returns updated vote count and whether user now voted */
  async toggleVote(
    requestId: string,
    userId: string,
  ): Promise<{ voted: boolean; count: number }> {
    await this.findOrThrow(requestId);

    const existing = await this.prisma.featureRequestVote.findUnique({
      where: { userId_requestId: { userId, requestId } },
    });

    if (existing) {
      await this.prisma.featureRequestVote.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.featureRequestVote.create({ data: { userId, requestId } });
    }

    const count = await this.prisma.featureRequestVote.count({ where: { requestId } });
    return { voted: !existing, count };
  }

  private async findOrThrow(id: string) {
    const req = await this.prisma.featureRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Feature request not found');
    return req;
  }
}
