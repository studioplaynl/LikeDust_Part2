#!/bin/bash
# Double-click to build dist_pages/ and publish directly to Cloudflare Pages.
cd "$(dirname "$0")" || exit 1

echo "============================================================"
echo " Building Like Dust Part 2 static Cloudflare Pages package..."
echo "============================================================"
python3 build_cloudflare_pages.py || exit 1

echo ""
echo "============================================================"
echo " Deploying to Cloudflare Pages..."
echo "============================================================"
echo "If this is your first time, Wrangler will open your browser"
echo "to log in to Cloudflare and select your account."
echo "------------------------------------------------------------"

npx --yes wrangler pages deploy dist_pages --project-name=maartenvanderglas-com --branch=main --commit-dirty=true

echo ""
echo "============================================================"
echo " Live review dashboard URL:"
echo " https://maartenvanderglas-com-2hv.pages.dev"
echo "============================================================"

