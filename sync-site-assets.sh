#!/bin/sh
# Kopiér kanoniske filer fra hjemmesiden/ til repo-rod, så root og undermappe ikke divergerer ved deploy.
# Kør efter du har ændret filer i hjemmesiden/:  ./sync-site-assets.sh
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cp "$ROOT/hjemmesiden/styles.css" "$ROOT/styles.css"
cp "$ROOT/hjemmesiden/script.js" "$ROOT/script.js"
echo "OK: styles.css og script.js kopieret fra hjemmesiden/ til repo-rod."
