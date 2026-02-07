#!/usr/bin/env sh
set -eu

if command -v node >/dev/null 2>&1; then
  exec node scripts/postinstall.mjs
fi

if command -v bun >/dev/null 2>&1; then
  exec bun scripts/postinstall.mjs
fi

echo "[postinstall] neither node nor bun found; skipping" >&2
exit 0

