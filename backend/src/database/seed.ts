import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const SEED_USERS = [
  {
    name: 'crisin',
    email: 'xxcrisinxx@gmail.com',
    password: 'Krille1711#',
  },
  {
    name: 'jacke',
    email: 'jacqueline_13@hotmail.de',
    password: 'Haifi1105#',
  },
];

async function main() {
  console.log('Seeding users...');

  const data = await Promise.all(
    SEED_USERS.map(async (u) => ({
      email: u.email,
      name: u.name,
      password: await bcrypt.hash(u.password, 12),
    })),
  );

  const result = await prisma.user.createMany({ data, skipDuplicates: true });
  console.log(`Created ${result.count} user(s) (skipped existing).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
