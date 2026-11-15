import Link from 'next/link';
import { Cover } from '@/components/Cover';
import { Knop } from '@/components/Knop';
import { STORIES } from '@/lib/stories';
import { PRIJZEN, euro } from '@/lib/pricing';

const eerste = STORIES[0];

const STAPPEN = [
  { t: 'Kies een verhaal', p: 'Ruimteschipper, duikbootkapitein of boswachter: kies het avontuur dat bij jouw kind past.', icoon: <path d="M20 22h44a8 8 0 0 1 8 8v60H28a8 8 0 0 1-8-8z M30 40h30 M30 54h30 M30 68h18" /> },
  { t: 'Reken af', p: 'Je betaalt met iDEAL. Pas daarna gaan we voor jou aan de slag, zo blijft de prijs laag.', icoon: <path d="M14 34h72v44H14z M14 48h72 M24 64h18" /> },
  { t: 'Stuur een foto', p: 'Eén duidelijke foto is genoeg. Binnen een paar minuten staat jouw kind op elke plaat.', icoon: <path d="M16 34h18l6-10h20l6 10h18v46H16z M50 44a13 13 0 1 0 .1 0z" /> },
  { t: 'Kijk na en klaar', p: 'Blader door het boek, laat een plaat opnieuw maken als je wilt, en stuur het naar de drukker.', icoon: <path d="M18 78V40l32-18 32 18v38H18z M40 78V58h20v20 M34 30v-8" /> },
];

const VRAGEN = [
  ['Waarom betaal ik eerst en zie ik daarna pas het boek?', 'Elke plaat wordt speciaal voor jouw kind gemaakt en dat kost ons per boek geld. Door eerst af te rekenen hoeven we die kosten niet door te berekenen aan iedereen. Je ziet het hele boek voordat het naar de drukker gaat en kunt platen opnieuw laten maken.'],
  ['Wat voor foto heb ik nodig?', 'Een scherpe foto van voren, bij daglicht, zonder zonnebril of pet, met alleen jouw kind erop. Een gewone telefoonfoto is prima.'],
  ['Wat gebeurt er met de foto?', 'We gebruiken de foto alleen om dit ene boek te maken. Zodra het boek naar de drukker gaat, verwijderen we de foto. We gebruiken hem nooit voor iets anders.'],
  ['Hoe snel heb ik het boek in huis?', 'De platen zijn in een paar minuten klaar. Drukken en bezorgen duurt daarna ongeveer een week.'],
  ['Kan ik het boek terugsturen?', 'Het boek wordt speciaal voor jou gemaakt, daarom kun je het niet terugsturen als je je bedenkt. Is er iets mis met de druk of de bezorging, dan maken we kosteloos een nieuw boek.'],
  ['Kunnen kinderen het zelf lezen?', 'Ja. De zinnen zijn kort en de woorden eenvoudig, geschikt voor kinderen die net leren lezen. Voorlezen kan natuurlijk ook.'],
];

export default function Home() {
  return (
    <main>
      <div className="hero">
        <svg className="blob" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M380 800C340 620 520 560 600 420 700 250 900 60 1200 120V800Z" fill="#fff3c4" opacity=".85" />
          <path d="M620 800C640 690 780 700 860 610 950 510 1080 520 1200 440V800Z" fill="#ff9f1c" />
        </svg>
        <div className="wrap">
          <div>
            <h1>Jouw kind in de hoofdrol</h1>
            <p className="lead">Kies een verhaal, stuur één foto en krijg een echt gedrukt prentenboek. Met jouw kind op elke bladzijde, in zinnen die het zelf kan lezen.</p>
            <Knop href={`/verhalen/${eerste.slug}`}>Maak jullie boek</Knop>
          </div>
          <div className="stapel" aria-hidden="true">
            <Cover story={STORIES[1]} />
            <Cover story={eerste} naam="Fos" />
            <span className="hand">gedrukt en<br />thuisbezorgd</span>
          </div>
        </div>
      </div>

      <section id="verhalen">
        <div className="wrap">
          <div className="kop">
            <span className="hand">kies een avontuur</span>
            <h2>Onze verhalen</h2>
            <p>We beginnen met één boek en schrijven er steeds een bij.</p>
          </div>
          <div className="kaarten">
            {STORIES.map((s) => {
              const inhoud = (
                <>
                  <Cover story={s} />
                  <div className="tags">
                    {s.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
                    {!s.beschikbaar && <span className="tag straks">Binnenkort</span>}
                  </div>
                  <h3>{s.titel}</h3>
                  <p>{s.kort}</p>
                </>
              );
              return s.beschikbaar
                ? <Link key={s.slug} href={`/verhalen/${s.slug}`} className="kaart" style={{ background: s.kleur }}>{inhoud}</Link>
                : <div key={s.slug} className="kaart" style={{ background: s.kleur }}>{inhoud}</div>;
            })}
          </div>
        </div>
      </section>

      <section id="zo-werkt-het" className="vlak roze">
        <div className="wrap">
          <div className="kop">
            <span className="hand">in vier stappen</span>
            <h2>Zo werkt het</h2>
          </div>
          <div className="stappen">
            {STAPPEN.map((s, i) => (
              <div className="stap" key={s.t}>
                <span className="hand">stap {i + 1}</span>
                <svg viewBox="0 0 100 100" fill="none" stroke="#0d0d12" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">{s.icoon}</svg>
                <h3>{s.t}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="prijs">
        <div className="wrap">
          <div className="kop">
            <span className="hand">geen abonnement</span>
            <h2>Wat kost het?</h2>
          </div>
          <div className="prijzen">
            <div className="prijs top">
              <h3>Harde kaft</h3>
              <div className="bedrag">{euro(PRIJZEN.boek.hardcover)}</div>
              <ul>
                <li>Stevig boek van 20 bij 20 cm</li>
                <li>Jouw kind op elke plaat</li>
                <li>Drie platen opnieuw laten maken</li>
                <li>Extra exemplaar voor opa en oma: {euro(PRIJZEN.extraExemplaar.hardcover)}</li>
              </ul>
            </div>
            <div className="prijs">
              <h3>Zachte kaft</h3>
              <div className="bedrag">{euro(PRIJZEN.boek.softcover)}</div>
              <ul>
                <li>Hetzelfde boek, lichter uitgevoerd</li>
                <li>Jouw kind op elke plaat</li>
                <li>Drie platen opnieuw laten maken</li>
                <li>Extra exemplaar: {euro(PRIJZEN.extraExemplaar.softcover)}</li>
              </ul>
            </div>
          </div>
          <p className="noot" style={{ textAlign: 'center', marginTop: 22 }}>Bezorgen kost {euro(PRIJZEN.verzending)}. Bij twee boeken of meer bezorgen we gratis.</p>
        </div>
      </section>

      <section id="vragen" className="vlak room">
        <div className="wrap">
          <div className="kop"><h2>Veelgestelde vragen</h2></div>
          <div className="faq">
            {VRAGEN.map(([v, a]) => (
              <details key={v}><summary>{v}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap kop" style={{ marginBottom: 0 }}>
          <h2>Klaar voor vertrek?</h2>
          <p style={{ marginBottom: 22 }}>Over een week ligt het boek op de mat.</p>
          <Knop href={`/verhalen/${eerste.slug}`}>Maak jullie boek</Knop>
        </div>
      </section>
    </main>
  );
}
