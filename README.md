# Vogels in Twente (werktitel)

Typ je adres in Twente en hoor welke vogels je daar kunt verwachten, per seizoen.

Prototype: https://voggels.netlify.app (werktitel Voggels). De site staat in `site/` en is statisch: HTML, CSS en JavaScript zonder bouwstap. `netlify.toml` regelt de routes en de beveiligingsheaders.

Lokaal bekijken: `python3 scripts/server.py` en open http://127.0.0.1:8080.

Sitedata opnieuw bouwen: `python3 scripts/bouw_sitedata.py datacheck/twente_soorten.json datacheck/geo/gemeenten.json site/data`. Platen: `cd scripts && python3 platen_download.py ../data/platen.json ../data/soorten_slugs.json ../site/platen`.

Vooronderzoek:

- `docs/fase1-datacheck.md`: hoeveel waarnemingen er zijn, hoe nauwkeurig, en op welk niveau de site kan werken.
- `docs/fase2-bronnen.md`: geluid (xeno-canto), platen (Wikimedia Commons) en de opzet van de data.
- `docs/fase3-voorbereiding.md`: namen, opnames en platen per soort, met open punten.
- `docs/hoe-dit-werkt-concept.md`: concepttekst voor de pagina "Hoe dit werkt".
- `datacheck/`: de scripts en ruwe uitkomsten van fase 1 en 2.
- `scripts/` en `data/`: de gegevens per soort (fase 3).
