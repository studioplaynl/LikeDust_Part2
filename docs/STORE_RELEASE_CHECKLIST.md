# Store Release Checklist

Before submitting **We All Breathe the Same Air** to the **Apple App Store**, **Google Play Store**, or publishing to live web hosting, follow this checklist.

---

## 1. Disable Development Mode

In `Capacitor_Apps/app-room/www/room/shared/shared.js`, set `DEV_DEFAULT = false`:

```javascript
// File: Capacitor_Apps/app-room/www/room/shared/shared.js
const DEV_DEFAULT = false;
```

This ensures:
- Dev HUD bar (`We All Breathe the Same Air · The Room` and progress dots) is hidden.
- Chapter progress is displayed cleanly via the **4 top-right icons (passport, photo frame, bicycle, letter)**.
- `Skip ›` button during chapter assignments is completely removed.
- Dev keyboard shortcuts (`1–4` to toggle chapters, `0` to reset) are disabled.

---

## 2. Sync Web Assets to Native Projects

After making any changes in `www/`, sync them into the native iOS and Android projects:

```bash
cd Capacitor_Apps/app-room
npm run sync
```

---

## 3. iOS App Store Build (Xcode)

1. Open project in Xcode:
   ```bash
   cd Capacitor_Apps/app-room
   npm run open:ios
   ```
2. Verify **Signing & Capabilities**:
   - Ensure your Apple Developer Team is selected.
   - Bundle Identifier: `com.likedust.wabtsa`.
3. Set Build Version and Number under **General > Identity**.
4. Select `Any iOS Device (arm64)` as build destination.
5. In menu bar: **Product > Archive**.
6. When Organizer opens, click **Distribute App** to upload to App Store Connect / TestFlight.

---

## 4. Google Play Store Build (Android)

- **Play Console app:** *We All Breathe the Same Air* (StudioPlay NL account)
- **applicationId / namespace:** `nl.thesameair.app` (Android only — iOS keeps `com.likedust.wabtsa`). Permanent once uploaded.
- **Launcher name:** *The Same Air* (`android/app/src/main/res/values/strings.xml`)
- **Upload key:** `~/AndroidKeys/the-same-air/upload-keystore.jks` + `keystore.properties` (outside the repo — back both up; Play App Signing holds the real app signing key, so a lost upload key can be reset via Play support).

1. Bump `versionCode` (must increase every upload) and `versionName` in `android/app/build.gradle`.
2. Build the signed bundle from the command line:
   ```bash
   cd Capacitor_Apps/app-room
   npx cap sync android
   cd android && ./gradlew bundleRelease
   ```
   Output: `android/app/build/outputs/bundle/release/app-release.aab` (signing is picked up automatically from `keystore.properties`).
3. Upload the `.aab` in Play Console → *Test and release* → Internal testing (or Production).

## 5. Web Deployment (Cloudflare Pages)

1. Deploy `Capacitor_Apps/app-room/www/` directly to the live root (`https://thesameair.nl` / `https://thesameair-nl.pages.dev`) by double-clicking or running:
   ```bash
   ./Deploy_Cloudflare_Pages.command
   ```
   This publishes `www/index.html` (`Doors`) at `/`, `www/intro/` at `/intro/`, and `www/room/` at `/room/` (the local review dashboard remains local-only via `start_dashboard.py`).
2. Or, if you need a local static `dist_pages/` folder first, run:
   ```bash
   python3 build_cloudflare_pages.py
   ```
   and deploy `dist_pages/` (`dist_pages/index.html` landing page + `intro/` + `room/`) to the `thesameair-nl` Cloudflare Pages project via Wrangler.
