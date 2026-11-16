import { PRIJZEN, euro } from '@/lib/pricing';
import { MERK } from '@/lib/merk';

export const metadata = { title: 'Voorwaarden' };

export default function Voorwaarden() {
  return (
    <main className="pagina">
      <div className="wrap tekst">
        <h1>Voorwaarden.</h1>
        <p><em>Concepttekst. Laat deze nakijken en vul de bedrijfsgegevens in voordat de winkel opengaat.</em></p>

        <h2>Met wie je een overeenkomst sluit</h2>
        <p>{MERK} is van [bedrijfsnaam], [adres], KvK [nummer], btw [nummer]. Bereikbaar via [e-mailadres].</p>

        <h2>Prijs en betalen</h2>
        <p>Alle prijzen zijn in euro’s en inclusief btw. Bezorgen kost {euro(PRIJZEN.verzending)}; bij twee boeken of meer bezorgen we gratis. Je betaalt vooraf. Daarna stuur je de foto in en maken we de platen.</p>

        <h2>Speciaal voor jou gemaakt</h2>
        <p>Elk boek wordt gemaakt met de naam en de foto van jouw kind. Voor producten die op maat worden gemaakt geldt het herroepingsrecht niet: je kunt de bestelling na het betalen niet kosteloos annuleren. Daar ga je bij het bestellen uitdrukkelijk mee akkoord.</p>

        <h2>Nakijken</h2>
        <p>Je ziet het hele boek voordat het wordt gedrukt en kunt drie platen opnieuw laten maken. Het boek gaat pas naar de drukker nadat jij akkoord hebt gegeven. Controleer vooral de naam en de opdracht voorin: die drukken we zoals jij ze hebt ingevuld.</p>
        <p>Lukt het ons niet om platen te maken waarop je kind herkenbaar is, dan krijg je je geld terug.</p>

        <h2>Bezorgen</h2>
        <p>We bezorgen in Nederland en België. Drukken en bezorgen duurt gewoonlijk ongeveer een week na jouw akkoord, en uiterlijk 30 dagen. Duurt het langer, dan mag je de bestelling kosteloos annuleren.</p>

        <h2>Niet goed</h2>
        <p>Is het boek beschadigd of verkeerd gedrukt, stuur ons dan binnen 14 dagen na ontvangst een foto. We sturen kosteloos een nieuw boek of betalen je terug, wat jij wilt. Je wettelijke rechten bij een ondeugdelijk product blijven altijd gelden.</p>

        <h2>De foto</h2>
        <p>Je stuurt alleen een foto in van je eigen kind, of van een kind waarvoor je toestemming van de ouders hebt. Wat we met de foto doen, staat op de pagina over privacy.</p>

        <h2>Klachten</h2>
        <p>Mail ons; je krijgt binnen twee werkdagen antwoord. Komen we er samen niet uit, dan kun je terecht bij het Europese platform voor onlinegeschillen. Op deze voorwaarden is Nederlands recht van toepassing.</p>
      </div>
    </main>
  );
}
