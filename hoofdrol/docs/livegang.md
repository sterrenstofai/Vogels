# Van testversie naar open winkel

Alles hieronder is klaar in de code. Per onderdeel is één account met een sleutel nodig. Zet de sleutels in de instellingen van de site (zie `.env.example`); elk onderdeel schakelt dan vanzelf van test naar echt. In `/beheer` staat bovenaan welke onderdelen echt zijn.

Doe ze in deze volgorde en probeer na elke stap één bestelling.

## 1. Site online

- Maak in Netlify een site van deze repo met `hoofdrol` als basismap.
- Zet `SITE_URL` op het adres van de site, `ADMIN_EMAILS` op je eigen adres en `CRON_SECRET` op een lange willekeurige tekst.
- Controleer: een testbestelling doorlopen, en kijken of die na een herstart nog bestaat. De opslag in Netlify Blobs is geschreven maar nog nooit op Netlify zelf gedraaid.

## 2. Mail (Resend)

- Account maken, je domein toevoegen en de DNS-regels zetten die Resend geeft.
- `RESEND_API_KEY` en `MAIL_VAN` invullen.
- Controleer: inloggen via `/mijn` moet een mail opleveren. In `/beheer/mail` zie je per bericht of het verstuurd is.

## 3. Betalen (Mollie)

- Account maken, iDEAL aanzetten. Mollie vraagt KvK en een bankrekening; goedkeuring duurt meestal een paar dagen.
- Eerst de testsleutel in `MOLLIE_API_KEY`, dan de echte.
- Controleer: betalen, terugkomen op de fotopagina, en terugbetalen vanuit het beheer.

## 4. Platen (Higgsfield)

- API-sleutel maken op console.higgsfield.ai en saldo storten. Dit is een ander saldo dan de credits in je abonnement.
- `HIGGSFIELD_KEY_ID` en `HIGGSFIELD_KEY_SECRET` invullen.
- Controleer met een foto van je eigen kind. Let op gelijkenis, op de prijs per plaat in de console, en of een heel boek binnen een paar minuten klaar is.
- Het model (Grok Image 2.0) is met de hand geprobeerd met een verzonnen kind: twaalf platen, één herkenbaar kind in één stijl. Dat is het voorbeeldboek op de site.

## 5. Drukker (Gelato)

- Account maken en in de productcatalogus het vierkante fotoboek van 20 × 20 cm opzoeken, harde en zachte kaft. De product-uid's gaan in `GELATO_PRODUCT_UID_HARDCOVER` en `GELATO_PRODUCT_UID_SOFTCOVER`.
- Bestel eerst één boek voor jezelf. Kijk naar de snijranden, de rug en of de titel goed op de omslag staat. Dit deel is het minst zeker: de vorm van Gelato's antwoord op offerte en omslagmaten heb ik moeten aannemen.
- Stel in Gelato een melding in naar `/api/webhooks/gelato?s=<DRUKKER_WEBHOOK_SECRET>`, zodat de volgcode vanzelf bij de klant komt. Tot dat werkt kun je de volgcode in het beheer invullen.
- Een tweede drukker toevoegen is één blok code in `lib/providers/print.ts`; de goedkoopste offerte wint dan vanzelf.

## 6. Voor de winkel opengaat

- De echte tekst van het boekje in `lib/stories.ts` zetten, met per plaat een beeldopdracht, en het voorbeeldboek opnieuw laten maken.
- Bedrijfsgegevens invullen in de privacytekst en de voorwaarden, en beide laten nakijken. Met de beelddienst, de drukker, Mollie en Resend een verwerkersovereenkomst sluiten; foto's van kinderen zijn gevoelig.
- Naam en domein kiezen. "Hoofdrol" is een werktitel.
- De prijs vastzetten zodra de echte drukprijs en de prijs per plaat bekend zijn (`lib/pricing.ts`, daarna `npm run prijs`).

## Bekende beperkingen

- De rem op misbruik en het slot per bestelling tellen per serverproces. Bij veel verkeer horen daar gedeelde tellers voor in de plaats.
- Inloggen gaat alleen met een link per mail; er zijn geen wachtwoorden.
- Er is één verhaal. Een nieuw verhaal toevoegen is een blok in `lib/stories.ts` plus een voorbeeldboek.
- Bezorgen kan alleen in Nederland en België.
