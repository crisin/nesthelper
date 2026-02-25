import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
import { SearchHistoryService } from './search-history.service';
type AuthedRequest = {
    user: {
        id: string;
    };
};
export declare class SearchHistoryController {
    private readonly service;
    constructor(service: SearchHistoryService);
    getAll(req: AuthedRequest): import("@prisma/client").Prisma.PrismaPromise<{
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
    create(req: AuthedRequest, dto: CreateSearchHistoryDto): Promise<{
        url: string;
        id: string;
        userId: string;
        track: string;
        artist: string;
        createdAt: Date;
        spotifyId: string;
        imgUrl: string | null;
    }>;
    remove(req: AuthedRequest, id: string): Promise<void>;
}
export {};
