import { Prisma, SearchHistory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
type SearchHistoryWithUser = Prisma.SearchHistoryGetPayload<{
    include: {
        user: {
            select: {
                name: true;
            };
        };
    };
}>;
export declare class SearchHistoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getAll(userId: string): Promise<SearchHistory[]>;
    getGlobal(): Promise<SearchHistoryWithUser[]>;
    create(userId: string, dto: CreateSearchHistoryDto): Promise<SearchHistory>;
    remove(userId: string, id: string): Promise<void>;
}
export {};
