import { CreateSavedLyricDto } from './dto/create-saved-lyric.dto';
import { UpdateSavedLyricDto } from './dto/update-saved-lyric.dto';
import { SavedLyricsService } from './saved-lyrics.service';
type AuthedRequest = {
    user: {
        id: string;
    };
};
export declare class SavedLyricsController {
    private readonly service;
    constructor(service: SavedLyricsService);
    getAll(req: AuthedRequest): import("@prisma/client").Prisma.PrismaPromise<({
        searchHistory: {
            url: string;
            imgUrl: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        track: string;
        artist: string;
        lyrics: string;
        searchHistoryId: string | null;
    })[]>;
    create(req: AuthedRequest, dto: CreateSavedLyricDto): import("@prisma/client").Prisma.Prisma__SavedLyricClient<{
        id: string;
        createdAt: Date;
        userId: string;
        track: string;
        artist: string;
        lyrics: string;
        searchHistoryId: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    updateLyrics(req: AuthedRequest, id: string, dto: UpdateSavedLyricDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        track: string;
        artist: string;
        lyrics: string;
        searchHistoryId: string | null;
    }>;
    remove(req: AuthedRequest, id: string): Promise<void>;
}
export {};
