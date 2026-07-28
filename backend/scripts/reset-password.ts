/**
 * Lockout recovery: sets a fresh temporary password for one account.
 * The user has to pick a new one on their next login.
 *
 *   npx ts-node scripts/reset-password.ts <email> [password]
 *
 * Without a password argument a readable one is generated and printed.
 * Use this when nobody can get into the admin UI anymore.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5433/spotify-db';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/** Host/port/database only — never the credentials. */
function describeTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function generate(): string {
  return Array.from({ length: 3 }, () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(
      '',
    ),
  ).join('-');
}

async function main() {
  const [emailArg, passwordArg] = process.argv.slice(2);
  if (!emailArg) {
    console.error(
      'Usage: npx ts-node scripts/reset-password.ts <email> [password]',
    );
    process.exit(1);
  }

  // A recovery tool that quietly targets the wrong database is worse than no
  // recovery tool, and there is a fallback URL in play.
  console.log(`Database: ${describeTarget(connectionString)}`);
  if (!process.env.DATABASE_URL) {
    console.log('(DATABASE_URL not set — using the local dev fallback)');
  }

  const email = emailArg.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`No account found for ${email}`);
    process.exit(1);
  }

  const password = passwordArg?.trim() || generate();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, 12),
      mustChangePassword: true,
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });

  console.log(`\n  ${user.email}`);
  console.log(`  temporary password: ${password}`);
  console.log('  All existing sessions were invalidated.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
