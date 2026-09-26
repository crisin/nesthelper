import { ConfigService } from '@nestjs/config';
import { ForbiddenException, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpotifyService } from './spotify.service';

const USER = 'user-1';

function jsonResponse(status: number, body: unknown, headers = {}): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers,
  });
}

function setup(expiresInMs: number) {
  const record = {
    userId: USER,
    accessToken: 'old-access',
    refreshToken: 'refresh',
    expiresAt: new Date(Date.now() + expiresInMs),
  };
  const prisma = {
    spotifyToken: {
      findUnique: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue(record),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const config = { getOrThrow: jest.fn().mockReturnValue('x') };
  const service = new SpotifyService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    null,
  );
  return { service, prisma };
}

describe('SpotifyService token handling', () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('serves a valid token from memory after the first DB read', async () => {
    const { service, prisma } = setup(60 * 60_000);

    await expect(service.getValidAccessToken(USER)).resolves.toBe('old-access');
    await expect(service.getValidAccessToken(USER)).resolves.toBe('old-access');

    expect(prisma.spotifyToken.findUnique).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('collapses concurrent refreshes into one request', async () => {
    const { service } = setup(0);
    fetchMock.mockResolvedValue(
      jsonResponse(200, { access_token: 'new-access', expires_in: 3600 }),
    );

    const tokens = await Promise.all([
      service.getValidAccessToken(USER),
      service.getValidAccessToken(USER),
      service.getValidAccessToken(USER),
    ]);

    expect(tokens).toEqual(['new-access', 'new-access', 'new-access']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the connection on a transient refresh failure', async () => {
    const { service, prisma } = setup(0);
    fetchMock.mockResolvedValue(jsonResponse(503, {}));

    await expect(service.getValidAccessToken(USER)).rejects.toMatchObject({
      status: 503,
    });
    expect(prisma.spotifyToken.deleteMany).not.toHaveBeenCalled();
  });

  it('drops the connection on invalid_grant with a 403, not a 401', async () => {
    const { service, prisma } = setup(0);
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'invalid_grant' }));

    await expect(service.getValidAccessToken(USER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.spotifyToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER },
    });
  });
});

describe('SpotifyService.getCurrentTrack', () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  const playing = {
    is_playing: true,
    progress_ms: 1_000,
    item: { id: 't1' },
  };

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('shares one Spotify request between concurrent and quick repeat calls', async () => {
    const { service } = setup(60 * 60_000);
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(200, playing)),
    );

    await Promise.all([
      service.getCurrentTrack(USER),
      service.getCurrentTrack(USER),
    ]);
    const cached = await service.getCurrentTrack(USER);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cached?.progress_ms).toBeGreaterThanOrEqual(1_000);
  });

  it('answers 429 with retryAfter and does not call Spotify again meanwhile', async () => {
    const { service } = setup(60 * 60_000);
    fetchMock.mockResolvedValue(jsonResponse(429, {}, { 'retry-after': '7' }));

    const first = await service.getCurrentTrack(USER).catch((e: unknown) => e);
    const second = await service.getCurrentTrack(USER).catch((e: unknown) => e);

    expect(first).toBeInstanceOf(HttpException);
    expect((first as HttpException).getStatus()).toBe(429);
    expect((first as HttpException).getResponse()).toMatchObject({
      retryAfter: 7,
    });
    expect((second as HttpException).getStatus()).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reloads the token once when Spotify rejects it with 401', async () => {
    const { service, prisma } = setup(60 * 60_000);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, playing));

    await expect(service.getCurrentTrack(USER)).resolves.toMatchObject({
      item: { id: 't1' },
    });
    expect(prisma.spotifyToken.findUnique).toHaveBeenCalledTimes(2);
  });
});
