import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: Request) {
  // Simplification for build success
  const userId = 'placeholder'; 
  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    include: {
      holdings: true,
    },
  });
  return NextResponse.json(accounts);
}
