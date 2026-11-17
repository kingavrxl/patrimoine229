import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      email: 'dev@opt.local',
      password: 'hashed_password_placeholder',
    },
  });

  const portfolio = await prisma.portfolio.create({
    data: {
      userId: user.id,
      name: 'Portefeuille Principal',
    },
  });

  await prisma.account.createMany({
    data: [
      { type: 'BANK', currency: 'EUR', userId: user.id, portfolioId: portfolio.id },
      { type: 'BROKER', currency: 'USD', userId: user.id, portfolioId: portfolio.id },
    ],
  });

  console.log('Seed data created successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
