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
let SavedLyricsService = class SavedLyricsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    getAll(userId) {
        return this.prisma.savedLyric.findMany({
            where: { userId },
            include: {
                searchHistory: { select: { imgUrl: true, url: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    create(userId, dto) {
        return this.prisma.savedLyric.create({
            data: {
                userId,
                track: dto.track,
                artist: dto.artist,
                lyrics: dto.lyrics ?? '',
                ...(dto.searchHistoryId ? { searchHistoryId: dto.searchHistoryId } : {}),
            },
        });
    }
    async updateLyrics(userId, id, dto) {
        const item = await this.prisma.savedLyric.findFirst({ where: { id, userId } });
        if (!item)
            throw new common_1.NotFoundException('Saved lyric not found');
        return this.prisma.savedLyric.update({
            where: { id },
            data: { lyrics: dto.lyrics },
        });
    }
    async remove(userId, id) {
        const item = await this.prisma.savedLyric.findFirst({ where: { id, userId } });
        if (!item)
            throw new common_1.NotFoundException('Saved lyric not found');
        await this.prisma.savedLyric.delete({ where: { id } });
    }
};
exports.SavedLyricsService = SavedLyricsService;
exports.SavedLyricsService = SavedLyricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SavedLyricsService);
//# sourceMappingURL=saved-lyrics.service.js.map