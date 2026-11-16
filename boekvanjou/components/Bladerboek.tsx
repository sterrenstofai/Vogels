'use client';
import { useState } from 'react';
import { Cover } from './Cover';
import type { Story } from '@/lib/stories';
import type { Blad } from '@/lib/boek';

// Het boek om doorheen te bladeren: eerst de omslag, daarna telkens twee bladzijden.
// Bladzijde 1 is een rechterbladzijde, net als in het gedrukte boek.
// `platen` geeft per plaat het adres van het beeld; zonder beeld tonen we de beschrijving.
export function Bladerboek({ story, naam, bladen, platen, onBlad }: {
  story: Story; naam: string; bladen: Blad[]; platen?: (string | undefined)[]; onBlad?: (platen: number[]) => void;
}) {
  const [stand, setStand] = useState(-1); // -1 is de omslag, daarna opslag 0, 1, 2 …
  const laatste = Math.floor(bladen.length / 2);

  const paar = (s: number) => [bladen[s * 2 - 1], bladen[s * 2]] as (Blad | undefined)[];
  function ga(n: number) {
    const s = Math.max(-1, Math.min(laatste, n));
    setStand(s);
    onBlad?.(s < 0 ? [] : paar(s).flatMap((b) => (b?.soort === 'plaat' ? [b.plaat] : [])));
  }

  function teken(b: Blad | undefined, key: string) {
    if (!b) return <div key={key} className="bb-p geen" />;
    switch (b.soort) {
      case 'titel':
        return <div key={key} className="bb-p papier"><div className="bb-titel">{b.titel}</div><div className="bb-met">met {b.naam} in de hoofdrol</div>{b.opdracht && <div className="bb-opdracht">{b.opdracht}</div>}</div>;
      case 'tekst':
        return <div key={key} className="bb-p papier"><div className="bb-zin">{b.tekst}</div></div>;
      case 'plaat': {
        const src = platen?.[b.plaat];
        return <div key={key} className="bb-p">{src ? <img src={src} alt={`Plaat ${b.plaat + 1}`} /> : <div className={`bb-schets s-${story.slug}`}><span>Plaat {b.plaat + 1}</span><em>{b.beeld}</em></div>}</div>;
      }
      case 'einde':
        return <div key={key} className="bb-p papier"><div className="bb-zin">Einde</div></div>;
      case 'colofon':
        return <div key={key} className="bb-p papier onder"><div className="bb-met">Dit boek is speciaal gemaakt voor {b.naam}.</div></div>;
      default:
        return <div key={key} className="bb-p wit" />;
    }
  }

  const [links, rechts] = stand < 0 ? [] : paar(stand);
  const nrs = stand < 0 ? '' : [links && stand * 2, rechts && stand * 2 + 1].filter(Boolean).join(' en ');
  return (
    <div className="bb" tabIndex={0} aria-label="Blader door het boek" onKeyDown={(e) => { if (e.key === 'ArrowRight') ga(stand + 1); if (e.key === 'ArrowLeft') ga(stand - 1); }}>
      <div className="bb-vlak">
        {stand < 0
          ? <button className="bb-kaft" key="kaft" onClick={() => ga(0)} aria-label="Sla het boek open"><Cover story={story} naam={naam} foto={platen?.[0]} /></button>
          : <div className="bb-open" key={stand}>{teken(links, 'l')}{teken(rechts, 'r')}</div>}
      </div>
      <div className="bladnav">
        <button className="rond" onClick={() => ga(stand - 1)} disabled={stand < 0} aria-label="Vorige bladzijden">←</button>
        <span aria-live="polite">{stand < 0 ? 'Omslag' : `Bladzijde ${nrs} van ${bladen.length}`}</span>
        <button className="rond" onClick={() => ga(stand + 1)} disabled={stand === laatste} aria-label="Volgende bladzijden">→</button>
      </div>
    </div>
  );
}
