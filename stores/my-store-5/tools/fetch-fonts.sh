#!/bin/sh
# Telecharge les polices du theme en local (le navigateur de test ne passe pas toujours par le proxy).
cd "$(dirname "$0")" && mkdir -p fonts
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
curl -sS -A "$UA" "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap" -o fonts/g.css
python3 - <<'PY'
import re, subprocess
css = open('fonts/g.css').read(); out = []
for i, (sub, b) in enumerate([x for x in re.findall(r'/\* (\S+) \*/\s*(@font-face\s*{[^}]*})', css) if x[0] in ('latin', 'latin-ext')]):
    url = re.search(r'url\((https://[^)]+)\)', b).group(1)
    subprocess.run(['curl', '-sS', '-o', 'fonts/f%d.woff2' % i, url], check=True)
    out.append(b.replace(url, 'f%d.woff2' % i))
open('fonts/local.css', 'w').write('\n'.join(out)); print(len(out), 'polices')
PY
