"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const spotify_module_1 = require("./spotify/spotify.module");
const search_history_module_1 = require("./search-history/search-history.module");
const saved_lyrics_module_1 = require("./saved-lyrics/saved-lyrics.module");
const library_module_1 = require("./library/library.module");
const lyrics_module_1 = require("./lyrics/lyrics.module");
const line_annotations_module_1 = require("./line-annotations/line-annotations.module");
const search_module_1 = require("./search/search.module");
const collections_module_1 = require("./collections/collections.module");
const lyrics_fetch_module_1 = require("./lyrics-fetch/lyrics-fetch.module");
const analytics_module_1 = require("./analytics/analytics.module");
const digest_module_1 = require("./digest/digest.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    connection: {
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: parseInt(config.get('REDIS_PORT', '6379'), 10),
                    },
                }),
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            spotify_module_1.SpotifyModule,
            search_history_module_1.SearchHistoryModule,
            saved_lyrics_module_1.SavedLyricsModule,
            library_module_1.LibraryModule,
            lyrics_module_1.LyricsModule,
            line_annotations_module_1.LineAnnotationsModule,
            search_module_1.SearchModule,
            collections_module_1.CollectionsModule,
            lyrics_fetch_module_1.LyricsFetchModule,
            analytics_module_1.AnalyticsModule,
            digest_module_1.DigestModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map