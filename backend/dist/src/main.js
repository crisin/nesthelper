"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    const isProd = process.env.NODE_ENV === 'production';
    const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (isProd) {
                const allowed = process.env.FRONTEND_URL;
                if (origin === allowed)
                    return callback(null, true);
                return callback(new Error('Not allowed by CORS'));
            }
            if (devOrigins.includes(origin))
                return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    });
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map