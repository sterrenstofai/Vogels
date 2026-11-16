import Link from 'next/link';
import { Cover } from '@/components/Cover';
import { Zweefboeken, type Kaart } from '@/components/Zweefboeken';
import { MERK } from '@/lib/merk';
import { STORIES, voorbeeldPlaten, vulNaam } from '@/lib/stories';
import { PRIJZEN, euro } from '@/lib/pricing';

const eerste = STORIES[0];
const platen = voorbeeldPlaten(eerste)!;
const kind = eerste.voorbeeld!.naam;
// In de kop staat het boek dat je nu kunt bestellen in het midden.
const zweef = [STORIES[1], eerste, ...STORIES.slice(2)];
// De band in de kop: de omslagen, met platen uit het voorbeeldboek ertussen.
const omslag = (s: (typeof STORIES)[number]): Kaart => ({ src: s.omslag ?? platen[0], label: s.beschikbaar ? 'Nu te bestellen' : 'Binnenkort', titel: s.titel, ondertitel: `met ${kind} in de hoofdrol`, href: s.beschikbaar ? `/verhalen/${s.slug}` : undefined });
const plaat = (i: number): Kaart => ({ src: platen[i], label: `Plaat ${i + 1} van ${platen.length}`, href: `/verhalen/${eerste.slug}` });
const band: Kaart[] = [plaat(3), omslag(STORIES[1]), plaat(6), omslag(eerste), plaat(9), omslag(STORIES[2]), plaat(7), plaat(11)];

const STAPPEN = [
  ['Kies een verhaal', 'Elk verhaal is geschreven om zelf te lezen, met korte zinnen en veel platen.'],
  ['Reken af', 'Met iDEAL. Daarna gaan we alleen voor jullie aan het werk.'],
  ['Stuur één foto', 'Een gewone telefoonfoto is genoeg. Binnen een paar minuten zijn de platen klaar.'],
  ['Kijk het na', 'Blader door het hele boek. Pas als jij tevreden bent, gaat het naar de drukker.'],
];

const VRAGEN = [
  ['Waarom betaal ik eerst?', 'Elke plaat wordt speciaal voor jouw kind gemaakt, en dat kost ons per boek geld. Door eerst af te rekenen blijft de prijs voor iedereen laag. Je ziet het hele boek voordat het wordt gedrukt en kunt drie platen opnieuw laten maken.'],
  ['Wat voor foto heb ik nodig?', 'Een scherpe foto van voren, bij daglicht, zonder pet of zonnebril, met alleen jouw kind erop.'],
  ['Wat gebeurt er met de foto?', 'We gebruiken de foto alleen voor dit ene boek. Zodra het boek naar de drukker gaat, verwijderen we hem.'],
  ['Hoe snel heb ik het boek in huis?', 'De platen zijn in een paar minuten klaar. Drukken en bezorgen duurt daarna ongeveer een week.'],
  ['Kan ik het boek terugsturen?', 'Het boek wordt speciaal voor jou gemaakt en kan daarom niet retour. Is er iets mis met de druk of de bezorging, dan maken we kosteloos een nieuw boek.'],
];

export default function Home() {
  return (
    <main>
      <div className="hero">
        <div className="wrap">
          <span className="hand">Nieuw: {eerste.titel}</span>
          <h1>Jouw kind in de hoofdrol.</h1>
          <p className="lead">Een gedrukt prentenboek, met de foto van jouw kind op elke bladzijde.</p>
          <div className="cta">
            <Link className="btn" href={`/ontwerpen/${eerste.slug}`}>Maak jullie boek</Link>
            <Link className="pijl" href={`/verhalen/${eerste.slug}`}>Bekijk het verhaal</Link>
          </div>
          <Zweefboeken merk={MERK} kaarten={band} start={3}>
            <div className="stille-rij">{zweef.map((s) => <Cover key={s.slug} story={s} naam={kind} foto={s.omslag} />)}</div>
          </Zweefboeken>
        </div>
      </div>

      <section>
        <div className="wrap">
          <div className="kop op"><h2>Gemaakt om zelf te lezen.</h2></div>
          <div className="tegels">
            <div className="tegel spread t6 op">
              <div className="bb-open">
                <div className="bb-p papier"><div className="bb-zin">{vulNaam(eerste.scenes[6].tekst, kind)}</div></div>
                <div className="bb-p"><img src={platen[6]} alt={`Plaat uit het voorbeeldboek: ${kind} springt op de maan`} loading="lazy" /></div>
              </div>
              <p>Links een zin om zelf te lezen, rechts een plaat met jouw kind. Dit is het voorbeeldboek van {kind}.</p>
            </div>
            <div className="tegel t2 op">
              <h3>Op elke plaat.</h3>
              <p>Niet alleen een naam op de kaft. Jouw kind speelt het hele verhaal.</p>
              <div className="groot">{eerste.scenes.length}<small>platen</small></div>
            </div>
            <div className="tegel t2 op">
              <h3>Korte zinnen.</h3>
              <p>Woorden die een beginnende lezer zelf kan lezen. Voorlezen mag ook.</p>
              <div className="groot">4+<small>jaar</small></div>
            </div>
            <div className="tegel t2 op">
              <h3>Een echt boek.</h3>
              <p>Vierkant, stevig gedrukt en thuisbezorgd in ongeveer een week.</p>
              <div className="groot">20<small>× 20 cm</small></div>
            </div>
          </div>
        </div>
      </section>

      <section id="verhalen">
        <div className="wrap">
          <div className="kop midden op"><h2>Kies een avontuur.</h2><p>We beginnen met één boek. De volgende zijn onderweg.</p></div>
          <div className="reeks">
            {STORIES.map((s) => {
              const inhoud = (<><Cover story={s} naam={kind} foto={s.omslag} /><h3>{s.titel}</h3><p>{s.kort}</p></>);
              return s.beschikbaar
                ? <Link key={s.slug} href={`/verhalen/${s.slug}`} className="verhaal op">{inhoud}<span className="pijl">Bekijk</span></Link>
                : <div key={s.slug} className="verhaal op">{inhoud}<span className="straks">Binnenkort</span></div>;
            })}
          </div>
        </div>
      </section>

      <section id="zo-werkt-het" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="kop op"><h2>Zo werkt het.</h2></div>
          <div className="stappen">
            {STAPPEN.map(([t, p], i) => (
              <div className="stap op" key={t}><span>Stap {i + 1}</span><h3>{t}</h3><p>{p}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="prijs">
        <div className="wrap">
          <div className="kop midden op"><h2>Eén prijs. Geen abonnement.</h2></div>
          <div className="prijzen" style={{ maxWidth: 820, margin: '0 auto' }}>
            {(['hardcover', 'softcover'] as const).map((k) => (
              <div className="prijs op" key={k}>
                <h3>{k === 'hardcover' ? 'Harde kaft' : 'Zachte kaft'}</h3>
                <div className="bedrag">{euro(PRIJZEN.boek[k])}</div>
                <ul>
                  <li>{k === 'hardcover' ? 'Stevig gebonden, 20 × 20 cm' : 'Hetzelfde boek, lichter uitgevoerd'}</li>
                  <li>Drie platen opnieuw laten maken</li>
                  <li>Extra exemplaar voor {euro(PRIJZEN.extraExemplaar[k])}</li>
                </ul>
              </div>
            ))}
          </div>
          <p className="noot" style={{ textAlign: 'center', marginTop: 26 }}>Bezorgen kost {euro(PRIJZEN.verzending)}. Bij twee boeken of meer bezorgen we gratis.</p>
        </div>
      </section>

      <section id="vragen">
        <div className="wrap">
          <div className="kop midden op"><h2>Vragen.</h2></div>
          <div className="faq">
            {VRAGEN.map(([v, a]) => <details key={v}><summary>{v}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap kop midden op" style={{ marginBottom: 0 }}>
          <h2>Over een week op de mat.</h2>
          <div className="cta" style={{ marginTop: 30 }}><Link className="btn" href={`/ontwerpen/${eerste.slug}`}>Maak jullie boek</Link></div>
        </div>
      </section>
    </main>
  );
}
