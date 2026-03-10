import { SavedLyric, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
declare const BOOKMARK_INCLUDE: {
    song: {
        include: {
            lyrics: {
                include: {
                    lines: {
                        orderBy: {
                            lineNumber: "asc";
                        };
                    };
                    versions: {
                        orderBy: {
                            version: "desc";
                        };
                        take: number;
                    };
                };
            };
            tags: {
                orderBy: {
                    createdAt: "asc";
                };
            };
        };
    };
};
export type BookmarkWithSong = Prisma.SavedLyricGetPayload<{
    include: typeof BOOKMARK_INCLUDE;
}>;
export declare class SavedLyricsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAll(userId: string): Promise<BookmarkWithSong[]>;
    getFavorites(userId: string): Promise<BookmarkWithSong[]>;
    getOne(userId: string, id: string): Promise<BookmarkWithSong>;
    ensureBySpotifyId(userId: string, spotifyId: string): Promise<BookmarkWithSong>;
    setFavorite(userId: string, spotifyId: string, isFavorite: boolean): Promise<Pick<SavedLyric, 'id' | 'isFavorite'>>;
    upsertNote(userId: string, id: string, text: string): Promise<Pick<SavedLyric, 'id' | 'note'>>;
    remove(userId: string, id: string): Promise<void>;
}
export {};
