# Hoe dit werkt (concept)

*Concepttekst voor de pagina op de site. Getallen met peildatum 31 oktober 2026; ze worden bij elke verversing bijgewerkt.*

## De vogels

Vogels staan niet stil. Deze site weet dus niet welke vogel er voor je deur zit, alleen waar mensen vogels hebben gemeld. De vraag die de site beantwoordt is: welke vogels kun je hier horen, en wanneer?

Alle meldingen komen van GBIF, het internationale knooppunt voor biodiversiteitsdata. We gebruiken de vijf jaar tot de peildatum: van 1 november 2021 tot en met 31 oktober 2026.

Verreweg de meeste meldingen komen van Observation.org (Waarneming.nl): 873.795 in en rond Twente. Observation.org deelt Nederlandse meldingen met GBIF alleen op een grof raster, in vakken van ongeveer 3,4 bij 5,6 kilometer. Precieser wordt het niet, en dat proberen we ook niet. Per vak halen we de soorten en de maanden op:

```
GET https://api.gbif.org/v1/occurrence/search?datasetKey=8a863029-f435-446a-821e-275f4f641165&taxonKey=212&country=NL&eventDate=2021-11-01,2026-10-31&decimalLatitude=52.35,52.35&decimalLongitude=6.9,6.9&facet=speciesKey&facet=month&limit=0
```

Daarnaast zijn er ongeveer 47.000 meldingen met een preciezere plek, vooral van eBird, iNaturalist en het Vogeltrekstation. Die gebruiken we alleen als de bron een onzekerheid van hooguit 500 meter opgeeft, of als het om een eBird-telpunt gaat.

## Van je straat naar heel Twente

Typ je een adres, dan zie je vijf lagen:

1. **Je straat.** Losse meldingen binnen 500 meter, met datum, soort en bron. Bij ruim de helft van de Twentse adressen is dat er geen enkele.
2. **Je vak.** Het rastervak van ongeveer 4 bij 6 kilometer waarin je adres ligt. Hier komt de lijst vandaan van vogels die je kunt verwachten.
3. **De vakken eromheen.** Omdat een adres vaak dicht bij de rand van zijn vak ligt.
4. **Je gemeente.** Alle vakken die je gemeente raken. Dat is iets ruimer dan de gemeentegrens, want een vak is niet te splitsen.
5. **Twente.** Hier komt de maandkalender per soort vandaan. Trektijden verschillen binnen Twente nauwelijks, en per vak zijn er te weinig meldingen om per maand iets te zeggen.

## Het adres

Adressen komen van de PDOK Locatieserver, alleen voor adressen in de veertien Twentse gemeenten. Je browser vraagt ze zelf op terwijl je typt. Daarna rekent je browser zelf uit in welk vak je adres ligt. Deze site slaat geen ingetypt adres op en heeft geen server die dat ziet.

## De namen

Nederlandse namen en de status in Nederland (broedvogel, wintergast, exoot) komen uit de Wikipedia-lijst van vogels in de Benelux, bijgewerkt tot 17 april 2026. Soorten die daar niet op staan, zoals de barbarie-eend en de Carolina-eend, zijn ontsnapte of uitgezette vogels. Die tonen we met dat label erbij. Kruisingen, zoals grauwe gans × Canadese gans, laten we weg.

## Het geluid

De opnames komen van xeno-canto. Per soort kiezen we een zang- en een roepopname: kwaliteit A waar het kan, liefst uit Nederland, anders uit België of Duitsland, anders uit de rest van Europa. We nemen alleen opnames waarvan de licentie een bewerking toelaat, zodat het meelopende spectrogram mag. De naam van de opnemer staat bij elke opname. Je browser haalt het geluid rechtstreeks bij xeno-canto op; xeno-canto ziet dus welke soort je afspeelt, niet waar je woont.

## De platen

De platen komen uit Naumann, *Naturgeschichte der Vögel Mitteleuropas* (1896–1905). Waar Naumann ontbreekt of te klein is, komen ze uit Nozeman & Sepp, *Nederlandsche Vogelen* (1770–1829), in scans van de Koninklijke Bibliotheek, en anders uit Gould, *The Birds of Europe* (1832–1837). Voor een paar soorten gebruiken we een ander oud vogelboek; het onderschrift zegt welk. Alle platen zijn publiek domein en staan op Wikimedia Commons. Heeft een soort geen historische plaat, dan zie je een lege plaat met de reden, bijvoorbeeld omdat de vogel toen nog niet in Nederland voorkwam. We maken geen nieuwe beelden. We hosten ze zelf, zodat je browser daarvoor niet naar Wikimedia hoeft. Een plaat toont soms meer soorten; het onderschrift zegt dan welke.

## Wat de site niet kan

- De site weet niet welke vogels er bij jou zitten, alleen wat mensen in de buurt hebben gemeld.
- Waar veel mensen kijken, worden meer vogels gemeld. Een vak met een populair natuurgebied lijkt rijker dan een vak met alleen weilanden.
- Een vak is ongeveer 19 vierkante kilometer. Een soort in "je vak" kan aan de andere kant van het vak gezien zijn.
- Gevoelige soorten en broedplekken die in de bron vervaagd of weggelaten zijn, blijven vervaagd of ontbreken.
- De maandkalender geldt voor heel Twente, niet voor jouw plek.
- Een opname komt meestal niet uit Twente.

## Privacy

Geen cookies en geen bezoekersstatistiek. Ingetypte adressen worden niet bewaard.
