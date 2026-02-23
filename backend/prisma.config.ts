import { defineConfig } from 'prisma/config';

// datasource URL is defined in prisma/schema.prisma via env("DATABASE_URL").
// Do not reference DATABASE_URL here — this file is loaded at build time
// (prisma generate) when no database is available.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
});
