#!/usr/bin/env python3
"""
Prepares the static directory ready for Cloudflare Pages deployment.

Target output directory: dist_pages/
  ├── index.html                     (Static Cloudflare review dashboard)
  ├── herinneringskamer/             (Room 1 www build)
  └── zolderkamer/                   (Room 2 www build)
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
  <title>Like Dust Part 2 · Web Review Dashboard</title>
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
    .wrap { max-width: 780px; margin: 0 auto; }
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

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
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
    .room-title { margin: 0; font-size: 19px; font-weight: 700; }
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
      <h1>Like Dust Part 2 · Room Builds</h1>
      <p class="subtitle">Cloudflare Pages online review for both interactive room variations.</p>
    </header>

    <div class="banner">
      <div class="banner-badge">
        <span class="dot"></span>
        <span>Hosted on Cloudflare Pages</span>
      </div>
      <div class="banner-desc">Static web review build · No local ports required</div>
    </div>

    <div class="mode-bar">
      <div class="mode-left">
        <label class="mode-toggle">
          <input type="checkbox" id="devToggle">
          <span>Hide Dev Mode (<code>?dev=0</code> · Production UI)</span>
        </label>
      </div>
      <div class="mode-tip">
        Adds <code>?dev=0</code> to room links to preview chapter icons and hide debug overlays.
      </div>
    </div>

    <section class="grid">
      <!-- Room 1 -->
      <article class="room-card" id="card-v1">
        <div>
          <div class="room-top">
            <div>
              <h2 class="room-title">1. Herinneringskamer</h2>
              <p class="room-appid">com.likedust.herinneringskamer</p>
            </div>
            <span class="room-pill">Variatie 1</span>
          </div>
          <p class="room-desc">2.5D painted room (Layers from <code>room 2.psd</code>)</p>
        </div>

        <div class="url-box">
          <a href="./herinneringskamer/" target="_blank" rel="noopener" id="url-v1">./herinneringskamer/</a>
          <button type="button" class="copy-btn" data-room="v1">Copy</button>
        </div>

        <div class="room-actions">
          <a href="./herinneringskamer/" target="_blank" rel="noopener" class="btn-link" id="open-v1">
            Open Herinneringskamer ↗
          </a>
          <button type="button" class="btn-reset" data-room="v1" title="Delete chapter progression and reset saved state for Herinneringskamer">
            ↺ Reset Progress
          </button>
        </div>
        <div class="reset-feedback" id="feedback-v1">✓ Progress reset!</div>
      </article>

      <!-- Room 2 -->
      <article class="room-card" id="card-v2">
        <div>
          <div class="room-top">
            <div>
              <h2 class="room-title">2. Zolderkamer</h2>
              <p class="room-appid">com.likedust.zolderkamer</p>
            </div>
            <span class="room-pill">Variatie 2</span>
          </div>
          <p class="room-desc">3D toon-shaded attic room (Three.js)</p>
        </div>

        <div class="url-box">
          <a href="./zolderkamer/" target="_blank" rel="noopener" id="url-v2">./zolderkamer/</a>
          <button type="button" class="copy-btn" data-room="v2">Copy</button>
        </div>

        <div class="room-actions">
          <a href="./zolderkamer/" target="_blank" rel="noopener" class="btn-link" id="open-v2">
            Open Zolderkamer ↗
          </a>
          <button type="button" class="btn-reset" data-room="v2" title="Delete chapter progression and reset saved state for Zolderkamer">
            ↺ Reset Progress
          </button>
        </div>
        <div class="reset-feedback" id="feedback-v2">✓ Progress reset!</div>
      </article>
    </section>

    <footer>
      <span>Shared origin: progress is stored in your browser's localStorage</span>
      <span>Press <code>0</code> inside either room to reset progress at any time</span>
    </footer>
  </div>

  <script>
    (function() {
      const devToggle = document.getElementById("devToggle");
      const urlParams = new URLSearchParams(location.search);
      let hideDev = urlParams.get("dev") === "0" || (!urlParams.has("dev") && localStorage.getItem("pages_dev0") === "1");
      devToggle.checked = hideDev;

      function getPath(roomId) {
        return roomId === "v1" ? "./herinneringskamer/" : "./zolderkamer/";
      }

      function getFinalUrl(roomId) {
        const base = new URL(getPath(roomId), location.href);
        if (hideDev) {
          base.searchParams.set("dev", "0");
        } else {
          base.searchParams.delete("dev");
        }
        return base.href;
      }

      function updateUrls() {
        ["v1", "v2"].forEach(function(id) {
          const finalUrl = getFinalUrl(id);
          const urlEl = document.getElementById("url-" + id);
          const openEl = document.getElementById("open-" + id);
          const copyBtn = document.querySelector('.copy-btn[data-room="' + id + '"]');

          if (urlEl) {
            urlEl.href = finalUrl;
            urlEl.textContent = urlEl.href;
          }
          if (openEl) {
            openEl.href = finalUrl;
          }
          if (copyBtn) {
            copyBtn.setAttribute("data-copy", finalUrl);
          }
        });
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

      // Reset progress directly in the shared Pages domain
      function resetProgress(roomId) {
        const btn = document.querySelector('.btn-reset[data-room="' + roomId + '"]');
        const feedback = document.getElementById("feedback-" + roomId);
        if (btn) btn.disabled = true;

        try {
          // Remove room specific keys
          localStorage.removeItem("ld2-room-" + roomId);
          // Remove chapter progression keys
          localStorage.removeItem("wabtsa-number");
          localStorage.removeItem("wabtsa-line");
          localStorage.removeItem("wabtsa-cc");

          // Also remove any remaining keys with the prefix
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && (k.startsWith("ld2-room-" + roomId) || k.startsWith("wabtsa-"))) {
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
        btn.addEventListener("click", function() {
          const roomId = btn.getAttribute("data-room");
          resetProgress(roomId);
        });
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

    # 2. Copy Room 1 (Herinneringskamer)
    v1_src = CAPACITOR_DIR / "app-v1-herinneringskamer" / "www"
    v1_dst = DIST_DIR / "herinneringskamer"
    print(f"  → Copying Room 1 from {v1_src.name}/www ...")
    shutil.copytree(v1_src, v1_dst, ignore=shutil.ignore_patterns(".DS_Store", "__pycache__"))
    print("  ✓ Created dist_pages/herinneringskamer/")

    # 3. Copy Room 2 (Zolderkamer)
    v2_src = CAPACITOR_DIR / "app-v2-zolderkamer" / "www"
    v2_dst = DIST_DIR / "zolderkamer"
    print(f"  → Copying Room 2 from {v2_src.name}/www ...")
    shutil.copytree(v2_src, v2_dst, ignore=shutil.ignore_patterns(".DS_Store", "__pycache__"))
    print("  ✓ Created dist_pages/zolderkamer/")

    print("\n🎉 Build complete! Ready to deploy dist_pages/ to Cloudflare Pages.")


if __name__ == "__main__":
    build_pages()

