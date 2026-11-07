import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TagType } from '@prisma/client';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTokenGuard } from './api-token.guard';
import { ApiTokensService, hashToken } from './api-tokens.service';
import { VizzyService } from './vizzy.service';

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
            { lineNumber: 0, timestampMs: 12_000 },
            { lineNumber: 4, timestampMs: null },
            { lineNumber: 5, timestampMs: 41_500 },
            { lineNumber: 9, timestampMs: null },
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
