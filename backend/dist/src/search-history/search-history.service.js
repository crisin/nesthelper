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
exports.SearchHistoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SearchHistoryService = class SearchHistoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getAll(userId) {
        return this.prisma.searchHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    getGlobal() {
        return this.prisma.searchHistory.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                user: { select: { name: true } },
            },
        });
    }
    async create(userId, dto) {
        const artists = dto.artists?.length
            ? dto.artists
            : dto.artist
                ? [dto.artist]
                : [];
        const artist = artists[0] ?? '';
        const { spotifyId } = dto;
        return this.prisma.$transaction(async (tx) => {
            const history = await tx.searchHistory.create({
                data: {
                    userId,
                    spotifyId,
                    track: dto.track,
                    artist,
                    artists,
                    url: dto.url,
                    ...(dto.imgUrl ? { imgUrl: dto.imgUrl } : {}),
                },
            });
            await tx.libraryTrack.upsert({
                where: { spotifyId },
                update: {
                    url: dto.url,
                    ...(dto.imgUrl ? { imgUrl: dto.imgUrl } : {}),
                },
                create: {
                    spotifyId,
                    name: dto.track,
                    artist,
                    artists,
                    url: dto.url,
                    imgUrl: dto.imgUrl,
                },
            });
            await tx.savedLyric.upsert({
                where: { userId_spotifyId: { userId, spotifyId } },
                create: {
                    userId,
                    spotifyId,
                    track: dto.track,
                    artist,
                    artists,
                    lyrics: '',
                    searchHistoryId: history.id,
                },
                update: {},
            });
            return history;
        });
    }
    async remove(userId, id) {
        const item = await this.prisma.searchHistory.findFirst({
            where: { id, userId },
        });
        if (!item)
            throw new common_1.NotFoundException('Search history item not found');
        await this.prisma.searchHistory.delete({ where: { id } });
    }
};
exports.SearchHistoryService = SearchHistoryService;
exports.SearchHistoryService = SearchHistoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchHistoryService);
//# sourceMappingURL=search-history.service.js.map