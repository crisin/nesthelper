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
        const [history] = await this.prisma.$transaction([
            this.prisma.searchHistory.create({ data: { userId, ...dto } }),
            this.prisma.libraryTrack.upsert({
                where: { spotifyId: dto.spotifyId },
                update: {
                    url: dto.url,
                    ...(dto.imgUrl ? { imgUrl: dto.imgUrl } : {}),
                },
                create: {
                    spotifyId: dto.spotifyId,
                    name: dto.track,
                    artist: dto.artist,
                    url: dto.url,
                    imgUrl: dto.imgUrl,
                },
            }),
        ]);
        return history;
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