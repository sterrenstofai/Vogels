'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bladerboek } from '@/components/Bladerboek';
import { Stappen } from '@/components/Stappen';
import { getStory } from '@/lib/stories';
import { boekBladen } from '@/lib/boek';

type Page = { status: 'pending' | 'running' | 'done' | 'failed'; version: number; tekst: string };
type View = { id: string; status: 'draft' | 'awaiting_payment' | 'paid' | 'generating' | 'review' | 'printing' | 'shipped' | 'refunded' | 'failed'; track?: { code: string; url?: string }; titel: string; childName: string; opdracht: string; storySlug: string; regenerationsLeft: number; error?: string; pages: Page[] };

export function Werkplaats({ id }: { id: string }) {
  const [v, setV] = useState<View | null>(null);
  const [fout, setFout] = useState('');
  const [bezig, setBezig] = useState(false);
  const [open, setOpen] = useState<number[]>([]);
  const [voorbeeld, setVoorbeeld] = useState('');
  const fotoRef = useRef<HTMLInputElement>(null);

  const haalOp = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
    if (res.ok) setV(await res.json());
  }, [id]);

  const wacht = v?.status === 'awaiting_payment' || v?.status === 'generating';
  useEffect(() => { haalOp(); }, [haalOp]);
  useEffect(() => {
    if (!wacht) return;
    const t = setInterval(haalOp, 1500);
    return () => clearInterval(t);
  }, [wacht, haalOp]);

  async function doe(pad: string, init: RequestInit) {
    setFout(''); setBezig(true);
    try {
      const res = await fetch(`/api/orders/${id}/${pad}`, { method: 'POST', ...init });
      const data = await res.json();
      if (!res.ok) throw new Error(data.fout);
      setV(data);
    } catch (e) {
      setFout(e instanceof Error && e.message ? e.message : 'Er ging iets mis. Probeer het nog eens.');
    } finally {
      setBezig(false);
    }
  }

  if (!v) return <div className="status"><p>Even laden…</p></div>;
  const src = (i: number) => `/api/orders/${id}/files/pagina-${i}.jpg?v=${v.pages[i].version}`;
  const klaar = v.pages.filter((p) => p.status === 'done').length;

  if (v.status === 'awaiting_payment')
    return (
      <div className="status">
        <h1>We wachten op je betaling</h1>
        <p>Zodra de betaling binnen is, kun je hier de foto insturen. Deze pagina ververst vanzelf.</p>
      </div>
    );

  if (v.status === 'paid')
    return (
      <form
        className="status"
        data-stap="foto"
        onSubmit={(e) => { e.preventDefault(); doe('photo', { body: new FormData(e.currentTarget) }); }}
      >
        <Stappen nu={3} />
        <span className="hand">Bedankt, de betaling is binnen</span>
        <h1>Stuur een foto van {v.childName}</h1>
        <label className="upload">
          <input ref={fotoRef} type="file" name="foto" accept="image/jpeg,image/png,image/webp" required
            onChange={(e) => { const f = e.target.files?.[0]; setVoorbeeld(f ? URL.createObjectURL(f) : ''); }} />
          {voorbeeld ? <img src={voorbeeld} alt="De gekozen foto" /> : <strong>Kies een foto</strong>}
          <span className="noot">{voorbeeld ? 'Tik om een andere foto te kiezen' : 'jpg, png of webp, maximaal 12 MB'}</span>
        </label>
        <ul className="tips">
          <li>Gezicht van voren en scherp in beeld</li>
          <li>Bij daglicht, zonder pet of zonnebril</li>
          <li>Alleen {v.childName} op de foto</li>
        </ul>
        <label className="vink">
          <input type="checkbox" name="toestemming" value="ja" required />
          <span>Ik ben ouder of verzorger van dit kind en geef toestemming om deze foto te gebruiken voor het maken van dit boek. De foto wordt daarna verwijderd.</span>
        </label>
        {fout && <p className="fout" role="alert">{fout}</p>}
        <button className="btn" disabled={bezig}>{bezig ? 'Foto versturen…' : 'Maak de platen'}</button>
        <p className="noot">Let op: de foto kun je één keer insturen. Kies dus een goede.</p>
      </form>
    );

  if (v.status === 'generating')
    return (
      <div className="status" aria-live="polite">
        <Stappen nu={3} />
        <h1>We tekenen {v.childName} in het verhaal</h1>
        <p>{klaar} van de {v.pages.length} platen zijn klaar. Je kunt deze pagina open laten of later terugkomen via dezelfde link.</p>
        <div className="balk" role="progressbar" aria-valuemin={0} aria-valuemax={v.pages.length} aria-valuenow={klaar}><i style={{ width: `${(klaar / v.pages.length) * 100}%` }} /></div>
        <div className="platen">
          {v.pages.map((p, i) => (
            <div key={i} className={`plaat ${p.status === 'done' ? '' : 'bezig'}`}>
              {p.status === 'done' ? <img src={src(i)} alt={`Plaat ${i + 1}`} /> : <span>{i + 1}</span>}
            </div>
          ))}
        </div>
      </div>
    );

  if (v.status === 'review')
    return (
      <div className="blader">
        <Stappen nu={4} />
        <div className="kop midden" style={{ marginBottom: 0 }}>
          <h1>Kijk het boek na.</h1>
          <p>Blader er rustig doorheen. Niet tevreden over een plaat? Je mag er drie opnieuw laten maken.</p>
        </div>
        <Bladerboek story={getStory(v.storySlug)!} naam={v.childName} onBlad={setOpen}
          bladen={boekBladen(getStory(v.storySlug)!, v.childName, v.opdracht)} platen={v.pages.map((_, i) => src(i))} />
        {fout && <p className="fout" role="alert">{fout}</p>}
        <div className="acties">
          {open.map((i) => (
            <button key={i} className="link" disabled={bezig || v.regenerationsLeft === 0} onClick={() => doe('regenerate', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pagina: i }) })}>
              Maak plaat {i + 1} opnieuw
            </button>
          ))}
          {open.length > 0 && <span className="noot">{v.regenerationsLeft} over</span>}
        </div>
        <div className="acties">
          <button className="btn" disabled={bezig} onClick={() => { if (window.confirm('Het boek gaat nu naar de drukker en kan daarna niet meer worden aangepast. Doorgaan?')) doe('approve', {}); }}>
            {bezig ? 'Even geduld…' : 'Ziet er goed uit, drukken maar'}
          </button>
        </div>
      </div>
    );

  if (v.status === 'printing' || v.status === 'shipped')
    return (
      <div className="blader">
        <div className="kop midden" style={{ marginBottom: 0 }}>
          <span className="hand">{v.status === 'shipped' ? 'Onderweg' : 'Bij de drukker'}</span>
          <h1>{v.status === 'shipped' ? 'Het boek is onderweg.' : 'Het boek is naar de drukker.'}</h1>
          <p>{v.status === 'shipped'
            ? (v.track?.code ? `De volgcode is ${v.track.code}.` : `Het boek van ${v.childName} is verstuurd.`)
            : `Over ongeveer een week valt het boek van ${v.childName} op de mat. De foto hebben we verwijderd.`}</p>
        </div>
        <Bladerboek story={getStory(v.storySlug)!} naam={v.childName} bladen={boekBladen(getStory(v.storySlug)!, v.childName, v.opdracht)} platen={v.pages.map((_, i) => src(i))} />
        <div className="acties">
          {v.track?.url && <a className="btn" href={v.track.url} target="_blank" rel="noreferrer">Volg de bezorging</a>}
          <a href="/mijn">Mijn boeken</a>
        </div>
      </div>
    );

  if (v.status === 'refunded') return <div className="status"><h1>Terugbetaald.</h1><p>Deze bestelling is terugbetaald. Het bedrag staat binnen enkele werkdagen op je rekening.</p></div>;
  if (v.status === 'draft') return <div className="status"><h1>Nog niet besteld.</h1><p><a href={`/bestellen/${id}`}>Ga verder met bestellen</a></p></div>;

  return (
    <div className="status">
      <h1>Hier ging iets mis</h1>
      <p>Het lukte niet om alle platen te maken. Je hoeft niets te doen: we kijken ernaar en mailen je. Je betaalt niets extra.</p>
    </div>
  );
}
