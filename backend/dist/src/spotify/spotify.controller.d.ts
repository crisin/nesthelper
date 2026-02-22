import { ConfigService } from '@nestjs/config';
import { SpotifyService } from './spotify.service';
type AuthedRequest = {
    user: {
        id: string;
    };
};
export declare class SpotifyController {
    private readonly spotify;
    private readonly config;
    constructor(spotify: SpotifyService, config: ConfigService);
    getConnectUrl(req: AuthedRequest): {
        url: string;
    };
    callback(code: string, state: string, error?: string): Promise<{
        url: string;
    }>;
    status(req: AuthedRequest): Promise<{
        connected: boolean;
        spotifyId: string | null;
    }>;
    disconnect(req: AuthedRequest): Promise<void>;
    currentTrack(req: AuthedRequest): Promise<any>;
}
export {};
