'use client';
import { useState } from 'react';

export function Inloggen() {
  const [klaar, setKlaar] = useState<{ testLink?: string } | null>(null);
  const [fout, setFout] = useState('');
  const [bezig, setBezig] = useState(false);

  async function stuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFout(''); setBezig(true);
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: new FormData(e.currentTarget).get('email') }) });
    const data = await res.json().catch(() => ({}));
    setBezig(false);
    if (!res.ok) return setFout(data.fout || 'Er ging iets mis. Probeer het nog eens.');
    setKlaar(data);
  }

  if (klaar)
    return (
      <div className="status" role="status">
        <h3>Kijk in je mail.</h3>
        <p>We hebben een link gestuurd waarmee je inlogt. De link werkt een half uur.</p>
        {klaar.testLink && <p className="noot">Testversie: er wordt nog geen mail verstuurd. <a href={klaar.testLink}>Log hier in</a>.</p>}
      </div>
    );
  return (
    <form className="form" onSubmit={stuur} style={{ gap: 18 }}>
      <label>E-mailadres<input type="email" name="email" required autoComplete="email" /></label>
      {fout && <p className="fout" role="alert">{fout}</p>}
      <button className="btn" disabled={bezig}>{bezig ? 'Even geduld…' : 'Stuur me een inloglink'}</button>
    </form>
  );
}
