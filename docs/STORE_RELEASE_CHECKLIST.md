# Store Release Checklist

Before submitting **We All Breathe the Same Air** to the **Apple App Store**, **Google Play Store**, or publishing to live web hosting, follow this checklist.

---

## 1. Disable Development Mode

In `Capacitor_Apps/app-room/www/shared/shared.js`, set `DEV_DEFAULT = false`:

```javascript
// File: Capacitor_Apps/app-room/www/shared/shared.js
const DEV_DEFAULT = false;
```

This ensures:
- Dev HUD bar (`We All Breathe the Same Air · The Room` and progress dots) is hidden.
- Chapter progress is displayed cleanly via the **4 top-right icons (passport, photo frame, bicycle, letter)**.
- `← Back to the room` button inside chapters is hidden.
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

## 4. Google Play Store Build (Android Studio)

1. Open project in Android Studio:
   ```bash
   cd Capacitor_Apps/app-room
   npm run open:android
   ```
2. Verify `applicationId` (`com.likedust.wabtsa`), `versionCode`, and `versionName` in `android/app/build.gradle`.
3. In menu bar: **Build > Generate Signed Bundle / APK**.
4. Select **Android App Bundle (.aab)**.
5. Choose your release keystore, key alias, and passwords.
6. Select the `release` build variant and export.
7. Upload the `.aab` file to Google Play Console.

---

## 5. Web Deployment (Cloudflare Pages)

1. Run the packaging script:
   ```bash
   python3 build_cloudflare_pages.py
   # or double-click ./Deploy_Cloudflare_Pages.command
   ```
2. Deploy the generated `dist_pages/` directory (`dist_pages/index.html` dashboard + `dist_pages/room/` app) via Wrangler or git push to your Cloudflare Pages project.
