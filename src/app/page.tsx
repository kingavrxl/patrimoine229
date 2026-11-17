// src/app/page.tsx
import { prisma } from '@/lib/prisma';
import SimulationButton from '@/components/SimulationButton';

export default async function Dashboard() {
  const portfolios = await prisma.portfolio.findMany({
    include: { accounts: true },
  });

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Portefeuilles</h1>
      {portfolios.map((p) => (
        <div key={p.id} className="p-4 border rounded mb-2">
          <h2 className="font-semibold">{p.name}</h2>
          <p>{p.accounts.length} comptes</p>
          <SimulationButton portfolioId={p.id} />
        </div>
      ))}
    </main>
  );
}
