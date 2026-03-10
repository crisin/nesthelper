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
exports.SavedLyricsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const upsert_note_dto_1 = require("./dto/upsert-note.dto");
const saved_lyrics_service_1 = require("./saved-lyrics.service");
let SavedLyricsController = class SavedLyricsController {
    service;
    constructor(service) {
        this.service = service;
    }
    getAll(req) {
        return this.service.getAll(req.user.id);
    }
    getFavorites(req) {
        return this.service.getFavorites(req.user.id);
    }
    ensureBySpotify(req, spotifyId) {
        return this.service.ensureBySpotifyId(req.user.id, spotifyId);
    }
    addFavorite(req, spotifyId) {
        return this.service.setFavorite(req.user.id, spotifyId, true);
    }
    removeFavorite(req, spotifyId) {
        return this.service.setFavorite(req.user.id, spotifyId, false);
    }
    getOne(req, id) {
        return this.service.getOne(req.user.id, id);
    }
    remove(req, id) {
        return this.service.remove(req.user.id, id);
    }
    upsertNote(req, id, dto) {
        return this.service.upsertNote(req.user.id, id, dto.text);
    }
};
exports.SavedLyricsController = SavedLyricsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('favorites'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "getFavorites", null);
__decorate([
    (0, common_1.Get)('by-spotify/:spotifyId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('spotifyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "ensureBySpotify", null);
__decorate([
    (0, common_1.Post)('favorite/:spotifyId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('spotifyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "addFavorite", null);
__decorate([
    (0, common_1.Delete)('favorite/:spotifyId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('spotifyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "removeFavorite", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "getOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/note'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upsert_note_dto_1.UpsertNoteDto]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "upsertNote", null);
exports.SavedLyricsController = SavedLyricsController = __decorate([
    (0, common_1.Controller)('saved-lyrics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [saved_lyrics_service_1.SavedLyricsService])
], SavedLyricsController);
//# sourceMappingURL=saved-lyrics.controller.js.map