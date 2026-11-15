'use client';
import { useState } from 'react';
import { Cover } from './Cover';
import type { Story } from '@/lib/stories';

export type Plaat = { tekst: string; beeld?: string; src?: string };

// Het boek om doorheen te bladeren: eerst de omslag, daarna telkens twee bladzijden.
export function Bladerboek({ story, naam, opdracht, platen, onBlad }: { story: Story; naam: string; opdracht?: string; platen: Plaat[]; onBlad?: (platen: number[]) => void }) {
  const [blad, setBlad] = useState(-1); // -1 is de omslag
  const bladzijden = platen.length + 2; // titelpagina, platen, slot
  const laatste = Math.ceil(bladzijden / 2) - 1;

  function ga(n: number) {
    const b = Math.max(-1, Math.min(laatste, n));
    setBlad(b);
    onBlad?.(b < 0 ? [] : [b * 2 - 1, b * 2].filter((i) => i >= 0 && i < platen.length));
  }

  function pagina(i: number) {
    if (i === 0)
      return (
        <div className="bb-p papier">
          <div className="bb-titel">{story.titel}</div>
          <div className="bb-met">met {naam} in de hoofdrol</div>
          {opdracht && <div className="bb-opdracht">{opdracht}</div>}
        </div>
      );
    if (i === bladzijden - 1) return <div className="bb-p papier"><div className="bb-titel">Einde</div><div className="bb-met">Dit boek is speciaal gemaakt voor {naam}.</div></div>;
    const p = platen[i - 1];
    if (!p) return <div className="bb-p papier" />;
    return (
      <div className="bb-p">
        {p.src ? <img src={p.src} alt={`Plaat ${i}`} /> : <div className={`bb-schets s-${story.slug}`}><span>Plaat {i}</span><em>{p.beeld}</em></div>}
        <div className="bb-tekst">{p.tekst}</div>
      </div>
    );
  }

  return (
    <div className="bb" tabIndex={0} aria-label="Blader door het boek" onKeyDown={(e) => { if (e.key === 'ArrowRight') ga(blad + 1); if (e.key === 'ArrowLeft') ga(blad - 1); }}>
      <div className="bb-vlak">
        {blad < 0
          ? <button className="bb-kaft" key="kaft" onClick={() => ga(0)} aria-label="Sla het boek open"><Cover story={story} naam={naam} /></button>
          : <div className="bb-open" key={blad}>{pagina(blad * 2)}{pagina(blad * 2 + 1)}</div>}
      </div>
      <div className="bladnav">
        <button className="rond" onClick={() => ga(blad - 1)} disabled={blad < 0} aria-label="Vorige bladzijden">←</button>
        <span aria-live="polite">{blad < 0 ? 'Omslag' : `Bladzijde ${blad * 2 + 1} en ${blad * 2 + 2} van ${bladzijden}`}</span>
        <button className="rond" onClick={() => ga(blad + 1)} disabled={blad === laatste} aria-label="Volgende bladzijden">→</button>
      </div>
    </div>
  );
}
