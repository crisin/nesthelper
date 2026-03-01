import { CreateSavedLyricDto } from './dto/create-saved-lyric.dto';
import { UpdateSavedLyricDto } from './dto/update-saved-lyric.dto';
import { AddTagDto } from './dto/add-tag.dto';
import { UpsertNoteDto } from './dto/upsert-note.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
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
        spotifyId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        artists: string[];
        note: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
        createdAt: Date;
    })[]>;
    getFavorites(req: AuthedRequest): import("@prisma/client").Prisma.PrismaPromise<({
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
        spotifyId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        artists: string[];
        note: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
        createdAt: Date;
    })[]>;
    addFavorite(req: AuthedRequest, spotifyId: string): Promise<{
        id: string;
        spotifyId: string | null;
        isFavorite: boolean;
    }>;
    removeFavorite(req: AuthedRequest, spotifyId: string): Promise<{
        id: string;
        spotifyId: string | null;
        isFavorite: boolean;
    }>;
    create(req: AuthedRequest, dto: CreateSavedLyricDto): Promise<{
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
        spotifyId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        artists: string[];
        note: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
        createdAt: Date;
    }>;
    updateLyrics(req: AuthedRequest, id: string, dto: UpdateSavedLyricDto): Promise<{
        id: string;
        userId: string;
        searchHistoryId: string | null;
        spotifyId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        artists: string[];
        note: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
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
    updateVisibility(req: AuthedRequest, id: string, dto: UpdateVisibilityDto): Promise<{
        id: string;
        visibility: import("@prisma/client").$Enums.Visibility;
    }>;
}
export {};
