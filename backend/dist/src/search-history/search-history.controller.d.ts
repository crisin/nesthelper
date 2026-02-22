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
    create(req: AuthedRequest, dto: CreateSearchHistoryDto): import("@prisma/client").Prisma.Prisma__SearchHistoryClient<{
        url: string;
        id: string;
        createdAt: Date;
        userId: string;
        spotifyId: string;
        track: string;
        artist: string;
        imgUrl: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    remove(req: AuthedRequest, id: string): Promise<void>;
}
export {};
