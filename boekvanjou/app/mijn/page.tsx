import Link from 'next/link';
import { adminEmail, currentEmail } from '@/lib/auth';
import { listOrders } from '@/lib/store';
import { STAPPEN, stand } from '@/lib/orders';
import { getStory } from '@/lib/stories';
import { euro } from '@/lib/pricing';
import { Cover } from '@/components/Cover';
import { Inloggen } from './Inloggen';

export const metadata = { title: 'Mijn boeken', robots: { index: false } };

const datum = (iso: string) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

export default async function Mijn({ searchParams }: { searchParams: Promise<{ verlopen?: string }> }) {
  const email = await currentEmail();
  if (!email)
    return (
      <main className="pagina">
        <div className="wrap" style={{ maxWidth: 520 }}>
          <div className="stel" style={{ marginBottom: 34 }}>
            <h1>Mijn boeken.</h1>
            <p>Vul je e-mailadres in. We sturen je een link waarmee je inlogt, zonder wachtwoord.</p>
          </div>
          {(await searchParams).verlopen && <p className="fout" style={{ marginBottom: 20 }}>Deze link is verlopen of al gebruikt. Vraag een nieuwe aan.</p>}
          <Inloggen />
        </div>
      </main>
    );

  const orders = await listOrders(email);
  return (
    <main className="pagina">
      <div className="wrap" style={{ maxWidth: 860 }}>
        <div className="mijnkop">
          <div className="stel"><h1>Mijn boeken.</h1><p>{email}</p></div>
          <div className="knoppen" style={{ gap: 22 }}>{(await adminEmail()) && <Link href="/beheer">Beheer</Link>}<form method="post" action="/api/logout"><button className="link">Uitloggen</button></form></div>
        </div>
        {orders.length === 0 && (
          <div className="status"><h3>Nog geen boeken.</h3><p>Zodra je een boek bestelt met dit e-mailadres, staat het hier.</p><Link className="btn" href="/#verhalen">Kies een verhaal</Link></div>
        )}
        <div className="boekenlijst">
          {orders.map((o) => {
            const story = getStory(o.storySlug)!;
            const s = stand(o);
            return (
              <article className="boekrij" key={o.id}>
                <div className="duim"><Cover story={story} naam={o.childName} /></div>
                <div>
                  <h3>{story.titel} voor {o.childName}</h3>
                  <p className="noot">{datum(o.createdAt)} · {o.aantal} × {o.format === 'hardcover' ? 'harde kaft' : 'zachte kaft'} · {euro(o.totaalCents)}</p>
                  <ol className="voortgang" aria-label={`Stand: ${s.tekst}`}>
                    {STAPPEN.map((n, i) => <li key={n} className={i < s.stap ? 'af' : i === s.stap ? 'nu' : ''}>{n}</li>)}
                  </ol>
                  <p>{s.tekst}</p>
                  <Link className="pijl" href={o.status === 'awaiting_payment' ? `/bestellen/${o.id}` : `/maken/${o.id}`}>{s.actie}</Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
