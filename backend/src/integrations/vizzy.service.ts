import { Injectable } from '@nestjs/common';
import { TagType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type VizzySongInfo = {
  found: boolean;
  spotifyId: string | null;
  title: string | null;
  artist: string | null;
  /** shared song tags plus this user's own (legacy) tags, lower-case */
  tags: { tag: string; type: TagType }[];
  /** saved (bookmarked) by this user */
  saved: boolean;
  isFavorite: boolean;
  /** lyrics sections (verse, chorus …) with the song time they start at,
   *  when the lyrics are synced; `startMs` null otherwise */
  sections: { label: string; startMs: number | null }[];
};

const NOT_FOUND: VizzySongInfo = {
  found: false,
  spotifyId: null,
  title: null,
  artist: null,
  tags: [],
  saved: false,
  isFavorite: false,
  sections: [],
};

@Injectable()
export class VizzyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * What new-helper knows about the song vizzy is playing. By Spotify id when
   * vizzy has one (Spotify API connected), else by title + main artist (vizzy
   * only sees the OS media session).
   */
  async song(
    userId: string,
    q: { spotifyId?: string; title?: string; artist?: string },
  ): Promise<VizzySongInfo> {
    const song = q.spotifyId
      ? await this.prisma.song.findUnique({ where: { spotifyId: q.spotifyId } })
      : q.title
        ? await this.prisma.song.findFirst({
            where: {
              title: { equals: q.title.trim(), mode: 'insensitive' },
              ...(q.artist && {
                OR: [
                  { artist: { equals: q.artist.trim(), mode: 'insensitive' } },
                  { artists: { has: q.artist.trim() } },
                ],
              }),
            },
            orderBy: { firstSeenAt: 'asc' },
          })
        : null;
    if (!song) return NOT_FOUND;

    const [shared, saved, lyrics] = await Promise.all([
      this.prisma.songTag.findMany({
        where: { songId: song.id },
        select: { tag: true, type: true },
      }),
      this.prisma.savedLyric.findFirst({
        where: {
          userId,
          OR: [{ songId: song.id }, { spotifyId: song.spotifyId }],
        },
        select: {
          isFavorite: true,
          tags: { select: { tag: true, type: true } },
        },
      }),
      this.prisma.songLyrics.findUnique({
        where: { songId: song.id },
        select: {
          sections: {
            select: { label: true, startLine: true },
            orderBy: { position: 'asc' },
          },
          lines: {
            select: { lineNumber: true, timestampMs: true },
            orderBy: { lineNumber: 'asc' },
          },
        },
      }),
    ]);

    const tags = new Map<string, { tag: string; type: TagType }>();
    for (const t of [...shared, ...(saved?.tags ?? [])]) {
      const tag = t.tag.trim().toLowerCase();
      if (tag && !tags.has(tag)) tags.set(tag, { tag, type: t.type });
    }

    // a section starts at its first line; the first line at or after it
    // that carries a timestamp gives the song time
    const lines = lyrics?.lines ?? [];
    const sections = (lyrics?.sections ?? []).map((s) => ({
      label: s.label,
      startMs:
        lines.find((l) => l.lineNumber >= s.startLine && l.timestampMs !== null)
          ?.timestampMs ?? null,
    }));

    return {
      found: true,
      spotifyId: song.spotifyId,
      title: song.title,
      artist: song.artist,
      tags: [...tags.values()],
      saved: !!saved,
      isFavorite: saved?.isFavorite ?? false,
      sections,
    };
  }
}
