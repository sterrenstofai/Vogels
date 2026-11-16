import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/auth';
import { delRecord, getRecord, newId, putRecord } from '@/lib/store';

const MAAND = 30 * 24 * 60 * 60;

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const rec = /^[a-f0-9]{64}$/.test(token) ? await getRecord('logins', token) : null;
  const naar = (pad: string) => new NextResponse(null, { status: 303, headers: { Location: pad } });
  if (!rec) return naar('/mijn?verlopen=1');
  await delRecord('logins', token); // een link werkt één keer
  const sid = newId() + newId();
  await putRecord('sessions', sid, { email: rec.email, exp: Date.now() + MAAND * 1000 });
  const res = naar('/mijn');
  res.cookies.set(COOKIE, sid, { httpOnly: true, sameSite: 'lax', secure: new URL(req.url).protocol === 'https:', path: '/', maxAge: MAAND });
  return res;
}
