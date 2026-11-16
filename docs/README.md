# Like Dust Part 2 · Documentation

Welcome to the technical and design documentation for **Like Dust Part 2 ("We All Breathe The Same Air · De Kamer")**.

This interactive video-comic experience is built as a single unified codebase targeting **Web (`www`)**, **iOS (Swift Package Manager)**, and **Android** using **Capacitor 7**.

---

## Documentation Index

1. [**Architecture & Overview**](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/docs/ARCHITECTURE.md)
   - Multi-platform strategy (Web + iOS + Android from one codebase).
   - Project structure and file layout (`index.html` landing + pre-room stage, `intro/`, `room/`).
   - Native iOS & Android bridge configurations.

2. [**Features & Highlights**](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/docs/FEATURES_AND_HIGHLIGHTS.md)
   - Landing page & unified pre-room `#stage` (intro video + airport window).
   - Flat 2D Three.js room (`app.js`) with sunbeam progression, dust motes, chalk blackboard, and letter stack.
   - Interactive chapter player (`Hoofdstuk_1..4`) with auto-hiding controls and subtitle toggle.
   - Dev Mode vs. Store Production Mode (`DEV_DEFAULT`).

3. [**URL Routing, Shareable Links & Subpages**](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/docs/URL_ROUTING_AND_SUBPAGES.md)
   - Pre-room stage hashes (`#intro`, `#window`) and `?dev=0` / `?dev=1` flag preservation.
   - Direct chapter sharing (`#ch=1..4` or `?ch=1..4`).
   - Deep-linking and browser Back/Forward history support.
   - Subpages system (`#page=about`, `#credits`, modal dialogs).

4. [**Store Release Checklist**](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/docs/STORE_RELEASE_CHECKLIST.md)
   - Steps to prepare for Apple App Store and Google Play releases.
   - Toggling `DEV_DEFAULT = false` in `www/room/shared/shared.js`.
   - Building and deploying to Cloudflare Pages.

---

## Quick Reference Commands

```bash
# Start local review dashboard & room server:
./Start_Dashboard.command
# or: python3 start_dashboard.py

# Package and prepare static review build for Cloudflare Pages:
python3 build_cloudflare_pages.py
# or: ./Deploy_Cloudflare_Pages.command

# Inside the unified Capacitor app (Capacitor_Apps/app-room):
npm run sync           # Copies www/ assets into ios/ and android/
npm run open:ios       # Opens in Xcode
npm run open:android   # Opens in Android Studio
```

