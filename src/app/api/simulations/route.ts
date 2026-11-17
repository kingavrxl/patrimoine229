import { NextResponse } from 'next/server';
import { TaxEngine } from '@/engines/tax-engine/tax-engine';

export async function POST(req: Request) {
  const body = await req.json();
  const engine = new TaxEngine();
  const result = await engine.calculateImpact(body, [{ condition: 'always', value: 1500 }]);
  return NextResponse.json(result);
}
