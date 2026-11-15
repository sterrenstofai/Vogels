'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PRIJZEN, euro, orderTotaal, type Format } from '@/lib/pricing';

export function BestelFormulier({ slug }: { slug: string }) {
  const [format, setFormat] = useState<Format>('hardcover');
  const [aantal, setAantal] = useState(1);
  const [fout, setFout] = useState('');
  const [bezig, setBezig] = useState(false);
  const t = orderTotaal(format, aantal);

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFout(''); setBezig(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, storySlug: slug, format, aantal, akkoord: f.akkoord === 'on' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.fout);
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setFout(err instanceof Error && err.message ? err.message : 'Er ging iets mis. Probeer het nog eens.');
      setBezig(false);
    }
  }

  return (
    <form className="form" onSubmit={verstuur}>
      <fieldset>
        <legend>Het boek</legend>
        <label>Voornaam van het kind
          <input type="text" name="childName" required maxLength={20} autoComplete="off" placeholder="Zoals die in het boek komt" />
        </label>
        <div className="keuze" role="radiogroup" aria-label="Uitvoering">
          {(['hardcover', 'softcover'] as Format[]).map((k) => (
            <label key={k}>
              <input type="radio" name="uitvoering" checked={format === k} onChange={() => setFormat(k)} />
              {k === 'hardcover' ? 'Harde kaft' : 'Zachte kaft'}
              <small>{euro(PRIJZEN.boek[k])}</small>
            </label>
          ))}
        </div>
        <label>Aantal boeken
          <select value={aantal} onChange={(e) => setAantal(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}{n > 1 ? ` (elk extra boek ${euro(PRIJZEN.extraExemplaar[format])})` : ''}</option>)}
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Bezorgen</legend>
        <label>E-mailadres<input type="email" name="email" required autoComplete="email" /></label>
        <label>Naam<input type="text" name="naam" required autoComplete="name" /></label>
        <label>Straat en huisnummer<input type="text" name="straat" required autoComplete="street-address" /></label>
        <div className="rij">
          <label>Postcode<input type="text" name="postcode" required autoComplete="postal-code" /></label>
          <label>Plaats<input type="text" name="plaats" required autoComplete="address-level2" /></label>
        </div>
        <label>Land
          <select name="land" defaultValue="NL" autoComplete="country"><option value="NL">Nederland</option><option value="BE">België</option></select>
        </label>
      </fieldset>

      <div className="totaal">
        <div><span>{aantal} {aantal === 1 ? 'boek' : 'boeken'}</span><span>{euro(t.boeken)}</span></div>
        <div><span>Bezorgen</span><span>{t.verzending ? euro(t.verzending) : 'gratis'}</span></div>
        <div className="som"><span>Totaal</span><span>{euro(t.totaal)}</span></div>
      </div>

      <label className="vink">
        <input type="checkbox" name="akkoord" required />
        <span>Ik ga akkoord met de <Link href="/voorwaarden" target="_blank">voorwaarden</Link>. Het boek wordt speciaal voor mij gemaakt, dus ik kan de bestelling na het betalen niet herroepen.</span>
      </label>
      {fout && <p className="fout" role="alert">{fout}</p>}
      <button className="btn" disabled={bezig}>{bezig ? 'Even geduld…' : `Betaal ${euro(t.totaal)}`}</button>
      <p className="noot">De foto stuur je pas in na het betalen.</p>
    </form>
  );
}
