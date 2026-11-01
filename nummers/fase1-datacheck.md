# Fase 1: datacheck nummers ontleden

Peildatum 1 november 2026. Testset van tien nummers. Scripts en ruwe uitkomsten staan in `datacheck/`. Er is geen audio bewaard in de repo.

## Kort

- **Credits zijn er, maar wisselend.** Bij ouder werk met een goed gedocumenteerd album zijn ze rijk: *Rehab* heeft 40 instrumentcredits in MusicBrainz en 36 in Discogs. Bij recente singles en eigen-huisproducties is het bijna leeg: *Not Like Us* en *bad guy* hebben in beide bronnen nul instrumentcredits.
- **De apparaten (CR-78, Prophet-5, LinnDrum) staan er nauwelijks in.** MusicBrainz zegt alleen "drum machine" en "synthesizer". Discogs komt dichter bij: "Drum Machine [Roland]", "Synthesizer [Prophet]", "Sampler [Emulator]", maar ook geen typenummer. Die laag moet met de hand, met een bron per feit.
- **Samples:** MusicBrainz kent de bekende samples goed (*Juicy* ← Mtume, *One More Time* ← Eddie Johns, *Ice Ice Baby* ← *Under Pressure*). Bij het recente rapnummer staat niets. "Gesampled door" is vaak groter en rommeliger (mash-ups van hobbyisten).
- **Previews: alle tien hebben er een,** bij iTunes en bij Deezer, 30 seconden. iTunes is de bruikbare: vaste links en open CORS. Deezer-links verlopen na 15 minuten en de Deezer-API is niet vanuit de browser aan te roepen. Bij beide mag je de preview alleen streamen, niet opslaan.
- **Spoorscheiding met Demucs werkt** en kost op deze machine (4 CPU-kernen) 22 tot 32 seconden per preview van 30 seconden. In de browser kan het ook (ONNX), maar het model is 80 tot 180 MB.
- **Foto's van instrumenten:** voor gewone instrumenten ruim voldoende (Wikidata/Commons en het Met, CC0). Voor de apparaten alleen via Commons, en juist de **Roland CR-78 heeft geen afbeelding in Wikidata**.

Mijn advies staat onderaan.

## De testset

| Sleutel | Nummer | Genre |
|---|---|---|
| air-tonight | Phil Collins, *In the Air Tonight* | pop/rock 1981 |
| billie-jean | Michael Jackson, *Billie Jean* | pop 1982 |
| under-pressure | Queen & David Bowie, *Under Pressure* | rock 1981 |
| one-more-time | Daft Punk, *One More Time* | house 2000 |
| juicy | The Notorious B.I.G., *Juicy* | hiphopklassieker 1994 |
| not-like-us | Kendrick Lamar, *Not Like Us* | rap 2024 |
| rehab | Amy Winehouse, *Rehab* | soul 2006 |
| bad-guy | Billie Eilish, *bad guy* | pop 2019 |
| de-bom | Doe Maar, *De bom* | Nederlandstalig 1983 |
| bolero | Ravel, *Boléro* | klassiek 1928 |

## Per nummer

"Speelcredits" = wie welk instrument speelt of zingt. Bij MusicBrainz geteld op de opname die de meeste relaties heeft (live, remix en karaoke vallen af); bij Discogs op de release van het album met de meeste credits (hoofdrelease plus twaalf oudste versies).

| Nummer | MusicBrainz speelcredits | Discogs speelcredits | Samples erin (MB) | Gesampled door (MB) | Preview |
|---|---|---|---|---|---|
| In the Air Tonight | 9 (o.a. drum machine, Rhodes, synthesizer, vocoder) | 27 (o.a. Drum Machine [Roland], Synthesizer [Prophet], strijkers) | 0 | 9 (Nas, 2Pac, DMX …) | ja |
| Billie Jean | 6 (drums, bas, Rhodes, synth ×2, gitaar) + zang | 10 (o.a. Sampler [Emulator]) | 0 | 8 | ja |
| Under Pressure | 21 (incl. handclaps, vingerknippen) | 0 | 0 | 2 (o.a. Vanilla Ice) | ja |
| One More Time | 1 (zang) | 1 (zang) | 1: Eddie Johns, *More Spell on You* | 7 | ja |
| Juicy | 2 (zang) | 1 (zang) | 2: Mtume, *Juicy Fruit*; *Rappin' Duke* | 7 | ja |
| Not Like Us | 0 | 0 | 0 | 0 | ja |
| Rehab | 40 (strijkers, blazers, harp …) | 36 | 0 | 0 | ja |
| bad guy | 0 | 0 | 0 | 0 | ja |
| De bom | 10 | 4 | 0 | 0 | ja |
| Boléro | 0 instrumenten; wel orkest en dirigent | 0 | n.v.t. | n.v.t. | ja |

Opmerkingen:

- **Boléro:** MusicBrainz heeft 498 opnames van het werk. In een steekproef van zes staan alleen orkest en dirigent, geen instrumenten. Dat is normaal voor klassiek; de bezetting (welke instrumenten, wanneer) zit in de partituur, niet in de credits. Die bezetting is wel vrij te vinden (IMSLP, Wikipedia) en zou met de hand moeten.
- **Billie Jean:** de bekende LinnDrum staat in geen van beide bronnen. Discogs noemt een Emulator.
- **Discogs en de juiste release:** de credits staan vaak alleen op de oorspronkelijke persing, niet op heruitgaven. Bij *Rehab* vond het zoeken eerst een promo-sampler zonder credits; met de hand de goede master gekozen gaf 53 credits. Een automatische koppeling heeft dus een controle nodig.
- **Samples in MusicBrainz:** "gesampled door" bestaat voor een groot deel uit mash-ups en hobbyproducties. Voor de site moet je daar selecteren (bijvoorbeeld alleen releases op een label).
- **Zelf gecontroleerd tegen wat ik weet:** *Not Like Us* heeft geen sample in MusicBrainz. Dat klopt met wat er over bekend is; het is geen gat in de data. Bij *bad guy* is het gat echt: er staan geen instrumenten in, terwijl de productie bekend is (Finneas, thuisstudio).

## Bronnen en voorwaarden

| Bron | Wat | Licentie / voorwaarden | Vanaf deze machine |
|---|---|---|---|
| MusicBrainz | credits, samples, ISRC's, koppeling naar Wikidata | kerndata CC0; 1 verzoek per seconde, of zelf een kopie van de dump | werkt (soms 503, dan opnieuw) |
| Discogs | credits per release, merk in de rol ("Drum Machine [Roland]") | maandelijkse datadump CC0 (data.discogs.com); de API zelf vraagt bronvermelding | werkt, 25 per minuut zonder token |
| iTunes Search API | preview 30 s (AAC), vaste link, CORS open | alleen streamen, niet opslaan; alleen "ter promotie", met een badge die naar de winkel linkt en de vermelding "provided courtesy of iTunes"; ongeveer 20 zoekvragen per minuut | werkt, met een pauze tussen vragen |
| Deezer API | preview 30 s (mp3), ISRC, soms BPM | opslaan van audio verboden; previews op websites toegestaan | werkt, maar links verlopen na ±15 minuten en de API heeft geen CORS-header |
| Wikidata | naam in het Nederlands, foto (P18), Wikipedia-link | CC0 | losse vragen gaven 429; één SPARQL-vraag werkte |
| Wikimedia Commons | de foto's zelf, licentie per foto | CC0, CC BY of CC BY-SA per bestand | blokkeert (429), dus via GitHub Action zoals bij Voggels |
| Met Open Access | foto's van historische instrumenten | CC0 | werkt; oude zoek-API is per 1 oktober 2026 vervangen door `/v1.1/search` |
| WhoSampled | samples, het meest volledig | geen open API, scrapen verboden | niet gebruikt; alleen naar linken |

Bronnen voor de voorwaarden: [Apple Search API](https://performance-partners.apple.com/search-api), [Deezer guidelines](https://developers.deezer.com/guidelines), [Discogs data](https://data.discogs.com/). De volledige Deezer-gebruiksvoorwaarden (commercieel of niet, logo) heb ik niet kunnen lezen; die moeten nog nagekeken worden.

**Let op bij iTunes:** "alleen ter promotie en niet voor zelfstandig vermaak". Een site die een fragment uit elkaar haalt om te leren luisteren, met een knop naar Apple Music ernaast, past daar redelijk in, maar het is een grijs gebied. Spoorscheiding op een iTunes-preview betekent dat je die preview bewerkt; dat staat niet in de voorwaarden en ik zou dat niet op de server doen.

### Kwaliteit van de previews

- iTunes: 30,0 s, AAC (m4a), ±1 MB, `Access-Control-Allow-Origin: *`. Spectrogram in de browser kan dus (fetch, `decodeAudioData`). Op iOS speelt m4a gewoon in een `<audio>`-element.
- Deezer: 30,0 s, mp3 128 kbit/s, ±470 kB, ook CORS open op het bestand, maar de link verloopt.
- Welk stuk van het nummer de preview is, kies je niet zelf. Bij *In the Air Tonight* is het waarschijnlijk een couplet met zang en drumcomputer, niet de beroemde drumbreak.
- De gevonden versie is niet altijd het origineel (iTunes gaf bij *Billie Jean* "Single Version", Deezer gaf bij *Boléro* een moderne bewerking). Koppelen via ISRC uit MusicBrainz is beter dan zoeken op titel.

## Spoorscheiding: proef met Demucs

Demucs v4 (`htdemucs`, MIT-licentie), op de Deezer-previews van drie nummers, op de CPU van deze machine (4 kernen Xeon 2,1 GHz, geen GPU).

| Preview (30 s) | Model | Tijd |
|---|---|---|
| In the Air Tonight | htdemucs (4 sporen) | 31,6 s (incl. eerste keer model laden) |
| Billie Jean | htdemucs | 22,8 s |
| Juicy | htdemucs | 22,2 s |
| In the Air Tonight | htdemucs_6s (6 sporen, met gitaar en piano) | 26,6 s |

Model: 84 MB (htdemucs), 55 MB (htdemucs_6s).

Wat eruit komt (aandeel van de energie per spoor):

| Preview | Zang | Drums | Bas | Overig |
|---|---|---|---|---|
| In the Air Tonight | 49% | 23% | 13% | 15% |
| Billie Jean | 13% | 16% | 68% | 3% |
| Juicy | 36% | 38% | 22% | 4% |

Wat dat zegt:

- Het past bij wat je verwacht: bij *Billie Jean* overheerst de baslijn, bij *Juicy* zang en beat, en bij *In the Air Tonight* is de zang de eerste vier seconden stil (de zang komt pas daarna in).
- Het 6-sporenmodel vond bij *In the Air Tonight* geen gitaar (0%) en een beetje piano (1%). Dat is plausibel voor dit stuk, maar laat zien dat de extra sporen weinig opleveren.
- De vier sporen samen geven het origineel terug (rest −11 tot −15 dB, grotendeels mp3-verlies). Dat zegt niets over hoe schoon de scheiding is. Gepubliceerde metingen voor htdemucs liggen rond 9 dB SDR: goed hoorbaar, maar met doorlekken (een beetje hi-hat in de zang, galm in "overig").
- **Hoe het klinkt heb ik niet zelf beoordeeld**: ik kan niet luisteren. De sporen staan in mijn werkmap (niet in de repo). Ik kan ze je privé sturen om te beluisteren.

### Kan het in de browser?

Ja, er bestaan meerdere werkende ONNX-versies van htdemucs voor ONNX Runtime Web (WebGPU, met WebAssembly als terugval):

- [monteslu/htdemucs-web-onnx](https://huggingface.co/monteslu/htdemucs-web-onnx): in 21 stukken gehakt zodat de pagina blijft reageren, fp16
- [webnn/stem-separator](https://huggingface.co/webnn/stem-separator)
- [ptasior/pizu-audio-models](https://huggingface.co/ptasior/pizu-audio-models): ±180 MB, volledig in de browser
- [demucs-rs](https://github.com/nikhilunni/demucs-rs) (Rust naar WebAssembly) en [demucs-onnx](https://pypi.org/project/demucs-onnx/) (export plus browserdemo)

Bezwaren: 80 tot 180 MB downloaden voor één bezoek, en op een iPad of telefoon zonder WebGPU waarschijnlijk minuten in plaats van seconden. Niet zelf gemeten. Dit is een proef voor fase 2 waard, alleen voor "open je eigen bestand".

## Foto's van instrumenten

33 instrumenten en apparaten uit de testset bekeken.

**Wikidata** (afbeelding P18, staat op Commons dus vrije licentie; welke licentie precies kon ik niet ophalen, Commons blokkeert):

- Met foto: Prophet-5, LinnDrum, E-mu Emulator, TR-808, Akai MPC, vocoder (Korg VC-10), Rhodes, drumstel, snaredrum, basgitaar, elektrische gitaar, gitaar, piano, viool, altviool, cello, contrabas, harp, trompet, trombone, alt-, tenor- en baritonsaxofoon, hobo, klarinet, fagot, celesta, tamboerijn.
- **Geen foto: Roland CR-78.** Precies het apparaat uit het voorbeeld. Of Commons wel een vrije foto heeft, kon ik niet nakijken (Commons blokkeert); dat moet met de hand of via de Action.
- Niet goed gevonden door mijn zoekterm: Wurlitzer elektrische piano, dwarsfluit, hoorn. Technics SL-1200 gaf een foto die geen draaitafel is. Kortom: de foto uit Wikidata is een begin, niet het eindresultaat. Elke foto moet je bekijken (bij Voggels ook zo).
- Nederlandse namen staan er bijna allemaal in (snaredrum heet in Wikidata "kleine trom").

**Met Museum** (afdeling Muziekinstrumenten, CC0, per instrument de eerste vijf treffers bekeken):

- Voor klassieke instrumenten ruim: viool, altviool, cello, fagot, tamboerijn en trompet 5 van 5 met vrije foto; hobo 4, snaredrum 4.
- Alles is historisch (1700–1900). Mooi voor de kinderversie en voor "zo zag het eruit", niet voor elektrische gitaar (0) of synthesizers (niet in de collectie).

Losse klanken (University of Iowa, Freesound, Philharmonia) heb ik in deze ronde niet gemeten. Iowa was bereikbaar; Freesound gaf 403 zonder API-sleutel.

## Wat de site wel en niet kan, volgens deze check

| Onderdeel | Haalbaar? |
|---|---|
| Credits per instrument | ja voor een deel van de nummers; moet zichtbaar "onvolledig" kunnen zijn |
| Welk apparaat precies (CR-78, LinnDrum) | alleen met de hand, met bron |
| Samples | ja voor bekende hiphop en house; recent weinig |
| Een preview afspelen | ja, via iTunes, met winkelknop |
| Spectrogram van de preview | ja, in de browser |
| Sporen beluisteren | alleen als schatting; vooraf berekend mag niet met previews (niet opslaan), dus alleen in de browser of op je eigen bestand |
| Tijdlijn per instrument over het hele nummer | niet uit open data; alleen als schatting uit gescheiden sporen, en dan alleen voor de 30 seconden |
| Foto's van instrumenten | ja; apparaten met de hand |

## Advies

1. **Begin met een vaste, met de hand gekozen set** van 30 tot 50 nummers. De data is te wisselend om alles zoekbaar te maken. MusicBrainz en Discogs leveren de basis, de apparaten en de belangrijkste weetjes vul je zelf aan, met een bron per regel.
2. **Credits uit MusicBrainz én de Discogs-dump samen**, gekoppeld via de oorspronkelijke release. Beide CC0. De dump van Discogs maandelijks via een GitHub Action, net als de vogeldata.
3. **Geluid via iTunes-previews**, gestreamd, met badge en bronvermelding. Koppelen via ISRC. Geen audio op onze server.
4. **De tab "Sporen" eerlijk maken:** voor de vaste set de opbouw met de hand beschrijven (wanneer komen de drums erin), en spoorscheiding alleen aanbieden op een bestand dat je zelf opent, in de browser. Eerst een proef of dat op een iPad te doen is.
5. **Samples:** MusicBrainz, met de hand geschift, en een link naar WhoSampled.
6. **Foto's** via een GitHub Action van Commons, en het Met voor klassieke instrumenten.

## Nog open, voor mij om na te kijken

- De volledige Deezer-voorwaarden en of de iTunes-regel "alleen ter promotie" past bij deze site.
- De licentie per Commons-foto (via een Action).
- Losse instrumentklanken: Iowa, Freesound (API-sleutel nodig), Philharmonia.
- Meyda (MIT) of Essentia.js (AGPL) voor tempo en toonsoort in de browser: niet getest.

**Hier stop ik, zoals afgesproken. Ik wacht op je akkoord voor fase 2.**
