#!/bin/sh
# Rend la page d'accueil en local (images factices) -> tools/out.html
# Les polices Google sont remplacees par des copies locales si tools/fonts/local.css existe.
cd "$(dirname "$0")"
[ -d node_modules/liquidjs ] || npm install --silent liquidjs@10
if [ -f fonts/local.css ]; then
  node render.js "${1:-1}" "${2:-}" | sed -E 's#<link rel="stylesheet" href="https://fonts.googleapis.com[^"]*">#<link rel="stylesheet" href="fonts/local.css">#' > out.html
else
  node render.js "${1:-1}" "${2:-}" > out.html
fi
echo "ok -> $(pwd)/out.html"
