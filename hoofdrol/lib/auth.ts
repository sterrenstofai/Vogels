// Inloggen zonder wachtwoord: een link per e-mail, daarna een sessie in een cookie.
import { cookies } from 'next/headers';
import { getRecord } from './store';

export const COOKIE = 'sessie';

export async function currentEmail(): Promise<string | null> {
  const sid = (await cookies()).get(COOKIE)?.value;
  if (!sid || !/^[a-f0-9]{64}$/.test(sid)) return null;
  return (await getRecord('sessions', sid))?.email ?? null;
}
