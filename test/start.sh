#!/usr/bin/env bash
# מפעיל את האפליקציה בדפדפן.
cd "$(dirname "$0")"
if command -v python3 >/dev/null; then exec python3 serve.py "$@"
elif command -v python  >/dev/null; then exec python serve.py "$@"
elif command -v npx     >/dev/null; then exec npx --yes serve -l 8000 .
else echo "צריך Python או Node כדי להריץ שרת סטטי."; exit 1; fi
