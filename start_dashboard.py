#!/usr/bin/env python3
"""
Like Dust Part 2 · Rooms www Server & Dashboard Launcher

Run directly (`python3 start_dashboard.py`) or double-click `Start_Dashboard.command`:
  1. Starts the local HTTP server for both Capacitor `www` room builds:
     - Room 1 (Herinneringskamer): http://localhost:8771/
     - Room 2 (Zolderkamer):       http://localhost:8772/
  2. Starts the local Dashboard controller on http://localhost:8770/
     (needed because browsers block static file:// pages from starting/restarting OS processes)
  3. Automatically opens http://localhost:8770/ in your default browser.
"""

import argparse
import atexit
from datetime import datetime, timezone
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser

ROOT_DIR = Path(__file__).resolve().parent
CAPACITOR_DIR = ROOT_DIR / "Capacitor_Apps"
PID_FILE = CAPACITOR_DIR / ".www_worker.pid"

HOST = "127.0.0.1"
DASHBOARD_PORT = 8770

ROOMS = [
    {
        "id": "v1",
        "name": "Herinneringskamer",
        "appId": "com.likedust.herinneringskamer",
        "description": "Variatie 1 · 2.5D painted room (Capacitor_Apps/app-v1-herinneringskamer/www)",
        "port": 8771,
        "wwwDir": CAPACITOR_DIR / "app-v1-herinneringskamer" / "www",
    },
    {
        "id": "v2",
        "name": "Zolderkamer",
        "appId": "com.likedust.zolderkamer",
        "description": "Variatie 2 · 3D toon-shaded attic room (Capacitor_Apps/app-v2-zolderkamer/www)",
        "port": 8772,
        "wwwDir": CAPACITOR_DIR / "app-v2-zolderkamer" / "www",
    },
]

DASHBOARD_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Like Dust Part 2 · www Server Dashboard</title>
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
      --red-bg: rgba(248, 113, 113, 0.12);
      --red-border: rgba(248, 113, 113, 0.3);
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
    header { margin-bottom: 28px; }
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
    .status-bar {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 22px;
    }
    .status-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 7px 14px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.04);
    }
    .status-badge.running { color: var(--green); background: var(--green-bg); border-color: var(--green-border); }
    .status-badge.stopped { color: var(--red); background: var(--red-bg); border-color: var(--red-border); }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: currentColor; display: inline-block; }
    .status-badge.running .dot { box-shadow: 0 0 10px var(--green); animation: pulse 2s infinite ease-in-out; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
    .status-meta { font-size: 13px; color: var(--muted); }
    .controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    button, .btn-link {
      appearance: none;
      border: 1px solid var(--border);
      background: #25221d;
      color: var(--text);
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 600;
      padding: 9px 16px;
      border-radius: 9px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease, opacity 0.15s ease;
    }
    button:hover:not(:disabled), .btn-link:hover:not(.disabled) { background: #302c25; border-color: #453f36; }
    button:active:not(:disabled), .btn-link:active:not(.disabled) { transform: translateY(1px); }
    button:disabled, .btn-link.disabled { opacity: 0.42; cursor: not-allowed; pointer-events: none; }
    .btn-primary { background: var(--accent); border-color: var(--accent); color: #15120d; }
    .btn-primary:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); }
    .btn-danger:hover:not(:disabled) { border-color: var(--red-border); color: var(--red); }
    .offline-banner {
      display: none;
      margin-bottom: 22px;
      padding: 15px 18px;
      border-radius: 12px;
      border: 1px solid rgba(251, 191, 36, 0.35);
      background: rgba(251, 191, 36, 0.09);
      color: #fde68a;
      font-size: 13.5px;
    }
    .offline-banner code {
      background: rgba(0, 0, 0, 0.35);
      padding: 2px 6px;
      border-radius: 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
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
    .room-card.online { border-color: #3a342a; }
    .room-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .room-title { margin: 0; font-size: 19px; font-weight: 700; }
    .room-appid { margin: 3px 0 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: var(--muted); }
    .port-pill { font-size: 11.5px; font-weight: 600; padding: 4px 9px; border-radius: 999px; white-space: nowrap; border: 1px solid var(--border); color: var(--muted); }
    .port-pill.online { color: var(--green); border-color: var(--green-border); background: var(--green-bg); }
    .port-pill.offline { color: var(--red); border-color: var(--red-border); background: var(--red-bg); }
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
    .url-box a.disabled { color: var(--muted); pointer-events: none; text-decoration: none; }
    .copy-btn { padding: 4px 9px; font-size: 11.5px; border-radius: 6px; flex-shrink: 0; }
    .room-actions { display: flex; gap: 10px; }
    .room-actions .btn-link { flex: 1; justify-content: center; }
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
      <p class="eyebrow">We All Breathe The Same Air · Capacitor Apps</p>
      <h1>Rooms <code>www</code> Server Dashboard</h1>
      <p class="subtitle">Live status &amp; local web servers for both iOS/Android room builds.</p>
    </header>

    <div class="offline-banner" id="offlineBanner">
      <strong>Dashboard script is stopped.</strong>
      Double-click <code>Start_Dashboard.command</code> in the project root (or run <code>python3 start_dashboard.py</code>) to start it again.
    </div>

    <section class="status-bar">
      <div class="status-left">
        <div class="status-badge stopped" id="mainBadge">
          <span class="dot"></span>
          <span id="mainStatusText">Checking…</span>
        </div>
        <div class="status-meta" id="statusMeta">Connecting…</div>
      </div>

      <div class="controls">
        <button type="button" class="btn-primary" id="startOrRestartBtn" disabled>Start Server</button>
        <button type="button" class="btn-danger" id="stopBtn" disabled>Stop</button>
      </div>
    </section>

    <section class="grid">
      <article class="room-card" id="card-v1">
        <div>
          <div class="room-top">
            <div>
              <h2 class="room-title">1. Herinneringskamer</h2>
              <p class="room-appid">com.likedust.herinneringskamer</p>
            </div>
            <span class="port-pill" id="pill-v1">Port 8771</span>
          </div>
          <p class="room-desc">2.5D painted room (<code>app-v1-herinneringskamer/www</code>)</p>
        </div>

        <div class="url-box">
          <a href="http://localhost:8771/" target="_blank" rel="noopener" id="url-v1">http://localhost:8771/</a>
          <button type="button" class="copy-btn" data-copy="http://localhost:8771/">Copy</button>
        </div>

        <div class="room-actions">
          <a href="http://localhost:8771/" target="_blank" rel="noopener" class="btn-link btn-primary" id="open-v1">
            Open Herinneringskamer ↗
          </a>
        </div>
      </article>

      <article class="room-card" id="card-v2">
        <div>
          <div class="room-top">
            <div>
              <h2 class="room-title">2. Zolderkamer</h2>
              <p class="room-appid">com.likedust.zolderkamer</p>
            </div>
            <span class="port-pill" id="pill-v2">Port 8772</span>
          </div>
          <p class="room-desc">3D toon-shaded attic room (<code>app-v2-zolderkamer/www</code>)</p>
        </div>

        <div class="url-box">
          <a href="http://localhost:8772/" target="_blank" rel="noopener" id="url-v2">http://localhost:8772/</a>
          <button type="button" class="copy-btn" data-copy="http://localhost:8772/">Copy</button>
        </div>

        <div class="room-actions">
          <a href="http://localhost:8772/" target="_blank" rel="noopener" class="btn-link btn-primary" id="open-v2">
            Open Zolderkamer ↗
          </a>
        </div>
      </article>
    </section>

    <footer>
      <span id="lastChecked">Auto-checks status every 2s</span>
      <span>Sync changes to mobile: <code>npm run sync</code></span>
    </footer>
  </div>

  <script>
    (function () {
      const API_BASE = location.protocol === "http:" && location.port === "8770"
        ? ""
        : "http://127.0.0.1:8770";

      const mainBadge = document.getElementById("mainBadge");
      const mainStatusText = document.getElementById("mainStatusText");
      const statusMeta = document.getElementById("statusMeta");
      const startOrRestartBtn = document.getElementById("startOrRestartBtn");
      const stopBtn = document.getElementById("stopBtn");
      const offlineBanner = document.getElementById("offlineBanner");
      const lastChecked = document.getElementById("lastChecked");

      let currentRunning = false;
      let busy = false;

      function formatUptime(sec) {
        if (sec == null) return "";
        if (sec < 60) return sec + "s";
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        if (m < 60) return m + "m " + s + "s";
        const h = Math.floor(m / 60);
        return h + "h " + (m % 60) + "m";
      }

      function setRoomState(id, room) {
        const card = document.getElementById("card-" + id);
        const pill = document.getElementById("pill-" + id);
        const urlEl = document.getElementById("url-" + id);
        const openEl = document.getElementById("open-" + id);

        const running = !!(room && room.running);
        const url = (room && room.url) || (id === "v1" ? "http://localhost:8771/" : "http://localhost:8772/");
        const port = (room && room.port) || (id === "v1" ? 8771 : 8772);

        card.classList.toggle("online", running);
        pill.className = "port-pill " + (running ? "online" : "offline");
        pill.textContent = "Port " + port + " · " + (running ? "Online" : "Offline");

        urlEl.href = url;
        urlEl.textContent = url;
        urlEl.classList.toggle("disabled", !running);

        openEl.href = url;
        openEl.classList.toggle("disabled", !running);
      }

      function renderStatus(data) {
        offlineBanner.style.display = "none";
        currentRunning = !!data.serverRunning;

        if (data.serverRunning) {
          mainBadge.className = "status-badge running";
          mainStatusText.textContent = "Server Running";
          const parts = [];
          if (data.pid) parts.push("PID " + data.pid);
          if (data.uptimeSeconds != null) parts.push("Uptime " + formatUptime(data.uptimeSeconds));
          parts.push("Ports 8771 & 8772 active");
          statusMeta.textContent = parts.join(" · ");
          startOrRestartBtn.textContent = busy ? "Working…" : "↻ Restart Server";
          stopBtn.disabled = busy;
        } else {
          mainBadge.className = "status-badge stopped";
          mainStatusText.textContent = data.partialRunning ? "Partially Running" : "Server Stopped";
          statusMeta.textContent = "Ports 8771 & 8772 are stopped";
          startOrRestartBtn.textContent = busy ? "Working…" : "▶ Start Server";
          stopBtn.disabled = busy || !data.partialRunning;
        }

        startOrRestartBtn.disabled = busy;

        const byId = {};
        (data.rooms || []).forEach(function (r) { byId[r.id] = r; });
        setRoomState("v1", byId.v1);
        setRoomState("v2", byId.v2);

        lastChecked.textContent = "Last checked: " + new Date().toLocaleTimeString();
      }

      function renderControllerOffline() {
        offlineBanner.style.display = "block";
        mainBadge.className = "status-badge stopped";
        mainStatusText.textContent = "Dashboard Stopped";
        statusMeta.textContent = "Run Start_Dashboard.command to start";
        startOrRestartBtn.textContent = "▶ Start Server";
        startOrRestartBtn.disabled = true;
        stopBtn.disabled = true;
        setRoomState("v1", { running: false, port: 8771, url: "http://localhost:8771/" });
        setRoomState("v2", { running: false, port: 8772, url: "http://localhost:8772/" });
      }

      async function fetchStatus() {
        if (busy) return;
        try {
          const res = await fetch(API_BASE + "/api/status", { cache: "no-store" });
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = await res.json();
          renderStatus(data);
        } catch (_) {
          renderControllerOffline();
        }
      }

      async function sendAction(action) {
        if (busy) return;
        busy = true;
        startOrRestartBtn.disabled = true;
        stopBtn.disabled = true;
        startOrRestartBtn.textContent = action === "stop" ? "Stopping…" : (currentRunning ? "Restarting…" : "Starting…");
        try {
          const res = await fetch(API_BASE + "/api/" + action, { method: "POST" });
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = await res.json();
          busy = false;
          renderStatus(data);
        } catch (_) {
          busy = false;
          renderControllerOffline();
        }
      }

      startOrRestartBtn.addEventListener("click", function () {
        sendAction(currentRunning ? "restart" : "start");
      });

      stopBtn.addEventListener("click", function () {
        sendAction("stop");
      });

      document.querySelectorAll(".copy-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const text = btn.getAttribute("data-copy");
          navigator.clipboard.writeText(text).then(function () {
            const prev = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(function () { btn.textContent = prev; }, 1200);
          });
        });
      });

      fetchStatus();
      setInterval(fetchStatus, 2000);
    })();
  </script>
</body>
</html>
"""


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


class RangeHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Static file handler with HTTP Range (206 Partial Content) support for Safari MP4 video playback."""

    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        path_lower = self.path.split("?", 1)[0].lower()
        if path_lower.endswith((".html", ".js", ".css", ".json")) or path_lower.endswith("/"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def send_head(self):
        range_header = self.headers.get("Range")
        if not range_header:
            return super().send_head()

        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()

        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return None

        try:
            fs = os.fstat(f.fileno())
            size = fs.st_size
            m = re.match(r"bytes=(\d*)-(\d*)", range_header.strip())
            if not m:
                f.close()
                return super().send_head()

            start_s, end_s = m.groups()
            if start_s == "" and end_s == "":
                f.close()
                return super().send_head()

            if start_s == "":
                suffix = int(end_s)
                start = max(0, size - suffix)
                end = size - 1
            else:
                start = int(start_s)
                end = int(end_s) if end_s != "" else size - 1

            if start >= size or start > end:
                self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                f.close()
                return None

            end = min(end, size - 1)
            length = end - start + 1

            self.send_response(HTTPStatus.PARTIAL_CONTENT)
            self.send_header("Content-type", self.guess_type(path))
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(length))
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            self.end_headers()
            f.seek(start)
            self._range_remaining = length
            return f
        except Exception:
            f.close()
            raise

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_range_remaining", None)
        try:
            if remaining is None:
                super().copyfile(source, outputfile)
                return
            bufsize = 64 * 1024
            while remaining > 0:
                chunk = source.read(min(bufsize, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            self._range_remaining = None

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError):
            pass


def run_worker():
    """Serve both Capacitor www folders concurrently in one child process."""
    servers = []
    for room in ROOMS:
        handler = partial(RangeHTTPRequestHandler, directory=str(room["wwwDir"]))
        httpd = ReusableThreadingHTTPServer((HOST, room["port"]), handler)
        t = threading.Thread(target=httpd.serve_forever, name=f"www-{room['id']}", daemon=True)
        t.start()
        servers.append(httpd)

    PID_FILE.parent.mkdir(parents=True, exist_ok=True)
    PID_FILE.write_text(str(os.getpid()), encoding="utf-8")

    stop_event = threading.Event()

    def handle_signal(signum, frame):
        stop_event.set()

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    try:
        while not stop_event.is_set():
            stop_event.wait(0.5)
    finally:
        for s in servers:
            try:
                s.shutdown()
                s.server_close()
            except Exception:
                pass
        try:
            if PID_FILE.exists() and PID_FILE.read_text(encoding="utf-8").strip() == str(os.getpid()):
                PID_FILE.unlink()
        except Exception:
            pass


def is_port_open(host, port, timeout=0.25):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


class WorkerManager:
    def __init__(self):
        self._lock = threading.Lock()
        self._proc = None
        self._started_at = None
        self._started_monotonic = None

    def _kill_stale_worker_if_any(self):
        if PID_FILE.exists():
            try:
                old_pid = int(PID_FILE.read_text(encoding="utf-8").strip())
                os.kill(old_pid, signal.SIGTERM)
                for _ in range(15):
                    time.sleep(0.05)
                    try:
                        os.kill(old_pid, 0)
                    except OSError:
                        break
            except Exception:
                pass
            try:
                PID_FILE.unlink()
            except Exception:
                pass

    def start(self):
        with self._lock:
            if self._proc is not None and self._proc.poll() is None:
                if all(is_port_open(HOST, r["port"]) for r in ROOMS):
                    return self.status_unlocked()
                self._stop_unlocked()

            self._kill_stale_worker_if_any()

            self._proc = subprocess.Popen(
                [sys.executable, str(Path(__file__).resolve()), "--worker"],
                cwd=str(ROOT_DIR),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            self._started_at = datetime.now(timezone.utc).isoformat()
            self._started_monotonic = time.monotonic()

            deadline = time.monotonic() + 3.0
            while time.monotonic() < deadline:
                if self._proc.poll() is not None:
                    break
                if all(is_port_open(HOST, r["port"]) for r in ROOMS):
                    break
                time.sleep(0.05)

            print(f"[{datetime.now().strftime('%H:%M:%S')}] www server started (PID {self._proc.pid})", flush=True)
            return self.status_unlocked()

    def _stop_unlocked(self):
        if self._proc is not None:
            if self._proc.poll() is None:
                try:
                    self._proc.terminate()
                    self._proc.wait(timeout=2.0)
                except subprocess.TimeoutExpired:
                    try:
                        self._proc.kill()
                        self._proc.wait(timeout=1.0)
                    except Exception:
                        pass
                except Exception:
                    pass
            self._proc = None

        self._kill_stale_worker_if_any()
        self._started_at = None
        self._started_monotonic = None

        deadline = time.monotonic() + 1.5
        while time.monotonic() < deadline:
            if not any(is_port_open(HOST, r["port"]) for r in ROOMS):
                break
            time.sleep(0.05)

    def stop(self):
        with self._lock:
            self._stop_unlocked()
            print(f"[{datetime.now().strftime('%H:%M:%S')}] www server stopped", flush=True)
            return self.status_unlocked()

    def restart(self):
        with self._lock:
            self._stop_unlocked()
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Restarting www server...", flush=True)
        return self.start()

    def status_unlocked(self):
        proc_alive = self._proc is not None and self._proc.poll() is None
        pid = self._proc.pid if proc_alive else None
        if pid is None and PID_FILE.exists():
            try:
                candidate = int(PID_FILE.read_text(encoding="utf-8").strip())
                os.kill(candidate, 0)
                pid = candidate
            except Exception:
                pid = None

        room_statuses = []
        for r in ROOMS:
            open_ok = is_port_open(HOST, r["port"])
            room_statuses.append(
                {
                    "id": r["id"],
                    "name": r["name"],
                    "appId": r["appId"],
                    "description": r["description"],
                    "port": r["port"],
                    "url": f"http://localhost:{r['port']}/",
                    "running": open_ok,
                    "wwwExists": r["wwwDir"].is_dir(),
                    "wwwPath": str(r["wwwDir"]),
                }
            )

        all_running = all(rs["running"] for rs in room_statuses)
        any_running = any(rs["running"] for rs in room_statuses)

        uptime = None
        if all_running and self._started_monotonic is not None:
            uptime = max(0, int(time.monotonic() - self._started_monotonic))

        return {
            "serverRunning": all_running,
            "partialRunning": any_running and not all_running,
            "pid": pid if any_running else None,
            "startedAt": self._started_at if any_running else None,
            "uptimeSeconds": uptime,
            "dashboardUrl": f"http://localhost:{DASHBOARD_PORT}/",
            "rooms": room_statuses,
        }

    def status(self):
        with self._lock:
            return self.status_unlocked()


MANAGER = WorkerManager()


class DashboardHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass

    def _send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        route = self.path.split("?", 1)[0]
        if route in ("/", "/index.html"):
            body = DASHBOARD_HTML.encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(body)
            return

        if route == "/api/status":
            self._send_json(MANAGER.status())
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length > 0:
            self.rfile.read(length)

        route = self.path.split("?", 1)[0]
        if route == "/api/start":
            self._send_json(MANAGER.start())
            return
        if route == "/api/restart":
            self._send_json(MANAGER.restart())
            return
        if route == "/api/stop":
            self._send_json(MANAGER.stop())
            return

        self._send_json({"error": "Unknown endpoint"}, status=HTTPStatus.NOT_FOUND)

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (BrokenPipeError, ConnectionResetError):
            pass


def run_controller(open_browser=True):
    dashboard_url = f"http://localhost:{DASHBOARD_PORT}/"

    # If already running, ensure www server is started and open the dashboard page
    if is_port_open(HOST, DASHBOARD_PORT):
        try:
            req = urllib.request.Request(f"http://{HOST}:{DASHBOARD_PORT}/api/start", method="POST")
            urllib.request.urlopen(req, timeout=2.0).read()
        except Exception:
            pass
        print(f"Dashboard is already running at {dashboard_url}")
        for r in ROOMS:
            print(f"  - {r['name']}: http://localhost:{r['port']}/")
        if open_browser:
            webbrowser.open(dashboard_url)
        return

    MANAGER.start()
    atexit.register(MANAGER.stop)

    httpd = ReusableThreadingHTTPServer((HOST, DASHBOARD_PORT), DashboardHandler)

    def shutdown_handler(signum, frame):
        threading.Thread(target=httpd.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, shutdown_handler)
    signal.signal(signal.SIGINT, shutdown_handler)

    print("============================================================")
    print(" Like Dust Part 2 · Rooms www Server & Dashboard")
    print("============================================================")
    print(f" Dashboard:         {dashboard_url}")
    for r in ROOMS:
        print(f" {r['name'] + ':':18s} http://localhost:{r['port']}/")
    print("------------------------------------------------------------")
    print(" Press Ctrl+C (or close this Terminal window) to stop all.")
    print("============================================================", flush=True)

    if open_browser:
        threading.Timer(0.25, lambda: webbrowser.open(dashboard_url)).start()

    try:
        httpd.serve_forever()
    finally:
        httpd.server_close()
        MANAGER.stop()


def main():
    parser = argparse.ArgumentParser(description="Start Like Dust Part 2 www servers and open the Dashboard")
    parser.add_argument("--worker", action="store_true", help="Internal flag: run static www servers")
    parser.add_argument("--no-open", action="store_true", help="Do not automatically open the browser")
    args = parser.parse_args()

    if args.worker:
        run_worker()
    else:
        run_controller(open_browser=not args.no_open)


if __name__ == "__main__":
    main()

