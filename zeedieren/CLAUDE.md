# Zeezicht (werktitel): werkafspraken

Dieren in zee, voor ouders en kinderen. Vijfde site in de familie van Voggels (`sterrenstofai/Vogels`), De Ruimte (`deruimte`), Ik hoor een geluidje (`ikhooreengeluidje`) en Voertuigen (`Fiets`). Briefing: `docs/briefing.md`; datacheck: `docs/fase1-datacheck.md`.

- **Eerlijk over wat de site niet weet.** Labels: "foto" (echte foto), "tekening" (oude plaat of eigen tekening), "simulatie" (door de browser uitgerekend of verzonnen), "nagekeken" (weetje waarvan de controlezin op de bronpagina staat), "echte meldingen". Pagina `site/hoe-dit-werkt.html`.
- **Weetjes alleen met een controlezin** (`data/handwerk/<slug>.json`). `scripts/nakijken.py` (uit De Ruimte) kijkt elke maand na; een weetje dat niet meer gevonden wordt, gaat van de site. Nooit iets schrijven dat kinderen aanmoedigt een dier aan te raken.
- **Geen cookies, geen tracking.** Mijn zee, onderzoekjes en het gekozen strand in localStorage. Locatie alleen in het geheugen (dichtstbijzijnde getijstation), nooit bewaren.
- **Browser-first:** statische site in `site/`, ES-modules, geen framework, geen build-stap. Data ververst door GitHub Actions. Strikte CSP in `netlify.toml`; `scripts/server.py` stuurt dezelfde CSP mee.
- **Geen AI-beelden.** Foto's en platen van Wikimedia Commons met vrije licentie, maker en licentie bij elk beeld, elke foto met de hand bekeken (geen aquarium, bord of museumstuk als foto van het dier). Geen goede foto: plaat of een zin waarom er niets is.
- **Geluid:** alleen echte opnames met vrije licentie; zeggen als iets versneld is (de blauwe vinvis: 10x, NOAA).
- **Veiligheid** (`data/veiligheid.json`, met bronnen): samen met een volwassene, zwemvest dicht bij het water, kwallen en pietermannen niet aanraken, zeehond minstens 30 m (Pieterburen 0595 526 526, of 144), wadlopen alleen met een gids, alles terugzetten.
- **Nederlands,** direct, zonder marketingtoon. Let op de/het: de zeehond, het zeepaardje, de kwal, het wad, het nonnetje.
- **Familie-opzet:** `site/css/familie.css` en `site/js/familie.js` uit Voertuigen; koppen gewicht 500, letterafstand −0,01em; warm papier `#F1EEE8`; accent licht zeeblauw `#9FD6E8` (donker `#6FBCD6`, inkt erop 10,5:1). Nergens cursief.
- **Data in lagen:** `data/soorten.json` (met de hand) → `data/ruw/` (scripts/ruw_ophalen.py) + `data/handwerk/` + `data/beelden.json` (scripts/beelden_ophalen.py) → `scripts/bouw_site_data.py` → `site/data/`. Wikimedia (Commons, Wikipedia) geeft vanaf de ontwikkelmachine een 429: dat deel draait in een Action.
- **Testen:** `python3 scripts/server.py` (poort 8766), dan `node tests/klikken.js`, `node tests/schermen.js <url> <map buiten de repo>` en `node tests/toegankelijk.js <url> <axe.min.js>`. Processen stoppen via hun pid.
