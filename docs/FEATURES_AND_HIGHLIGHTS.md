# Features & Highlights

A comprehensive guide to the visual, audio, and interactive systems implemented in **We All Breathe the Same Air** (`Capacitor_Apps/app-room/`).

---

## 1. Flat 2D Room in Three.js (`app.js`)

- **True Flat 2D Presentation:** Built in Three.js with an `OrthographicCamera` over a `1920 × 1080` stage (`stageGroup`) with zero 2.5D camera parallax, matching the exact framing and artwork of `We All Breathe the Same Air-DEF 2`.
- **Prologue & In-Room Character Beats:**
  - **Prologue (`Sam`):** Sam sits on the lower bunk; clicking him plays `standup` with foley footsteps and transitions into his breathing `idle` loop in the sunbeam.
  - **Chapter 1 (`Passport` · Schiphol):** Clicking the passport on the foreground table triggers Sam's `think` reaction clip + caption before zooming through the passport silhouette into Chapter 1.
  - **Chapter 2 (`Photo` · The Asylum Centre):** Clicking the framed photo hides the tabletop prop while Sam picks it up (`frame` clip), then transitions into Chapter 2.
  - **Chapter 3 (`Bike` · Amsterdam):** Clicking the bicycle triggers Sam's `bike` clip (with fluttering banknotes on the foreground table) -> Chapter 3 -> returning to the room plays Sam's `money` counting beat (`countMoney` animated bills).
  - **Chapter 4 (`Letter` · The Letter):** Clicking the rolled notice on the left brick wall unrolls the rejection poster (`unrollPoster`) and plays Sam's `sad` clip -> Chapter 4 -> returning after all 4 chapters triggers the **Dove Window Cinematic (`birdCine`)** and **Finale (`playFinale`)** ending on *The End* card.
- **Living Room Atmosphere & Time Progression:**
  - **Volumetric Sunbeams (`raysA` / `raysB`):** Dual breathing light-ray planes blended with custom screen-blend GLSL shaders that shift angle and warmth as day turns to dusk.
  - **3D-Lit Dust Motes:** `THREE.Points` particle system with vortex physics, Sam motion turbulence, and sunbeam glint illumination.
  - **Blackboard & Desk Stack:** Dynamic `CanvasTexture` planes where chalk Dutch lessons (`School b...`) and stamped envelopes/forms accumulate across chapters.
  - **Ambient Dove:** Occasional wing-flap clip (`pigeon`) on the bedpost prior to the Chapter 4 finale.

---

## 2. Interactive Video Chapter Player (`chapters/` + `shared.js`)

- **Three.js Silhouette Mask Transition:** Clicking an unlocked room object extracts its alpha silhouette from the Three.js scene via an offscreen `WebGLRenderTarget` and expands it smoothly into the full-screen interactive chapter iframe (`Hoofdstuk_1..4`).
- **Auto-Hiding Video Controls:**
  - Lower playback bar (`#play`, `#tl` timeline + markers, `#time`, and `#cc`) starts **hidden** during video playback, fades in on tap/click, and auto-hides after **3 seconds** of inactivity.
- **Custom Subtitle Toggle:**
  - SVG monitor icon with subtitle bars (`SUBLANG = "nl"`).
- **Audio Handoff:**
  - Room ambient soundscape (`amb_room.mp3`) fades out smoothly when entering an interactive video chapter and fades back in upon returning to the room.

---

## 3. Dev Mode vs. Store Production Mode

A single flag at the top of `Capacitor_Apps/app-room/www/shared/shared.js` controls development tools vs. store-ready presentation:

```javascript
// Located at the top of Capacitor_Apps/app-room/www/shared/shared.js:
const DEV_DEFAULT = true; // Set to false before building for App Store / Google Play
```

| Element | `DEV_MODE = true` (Testing) | `DEV_MODE = false` (Production) |
| :--- | :--- | :--- |
| **Room Top Bar** | `We All Breathe the Same Air · The Room`, 4 progress dots, reset `↺` button | **Hidden** |
| **Room Bottom Hint** | `keys 1–4: toggle chapter · 0: reset` | **Hidden** |
| **Chapter Tracking** | Dots in top bar | **4 Minimalist SVG Icons (passport, photo frame, bicycle, letter)** in top-right |
| **Chapter Back Button**| `← Back to the room` button | **Hidden** |
| **Assignment Skip** | `Skip ›` button displayed | **Never shown** |
| **URL Testing Override**| Add `?dev=1` to force on | Add `?dev=0` to preview production mode |
