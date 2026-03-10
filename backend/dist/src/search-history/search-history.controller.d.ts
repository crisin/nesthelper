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
    getAll(req: AuthedRequest): Promise<{
        url: string;
        id: string;
        userId: string;
        spotifyId: string;
        track: string;
        artist: string;
        artists: string[];
        createdAt: Date;
        imgUrl: string | null;
    }[]>;
    getGlobal(): Promise<({
        user: {
            name: string | null;
        };
    } & {
        url: string;
        id: string;
        userId: string;
        spotifyId: string;
        track: string;
        artist: string;
        artists: string[];
        createdAt: Date;
        imgUrl: string | null;
    })[]>;
    create(req: AuthedRequest, dto: CreateSearchHistoryDto): Promise<{
        url: string;
        id: string;
        userId: string;
        spotifyId: string;
        track: string;
        artist: string;
        artists: string[];
        createdAt: Date;
        imgUrl: string | null;
    }>;
    remove(req: AuthedRequest, id: string): Promise<void>;
}
export {};
