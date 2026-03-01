import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavedLyricDto } from './dto/create-saved-lyric.dto';
import { UpdateSavedLyricDto } from './dto/update-saved-lyric.dto';
import { AddTagDto } from './dto/add-tag.dto';
export declare class SavedLyricsService {
    private readonly prisma;
    private readonly lyricsQueue;
    constructor(prisma: PrismaService, lyricsQueue: Queue | null);
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
    getFavorites(userId: string): import("@prisma/client").Prisma.PrismaPromise<({
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
    setFavorite(userId: string, spotifyId: string, isFavorite: boolean): Promise<{
        id: string;
        spotifyId: string | null;
        isFavorite: boolean;
    }>;
    create(userId: string, dto: CreateSavedLyricDto): Promise<{
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
    updateLyrics(userId: string, id: string, dto: UpdateSavedLyricDto): Promise<{
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
    updateVisibility(userId: string, id: string, visibility: 'PRIVATE' | 'FRIENDS' | 'PUBLIC'): Promise<{
        id: string;
        visibility: import("@prisma/client").$Enums.Visibility;
    }>;
}
