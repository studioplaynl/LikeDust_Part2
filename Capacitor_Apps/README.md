# We All Breathe the Same Air · Capacitor App

Unified Capacitor 7 application (Web + iOS + Android) combining the flat 2D room rendered in Three.js (`We All Breathe the Same Air-DEF 2`) with the four interactive video chapters (`Hoofdstuk 1–4`):

- **`app-room/`** (`com.likedust.wabtsa` · *We All Breathe the Same Air*)
  - Flat 2D painted room (`1920 × 1080` orthographic stage in Three.js, zero 2.5D parallax distortion)
  - Sam's chroma-keyed video clips on desktop & WebP sprite sheets on mobile (`LITE`)
  - Dynamic volumetric sunbeams, floating dust motes, blackboard chalk progression, growing desk letter stack, evening sunset progression, and dove window finale
  - Object silhouette mask transitions into all 4 interactive video chapters (`Schiphol`, `The AZC`, `Amsterdam`, `The Letter`)
  - Landscape lock + inline unmuted chapter video playback on iOS & Android

*(Earlier 2.5D/3D room prototypes `app-v1-herinneringskamer` and `app-v2-zolderkamer` have been moved to `../archive/Capacitor_Apps/`.)*

## Structure (`app-room/`)
- `www/` — Standalone web app (also packaged into `dist_pages/room/` for Cloudflare Pages / static hosting)
- `ios/` — Native iOS Xcode project (Swift Package Manager, no CocoaPods needed)
- `android/` — Native Android Studio project

## Local `www` Server Dashboard
From the **project root**, double-click **`Start_Dashboard.command`** in Finder (or run `python3 start_dashboard.py`) to start the `www/` server and open the dashboard:
- **Dashboard (status + Start / Restart / Stop):** http://localhost:8770/
- **We All Breathe the Same Air (`www`):** http://localhost:8771/

## Store / Production Release Checklist (`DEV_MODE`)
> **IMPORTANT — Before building for the App Store, Google Play, or final public deployment:**
> Set `const DEV_DEFAULT = false;` at the top of `Capacitor_Apps/app-room/www/shared/shared.js`, then run `npm run sync` inside `Capacitor_Apps/app-room` (and `python3 build_cloudflare_pages.py` for web).

- **`DEV_DEFAULT = true` (current testing default):**
  - Shows the room top dev bar (`We All Breathe the Same Air · The Room`, 4 progress dots, `↺` reset button) and `keys 1–4: toggle chapter · 0: reset`.
  - Shows `← Back to the room` inside video chapters.
  - Shows `Skip ›` during chapter assignments/markers.
- **`DEV_DEFAULT = false` (Store / Production mode):**
  - Replaces the dev bar and dots with the **4 chapter icons** in the top-right (**passport, photo frame, bicycle, letter**).
  - Hides `← Back to the room` and **never** shows `Skip ›` on chapter assignments.
- **Quick browser preview tip:** Append `?dev=0` (production UI) or `?dev=1` (dev UI) to `http://localhost:8771/` to preview either mode without editing files.

## Development Commands (inside `Capacitor_Apps/app-room/`)
```bash
# Sync web changes into iOS and Android projects
npm run sync

# Open in Xcode
npm run open:ios

# Open in Android Studio
npm run open:android
```
