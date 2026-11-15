'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Page = { status: 'pending' | 'running' | 'done' | 'failed'; version: number; tekst: string };
type View = { id: string; status: 'awaiting_payment' | 'paid' | 'generating' | 'review' | 'printing' | 'failed'; titel: string; childName: string; regenerationsLeft: number; error?: string; pages: Page[] };

export function Werkplaats({ id }: { id: string }) {
  const [v, setV] = useState<View | null>(null);
  const [fout, setFout] = useState('');
  const [bezig, setBezig] = useState(false);
  const [blad, setBlad] = useState(0);
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
        onSubmit={(e) => { e.preventDefault(); doe('photo', { body: new FormData(e.currentTarget) }); }}
      >
        <span className="hand" style={{ justifySelf: 'start' }}>bedankt, de betaling is binnen</span>
        <h1>Stuur een foto van {v.childName}</h1>
        <label className="upload">
          <input ref={fotoRef} type="file" name="foto" accept="image/jpeg,image/png,image/webp" required
            onChange={(e) => { const f = e.target.files?.[0]; setVoorbeeld(f ? URL.createObjectURL(f) : ''); }} />
          {voorbeeld ? <img src={voorbeeld} alt="De gekozen foto" /> : <strong style={{ fontSize: '1.3rem' }}>Kies een foto</strong>}
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
        <button className="btn" disabled={bezig}><span>{bezig ? 'Foto versturen…' : 'Maak de platen'}</span><b aria-hidden="true">→</b></button>
        <p className="noot">Let op: de foto kun je één keer insturen. Kies dus een goede.</p>
      </form>
    );

  if (v.status === 'generating')
    return (
      <div className="status" aria-live="polite">
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
        <div className="kop" style={{ marginBottom: 6 }}>
          <span className="hand">kijk het rustig na</span>
          <h1>{v.titel}</h1>
        </div>
        <div className="blad">
          <img src={src(blad)} alt={`Plaat ${blad + 1} van ${v.pages.length}`} />
          <div className="onder">{v.pages[blad].tekst}</div>
        </div>
        <div className="bladnav">
          <button className="rond" onClick={() => setBlad(blad - 1)} disabled={blad === 0} aria-label="Vorige bladzijde">←</button>
          <span>{blad + 1} van {v.pages.length}</span>
          <button className="rond" onClick={() => setBlad(blad + 1)} disabled={blad === v.pages.length - 1} aria-label="Volgende bladzijde">→</button>
        </div>
        {fout && <p className="fout" role="alert">{fout}</p>}
        <div className="acties">
          <button className="link" disabled={bezig || v.regenerationsLeft === 0} onClick={() => doe('regenerate', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pagina: blad }) })}>
            Maak deze plaat opnieuw ({v.regenerationsLeft} over)
          </button>
          <button className="btn" disabled={bezig} onClick={() => { if (window.confirm('Het boek gaat nu naar de drukker en kan daarna niet meer worden aangepast. Doorgaan?')) doe('approve', {}); }}>
            <span>{bezig ? 'Even geduld…' : 'Ziet er goed uit, drukken maar'}</span><b aria-hidden="true">→</b>
          </button>
        </div>
      </div>
    );

  if (v.status === 'printing')
    return (
      <div className="status">
        <span className="hand" style={{ justifySelf: 'start' }}>hoera</span>
        <h1>Het boek is naar de drukker</h1>
        <p>Over ongeveer een week valt het boek van {v.childName} op de mat. De foto hebben we verwijderd.</p>
        <p><a href={`/api/orders/${id}/files/boek.pdf`} target="_blank">Bekijk het drukbestand (pdf)</a></p>
      </div>
    );

  return (
    <div className="status">
      <h1>Hier ging iets mis</h1>
      <p>Het lukte niet om alle platen te maken. Je hoeft niets te doen: we kijken ernaar en mailen je. Je betaalt niets extra.</p>
    </div>
  );
}
