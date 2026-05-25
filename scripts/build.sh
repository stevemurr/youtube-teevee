#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BINARY="youtube-tv"
FRONTEND_SRC="frontend/dist"
FRONTEND_DEST="frontend-dist"

echo "=== YouTube TeeVee — production build ==="
echo ""

# 1. Build frontend
echo "Building frontend..."
(cd frontend && bun run build)
echo "  Done -> $FRONTEND_SRC/"
echo ""

# 2. Stage frontend assets next to the binary location
echo "Staging frontend assets..."
rm -rf "$FRONTEND_DEST"
cp -r "$FRONTEND_SRC" "$FRONTEND_DEST"
echo "  Done -> $FRONTEND_DEST/"
echo ""

# 3. Compile Bun binary (embeds Bun runtime + all JS/TS sources)
echo "Compiling binary..."
bun build --compile --outfile "$BINARY" src/server.ts
chmod +x "$BINARY"
echo "  Done -> ./$BINARY"
echo ""

echo "=== Build complete ==="
echo ""
echo "Deployment files (keep these together):"
echo "  ./$BINARY"
echo "  ./$FRONTEND_DEST/"
echo "  ./database/         (auto-created on first run)"
echo "  ./cookies.txt       (required for data refresh)"
echo "  ./subscriptions.json (required for data refresh)"
echo ""
echo "Run:"
echo "  DATABASE_PATH=./database/app.db ./$BINARY"
echo ""
echo "Cross-compile targets (add --target flag):"
echo "  Linux x64:   bun build --compile --target=bun-linux-x64 ..."
echo "  Linux arm64: bun build --compile --target=bun-linux-arm64 ..."
