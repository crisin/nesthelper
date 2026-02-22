import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
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
    register(dto: RegisterDto): Promise<{
        user: {
            email: string;
            name: string | null;
            id: string;
        };
        access_token: string;
    }>;
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
        email: string;
        name: string | null;
        id: string;
    }>;
}
export {};
