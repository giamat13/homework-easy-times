#!/usr/bin/env python3
"""שרת סטטי מינימלי להרצת האפליקציה. python serve.py ואז פתח את הכתובת שמודפסת."""
import http.server, socketserver, webbrowser, os, sys

# קונסולת Windows ברירת מחדל היא cp1252 ומתה על טקסט עברי. מכריחים UTF-8.
for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass

with socketserver.TCPServer(('', PORT), H) as httpd:
    url = f'http://localhost:{PORT}/index.html'
    print(f'\n  האפליקציה רצה על {url}\n  לעצירה: Ctrl+C\n')
    webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nהשרת נעצר.')
