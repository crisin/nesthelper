import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedLyricDto } from './dto/create-saved-lyric.dto';
import { UpdateSavedLyricDto } from './dto/update-saved-lyric.dto';
import { AddTagDto } from './dto/add-tag.dto';
export declare class SavedLyricsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAll(userId: string): import("@prisma/client").Prisma.PrismaPromise<({
        searchHistory: {
            url: string;
            spotifyId: string;
            imgUrl: string | null;
        } | null;
        tags: {
            id: string;
            createdAt: Date;
            savedLyricId: string;
            tag: string;
            type: import("@prisma/client").$Enums.TagType;
        }[];
    } & {
        id: string;
        userId: string;
        searchHistoryId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        note: string | null;
        createdAt: Date;
    })[]>;
    create(userId: string, dto: CreateSavedLyricDto): import("@prisma/client").Prisma.Prisma__SavedLyricClient<{
        searchHistory: {
            url: string;
            spotifyId: string;
            imgUrl: string | null;
        } | null;
        tags: {
            id: string;
            createdAt: Date;
            savedLyricId: string;
            tag: string;
            type: import("@prisma/client").$Enums.TagType;
        }[];
    } & {
        id: string;
        userId: string;
        searchHistoryId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        note: string | null;
        createdAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    updateLyrics(userId: string, id: string, dto: UpdateSavedLyricDto): Promise<{
        id: string;
        userId: string;
        searchHistoryId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        note: string | null;
        createdAt: Date;
    }>;
    remove(userId: string, id: string): Promise<void>;
    upsertNote(userId: string, id: string, text: string): Promise<{
        id: string;
        note: string | null;
    }>;
    addTag(userId: string, id: string, dto: AddTagDto): Promise<{
        id: string;
        createdAt: Date;
        savedLyricId: string;
        tag: string;
        type: import("@prisma/client").$Enums.TagType;
    }>;
    removeTag(userId: string, id: string, tag: string): Promise<void>;
    getTags(userId: string, id: string): Promise<{
        id: string;
        createdAt: Date;
        savedLyricId: string;
        tag: string;
        type: import("@prisma/client").$Enums.TagType;
    }[]>;
}
