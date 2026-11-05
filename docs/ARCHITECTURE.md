# Architecture & Technical Overview

Like Dust Part 2 is an interactive digital video comic designed for seamless delivery across **Web browsers**, **Apple iOS**, and **Google Android**.

```
                           ┌────────────────────────┐
                           │    Single Codebase     │
                           │   (HTML5, Canvas,      │
                           │   Three.js, WebGL)     │
                           └───────────┬────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
   ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
   │    Web (www)    │        │  iOS Simulator  │        │ Android Device  │
   │ Cloudflare Pages│        │  & App Store    │        │  & Google Play  │
   │ / Netlify / CDN │        │ (Capacitor+SPM) │        │ (Capacitor+AGP) │
   └─────────────────┘        └─────────────────┘        └─────────────────┘
```

---

## 1. Directory Structure

| Directory | Purpose |
| :--- | :--- |
| **`Capacitor_Apps/`** | The two standalone production Capacitor 7 applications. |
| `├── app-v1-herinneringskamer/` | 2.5D Painted room app (`com.likedust.herinneringskamer`). |
| `│   ├── www/` | Web bundle: room Three.js script, shared styles, assets, and chapter 1–4 players. |
| `│   ├── ios/` | Native Xcode project using Swift Package Manager (no CocoaPods). |
| `│   └── android/` | Native Android Studio project with Java 21 & Android Gradle Plugin. |
| `└── app-v2-zolderkamer/` | 3D Toon-shaded attic room app (`com.likedust.zolderkamer`). |
| `    ├── www/` | Web bundle for Zolderkamer. |
| `    ├── ios/` | Native iOS project. |
| `    └── android/` | Native Android project. |
| **`All hoofdstuken met interactie 1-4/`** | Source files for the 4 interactive video chapters. |
| **`Kamer_Variaties/`** | Web prototypes and variation sandbox. |
| **`dist_pages/`** | Static output directory generated for Cloudflare Pages deployment. |
| **`docs/`** | Technical, architectural, and design documentation. |

---

## 2. Multi-Platform Strategy

Instead of maintaining separate codebases in Unity, Flutter, and Web, the project leverages **Capacitor 7** to wrap standard modern web technologies:

1. **Exact 1:1 Rendering Parity:** Every animation, Three.js shader, SVG effect, and video transition runs with the identical WebGL pipeline on Web, iOS, and Android.
2. **Zero Framework Bloat:** No external heavy runtime dependencies (React, Vue, etc.)—plain Vanilla JavaScript, Three.js r128, and custom GLSL fragment shaders.
3. **Instant Web Distribution:** The `www/` folder of either app can be copied directly to any static web host or CDN.

---

## 3. Native iOS Configuration

- **Package Manager:** Swift Package Manager (`CapApp-SPM`) — avoids CocoaPods completely.
- **Deployment Target:** `IPHONEOS_DEPLOYMENT_TARGET = 16.0`.
- **Custom View Controller (`RoomBridgeViewController` in `AppDelegate.swift`):**
  - **Inline Media Playback:** Sets `allowsInlineMediaPlayback = true` on `WKWebViewConfiguration` so videos play inline inside the silhouette mask without iOS fullscreen QuickTime takeover.
  - **Unmuted Autoplay:** Sets `mediaTypesRequiringUserActionForPlayback = []` allowing audio without forced initial tap gates.
  - **Status & Navigation Bar:** Hides status bar and home indicator indicator (`prefersStatusBarHidden = true`, `prefersHomeIndicatorAutoHidden = true`).
  - **Orientation:** Strict landscape locking (`UIInterfaceOrientationMask.landscape`).

---

## 4. Native Android Configuration

- **Java & Gradle:** Configured with OpenJDK 21 via `android/gradle.properties` (`org.gradle.java.home`).
- **Android SDK:** Configured in `android/local.properties` (`sdk.dir`).
- **Window & System Bars (`MainActivity.java`):**
  - Sticky immersive mode using `WindowInsetsControllerCompat` to hide navigation and status bars.
  - `#000000` window background in `styles.xml` to prevent white flashes during app launch.
  - `setMediaPlaybackRequiresUserGesture(false)` on `WebSettings` for unmuted video playback.
  - Sensor landscape lock (`sensorLandscape` in `AndroidManifest.xml`).

