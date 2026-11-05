# Features & Highlights

A comprehensive guide to the visual, audio, and interactive systems implemented in Like Dust Part 2.

---

## 1. Zolderkamer (Room 2 · 3D Attic)

- **Edge-to-Edge Clarity (No Vignette):** The camera vignette in the post-processing shader was removed to allow crisp, clear, full-bleed visuals on all displays.
- **Camera Staging Beside the Chair:**
  - Positioned beside an open-slatted wooden chair (`x = 0.58, y = 1.22, z = -0.58`), directing the player's eye naturally toward the desk, desk lamp, and starry window.
  - Generous asymmetric camera pan range (`[-1.48, +0.34]`) allowing wide sweeps across the room to the left.
- **Narrative Object Progression (Leftward Arc):**
  - **Chapter 1 (`Het paspoort`):** Lies directly on the wooden desk beneath the warm glow of the desk lamp with golden emblem detailing.
  - **Chapter 2 (`De telefoon`):** Positioned to the left of the desk on the chest of drawers.
  - **Chapter 3 (`De duif`):** Positioned further left on a wooden corner stool.
  - **Chapter 4 (`De brief`):** Positioned along the left blue slope wall on a low bedside table.
- **Time-of-Day Lighting Progression:**
  - **0 (Night Start):** Deep blue night sky (`#060d22` / `#14264e`) with twinkling stars and crescent moon outside the window; warm, intimate desk lamp illuminated (`PointLight #ffc466`).
  - **1 (Late Night):** Stars continue to shine; ambient light gently cools.
  - **2 (Pre-dawn):** Stars begin to fade; subtle blue pre-dawn glow enters the room.
  - **3 (Dawn):** Golden sunrise tints the horizon; desk lamp dims.
  - **4 (Story Completed · Bright Morning):** Radiant morning sky (`#8ed0ff` / `#fff9e8`) with bright warm sunlight pouring through the window, desk lamp completely extinguished, and window circled for the ending sequence.

---

## 2. Herinneringskamer (Room 1 · 2.5D Painted PSD)

- **Photoshop Layer Separation:** Rebuilt the painted room from layered artwork (`room 2.psd`) into depth planes (`z: 0.0` to `z: 3.0`).
- **Stylized Shaders:** Custom GLSL shaders render dynamic ink hatching, pencil edges, watercolor bleed washes, and ambient paper textures.
- **Mobile Touch Parallax:** One-finger touch dragging translates across 2.5D depth layers with inertia.

---

## 3. Interactive Video Chapter Player

- **SVG Silhouette Transition:** When a player clicks or taps an active item in the room, the camera approaches the item, cuts an exact silhouette contour mask of the 3D geometry, and expands it seamlessly into the full-screen video chapter.
- **Auto-Hiding Video Controls:**
  - Lower playback bar (`#play`, `#tl` timeline + markers, `#time`, and `#cc`) starts **hidden** during video playback.
  - Clicking or tapping anywhere on the video pane smoothly fades the controls in.
  - Controls auto-hide after **3 seconds** of user inactivity, or hide immediately upon tapping the pane again or entering an interaction.
- **Custom Subtitle Toggle:**
  - Replaced the previous `CC` text button with a custom SVG monitor icon with subtitle bars (play triangle removed).
  - Subtitles are locked strictly to Dutch (`SUBLANG = "nl"`).
- **Cleaned UI:**
  - Removed top-left chapter title label (`.chap`) for an immersive cinematic presentation.
  - Removed unnecessary UI items: `Read as comic`, `Restart`, and subtitle language dropdowns.
  - Desktop `Full screen` button positioned in the top-right on web (hidden in native Capacitor apps).

---

## 4. Dev Mode vs. Store Production Mode

A single flag controls development tools vs. store-ready presentation:

```javascript
// Located at the top of shared.js:
const DEV_DEFAULT = true; // Set to false before building for App Store / Google Play
```

| Element | `DEV_MODE = true` (Testing) | `DEV_MODE = false` (Production) |
| :--- | :--- | :--- |
| **Room Top Bar** | Room name, 4 progress dots, reset `↺` button | **Hidden** |
| **Room Bottom Hint** | `toets 1–4: hoofdstuk als gezien · 0: wissen` | **Hidden** |
| **Chapter Tracking** | Dots in top bar | **4 Minimalist SVG Icons (passport, bicycle, bird, letter)** in top-right |
| **Chapter Back Button**| `← Terug naar de kamer` button | **Hidden** |
| **Assignment Skip** | `Skip ›` button displayed | **Never shown** |
| **URL Testing Override**| Add `?dev=1` to force on | Add `?dev=0` to preview production mode |

---

## 5. Audio & Volume Control

- Completely removed the `Geluid aan` toggle button.
- Native device hardware volume controls playback volume across the entire experience.

