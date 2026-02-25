import { PrismaService } from '../prisma/prisma.service';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
export declare class SearchHistoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAll(userId: string): import("@prisma/client").Prisma.PrismaPromise<{
        url: string;
        id: string;
        userId: string;
        track: string;
        artist: string;
        createdAt: Date;
        spotifyId: string;
        imgUrl: string | null;
    }[]>;
    getGlobal(): import("@prisma/client").Prisma.PrismaPromise<({
        user: {
            name: string | null;
        };
    } & {
        url: string;
        id: string;
        userId: string;
        track: string;
        artist: string;
        createdAt: Date;
        spotifyId: string;
        imgUrl: string | null;
    })[]>;
    create(userId: string, dto: CreateSearchHistoryDto): Promise<{
        url: string;
        id: string;
        userId: string;
        track: string;
        artist: string;
        createdAt: Date;
        spotifyId: string;
        imgUrl: string | null;
    }>;
    remove(userId: string, id: string): Promise<void>;
}
