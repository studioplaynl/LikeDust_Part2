# Like Dust Part 2 · Rooms `www` Server & Dashboard

Local launcher and status dashboard for previewing the two standalone room builds (`www/`) packaged inside `Capacitor_Apps/` for Web, iOS, and Android.

## Quick Start

From the root of the project, either:

1. **Double-click `Start_Dashboard.command` in Finder**, or
2. **Run from Terminal:**
   ```bash
   ./Start_Dashboard.command
   # or directly:
   python3 start_dashboard.py
   ```

This starts the local `www` servers and automatically opens the **Dashboard** page in your browser.

---

## Local URLs & Ports

| Service | URL | Folder Served |
| :--- | :--- | :--- |
| **Dashboard (Status + Start / Restart / Stop)** | http://localhost:8770/ | Built into `start_dashboard.py` |
| **Room 1 — Herinneringskamer (`www`)** | http://localhost:8771/ | `Capacitor_Apps/app-v1-herinneringskamer/www/` |
| **Room 2 — Zolderkamer (`www`)** | http://localhost:8772/ | `Capacitor_Apps/app-v2-zolderkamer/www/` |

### Why Does the Dashboard Use a Tiny Python Process?
Browsers block plain `file://` HTML files from starting or restarting local server processes on your Mac. Running `start_dashboard.py` (on port `8770`) allows the **Start Server**, **Restart Server**, and **Stop** buttons inside the browser dashboard to control the `www` servers (`8771` & `8772`), while also providing:
- Separate ports per room so `localStorage` progress stays isolated (matching the two standalone iOS/Android apps).
- HTTP `206 Partial Content` byte-range streaming so Safari plays the interactive `.mp4` chapter videos smoothly with sound.

---

## Checking Server Status

- **In the browser:** Open http://localhost:8770/ — polls ports `8771` and `8772` every 2 seconds and displays live `Server Running` / `Server Stopped` status, PID, and uptime.
- **In Terminal:**
  ```bash
  lsof -iTCP:8770-8772 -sTCP:LISTEN -P -n
  ```
- **Stopping everything:** Click **Stop** in the Dashboard to stop only the `www` servers, or press `Ctrl+C` (or close the `Start_Dashboard.command` Terminal window) to shut down both the Dashboard and `www` servers.

---

## Syncing `www` Changes to iOS & Android

Once built into Xcode / Android Studio, the native mobile apps bundle their own internal copy of `www/` (they do not require your Mac server to run on a phone). After editing files inside either `www/` folder, sync them into the native projects:

```bash
# Room 1: Herinneringskamer
cd Capacitor_Apps/app-v1-herinneringskamer
npm run sync
npm run open:ios      # Xcode
npm run open:android  # Android Studio

# Room 2: Zolderkamer
cd Capacitor_Apps/app-v2-zolderkamer
npm run sync
npm run open:ios
npm run open:android
```

