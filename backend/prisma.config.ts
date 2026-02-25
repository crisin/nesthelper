import { defineConfig } from 'prisma/config';

// process.env.DATABASE_URL is used instead of env() from 'prisma/config':
// - env() throws at build time when DATABASE_URL is not set (prisma generate)
// - process.env.DATABASE_URL returns undefined and falls back to the placeholder,
//   which is enough for prisma generate (no DB connection needed)
// - At runtime DATABASE_URL is set, so migrate deploy gets the real URL
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/spotify-db',
  },
});
