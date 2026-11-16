import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TagType } from '@prisma/client';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTokenGuard } from './api-token.guard';
import { ApiTokensService, hashToken } from './api-tokens.service';
import { VizzyService } from './vizzy.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { VizzyTakeDto } from './vizzy-take.dto';
import { TAKES_KEPT, VizzyTakesService } from './vizzy-takes.service';

const USER = 'user-1';

function tokenPrisma(
  user = { id: USER, isActive: true, mustChangePassword: false },
) {
  const rows = new Map<
    string,
    { id: string; lastUsedAt: Date | null; user: typeof user }
  >();
  return {
    rows,
    apiToken: {
      create: jest.fn(
        ({
          data,
        }: {
          data: { tokenHash: string; prefix: string; name: string };
        }) => {
          rows.set(data.tokenHash, { id: 't1', lastUsedAt: null, user });
          return Promise.resolve({
            id: 't1',
            name: data.name,
            prefix: data.prefix,
            createdAt: new Date(),
            lastUsedAt: null,
          });
        },
      ),
      findUnique: jest.fn(({ where }: { where: { tokenHash: string } }) =>
        Promise.resolve(rows.get(where.tokenHash) ?? null),
      ),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

describe('ApiTokensService', () => {
  it('hands out the plain token once and stores only its hash', async () => {
    const prisma = tokenPrisma();
    const service = new ApiTokensService(prisma as unknown as PrismaService);

    const { token, info } = await service.create(USER, '  vizzy  ');

    expect(token).toMatch(/^nh_[A-Za-z0-9_-]{43}$/);
    expect(info.name).toBe('vizzy');
    expect(info.prefix).toBe(token.slice(0, 10));
    const stored = prisma.apiToken.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it('resolves a valid token to its user and stamps lastUsedAt', async () => {
    const prisma = tokenPrisma();
    const service = new ApiTokensService(prisma as unknown as PrismaService);
    const { token } = await service.create(USER, 'vizzy');

    await expect(service.resolve(token)).resolves.toEqual({ id: USER });
    expect(prisma.apiToken.update).toHaveBeenCalledTimes(1);
  });

  it('refuses unknown tokens, foreign formats and blocked accounts', async () => {
    const prisma = tokenPrisma({
      id: USER,
      isActive: false,
      mustChangePassword: false,
    });
    const service = new ApiTokensService(prisma as unknown as PrismaService);
    const { token } = await service.create(USER, 'vizzy');

    await expect(service.resolve(token)).resolves.toBeNull();
    await expect(service.resolve('nh_nope')).resolves.toBeNull();
    await expect(service.resolve('eyJhbGciOi.jwt.token')).resolves.toBeNull();
    expect(prisma.apiToken.findUnique).toHaveBeenCalledTimes(2);
  });

  it('only revokes your own tokens', async () => {
    const prisma = tokenPrisma();
    const service = new ApiTokensService(prisma as unknown as PrismaService);
    await expect(service.revoke(USER, 'someone-elses')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.apiToken.deleteMany).toHaveBeenCalledWith({
      where: { id: 'someone-elses', userId: USER },
    });
  });
});

describe('ApiTokenGuard', () => {
  function ctx(authorization?: string) {
    const req: { headers: { authorization?: string }; user?: { id: string } } =
      { headers: { authorization } };
    const context = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { req, context };
  }

  it('puts the token owner on the request', async () => {
    const tokens = {
      resolve: jest.fn().mockResolvedValue({ id: USER }),
    } as unknown as ApiTokensService;
    const { req, context } = ctx('Bearer nh_abc');
    await expect(new ApiTokenGuard(tokens).canActivate(context)).resolves.toBe(
      true,
    );
    expect(req.user).toEqual({ id: USER });
  });

  it('rejects a missing or bad token', async () => {
    const tokens = {
      resolve: jest.fn().mockResolvedValue(null),
    } as unknown as ApiTokensService;
    await expect(
      new ApiTokenGuard(tokens).canActivate(ctx().context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      new ApiTokenGuard(tokens).canActivate(ctx('Bearer nh_x').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('VizzyService', () => {
  const song = {
    id: 's1',
    spotifyId: 'sp1',
    title: 'Kokain',
    artist: 'Bonez MC',
  };

  function setup() {
    const prisma = {
      song: {
        findUnique: jest.fn().mockResolvedValue(song),
        findFirst: jest.fn().mockResolvedValue(song),
      },
      songTag: {
        findMany: jest.fn().mockResolvedValue([
          { tag: 'Party', type: TagType.CONTEXT },
          { tag: 'aggressiv', type: TagType.MOOD },
        ]),
      },
      savedLyric: {
        findFirst: jest.fn().mockResolvedValue({
          isFavorite: true,
          tags: [
            { tag: 'party', type: TagType.CONTEXT },
            { tag: 'auto', type: TagType.CONTEXT },
          ],
        }),
      },
      songLyrics: {
        findUnique: jest.fn().mockResolvedValue({
          sections: [
            { label: 'Verse 1', startLine: 0 },
            { label: 'Chorus', startLine: 4 },
            { label: 'Bridge', startLine: 9 },
          ],
          lines: [
            { lineNumber: 0, timestampMs: 12_000, text: 'Erste Zeile' },
            { lineNumber: 4, timestampMs: null, text: '' },
            { lineNumber: 5, timestampMs: 41_500, text: 'Refrain' },
            { lineNumber: 9, timestampMs: null, text: 'Bridge ohne Zeit' },
          ],
        }),
      },
    };
    return {
      prisma,
      service: new VizzyService(prisma as unknown as PrismaService),
    };
  }

  it('merges tags, flags the bookmark and times the lyric sections', async () => {
    const { service } = setup();
    const r = await service.song(USER, { spotifyId: 'sp1' });

    expect(r.found).toBe(true);
    expect(r.tags).toEqual([
      { tag: 'party', type: TagType.CONTEXT },
      { tag: 'aggressiv', type: TagType.MOOD },
      { tag: 'auto', type: TagType.CONTEXT },
    ]);
    expect(r.saved).toBe(true);
    expect(r.isFavorite).toBe(true);
    expect(r.sections).toEqual([
      { label: 'Verse 1', startMs: 12_000 },
      { label: 'Chorus', startMs: 41_500 },
      { label: 'Bridge', startMs: null },
    ]);
    // the text with its time, blank lines left out
    expect(r.lines).toEqual([
      { text: 'Erste Zeile', startMs: 12_000 },
      { text: 'Refrain', startMs: 41_500 },
      { text: 'Bridge ohne Zeit', startMs: null },
    ]);
  });

  it('falls back to title + artist without a Spotify id', async () => {
    const { service, prisma } = setup();
    await service.song(USER, { title: 'Kokain', artist: 'Bonez MC' });
    expect(prisma.song.findUnique).not.toHaveBeenCalled();
    expect(prisma.song.findFirst).toHaveBeenCalled();
  });

  it('reports an unknown song as not found', async () => {
    const { service, prisma } = setup();
    prisma.song.findUnique.mockResolvedValue(null);
    await expect(
      service.song(USER, { spotifyId: 'nope' }),
    ).resolves.toMatchObject({ found: false, tags: [] });
  });
});

describe('VizzyTakesService', () => {
  const take = () => ({
    v: 1,
    spotifyId: 'sp1',
    artist: ' a-ha ',
    title: 'Take On Me',
    durationMs: 225_000,
    recordedAt: '2026-11-16T19:02:11.000Z',
    clock: 'media',
    coverage: { fromMs: 0, toMs: 0 },
    heardMs: 200_000,
    engine: { language: 'auto' },
    lines: [
      { text: 'Take on me', startMs: 60_000, endMs: 62_500, repeat: false },
      { text: '  ', startMs: 40_000, endMs: 41_000, repeat: false },
      {
        text: " We're talking away ",
        startMs: 30_000,
        endMs: 29_000,
        repeat: false,
      },
    ],
  });

  function setup(existing: { id: string }[] = []) {
    const prisma = {
      song: {
        upsert: jest.fn().mockResolvedValue({ id: 'song-1', spotifyId: 'sp1' }),
      },
      songLyrics: { update: jest.fn(), upsert: jest.fn(), create: jest.fn() },
      lyricsTake: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'take-new' }),
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'take-new' }, ...existing]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    return {
      prisma,
      service: new VizzyTakesService(prisma as unknown as PrismaService),
    };
  }

  it('stores the take next to the song and leaves the lyrics alone', async () => {
    const { service, prisma } = setup();

    const r = await service.store(USER, take());

    expect(r).toEqual({
      id: 'take-new',
      spotifyId: 'sp1',
      created: true,
      lines: 2,
    });
    // an unknown song is created from what vizzy knows; a known one is not changed
    const [song] = prisma.song.upsert.mock.calls[0] as unknown as [
      { create: unknown; update: unknown },
    ];
    expect(song.create).toEqual({
      spotifyId: 'sp1',
      title: 'Take On Me',
      artist: 'a-ha',
      artists: ['a-ha'],
    });
    expect(song.update).toEqual({});
    const [saved] = prisma.lyricsTake.upsert.mock.calls[0] as unknown as [
      {
        where: { userId_songId_recordedAt: unknown };
        create: { lines: unknown };
      },
    ];
    expect(saved.where.userId_songId_recordedAt).toEqual({
      userId: USER,
      songId: 'song-1',
      recordedAt: new Date('2026-11-16T19:02:11.000Z'),
    });
    // blank lines out, sorted by time, an end before the start pulled up,
    // the coverage taken from the lines rather than trusted
    expect(saved.create.lines).toEqual([
      {
        text: "We're talking away",
        startMs: 30_000,
        endMs: 30_000,
        repeat: false,
      },
      { text: 'Take on me', startMs: 60_000, endMs: 62_500, repeat: false },
    ]);
    expect(saved.create).toMatchObject({
      fromMs: 30_000,
      toMs: 62_500,
      source: 'vizzy',
    });
    expect(prisma.songLyrics.update).not.toHaveBeenCalled();
    expect(prisma.songLyrics.upsert).not.toHaveBeenCalled();
    expect(prisma.songLyrics.create).not.toHaveBeenCalled();
    expect(prisma.lyricsTake.deleteMany).not.toHaveBeenCalled();
  });

  it('replaces a take sent twice and keeps only the newest few', async () => {
    const { service, prisma } = setup([
      { id: 'b' },
      { id: 'c' },
      { id: 'old-1' },
      { id: 'old-2' },
    ]);
    prisma.lyricsTake.findUnique.mockResolvedValue({ id: 'take-new' });

    const r = await service.store(USER, take());

    expect(r.created).toBe(false);
    expect(TAKES_KEPT).toBe(3);
    expect(prisma.lyricsTake.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['old-1', 'old-2'] } },
    });
  });

  it('refuses a take without text or with a broken date', async () => {
    const { service, prisma } = setup();
    const empty = {
      ...take(),
      lines: [{ text: ' ', startMs: 0, endMs: 1, repeat: false }],
    };
    await expect(service.store(USER, empty)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.store(USER, { ...take(), recordedAt: 'gestern' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.lyricsTake.upsert).not.toHaveBeenCalled();
  });

  it("accepts vizzy's file as it is, and nothing oversized or unknown", async () => {
    const errors = (body: object) =>
      validate(plainToInstance(VizzyTakeDto, body), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
    await expect(errors(take())).resolves.toHaveLength(0);
    // a song without a known duration
    await expect(errors({ ...take(), durationMs: null })).resolves.toHaveLength(
      0,
    );
    const line = take().lines[0];
    await expect(
      errors({ ...take(), lines: Array.from({ length: 501 }, () => line) }),
    ).resolves.not.toHaveLength(0);
    await expect(
      errors({ ...take(), spotifyId: null }),
    ).resolves.not.toHaveLength(0);
    await expect(
      errors({ ...take(), clock: 'guess' }),
    ).resolves.not.toHaveLength(0);
    await expect(
      errors({ ...take(), lines: [{ ...line, startMs: -5 }] }),
    ).resolves.not.toHaveLength(0);
    await expect(
      errors({ ...take(), lines: [{ ...line, html: '<b>' }] }),
    ).resolves.not.toHaveLength(0);
  });
});
