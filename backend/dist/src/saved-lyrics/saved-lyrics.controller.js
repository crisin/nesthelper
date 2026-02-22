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
const create_saved_lyric_dto_1 = require("./dto/create-saved-lyric.dto");
const update_saved_lyric_dto_1 = require("./dto/update-saved-lyric.dto");
const saved_lyrics_service_1 = require("./saved-lyrics.service");
let SavedLyricsController = class SavedLyricsController {
    service;
    constructor(service) {
        this.service = service;
    }
    getAll(req) {
        return this.service.getAll(req.user.id);
    }
    create(req, dto) {
        return this.service.create(req.user.id, dto);
    }
    updateLyrics(req, id, dto) {
        return this.service.updateLyrics(req.user.id, id, dto);
    }
    remove(req, id) {
        return this.service.remove(req.user.id, id);
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
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_saved_lyric_dto_1.CreateSavedLyricDto]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_saved_lyric_dto_1.UpdateSavedLyricDto]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "updateLyrics", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SavedLyricsController.prototype, "remove", null);
exports.SavedLyricsController = SavedLyricsController = __decorate([
    (0, common_1.Controller)('saved-lyrics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [saved_lyrics_service_1.SavedLyricsService])
], SavedLyricsController);
//# sourceMappingURL=saved-lyrics.controller.js.map