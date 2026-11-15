import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE } from '@/lib/auth';
import { delRecord } from '@/lib/store';

export async function POST() {
  const sid = (await cookies()).get(COOKIE)?.value;
  if (sid && /^[a-f0-9]{64}$/.test(sid)) await delRecord('sessions', sid);
  const res = new NextResponse(null, { status: 303, headers: { Location: '/mijn' } });
  res.cookies.delete(COOKIE);
  return res;
}
