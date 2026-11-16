// Inloggen zonder wachtwoord: een link per e-mail, daarna een sessie in een cookie.
import { cookies } from 'next/headers';
import { getRecord } from './store';

export const COOKIE = 'sessie';

export async function currentEmail(): Promise<string | null> {
  const sid = (await cookies()).get(COOKIE)?.value;
  if (!sid || !/^[a-f0-9]{64}$/.test(sid)) return null;
  return (await getRecord('sessions', sid))?.email ?? null;
}

// Beheerders staan in ADMIN_EMAILS (door komma's gescheiden). Zonder die instelling is er geen beheer.
export async function adminEmail(): Promise<string | null> {
  const email = await currentEmail();
  const lijst = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((e) => e.trim()).filter(Boolean);
  return email && lijst.includes(email.toLowerCase()) ? email : null;
}
