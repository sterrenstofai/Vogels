// De opbouw van het boek, bladzijde voor bladzijde. Het bladerboek op de site en
// het drukbestand gebruiken allebei deze lijst, dus wat de klant ziet is wat er gedrukt wordt.
import { vulNaam, type Story } from './stories';

export type Blad =
  | { soort: 'titel'; titel: string; naam: string; opdracht: string }
  | { soort: 'tekst'; tekst: string; plaat: number }
  | { soort: 'plaat'; plaat: number; beeld: string }
  | { soort: 'einde' }
  | { soort: 'colofon'; naam: string }
  | { soort: 'leeg' };

// Drukkers vragen een minimum aantal bladzijden (bij fotoboeken vaak 24 of 30).
export const MIN_BLADZIJDEN = Number(process.env.BOEK_MIN_BLADZIJDEN) || 30;

export function boekBladen(story: Story, naam: string, opdracht: string, minimum = MIN_BLADZIJDEN): Blad[] {
  const b: Blad[] = [{ soort: 'titel', titel: story.titel, naam, opdracht }];
  story.scenes.forEach((s, i) => {
    b.push({ soort: 'tekst', tekst: vulNaam(s.tekst, naam), plaat: i }); // links
    b.push({ soort: 'plaat', plaat: i, beeld: s.beeld }); // rechts
  });
  b.push({ soort: 'einde' });
  while (b.length < minimum - 2 || b.length % 2 === 1) b.push({ soort: 'leeg' });
  b.push({ soort: 'colofon', naam }, { soort: 'leeg' });
  return b;
}
