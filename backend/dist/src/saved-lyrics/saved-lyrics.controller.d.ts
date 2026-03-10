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
    getAll(req: AuthedRequest): Promise<({
        song: ({
            lyrics: ({
                lines: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    lineNumber: number;
                    text: string;
                    timestampMs: number | null;
                    songLyricsId: string | null;
                    lyricsId: string | null;
                }[];
                versions: {
                    id: string;
                    createdAt: Date;
                    rawText: string;
                    version: number;
                    songLyricsId: string | null;
                    lyricsId: string | null;
                }[];
            } & {
                id: string;
                createdAt: Date;
                songId: string;
                rawText: string;
                version: number;
                updatedAt: Date;
                lastEditedBy: string | null;
            }) | null;
            tags: {
                id: string;
                createdAt: Date;
                songId: string | null;
                savedLyricId: string | null;
                tag: string;
                type: import("@prisma/client").$Enums.TagType;
                addedBy: string | null;
            }[];
        } & {
            id: string;
            spotifyId: string;
            artist: string;
            artists: string[];
            videoUrl: string | null;
            fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
            updatedAt: Date;
            imgUrl: string | null;
            title: string;
            spotifyUrl: string | null;
            firstSeenAt: Date;
        }) | null;
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
        videoUrl: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
        createdAt: Date;
        songId: string | null;
    })[]>;
    getFavorites(req: AuthedRequest): Promise<({
        song: ({
            lyrics: ({
                lines: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    lineNumber: number;
                    text: string;
                    timestampMs: number | null;
                    songLyricsId: string | null;
                    lyricsId: string | null;
                }[];
                versions: {
                    id: string;
                    createdAt: Date;
                    rawText: string;
                    version: number;
                    songLyricsId: string | null;
                    lyricsId: string | null;
                }[];
            } & {
                id: string;
                createdAt: Date;
                songId: string;
                rawText: string;
                version: number;
                updatedAt: Date;
                lastEditedBy: string | null;
            }) | null;
            tags: {
                id: string;
                createdAt: Date;
                songId: string | null;
                savedLyricId: string | null;
                tag: string;
                type: import("@prisma/client").$Enums.TagType;
                addedBy: string | null;
            }[];
        } & {
            id: string;
            spotifyId: string;
            artist: string;
            artists: string[];
            videoUrl: string | null;
            fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
            updatedAt: Date;
            imgUrl: string | null;
            title: string;
            spotifyUrl: string | null;
            firstSeenAt: Date;
        }) | null;
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
        videoUrl: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
        createdAt: Date;
        songId: string | null;
    })[]>;
    ensureBySpotify(req: AuthedRequest, spotifyId: string): Promise<{
        song: ({
            lyrics: ({
                lines: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    lineNumber: number;
                    text: string;
                    timestampMs: number | null;
                    songLyricsId: string | null;
                    lyricsId: string | null;
                }[];
                versions: {
                    id: string;
                    createdAt: Date;
                    rawText: string;
                    version: number;
                    songLyricsId: string | null;
                    lyricsId: string | null;
                }[];
            } & {
                id: string;
                createdAt: Date;
                songId: string;
                rawText: string;
                version: number;
                updatedAt: Date;
                lastEditedBy: string | null;
            }) | null;
            tags: {
                id: string;
                createdAt: Date;
                songId: string | null;
                savedLyricId: string | null;
                tag: string;
                type: import("@prisma/client").$Enums.TagType;
                addedBy: string | null;
            }[];
        } & {
            id: string;
            spotifyId: string;
            artist: string;
            artists: string[];
            videoUrl: string | null;
            fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
            updatedAt: Date;
            imgUrl: string | null;
            title: string;
            spotifyUrl: string | null;
            firstSeenAt: Date;
        }) | null;
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
        videoUrl: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
        createdAt: Date;
        songId: string | null;
    }>;
    addFavorite(req: AuthedRequest, spotifyId: string): Promise<Pick<{
        id: string;
        userId: string;
        searchHistoryId: string | null;
        spotifyId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        artists: string[];
        note: string | null;
        videoUrl: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
        createdAt: Date;
        songId: string | null;
    }, "id" | "isFavorite">>;
    removeFavorite(req: AuthedRequest, spotifyId: string): Promise<Pick<{
        id: string;
        userId: string;
        searchHistoryId: string | null;
        spotifyId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        artists: string[];
        note: string | null;
        videoUrl: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
        createdAt: Date;
        songId: string | null;
    }, "id" | "isFavorite">>;
    getOne(req: AuthedRequest, id: string): Promise<{
        song: ({
            lyrics: ({
                lines: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    lineNumber: number;
                    text: string;
                    timestampMs: number | null;
                    songLyricsId: string | null;
                    lyricsId: string | null;
                }[];
                versions: {
                    id: string;
                    createdAt: Date;
                    rawText: string;
                    version: number;
                    songLyricsId: string | null;
                    lyricsId: string | null;
                }[];
            } & {
                id: string;
                createdAt: Date;
                songId: string;
                rawText: string;
                version: number;
                updatedAt: Date;
                lastEditedBy: string | null;
            }) | null;
            tags: {
                id: string;
                createdAt: Date;
                songId: string | null;
                savedLyricId: string | null;
                tag: string;
                type: import("@prisma/client").$Enums.TagType;
                addedBy: string | null;
            }[];
        } & {
            id: string;
            spotifyId: string;
            artist: string;
            artists: string[];
            videoUrl: string | null;
            fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
            updatedAt: Date;
            imgUrl: string | null;
            title: string;
            spotifyUrl: string | null;
            firstSeenAt: Date;
        }) | null;
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
        videoUrl: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
        createdAt: Date;
        songId: string | null;
    }>;
    remove(req: AuthedRequest, id: string): Promise<void>;
    upsertNote(req: AuthedRequest, id: string, dto: UpsertNoteDto): Promise<Pick<{
        id: string;
        userId: string;
        searchHistoryId: string | null;
        spotifyId: string | null;
        lyrics: string;
        track: string;
        artist: string;
        artists: string[];
        note: string | null;
        videoUrl: string | null;
        isFavorite: boolean;
        visibility: import("@prisma/client").$Enums.Visibility;
        fetchStatus: import("@prisma/client").$Enums.LyricsFetchStatus;
        createdAt: Date;
        songId: string | null;
    }, "id" | "note">>;
}
export {};
