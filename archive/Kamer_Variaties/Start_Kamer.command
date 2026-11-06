#!/bin/bash
# Dubbelklik om de kamer-variaties via een kleine lokale webserver in Safari te openen.
# Via een webserver mag de film in Safari meteen met geluid starten (vanaf schijf, file://, blokkeert Safari dat).
# Sluit dit venster (of Ctrl+C) om de server te stoppen.
cd "$(dirname "$0")/.." || exit 1
PORT=8765
URL="http://localhost:$PORT/Kamer_Variaties/index.html"
( sleep 1; open -a Safari "$URL" ) &
echo "De kamer draait op $URL"
echo "Sluit dit venster om te stoppen."
if command -v python3 >/dev/null 2>&1 && python3 -c "" 2>/dev/null; then
  exec python3 -m http.server $PORT --bind 127.0.0.1
else
  exec ruby -run -e httpd . -p $PORT -b 127.0.0.1
fi
