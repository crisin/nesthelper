import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  // Forging a token now means handing out ADMIN, so refuse to boot on a weak
  // or missing secret. docker-compose passes JWT_SECRET with no default, and an
  // unset host variable arrives as '' — which is "defined" enough to slip past
  // ConfigService.getOrThrow.
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set and at least 32 characters long — refusing to start',
    );
  }

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const isProd = process.env.NODE_ENV === 'production';
  // 5174 is what .claude/launch.json starts vite on; 5173 is the vite default.
  const devOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ];
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
bootstrap().catch((err) => {
  // Print the actual error — the owner-account bootstrap and the schema now run
  // at startup, and "Backend error during startup" hides exactly what broke.
  console.error('Backend error during startup:', err);
  process.exit(1);
});
