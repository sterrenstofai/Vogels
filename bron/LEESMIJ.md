# Bron: live deploys van 15 november 2026

Elke map is een ongewijzigde kopie van de live deploy, bestand voor bestand gedownload van `https://{deploy_id}--{projectnaam}.netlify.app`. `lijsten/<projectnaam>.sha1` bevat de SHA1 van elk gedownload bestand.

| Project | Deploy-id | Gepubliceerd | Bron van de deploy | Bestanden | Hier |
|---|---|---|---|---|---|
| onderzoekjes-met-fos | `6af2f22c5465446e8475a418` | 10 nov 2026 | upload | 2 | alleen de lijst |
| voggels | `6af5bc61a39fa17f42111b21` | 12 nov 2026 | `sterrenstofai/Vogels` @ `66d4b5f`, map `site/` | 592 | alleen de lijst |
| ikhooreengeluidje | `6ae9b6bfad50892dcb52ca76` | 3 nov 2026 | `sterrenstofai/ikhooreengeluidje` @ `bf6eba0`, map `site/` | 100 | `ikhooreengeluidje/` |
| onzeruimte | `6af7fbc330d430e867026c65` | 14 nov 2026 | `sterrenstofai/deruimte` @ `3d9cf29`, map `site/` | 90 | `onzeruimte/` |
| voertuigen | `6aeb64101155eb08a6163aad` | 4 nov 2026 | upload; gelijk aan `sterrenstofai/Fiets` @ `69d4233`, map `site/` | 82 | `voertuigen/` |
| zeezicht | `6af176becea8d438ead4c85d` | 9 nov 2026 | `sterrenstofai/Zeedieren` @ `6ce4356`, map `site/` | 215 | `zeezicht/` |

## Hoe dit is gecontroleerd
Er was geen `NETLIFY_AUTH_TOKEN`, dus de bestandslijst van de Netlify API (met het `sha`-veld) is niet gebruikt. In plaats daarvan is de lijst van elk onderzoekje de map `site/` van de bronrepo op de commit van de live deploy. Elk bestand is van de deploy gedownload en de SHA1 is vergeleken met het bestand in de repo: alle 1079 bestanden zijn gelijk.

## Wat hier niet staat
- **Hub (`onderzoekjes-met-fos`).** De hub is één `index.html` (1.994.295 bytes) plus `favicon.ico`. Het lettertype Feature zit er als base64 in. Deze repo is openbaar, dus het bestand staat hier niet. Het is op te halen van `https://6af2f22c5465446e8475a418--onderzoekjes-met-fos.netlify.app/`. Zonder API-lijst is niet uit te sluiten dat de deploy nog bestanden bevat waar de pagina niet naar verwijst.
- **Voggels.** De live deploy is gelijk aan `site/` in deze repo op commit `66d4b5f`. Een tweede kopie van 88 MB is weggelaten.
- **Redirects en headers.** Die staan niet in een deploy maar in `netlify.toml` van elke bronrepo, net als de GitHub Actions die data verversen.

## Serverfuncties
Geen van de zes deploys heeft functies of edge functions.
