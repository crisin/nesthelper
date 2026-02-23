/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  const isProd = process.env.NODE_ENV === 'production';
  const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  app.enableCors({
    origin: (origin, callback) => {
      // allow requests with no origin (e.g. curl, mobile apps)
      if (!origin) return callback(null, true);
      if (isProd) {
        // FRONTEND_URL must be set on the backend Railway service, e.g.:
        // https://frontend-production-xxxx.up.railway.app
        const allowed = process.env.FRONTEND_URL;
        if (allowed && origin === allowed) return callback(null, true);
        // Use callback(null, false) — never throw; throwing causes Express to
        // return 500 with no CORS headers, which the browser reports as a
        // missing Access-Control-Allow-Origin header.
        return callback(null, false);
      }
      if (devOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap().catch(() => {
  console.log('Backend error during startup');
  process.exit(1);
});
