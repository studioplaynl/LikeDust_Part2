# Features & Highlights

A comprehensive guide to the visual, audio, and interactive systems in **We All Breathe the Same Air** (`Capacitor_Apps/app-room/`).

For shared project terminology (`Doors`, `Window Scene`, `The Room`, `SamPose`, `Chapters`, `Moments`), see [**Shared Terminology, States & Flow Map**](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/docs/TERMINOLOGY_AND_STATE_MAP.md) and [**GLOSSARY.md**](file:///Users/maarten/Github_may_be_deleted/LikeDust_Part2/GLOSSARY.md).

---

## 1. Landing Page (`Doors`) & Pre-Room Stage (`index.html` & `intro/index.html`)

- **Two-Book `Doors` (`www/index.html`):** Full-viewport split hero for **Part 2 (*We All Breathe The Same Air*)** and **Part 1 (*Like Dust*)** with drifting dust particles (`<canvas id="dust">`), silent autoplaying background video loops (`muted` + `playsinline`) across both desktop and mobile (with seamless poster fallback in iOS Low Power Mode so native WebKit play overlays never appear), and safe-area + short-landscape responsive layout.
- **Unified `#stage` Overlay (`Intro Film` → `Window Scene` → `#begin`):**
  - Tapping **Start** opens `#stage` and starts `vid/intro.mp4` synchronously inside the user gesture with auto-hiding player controls.
  - After the **Intro Film** (or **Skip ›**), the **Window Scene** (`#scene`) shows adult Sam looking at the airport window (`reflect.jpg`) while his seventeen-year-old reflection (`young-silhouette.png`) flickers organically in the glass alongside synthesized WebAudio terminal ambience (room tone, fluorescent hum, rain on glass, distant jet).
  - Clicking **young Sam** fades to black (`#begin`) and navigates into `room/index.html`; pressing Browser Back returns cleanly to `#window`.

---

## 2. Flat 2D Room in Three.js (`The Room` · `room/app.js`)

- **True Flat 2D Presentation:** Built in Three.js with an `OrthographicCamera` over a `1920 × 1080` stage (`stageGroup`) with zero 2.5D camera parallax, preserving exact artist framing.
- **Sam's Poses (`SamPose` — Begin, Think Pose, End):**
  - **Opening (`Sitting Pose` → `Stand-Up`):** Sam starts sitting quietly on the lower bunk; clicking him plays his single opening animation (`standup` `0s → 1.83s`) with footsteps as he steps into the sunbeam.
  - **Middle (`Think Pose`):** Throughout Chapters 1–4, Sam holds his calm, continuous standing **Think Pose** (`idle.webp`, hand on chin) in the sunbeam. Clicking any unlocked **Chapter Object** (*Passport*, *Photo Frame*, *Bicycle*, *Rejection Letter*) transitions cleanly via a black fade into that Chapter without intermediate object-pickup or counting animations.
  - **Closing (`Finale`: `Window Gaze` → `Dove` Flight → *The End*):** After all 4 Chapters are seen, Sam turns to look out the barred window (`standup` `1.83s → 5.08s`), the **Dove** flies out through the window (`birdout.mp4`), Sam fades out, and the camera slowly zooms toward the window into *The End* card.
- **Living Room Atmosphere & Progressive Props:**
  - **Progressive Room Props:** Alongside the 4 **Chapter Objects** (*Passport*, *Photo Frame*, *Bicycle*, *Rejection Letter*), `money.png` appears quietly on the foreground table with Chapter 3, and the wall letter transitions cleanly between `reject_rolled.png` (unlocked) and `reject_open.png` (seen) without intermediate object animations.
  - **Volumetric Sunbeams (`raysA` / `raysB`):** Dual breathing light-ray planes blended with custom screen-blend GLSL shaders that shift angle and warmth as afternoon turns to evening across the 4 Chapters.
  - **3D-Lit Dust Motes:** `THREE.Points` particle system with vortex physics and sunbeam glint illumination.
  - **Blackboard & Desk Stack:** Dynamic `CanvasTexture` planes where chalk Dutch lessons and stamped envelopes/forms accumulate across Chapters.
  - **Ambient Dove:** Occasional wing-flap on the bedpost prior to the Chapter 4 Finale.

---

## 3. Interactive Video Chapters (`room/chapters/` + `room/shared/`)

- **Clean Fade & Deterministic Audio Handoff (`0.5s` Room Fade-Out → `1.0s` Video Fade-In):** Clicking an unlocked **Chapter Object** plays its click SFX (`rustle`, `pickup`, `bell`, `cloth`), immediately cancels any pending room audio timers (footsteps, chirps, chalk, letter-stack rustles), and fades all active room audio (`roomBus` master gain, `amb_room.mp3`, and any in-progress foley such as `standup2.mp3`) to `0` in `0.5s` (`500ms`) alongside the black visual fade-in. Once the `0.5s` fade completes, the interactive **Chapter** (`Hoofdstuk_1..4`) opens and fades in its video audio over `1.0s` (`1000ms`). Upon returning to **The Room**, room ambience and time progression (`timeProgression`) resume cleanly.
- **Interactive `Moments`:** Each Chapter film pauses at key story **Moments** (such as holding your breath at passport control, rubbing the **Cell Wall**, or receiving the **Yellow Card**) where the viewer acts on the frozen frame before the film continues.
- **Auto-Hiding Video Controls:** Lower playback bar (`#play`, `#tl` timeline + Moment markers, `#time`, and optional `#cc` subtitle toggle) starts hidden during playback, fades in on tap/click, and auto-hides after 3 seconds of inactivity.
- **Unified Multi-Language Support (`en` · `nl` · `fa`):**
  - Global language switcher (`EN · NL · فارسی`, defaulting to `EN` with `?lang=nl|fa` URL support).
  - When **English (`en`)** is selected, video overlay **Subtitles** are off and `#cc` is hidden because **Burned-in English** text is already part of the films.
  - When **Dutch (`nl`)** or **Farsi (`fa`, RTL + offline-bundled `Vazirmatn`)** is selected, UI text, **Sam's Voice**, **Action Prompts**, and film **Subtitles** all switch together via `www/i18n/{en,nl,fa}.json` — with **Subtitles** turned **on by default** and toggleable via the `#cc` button.

---

## 4. Dev Mode vs. Store Production Mode

A single flag at the top of `Capacitor_Apps/app-room/www/room/shared/shared.js` controls development tools vs. store-ready presentation:

```javascript
// Located at the top of Capacitor_Apps/app-room/www/room/shared/shared.js:
const DEV_DEFAULT = false; // Production default (override on web with ?dev=1 or ?dev=0)
```

| Element | `DEV_MODE = true` (Testing) | `DEV_MODE = false` (Production) |
| :--- | :--- | :--- |
| **Room Top Bar** | `← Home` + 4 progress dots | **Hidden** |
| **Keyboard Shortcuts** | `keys 1–4: toggle chapter · 0: reset` | **Disabled** |
| **Chapter Tracking** | Dots in top bar | **4 Minimalist SVG Icons (passport, photo frame, bicycle, letter)** in top-right |
| **Chapter Back Button**| `← Back to room` top-left in video overlay menu | `← Back to room` top-left in video overlay menu |
| **URL Testing Override**| Add `?dev=1` to force on | Add `?dev=0` to preview production mode |
