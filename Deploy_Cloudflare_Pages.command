#!/bin/bash
# Double-click to publish Capacitor_Apps/app-room/www/ directly to Cloudflare Pages.
cd "$(dirname "$0")" || exit 1

SRC_DIR="Capacitor_Apps/app-room/www"
PROJECT_NAME="thesameair-nl"
export CLOUDFLARE_ACCOUNT_ID="999dfbc0acea859e9b839579714ca5d6"

if [ ! -d "$SRC_DIR" ]; then
  echo "Error: $SRC_DIR not found."
  exit 1
fi

STAGE_DIR="$(mktemp -d /tmp/thesameair_www.XXXXXX)"
cleanup() {
  rm -rf "$STAGE_DIR"
}
trap cleanup EXIT

echo "============================================================"
echo " Staging $SRC_DIR (excluding .DS_Store)..."
echo "============================================================"
rsync -a --exclude='.DS_Store' --exclude='__pycache__' --exclude='*.pyc' "$SRC_DIR/" "$STAGE_DIR/" || exit 1

echo ""
echo "============================================================"
echo " Deploying to Cloudflare Pages ($PROJECT_NAME)..."
echo "============================================================"
echo "Account ID: $CLOUDFLARE_ACCOUNT_ID (Maartenvanderglas...)"
echo "If auth fails, run: npx wrangler logout && npx wrangler login"
echo "------------------------------------------------------------"

npx --yes wrangler pages deploy "$STAGE_DIR" \
  --project-name="$PROJECT_NAME" \
  --branch=main \
  --commit-dirty=true || exit 1

echo ""
echo "============================================================"
echo " Live site URLs:"
echo " https://thesameair-nl.pages.dev"
echo " https://thesameair.nl (once Custom Domain is attached)"
echo "============================================================"

