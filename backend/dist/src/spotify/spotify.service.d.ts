import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export interface SpotifyCurrentlyPlayingResponse {
    item: {
        id: string;
        name: string;
        artists: {
            name: string;
        }[];
        album: {
            images: {
                url: string;
            }[];
        };
        duration_ms: number;
    } | null;
    progress_ms: number | null;
    is_playing: boolean;
}
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
    getCurrentTrack(userId: string): Promise<SpotifyCurrentlyPlayingResponse | null>;
    seek(userId: string, positionMs: number): Promise<void>;
    private encodeState;
    private decodeState;
}
