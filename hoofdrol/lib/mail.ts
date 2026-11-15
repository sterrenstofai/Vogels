// Mail naar de klant. Met RESEND_API_KEY gaat het via Resend; zonder sleutel wordt
// er niets verstuurd en staat het bericht alleen in het beheer onder "Mail".
// De Resend-koppeling is nog niet met een echte sleutel getest.
import { getStory } from './stories';
import { euro } from './pricing';
import { logMail, saveOrder, type Order } from './store';

const SITE = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const mailMode = () => (process.env.RESEND_API_KEY ? 'resend' : 'test');

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function opmaak(kop: string, alineas: string[], knop?: { tekst: string; url: string }) {
  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:22px"><tr><td style="padding:36px 34px">
<p style="margin:0 0 28px;font-size:17px;font-weight:600;letter-spacing:-.02em">Hoofdrol</p>
<h1 style="margin:0 0 16px;font-size:28px;line-height:1.1;letter-spacing:-.03em">${esc(kop)}</h1>
${alineas.map((a) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#424245">${esc(a)}</p>`).join('\n')}
${knop ? `<p style="margin:26px 0 6px"><a href="${esc(knop.url)}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;border-radius:999px;padding:13px 24px;font-size:16px">${esc(knop.tekst)}</a></p>` : ''}
</td></tr></table>
<p style="margin:18px 0 0;font-size:12px;color:#86868b">Je krijgt deze mail omdat je een boek hebt besteld of wilt inloggen bij Hoofdrol.</p>
</td></tr></table></body></html>`;
  const tekst = [kop, '', ...alineas, ...(knop ? ['', `${knop.tekst}: ${knop.url}`] : [])].join('\n');
  return { html, tekst };
}

export async function stuurMail(aan: string, onderwerp: string, kop: string, alineas: string[], knop?: { tekst: string; url: string }) {
  const { html, tekst } = opmaak(kop, alineas, knop);
  let verstuurd = false;
  let fout: string | undefined;
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch(`${(process.env.RESEND_API || 'https://api.resend.com').replace(/\/$/, '')}/emails`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.MAIL_VAN || 'Hoofdrol <boeken@example.com>', to: [aan], subject: onderwerp, html, text: tekst }),
      });
      verstuurd = res.ok;
      if (!res.ok) fout = `Resend ${res.status}: ${(await res.text()).slice(0, 200)}`;
    } catch (e) {
      fout = e instanceof Error ? e.message : 'onbekende fout';
    }
    if (fout) console.error('[mail]', fout);
  }
  await logMail({ at: new Date().toISOString(), aan, onderwerp, tekst, verstuurd, fout }).catch((e) => console.error('[mail] bewaren mislukt', e));
  return verstuurd;
}

export const mailInloglink = (aan: string, link: string) =>
  stuurMail(aan, 'Je inloglink voor Hoofdrol', 'Log in bij Hoofdrol.', ['Met de knop hieronder log je in. De link werkt een half uur en één keer.', 'Heb je dit niet aangevraagd? Dan hoef je niets te doen.'], { tekst: 'Log in', url: link });

type Bericht = 'betaald' | 'nakijken' | 'drukker' | 'verzonden' | 'mislukt' | 'terugbetaald';

// Stuurt een bericht over een bestelling, hooguit één keer per soort.
export async function mailOver(order: Order, soort: Bericht) {
  if (!order.email || order.gemaild?.includes(soort)) return;
  const story = getStory(order.storySlug)!;
  const boek = `${story.titel} voor ${order.childName}`;
  const maken = { url: `${SITE()}/maken/${order.id}` };
  const b: Record<Bericht, [string, string, string[], { tekst: string; url: string }?]> = {
    betaald: [`Bedankt voor je bestelling: ${boek}`, 'Bedankt. Nu de foto nog.', [`We hebben je betaling van ${euro(order.totaalCents)} ontvangen.`, `Stuur nu één duidelijke foto van ${order.childName} in. Daarna maken we de platen; dat duurt een paar minuten.`, 'Bewaar deze mail: met de knop kom je altijd terug bij je boek.'], { tekst: 'Stuur de foto in', ...maken }],
    nakijken: [`Het boek van ${order.childName} is klaar om na te kijken`, 'De platen zijn klaar.', [`Blader door het boek van ${order.childName}. Niet tevreden over een plaat? Je mag er drie opnieuw laten maken.`, 'Het boek gaat pas naar de drukker als jij akkoord geeft.'], { tekst: 'Kijk het boek na', ...maken }],
    drukker: [`${boek} is naar de drukker`, 'Het boek is naar de drukker.', ['Drukken en bezorgen duurt ongeveer een week. Je krijgt een mail zodra het boek onderweg is.', 'De foto hebben we verwijderd.'], { tekst: 'Bekijk je bestelling', ...maken }],
    verzonden: [`${boek} is onderweg`, 'Het boek is onderweg.', [order.track?.code ? `De volgcode is ${order.track.code}.` : 'Het boek is verstuurd.', 'Veel leesplezier.'], order.track?.url ? { tekst: 'Volg de bezorging', url: order.track.url } : { tekst: 'Bekijk je bestelling', ...maken }],
    mislukt: [`Er ging iets mis met ${boek}`, 'Er ging iets mis met de platen.', ['Het lukte niet om alle platen te maken. Je hoeft niets te doen: we kijken ernaar en je hoort van ons.', 'Je betaalt niets extra.']],
    terugbetaald: [`Je betaling voor ${boek} is teruggestort`, 'Je krijgt je geld terug.', [`We hebben ${euro(order.totaalCents)} teruggestort. Het staat binnen enkele werkdagen op je rekening.`]],
  };
  const [onderwerp, kop, alineas, knop] = b[soort];
  await stuurMail(order.email, onderwerp, kop, alineas, knop);
  order.gemaild = [...(order.gemaild ?? []), soort];
  await saveOrder(order);
}
