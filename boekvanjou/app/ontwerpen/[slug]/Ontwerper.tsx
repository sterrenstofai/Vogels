'use client';
import { useState } from 'react';
import { Boek } from '@/components/Cover';
import { vulNaam, type Story } from '@/lib/stories';
import { PRIJZEN, euro, type Format } from '@/lib/pricing';

export function Ontwerper({ story }: { story: Story }) {
  const [naam, setNaam] = useState('');
  const [opdracht, setOpdracht] = useState('');
  const [format, setFormat] = useState<Format>('hardcover');
  const [fout, setFout] = useState('');
  const [bezig, setBezig] = useState(false);
  const toon = naam.trim() || 'jouw kind';

  async function verder(e: React.FormEvent) {
    e.preventDefault();
    setFout(''); setBezig(true);
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storySlug: story.slug, childName: naam, opdracht, format }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.fout);
      window.location.href = `/voorbeeld/${data.id}`;
    } catch (err) {
      setFout(err instanceof Error && err.message ? err.message : 'Er ging iets mis. Probeer het nog eens.');
      setBezig(false);
    }
  }

  return (
    <div className="twee">
      <div className="kleef">
        <div className="toon"><Boek story={story} naam={toon} /></div>
        <p className="zinproef">{vulNaam(story.scenes[0].tekst, toon)}</p>
      </div>
      <form className="form" onSubmit={verder}>
        <div className="stel"><h1>Ontwerp jullie boek.</h1><p>Je ziet meteen hoe het wordt. Betalen komt later.</p></div>
        <fieldset>
          <legend>Voor wie is het boek?</legend>
          <label>Voornaam van het kind
            <input type="text" value={naam} onChange={(e) => setNaam(e.target.value)} required maxLength={20} autoComplete="off" placeholder="Zoals die in het boek komt" />
          </label>
        </fieldset>
        <fieldset>
          <legend>Een opdracht voorin</legend>
          <label>Tekst op de eerste bladzijde (mag leeg blijven)
            <textarea value={opdracht} onChange={(e) => setOpdracht(e.target.value)} maxLength={160} rows={3} placeholder="Voor Sam, van opa en oma. Lees maar lekker." />
          </label>
          <span className="noot">{160 - opdracht.length} tekens over</span>
        </fieldset>
        <fieldset>
          <legend>Uitvoering</legend>
          <div className="keuze" role="radiogroup" aria-label="Uitvoering">
            {(['hardcover', 'softcover'] as Format[]).map((k) => (
              <label key={k}>
                <input type="radio" name="uitvoering" checked={format === k} onChange={() => setFormat(k)} />
                {k === 'hardcover' ? 'Harde kaft' : 'Zachte kaft'}
                <small>{euro(PRIJZEN.boek[k])}</small>
              </label>
            ))}
          </div>
        </fieldset>
        {fout && <p className="fout" role="alert">{fout}</p>}
        <button className="btn" disabled={bezig}>{bezig ? 'Even geduld…' : 'Bekijk jullie boek'}</button>
      </form>
    </div>
  );
}
