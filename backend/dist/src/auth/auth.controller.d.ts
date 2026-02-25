import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
type AuthedRequest = {
    user: {
        id: string;
        email: string;
        name?: string;
    };
};
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(): void;
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string | null;
        };
        access_token: string;
    }>;
    me(req: AuthedRequest): {
        id: string;
        email: string;
        name?: string;
    };
    updateProfile(req: AuthedRequest, dto: UpdateProfileDto): Promise<{
        id: string;
        name: string | null;
        email: string;
    }>;
}
export {};
