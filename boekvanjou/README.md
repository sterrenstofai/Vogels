# Boek van jou

De winkel komt op boekvanjou.nl.

Webwinkel voor prentenboeken met je eigen kind in de hoofdrol.

## Wat de klant doet

1. **Ontwerp** (`/ontwerpen/<verhaal>`): naam, opdracht voorin en uitvoering, met het boek live in beeld.
2. **Voorbeeld** (`/voorbeeld/<code>`): door het boek bladeren met de eigen naam in de tekst en de platen van het voorbeeldboek.
3. **Bestellen** (`/bestellen/<code>`): adres en betalen.
4. **Foto** (`/maken/<code>`): pas na betaling. Daarna worden de platen gemaakt.
5. **Nakijken**: door het eigen boek bladeren, platen opnieuw laten maken, naar de drukker.

Onder `/mijn` logt de klant in met een link per e-mail en ziet alle bestellingen met hun stand en volgcode.
Onder `/beheer` (alleen voor adressen in `ADMIN_EMAILS`) staan alle bestellingen, de marge, de verstuurde mail en de handelingen per bestelling.

## Proberen

```
npm install
npm run dev
```

Open http://localhost:3000. Zonder sleutels draait alles op de testversie: nepbetaling, zelf getekende testplaten, twee testdrukkers en mail die alleen in het beheer te lezen is. Zet `ADMIN_EMAILS=jij@voorbeeld.nl` in `.env.local` om het beheer te zien.

De echte koppelingen proberen zonder accounts kan met nagemaakte diensten: `node scripts/nepdiensten.mjs` drukt af hoe je de site daartegen start.

`npm run prijs` rekent de marge door. Zie `docs/prijsstelling.md`. Wat er nog moet gebeuren voor de winkel open kan, staat in `docs/livegang.md`.

## Twee vormgevingen

Er zijn twee koppen en twee kleurstellingen, los van elkaar te kiezen:

| | Standaard | Andere optie |
| --- | --- | --- |
| Kop | `boeken`: drie zwevende boeken | `band`: gebogen band van omslagen en platen |
| Kleur | `licht`: wit en lichtgrijs | `pastel`: lila-grijs met bewegende wolken kleur |

Bekijken in je eigen browser: `/optie?kop=band&kleur=pastel` (elke combinatie kan). Terug naar de standaard: `/optie`.
De standaard voor iedereen wijzig je met de instellingen `KOP` en `KLEUR`.

## Hoe het in elkaar zit

| Onderdeel | Bestand | Stand |
| --- | --- | --- |
| Verhalen, teksten en beeldopdrachten | `lib/stories.ts` | Tekst van De ruimteschipper is een plaatshouder |
| Opbouw van het boek (30 bladzijden) | `lib/boek.ts` | Werkt; site en drukbestand gebruiken dezelfde opbouw |
| Drukbestanden: binnenwerk en omslag | `lib/pdf.ts` | Werkt; 20 × 20 cm met afloop |
| Stappen na betaling | `lib/pipeline.ts` | Werkt; de eerste plaat dient als voorbeeld voor de rest |
| Platen | `lib/providers/images.ts` | Higgsfield-API geschreven naar de documentatie en geprobeerd tegen een nagemaakte dienst; nog niet met een echte sleutel |
| Betalen en terugbetalen | `lib/providers/payment.ts` | Mollie, idem |
| Drukkers | `lib/providers/print.ts` | Meerdere drukkers geven een offerte, de goedkoopste drukt. Gelato idem; de vorm van hun offerte en omslagmaten is deels een aanname |
| Mail | `lib/mail.ts` | Resend, idem. Zes berichten: betaald, nakijken, drukker, verzonden, mislukt, terugbetaald, plus de inloglink |
| Inloggen, portaal, beheer | `lib/auth.ts`, `app/mijn`, `app/beheer` | Werkt |
| Opslag | `lib/store.ts` | Schijf (lokaal) of Netlify Blobs; Blobs is nog niet op Netlify getest |
| Achtergrondtaak | `app/api/cron/tick`, `netlify/functions/tick.mts` | Zet bestellingen door en ruimt op |
| Prijzen en marge | `lib/pricing.ts` | Kosten zijn schattingen |

## Regels die in de server zitten

- Een foto wordt geweigerd zolang de bestelling niet betaald is. De prijs rekent de server zelf uit.
- De foto is alleen op te halen met een aparte sleutel, die alleen de beelddienst krijgt. Na het drukken wordt de foto verwijderd; een foto die 90 dagen blijft liggen ook.
- Ontwerpen zonder bestelling verdwijnen na 7 dagen, onbetaalde bestellingen na 14 dagen.
- Elk bericht aan de klant gaat hooguit één keer.
- Kloppen de omslagmaten van de drukker niet met wat we verwachten, dan wordt er niet besteld.
