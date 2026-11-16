import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LyricsTakesService } from './lyrics-takes.service';

const USER = 'user-1';

const row = (id: string, lyrics: unknown) => ({
  id,
  source: 'vizzy',
  recordedAt: new Date('2026-11-16T19:02:11.000Z'),
  clock: 'media',
  durationMs: 225_000,
  heardMs: 200_000,
  fromMs: 30_000,
  toMs: 62_500,
  createdAt: new Date('2026-11-16T19:06:00.000Z'),
  lines: [
    {
      text: "We're talking away",
      startMs: 30_000,
      endMs: 32_000,
      repeat: false,
    },
    { text: 'Take on me', startMs: 60_000, endMs: 62_500, repeat: true },
  ],
  song: {
    spotifyId: `sp-${id}`,
    title: 'Take On Me',
    artist: 'a-ha',
    imgUrl: null,
    lyrics,
  },
});

function setup() {
  const prisma = {
    lyricsTake: {
      findMany: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return {
    prisma,
    service: new LyricsTakesService(prisma as unknown as PrismaService),
  };
}

describe('LyricsTakesService', () => {
  it('lists own takes slim and says what each song already has', async () => {
    const { service, prisma } = setup();
    prisma.lyricsTake.findMany.mockResolvedValue([
      row('a', null),
      row('b', { rawText: '  \n', lines: [] }),
      row('c', { rawText: 'Take on me', lines: [] }),
      row('d', { rawText: 'Take on me', lines: [{ id: 'l1' }] }),
    ]);

    const list = await service.list(USER);

    expect(list.map((t) => t.songLyrics)).toEqual([
      'none',
      'none',
      'text',
      'synced',
    ]);
    expect(list[0]).toMatchObject({
      id: 'a',
      lineCount: 2,
      song: { spotifyId: 'sp-a', title: 'Take On Me', artist: 'a-ha' },
    });
    expect(list[0]).not.toHaveProperty('lines');
    expect(list[0].song).not.toHaveProperty('lyrics');
    expect(prisma.lyricsTake.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER } }),
    );
  });

  it('gives the takes of one song with their lines, own ones only', async () => {
    const { service, prisma } = setup();
    const { song: _song, ...take } = row('a', null);
    void _song;
    prisma.lyricsTake.findMany.mockResolvedValue([take]);

    const takes = await service.forSong(USER, 'sp-a');

    expect(takes[0].lines[1]).toEqual({
      text: 'Take on me',
      startMs: 60_000,
      endMs: 62_500,
      repeat: true,
    });
    expect(prisma.lyricsTake.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER, song: { spotifyId: 'sp-a' } },
      }),
    );
  });

  it("deletes only the caller's take", async () => {
    const { service, prisma } = setup();
    await service.remove(USER, 'a');
    expect(prisma.lyricsTake.deleteMany).toHaveBeenCalledWith({
      where: { id: 'a', userId: USER },
    });

    prisma.lyricsTake.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove(USER, 'someone-elses')).rejects.toThrow(
      NotFoundException,
    );
  });
});
