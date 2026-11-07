# Zeezicht (werktitel)

Dieren in zee, voor ouders en kinderen: wat leeft er aan het strand, op het wad en in de Noordzee, wat vind je als het eb is, en een paar beroemde dieren van verder weg. Met echte foto's, oude platen, weetjes die we bij de bron nakijken, getijden, een kinderversie en onderzoekjes met Fos.

De site staat in `site/` en is statisch (HTML, CSS, ES-modules, geen bouwstap). `netlify.toml` regelt de nette adressen en de beveiligingsheaders.

Lokaal bekijken: `python3 scripts/server.py` en open http://127.0.0.1:8766.

| Wat | Script | Waar het draait |
|---|---|---|
| Ruwe data per dier (WoRMS, Wikidata, GBIF, OBIS) | `scripts/ruw_ophalen.py` | overal |
| Getij voor 16 stations, 14 maanden vooruit (Rijkswaterstaat) | `scripts/getij_ophalen.py` | maandelijks in een Action (geen CORS) |
| Wat aanspoelt per maand (ANEMOON SMP via GBIF) | `scripts/strand.py` | overal |
| Kustlijn voor het kaartje (Natural Earth) | `scripts/basiskaart.py` | eenmalig |
| Kandidaten voor foto's, platen, geluid; Wikipedia-teksten | `scripts/beelden_zoeken.py` | Action (Wikimedia: 429) |
| Gekozen beelden ophalen (`data/beeld_keuze.json`) | `scripts/beelden_ophalen.py` | Action (Pillow, ffmpeg) |
| Weetjes nakijken | `scripts/nakijken.py` | maandelijks in een Action |
| Sitedata en redirects bouwen | `scripts/bouw_site_data.py` | overal |

Documentatie: `docs/briefing.md`, `docs/fase1-datacheck.md`, `docs/bronnen-onderzoek.md`, `docs/keuzes.md`. Werkafspraken: `CLAUDE.md`.
