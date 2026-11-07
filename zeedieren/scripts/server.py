"""Lokale testserver die zich gedraagt als Netlify: de redirects en de CSP uit netlify.toml.
Gebruik: python3 scripts/server.py [poort]   (vanuit de repo-root)"""
import http.server, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")
_toml = open(os.path.join(ROOT, "..", "netlify.toml")).read()
CSP = re.search(r'Content-Security-Policy = "([^"]+)"', _toml).group(1)
REGELS = re.findall(r'from = "([^"]+)"\s+to = "([^"]+)"', _toml)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def send_head(self):
        pad = self.path.split("?")[0].rstrip("/") or "/"
        for van, naar in REGELS:
            if pad == van or (van.endswith("/*") and pad.startswith(van[:-1])):
                self.path = naar; break
        if not os.path.exists(os.path.join(ROOT, self.path.split("?")[0].lstrip("/"))) and not self.path.split("?")[0].endswith("/"):
            self.path = "/404.html"
        return super().send_head()
    def log_message(self, *a):
        pass

http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8766), Handler).serve_forever()
