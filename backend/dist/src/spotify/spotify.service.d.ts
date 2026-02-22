import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class SpotifyService {
    private readonly prisma;
    private readonly config;
    private readonly clientId;
    private readonly clientSecret;
    private readonly redirectUri;
    private readonly scope;
    constructor(prisma: PrismaService, config: ConfigService);
    buildAuthUrl(userId: string): string;
    handleCallback(code: string, state: string): Promise<void>;
    getStatus(userId: string): Promise<{
        connected: boolean;
        spotifyId: string | null;
    }>;
    disconnect(userId: string): Promise<void>;
    getValidAccessToken(userId: string): Promise<string>;
    getCurrentTrack(userId: string): Promise<any>;
    private encodeState;
    private decodeState;
}
