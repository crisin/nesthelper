import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SavedLyric, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LYRICS_FETCH_QUEUE } from '../lyrics-fetch/lyrics-fetch.queue';

const BOOKMARK_INCLUDE = {
  song: {
    include: {
      lyrics: {
        include: {
          lines: { orderBy: { lineNumber: 'asc' as const } },
          versions: { orderBy: { version: 'desc' as const }, take: 20 },
        },
      },
      tags: { orderBy: { createdAt: 'asc' as const } },
    },
  },
} satisfies Prisma.SavedLyricInclude;

export type BookmarkWithSong = Prisma.SavedLyricGetPayload<{
  include: typeof BOOKMARK_INCLUDE;
}>;

/**
 * List variant. The full include drags every lyrics line plus 20 version
 * snapshots along for each bookmark — `LyricsVersion.rawText` is a full copy of the
 * lyrics, so a handful of songs turn into megabytes. Nothing in a list view
 * reads them; the editor fetches lines and versions through its own query.
 */
const BOOKMARK_LIST_INCLUDE = {
  song: {
    include: {
      lyrics: {
        select: { id: true, rawText: true, status: true, updatedAt: true },
      },
      tags: { orderBy: { createdAt: 'asc' as const } },
    },
  },
} satisfies Prisma.SavedLyricInclude;

export type BookmarkListItem = Prisma.SavedLyricGetPayload<{
  include: typeof BOOKMARK_LIST_INCLUDE;
}>;

@Injectable()
export class SavedLyricsService {
  constructor(
    private readonly prisma: PrismaService,
    // Optional so the service still works when Redis isn't configured
    @Optional()
    @InjectQueue(LYRICS_FETCH_QUEUE)
    private readonly lyricsQueue: Queue | null,
  ) {}

  getAll(userId: string): Promise<BookmarkListItem[]> {
    return this.prisma.savedLyric.findMany({
      where: { userId },
      include: BOOKMARK_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  getFavorites(userId: string): Promise<BookmarkListItem[]> {
    return this.prisma.savedLyric.findMany({
      where: { userId, isFavorite: true },
      include: BOOKMARK_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(userId: string, id: string): Promise<BookmarkWithSong> {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
      include: BOOKMARK_INCLUDE,
    });
    if (!item) throw new NotFoundException('SavedLyric not found');
    return item;
  }

  /**
   * Resolves a Spotify track to a bookmark, creating whatever is missing.
   *
   * This is what makes "tap a track anywhere → land on its page" work: the
   * caller never has to ask whether the song exists first. Every track that
   * played is in the play history, so an unknown spotifyId can be reconstructed
   * from there instead of dead-ending on a 404.
   */
  async ensureBySpotifyId(
    userId: string,
    spotifyId: string,
  ): Promise<BookmarkWithSong> {
    let song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true, fetchStatus: true },
    });

    if (!song) {
      const play = await this.prisma.playHistory.findFirst({
        where: { userId, spotifyId },
        orderBy: { playedAt: 'desc' },
        select: { track: true, artist: true, artists: true, imgUrl: true },
      });
      if (!play) throw new NotFoundException('Song not found');

      song = await this.prisma.song.upsert({
        where: { spotifyId },
        create: {
          spotifyId,
          title: play.track,
          artist: play.artist,
          artists: play.artists,
          imgUrl: play.imgUrl,
          spotifyUrl: `https://open.spotify.com/track/${spotifyId}`,
        },
        update: { imgUrl: play.imgUrl },
        select: { id: true, fetchStatus: true },
      });
    }

    const bookmark = await this.prisma.savedLyric.upsert({
      where: { userId_songId: { userId, songId: song.id } },
      create: { userId, songId: song.id },
      update: {},
      include: BOOKMARK_INCLUDE,
    });

    await this.queueLyricsFetch(song.id, spotifyId);
    return bookmark;
  }

  /** Kicks off the lyrics worker the first time a song shows up. No-op without Redis. */
  private async queueLyricsFetch(
    songId: string,
    spotifyId: string,
  ): Promise<void> {
    if (!this.lyricsQueue) return;

    const song = await this.prisma.song.findUnique({
      where: { id: songId },
      select: { fetchStatus: true, title: true, artist: true },
    });
    if (song?.fetchStatus !== 'IDLE') return;

    await this.prisma.song.update({
      where: { id: songId },
      data: { fetchStatus: 'FETCHING' },
    });
    await this.lyricsQueue.add(
      'fetch',
      { songId, spotifyId, track: song.title, artist: song.artist },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );
  }

  async setFavorite(
    userId: string,
    spotifyId: string,
    isFavorite: boolean,
  ): Promise<Pick<SavedLyric, 'id' | 'isFavorite'>> {
    const song = await this.prisma.song.findUnique({
      where: { spotifyId },
      select: { id: true },
    });
    if (!song) throw new NotFoundException('Song not found');

    return this.prisma.savedLyric.upsert({
      where: { userId_songId: { userId, songId: song.id } },
      create: { userId, songId: song.id, isFavorite },
      update: { isFavorite },
      select: { id: true, isFavorite: true },
    });
  }

  async upsertNote(
    userId: string,
    id: string,
    text: string,
  ): Promise<Pick<SavedLyric, 'id' | 'note'>> {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('SavedLyric not found');

    return this.prisma.savedLyric.update({
      where: { id },
      data: { note: text || null },
      select: { id: true, note: true },
    });
  }

  async updateArtistColors(
    userId: string,
    id: string,
    artistColors: Record<string, string>,
  ): Promise<Pick<SavedLyric, 'id' | 'artistColors'>> {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('SavedLyric not found');

    return this.prisma.savedLyric.update({
      where: { id },
      data: { artistColors: artistColors as object },
      select: { id: true, artistColors: true },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const item = await this.prisma.savedLyric.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('SavedLyric not found');
    await this.prisma.savedLyric.delete({ where: { id } });
  }
}
