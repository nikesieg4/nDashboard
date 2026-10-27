#!/bin/sh
# Baut die übernommenen Bereiche der ABIS-Konsole (portal/) zu web/js/portal-abis.js.
# Braucht Node.js; esbuild wird in fester Version über npx geholt.
set -e
cd "$(dirname "$0")/.."
npx --yes esbuild@0.24.2 portal/index.jsx --bundle --format=iife --target=es2019 --charset=utf8 \
  --alias:react=./portal/shim/react.js --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment \
  --legal-comments=none --banner:js="/* Erzeugt mit tools/build-portal.sh aus portal/ – nicht von Hand ändern. */" \
  --outfile=web/js/portal-abis.js
