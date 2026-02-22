import { PrismaService } from '../prisma/prisma.service';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
export declare class SearchHistoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAll(userId: string): import("@prisma/client").Prisma.PrismaPromise<{
        url: string;
        id: string;
        createdAt: Date;
        userId: string;
        spotifyId: string;
        track: string;
        artist: string;
        imgUrl: string | null;
    }[]>;
    getGlobal(): import("@prisma/client").Prisma.PrismaPromise<({
        user: {
            name: string | null;
        };
    } & {
        url: string;
        id: string;
        createdAt: Date;
        userId: string;
        spotifyId: string;
        track: string;
        artist: string;
        imgUrl: string | null;
    })[]>;
    create(userId: string, dto: CreateSearchHistoryDto): import("@prisma/client").Prisma.Prisma__SearchHistoryClient<{
        url: string;
        id: string;
        createdAt: Date;
        userId: string;
        spotifyId: string;
        track: string;
        artist: string;
        imgUrl: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    remove(userId: string, id: string): Promise<void>;
}
