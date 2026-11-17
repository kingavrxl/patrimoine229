// src/components/SimulationButton.tsx
'use client';

export default function SimulationButton({ portfolioId }: { portfolioId: string }) {
  const runSimulation = async () => {
    const res = await fetch('/api/simulations', {
      method: 'POST',
      body: JSON.stringify({ portfolioId }),
    });
    const data = await res.json();
    alert(`Impact estimé: ${data.netImpact}€`);
  };

  return (
    <button 
      onClick={runSimulation}
      className="mt-2 bg-blue-500 text-white p-2 rounded"
    >
      Simuler Impact Fiscal
    </button>
  );
}
