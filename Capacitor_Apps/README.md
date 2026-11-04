# Like Dust Part 2 · Capacitor Apps

Two standalone Capacitor apps (Web + iOS + Android) built from your web variations and the four interactive video chapters:

1. **`app-v1-herinneringskamer/`** (`com.likedust.herinneringskamer`)
   - 2.5D painted room (*room 2.psd* layers in Three.js with chalk/ink wash shaders)
   - Touch-drag 2.5D parallax with smooth inertia + landscape lock + inline unmuted chapter video playback

2. **`app-v2-zolderkamer/`** (`com.likedust.zolderkamer`)
   - 3D toon-shaded attic room (*Room.png* briefing design with trembling marker/hatching post-processing)
   - One-finger 3D touch-panning with inertia + landscape lock + inline unmuted chapter video playback

## Structure (per app)
- `www/` — Standalone web app (can also be deployed directly to Netlify / static hosting)
- `ios/` — Native iOS Xcode project (Swift Package Manager, no CocoaPods needed)
- `android/` — Native Android Studio project

## Local `www` Server Dashboard
From the **project root**, double-click **`Start_Dashboard.command`** in Finder (or run `python3 start_dashboard.py`) to start both `www/` servers and open the dashboard:
- **Dashboard (status + Start / Restart / Stop):** http://localhost:8770/
- **Room 1 — Herinneringskamer (`www`):** http://localhost:8771/
- **Room 2 — Zolderkamer (`www`):** http://localhost:8772/

## Store / Production Release Checklist (`DEV_MODE`)
> **IMPORTANT — Before building for the App Store, Google Play, or live `www` deployment:**
> Set `const DEV_DEFAULT = false;` at the top of `www/shared/shared.js` in **both** apps (and `Kamer_Variaties/shared/shared.js`), then run `npm run sync` inside each app folder.

- **`DEV_DEFAULT = true` (current testing default):**
  - Shows the room top dev bar (`DE KAMER · ...`, 4 progress dots, `↺` reset button) and `toets 1–4: hoofdstuk als gezien · 0: wissen`.
  - Shows `← Terug naar de kamer` inside video chapters.
  - Shows `Skip ›` during chapter assignments/markers.
- **`DEV_DEFAULT = false` (Store / Production mode):**
  - Replaces the dev bar and dots with the **4 chapter icons** in the top-right (**passport, bicycle, bird, letter**).
  - Hides `← Terug naar de kamer` and **never** shows `Skip ›` on chapter assignments.
- **Quick browser preview tip:** Append `?dev=0` (production UI) or `?dev=1` (dev UI) to any room URL to preview either mode without editing files.

## Development Commands (inside either app directory)
```bash
# Sync web changes into iOS and Android projects
npm run sync

# Open in Xcode
npm run open:ios

# Open in Android Studio
npm run open:android
```

