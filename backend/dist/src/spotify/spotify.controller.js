"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const spotify_service_1 = require("./spotify.service");
let SpotifyController = class SpotifyController {
    spotify;
    config;
    constructor(spotify, config) {
        this.spotify = spotify;
        this.config = config;
    }
    getConnectUrl(req) {
        const url = this.spotify.buildAuthUrl(req.user.id);
        return { url };
    }
    async callback(code, state, error) {
        const base = this.config.get('FRONTEND_URL') ?? 'http://127.0.0.1:5173';
        if (error || !code || !state) {
            return { url: `${base}/dashboard?spotify=error` };
        }
        try {
            await this.spotify.handleCallback(code, state);
            return { url: `${base}/dashboard?spotify=connected` };
        }
        catch {
            return { url: `${base}/dashboard?spotify=error` };
        }
    }
    status(req) {
        return this.spotify.getStatus(req.user.id);
    }
    async disconnect(req) {
        await this.spotify.disconnect(req.user.id);
    }
    currentTrack(req) {
        return this.spotify.getCurrentTrack(req.user.id);
    }
};
exports.SpotifyController = SpotifyController;
__decorate([
    (0, common_1.Get)('connect'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SpotifyController.prototype, "getConnectUrl", null);
__decorate([
    (0, common_1.Get)('callback'),
    (0, common_1.Redirect)(),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SpotifyController.prototype, "callback", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SpotifyController.prototype, "status", null);
__decorate([
    (0, common_1.Delete)('disconnect'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SpotifyController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Get)('current-track'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SpotifyController.prototype, "currentTrack", null);
exports.SpotifyController = SpotifyController = __decorate([
    (0, common_1.Controller)('spotify'),
    __metadata("design:paramtypes", [spotify_service_1.SpotifyService,
        config_1.ConfigService])
], SpotifyController);
//# sourceMappingURL=spotify.controller.js.map