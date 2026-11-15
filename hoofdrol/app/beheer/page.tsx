import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminEmail } from '@/lib/auth';
import { listAllOrders } from '@/lib/store';
import { STATUS, cijfers } from '@/lib/beheer';
import { getStory } from '@/lib/stories';
import { euro } from '@/lib/pricing';

export const metadata = { title: 'Beheer', robots: { index: false } };
const dag = (iso: string) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });

export default async function Beheer({ searchParams }: { searchParams: Promise<{ alles?: string }> }) {
  if (!(await adminEmail())) notFound();
  const alles = !!(await searchParams).alles;
  const orders = await listAllOrders();
  const c = cijfers(orders);
  const toon = orders.filter((o) => alles || o.status !== 'draft');
  return (
    <main className="pagina">
      <div className="wrap">
        <nav className="beheernav" aria-label="Beheer"><strong>Bestellingen</strong><Link href="/beheer/mail">Mail</Link><Link href={alles ? '/beheer' : '/beheer?alles=1'}>{alles ? 'Verberg ontwerpen' : 'Toon ook ontwerpen'}</Link></nav>
        <div className="cijfers">
          <div className="cijfer"><b>{c.bestellingen}</b><span>betaalde bestellingen</span></div>
          <div className="cijfer"><b>{euro(c.omzet)}</b><span>omzet incl. btw</span></div>
          <div className="cijfer"><b>{euro(c.marge)}</b><span>na druk en verzending, over {c.margeOver} {c.margeOver === 1 ? 'boek' : 'boeken'}</span></div>
          <div className="cijfer"><b>{c.onderweg}</b><span>in de maak</span></div>
          <div className="cijfer"><b>{c.actie}</b><span>mislukt, actie nodig</span></div>
        </div>
        {toon.length === 0 ? <p className="grijs">Nog geen bestellingen.</p> : (
          <div className="tabelwrap">
            <table className="lijst">
              <thead><tr><th>Datum</th><th>Boek</th><th>Klant</th><th>Stand</th><th className="num">Bedrag</th><th className="num">Inkoop</th><th>Drukker</th></tr></thead>
              <tbody>
                {toon.map((o) => (
                  <tr key={o.id}>
                    <td>{dag(o.createdAt)}</td>
                    <td><Link href={`/beheer/${o.id}`}>{getStory(o.storySlug)?.titel} voor {o.childName}</Link></td>
                    <td>{o.email || '—'}</td>
                    <td><span className={`label ${STATUS[o.status][1]}`}>{STATUS[o.status][0]}</span></td>
                    <td className="num">{o.totaalCents ? euro(o.totaalCents) : '—'}</td>
                    <td className="num">{o.inkoopCents != null ? euro(o.inkoopCents) : '—'}</td>
                    <td>{o.drukker ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
