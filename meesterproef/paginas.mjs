// De inhoud van de vaste pagina's. Het bouwscript zet er de kop en de
// voet omheen. `inVoorbeeld: true` betekent dat de pagina ook in de
// voorbeeldomgeving bestaat.
import { esc } from "./src/js/weergave.js";

export const SECTOREN = ["Retail", "Financiën", "Zorg", "Overheid", "Mobiliteit", "Media", "Zakelijke software", "Industrie", "Onderwijs", "Juridisch", "Logistiek", "Energie", "Agri en food", "Reizen"];
export const TYPES = ["Assistent voor klanten", "Assistent voor medewerkers", "Agent", "Voorspelmodel", "Beeldherkenning", "Spraak en verslaglegging", "Taalmodel"];

const keuzes = (lijst) => lijst.map((x) => `<option>${esc(x)}</option>`).join("");
const honingpot = `<p class="verborgen" aria-hidden="true"><label>Laat dit veld leeg <input name="website" tabindex="-1" autocomplete="off"></label></p>`;

const criteriaBand = (g) => `
<section class="band band-donker">
  <div class="breed">
    <div class="blok-kop"><h2>Vijf criteria, één cijfer</h2><p>Elk jurylid geeft per criterium een cijfer van 1 tot 10. De gewichten bepalen het eindcijfer.</p></div>
    <ol class="criteria">
      ${g.CRITERIA.map((c) => `<li data-onthul><span class="gewicht">${c.gewicht}<small>%</small></span><h3>${esc(c.naam)}</h3><p>${esc(c.vraag)}</p></li>`).join("")}
    </ol>
    <p class="band-voet"><a class="pijl" href="/werkwijze/">Lees de volledige werkwijze</a></p>
  </div>
</section>`;

const start = (g, basis) => `
<h1 class="sr">Meesterproef, de prijs voor AI die werkt</h1>
<section class="held" id="held" aria-label="Uitgelicht"><div class="breed held-leeg"><p class="meta">De selectie wordt geladen.</p></div></section>

<section class="leus">
  <div class="breed">
    <p>Meesterproef is de Nederlandse prijs voor <em>AI-oplossingen die in de praktijk werken</em>. Een vakjury beoordeelt elke oplossing op vijf criteria, en alle cijfers zijn openbaar.</p>
    <dl class="tellers">
      <div><dd id="tel-oplossingen">${g.aantal}</dd><dt>oplossingen genomineerd</dt></div>
      <div><dd id="tel-sectoren">&nbsp;</dd><dt>sectoren</dt></div>
      <div><dd id="tel-winnaars">&nbsp;</dd><dt>onderscheidingen</dt></div>
      <div><dd id="tel-jury">&nbsp;</dd><dt>juryleden</dt></div>
    </dl>
  </div>
</section>

<section class="breed blok">
  <div class="blok-kop"><h2>Genomineerd</h2><a class="pijl" href="${basis}/oplossingen/">Alle oplossingen</a></div>
  <div class="raster raster-4" id="genomineerd"></div>
</section>

<section class="breed blok" id="winnaars-blok">
  <div class="blok-kop"><h2>Winnaars</h2><a class="pijl" href="${basis}/winnaars/">Alle winnaars</a></div>
  <div id="winnaars"></div>
</section>

${criteriaBand(g)}

<section class="breed blok">
  <div class="blok-kop"><h2>Ranglijst</h2><a class="pijl" href="${basis}/ranglijst/">De volledige ranglijst</a></div>
  <div class="raster raster-4" id="rang"></div>
</section>

<section class="breed blok">
  <div class="blok-kop"><h2>Per sector</h2></div>
  <ul class="sectoren" id="sectoren"></ul>
</section>

<section class="breed blok oproep">
  <div class="oproep-donker" data-onthul>
    <p class="meta">Voor makers en opdrachtgevers</p>
    <h2>Zend je oplossing in</h2>
    <p>Heb je een AI-oplossing gebouwd of in gebruik genomen die laat zien hoe het hoort? Laat de jury ernaar kijken. Inzenden is gratis.</p>
    <a class="knop knop-zegel" href="/inzenden/">Naar het formulier</a>
  </div>
  <div class="oproep-licht" data-onthul>
    <p class="meta">Voor vakmensen</p>
    <h2>Word jurylid</h2>
    <p>We zoeken mensen die zelf AI-oplossingen bouwen, invoeren of toetsen, en die hun oordeel onder eigen naam willen geven.</p>
    <a class="knop knop-lijn" href="/jury/#aanmelden">Meld je aan</a>
  </div>
</section>`;

const overzicht = (g) => `
<section class="paginakop">
  <div class="breed">
    <h1>Oplossingen</h1>
    <p>Alle AI-oplossingen in de selectie. Elke beschrijving is door de redactie geschreven op basis van bronnen die bij de oplossing staan.</p>
  </div>
</section>
<section class="breed">
  <form class="filters" id="filters" role="search" aria-label="Oplossingen filteren">
    <div class="tabs" role="radiogroup" aria-label="Oordeel">
      <label><input type="radio" name="stand" value="" checked><span>Alles</span></label>
      <label><input type="radio" name="stand" value="meesterproef"><span>Meesterproef</span></label>
      <label><input type="radio" name="stand" value="eervol"><span>Eervolle vermelding</span></label>
      <label><input type="radio" name="stand" value="beoordeeld"><span>Beoordeeld</span></label>
      <label><input type="radio" name="stand" value="genomineerd"><span>Genomineerd</span></label>
    </div>
    <div class="filterrij">
      <label class="zoekveld"><span class="sr">Zoeken</span><input type="search" name="zoek" placeholder="Zoek op naam, organisatie of maker" autocomplete="off"></label>
      <label><span class="sr">Sector</span><select name="sector"><option value="">Alle sectoren</option></select></label>
      <label><span class="sr">Soort</span><select name="type"><option value="">Alle soorten</option></select></label>
      <label><span class="sr">Status</span><select name="status"><option value="">Elke status</option></select></label>
      <label><span class="sr">Bewijs</span><select name="bewijs"><option value="">Elk bewijsniveau</option>${g.BEWIJS.slice()
        .reverse()
        .map((b) => `<option value="${b.niveau}">${esc(b.naam)}</option>`)
        .join("")}</select></label>
      <label><span class="sr">Volgorde</span><select name="volgorde">
        <option value="nieuw">Nieuwste eerst</option>
        <option value="cijfer">Hoogste cijfer</option>
        <option value="naam">Naam</option>
        <option value="organisatie">Organisatie</option>
      </select></label>
      <input type="hidden" name="maker" value="">
    </div>
  </form>
  <div class="filterbalk">
    <p class="meta" id="teller" aria-live="polite">&nbsp;</p>
    <div class="filterbalk-rechts">
      <button type="reset" form="filters" class="tekstknop" id="wis" hidden>Wis de filters</button>
      <div class="weergave" role="group" aria-label="Weergave">
        <button type="button" data-weergave="raster" aria-pressed="true" title="Raster"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H1zM9 9h6v6H9z"/></svg><span class="sr">Raster</span></button>
        <button type="button" data-weergave="lijst" aria-pressed="false" title="Lijst"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 2h14v2.5H1zM1 6.75h14v2.5H1zM1 11.5h14V14H1z"/></svg><span class="sr">Lijst</span></button>
      </div>
    </div>
  </div>
  <div class="raster raster-4" id="raster"></div>
</section>`;

const winnaars = () => `
<section class="paginakop">
  <div class="breed">
    <h1>Winnaars</h1>
    <p>De oplossingen die van de jury een Meesterproef of een eervolle vermelding kregen, met de nieuwste uitslag bovenaan.</p>
  </div>
</section>
<section class="breed"><div id="winnaars-lijst"></div></section>`;

const ranglijst = () => `
<section class="paginakop">
  <div class="breed">
    <h1>Ranglijst</h1>
    <p>Wie staat het vaakst in de selectie, en wie haalt de meeste onderscheidingen? Meesterproeven tellen eerst, dan eervolle vermeldingen, dan het aantal genomineerde oplossingen.</p>
  </div>
</section>
<section class="breed">
  <div class="tabs tabs-los" role="tablist" aria-label="Soort ranglijst">
    <button type="button" role="tab" aria-selected="true" data-rang="organisaties">Organisaties</button>
    <button type="button" role="tab" aria-selected="false" data-rang="makers">Makers en leveranciers</button>
  </div>
  <div id="rang-lijst"></div>
</section>`;

const jury = () => `
<section class="band band-donker paginakop-donker">
  <div class="breed">
    <h1>Vakmensen die onder eigen naam oordelen.</h1>
    <p>De jury bestaat uit mensen die zelf AI-oplossingen bouwen, invoeren of toetsen. Hun cijfers en toelichtingen staan bij elke oplossing die ze beoordelen.</p>
  </div>
</section>
<section class="breed blok">
  <div class="blok-kop"><h2>De jury</h2><p class="meta" id="jury-teller">&nbsp;</p></div>
  <div id="juryleden"></div>
</section>
<section class="breed blok jury-uitleg">
  <div>
    <h2>Wat een jurylid doet</h2>
    <ul class="punten">
      <li>Je beoordeelt een aantal oplossingen per maand op de vijf criteria, elk met een korte toelichting.</li>
      <li>Je cijfers en je naam staan bij de oplossing.</li>
      <li>Je meldt het als je een belang hebt bij een oplossing, en beoordeelt die dan niet.</li>
      <li>Je stemt één keer per jaar mee over de Meesterproef van het jaar.</li>
    </ul>
    <p>We zoeken een mix van achtergronden: ontwikkelaars, ontwerpers, productmensen, onderzoekers, en mensen met kennis van privacy, ethiek en toezicht.</p>
  </div>
  <div class="kaartvlak" id="aanmelden">
    <h2>Meld je aan</h2>
    <form class="formulier" id="aanmelding" novalidate data-gelukt="Je aanmelding is binnen. We nemen contact met je op.">
      ${honingpot}
      <div class="twee">
        <label>Naam <input name="naam" required autocomplete="name" maxlength="100"></label>
        <label>E-mailadres <input type="email" name="email" required autocomplete="email" maxlength="200"></label>
      </div>
      <div class="twee">
        <label>Functie <input name="functie" required autocomplete="organization-title" maxlength="120"></label>
        <label>Organisatie <input name="organisatie" required autocomplete="organization" maxlength="120"></label>
      </div>
      <div class="twee">
        <label>Vakgebied <small>Bijvoorbeeld: ontwikkeling, ontwerp, privacy</small><input name="expertise" maxlength="120"></label>
        <label>LinkedIn of eigen site <input type="url" name="profiel" placeholder="https://" maxlength="300"></label>
      </div>
      <label>Wat is je ervaring met AI-oplossingen? <small>Noem een of twee oplossingen waaraan je hebt gewerkt of die je hebt getoetst.</small><textarea name="ervaring" required maxlength="2000"></textarea></label>
      <label class="vink"><input type="checkbox" name="akkoord" required><span>Ik weet dat mijn naam en mijn cijfers openbaar worden als ik jurylid word.</span></label>
      <div class="formvoet"><button class="knop" type="submit">Verstuur je aanmelding</button><p class="formstatus" role="status"></p></div>
      <p class="voetnoot">We gebruiken je gegevens alleen om je aanmelding te behandelen. <a href="/privacy/">Privacy</a></p>
    </form>
  </div>
</section>`;

const werkwijze = (g) => `
<section class="paginakop">
  <div class="breed">
    <h1>Werkwijze</h1>
    <p>Een prijs is zoveel waard als de manier waarop hij wordt toegekend. Hier staat precies hoe een oplossing in de selectie komt, hoe de jury beoordeelt en wat een onderscheiding betekent.</p>
  </div>
</section>
<div class="breed werkwijze">
  <nav class="inhoud-nav" aria-label="Op deze pagina">
    <a href="#traject">Het traject</a><a href="#criteria">De criteria</a><a href="#rekenen">Reken het na</a><a href="#onderscheidingen">Onderscheidingen</a><a href="#bewijs">Bewijsniveau</a><a href="#belangen">Belangen en geld</a><a href="#bezwaar">Fouten en bezwaar</a><a href="#vragen">Veelgestelde vragen</a>
  </nav>
  <div class="werkwijze-lijf">
    <section id="traject">
      <h2>Het traject</h2>
      <ol class="traject">
        <li><span>01</span><h3>Nominatie</h3><p>Een oplossing komt in de selectie door een inzending van de maker of de gebruiker, of doordat de redactie haar zelf vindt en beschrijft op basis van openbare bronnen. Bij elke oplossing staat welke weg het was.</p></li>
        <li><span>02</span><h3>Toetsing</h3><p>De redactie controleert of de oplossing in gebruik is of publiek wordt getest, en leest de bronnen. Plannen en aankondigingen tellen niet.</p></li>
        <li><span>03</span><h3>Beoordeling</h3><p>Minstens ${g.MIN_JURYLEDEN} juryleden geven cijfers op de vijf criteria, elk met een toelichting. Een jurylid met een belang trekt zich terug.</p></li>
        <li><span>04</span><h3>Uitslag</h3><p>Zodra de beoordeling compleet is, staat het eindcijfer bij de oplossing, met de cijfers en de toelichting van elk jurylid.</p></li>
      </ol>
      <h3>Wat we vragen bij een inzending</h3>
      <ul class="punten">
        <li>Wat de oplossing doet, voor wie, en sinds wanneer ze in gebruik is.</li>
        <li>Wat ze oplevert, met het bewijs daarvoor en wie het cijfer heeft vastgesteld.</li>
        <li>Een manier waarop de jury de oplossing kan zien werken: een demo, een testomgeving of een video.</li>
        <li>Een contactpersoon bij de organisatie die de oplossing gebruikt en het verhaal kan bevestigen.</li>
      </ul>
      <p>Vertrouwelijke onderdelen kun je alleen met de jury delen. Wat op de site komt, stemmen we vooraf met je af.</p>
    </section>

    <section id="criteria">
      <h2>De criteria</h2>
      <ol class="criteria-lang">
        ${g.CRITERIA.map((c) => `<li><span class="gewicht">${c.gewicht}<small>%</small></span><div><h3>${esc(c.naam)}</h3><p class="vraag">${esc(c.vraag)}</p><p>${esc(c.uitleg)}</p></div></li>`).join("")}
      </ol>
    </section>

    <section id="rekenen">
      <h2>Reken het na</h2>
      <p>Elk jurylid geeft per criterium een cijfer van 1 tot 10. Die vijf cijfers worden gewogen opgeteld tot het cijfer van dat jurylid; het eindcijfer is het gemiddelde van alle juryleden. Schuif zelf om te zien hoe de gewichten uitpakken.</p>
      <div class="rekenhulp" id="rekenhulp">
        <div class="rekenhulp-schuiven">
          ${g.CRITERIA.map((c) => `<label><span>${esc(c.naam)} <small>${c.gewicht}%</small></span><input type="range" min="1" max="10" step="1" value="7" data-criterium="${c.id}" aria-label="${esc(c.naam)}"><output>7</output></label>`).join("")}
        </div>
        <div class="rekenhulp-uit" aria-live="polite">
          <p class="meta">Cijfer van dit jurylid</p>
          <p class="rekenhulp-cijfer" id="reken-cijfer">7,0</p>
          <p class="rekenhulp-som" id="reken-som"></p>
          <p id="reken-uitslag"></p>
        </div>
      </div>
      <p>Een eindcijfer bestaat pas als minstens ${g.MIN_JURYLEDEN} juryleden hebben beoordeeld. Tot die tijd tonen we alleen hoeveel beoordelingen er zijn.</p>
    </section>

    <section id="onderscheidingen">
      <h2>Onderscheidingen</h2>
      <ul class="onderscheidingen">
        ${g.ONDERSCHEIDINGEN.map((o) => `<li><span class="etiket etiket-${o.id}">${esc(o.naam)}</span><p>${esc(o.uitleg)}</p></li>`).join("")}
        <li><span class="etiket etiket-beoordeeld">Beoordeeld</span><p>Een eindcijfer onder de 6,5. De oplossing blijft in de selectie staan, met haar cijfers.</p></li>
        <li><span class="etiket">Genomineerd</span><p>In de selectie, maar nog niet of nog niet volledig door de jury beoordeeld.</p></li>
      </ul>
      <p>Eén keer per jaar kiest de jury uit alle oplossingen die dat jaar een Meesterproef kregen de Meesterproef van het jaar.</p>
    </section>

    <section id="bewijs">
      <h2>Bewijsniveau</h2>
      <p>Bij elke oplossing staat hoe hard het bewijs is voor het gemelde resultaat. Dat is geen oordeel over de oplossing, alleen over wie het cijfer heeft vastgesteld. De jury weegt het mee onder het criterium Impact.</p>
      <ul class="bewijslijst">
        ${g.BEWIJS.slice()
          .reverse()
          .map((b) => `<li><span class="bewijs"><span class="bewijs-stippen" aria-hidden="true">${[1, 2, 3].map((n) => `<i${n <= b.niveau ? ' class="aan"' : ""}></i>`).join("")}</span>${esc(b.naam)}</span><p>${esc(b.uitleg)}</p></li>`)
          .join("")}
      </ul>
    </section>

    <section id="belangen">
      <h2>Belangen en geld</h2>
      <p>Een jurylid beoordeelt geen oplossing van de eigen werkgever, van een klant of van een directe concurrent, en geen oplossing waaraan het zelf heeft meegewerkt. Wie zich terugtrekt, legt dat vast in de juryomgeving.</p>
      <p>Inzenden is gratis. Een onderscheiding is niet te koop, en sponsors hebben geen stem in de beoordeling. Meesterproef heeft op dit moment geen inkomsten. Als dat verandert, staat hier van wie het geld komt.</p>
    </section>

    <section id="bezwaar">
      <h2>Fouten en bezwaar</h2>
      <p>Staat jullie oplossing in de selectie en klopt er iets niet, of willen jullie de vermelding weg? <a href="/inzenden/?soort=aanvulling">Laat het weten</a>. Een verzoek om verwijdering voeren we uit zonder discussie.</p>
    </section>

    <section id="vragen">
      <h2>Veelgestelde vragen</h2>
      <div class="vragen">
        <details><summary>Waarom staan er oplossingen in die niet zijn ingezonden?</summary><p>Omdat de beste voorbeelden niet altijd worden aangemeld. De redactie zoekt zelf naar oplossingen die het bekijken waard zijn en beschrijft ze op basis van openbare bronnen. Zo'n nominatie is geen onderscheiding en geen oordeel van de jury.</p></details>
        <details><summary>Hoe kan de jury een oplossing beoordelen die achter een login zit?</summary><p>Bij een inzending vragen we om een demo, een testomgeving of een video. Zonder een manier om de oplossing te zien werken kan de jury Betrouwbaarheid en Gebruikservaring niet beoordelen, en komt er geen eindcijfer.</p></details>
        <details><summary>Kan ik een beoordeling laten herzien?</summary><p>Is er iets wezenlijks veranderd aan de oplossing, dan kun je haar opnieuw inzenden. De eerdere cijfers blijven zichtbaar, met hun datum.</p></details>
        <details><summary>Wie zit er achter Meesterproef?</summary><p>Meesterproef is een initiatief van Sterrenstof. De jury oordeelt onafhankelijk van de organisatie. <a href="/over/">Lees meer</a></p></details>
      </div>
    </section>
  </div>
</div>`;

const inzenden = (g) => `
<section class="paginakop paginakop-smal">
  <div class="breed">
    <h1>Inzenden</h1>
    <p>Zend een AI-oplossing in die in gebruik is of publiek wordt getest, of vul een bestaande vermelding aan. Inzenden is gratis.</p>
  </div>
</section>
<div class="breed inzend">
  <ol class="stappen-balk" id="stappen-balk" aria-label="Voortgang">
    <li aria-current="step"><span>1</span>Soort</li>
    <li><span>2</span>De oplossing</li>
    <li><span>3</span>De casus</li>
    <li><span>4</span>Contact en versturen</li>
  </ol>
  <form class="formulier inzendformulier" id="inzending" novalidate>
    ${honingpot}
    <input type="hidden" name="verwijzing" value="">
    <fieldset data-stap="0">
      <legend>Waar gaat het om?</legend>
      <div class="keuzekaarten">
        <label><input type="radio" name="soort" value="inzending" checked><span><b>Een nieuwe inzending</b>Meld een oplossing aan voor de selectie en voor beoordeling door de jury.</span></label>
        <label><input type="radio" name="soort" value="aanvulling"><span><b>Een aanvulling of verwijdering</b>Verbeter of vul een bestaande vermelding aan, of laat haar weghalen.</span></label>
      </div>
    </fieldset>
    <fieldset data-stap="1" hidden>
      <legend>De oplossing</legend>
      <div class="twee">
        <label>Naam van de oplossing <input name="oplossing" required maxlength="120"></label>
        <label>Organisatie die haar gebruikt <input name="organisatie" required maxlength="120"></label>
      </div>
      <div class="twee" data-alleen-inzending>
        <label>Gebouwd door <small>Bureau, leverancier of eigen team</small><input name="gebouwdDoor" maxlength="200"></label>
        <label>In gebruik sinds <small>Maand en jaar</small><input name="sinds" data-casus required maxlength="40"></label>
      </div>
      <div class="twee" data-alleen-inzending>
        <label>Sector <select name="sector" data-casus required><option value="">Kies een sector</option>${keuzes(g.SECTOREN)}<option>Anders</option></select></label>
        <label>Soort oplossing <select name="type" data-casus required><option value="">Kies een soort</option>${keuzes(g.TYPES)}<option>Anders</option></select></label>
      </div>
      <label data-alleen-inzending>Status <select name="status"><option>In productie</option><option>Pilot</option></select></label>
    </fieldset>
    <fieldset data-stap="2" hidden>
      <legend>De casus</legend>
      <label><span data-tekst-inzending>Wat doet de oplossing, en voor wie?</span><span data-tekst-aanvulling hidden>Wat moet er anders, of moet de vermelding weg?</span><textarea name="beschrijving" required maxlength="3000"></textarea></label>
      <label data-alleen-inzending>Wat levert ze op? <small>Noem het cijfer en hoe het is gemeten.</small><textarea name="resultaat" data-casus required maxlength="1000"></textarea></label>
      <label data-alleen-inzending>Wie heeft dat cijfer vastgesteld? <select name="herkomstCijfer"><option value="organisatie">De organisatie die de oplossing gebruikt</option><option value="leverancier">De leverancier of bouwer</option><option value="onafhankelijk">Een onafhankelijke partij</option></select></label>
      <label data-alleen-inzending>Hoe kan de jury haar zien werken? <small>Een link naar een demo, testomgeving of video. Vertrouwelijke toegang regelen we daarna met je.</small><input type="url" name="demo" placeholder="https://" maxlength="300"></label>
      <label>Openbare bronnen <small>Links naar artikelen, een casus of een eigen pagina, één per regel.</small><textarea name="bronnen" maxlength="2000"></textarea></label>
    </fieldset>
    <fieldset data-stap="3" hidden>
      <legend>Contact en versturen</legend>
      <div class="twee">
        <label>Je naam <input name="naam" required autocomplete="name" maxlength="100"></label>
        <label>E-mailadres <input type="email" name="email" required autocomplete="email" maxlength="200"></label>
      </div>
      <label>Je rol <small>Bijvoorbeeld: maker, opdrachtgever, woordvoerder</small><input name="rol" required maxlength="120"></label>
      <div class="samenvatting" id="samenvatting" aria-live="polite"></div>
      <label class="vink"><input type="checkbox" name="akkoord" required><span>Ik mag dit namens de organisatie insturen en de gegevens kloppen voor zover ik weet.</span></label>
    </fieldset>
    <div class="formvoet">
      <button class="knop knop-lijn" type="button" id="vorige" hidden>Vorige</button>
      <button class="knop" type="button" id="volgende">Volgende</button>
      <button class="knop knop-zegel" type="submit" id="verstuur" hidden>Verstuur</button>
      <p class="formstatus" role="status"></p>
    </div>
    <p class="voetnoot">Je invoer wordt in deze browser bewaard tot je verstuurt. We gebruiken je gegevens alleen om deze inzending te behandelen. <a href="/privacy/">Privacy</a></p>
  </form>
  <div class="kaartvlak inzend-klaar" id="klaar" hidden tabindex="-1">
    <p class="meta" id="klaar-nummer"></p>
    <h2>Dank je wel, je inzending is binnen.</h2>
    <p>De redactie leest haar en neemt contact met je op via het e-mailadres dat je hebt opgegeven. Bewaar het nummer hierboven voor als je er iets over wilt vragen.</p>
    <a class="knop knop-lijn" href="/oplossingen/">Bekijk de oplossingen</a>
  </div>
</div>`;

const account = (g) => `
<section class="breed account" id="account">
  <div class="inlog kaartvlak" id="inlog">
    <h1>Inloggen</h1>
    <p>Voor juryleden en de redactie. Je inlogcode heb je persoonlijk van de redactie gekregen.</p>
    <form class="formulier" id="inlogformulier" novalidate>
      <label>Inlogcode <input name="code" type="password" required autocomplete="current-password" autocapitalize="none" spellcheck="false"></label>
      <div class="formvoet"><button class="knop" type="submit">Log in</button><p class="formstatus" role="status"></p></div>
    </form>
    <p class="voetnoot">Geen code, maar wel jurylid willen worden? <a href="/jury/#aanmelden">Meld je aan</a>.</p>
  </div>
  <div class="jurywerk" id="jurywerk" hidden>
    <header class="jurywerk-kop">
      <div><p class="meta">Juryomgeving</p><h1 id="jury-naam">&nbsp;</h1></div>
      <div class="jurywerk-stand"><p class="voortgang-tekst" id="voortgang-tekst"></p><div class="voortgang"><i id="voortgang-balk"></i></div></div>
      <button class="knop knop-lijn knop-klein" type="button" id="uitloggen">Uitloggen</button>
    </header>
    <div class="jurywerk-lijf">
      <aside class="wachtrij">
        <div class="tabs tabs-los tabs-klein" role="tablist" aria-label="Wachtrij">
          <button type="button" role="tab" aria-selected="true" data-rij="open">Te doen</button>
          <button type="button" role="tab" aria-selected="false" data-rij="klaar">Beoordeeld</button>
          <button type="button" role="tab" aria-selected="false" data-rij="belang">Teruggetrokken</button>
        </div>
        <label class="zoekveld"><span class="sr">Zoek in de wachtrij</span><input type="search" id="rij-zoek" placeholder="Zoek" autocomplete="off"></label>
        <ul id="rij"></ul>
      </aside>
      <section class="beoordeel" id="beoordeel" aria-live="polite">
        <p class="leeg">Kies links een oplossing om te beoordelen.</p>
      </section>
    </div>
  </div>
  <template id="beoordeel-sjabloon">
    <form class="formulier beoordeelformulier" novalidate>
      <div class="beoordeel-schuiven">
        ${g.CRITERIA.map((c) => `<label><span><b>${esc(c.naam)}</b> <small>${c.gewicht}%</small><em>${esc(c.vraag)}</em></span><input type="range" min="1" max="10" step="1" value="6" name="${c.id}" aria-label="${esc(c.naam)}"><output>6</output></label>`).join("")}
      </div>
      <label>Toelichting <small>Minstens 20 tekens. Deze tekst staat met je naam bij de oplossing.</small><textarea name="toelichting" required minlength="20" maxlength="600"></textarea></label>
      <div class="formvoet">
        <p class="beoordeel-totaal">Jouw cijfer <b data-totaal>6,0</b></p>
        <button class="knop knop-zegel" type="submit">Sla de beoordeling op</button>
        <button class="tekstknop" type="button" data-belang>Ik heb een belang en trek me terug</button>
        <p class="formstatus" role="status"></p>
      </div>
    </form>
  </template>
</section>`;

const beheer = (g) => `
<section class="breed beheer" id="beheer">
  <header class="jurywerk-kop"><div><p class="meta">Redactie</p><h1>Beheer</h1></div><button class="knop knop-lijn knop-klein" type="button" id="uitloggen">Uitloggen</button></header>
  <p class="melding" id="geen-toegang" hidden>Deze pagina is alleen voor de redactie. <a href="/account/">Log in</a> met de beheercode.</p>
  <div id="beheer-lijf" hidden>
    <div class="tabs tabs-los" role="tablist" aria-label="Onderdelen">
      <button type="button" role="tab" aria-selected="true" data-deel="inzendingen">Inzendingen <b data-tel="inzendingen"></b></button>
      <button type="button" role="tab" aria-selected="false" data-deel="jury">Jury</button>
      <button type="button" role="tab" aria-selected="false" data-deel="aanmeldingen">Jury-aanmeldingen <b data-tel="aanmeldingen"></b></button>
      <button type="button" role="tab" aria-selected="false" data-deel="berichten">Berichten <b data-tel="berichten"></b></button>
      <button type="button" role="tab" aria-selected="false" data-deel="oplossingen">Oplossingen</button>
    </div>
    <div id="deel"></div>
  </div>
  <datalist id="sectoren-lijst">${keuzes(g.SECTOREN)}</datalist>
  <datalist id="types-lijst">${keuzes(g.TYPES)}</datalist>
</section>`;

const over = () => `
<section class="paginakop">
  <div class="breed">
    <h1>Over Meesterproef</h1>
    <p>Een meesterproef was het werkstuk waarmee een gezel liet zien dat hij het vak beheerste. Pas als de meesters van het gilde het goedkeurden, mocht hij zich meester noemen. Dat idee nemen we over voor AI-oplossingen.</p>
  </div>
</section>
<div class="breed proza">
  <section><h2>Waarom dit bestaat</h2><div>
    <p>Over AI wordt veel beloofd en weinig getoond. Wie wil weten hoe een goede oplossing eruitziet, vindt vooral persberichten en cijfers van leveranciers. Meesterproef verzamelt oplossingen die echt in gebruik zijn, zegt erbij hoe hard het bewijs is, en laat vakmensen onder eigen naam oordelen.</p>
    <p>Het doel is een plek waar makers kunnen zien wat goed werk is, en waar opdrachtgevers kunnen zien wie dat werk levert.</p>
  </div></section>
  <section><h2>Hoe we werken</h2><div>
    <p>De redactie nomineert en beschrijft, de jury beoordeelt. Alles wat we beweren steunt op een bron die bij de oplossing staat, en alle cijfers van de jury zijn openbaar. De volledige regels staan in de <a href="/werkwijze/">werkwijze</a>.</p>
  </div></section>
  <section><h2>Waar we nu staan</h2><div>
    <p>Meesterproef is in 2026 gestart. De eerste selectie is door de redactie samengesteld uit openbare bronnen, en de jury wordt nu gevormd. Tot de eerste juryronde staat elke oplossing als genomineerd, zonder cijfer.</p>
    <p>Wil je zien hoe het platform eruitziet met cijfers? De <a href="/voorbeeld/">voorbeeldomgeving</a> laat dat zien met verzonnen oplossingen en juryleden.</p>
  </div></section>
  <section><h2>Wie erachter zit</h2><div>
    <p>Meesterproef is een initiatief van Sterrenstof. De jury oordeelt onafhankelijk: de organisatie geeft zelf geen cijfers en kan cijfers van juryleden niet aanpassen.</p>
    <p>Meesterproef heeft op dit moment geen inkomsten. Inzenden is gratis en een onderscheiding is niet te koop.</p>
    <p><a class="pijl" href="/contact/">Neem contact op</a></p>
  </div></section>
</div>`;

const contact = () => `
<section class="paginakop paginakop-smal">
  <div class="breed">
    <h1>Contact</h1>
    <p>Een vraag, een tip over een oplossing die we gemist hebben, of een opmerking over de site? Stuur een bericht.</p>
  </div>
</section>
<div class="breed smal">
  <form class="formulier kaartvlak" id="contact" novalidate data-gelukt="Je bericht is binnen. Dank je wel.">
    ${honingpot}
    <div class="twee">
      <label>Naam <input name="naam" required autocomplete="name" maxlength="100"></label>
      <label>E-mailadres <input type="email" name="email" required autocomplete="email" maxlength="200"></label>
    </div>
    <label>Onderwerp <input name="onderwerp" maxlength="160"></label>
    <label>Bericht <textarea name="bericht" required maxlength="3000"></textarea></label>
    <div class="formvoet"><button class="knop" type="submit">Verstuur</button><p class="formstatus" role="status"></p></div>
    <p class="voetnoot">Gaat het over een vermelding? Gebruik dan <a href="/inzenden/?soort=aanvulling">het formulier voor aanvullingen</a>.</p>
  </form>
</div>`;

const privacy = () => `
<section class="paginakop paginakop-smal"><div class="breed"><h1>Privacy</h1><p>Welke gegevens Meesterproef verwerkt, waarom, en wat je daarover kunt vragen.</p></div></section>
<div class="breed proza">
  <section><h2>Wie is verantwoordelijk</h2><div><p>Meesterproef is een initiatief van Sterrenstof. Sterrenstof is verantwoordelijk voor de gegevens die via deze site worden verwerkt. Je bereikt ons via het <a href="/contact/">contactformulier</a>.</p></div></section>
  <section><h2>Wat we verwerken</h2><div>
    <ul class="punten">
      <li><b>Inzendingen en aanvullingen:</b> je naam, e-mailadres en rol, en wat je over de oplossing invult. We gebruiken dit om de inzending te behandelen en contact met je op te nemen.</li>
      <li><b>Jury-aanmeldingen:</b> je naam, e-mailadres, functie, organisatie en wat je over je ervaring schrijft.</li>
      <li><b>Juryleden:</b> je naam, functie, organisatie en korte beschrijving staan openbaar op de site, net als je cijfers en toelichtingen. Daar ga je bij je toetreding mee akkoord.</li>
      <li><b>Contactberichten:</b> je naam, e-mailadres en bericht.</li>
      <li><b>Misbruik voorkomen:</b> bij inloggen en bij het versturen van een formulier houden we kort je IP-adres bij, om het aantal pogingen te begrenzen.</li>
    </ul>
  </div></section>
  <section><h2>Cookies en meten</h2><div>
    <p>De site plaatst één cookie, en alleen als je inlogt: die onthoudt dat je bent ingelogd. Er zijn geen cookies voor advertenties of voor het volgen van bezoekers, en er draait geen meetsoftware van derden.</p>
    <p>Het inzendformulier bewaart je invoer in je eigen browser tot je verstuurt, zodat je niets kwijtraakt. Die gegevens verlaten je apparaat niet voordat je op versturen drukt.</p>
  </div></section>
  <section><h2>Organisaties in de selectie</h2><div>
    <p>De selectie beschrijft oplossingen van organisaties op basis van openbare bronnen. Dat zijn geen persoonsgegevens. Staat er toch een naam van een persoon in een beschrijving die je weg wilt hebben, of wil je een vermelding laten verwijderen, <a href="/inzenden/?soort=aanvulling">laat het weten</a>.</p>
  </div></section>
  <section><h2>Bewaren en delen</h2><div>
    <p>De site en de gegevens staan bij Netlify, onze hostingpartij. We delen gegevens met niemand anders. Inzendingen, aanmeldingen en berichten bewaren we zolang ze nodig zijn voor de behandeling, en hooguit twee jaar.</p>
  </div></section>
  <section><h2>Je rechten</h2><div>
    <p>Je kunt vragen welke gegevens we van je hebben, ze laten verbeteren of laten verwijderen. Stuur daarvoor een bericht via het <a href="/contact/">contactformulier</a>. Ben je het niet eens met hoe we met je gegevens omgaan, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens.</p>
  </div></section>
</div>`;

const voorwaarden = () => `
<section class="paginakop paginakop-smal"><div class="breed"><h1>Voorwaarden</h1><p>De afspraken voor wie een oplossing inzendt, jurylid is of de site gebruikt.</p></div></section>
<div class="breed proza">
  <section><h2>Inzenden</h2><div>
    <ul class="punten">
      <li>Je zendt alleen in wat je namens de organisatie mag delen, en je gegevens kloppen voor zover je weet.</li>
      <li>De redactie beslist of een inzending in de selectie komt en schrijft de beschrijving. Die leggen we voor publicatie aan je voor.</li>
      <li>Inzenden is gratis en geeft geen recht op een beoordeling of een onderscheiding.</li>
      <li>Je kunt een inzending op elk moment laten intrekken. Cijfers die de jury al heeft gegeven, verdwijnen dan met de vermelding.</li>
    </ul>
  </div></section>
  <section><h2>Beoordeling</h2><div>
    <ul class="punten">
      <li>De jury beoordeelt volgens de <a href="/werkwijze/">werkwijze</a>. Cijfers en toelichtingen zijn openbaar, met de naam van het jurylid.</li>
      <li>Over een cijfer is geen beroep mogelijk. Feitelijke fouten in een beschrijving verbeteren we wel.</li>
      <li>Een onderscheiding mag je vermelden zolang je erbij zegt van wanneer ze is en naar de pagina van de oplossing verwijst.</li>
    </ul>
  </div></section>
  <section><h2>De selectie van de redactie</h2><div>
    <p>Een nominatie door de redactie steunt op openbare bronnen en is geen aanbeveling, keurmerk of samenwerking. We doen ons best om alles juist weer te geven, maar een bron kan verouderd zijn. Wie een fout ziet of een vermelding weg wil hebben, kan dat <a href="/inzenden/?soort=aanvulling">melden</a>.</p>
  </div></section>
  <section><h2>Gebruik van de site</h2><div>
    <p>De teksten op deze site zijn van Meesterproef. Je mag ze citeren met bronvermelding. De namen en merken van organisaties en producten zijn van hun eigenaren.</p>
    <p>Op deze voorwaarden is Nederlands recht van toepassing.</p>
  </div></section>
</div>`;

const nietGevonden = () => `
<section class="breed nietgevonden">
  <p class="nietgevonden-cijfer" aria-hidden="true">404</p>
  <h1>Deze pagina bestaat niet.</h1>
  <p>Misschien is de vermelding verwijderd, of klopt het adres niet.</p>
  <p><a class="knop" href="/oplossingen/">Bekijk de oplossingen</a> <a class="knop knop-lijn" href="/">Naar de startpagina</a></p>
</section>`;

const bekijk = () => `<article class="detail" id="oplossing"><div class="breed"><p class="meta" style="padding-block:60px">De oplossing wordt geladen.</p></div></article>
<nav class="breed buren" id="buren" aria-label="Vorige en volgende oplossing"></nav>
<section class="breed blok" id="verwant"></section>`;

export const PAGINAS = [
  { pad: "index.html", titel: "Meesterproef · De prijs voor AI die werkt", beschrijving: "Meesterproef toont en beoordeelt AI-oplossingen die in Nederland echt in gebruik zijn. Een vakjury geeft openbare cijfers op vijf criteria.", script: "start.js", lijf: "pagina-start", inVoorbeeld: true, inhoud: start },
  { pad: "oplossingen/index.html", titel: "Oplossingen · Meesterproef", beschrijving: "Alle AI-oplossingen in de selectie van Meesterproef, te filteren op oordeel, sector, soort en bewijs.", script: "overzicht.js", actief: "oplossingen", inVoorbeeld: true, inhoud: overzicht },
  { pad: "oplossingen/bekijk/index.html", titel: "Oplossing · Meesterproef", beschrijving: "Een AI-oplossing in de selectie van Meesterproef.", script: "detail.js", actief: "oplossingen", lijf: "pagina-detail", index: false, inhoud: bekijk },
  { pad: "winnaars/index.html", titel: "Winnaars · Meesterproef", beschrijving: "De AI-oplossingen die van de jury een Meesterproef of een eervolle vermelding kregen.", script: "winnaars.js", actief: "winnaars", inVoorbeeld: true, inhoud: winnaars },
  { pad: "ranglijst/index.html", titel: "Ranglijst · Meesterproef", beschrijving: "Welke organisaties en makers de meeste onderscheidingen en nominaties hebben.", script: "ranglijst.js", actief: "ranglijst", inVoorbeeld: true, inhoud: ranglijst },
  { pad: "jury/index.html", titel: "Jury · Meesterproef", beschrijving: "Wie de AI-oplossingen beoordeelt en hoe je jurylid wordt.", script: "jury.js", actief: "jury", inVoorbeeld: true, inhoud: jury },
  { pad: "werkwijze/index.html", titel: "Werkwijze · Meesterproef", beschrijving: "Hoe een oplossing in de selectie komt, hoe de jury beoordeelt en wat een onderscheiding betekent.", script: "werkwijze.js", actief: "werkwijze", inhoud: werkwijze },
  { pad: "inzenden/index.html", titel: "Inzenden · Meesterproef", beschrijving: "Zend een AI-oplossing in of vul een bestaande vermelding aan.", script: "inzenden.js", inhoud: inzenden },
  { pad: "account/index.html", titel: "Inloggen · Meesterproef", beschrijving: "Inloggen voor juryleden en de redactie.", script: "account.js", actief: "account", lijf: "pagina-werk", index: false, inhoud: account },
  { pad: "beheer/index.html", titel: "Beheer · Meesterproef", beschrijving: "Beheer voor de redactie.", script: "beheer.js", lijf: "pagina-werk", index: false, inhoud: beheer },
  { pad: "over/index.html", titel: "Over · Meesterproef", beschrijving: "Wat Meesterproef is, waarom het bestaat en wie erachter zit.", script: "basis.js", inhoud: over },
  { pad: "contact/index.html", titel: "Contact · Meesterproef", beschrijving: "Neem contact op met de redactie van Meesterproef.", script: "contact.js", inhoud: contact },
  { pad: "privacy/index.html", titel: "Privacy · Meesterproef", beschrijving: "Welke gegevens Meesterproef verwerkt en waarom.", script: "basis.js", inhoud: privacy },
  { pad: "voorwaarden/index.html", titel: "Voorwaarden · Meesterproef", beschrijving: "De afspraken voor inzenders, juryleden en bezoekers.", script: "basis.js", inhoud: voorwaarden },
  { pad: "404.html", titel: "Niet gevonden · Meesterproef", beschrijving: "Deze pagina bestaat niet.", script: "basis.js", index: false, inhoud: nietGevonden },
];
