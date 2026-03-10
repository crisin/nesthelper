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
exports.SavedLyricsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const BOOKMARK_INCLUDE = {
    song: {
        include: {
            lyrics: {
                include: {
                    lines: { orderBy: { lineNumber: 'asc' } },
                    versions: { orderBy: { version: 'desc' }, take: 20 },
                },
            },
            tags: { orderBy: { createdAt: 'asc' } },
        },
    },
};
let SavedLyricsService = class SavedLyricsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getAll(userId) {
        return this.prisma.savedLyric.findMany({
            where: { userId },
            include: BOOKMARK_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
    }
    getFavorites(userId) {
        return this.prisma.savedLyric.findMany({
            where: { userId, isFavorite: true },
            include: BOOKMARK_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });
    }
    async getOne(userId, id) {
        const item = await this.prisma.savedLyric.findFirst({
            where: { id, userId },
            include: BOOKMARK_INCLUDE,
        });
        if (!item)
            throw new common_1.NotFoundException('SavedLyric not found');
        return item;
    }
    async ensureBySpotifyId(userId, spotifyId) {
        const song = await this.prisma.song.findUnique({
            where: { spotifyId },
            select: { id: true },
        });
        if (!song)
            throw new common_1.NotFoundException('Song not found');
        return this.prisma.savedLyric.upsert({
            where: { userId_songId: { userId, songId: song.id } },
            create: { userId, songId: song.id },
            update: {},
            include: BOOKMARK_INCLUDE,
        });
    }
    async setFavorite(userId, spotifyId, isFavorite) {
        const song = await this.prisma.song.findUnique({
            where: { spotifyId },
            select: { id: true },
        });
        if (!song)
            throw new common_1.NotFoundException('Song not found');
        return this.prisma.savedLyric.upsert({
            where: { userId_songId: { userId, songId: song.id } },
            create: { userId, songId: song.id, isFavorite },
            update: { isFavorite },
            select: { id: true, isFavorite: true },
        });
    }
    async upsertNote(userId, id, text) {
        const item = await this.prisma.savedLyric.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!item)
            throw new common_1.NotFoundException('SavedLyric not found');
        return this.prisma.savedLyric.update({
            where: { id },
            data: { note: text || null },
            select: { id: true, note: true },
        });
    }
    async remove(userId, id) {
        const item = await this.prisma.savedLyric.findFirst({
            where: { id, userId },
        });
        if (!item)
            throw new common_1.NotFoundException('SavedLyric not found');
        await this.prisma.savedLyric.delete({ where: { id } });
    }
};
exports.SavedLyricsService = SavedLyricsService;
exports.SavedLyricsService = SavedLyricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SavedLyricsService);
//# sourceMappingURL=saved-lyrics.service.js.map