import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedLyricDto } from './dto/create-saved-lyric.dto';
import { UpdateSavedLyricDto } from './dto/update-saved-lyric.dto';
export declare class SavedLyricsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAll(userId: string): import("@prisma/client").Prisma.PrismaPromise<({
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
    create(userId: string, dto: CreateSavedLyricDto): import("@prisma/client").Prisma.Prisma__SavedLyricClient<{
        id: string;
        createdAt: Date;
        userId: string;
        track: string;
        artist: string;
        lyrics: string;
        searchHistoryId: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    updateLyrics(userId: string, id: string, dto: UpdateSavedLyricDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        track: string;
        artist: string;
        lyrics: string;
        searchHistoryId: string | null;
    }>;
    remove(userId: string, id: string): Promise<void>;
}
