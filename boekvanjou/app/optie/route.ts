import { NextResponse } from 'next/server';
import { geldig } from '@/lib/opties';

// Kiest voor deze browser een andere vormgeving: /optie?kop=band&kleur=pastel. Zonder keuze: terug naar de standaard.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const res = new NextResponse(null, { status: 303, headers: { Location: '/' } });
  for (const naam of ['kop', 'kleur'] as const) {
    const v = geldig[naam](q.get(naam) ?? undefined);
    if (v) res.cookies.set(naam, v, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
    else res.cookies.delete(naam);
  }
  return res;
}
