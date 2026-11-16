// Twee vormgevingen naast elkaar. De standaard staat in de instellingen (KOP en KLEUR);
// via /optie?kop=band&kleur=pastel kijk je in je eigen browser naar de andere, en /optie zet dat weer terug.
import { cookies } from 'next/headers';

export type Kop = 'boeken' | 'band'; // zwevende boeken, of een gebogen band van omslagen en platen
export type Kleur = 'licht' | 'pastel'; // wit en lichtgrijs, of lila-grijs met bewegende wolken kleur

const kop = (v?: string): Kop | undefined => (v === 'boeken' || v === 'band' ? v : undefined);
const kleur = (v?: string): Kleur | undefined => (v === 'licht' || v === 'pastel' ? v : undefined);

export async function opties(): Promise<{ kop: Kop; kleur: Kleur }> {
  const c = await cookies();
  return {
    kop: kop(c.get('kop')?.value) ?? kop(process.env.KOP) ?? 'boeken',
    kleur: kleur(c.get('kleur')?.value) ?? kleur(process.env.KLEUR) ?? 'licht',
  };
}
export const geldig = { kop, kleur };
