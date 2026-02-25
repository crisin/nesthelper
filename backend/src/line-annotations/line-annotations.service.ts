import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLineAnnotationDto } from './dto/create-line-annotation.dto';

@Injectable()
export class LineAnnotationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForLine(userId: string, lineId: string) {
    // Verify the line belongs to this user's song
    await this.assertLineOwnership(userId, lineId);
    return this.prisma.lineAnnotation.findMany({
      where: { lineId, userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, lineId: string, dto: CreateLineAnnotationDto) {
    await this.assertLineOwnership(userId, lineId);
    return this.prisma.lineAnnotation.create({
      data: { lineId, userId, text: dto.text, emoji: dto.emoji },
    });
  }

  async update(userId: string, annotationId: string, dto: CreateLineAnnotationDto) {
    const annotation = await this.prisma.lineAnnotation.findFirst({
      where: { id: annotationId, userId },
    });
    if (!annotation) throw new NotFoundException('Annotation not found');
    return this.prisma.lineAnnotation.update({
      where: { id: annotationId },
      data: { text: dto.text, emoji: dto.emoji },
    });
  }

  async remove(userId: string, annotationId: string): Promise<void> {
    const annotation = await this.prisma.lineAnnotation.findFirst({
      where: { id: annotationId, userId },
    });
    if (!annotation) throw new NotFoundException('Annotation not found');
    await this.prisma.lineAnnotation.delete({ where: { id: annotationId } });
  }

  private async assertLineOwnership(userId: string, lineId: string) {
    const line = await this.prisma.lyricsLine.findFirst({
      where: { id: lineId },
      include: { lyrics: { select: { savedLyric: { select: { userId: true } } } } },
    });
    if (!line || line.lyrics.savedLyric.userId !== userId) {
      throw new NotFoundException('Line not found');
    }
  }
}
