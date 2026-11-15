'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function Handelingen({ id, status, heeftFoto, betaald, track }: { id: string; status: string; heeftFoto: boolean; betaald: boolean; track?: { code: string; url?: string } }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState('');

  async function doe(actie: string, extra: object = {}, vraag?: string) {
    if (vraag && !window.confirm(vraag)) return;
    setBezig(true); setMelding('');
    const res = await fetch(`/api/beheer/orders/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actie, ...extra }) });
    const data = await res.json().catch(() => ({}));
    setBezig(false);
    setMelding(res.ok ? 'Gedaan.' : data.fout || 'Er ging iets mis.');
    router.refresh();
  }

  return (
    <>
      <div className="knoppen">
        {(status === 'failed' || status === 'generating') && <button className="knop2" disabled={bezig || !heeftFoto} onClick={() => doe('opnieuw')}>Probeer de mislukte platen opnieuw</button>}
        {status === 'review' && <button className="knop2" disabled={bezig} onClick={() => doe('herkansingen')}>Geef drie extra herkansingen</button>}
        {(status === 'review' || status === 'printing') && <button className="knop2" disabled={bezig} onClick={() => doe('drukker', {}, status === 'printing' ? 'Dit plaatst een nieuwe opdracht bij de drukker. Doorgaan?' : 'Het boek namens de klant naar de drukker sturen?')}>{status === 'printing' ? 'Stuur opnieuw naar de drukker' : 'Stuur naar de drukker'}</button>}
        {heeftFoto && <button className="knop2" disabled={bezig} onClick={() => doe('verwijderfoto', {}, 'De foto van de klant verwijderen? Platen opnieuw maken kan daarna niet meer.')}>Verwijder de foto</button>}
        {betaald && <button className="knop2 rood" disabled={bezig} onClick={() => doe('terugbetalen', {}, 'Het hele bedrag terugstorten naar de klant?')}>Betaal terug</button>}
      </div>
      {(status === 'printing' || status === 'shipped') && (
        <form className="knoppen" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); doe('verzonden', { code: f.get('code'), url: f.get('url') }); }}>
          <label>Volgcode<input type="text" name="code" defaultValue={track?.code} /></label>
          <label>Volgadres (https)<input type="text" name="url" defaultValue={track?.url} /></label>
          <button className="knop2" disabled={bezig}>{status === 'shipped' ? 'Werk de volgcode bij' : 'Zet op verzonden en mail de klant'}</button>
        </form>
      )}
      {melding && <p className="noot" role="status">{melding}</p>}
    </>
  );
}
