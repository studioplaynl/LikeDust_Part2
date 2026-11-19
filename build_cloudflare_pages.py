#!/usr/bin/env python3
"""
Prepares the static directory ready for Cloudflare Pages deployment.

Target output directory: dist_pages/ (mirror of Capacitor_Apps/app-room/www/)
  ├── index.html   (Doors landing page + pre-room stage)
  ├── intro/       (Standalone intro + airport window route)
  └── room/        (We All Breathe the Same Air — Flat 2D Three.js Room + Video Chapters)

Note: The local review dashboard lives in start_dashboard.py (localhost:8770)
and is not included in the live Cloudflare Pages output.
"""

import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
CAPACITOR_DIR = ROOT_DIR / "Capacitor_Apps"
DIST_DIR = ROOT_DIR / "dist_pages"


def build_pages():
    print(f"Building Cloudflare Pages static root folder at: {DIST_DIR}")
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)

    room_src = CAPACITOR_DIR / "app-room" / "www"
    print(f"  → Copying {room_src.parent.name}/www to dist_pages/ ...")
    shutil.copytree(
        room_src,
        DIST_DIR,
        ignore=shutil.ignore_patterns(".DS_Store", "__pycache__", "*.pyc"),
    )
    print("  ✓ Created dist_pages/ (index.html, intro/, room/)")

    print("\n🎉 Build complete! Ready to deploy dist_pages/ to Cloudflare Pages.")


if __name__ == "__main__":
    build_pages()
