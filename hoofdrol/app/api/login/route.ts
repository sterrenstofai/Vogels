import { NextResponse } from 'next/server';
import { newId, putRecord } from '@/lib/store';
import { paymentMode } from '@/lib/providers/payment';

// Vraagt een inloglink aan. Het antwoord verraadt niet of er bestellingen bij dit adres horen.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 120) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ fout: 'Dit e-mailadres klopt niet.' }, { status: 400 });
  const token = newId() + newId();
  await putRecord('logins', token, { email, exp: Date.now() + 30 * 60 * 1000 });
  const site = (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
  const link = `${site}/api/login/${token}`;
  // Hier hoort de mail met de link (nog niet gekoppeld). In de testversie tonen we de link op het scherm.
  console.log(`[inloggen] link voor ${email}: ${link}`);
  return NextResponse.json(paymentMode() === 'test' ? { ok: true, testLink: `/api/login/${token}` } : { ok: true });
}
