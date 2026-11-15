import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminEmail } from '@/lib/auth';
import { mailMode } from '@/lib/mail';
import { listMail } from '@/lib/store';

export const metadata = { title: 'Mail', robots: { index: false } };

export default async function Mail() {
  if (!(await adminEmail())) notFound();
  const mails = await listMail(60);
  return (
    <main className="pagina">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <nav className="beheernav" aria-label="Beheer"><Link href="/beheer">Bestellingen</Link><strong>Mail</strong></nav>
        <div className="stel" style={{ marginBottom: 20 }}>
          <h1>Mail.</h1>
          <p>{mailMode() === 'test' ? 'Er is nog geen maildienst ingesteld. Deze berichten zijn klaargezet maar niet verstuurd.' : 'De laatste berichten aan klanten.'}</p>
        </div>
        {mails.length === 0 && <p className="grijs">Nog geen berichten.</p>}
        {mails.map((m, i) => (
          <article className="paneel" key={i} style={{ gap: 4 }}>
            <h3>{m.onderwerp}</h3>
            <p className="noot">{new Date(m.at).toLocaleString('nl-NL')} · aan {m.aan} · <span className={`label ${m.verstuurd ? 'goed' : m.fout ? 'fout' : ''}`}>{m.verstuurd ? 'verstuurd' : m.fout ? 'mislukt' : 'niet verstuurd'}</span></p>
            <pre className="mailtekst">{m.tekst}</pre>
          </article>
        ))}
      </div>
    </main>
  );
}
