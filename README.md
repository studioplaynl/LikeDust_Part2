# We All Breathe the Same Air · Room `www` Server & Dashboard

Local launcher and status dashboard for previewing the unified flat 2D Three.js room + 4 interactive video chapters (`Capacitor_Apps/app-room/www/`) packaged for Web, Cloudflare Pages, iOS, and Android.

## Quick Start

From the root of the project, either:

1. **Double-click `Start_Dashboard.command` in Finder**, or
2. **Run from Terminal:**
   ```bash
   ./Start_Dashboard.command
   # or directly:
   python3 start_dashboard.py
   ```

This starts the local `www` server and automatically opens the **Dashboard** page in your browser.

---

## Local URLs & Ports

| Service | URL | Folder Served |
| :--- | :--- | :--- |
| **Dashboard (Status + Start / Restart / Stop)** | http://localhost:8770/ | Built into `start_dashboard.py` |
| **We All Breathe the Same Air (`www`)** | http://localhost:8771/ | `Capacitor_Apps/app-room/www/` |

### Why Does the Dashboard Use a Tiny Python Process?
Browsers block plain `file://` HTML files from starting or restarting local server processes on your Mac. Running `start_dashboard.py` (on port `8770`) allows the **Start Server**, **Restart Server**, and **Stop** buttons inside the browser dashboard to control the `www` server (`8771`), while also providing:
- Dedicated `localhost:8771` origin for `localStorage` chapter progression (`ld2-room-main`).
- HTTP `206 Partial Content` byte-range streaming so Safari plays Sam's clips and the interactive `.mp4` chapter videos smoothly with sound.

---

## Checking Server Status

- **In the browser:** Open http://localhost:8770/ — polls port `8771` every 2 seconds and displays live `Server Running` / `Server Stopped` status, PID, and uptime.
- **In Terminal:**
  ```bash
  lsof -iTCP:8770-8771 -sTCP:LISTEN -P -n
  ```
- **Stopping everything:** Click **Stop** in the Dashboard to stop only the `www` server, or press `Ctrl+C` (or close the `Start_Dashboard.command` Terminal window) to shut down both the Dashboard and `www` server.

---

## Syncing `www` Changes to iOS & Android

Once built into Xcode / Android Studio, the native mobile apps bundle their own internal copy of `www/` (they do not require your Mac server to run on a phone). After editing files inside `Capacitor_Apps/app-room/www/`, sync them into the native projects:

```bash
cd Capacitor_Apps/app-room
npm run sync
npm run open:ios      # Xcode
npm run open:android  # Android Studio
```

---

## Archived Earlier Prototypes

Earlier 2.5D/3D room variations are preserved in [`archive/`](archive/):
- `archive/Capacitor_Apps/app-v1-herinneringskamer/`
- `archive/Capacitor_Apps/app-v2-zolderkamer/`
- `archive/Kamer_Variaties/`

---

## Documentation

Full technical, architectural, and design documentation is available in the [`docs/`](docs/) directory:

- [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md): Multi-platform strategy, Three.js flat 2D pipeline, Capacitor 7 native bridges, and directory layout.
- [**docs/FEATURES_AND_HIGHLIGHTS.md**](docs/FEATURES_AND_HIGHLIGHTS.md): Detailed breakdown of the flat 2D Three.js room, Sam's clips, chapter player, and Dev Mode.
- [**docs/URL_ROUTING_AND_SUBPAGES.md**](docs/URL_ROUTING_AND_SUBPAGES.md): How to share URLs (`#ch=1..4`), deep links, and subpages.
- [**docs/STORE_RELEASE_CHECKLIST.md**](docs/STORE_RELEASE_CHECKLIST.md): Production release instructions for iOS, Android, and Web.
