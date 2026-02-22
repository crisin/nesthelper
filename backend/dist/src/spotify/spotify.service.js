"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let SpotifyService = class SpotifyService {
    prisma;
    config;
    clientId;
    clientSecret;
    redirectUri;
    scope = [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'playlist-modify-public',
    ].join(' ');
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.clientId = config.getOrThrow('SPOTIFY_CLIENT_ID');
        this.clientSecret = config.getOrThrow('SPOTIFY_CLIENT_SECRET');
        this.redirectUri = config.getOrThrow('SPOTIFY_REDIRECT_URI');
    }
    buildAuthUrl(userId) {
        const state = this.encodeState(userId);
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            scope: this.scope,
            redirect_uri: this.redirectUri,
            state,
        });
        return `https://accounts.spotify.com/authorize?${params}`;
    }
    async handleCallback(code, state) {
        const userId = this.decodeState(state);
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: this.redirectUri,
            }),
        });
        if (!tokenRes.ok) {
            throw new common_1.UnauthorizedException('Spotify token exchange failed');
        }
        const tokens = (await tokenRes.json());
        const profileRes = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile = (await profileRes.json());
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        await this.prisma.spotifyToken.upsert({
            where: { userId },
            create: {
                userId,
                spotifyId: profile.id,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt,
            },
            update: {
                spotifyId: profile.id,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt,
            },
        });
    }
    async getStatus(userId) {
        const token = await this.prisma.spotifyToken.findUnique({
            where: { userId },
            select: { spotifyId: true, expiresAt: true },
        });
        return { connected: !!token, spotifyId: token?.spotifyId ?? null };
    }
    async disconnect(userId) {
        await this.prisma.spotifyToken.deleteMany({ where: { userId } });
    }
    async getValidAccessToken(userId) {
        const record = await this.prisma.spotifyToken.findUnique({
            where: { userId },
        });
        if (!record) {
            throw new common_1.NotFoundException('Spotify not connected');
        }
        if (record.expiresAt.getTime() > Date.now() + 60_000) {
            return record.accessToken;
        }
        const refreshRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: record.refreshToken,
            }),
        });
        if (!refreshRes.ok) {
            await this.prisma.spotifyToken.delete({ where: { userId } });
            throw new common_1.UnauthorizedException('Spotify session expired — please reconnect');
        }
        const refreshed = (await refreshRes.json());
        const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
        await this.prisma.spotifyToken.update({
            where: { userId },
            data: {
                accessToken: refreshed.access_token,
                ...(refreshed.refresh_token
                    ? { refreshToken: refreshed.refresh_token }
                    : {}),
                expiresAt,
            },
        });
        return refreshed.access_token;
    }
    async getCurrentTrack(userId) {
        const accessToken = await this.getValidAccessToken(userId);
        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: `Bearer ${accessToken}` } });
        if (res.status === 204)
            return null;
        if (!res.ok)
            throw new Error('Failed to fetch current track from Spotify');
        return res.json();
    }
    encodeState(userId) {
        const ts = Date.now().toString();
        const payload = `${userId}:${ts}`;
        const sig = (0, crypto_1.createHmac)('sha256', this.config.getOrThrow('JWT_SECRET'))
            .update(payload)
            .digest('hex')
            .slice(0, 16);
        return Buffer.from(`${payload}:${sig}`).toString('base64url');
    }
    decodeState(state) {
        try {
            const decoded = Buffer.from(state, 'base64url').toString('utf-8');
            const parts = decoded.split(':');
            if (parts.length !== 3)
                throw new Error('bad format');
            const [userId, ts, sig] = parts;
            if (Date.now() - parseInt(ts) > 10 * 60 * 1000) {
                throw new Error('state expired');
            }
            const expected = (0, crypto_1.createHmac)('sha256', this.config.getOrThrow('JWT_SECRET'))
                .update(`${userId}:${ts}`)
                .digest('hex')
                .slice(0, 16);
            if (sig !== expected)
                throw new Error('invalid signature');
            return userId;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid OAuth state parameter');
        }
    }
};
exports.SpotifyService = SpotifyService;
exports.SpotifyService = SpotifyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], SpotifyService);
//# sourceMappingURL=spotify.service.js.map