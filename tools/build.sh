#!/bin/sh
# Kokoaa julkaistavat tiedostot dist-kansioon (vain peli, ei työkaluja).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/dist"
for f in index.html game.js levels.js editor.js sw.js manifest.webmanifest icon-192.png icon-512.png; do
  cp "$ROOT/$f" "$ROOT/dist/$f"
done
