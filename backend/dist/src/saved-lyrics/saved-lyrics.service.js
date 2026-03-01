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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedLyricsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const lyrics_fetch_queue_1 = require("../lyrics-fetch/lyrics-fetch.queue");
let SavedLyricsService = class SavedLyricsService {
    prisma;
    lyricsQueue;
    constructor(prisma, lyricsQueue) {
        this.prisma = prisma;
        this.lyricsQueue = lyricsQueue;
    }
    getAll(userId) {
        return this.prisma.savedLyric.findMany({
            where: { userId },
            include: {
                searchHistory: { select: { imgUrl: true, url: true, spotifyId: true } },
                tags: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    getFavorites(userId) {
        return this.prisma.savedLyric.findMany({
            where: { userId, isFavorite: true },
            include: {
                searchHistory: { select: { imgUrl: true, url: true, spotifyId: true } },
                tags: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async setFavorite(userId, spotifyId, isFavorite) {
        return this.prisma.savedLyric.update({
            where: { userId_spotifyId: { userId, spotifyId } },
            data: { isFavorite },
            select: { id: true, spotifyId: true, isFavorite: true },
        });
    }
    async create(userId, dto) {
        const artists = dto.artists?.length
            ? dto.artists
            : dto.artist
                ? [dto.artist]
                : [];
        const artist = artists[0] ?? '';
        const hasLyrics = !!dto.lyrics?.trim();
        const saved = await this.prisma.savedLyric.create({
            data: {
                userId,
                track: dto.track,
                artist,
                artists,
                lyrics: dto.lyrics ?? '',
                fetchStatus: hasLyrics
                    ? 'DONE'
                    : this.lyricsQueue
                        ? 'FETCHING'
                        : 'IDLE',
                ...(dto.searchHistoryId
                    ? { searchHistoryId: dto.searchHistoryId }
                    : {}),
            },
            include: {
                searchHistory: { select: { imgUrl: true, url: true, spotifyId: true } },
                tags: true,
            },
        });
        const now = new Date();
        await this.prisma.listeningContext
            .create({
            data: {
                savedLyricId: saved.id,
                hour: now.getHours(),
                dayOfWeek: now.getDay(),
            },
        })
            .catch(() => {
        });
        if (!hasLyrics && this.lyricsQueue) {
            await this.lyricsQueue.add('fetch', {
                savedLyricId: saved.id,
                track: dto.track,
                artist,
            }, {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: true,
                removeOnFail: false,
            });
        }
        return saved;
    }
    async updateLyrics(userId, id, dto) {
        const item = await this.prisma.savedLyric.findFirst({
            where: { id, userId },
        });
        if (!item)
            throw new common_1.NotFoundException('Saved lyric not found');
        return this.prisma.savedLyric.update({
            where: { id },
            data: { lyrics: dto.lyrics },
        });
    }
    async remove(userId, id) {
        const item = await this.prisma.savedLyric.findFirst({
            where: { id, userId },
        });
        if (!item)
            throw new common_1.NotFoundException('Saved lyric not found');
        await this.prisma.savedLyric.delete({ where: { id } });
    }
    async upsertNote(userId, id, text) {
        const item = await this.prisma.savedLyric.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!item)
            throw new common_1.NotFoundException('Saved lyric not found');
        return this.prisma.savedLyric.update({
            where: { id },
            data: { note: text },
            select: { id: true, note: true },
        });
    }
    async addTag(userId, id, dto) {
        const item = await this.prisma.savedLyric.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!item)
            throw new common_1.NotFoundException('Saved lyric not found');
        const normalised = dto.tag.trim().toLowerCase();
        return this.prisma.songTag.upsert({
            where: { savedLyricId_tag: { savedLyricId: id, tag: normalised } },
            create: {
                savedLyricId: id,
                tag: normalised,
                type: dto.type ?? client_1.TagType.CONTEXT,
            },
            update: {},
        });
    }
    async removeTag(userId, id, tag) {
        const item = await this.prisma.savedLyric.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!item)
            throw new common_1.NotFoundException('Saved lyric not found');
        await this.prisma.songTag.deleteMany({
            where: { savedLyricId: id, tag: tag.toLowerCase() },
        });
    }
    async getTags(userId, id) {
        const item = await this.prisma.savedLyric.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!item)
            throw new common_1.NotFoundException('Saved lyric not found');
        return this.prisma.songTag.findMany({
            where: { savedLyricId: id },
            orderBy: { createdAt: 'asc' },
        });
    }
    async updateVisibility(userId, id, visibility) {
        const item = await this.prisma.savedLyric.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!item)
            throw new common_1.NotFoundException('Saved lyric not found');
        return this.prisma.savedLyric.update({
            where: { id },
            data: { visibility },
            select: { id: true, visibility: true },
        });
    }
};
exports.SavedLyricsService = SavedLyricsService;
exports.SavedLyricsService = SavedLyricsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, bullmq_1.InjectQueue)(lyrics_fetch_queue_1.LYRICS_FETCH_QUEUE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], SavedLyricsService);
//# sourceMappingURL=saved-lyrics.service.js.map