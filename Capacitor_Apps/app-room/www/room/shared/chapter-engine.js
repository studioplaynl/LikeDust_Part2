/* We All Breathe The Same Air · Unified Interactive Chapter Engine (Chapters 1–4)
   - Shared video segment player, interactive Moments, i18n (en / nl / fa + RTL),
     and clean WebAudio SFX pool (eliminating the iOS 12-<audio> wake() race). */
(function () {
  "use strict";

  const CHN = Number(window.CHAPTER_NUM) || 1;
  const SFX_BASE = "../../shared/sfx/";

  const CHAPTER_DEFS = {
    1: {
      total: 255.12,
      sfx: ["beat", "stamp", "exhale", "shutter", "scrape", "ring"],
      segs: [
        { src: "film/s1.mp4",  start: 0,      after: "breath" },
        { src: "film/s2.mp4",  start: 28.60,  after: "silence" },
        { src: "film/s2b.mp4", start: 76.20,  after: "wall" },
        { src: "film/s3.mp4",  start: 155.12, after: "mother" },
        { src: "film/s3b.mp4", start: 170.08, after: "photo" },
        { src: "film/s4.mp4",  start: 237.88, after: null }
      ]
    },
    2: {
      total: 100.41,
      sfx: ["ring", "pickup", "door", "flies", "riot"],
      segs: [
        { src: "film/c2s1.mp4", start: 0,    after: "call" },
        { src: "film/c2s2.mp4", start: 16.4, after: "locker" },
        { src: "film/c2s3.mp4", start: 61.0, after: "hide" },
        { src: "film/c2s4.mp4", start: 76.8, after: null }
      ]
    },
    3: {
      total: 217.04,
      sfx: ["stamp", "beat", "tick", "pickup", "bell", "inhale", "exhale"],
      segs: [
        { src: "film/c3s1.mp4", start: 0,      after: "truth" },
        { src: "film/c3s2.mp4", start: 22.6,   after: "look" },
        { src: "film/c3s3.mp4", start: 81.2,   after: "card" },
        { src: "film/c3s4.mp4", start: 130.2,  after: "bike" },
        { src: "film/c3s5.mp4", start: 185.4,  after: "bird" },
        { src: "film/c3s6.mp4", start: 195.24, after: null }
      ]
    },
    4: {
      total: 90.76,
      sfx: ["bubble", "underwater", "exhale", "flap", "scrape"],
      segs: [
        { src: "film/c4s1.mp4", start: 0,     after: "dive" },
        { src: "film/c4s2.mp4", start: 21.44, after: "candles" },
        { src: "film/c4s3.mp4", start: 27.64, after: "free" },
        { src: "film/c4s4.mp4", start: 53.64, after: "erase" },
        { src: "film/c4s5.mp4", start: 77.84, after: null }
      ]
    }
  };

  const MOMENTS = {
    breath: "m_breath", silence: "m_silence", wall: "m_wall", mother: "m_mother", photo: "m_photo",
    call: "m_call", locker: "m_locker", hide: "m_hide",
    truth: "m_truth", look: "m_look", breathe: "m_breathe", card: "m_card", bike: "m_bike", bird: "m_bird",
    dive: "m_dive", candles: "m_candles", free: "m_free", erase: "m_erase"
  };

  const DEF = CHAPTER_DEFS[CHN] || CHAPTER_DEFS[1];
  const TOTAL = DEF.total;
  const SEGS = DEF.segs;

  const $ = (id) => document.getElementById(id);
  const frame = $("frame");
  const ui = $("ui");
  const vids = [$("vA"), $("vB")];
  const ccBtn = $("cc");
  const bigEl = $("big");

  let cur = 0, segI = 0, navId = 0, playing = false, inInteraction = false, cleanup = null, lastCue = -1;
  const timers = new Set();
  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  }

  /* ---------- i18n helper ---------- */
  function currentLang() {
    return window.WABTSA_I18N ? WABTSA_I18N.getLang() : "en";
  }
  function t(key, ...args) {
    if (!window.WABTSA_I18N) return key;
    if (key === "w_count") {
      const n = Number(args[0]) || 0;
      return n === 1 ? WABTSA_I18N.t("chapters.ui.w_count_one") : WABTSA_I18N.t("chapters.ui.w_count_many", n);
    }
    if (key === "ph_rings") {
      const n = Number(args[0]) || 0;
      return n === 1 ? WABTSA_I18N.t("chapters.ui.ph_rings_one") : WABTSA_I18N.t("chapters.ui.ph_rings_many", n);
    }
    const v = WABTSA_I18N.t("chapters.ui." + key, ...args);
    return v !== "chapters.ui." + key ? v : key;
  }

  if (window.WABTSA_I18N && $("chapLang")) {
    WABTSA_I18N.mountSwitcher($("chapLang"));
  }

  /* ---------- Clean WebAudio SFX Engine (No <audio> pool / No iOS wake() race) ---------- */
  const snd = (() => {
    let ctx = null;
    let loading = false;
    const buffers = {};
    const activeNodes = new Set();
    let beatT = null, bpm = 70, ringT = null, riotNode = null, underNode = null;

    function ensureCtx() {
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (_) {}
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
      }
      if (ctx && ctx.state !== "running" && ctx.state !== "closed") {
        ctx.resume().catch(() => {});
      }
      return ctx;
    }

    function loadChapterSfx() {
      const c = ensureCtx();
      if (!c || loading) return;
      loading = true;
      DEF.sfx.forEach((name) => {
        fetch(SFX_BASE + name + ".mp3")
          .then((r) => r.arrayBuffer())
          .then((ab) => new Promise((ok, no) => c.decodeAudioData(ab, ok, no)))
          .then((buf) => { buffers[name] = buf; })
          .catch(() => {});
      });
    }

    function unlock() {
      const c = ensureCtx();
      if (!c) return;
      loadChapterSfx();
      try {
        const bf = c.createBuffer(1, 1, 22050);
        const s = c.createBufferSource();
        s.buffer = bf;
        s.connect(c.destination);
        s.start(0);
      } catch (_) {}
    }

    function playBuffer(name, vol = 1) {
      const c = ensureCtx();
      const buf = buffers[name];
      if (!c || !buf) return null;
      try {
        const src = c.createBufferSource();
        const gain = c.createGain();
        src.buffer = buf;
        gain.gain.value = vol;
        src.connect(gain).connect(c.destination);
        const rec = { name, src, gain };
        activeNodes.add(rec);
        src.onended = () => activeNodes.delete(rec);
        src.start(0);
        return rec;
      } catch (_) {
        return null;
      }
    }

    function stopNamed(name) {
      for (const rec of [...activeNodes]) {
        if (rec.name === name) {
          try { rec.src.stop(); } catch (_) {}
          activeNodes.delete(rec);
        }
      }
    }

    return {
      unlock,
      heart(on, r) {
        if (r) bpm = r;
        clearTimeout(beatT);
        beatT = null;
        if (!on) return;
        const loop = () => {
          playBuffer("beat", 0.95);
          beatT = setTimeout(loop, 60000 / bpm);
        };
        loop();
      },
      rate(r) { bpm = r; },
      exhale() { playBuffer("exhale"); },
      inhale() { playBuffer("inhale"); },
      tick() { playBuffer("tick", 0.85); },
      bell() { playBuffer("bell"); },
      bubble() { playBuffer("bubble"); },
      flap() { playBuffer("flap"); },
      stamp() { playBuffer("stamp"); },
      shutter() { playBuffer("shutter"); },
      scrape() { playBuffer("scrape", 0.9); },
      pickup() { playBuffer("pickup"); },
      creak() { playBuffer(CHN === 2 ? "door" : "creak"); },
      flies() { playBuffer("flies"); },
      underwater(on) {
        if (on) {
          stopNamed("underwater");
          underNode = playBuffer("underwater", 0.9);
        } else if (underNode && ctx) {
          const node = underNode;
          underNode = null;
          try {
            const now = ctx.currentTime;
            node.gain.gain.setValueAtTime(node.gain.gain.value, now);
            node.gain.gain.linearRampToValueAtTime(0, now + 0.35);
            setTimeout(() => { try { node.src.stop(); } catch (_) {} activeNodes.delete(node); }, 400);
          } catch (_) { stopNamed("underwater"); }
        } else {
          stopNamed("underwater");
        }
      },
      riot(on) {
        if (on) {
          stopNamed("riot");
          riotNode = playBuffer("riot", 1);
          return;
        }
        if (riotNode && ctx) {
          const node = riotNode;
          riotNode = null;
          try {
            const now = ctx.currentTime;
            node.gain.gain.setValueAtTime(node.gain.gain.value, now);
            node.gain.gain.linearRampToValueAtTime(0, now + 0.85);
            setTimeout(() => { try { node.src.stop(); } catch (_) {} activeNodes.delete(node); }, 900);
          } catch (_) { stopNamed("riot"); }
        } else {
          stopNamed("riot");
        }
      },
      ring(on, onEach) {
        clearTimeout(ringT);
        ringT = null;
        if (!on) {
          stopNamed("ring");
          return;
        }
        const loop = () => {
          playBuffer("ring");
          if (onEach) onEach();
          ringT = setTimeout(loop, 3200);
        };
        loop();
      },
      stopAll() {
        clearTimeout(beatT); beatT = null;
        clearTimeout(ringT); ringT = null;
        riotNode = null;
        underNode = null;
        for (const rec of [...activeNodes]) {
          try { rec.src.stop(); } catch (_) {}
        }
        activeNodes.clear();
      }
    };
  })();

  ["touchend", "click", "keydown", "mousedown"].forEach((ev) => {
    document.addEventListener(ev, () => snd.unlock(), { capture: true, passive: true });
  });

  /* ---------- Touch & Hold Helpers ---------- */
  let lastTouchAt = 0;
  function onTap(el, fn) {
    let startX = 0, startY = 0, moved = false;
    el.addEventListener("touchstart", (e) => {
      const t0 = e.changedTouches[0];
      startX = t0.clientX; startY = t0.clientY; moved = false;
    }, { passive: true });
    el.addEventListener("touchmove", (e) => {
      const t0 = e.changedTouches[0];
      if (Math.abs(t0.clientX - startX) > 12 || Math.abs(t0.clientY - startY) > 12) moved = true;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (moved) return;
      e.preventDefault();
      lastTouchAt = Date.now();
      fn(e);
    }, { passive: false });
    el.addEventListener("click", (e) => {
      if (Date.now() - lastTouchAt < 700) return;
      fn(e);
    });
  }

  function holdable(el, onDown, onUp) {
    const ts = (e) => { e.preventDefault(); onDown(e); };
    const te = (e) => { e.preventDefault(); onUp(); };
    const tc = () => onUp();
    const md = (e) => { if (e.button !== 0) return; onDown(e); };
    const mu = () => onUp();
    el.addEventListener("touchstart", ts, { passive: false });
    el.addEventListener("touchend", te, { passive: false });
    el.addEventListener("touchcancel", tc);
    el.addEventListener("mousedown", md);
    addEventListener("mouseup", mu);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchend", te);
      el.removeEventListener("touchcancel", tc);
      el.removeEventListener("mousedown", md);
      removeEventListener("mouseup", mu);
    };
  }

  /* ---------- Swipe / Tap Visual Hints ---------- */
  (() => {
    if (!ui) return;
    const DRAG = "canvas#cv, canvas.reveal, canvas.numcv";
    const TAP = ".water, .shoot, svg.veins";
    new MutationObserver(() => {
      const tgt = ui.querySelector(DRAG + ", " + TAP);
      if (!tgt || tgt._hinted) return;
      tgt._hinted = true;
      const h = document.createElement("div");
      h.className = "swipehint" + (tgt.matches(TAP) ? " tap" : "");
      h.innerHTML = "<i></i>";
      if (tgt.matches("canvas.numcv")) h.style.top = "20%";
      if (tgt.matches("svg.veins")) { h.style.left = "90.6%"; h.style.top = "88%"; }
      (tgt.closest(".wallbox") || ui).appendChild(h);
      const off = () => h.remove();
      tgt.addEventListener("pointerdown", off, { once: true });
      tgt.addEventListener("touchstart", off, { once: true, passive: true });
      tgt.addEventListener("click", off, { once: true });
    }).observe(ui, { childList: true, subtree: true });
  })();

  /* ---------- Timeline Markers & Scrubbing ---------- */
  function syncMarkerDone(uptoSeg) {
    SEGS.forEach((s, idx) => {
      if (!s.after) return;
      const m = $("mk-" + s.after);
      if (m) m.classList.toggle("done", idx < uptoSeg);
    });
  }

  function buildMarkers() {
    document.querySelectorAll(".mk").forEach((m) => m.remove());
    SEGS.forEach((s, i) => {
      if (!s.after) return;
      const at = SEGS[i + 1].start;
      const b = document.createElement("button");
      b.className = "mk";
      b.type = "button";
      b.id = "mk-" + s.after;
      b.style.left = (at / TOTAL * 100) + "%";
      b.innerHTML = "<span></span>";
      b.onclick = (e) => {
        e.stopPropagation();
        snd.unlock();
        $("cardStart").classList.add("off");
        $("cardEnd").classList.add("off");
        loadSeg(i, true);
        showControls();
      };
      $("tl").appendChild(b);
    });
  }
  buildMarkers();

  $("tl").addEventListener("click", (e) => {
    if (e.target.closest(".mk")) return;
    const r = $("tl").getBoundingClientRect();
    if (!r.width) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const targetG = pct * TOTAL;
    snd.unlock();
    $("cardStart").classList.add("off");
    $("cardEnd").classList.add("off");
    for (let k = 0; k < SEGS.length - 1; k++) {
      if (SEGS[k].after && Math.abs(targetG - SEGS[k + 1].start) <= 1.2) {
        loadSeg(k, true);
        showControls();
        return;
      }
    }
    let k = 0;
    for (let j = 0; j < SEGS.length; j++) {
      if (targetG >= SEGS[j].start) k = j;
    }
    loadSeg(k, false, Math.max(0, targetG - SEGS[k].start));
    showControls();
  });

  /* ---------- Language, Subtitles & Chapter Cards ---------- */
  function fillChapterCards() {
    if (!window.WABTSA_I18N) return;
    const m = `chapters.meta.${CHN}`;
    const eye = WABTSA_I18N.t(`${m}.eyebrow`);
    const title = WABTSA_I18N.t(`${m}.title`);
    const place = WABTSA_I18N.t(`${m}.place`);
    const note = WABTSA_I18N.t(`${m}.note`);
    const endEye = WABTSA_I18N.t(`${m}.endEye`);
    const endTitle = WABTSA_I18N.t(`${m}.endTitle`);
    const endNext = WABTSA_I18N.t(`${m}.endNext`);

    if ($("s_eye")) $("s_eye").textContent = eye;
    if ($("s_title")) $("s_title").textContent = title;
    if ($("s_place")) $("s_place").textContent = place;
    if ($("s_note")) $("s_note").textContent = note;
    if ($("e_eye")) $("e_eye").textContent = endEye;
    if ($("e_title")) $("e_title").innerHTML = endTitle;
    if ($("e_next")) $("e_next").textContent = endNext;
    document.title = `${title} · ${WABTSA_I18N.t("room.title")}`;
  }

  function applyLang() {
    fillChapterCards();
    document.querySelectorAll("[data-t]").forEach((el) => {
      const val = t(el.dataset.t);
      if (el.dataset.html) el.innerHTML = val;
      else el.textContent = val;
    });
    document.querySelectorAll(".mk").forEach((b) => {
      const k = MOMENTS[b.id.slice(3)];
      if (!k) return;
      const lbl = t(k);
      b.querySelector("span").textContent = lbl;
      b.setAttribute("aria-label", t("jump") + lbl);
    });
    const trBtn = $("toRoom");
    if (trBtn && window.WABTSA_I18N) trBtn.textContent = WABTSA_I18N.t("common.backToRoom");
    document.querySelectorAll("#cardEnd [data-room]").forEach((a) => {
      if (window.WABTSA_I18N) a.textContent = WABTSA_I18N.t("common.backToRoom");
    });
    lastCue = -1;
    setPlaying(playing);
    syncSubtitles();
  }

  function syncSubtitles() {
    if (!ccBtn || !bigEl) return;
    const allowed = window.WABTSA_I18N ? WABTSA_I18N.isCcAllowed() : false;
    const ccOn = window.WABTSA_I18N ? WABTSA_I18N.getCcEnabled() : false;
    ccBtn.hidden = !allowed;
    ccBtn.setAttribute("aria-pressed", ccOn ? "true" : "false");
    if (window.WABTSA_I18N) {
      ccBtn.setAttribute("aria-label", WABTSA_I18N.t("common.ccLabel"));
    }

    if (!allowed || !ccOn || inInteraction) {
      bigEl.classList.remove("on");
      lastCue = -1;
      return;
    }

    const g = gtime();
    const list = window.WABTSA_I18N ? WABTSA_I18N.cues(CHN) : [];
    const i = list.findIndex((c) => g >= c[0] && g < c[1]);
    if (i !== lastCue) {
      lastCue = i;
      if (i >= 0) bigEl.textContent = list[i][2];
    }
    bigEl.classList.toggle("on", i >= 0);
  }

  if (ccBtn) {
    ccBtn.onclick = () => {
      if (window.WABTSA_I18N) WABTSA_I18N.toggleCc();
      syncSubtitles();
      showControls();
    };
  }

  /* ---------- Playback Loop ---------- */
  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  function v() { return vids[cur]; }
  function gtime() { return SEGS[segI].start + (v().currentTime || 0); }

  function tick() {
    const g = gtime();
    $("fill").style.width = Math.min(100, Math.max(0, (g / TOTAL) * 100)) + "%";
    $("time").textContent = `${fmt(g)} / ${fmt(TOTAL)}`;
    syncSubtitles();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function preload(i) {
    const nv = vids[1 - cur];
    if (SEGS[i] && nv.getAttribute("src") !== SEGS[i].src) {
      nv.src = SEGS[i].src;
      nv.load();
    }
  }
  function setPlaying(p) {
    playing = p;
    $("play").textContent = p ? "❚❚" : "▶";
    $("play").setAttribute("aria-label", p ? t("pause") : t("play"));
  }

  function loadSeg(i, jumpToEndFrame, customTime) {
    const myNav = ++navId;
    vids.forEach((x) => { try { x.pause(); } catch (_) {} });
    setPlaying(false);
    endInteraction();
    segI = i;
    syncMarkerDone(i);
    const sameSrc = vids[cur].getAttribute("src") === SEGS[i].src;
    const targetV = sameSrc ? vids[cur] : vids[1 - cur];
    if (!sameSrc && targetV.getAttribute("src") !== SEGS[i].src) {
      targetV.src = SEGS[i].src;
      targetV.load();
    }
    const whenReady = (cb) => {
      if (targetV.readyState >= 2 && Number.isFinite(targetV.duration) && targetV.duration > 0) {
        cb();
        return;
      }
      const onEv = () => {
        if (myNav !== navId) { cleanupEv(); return; }
        if (targetV.readyState >= 2 && Number.isFinite(targetV.duration) && targetV.duration > 0) {
          cleanupEv();
          cb();
        }
      };
      const cleanupEv = () => {
        targetV.removeEventListener("loadedmetadata", onEv);
        targetV.removeEventListener("loadeddata", onEv);
        targetV.removeEventListener("canplay", onEv);
      };
      targetV.addEventListener("loadedmetadata", onEv);
      targetV.addEventListener("loadeddata", onEv);
      targetV.addEventListener("canplay", onEv);
    };

    whenReady(() => {
      if (myNav !== navId) return;
      if (targetV !== vids[cur]) {
        vids[cur].pause();
        vids[cur].classList.add("hide");
        targetV.classList.remove("hide");
        cur = 1 - cur;
      } else {
        targetV.pause();
        targetV.classList.remove("hide");
        vids[1 - cur].pause();
        vids[1 - cur].classList.add("hide");
      }
      if (jumpToEndFrame) {
        const targetTime = Math.max(0, targetV.duration - 0.08);
        const finishJump = () => {
          if (myNav !== navId) return;
          targetV.pause();
          setPlaying(false);
          onSegEnd(true);
        };
        if (Math.abs(targetV.currentTime - targetTime) < 0.04 && !targetV.seeking && targetV.readyState >= 2) {
          finishJump();
        } else {
          const onSeeked = () => {
            targetV.removeEventListener("seeked", onSeeked);
            if (myNav !== navId) return;
            if (targetV.readyState >= 2) finishJump();
            else targetV.addEventListener("loadeddata", finishJump, { once: true });
          };
          targetV.addEventListener("seeked", onSeeked);
          try { targetV.currentTime = targetTime; } catch (_) { finishJump(); }
        }
      } else {
        const startT = typeof customTime === "number" ? Math.max(0, Math.min(customTime, Math.max(0, targetV.duration - 0.12))) : 0;
        const startPlay = () => {
          if (myNav !== navId) return;
          targetV.muted = false;
          targetV.volume = 1;
          targetV.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
          preload(i + 1);
        };
        if (Math.abs(targetV.currentTime - startT) < 0.04 && !targetV.seeking) {
          startPlay();
        } else {
          targetV.addEventListener("seeked", startPlay, { once: true });
          try { targetV.currentTime = startT; } catch (_) { startPlay(); }
        }
      }
    });
  }

  vids.forEach((el) => {
    el.addEventListener("ended", () => {
      if (el === v() && !inInteraction && playing) onSegEnd(false);
    });
  });

  const inRoom = window.parent !== window;

  function onSegEnd(keepCtl) {
    setPlaying(false);
    if (keepCtl && document.body.classList.contains("show-ctl")) showControls();
    else hideControls();
    const a = SEGS[segI].after;
    if (a) {
      inInteraction = true;
      document.body.classList.add("inter");
      syncSubtitles();
      INTERACT[a]();
    } else {
      end();
    }
  }

  function next() {
    if (!inInteraction) return;
    const done = SEGS[segI].after;
    if (done && $("mk-" + done)) $("mk-" + done).classList.add("done");
    loadSeg(segI + 1);
  }

  function end() {
    const n = myNumber(false);
    if (n && $("endnumv") && $("endnum")) {
      $("endnumv").textContent = n;
      $("endnum").hidden = false;
    }
    if (inRoom) {
      try { window.parent.postMessage({ type: "ld:ended", ch: CHN }, "*"); } catch (_) {}
      return;
    }
    $("cardEnd").classList.remove("off");
  }

  function endInteraction() {
    timers.forEach(clearTimeout);
    timers.clear();
    if (cleanup) {
      try { cleanup(); } catch (_) {}
      cleanup = null;
    }
    ui.querySelectorAll("video, audio").forEach((m) => {
      try { m.pause(); m.removeAttribute("src"); m.load(); m.onended = null; m.onerror = null; } catch (_) {}
    });
    snd.stopAll();
    ui.innerHTML = "";
    frame.classList.remove("gray");
    inInteraction = false;
    document.body.classList.remove("inter");
  }

  $("play").onclick = () => {
    if (inInteraction) return;
    snd.unlock();
    if (v().paused) {
      v().muted = false;
      v().volume = 1;
      v().play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v().pause();
      setPlaying(false);
    }
  };

  $("go").onclick = () => {
    snd.unlock();
    $("cardStart").classList.add("off");
    segI = 0;
    cur = 0;
    vids[0].src = SEGS[0].src;
    vids[0].classList.remove("hide");
    vids[1].classList.add("hide");
    vids[0].currentTime = 0;
    vids[0].muted = false;
    vids[0].volume = 1;
    vids[0].play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    preload(1);
  };

  if ($("again")) {
    $("again").onclick = () => {
      $("cardStart").classList.add("off");
      $("cardEnd").classList.add("off");
      document.querySelectorAll(".mk").forEach((m) => m.classList.remove("done"));
      snd.unlock();
      loadSeg(0);
    };
  }

  /* ---------- Auto-show/hide Controls & Fullscreen ---------- */
  const DEV_MODE = /[?&]dev=1\b/.test(location.search) || !!(inRoom && window.parent.LD && window.parent.LD.DEV);
  const IS_NATIVE_APP = !!((window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
    || (window.top && window.top !== window && window.top.Capacitor && window.top.Capacitor.isNativePlatform && window.top.Capacitor.isNativePlatform())
    || location.protocol === "capacitor:" || /; wv\)/.test(navigator.userAgent));

  if (inRoom || !DEV_MODE) {
    const trEl = $("toRoom");
    if (trEl) trEl.style.display = "none";
  }

  document.querySelectorAll("[data-room]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (inRoom) {
        try { window.parent.postMessage({ type: "ld:back", ch: CHN }, "*"); } catch (_) {}
      } else {
        location.href = "../../index.html" + (location.search || "");
      }
    });
  });

  let ctlTimer = null, lastPaneTap = 0;
  function notifyCtl(on) {
    if (!inRoom) return;
    try { window.parent.postMessage({ type: "ld:ctl", on: !!on, ch: CHN }, "*"); } catch (_) {}
  }
  function hideControls() {
    clearTimeout(ctlTimer);
    ctlTimer = null;
    document.body.classList.remove("show-ctl");
    notifyCtl(false);
  }
  function showControls() {
    if (document.body.classList.contains("ld-wait") || !$("cardStart").classList.contains("off") || !$("cardEnd").classList.contains("off")) return;
    document.body.classList.add("show-ctl");
    notifyCtl(true);
    clearTimeout(ctlTimer);
    ctlTimer = setTimeout(hideControls, 3000);
  }

  (() => {
    const stg = document.querySelector(".stage");
    function paneTap(e) {
      if (e.target.closest(".ctl,.top,.card,button,a,input,textarea,.wallbox,.veins,.water,.reveal,.numcv,.lang-switch")) return;
      const now = Date.now();
      if (now - lastPaneTap < 420) return;
      lastPaneTap = now;
      if (document.body.classList.contains("show-ctl")) hideControls();
      else showControls();
    }
    if (stg) {
      stg.addEventListener("pointerup", (e) => { if (e.pointerType === "mouse" && e.button !== 0) return; paneTap(e); });
      stg.addEventListener("click", paneTap);
    }
    document.querySelectorAll(".ctl,.top").forEach((bar) => {
      bar.addEventListener("pointerdown", () => { if (document.body.classList.contains("show-ctl")) showControls(); });
      bar.addEventListener("click", () => { if (document.body.classList.contains("show-ctl")) showControls(); });
    });
    addEventListener("keydown", (e) => {
      if (e.code === "Space" && !inInteraction && !/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || "") && $("cardStart").classList.contains("off") && $("cardEnd").classList.contains("off")) {
        e.preventDefault();
        $("play").click();
        showControls();
      }
    });
  })();

  let updFsLabel = () => {};
  (() => {
    const b = $("fs");
    if (!b || IS_NATIVE_APP) return;
    let d = document, el = d.documentElement;
    try { if (window.top && window.top.document) { d = window.top.document; el = d.documentElement; } } catch (_) {}
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    const ext = d.exitFullscreen || d.webkitExitFullscreen;
    if (!(d.fullscreenEnabled || d.webkitFullscreenEnabled) || !req) return;
    b.hidden = false;
    const isFs = () => d.fullscreenElement || d.webkitFullscreenElement;
    updFsLabel = () => {
      const key = isFs() ? "common.exitFullScreen" : "common.fullScreen";
      b.textContent = window.WABTSA_I18N ? WABTSA_I18N.t(key) : (isFs() ? "✕ Exit full screen" : "⛶ Full screen");
    };
    b.addEventListener("click", () => {
      try {
        if (isFs()) ext.call(d);
        else {
          const p = req.call(el);
          if (p && p.catch) p.catch(() => {});
          try { const o = screen.orientation; if (o && o.lock) o.lock("landscape").catch(() => {}); } catch (_) {}
        }
      } catch (_) {}
    });
    d.addEventListener("fullscreenchange", updFsLabel);
    d.addEventListener("webkitfullscreenchange", updFsLabel);
    updFsLabel();
  })();

  /* ---------- Sam's Voice (Active Language Only — No Hardcoded Farsi Duplicates) ---------- */
  function voice(lines) {
    let box = ui.querySelector(".voice");
    if (box) box.remove();
    if (!lines) return 0;
    box = document.createElement("div");
    box.className = "voice";
    ui.appendChild(box);
    const p = document.createElement("p");
    box.appendChild(p);
    const words = lines.split(" ");
    let i = 0;
    words.forEach((w, k) => {
      const s = document.createElement("span");
      s.className = "w";
      s.textContent = w + (k < words.length - 1 ? " " : "");
      p.appendChild(s);
    });
    const spans = [...p.children];
    const step = () => {
      if (i < spans.length) {
        spans[i++].classList.add("on");
        later(step, 260 + Math.min(260, spans[i - 1].textContent.length * 22));
      }
    };
    step();
    return words.length * 380;
  }

  /* ---------- Viewer's Number for the Yellow Card ---------- */
  function myNumber(make) {
    let n = null;
    try {
      n = localStorage.getItem("wabtsa-number");
      if (n && n.startsWith("V-1999-")) {
        n = n.replace("V-1999-", "V-1997-");
        localStorage.setItem("wabtsa-number", n);
      }
    } catch (_) {}
    if (!n && make) {
      n = "V-1997-" + String(Math.floor(1000 + Math.random() * 8999));
      try { localStorage.setItem("wabtsa-number", n); } catch (_) {}
    }
    return n;
  }

  /* ---------- Shared Cell Wall (Chapter 1) ---------- */
  const wallStore = (() => {
    let db = null, user = null, myId = null, lines = [], listeners = new Set(), canWrite = null, started = false;
    async function start() {
      if (started) return;
      started = true;
      try { db = await window.claude?.use?.("db"); user = await window.claude?.use?.("user"); } catch (_) { db = null; }
      if (!db) return;
      try { myId = user ? await user.id() : null; } catch (_) {}
      try { canWrite = user ? await user.can("data.write") : null; } catch (_) {}
      db.collection("wall").orderBy("at", "desc").limit(120).onSnapshot((s) => {
        lines = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => typeof x.text === "string");
        listeners.forEach((f) => f(lines));
      }, () => {});
    }
    async function add(text) {
      if (!db || !myId || canWrite === false) return false;
      try {
        await db.doc("wall/" + myId).set({ text: text.slice(0, 34), at: Date.now() });
        return true;
      } catch (_) {
        canWrite = false;
        return false;
      }
    }
    return {
      start,
      add,
      on(f) { listeners.add(f); f(lines); return () => listeners.delete(f); },
      get lines() { return lines; },
      get myId() { return myId; }
    };
  })();
  if (CHN === 1) wallStore.start();

  function spotFor(id) {
    let h = 2166136261;
    for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    const r = () => ((h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) % 1000) / 1000;
    const Z = [[8, 52, 14, 4], [52, 28, 53, 4], [4, 22, 77, 9]];
    const z = Z[Math.floor(r() * Z.length)];
    return { x: z[0] + r() * z[1], y: z[2] + r() * z[3], rot: -7 + r() * 10 };
  }

  /* ============================================================================
     INTERACTIVE MOMENTS (Chapters 1–4)
     ============================================================================ */
  const INTERACT = {
    /* CH1 · 1 · HOLD YOUR BREATH */
    breath() {
      const MAX = 12, C = 2 * Math.PI * 46;
      ui.insertAdjacentHTML("beforeend", `<div class="vig" id="vig"></div>
        <button class="hold pulse" id="hold" type="button" aria-label="${t("b_aria")}">
          <svg viewBox="0 0 100 100"><circle class="base" cx="50" cy="50" r="46" fill="none" stroke="#ece8de" stroke-width="2"/><circle id="arc" cx="50" cy="50" r="46" fill="none" stroke="#D6A93E" stroke-width="5" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
          <span class="lbl" id="hl">${t("b_lbl")}</span>
        </button>
        <div class="readout" id="ro"></div>
        <div class="stamp" id="stamp">${t("b_stamp")}</div>
        <div class="ask" id="ask">${t("b_ask")}</div>`);
      const btn = $("hold"), arc = $("arc"), vig = $("vig"), ro = $("ro");
      let held = 0, holding = false, raf = 0, last = performance.now(), done = false;
      function loop(tm) {
        const dt = (tm - last) / 1000; last = tm;
        if (holding) {
          held = Math.min(MAX, held + dt);
          const p = held / MAX;
          arc.style.strokeDashoffset = C * (1 - p);
          vig.style.setProperty("--v", p);
          snd.rate(70 + p * 80);
          ro.textContent = held.toFixed(1) + " s";
          ro.classList.add("on");
          if (held >= MAX) return finish();
        }
        raf = requestAnimationFrame(loop);
      }
      function down(e) {
        if (done || holding) return;
        e.preventDefault();
        holding = true;
        btn.classList.remove("pulse");
        $("hl").textContent = "…";
        $("ask").hidden = true;
        snd.heart(true, 70);
      }
      function up() { if (done || !holding) return; finish(); }
      function finish() {
        done = true; holding = false; snd.heart(false); snd.exhale(); cancelAnimationFrame(raf); btn.hidden = true;
        const secFmt = held.toFixed(1).replace(".", currentLang() === "nl" ? "," : ".");
        ro.textContent = t("b_held", secFmt);
        later(() => { $("stamp").classList.add("on"); snd.stamp(); frame.classList.add("shake"); later(() => frame.classList.remove("shake"), 400); }, 700);
        later(() => { vig.style.setProperty("--v", 0); next(); }, 3400);
      }
      const offHold = holdable(btn, down, up);
      const kd = (e) => { if (e.code === "Space" && !e.repeat) down(e); };
      const ku = (e) => { if (e.code === "Space") up(); };
      addEventListener("keydown", kd); addEventListener("keyup", ku);
      raf = requestAnimationFrame(loop);
      cleanup = () => { cancelAnimationFrame(raf); snd.heart(false); offHold(); removeEventListener("keydown", kd); removeEventListener("keyup", ku); };
    },

    /* CH1 · 2 · THE INTERROGATION */
    silence() {
      ui.insertAdjacentHTML("beforeend", `<div class="dim on" style="background:rgba(0,0,0,.55)"></div>
        <form class="answer" id="af"><label for="ans">${t("q_label")}</label>
        <textarea id="ans" maxlength="160" placeholder="${t("q_ph")}" autocomplete="off"></textarea>
        <div class="acts"><button class="btn" type="submit">${t("q_answer")}</button><button class="ghost" id="quiet" type="button">${t("q_quiet")}</button></div></form>`);
      const ta = $("ans");
      if (!matchMedia("(pointer:coarse)").matches) ta.focus({ preventScroll: true });
      let idle = later(() => finish(""), 25000);
      ta.addEventListener("input", () => { clearTimeout(idle); timers.delete(idle); idle = later(() => finish(ta.value), 25000); });
      $("quiet").onclick = () => finish("");
      $("af").onsubmit = (e) => { e.preventDefault(); finish(ta.value); };
      let done = false;
      function finish(text) {
        if (done) return;
        done = true;
        text = text.trim();
        $("af").remove();
        if (!text) { later(next, 600); return; }
        const box = document.createElement("div"); box.className = "said"; ui.appendChild(box);
        [...text].forEach((ch) => { const s = document.createElement("span"); s.className = "c"; s.textContent = ch; box.appendChild(s); });
        const cs = [...box.children];
        const per = Math.max(18, Math.min(60, 2600 / cs.length));
        cs.forEach((c, i) => later(() => { c.classList.add("x"); if (i % 4 === 0) snd.scrape(); }, 500 + i * per));
        later(() => box.classList.add("gone"), 900 + cs.length * per + 600);
        later(next, 900 + cs.length * per + 2200);
      }
    },

    /* CH1 · 3 · THE CELL WALL (Farsi sub-lines removed — uses active language only) */
    wall() {
      ui.insertAdjacentHTML("beforeend", `<div class="dim" id="dim"></div>
        <div class="wallbox" id="wb"><img src="pages/p10.jpg" alt="${t("w_alt")}"><div class="lines" id="wl"></div><canvas id="cv" aria-label="${t("w_canvas")}"></canvas></div>
        <div class="wallcount" id="wc"></div>
        <div class="ask" id="ask">${t("w_ask")}</div>`);
      requestAnimationFrame(() => { $("dim").classList.add("on"); $("wb").classList.add("on"); });
      voice(t("w_v1"));
      const wb = $("wb"), wl = $("wl"), cv = $("cv"), ctx = cv.getContext("2d");
      function drawLines(lines) {
        const keep = wl.querySelector(".mine");
        wl.textContent = "";
        if (keep) wl.appendChild(keep);
        lines.forEach((l) => {
          if (l.id === wallStore.myId && keep) return;
          const s = spotFor(l.id);
          const d = document.createElement("div");
          d.className = "scratch";
          d.textContent = l.text;
          d.style.left = s.x + "%";
          d.style.top = s.y + "%";
          d.style.transform = `rotate(${s.rot}deg)`;
          wl.appendChild(d);
        });
        const n = lines.length;
        const wc = $("wc");
        if (wc) wc.textContent = n ? t("w_count", n) : "";
      }
      const off = wallStore.on(drawLines);
      let ready = false, downP = false, lastP = null, revealed = false, moves = 0, brush = 30;
      later(() => {
        const r = wb.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
        cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.scale(dpr, dpr); brush = Math.max(24, r.width * 0.1);
        ctx.fillStyle = "#0b0c0b"; ctx.fillRect(0, 0, r.width, r.height);
        for (let k = 0; k < 2200; k++) {
          ctx.fillStyle = `rgba(${(38 + Math.random() * 30) | 0},${(38 + Math.random() * 28) | 0},${(34 + Math.random() * 20) | 0},${Math.random() * 0.5})`;
          const z = Math.random() * 14;
          ctx.fillRect(Math.random() * r.width, Math.random() * r.height, z, z * 0.6);
        }
        ctx.globalCompositeOperation = "destination-out";
        ready = true;
      }, 60);
      function rub(x, y) {
        if (!ready) return;
        ctx.lineCap = "round"; ctx.lineWidth = brush;
        ctx.beginPath(); ctx.moveTo(lastP ? lastP[0] : x, lastP ? lastP[1] : y); ctx.lineTo(x, y); ctx.stroke();
        lastP = [x, y];
        if (++moves % 6 === 0) snd.scrape();
        if (moves % 20 === 0) check();
      }
      const pos = (e) => { const q = cv.getBoundingClientRect(); return [e.clientX - q.left, e.clientY - q.top]; };
      cv.onpointerdown = (e) => { downP = true; lastP = null; try { cv.setPointerCapture(e.pointerId); } catch (_) {} rub(...pos(e)); };
      cv.onpointermove = (e) => { if (downP) rub(...pos(e)); };
      cv.onpointerup = cv.onpointercancel = () => { downP = false; lastP = null; };
      function check() {
        if (revealed) return;
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let c = 0, n = 0;
        for (let k = 3; k < d.length; k += 4 * 97) { n++; if (d[k] < 40) c++; }
        if (c / n > 0.45) reveal();
      }
      function reveal() {
        revealed = true;
        cv.style.transition = "opacity 1.6s"; cv.style.opacity = 0; cv.style.pointerEvents = "none";
        $("ask").hidden = true; $("wc").classList.add("on");
        const ms = voice(t("w_v2"));
        later(() => {
          const box = ui.querySelector(".voice"); if (box) box.remove();
          ui.insertAdjacentHTML("beforeend", `<form class="write" id="wf"><p>${t("w_q")}</p><input id="wline" maxlength="34" autocomplete="off" placeholder="${t("w_ph")}" aria-label="${t("w_line")}"><button class="btn" type="submit">${t("w_btn")}</button><small>${t("w_note")}</small></form>`);
          $("wf").onsubmit = async (e) => {
            e.preventDefault();
            const line = $("wline").value.trim();
            if (!line) { $("wline").focus(); return; }
            $("wf").remove();
            const a = document.createElement("div");
            a.className = "scratch mine";
            a.textContent = line;
            a.style.fontSize = Math.min(46, Math.max(18, wb.clientWidth * 0.1)) + "px";
            wl.appendChild(a);
            for (let k = 0; k < 8; k++) later(snd.scrape, k * 120);
            requestAnimationFrame(() => a.classList.add("on"));
            try { localStorage.setItem("wabtsa-line", line); } catch (_) {}
            const saved = await wallStore.add(line);
            if (!saved) { const wc = $("wc"); if (wc) wc.textContent = t("w_fail"); }
            later(next, 4200);
          };
          if (!matchMedia("(pointer:coarse)").matches) $("wline").focus({ preventScroll: true });
        }, Math.max(2600, ms));
      }
      cleanup = () => off();
    },

    /* CH1 · 4 · MOTHER ("مادر…" removed per Q3) */
    mother() {
      ui.insertAdjacentHTML("beforeend", `<button class="phone" id="ph" type="button" aria-label="${t("ph_aria")}">${t("ph_hold")}</button>
        <div class="ask" id="ask">${t("ph_ask")}</div>`);
      const ph = $("ph");
      let calling = false, rings = 0, done = false;
      onTap(ph, () => {
        if (done) return;
        if (!calling) {
          calling = true;
          snd.unlock();
          ph.classList.add("ringing");
          ph.innerHTML = t("ph_calling");
          $("ask").textContent = t("ph_hang");
          snd.ring(true, () => {
            rings++;
            ph.innerHTML = t("ph_calling") + `<span class="rc">${rings}</span>`;
            if (navigator.vibrate) { try { navigator.vibrate(120); } catch (_) {} }
            if (rings >= 4) later(stop, 1800);
          });
        } else {
          stop();
        }
      });
      function stop() {
        if (done) return;
        done = true; calling = false; snd.ring(false); ph.classList.remove("ringing");
        ph.innerHTML = rings ? t("ph_rings", rings) : t("ph_none");
        $("ask").hidden = true;
        later(next, 2400);
      }
      cleanup = () => { snd.ring(false); };
    },

    /* CH1 · 5 · THE PHOTO (Yellow Card) */
    photo() {
      frame.classList.add("gray");
      ui.insertAdjacentHTML("beforeend", `<div class="finder" id="fd"><i></i><i></i><i></i><i></i><span>● REC</span></div>
        <button class="shoot" id="shoot" type="button" aria-label="${t("f_aria")}"></button><div class="flash" id="fl"></div>
        <div class="ask" id="ask">${t("f_ask")}</div>`);
      onTap($("shoot"), () => {
        $("shoot").remove(); $("ask").hidden = true; snd.shutter(); $("fl").classList.add("go"); frame.classList.remove("gray"); $("fd").style.opacity = 0;
        const num = myNumber(true);
        ui.insertAdjacentHTML("beforeend", `<div class="ycard" id="yc" role="img" aria-label="${t("y_aria", num)}"><canvas id="ycp" width="300" height="400"></canvas>
          <div class="info"><div><div class="lab">${t("y_name")}</div><div class="name">Sam</div></div><div><div class="lab">${t("y_num")}</div><div class="num">${num}</div></div></div></div>`);
        const drawPhoto = () => {
          try {
            const c = $("ycp").getContext("2d"), vv = v(), vw = vv.videoWidth || 1280, vh = vv.videoHeight || 720;
            const sw = vh * 0.75, sx = (vw - sw) / 2;
            c.drawImage(vv, sx, 0, sw, vh, 0, 0, 300, 400);
          } catch (_) {}
        };
        if (v().readyState >= 2 && !v().seeking) drawPhoto();
        else v().addEventListener("seeked", drawPhoto, { once: true });
        later(() => $("yc").classList.add("on"), 900);
        later(() => voice(t("f_v")), 1500);
        later(next, 10500);
      });
    },

    /* CH2 · 1 · CALLING HOME */
    call() {
      ui.insertAdjacentHTML("beforeend", `<video class="lockclip" id="hc" src="film/home.mp4" muted playsinline preload="auto" aria-label="${t("c_video_aria")}"></video><button class="phone" id="ph" type="button" aria-label="${t("c_aria")}">${t("c_hold")}</button>
        <div class="ask" id="ask">${t("c_ask")}</div>`);
      const ph = $("ph"), hc = $("hc");
      let calling = false, rings = 0, done = false, went = false;
      const go = () => { if (went) return; went = true; next(); };
      onTap(ph, () => {
        if (calling || done) return;
        calling = true; snd.unlock();
        try { hc.play().then(() => { if (!done) hc.pause(); }).catch(() => {}); } catch (_) {}
        ph.classList.add("ringing"); ph.innerHTML = t("c_calling"); $("ask").hidden = true; voice(t("c_ring"));
        snd.ring(true, () => {
          rings++;
          ph.innerHTML = t("c_calling") + `<span class="rc">${rings} / 3</span>`;
          if (navigator.vibrate) { try { navigator.vibrate(120); } catch (_) {} }
          if (rings >= 3) later(connect, 1400);
        });
      });
      function connect() {
        done = true; snd.ring(false); snd.pickup(); ph.classList.remove("ringing"); ph.innerHTML = t("c_conn"); ph.style.borderColor = "var(--ochre)";
        later(() => {
          const vb = ui.querySelector(".voice"); if (vb) vb.remove();
          ph.style.transition = "opacity .6s"; ph.style.opacity = 0;
          hc.currentTime = 0; hc.classList.add("on");
          const p = hc.play(); if (p && p.catch) p.catch(() => {});
          hc.onended = () => later(go, 700);
          later(go, 11500);
        }, 1100);
      }
      cleanup = () => { snd.ring(false); };
    },

    /* CH2 · 2 · THE LOCKER / ROOM */
    locker() {
      const num = myNumber(true);
      ui.insertAdjacentHTML("beforeend", `<div class="dim" id="dim"></div>
        <button class="door" id="door" type="button" aria-label="${t("l_open")}"><span class="plate"><small>${t("l_door")}</small><b>${num}</b></span><span class="knob"></span></button>
        <video class="lockclip" id="lc" src="film/locker.mp4" muted playsinline preload="auto" aria-label="${t("l_video_aria")}"></video>
        <div class="ask" id="ask">${t("l_ask")}</div>`);
      requestAnimationFrame(() => $("dim").classList.add("on"));
      const lc = $("lc");
      let went = false, opened = false;
      const go = () => { if (went) return; went = true; next(); };
      onTap($("door"), () => {
        if (opened) return;
        opened = true;
        const d = $("door"); d.classList.add("open"); d.disabled = true; $("ask").hidden = true; snd.creak();
        try { lc.play().then(() => { if (!lc.classList.contains("on")) lc.pause(); }).catch(() => {}); } catch (_) {}
        later(() => {
          lc.currentTime = 0; lc.classList.add("on");
          const p = lc.play(); if (p && p.catch) p.catch(() => {});
          later(() => voice(t("l_v")), 5600);
          later(() => snd.flies(), 9300);
          lc.onended = () => later(go, 2200);
          later(go, 17500);
        }, 1100);
      });
      cleanup = () => { try { lc.pause(); lc.removeAttribute("src"); lc.load(); } catch (_) {} };
    },

    /* CH2 · 3 · THAT NIGHT */
    hide() {
      ui.insertAdjacentHTML("beforeend", `<div class="vig" id="vig" style="--v:0"></div>
        <button class="hold pulse" id="hold" type="button" aria-label="${t("h_aria")}"><svg viewBox="0 0 100 100"><circle class="base" cx="50" cy="50" r="46" fill="none" stroke="#ece8de" stroke-width="2"/></svg><span class="lbl" id="hl">${t("h_hold")}</span></button>
        <div class="ask" id="ask">${t("h_ask")}</div>`);
      const btn = $("hold"), vig = $("vig");
      let holding = false, held = 0, raf = 0, last = performance.now(), done = false, said = false;
      function loop(tm) {
        const dt = (tm - last) / 1000; last = tm;
        if (holding) {
          held += dt;
          vig.style.setProperty("--v", Math.min(1, held / 2));
          if (held > 1.2 && !said) { said = true; voice(t("h_v")); }
          if (held >= 9) return finish();
        }
        raf = requestAnimationFrame(loop);
      }
      function down(e) {
        if (done || holding) return;
        e.preventDefault();
        holding = true; btn.classList.remove("pulse"); $("hl").textContent = "…"; $("ask").hidden = true; snd.riot(true);
      }
      function up() { if (done || !holding) return; finish(); }
      function finish() {
        done = true; holding = false; cancelAnimationFrame(raf); snd.riot(false); btn.hidden = true;
        later(() => { vig.style.setProperty("--v", 0); next(); }, 1800);
      }
      const offHold = holdable(btn, down, up);
      const kd = (e) => { if (e.code === "Space" && !e.repeat) down(e); };
      const ku = (e) => { if (e.code === "Space") up(); };
      addEventListener("keydown", kd); addEventListener("keyup", ku);
      raf = requestAnimationFrame(loop);
      cleanup = () => { cancelAnimationFrame(raf); snd.riot(false); offHold(); removeEventListener("keydown", kd); removeEventListener("keyup", ku); };
    },

    /* CH3 · 1 · LIE OR TELL THE TRUTH */
    truth() {
      ui.insertAdjacentHTML("beforeend", `<div class="choice" id="ch"><button class="ghost" id="tl_lie" type="button">${t("tr_lie")}</button><button class="ghost" id="tl_true" type="button">${t("tr_true")}</button></div>
        <div class="ask" id="ask">${t("tr_ask")}</div>`);
      let done = false;
      const pick = (lie) => {
        if (done) return;
        done = true; snd.stamp(); $("ch").classList.add("gone"); $("ask").hidden = true;
        const ms = voice(t(lie ? "tr_vlie" : "tr_vtrue"));
        later(next, Math.max(4200, ms + 1800));
      };
      onTap($("tl_lie"), () => pick(true));
      onTap($("tl_true"), () => pick(false));
    },

    /* CH3 · 2 · AMSTERDAM STATION */
    look() {
      ui.insertAdjacentHTML("beforeend", `<canvas class="reveal" id="rv" aria-label="${t("lk_aria")}"></canvas><div class="ask" id="ask">${t("lk_ask")}</div>`);
      const cv = $("rv"), ctx = cv.getContext("2d");
      let ready = false, downP = false, lastP = null, brush = 40, done = false, W = 1, H = 1;
      const GX = 16, GY = 9, seen = new Set();
      const drawFrozenFrame = () => {
        const r = frame.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
        W = r.width || 1; H = r.height || 1;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        brush = Math.max(36, W * 0.12);
        try { ctx.drawImage(v(), 0, 0, W, H); } catch (_) { ctx.fillStyle = "#333"; ctx.fillRect(0, 0, W, H); }
        ctx.globalCompositeOperation = "destination-out";
        ready = true;
      };
      later(() => {
        const vv = v();
        if (vv.readyState >= 2 && !vv.seeking) drawFrozenFrame();
        else vv.addEventListener("seeked", drawFrozenFrame, { once: true });
      }, 60);
      function mark(x, y) {
        const rx = brush / 2;
        for (let gx = 0; gx < GX; gx++) {
          for (let gy = 0; gy < GY; gy++) {
            const cx = (gx + 0.5) * W / GX, cy = (gy + 0.5) * H / GY;
            if (Math.hypot(cx - x, cy - y) < rx + W / GX * 0.3) seen.add(gx + "," + gy);
          }
        }
      }
      function rub(x, y) {
        if (!ready || done) return;
        ctx.lineCap = "round"; ctx.lineWidth = brush;
        ctx.beginPath(); ctx.moveTo(lastP ? lastP[0] : x, lastP ? lastP[1] : y); ctx.lineTo(x + 0.1, y); ctx.stroke();
        if (lastP) {
          const n = Math.ceil(Math.hypot(x - lastP[0], y - lastP[1]) / (brush / 3));
          for (let i = 1; i <= n; i++) mark(lastP[0] + (x - lastP[0]) * i / n, lastP[1] + (y - lastP[1]) * i / n);
        } else {
          mark(x, y);
        }
        lastP = [x, y];
        if (seen.size / (GX * GY) > 0.55) finish();
      }
      const pos = (e) => { const q = cv.getBoundingClientRect(); return [e.clientX - q.left, e.clientY - q.top]; };
      cv.onpointerdown = (e) => { downP = true; lastP = null; try { cv.setPointerCapture(e.pointerId); } catch (_) {} rub(...pos(e)); $("ask").hidden = true; };
      cv.onpointermove = (e) => { if (downP) rub(...pos(e)); };
      cv.onpointerup = cv.onpointercancel = () => { downP = false; lastP = null; };
      function finish() {
        done = true; cv.classList.add("gone");
        const ms = voice(t("lk_v"));
        later(next, Math.max(4600, ms + 2000));
      }
    },

    /* CH3 · 3 · RED LIGHT CARD */
    card() {
      const MAX = 3.5;
      ui.insertAdjacentHTML("beforeend", `<div class="redlight" id="rl"></div>
        <button class="card3" id="cd" type="button" aria-label="${t("cd_aria")}"><img src="img/card.jpg" alt="" draggable="false"><span class="lbl" id="cdl">${t("cd_hold")}</span></button>
        <div class="ask" id="ask">${t("cd_ask")}</div>`);
      voice(t("cd_v1"));
      const c = $("cd"), rl = $("rl");
      let holding = false, held = 0, raf = 0, last = performance.now(), done = false, burned = false;
      function loop(tm) {
        const dt = (tm - last) / 1000; last = tm;
        if (holding) {
          held = Math.min(MAX, held + dt);
          const h = held / MAX;
          c.style.setProperty("--h", h); rl.style.setProperty("--h", h); snd.rate(80 + h * 70);
          if (h > 0.6 && !burned) {
            burned = true;
            const box = ui.querySelector(".voice"); if (box) box.remove();
            voice(t("cd_burn"));
          }
          if (held >= MAX) return letGo();
        }
        raf = requestAnimationFrame(loop);
      }
      function down(e) {
        if (done || holding) return;
        e.preventDefault();
        holding = true; c.classList.add("held"); $("cdl").textContent = ""; $("ask").hidden = true; snd.heart(true, 80);
      }
      function letGo() {
        if (done) return;
        done = true; holding = false; cancelAnimationFrame(raf); snd.heart(false);
        c.classList.remove("held"); c.classList.add("away"); rl.style.setProperty("--h", 0);
        const box = ui.querySelector(".voice"); if (box) box.remove();
        later(() => { const ms = voice(t("cd_v2")); later(next, Math.max(4200, ms + 1800)); }, 700);
      }
      function up() { if (done || !holding) return; letGo(); }
      const offHold = holdable(c, down, up);
      const kd = (e) => { if (e.code === "Space" && !e.repeat) down(e); };
      const ku = (e) => { if (e.code === "Space") up(); };
      addEventListener("keydown", kd); addEventListener("keyup", ku);
      raf = requestAnimationFrame(loop);
      cleanup = () => { cancelAnimationFrame(raf); snd.heart(false); offHold(); removeEventListener("keydown", kd); removeEventListener("keyup", ku); };
    },

    /* CH3 · 4 · THE CITY'S VEINS (Canal Map) */
    bike() {
      const SPOTS = [
        { id: "dam", x: 80, y: 27, n: "Dam" },
        { id: "jor", x: 22, y: 40, n: "Jordaan" },
        { id: "von", x: 40, y: 81, n: "Vondelpark" },
        { id: "wat", x: 110, y: 47, n: "Waterlooplein" }
      ];
      const ring = (r) => `M${80 - r} 15 A${r} ${r * 1.2} 0 0 0 ${80 + r} 15`;
      ui.insertAdjacentHTML("beforeend", `<div class="dim" id="dim"></div>
        <svg class="veins" id="vn" viewBox="0 0 160 90" preserveAspectRatio="none" aria-label="${t("bk_aria")}">
          <path d="M0 11 Q40 8 80 11 T160 10" class="ij"/>
          ${[18, 28, 38, 50].map((r) => `<path d="${ring(r)}" class="canal"/>`).join("")}
          <path d="M90 32 Q100 50 104 62 T118 90" class="canal amstel"/>
          <ellipse cx="40" cy="81" rx="8.5" ry="3" class="park"/>
          <rect x="146" y="80" width="12" height="5.5" rx="1" class="cs"/><text x="152" y="78.4" class="lab on">AZC</text>
          <polyline id="trail" class="trail" points=""/>
          ${SPOTS.map((p) => `<g class="spot" id="sp-${p.id}"><circle cx="${p.x}" cy="${p.y}" r="1.5"/><circle class="halo" cx="${p.x}" cy="${p.y}" r="3.2"/><text x="${p.x}" y="${p.y - 3.8}" class="lab">${p.n}</text></g>`).join("")}
          <circle id="me" class="me" cx="152" cy="82.75" r="1.5"/>
        </svg>
        <div class="ask" id="ask">${t("bk_ask")}</div>`);
      requestAnimationFrame(() => { $("dim").classList.add("on"); $("vn").classList.add("on"); });
      const svg = $("vn"), trail = $("trail"), me = $("me");
      let pts = [], downP = false, seen = new Set(), done = false, lastTick = 0;
      const pt = (e) => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 160, (e.clientY - r.top) / r.height * 90]; };
      function add([x, y]) {
        if (done) return;
        pts.push([x, y]); if (pts.length > 900) pts.shift();
        trail.setAttribute("points", pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "));
        me.setAttribute("cx", x); me.setAttribute("cy", y);
        const now = performance.now();
        if (now - lastTick > 260) { lastTick = now; snd.tick(); }
        SPOTS.forEach((p) => {
          if (!seen.has(p.id) && Math.hypot((p.x - x), (p.y - y) * 1.6) < 7) {
            seen.add(p.id);
            $("sp-" + p.id).classList.add("on");
            snd.pickup();
            if (seen.size === SPOTS.length) finish();
          }
        });
      }
      svg.onpointerdown = (e) => { downP = true; try { svg.setPointerCapture(e.pointerId); } catch (_) {} add(pt(e)); $("ask").hidden = true; };
      svg.onpointermove = (e) => { if (downP) add(pt(e)); };
      svg.onpointerup = svg.onpointercancel = () => { downP = false; };
      function finish() {
        done = true; snd.bell(); svg.classList.add("done");
        later(() => {
          const ms = voice(t("bk_v"));
          later(() => { $("dim").classList.remove("on"); svg.classList.remove("on"); next(); }, Math.max(3800, ms + 1600));
        }, 900);
      }
    },

    /* CH3 · 5 · THE WOUNDED BIRD */
    bird() {
      const MAX = 5, C = 2 * Math.PI * 46;
      ui.insertAdjacentHTML("beforeend", `<div class="warm" id="wm"></div>
        <button class="hold birdhold pulse" id="bdh" type="button" aria-label="${t("bd_aria")}"><svg viewBox="0 0 100 100"><circle class="base" cx="50" cy="50" r="46" fill="none" stroke="#ece8de" stroke-width="2"/><circle id="barc" cx="50" cy="50" r="46" fill="none" stroke="#D6A93E" stroke-width="5" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg><span class="lbl" id="bdl">${t("bd_hold")}</span></button>
        <div class="ask" id="ask">${t("bd_ask")}</div>`);
      const b = $("bdh"), arc = $("barc");
      let holding = false, held = 0, raf = 0, last = performance.now(), done = false;
      function loop(tm) {
        const dt = (tm - last) / 1000; last = tm;
        if (holding) {
          held = Math.min(MAX, held + dt);
          arc.style.strokeDashoffset = C * (1 - held / MAX);
          snd.rate(150 - held * 12);
          if (held >= MAX) return finish();
        }
        raf = requestAnimationFrame(loop);
      }
      function down(e) {
        if (done || holding) return;
        e.preventDefault();
        holding = true; b.classList.remove("pulse"); $("bdl").textContent = "…"; $("ask").hidden = true; $("wm").classList.add("on"); snd.heart(true, 150);
      }
      function up() {
        if (done || !holding) return;
        holding = false; snd.heart(false); $("wm").classList.remove("on"); $("bdl").innerHTML = t("bd_hold");
      }
      function finish() {
        done = true; holding = false; snd.heart(false); cancelAnimationFrame(raf); b.hidden = true;
        const ms = voice(t("bd_v"));
        later(() => { $("wm").classList.remove("on"); next(); }, Math.max(4200, ms + 1800));
      }
      const offHold = holdable(b, down, up);
      const kd = (e) => { if (e.code === "Space" && !e.repeat) down(e); };
      const ku = (e) => { if (e.code === "Space") up(); };
      addEventListener("keydown", kd); addEventListener("keyup", ku);
      raf = requestAnimationFrame(loop);
      cleanup = () => { cancelAnimationFrame(raf); snd.heart(false); offHold(); removeEventListener("keydown", kd); removeEventListener("keyup", ku); };
    },

    /* CH4 · 1 · UNDER WATER */
    dive() {
      const GOAL = 3;
      ui.insertAdjacentHTML("beforeend", `<div class="water" id="wt" role="button" aria-label="${t("dv_aria")}"></div><div class="caust" id="cs"></div>
        <div class="ask" id="ask">${t("dv_ask")}</div>`);
      const wt = $("wt");
      let n = 0, done = false;
      const layers = [];
      const fin = document.createElement("div");
      fin.className = "swimc"; fin.style.zIndex = 4; fin.style.clipPath = fin.style.webkitClipPath = "circle(0% at 50% 50%)";
      fin.innerHTML = `<video src="film/swim.mp4" muted playsinline preload="auto" aria-label="${t("dv_alt")}"></video>`;
      ui.appendChild(fin);
      const sv = fin.querySelector("video");
      function bubbleAt(x, y) {
        const b = document.createElement("div");
        b.className = "bub";
        const z = 5 + Math.random() * 12;
        b.style.cssText = `left:calc(${x}% - ${z / 2}px);top:${y}%;bottom:auto;--s:${z}px;--d:${1.8 + Math.random() * 1.4}s;--x:${(Math.random() * 30 - 15) | 0}px`;
        ui.appendChild(b);
        later(() => b.remove(), 3400);
      }
      function windowAt(x, y, full) {
        const L = document.createElement("div");
        L.className = "swimc";
        L.innerHTML = `<img src="img/swim.jpg" alt="${full ? t("dv_alt") : ""}">`;
        L.style.clipPath = L.style.webkitClipPath = `circle(0% at ${x}% ${y}%)`;
        ui.appendChild(L); layers.push(L);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          L.classList.add(full ? "full" : "open");
          const r = full ? "150%" : "17%";
          L.style.clipPath = L.style.webkitClipPath = `circle(${r} at ${x}% ${y}%)`;
        }));
      }
      function touch(e) {
        if (done) return;
        e.preventDefault();
        const r = wt.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
        const rp = document.createElement("div"); rp.className = "ripple"; rp.style.left = x + "%"; rp.style.top = y + "%"; rp.innerHTML = "<i></i><i></i><i></i>";
        ui.appendChild(rp); later(() => rp.remove(), 2200);
        for (let k = 0; k < 5; k++) later(() => bubbleAt(x + (Math.random() * 6 - 3), y), k * 70);
        snd.bubble(); n++; $("ask").hidden = true;
        if (n < GOAL) { windowAt(x, y, false); return; }
        done = true; wt.style.pointerEvents = "none"; layers.push(fin);
        fin.style.clipPath = fin.style.webkitClipPath = `circle(0% at ${x}% ${y}%)`;
        sv.currentTime = 0;
        const pp = sv.play(); if (pp && pp.catch) pp.catch(() => {});
        snd.underwater(true);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          fin.classList.add("full");
          fin.style.clipPath = fin.style.webkitClipPath = `circle(150% at ${x}% ${y}%)`;
        }));
        later(() => $("cs").classList.add("on"), 900);
        let gone = false;
        const out = () => { if (gone) return; gone = true; layers.forEach((L) => L.classList.add("fade")); later(next, 800); };
        sv.onended = out;
        later(out, 11500);
      }
      wt.addEventListener("pointerdown", (e) => {
        if (n === 0) { try { sv.play().then(() => { if (!done) sv.pause(); }).catch(() => {}); } catch (_) {} }
        touch(e);
      });
      const kd = (e) => {
        if (e.code === "Space" && !e.repeat) {
          const r = wt.getBoundingClientRect();
          touch({ preventDefault() {}, clientX: r.left + r.width * (0.25 + Math.random() * 0.5), clientY: r.top + r.height * (0.3 + Math.random() * 0.4) });
        }
      };
      addEventListener("keydown", kd);
      cleanup = () => { removeEventListener("keydown", kd); snd.underwater(false); };
    },

    /* CH4 · 2 · EIGHTEEN (Birthday Candles) */
    candles() {
      ui.insertAdjacentHTML("beforeend", `<div class="glow4" id="gl"></div><div class="snuff" id="sn"></div>
        <form class="answer wish" id="wf"><label for="wi">${t("cn_label")}</label>
          <div class="row4"><input id="wi" maxlength="60" autocomplete="off" placeholder="${t("cn_ph")}"><button class="btn" type="submit">${t("cn_blow")}</button><button class="ghost" id="ws" type="button">${t("cn_secret")}</button></div></form>`);
      let done = false;
      function blow(text) {
        if (done) return;
        done = true; $("wf").remove(); snd.exhale(); $("gl").style.opacity = 0; $("sn").classList.add("on");
        const words = (text || "").trim().split(/\s+/).filter(Boolean);
        words.forEach((w, i) => later(() => {
          const e = document.createElement("span"); e.className = "wishword"; e.textContent = w;
          e.style.left = (40 + Math.random() * 14) + "%";
          e.style.setProperty("--x", ((Math.random() * 60 - 30) | 0) + "px");
          ui.appendChild(e); later(() => e.remove(), 3600);
        }, i * 220));
        for (let k = 0; k < 11; k++) later(() => {
          const wv = document.createElement("div"); wv.className = "wisp";
          wv.style.left = (37 + k * 2 + Math.random() * 1.5) + "%";
          wv.style.top = (58 + Math.random() * 6) + "%";
          wv.style.setProperty("--x", ((Math.random() * 24 - 6) | 0) + "px");
          ui.appendChild(wv); later(() => wv.remove(), 2800);
        }, k * 60);
        const wait = Math.max(1400, words.length * 220 + 1600);
        later(() => { const ms = voice(t("cn_v")); later(next, Math.max(3600, ms + 1600)); }, wait);
      }
      $("wf").onsubmit = (e) => { e.preventDefault(); blow($("wi").value); };
      onTap($("ws"), () => blow(""));
      if (!matchMedia("(pointer:coarse)").matches) $("wi").focus({ preventScroll: true });
    },

    /* CH4 · 3 · LET THE BIRD GO */
    free() {
      ui.insertAdjacentHTML("beforeend", `<button class="freebird" id="fb" type="button" aria-label="${t("fr_aria")}"></button><div class="ask" id="ask">${t("fr_ask")}</div>`);
      onTap($("fb"), () => {
        const b = $("fb"); if (!b) return;
        b.remove(); $("ask").hidden = true; snd.flap(); later(next, 450);
      });
    },

    /* CH4 · 4 · RUB OUT YOUR NUMBER */
    erase() {
      const num = myNumber(true);
      ui.insertAdjacentHTML("beforeend", `<canvas class="numcv" id="nc" aria-label="${t("er_aria")}: ${num}"></canvas><div class="ask" id="ask">${t("er_ask")}</div>`);
      const cv = $("nc"), ctx = cv.getContext("2d");
      let ready = false, downP = false, lastP = null, brush = 30, done = false, box = null;
      const GX = 12, GY = 4, seen = new Set();
      later(() => {
        const r = frame.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
        const W = r.width, H = r.height;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.scale(dpr, dpr); brush = Math.max(26, W * 0.07);
        const bw = W * 0.42, bh = H * 0.18, bx = (W - bw) / 2, by = H * 0.11;
        box = { x: bx, y: by, w: bw, h: bh };
        ctx.fillStyle = "#e7c64a"; ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 20; ctx.fillRect(bx, by, bw, bh); ctx.shadowBlur = 0;
        ctx.strokeStyle = "#111"; ctx.lineWidth = 3; ctx.strokeRect(bx + 5, by + 5, bw - 10, bh - 10);
        const fam = currentLang() === "fa"
          ? '"Vazirmatn", Tahoma, sans-serif'
          : (getComputedStyle(document.documentElement).getPropertyValue("--f-display") || "sans-serif");
        ctx.fillStyle = "#111"; ctx.textAlign = "center";
        ctx.font = `700 ${Math.round(bh * 0.16)}px ${fam}`;
        const labelTxt = currentLang() === "fa" ? t("er_lab") : t("er_lab").toUpperCase();
        ctx.fillText(labelTxt, W / 2, by + bh * 0.32);
        ctx.font = `800 ${Math.round(bh * 0.36)}px "Big Shoulders Display", sans-serif`;
        ctx.fillText(num, W / 2, by + bh * 0.74);
        ctx.globalCompositeOperation = "destination-out";
        ready = true;
      }, 60);
      function mark(x, y) {
        if (!box) return;
        for (let gx = 0; gx < GX; gx++) {
          for (let gy = 0; gy < GY; gy++) {
            const cx = box.x + (gx + 0.5) * box.w / GX, cy = box.y + (gy + 0.5) * box.h / GY;
            if (Math.hypot(cx - x, cy - y) < brush * 0.6) seen.add(gx + "," + gy);
          }
        }
      }
      function rub(x, y) {
        if (!ready || done) return;
        ctx.lineCap = "round"; ctx.lineWidth = brush;
        ctx.beginPath(); ctx.moveTo(lastP ? lastP[0] : x, lastP ? lastP[1] : y); ctx.lineTo(x + 0.1, y); ctx.stroke();
        if (lastP) {
          const n = Math.ceil(Math.hypot(x - lastP[0], y - lastP[1]) / (brush / 3));
          for (let i = 1; i <= n; i++) mark(lastP[0] + (x - lastP[0]) * i / n, lastP[1] + (y - lastP[1]) * i / n);
        } else {
          mark(x, y);
        }
        lastP = [x, y];
        if (Math.random() < 0.25) snd.scrape();
        if (seen.size / (GX * GY) > 0.6) finish();
      }
      const pos = (e) => { const q = cv.getBoundingClientRect(); return [e.clientX - q.left, e.clientY - q.top]; };
      cv.onpointerdown = (e) => { downP = true; lastP = null; try { cv.setPointerCapture(e.pointerId); } catch (_) {} rub(...pos(e)); $("ask").hidden = true; };
      cv.onpointermove = (e) => { if (downP) rub(...pos(e)); };
      cv.onpointerup = cv.onpointercancel = () => { downP = false; lastP = null; };
      function finish() {
        done = true; cv.classList.add("gone");
        const ms = voice(t("er_v"));
        later(next, Math.max(4400, ms + 2000));
      }
    }
  };

  /* ============================================================================
     IFRAME ROOM BRIDGE (?embed=1 / ?autoplay=1)
     - Safe muted video prime (NO volume=1 play+pause blip on iOS!)
     ============================================================================ */
  let audioFading = false;
  function fadeInAudio(vidEl, durationMs = 1600) {
    if (!vidEl) return;
    audioFading = true;
    vidEl.volume = 0;
    const t0 = performance.now();
    const step = (now) => {
      if (vidEl.paused) { audioFading = false; return; }
      const p = Math.min(1, (now - t0) / durationMs);
      try { vidEl.volume = p; } catch (_) {}
      if (p < 1) requestAnimationFrame(step);
      else { try { vidEl.volume = 1; } catch (_) {} audioFading = false; }
    };
    requestAnimationFrame(step);
  }

  ["pointerdown", "touchstart", "touchend", "keydown", "click"].forEach((ev) => {
    addEventListener(ev, () => {
      if (!document.body.classList.contains("ld-wait")) {
        vids.forEach((el) => {
          if (el.muted) {
            el.muted = false;
            if (!audioFading) { try { el.volume = 1; } catch (_) {} }
          }
        });
      }
      snd.unlock();
    }, { passive: true });
  });

  let startedOnce = false;
  function startEmbedded() {
    if (startedOnce) return;
    startedOnce = true;
    syncSubtitles();
    $("cardStart").classList.add("off");
    document.body.classList.remove("ld-wait");
    vids.forEach((el) => { el.muted = false; try { el.volume = 0; } catch (_) {} });
    try { vids[0].currentTime = 0; } catch (_) {}
    vids[0].play().then(() => {
      setPlaying(true);
      fadeInAudio(vids[0], 1600);
    }).catch(() => {
      vids.forEach((el) => { el.muted = true; });
      vids[0].play().then(() => {
        setPlaying(true);
        fadeInAudio(vids[0], 1600);
      }).catch(() => {
        startedOnce = false;
        $("cardStart").classList.remove("off");
      });
    });
    preload(1);
  }

  const q = location.search;
  if (/[?&]embed\b/.test(q)) {
    $("cardStart").classList.add("off");
    document.body.classList.add("ld-wait");
    const waitStyle = document.createElement("style");
    waitStyle.textContent = ".ld-wait .top,.ld-wait .ctl{opacity:0;pointer-events:none}.top,.ctl{transition:opacity .5s}";
    document.head.appendChild(waitStyle);

    segI = 0; cur = 0;
    vids[0].preload = "auto";
    vids[0].muted = true;
    vids[0].src = SEGS[0].src;
    vids[0].classList.remove("hide");
    vids[1].classList.add("hide");

    let primed = false;
    window.ldPrime = () => {
      snd.unlock();
      if (primed || !document.body.classList.contains("ld-wait")) return;
      primed = true;
      /* Strictly muted unlock at volume 0, pausing only after play() resolves if still waiting */
      const first = vids[0];
      try {
        first.muted = true;
        first.volume = 0;
        const p = first.play();
        if (p && p.then) {
          p.then(() => {
            if (document.body.classList.contains("ld-wait")) {
              first.pause();
              try { first.currentTime = 0; } catch (_) {}
            }
          }).catch(() => {});
        }
      } catch (_) {}
    };
    window.ldStart = startEmbedded;

    addEventListener("message", (e) => {
      const d = e.data;
      if (d === "ld-prime") window.ldPrime();
      else if (d === "ld-start") startEmbedded();
      else if (d === "ld-pause" || (d && d.type === "ld:pause")) {
        vids.forEach((el) => el.pause());
        snd.stopAll();
      }
    });
  } else if (/[?&]autoplay\b/.test(q)) {
    snd.unlock();
    vids[0].src = SEGS[0].src;
    segI = 0; cur = 0;
    vids[0].classList.remove("hide");
    vids[1].classList.add("hide");
    startEmbedded();
  }

  /* Initialize translations & signal readiness to parent Room */
  const bootI18n = window.WABTSA_I18N ? WABTSA_I18N.ready : Promise.resolve();
  bootI18n.then(() => {
    applyLang();
    updFsLabel();
    if (window.WABTSA_I18N) {
      WABTSA_I18N.onChange(() => {
        applyLang();
        updFsLabel();
      });
    }
    if (/[?&]embed\b/.test(q) && inRoom) {
      try { window.parent.postMessage({ type: "ld:ready", ch: CHN }, "*"); } catch (_) {}
    }
  });
})();
