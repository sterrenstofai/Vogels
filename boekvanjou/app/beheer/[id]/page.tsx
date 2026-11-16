import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminEmail } from '@/lib/auth';
import { getOrder } from '@/lib/store';
import { STATUS } from '@/lib/beheer';
import { getStory } from '@/lib/stories';
import { BTW, euro } from '@/lib/pricing';
import { Handelingen } from './Handelingen';

export const metadata = { title: 'Bestelling', robots: { index: false } };
const moment = (iso?: string) => (iso ? new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—');

export default async function Bestelling({ params }: { params: Promise<{ id: string }> }) {
  if (!(await adminEmail())) notFound();
  const o = await getOrder((await params).id);
  if (!o) notFound();
  const story = getStory(o.storySlug)!;
  const netto = Math.round(o.totaalCents / (1 + BTW));
  return (
    <main className="pagina">
      <div className="wrap" style={{ maxWidth: 900 }}>
        <nav className="beheernav" aria-label="Beheer"><Link href="/beheer">‹ Bestellingen</Link></nav>
        <div className="stel" style={{ marginBottom: 30 }}>
          <span className={`label ${STATUS[o.status][1]}`}>{STATUS[o.status][0]}</span>
          <h1>{story.titel} voor {o.childName}</h1>
          {o.error && <p className="fout">Laatste fout: {o.error}</p>}
        </div>

        <section className="paneel">
          <h2>Wat nu</h2>
          <Handelingen id={o.id} status={o.status} heeftFoto={o.hasPhoto} betaald={!!o.paidAt && !o.refundedAt} track={o.track} />
        </section>

        <section className="paneel">
          <h2>Bestelling</h2>
          <dl className="gegevens">
            <dt>Klant</dt><dd>{o.email || '—'}</dd>
            <dt>Bezorgen</dt><dd>{o.shipping.naam ? `${o.shipping.naam}, ${o.shipping.straat}, ${o.shipping.postcode} ${o.shipping.plaats}, ${o.shipping.land}` : '—'}</dd>
            <dt>Uitvoering</dt><dd>{o.aantal} × {o.format === 'hardcover' ? 'harde kaft' : 'zachte kaft'}</dd>
            <dt>Opdracht voorin</dt><dd>{o.opdracht || '—'}</dd>
            <dt>Gemaakt</dt><dd>{moment(o.createdAt)}</dd>
            <dt>Betaald</dt><dd>{moment(o.paidAt)}{o.paymentId ? ` (${o.paymentId})` : ''}</dd>
            <dt>Naar drukker</dt><dd>{moment(o.approvedAt)}{o.drukker ? ` (${o.drukker}, ${o.printOrderId})` : ''}</dd>
            <dt>Verzonden</dt><dd>{moment(o.shippedAt)}{o.track?.code ? ` (${o.track.code})` : ''}</dd>
            <dt>Mail verstuurd</dt><dd>{o.gemaild?.join(', ') || '—'}</dd>
          </dl>
        </section>

        <section className="paneel">
          <h2>Geld</h2>
          <dl className="gegevens">
            <dt>Betaald door klant</dt><dd>{o.totaalCents ? euro(o.totaalCents) : '—'}</dd>
            <dt>Zonder btw</dt><dd>{o.totaalCents ? euro(netto) : '—'}</dd>
            <dt>Druk en verzending</dt><dd>{o.inkoopCents != null ? euro(o.inkoopCents) : 'nog niet bekend'}</dd>
            <dt>Blijft over</dt><dd>{o.inkoopCents != null ? `${euro(netto - o.inkoopCents)} (vóór beeld- en betaalkosten)` : '—'}</dd>
          </dl>
        </section>

        <section className="paneel">
          <h2>Platen</h2>
          <div className="duimen">
            {o.pages.map((p, i) => p.status === 'done'
              ? <a key={i} href={`/api/orders/${o.id}/files/pagina-${i}.jpg`} target="_blank"><img src={`/api/orders/${o.id}/files/pagina-${i}.jpg?v=${p.version}`} alt={`Plaat ${i + 1}`} loading="lazy" /></a>
              : <span key={i}>{i + 1}: {p.status === 'failed' ? 'mislukt' : p.status === 'running' ? 'bezig' : 'wacht'}</span>)}
          </div>
          <p className="noot">
            {o.hasPhoto ? 'De foto van de klant staat er nog.' : 'Er staat geen foto (meer) van de klant.'}
            {o.approvedAt && <> · <a href={`/api/orders/${o.id}/files/boek.pdf`} target="_blank">binnenwerk (pdf)</a> · <a href={`/api/orders/${o.id}/files/omslag.pdf`} target="_blank">omslag (pdf)</a></>}
            {' '}· <a href={`/maken/${o.id}`} target="_blank">pagina van de klant</a>
          </p>
        </section>
      </div>
    </main>
  );
}
