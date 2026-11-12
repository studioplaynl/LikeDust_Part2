#!/usr/bin/env python3
"""
Prepares the static directory ready for Cloudflare Pages deployment.

Target output directory: dist_pages/
  ├── index.html   (Static Cloudflare review dashboard)
  └── room/        (We All Breathe the Same Air — Flat 2D Three.js Room + Video Chapters)
"""

import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
CAPACITOR_DIR = ROOT_DIR / "Capacitor_Apps"
DIST_DIR = ROOT_DIR / "dist_pages"

DASHBOARD_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>We All Breathe the Same Air · Web Review Dashboard</title>
  <link rel="icon" href="data:,">
  <style>
    :root {
      --bg: #0f0e0c;
      --panel: #191714;
      --border: #2e2a24;
      --text: #f2ede2;
      --muted: #9e9689;
      --accent: #d6a93e;
      --accent-hover: #e4b94f;
      --green: #4ade80;
      --green-bg: rgba(74, 222, 128, 0.12);
      --green-border: rgba(74, 222, 128, 0.3);
      --red: #f87171;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(circle at 50% 0%, #1d1914 0%, var(--bg) 70%);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 40px 20px;
    }
    .wrap { max-width: 740px; margin: 0 auto; }
    header { margin-bottom: 24px; }
    .eyebrow {
      margin: 0 0 6px;
      font-size: 12px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 600;
    }
    h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
    .subtitle { margin: 6px 0 0; color: var(--muted); font-size: 14px; }

    .banner {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }
    .banner-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      color: var(--green);
      background: var(--green-bg);
      border: 1px solid var(--green-border);
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .banner-desc { font-size: 13px; color: var(--muted); }

    .mode-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      background: #14120f;
      border: 1px solid var(--border);
      border-radius: 11px;
      padding: 10px 14px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .mode-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; font-weight: 500; }
    .mode-toggle input { cursor: pointer; width: 16px; height: 16px; accent-color: var(--accent); }
    .mode-tip { color: var(--muted); font-size: 12px; }
    .mode-tip code { background: rgba(255, 255, 255, 0.06); padding: 1px 5px; border-radius: 4px; color: #cfc7b8; }

    .room-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 18px;
    }
    .room-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .room-title { margin: 0; font-size: 20px; font-weight: 700; }
    .room-appid { margin: 3px 0 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: var(--muted); }
    .room-pill { font-size: 11.5px; font-weight: 600; padding: 4px 9px; border-radius: 999px; border: 1px solid var(--border); color: var(--accent); background: rgba(214, 169, 62, 0.1); }
    .room-desc { margin: 10px 0 0; font-size: 13.5px; color: var(--muted); }

    .url-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: #12100e;
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 9px 12px;
    }
    .url-box a { color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; text-decoration: none; word-break: break-all; }
    .url-box a:hover { text-decoration: underline; }
    .copy-btn {
      appearance: none;
      border: 1px solid var(--border);
      background: #25221d;
      color: var(--text);
      font-size: 11.5px;
      border-radius: 6px;
      padding: 4px 9px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .copy-btn:hover { background: #302c25; }

    .room-actions { display: flex; gap: 10px; }
    .btn-link {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--accent);
      color: #15120d;
      border: 1px solid var(--accent);
      font-weight: 600;
      font-size: 13.5px;
      padding: 10px 16px;
      border-radius: 9px;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .btn-link:hover { background: var(--accent-hover); }
    .btn-sublink {
      flex: 0.65;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #25221d;
      color: var(--text);
      border: 1px solid var(--border);
      font-weight: 600;
      font-size: 13.5px;
      padding: 10px 14px;
      border-radius: 9px;
      text-decoration: none;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .btn-sublink:hover { background: #302c25; border-color: #453f36; }
    .btn-reset {
      appearance: none;
      border: 1px solid var(--border);
      background: #1c1a16;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
      padding: 10px 14px;
      border-radius: 9px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-reset:hover {
      color: var(--red);
      border-color: rgba(248, 113, 113, 0.4);
      background: rgba(248, 113, 113, 0.08);
    }
    .reset-feedback {
      font-size: 11.5px;
      color: var(--green);
      margin-top: -6px;
      margin-bottom: 2px;
      text-align: right;
      display: none;
    }

    footer {
      margin-top: 26px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 12.5px;
      color: var(--muted);
    }
    footer code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #cfc7b8; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <p class="eyebrow">We All Breathe The Same Air · Review Dashboard</p>
      <h1>Like Dust Part 2 · Website &amp; App Build</h1>
      <p class="subtitle">Cloudflare Pages online review for the branching landing page, interactive airport intro, flat 2D Three.js room, and 4 interactive video chapters.</p>
    </header>

    <div class="banner">
      <div class="banner-badge">
        <span class="dot"></span>
        <span>Hosted on Cloudflare Pages</span>
      </div>
      <div class="banner-desc">Static web review build · Shared with iOS &amp; Android Capacitor app</div>
    </div>

    <div class="mode-bar">
      <div class="mode-left">
        <label class="mode-toggle">
          <input type="checkbox" id="devToggle">
          <span>Hide Dev Mode (<code>?dev=0</code> · Production UI)</span>
        </label>
      </div>
      <div class="mode-tip">
        Adds <code>?dev=0</code> to preview the 4 chapter icons and hide debug overlays.
      </div>
    </div>

    <article class="room-card" id="card-main">
      <div>
        <div class="room-top">
          <div>
            <h2 class="room-title">We All Breathe the Same Air</h2>
            <p class="room-appid">com.likedust.wabtsa</p>
          </div>
          <span class="room-pill">Intro + Flat 2D Room · Three.js</span>
        </div>
        <p class="room-desc">Branching Landing Page (Part 1 <em>Like Dust</em> &amp; Part 2 <em>We All Breathe The Same Air</em>) &rarr; Interactive Airport Intro &rarr; Flat 2D Three.js Room + 4 Video Chapters</p>
      </div>

      <div class="url-box">
        <a href="./room/" target="_blank" rel="noopener" id="url-main">./room/</a>
        <button type="button" class="copy-btn" data-room="main">Copy</button>
      </div>

      <div class="room-actions" style="flex-wrap: wrap;">
        <a href="./room/" target="_blank" rel="noopener" class="btn-link" id="open-main">
          Open Full Experience ↗
        </a>
        <a href="./room/intro/" target="_blank" rel="noopener" class="btn-sublink" id="open-intro">
          Intro Only ↗
        </a>
        <a href="./room/room/" target="_blank" rel="noopener" class="btn-sublink" id="open-room">
          2D Room Direct ↗
        </a>
        <button type="button" class="btn-reset" data-room="main" title="Delete chapter progression and reset saved state">
          ↺ Reset Progress
        </button>
      </div>
      <div class="reset-feedback" id="feedback-main">✓ Progress reset!</div>
    </article>

    <footer>
      <span>Progress is stored in your browser's localStorage</span>
      <span>Press <code>0</code> inside the room (in Dev Mode) to reset progress at any time</span>
    </footer>
  </div>

  <script>
    (function() {
      const devToggle = document.getElementById("devToggle");
      const urlParams = new URLSearchParams(location.search);
      let hideDev = urlParams.get("dev") === "0" || (!urlParams.has("dev") && localStorage.getItem("pages_dev0") === "1");
      devToggle.checked = hideDev;

      function getFinalUrl(relPath) {
        const base = new URL(relPath || "./room/", location.href);
        if (hideDev) base.searchParams.set("dev", "0");
        else base.searchParams.delete("dev");
        return base.href;
      }

      function updateUrls() {
        const finalUrl = getFinalUrl("./room/");
        const introUrl = getFinalUrl("./room/intro/");
        const roomUrl = getFinalUrl("./room/room/");
        const urlEl = document.getElementById("url-main");
        const openEl = document.getElementById("open-main");
        const openIntroEl = document.getElementById("open-intro");
        const openRoomEl = document.getElementById("open-room");
        const copyBtn = document.querySelector('.copy-btn[data-room="main"]');

        if (urlEl) {
          urlEl.href = finalUrl;
          urlEl.textContent = urlEl.href;
        }
        if (openEl) openEl.href = finalUrl;
        if (openIntroEl) openIntroEl.href = introUrl;
        if (openRoomEl) openRoomEl.href = roomUrl;
        if (copyBtn) copyBtn.setAttribute("data-copy", finalUrl);
      }

      devToggle.addEventListener("change", function() {
        hideDev = devToggle.checked;
        try {
          if (hideDev) localStorage.setItem("pages_dev0", "1");
          else localStorage.removeItem("pages_dev0");
        } catch (_) {}

        const u = new URL(location.href);
        if (hideDev) u.searchParams.set("dev", "0");
        else u.searchParams.delete("dev");
        history.replaceState(null, "", u.toString());

        updateUrls();
      });

      function resetProgress() {
        const btn = document.querySelector('.btn-reset[data-room="main"]');
        const feedback = document.getElementById("feedback-main");
        if (btn) btn.disabled = true;

        try {
          localStorage.removeItem("ld2-room-main");
          localStorage.removeItem("wabtsa-number");
          localStorage.removeItem("wabtsa-line");
          localStorage.removeItem("wabtsa-cc");
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && (k.startsWith("ld2-room-") || k.startsWith("wabtsa-"))) {
              localStorage.removeItem(k);
            }
          }
        } catch (e) {
          console.error("Failed to clear localStorage:", e);
        }

        if (feedback) {
          feedback.style.display = "block";
          setTimeout(function() { feedback.style.display = "none"; }, 2500);
        }
        if (btn) btn.disabled = false;
      }

      document.querySelectorAll(".btn-reset").forEach(function(btn) {
        btn.addEventListener("click", resetProgress);
      });

      document.querySelectorAll(".copy-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
          const text = btn.getAttribute("data-copy") || btn.previousElementSibling.href;
          navigator.clipboard.writeText(text).then(function() {
            const prev = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(function() { btn.textContent = prev; }, 1200);
          });
        });
      });

      updateUrls();
    })();
  </script>
</body>
</html>
"""


def build_pages():
    print(f"Building Cloudflare Pages static review folder at: {DIST_DIR}")
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Write the Pages Dashboard index.html
    (DIST_DIR / "index.html").write_text(DASHBOARD_HTML.strip() + "\n", encoding="utf-8")
    print("  ✓ Created dist_pages/index.html")

    # 2. Copy unified Room www bundle
    room_src = CAPACITOR_DIR / "app-room" / "www"
    room_dst = DIST_DIR / "room"
    print(f"  → Copying Room app from {room_src.parent.name}/www ...")
    shutil.copytree(room_src, room_dst, ignore=shutil.ignore_patterns(".DS_Store", "__pycache__"))
    print("  ✓ Created dist_pages/room/")

    print("\n🎉 Build complete! Ready to deploy dist_pages/ to Cloudflare Pages.")


if __name__ == "__main__":
    build_pages()
