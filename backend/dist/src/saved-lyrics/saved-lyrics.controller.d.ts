import { CreateSavedLyricDto } from './dto/create-saved-lyric.dto';
import { UpdateSavedLyricDto } from './dto/update-saved-lyric.dto';
import { AddTagDto } from './dto/add-tag.dto';
import { UpsertNoteDto } from './dto/upsert-note.dto';
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
    create(req: AuthedRequest, dto: CreateSavedLyricDto): import("@prisma/client").Prisma.Prisma__SavedLyricClient<{
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
    updateLyrics(req: AuthedRequest, id: string, dto: UpdateSavedLyricDto): Promise<{
        id: string;
        userId: string;
        searchHistoryId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        note: string | null;
        createdAt: Date;
    }>;
    remove(req: AuthedRequest, id: string): Promise<void>;
    upsertNote(req: AuthedRequest, id: string, dto: UpsertNoteDto): Promise<{
        id: string;
        note: string | null;
    }>;
    getTags(req: AuthedRequest, id: string): Promise<{
        id: string;
        createdAt: Date;
        savedLyricId: string;
        tag: string;
        type: import("@prisma/client").$Enums.TagType;
    }[]>;
    addTag(req: AuthedRequest, id: string, dto: AddTagDto): Promise<{
        id: string;
        createdAt: Date;
        savedLyricId: string;
        tag: string;
        type: import("@prisma/client").$Enums.TagType;
    }>;
    removeTag(req: AuthedRequest, id: string, tag: string): Promise<void>;
}
export {};
