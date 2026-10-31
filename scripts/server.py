"""Lokale testserver die zich gedraagt als Netlify: /hier/* en /soort/* geven index.html.

Gebruik: python3 scripts/server.py [poort]   (vanuit de repo-root)
"""
import http.server, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def send_head(self):
        pad = self.path.split("?")[0]
        if pad.startswith(("/hier/", "/soort/")) or pad in ("/kaart", "/soorten", "/ontdek"):
            self.path = "/index.html"
        elif pad == "/hoe-dit-werkt":
            self.path = "/hoe-dit-werkt.html"
        return super().send_head()

    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1]) if len(sys.argv) > 1 else 8080), Handler).serve_forever()
