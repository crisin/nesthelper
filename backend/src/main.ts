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
  // Use a plain string/array (not a callback) so the cors package always
  // handles OPTIONS preflights itself with a proper 204 response.
  // With a callback returning false, OPTIONS falls through to the NestJS
  // router which returns 404, causing confusing "CORS header missing" errors.
  app.enableCors({
    origin: isProd ? (process.env.FRONTEND_URL ?? []) : devOrigins,
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
