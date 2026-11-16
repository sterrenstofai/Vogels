import { NextResponse } from 'next/server';
import { newId, putRecord } from '@/lib/store';
import { mailInloglink, mailMode } from '@/lib/mail';
import { magDoor } from '@/lib/limiet';

// Vraagt een inloglink aan. Het antwoord verraadt niet of er bestellingen bij dit adres horen.
export async function POST(req: Request) {
  if (!magDoor(req, 'login', 8)) return NextResponse.json({ fout: 'Te veel pogingen. Probeer het over een paar minuten opnieuw.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 120) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ fout: 'Dit e-mailadres klopt niet.' }, { status: 400 });
  const token = newId() + newId();
  await putRecord('logins', token, { email, exp: Date.now() + 30 * 60 * 1000 });
  const site = (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
  const link = `${site}/api/login/${token}`;
  await mailInloglink(email, link);
  // Zolang er geen maildienst is ingesteld, tonen we de link op het scherm.
  return NextResponse.json(mailMode() === 'test' ? { ok: true, testLink: `/api/login/${token}` } : { ok: true });
}
