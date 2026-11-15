# Hoofdrol (werktitel)

Webwinkel voor prentenboeken met je eigen kind in de hoofdrol. De klant doorloopt vijf stappen:

1. **Ontwerp** (`/ontwerpen/<verhaal>`): naam, opdracht voorin en uitvoering, met het boek live in beeld.
2. **Voorbeeld** (`/voorbeeld/<code>`): door het boek bladeren met de eigen naam en tekst. De platen zijn hier nog beschrijvingen.
3. **Bestellen** (`/bestellen/<code>`): adres en betalen.
4. **Foto** (`/maken/<code>`): pas na betaling. Daarna worden de platen gemaakt.
5. **Nakijken**: door het echte boek bladeren, platen opnieuw laten maken, naar de drukker.

Onder `/mijn` staat het klantportaal: inloggen met een link per e-mail, daarna alle bestellingen met hun stand.

## Proberen

```
npm install
npm run dev
```

Open http://localhost:3000. Zonder sleutels draait alles op testproviders: de betaling is nagemaakt, de platen worden zelf getekend (met de geüploade foto in de helm) en er wordt niets gedrukt. Bestellingen en bestanden staan in `.data/`.

`npm run prijs` rekent de marge door met de aannames uit `lib/pricing.ts`. Zie ook `docs/prijsstelling.md`.

## Hoe het in elkaar zit

| Onderdeel | Bestand | Stand |
| --- | --- | --- |
| Verhalen en teksten | `lib/stories.ts` | Tekst van De ruimteschipper is een plaatshouder |
| Prijzen en marge | `lib/pricing.ts` | Kosten zijn schattingen |
| Betalen | `lib/providers/payment.ts` | Mollie geschreven, nog niet met een echte sleutel getest |
| Platen maken | `lib/providers/images.ts` | Alleen de testmaker; Higgsfield of Magnific moet nog gekoppeld |
| Drukbestand (pdf) | `lib/pdf.ts` | Werkt: 20 × 20 cm met 3 mm afloop; omslag ontbreekt nog |
| Drukker | `lib/providers/print.ts` | Gelato geschreven naar de documentatie, niet getest |
| Stappen na betaling | `lib/pipeline.ts` | Werkt |
| Inloggen en portaal | `lib/auth.ts`, `app/mijn` | Werkt; de mail met de link wordt nog niet verstuurd (testversie toont de link) |
| Opslag | `lib/store.ts` | Bestanden op schijf; voor productie een database en objectopslag |

De regel "eerst betalen, dan pas platen maken" zit in de server: `app/api/orders/[id]/photo/route.ts` weigert een foto zolang de bestelling niet betaald is, en de prijs rekent de server zelf uit.

## Nog te doen voor de winkel open kan

- Echte beeldkoppeling, en testen of het kind herkenbaar blijft op elke plaat.
- Accounts en sleutels: Mollie, drukker, beelddienst (zie `.env.example`).
- Omslag in het drukbestand, volgens de maten van de gekozen drukker.
- Mail versturen: de inloglink en de bevestiging met de link naar `/maken/<code>`.
- Volgcode van de drukker tonen in het portaal.
- Opslag die een herstart en meerdere servers overleeft.
- Privacytekst, voorwaarden en verwerkersovereenkomsten laten nakijken (foto's van kinderen).
