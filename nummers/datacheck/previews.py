"""Per testnummer: is er een preview van 30 seconden bij iTunes en bij Deezer?
Controleert ook of het mp3-bestand echt te laden is en hoe lang het is.
Schrijft uitkomsten/previews.json. Bewaart geen audio."""
import json, urllib.error, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from pathlib import Path
from nummers import NUMMERS, UA

UIT = Path(__file__).parent / "uitkomsten"

def get(url, ruw=False):
    """iTunes staat ongeveer 20 zoekvragen per minuut toe; daarom rustig aan."""
    for poging in range(3):
        time.sleep(4)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                return r.read() if ruw else json.load(r)
        except urllib.error.HTTPError as e:
            print("  ", e.code, url[:60], file=sys.stderr); time.sleep(30)
    return None

def duur(url):
    """Laadt de preview en meet de lengte met ffprobe. Geeft (seconden, kB, cors-header)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Origin": "https://example.org"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data, cors = r.read(), r.headers.get("Access-Control-Allow-Origin")
    with tempfile.NamedTemporaryFile(suffix=".audio") as f:
        f.write(data); f.flush()
        s = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,format_name", "-of", "json", f.name], capture_output=True, text=True)
        fmt = json.loads(s.stdout)["format"]
    return round(float(fmt["duration"]), 1), len(data) // 1024, fmt["format_name"], cors

def norm(s):
    return "".join(c for c in s.lower() if c.isalnum())

def main():
    uit = {}
    for sleutel, artiest, titel, album, genre in NUMMERS:
        print(sleutel, file=sys.stderr)
        rij = {}
        q = f"{artiest} {titel}" if sleutel != "bolero" else "Ravel Boléro"
        it = (get("https://itunes.apple.com/search?" + urllib.parse.urlencode({"term": q, "entity": "song", "limit": 10, "country": "NL"})) or {"results": []})["results"]
        it = [r for r in it if norm(titel)[:6] in norm(r["trackName"])] or it
        if it and it[0].get("previewUrl"):
            r = it[0]
            rij["itunes"] = {"titel": r["trackName"], "artiest": r["artistName"], "album": r.get("collectionName"),
                             "url_host": urllib.parse.urlparse(r["previewUrl"]).netloc, "isrc": None}
            try:
                rij["itunes"]["sec"], rij["itunes"]["kB"], rij["itunes"]["formaat"], rij["itunes"]["cors"] = duur(r["previewUrl"])
            except Exception as e:
                rij["itunes"]["fout"] = str(e)
        dz = get("https://api.deezer.com/search?" + urllib.parse.urlencode({"q": q, "limit": 10}))["data"]
        dz = [r for r in dz if norm(titel)[:6] in norm(r["title"])] or dz
        if dz and dz[0].get("preview"):
            r = dz[0]
            rij["deezer"] = {"titel": r["title"], "artiest": r["artist"]["name"], "album": r["album"]["title"],
                             "url_host": urllib.parse.urlparse(r["preview"]).netloc}
            try:
                full = get(f"https://api.deezer.com/track/{r['id']}")
                rij["deezer"]["isrc"], rij["deezer"]["bpm"] = full.get("isrc"), full.get("bpm")
                rij["deezer"]["sec"], rij["deezer"]["kB"], rij["deezer"]["formaat"], rij["deezer"]["cors"] = duur(r["preview"])
            except Exception as e:
                rij["deezer"]["fout"] = str(e)
        uit[sleutel] = rij
    (UIT / "previews.json").write_text(json.dumps(uit, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    main()
