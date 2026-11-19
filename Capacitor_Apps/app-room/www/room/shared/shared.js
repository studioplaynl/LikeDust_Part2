/* We All Breathe the Same Air · Shared runtime for the 2D Three.js room + 4 interactive video chapters (Web, iOS & Android via Capacitor). */
(function () {
  "use strict";

  /* ============================================================================
     STORE / RELEASE REMINDER:
     Set `DEV_DEFAULT = false` before building for App Store / Google Play / live production!
     - DEV_MODE = true  → dev bar on top + "keys 1–4, 0"
     - DEV_MODE = false → 4 minimalist chapter icons (passport, photo, bicycle, letter)
     (Tip: on web you can always override with ?dev=0 or ?dev=1 in the URL.)
     ============================================================================ */
  const DEV_DEFAULT = false;
  const DEV_MODE = /[?&]dev=0\b/.test(location.search) ? false
                 : /[?&]dev=1\b/.test(location.search) ? true
                 : DEV_DEFAULT;

  const ROOT = "chapters/";
  const CHAPTERS = [
    {
      n: 1, title: "Schiphol", dir: "Hoofdstuk_1_Schiphol", color: "#D6A93E",
      icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="1.6" class="fill"/><line x1="7.6" y1="2.5" x2="7.6" y2="21.5"/><circle cx="13.3" cy="11" r="3.2"/><ellipse cx="13.3" cy="11" rx="1.4" ry="3.2"/><line x1="10.1" y1="11" x2="16.5" y2="11"/><line x1="10.5" y1="17.2" x2="16.1" y2="17.2"/></svg>`
    },
    {
      n: 2, title: "The AZC", dir: "Hoofdstuk_2_The_AZC", color: "#7f9ea0",
      icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="1.4" class="fill"/><rect x="6.2" y="6.6" width="11.6" height="10.8" rx=".6"/><circle cx="9.6" cy="10" r="1.3"/><path d="M6.6 16.8 L10.6 12.8 L13.4 15.3 L15.4 13.5 L17.4 16.8"/></svg>`
    },
    {
      n: 3, title: "Amsterdam", dir: "Hoofdstuk_3_Amsterdam", color: "#c0402c",
      icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="16.5" r="3.8" class="fill"/><circle cx="18.5" cy="16.5" r="3.8" class="fill"/><path d="M5.5 16.5 L9.8 9.5 H15.2 L11.5 16.5 Z" class="fill"/><path d="M15.2 9.5 L18.5 16.5 M14.3 7 H16.8 M8.5 9.5 H11.2 M9.8 9.5 L9.1 7.3 H7.5"/></svg>`
    },
    {
      n: 4, title: "The Letter", dir: "Hoofdstuk_4_The_Letter", color: "#2f5d86",
      icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="1.4" class="fill"/><path d="M3 6.2 L12 13.2 L21 6.2"/><path d="M3 18 L8.8 12.5 M21 18 L15.2 12.5"/></svg>`
    }
  ];
  CHAPTERS.forEach((c) => { c.src = ROOT + c.dir + "/index.html"; });

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const tr = (key, fallback, ...args) => {
    if (window.WABTSA_I18N) {
      const v = WABTSA_I18N.t(key, ...args);
      if (v && v !== key) return v;
    }
    return fallback;
  };
  const chapterTitle = (n) => tr(`room.chapterTitles.${n}`, CHAPTERS[n - 1]?.title || `Chapter ${n}`);

  /* ---------- progress state ---------- */
  function state(key) {
    const k = "ld2-room-" + key;
    let seen = new Set();
    try { seen = new Set(JSON.parse(localStorage.getItem(k) || "[]")); } catch (_) {}
    const save = () => { try { localStorage.setItem(k, JSON.stringify([...seen])); } catch (_) {} };
    return {
      has: (n) => seen.has(n),
      mark(n) { seen.add(n); save(); },
      unmark(n) { seen.delete(n); save(); },
      reset() {
        seen.clear();
        save();
        if (window.WABTSA_RESET_PROGRESS) window.WABTSA_RESET_PROGRESS({ keepRoomKeys: true });
      },
      get count() { return seen.size; },
      next() { for (const c of CHAPTERS) if (!seen.has(c.n)) return c.n; return null; },
      list: () => [...seen]
    };
  }

  /* ---------- fade wipe ---------- */
  let wipeCv = null;
  function wipeCanvas() {
    if (wipeCv) return wipeCv;
    wipeCv = el("canvas", "ld-wipe");
    document.body.appendChild(wipeCv);
    return wipeCv;
  }
  function wipe(color = "#000", dir = "in", ms = 1200) {
    const cv = wipeCanvas();
    cv.style.background = color || "#000";
    cv.style.transition = "none";
    cv.style.opacity = dir === "in" ? 0 : 1;
    void cv.offsetWidth;
    cv.style.transition = `opacity ${ms}ms ease`;
    cv.style.opacity = dir === "in" ? 1 : 0;
    return new Promise((res) => setTimeout(res, ms));
  }

  /* ---------- chapter iframe lifecycle (NO room-tap audio priming!) ---------- */
  let chapterOpen = false;
  const frames = {};
  function chapterWrap() { return $(".ld-chapter") || document.body.appendChild(el("div", "ld-chapter")); }

  function prepareChapter(n) {
    if (!n) return null;
    if (frames[n]) return frames[n];
    const keys = Object.keys(frames).filter((k) => !frames[k].active);
    if (keys.length >= 2) dropFrame(keys[0]);
    const c = CHAPTERS[n - 1];
    const box = el("div", "ld-fr");
    const fr = el("iframe");
    fr.allow = "autoplay; fullscreen";
    fr.title = `Chapter ${n} · ${chapterTitle(n)}`;
    const langParam = window.WABTSA_I18N ? `&lang=${encodeURIComponent(WABTSA_I18N.getLang())}` : "";
    fr.src = c.src + "?embed=1" + (DEV_MODE ? "&dev=1" : "") + langParam;
    box.appendChild(fr);
    chapterWrap().appendChild(box);
    const o = { n, box, fr, ready: false, active: false, waits: [], close: null, setBack: null };
    frames[n] = o;
    return o;
  }

  function dropFrame(n) {
    const o = frames[n];
    if (!o) return;
    try { o.fr.contentWindow?.postMessage({ type: "ld:pause" }, "*"); } catch (_) {}
    o.fr.src = "about:blank";
    o.box.remove();
    delete frames[n];
  }

  addEventListener("message", (e) => {
    for (const k in frames) {
      const o = frames[k];
      if (!o.fr || e.source !== o.fr.contentWindow) continue;
      const d = e.data;
      if (d === "ld-ready" || (d && d.type === "ld:ready")) {
        o.ready = true;
        o.waits.splice(0).forEach((f) => f());
      } else if (d === "ld-room-back" || (d && d.type === "ld:ended")) {
        if (o.close) o.close(true, false);
      } else if (d && d.type === "ld:back") {
        if (o.close) o.close(false, false);
      } else if (d === "ld-ctl-on" || (d && d.type === "ld:ctl" && d.on)) {
        if (o.setBack) o.setBack(true);
      } else if (d === "ld-ctl-off" || (d && d.type === "ld:ctl" && !d.on)) {
        if (o.setBack) o.setBack(false);
      }
    }
  });

  function callFrame(o, action) {
    if (!o) return;
    let invoked = false;
    const run = () => {
      if (invoked) return;
      invoked = true;
      try {
        const w = o.fr.contentWindow;
        if (w && typeof w[action] === "function") {
          w[action]();
          return;
        }
      } catch (_) {}
      try {
        o.fr.contentWindow.postMessage(action === "ldPrime" ? "ld-prime" : "ld-start", "*");
      } catch (_) {}
    };
    if (o.ready) run();
    else o.waits.push(run);
  }

  const whenReady = (o, ms) => new Promise((res) => {
    if (o.ready) return res();
    o.waits.push(res);
    setTimeout(res, ms);
  });

  /* ---------- Deterministic URL routing & History depth tracking ---------- */
  let currentChapter = null;
  let pushedChapterHistory = false;
  let pendingCloseEnded = null;
  let historyDepth = (history.state && typeof history.state.depth === "number") ? history.state.depth : 0;
  const pageHandlers = new Map();
  let routeChapterHandler = null;
  let activeModal = null;

  function parseRoute() {
    const h = (location.hash || "").replace(/^#\/?/, "").trim();
    const search = new URLSearchParams(location.search);

    const qCh = search.get("ch") || search.get("chapter");
    if (qCh && /^[1-4]$/.test(qCh)) {
      return { type: "chapter", ch: parseInt(qCh, 10), raw: qCh };
    }

    const qPage = search.get("page") || search.get("p");
    if (qPage && !/^(?:dev=?[01]|reset(?:=?[01])?|v\d+|room|lang)$/i.test(qPage)) {
      return { type: "page", page: qPage.toLowerCase().trim(), raw: qPage };
    }

    if (h) {
      const chMatch = h.match(/^(?:ch(?:apter)?[-_=]?|c[-_=]?)([1-4])$/i) || h.match(/^([1-4])$/);
      if (chMatch) {
        return { type: "chapter", ch: parseInt(chMatch[1], 10), raw: h };
      }
      const pageMatch = h.match(/^(?:page[-_=]|p[-_=])?([a-z0-9_-]+)$/i);
      if (pageMatch) {
        const name = pageMatch[1].toLowerCase();
        if (!/^(?:dev=?[01]|reset(?:=?[01])?|v\d+|room|gl|start|top|ctl|again|end)$/i.test(name)) {
          return { type: "page", page: name, raw: h };
        }
      }
    }
    return { type: "room", raw: "" };
  }

  function updateDocTitle(route) {
    const base = tr("room.title", "We All Breathe the Same Air");
    if (route.type === "chapter" && route.ch) {
      document.title = `${chapterTitle(route.ch)} · ${base}`;
    } else if (route.type === "page" && route.page) {
      document.title = `${route.page.charAt(0).toUpperCase() + route.page.slice(1)} · ${base}`;
    } else {
      document.title = base;
    }
  }

  function setUrlRoute(route, replace = true) {
    try {
      const url = new URL(location.href);
      if (route.type === "chapter") {
        url.hash = `ch=${route.ch}`;
      } else if (route.type === "page") {
        url.hash = `page=${route.page}`;
      } else {
        const h = (url.hash || "").replace(/^#\/?/, "");
        if (/^(?:ch|chapter|[1-4]|page|p=)/i.test(h)) url.hash = "";
        url.searchParams.delete("ch");
        url.searchParams.delete("chapter");
      }
      const target = url.pathname + (url.search || "") + (url.hash || "");
      if (replace) {
        const st = { wabtsa: "room", view: route.type, ch: route.ch || null, page: route.page || null, depth: historyDepth };
        history.replaceState(st, "", target);
      } else {
        historyDepth += 1;
        const st = { wabtsa: "room", view: route.type, ch: route.ch || null, page: route.page || null, depth: historyDepth };
        history.pushState(st, "", target);
      }
      updateDocTitle(route);
    } catch (_) {}
  }

  function openPage(name, htmlContent) {
    closePage(false);
    const pageName = (name || "").toLowerCase().trim();
    setUrlRoute({ type: "page", page: pageName }, true);
    window.dispatchEvent(new CustomEvent("ld:route", { detail: { type: "page", page: pageName } }));

    const handler = pageHandlers.get(pageName);
    if (handler) {
      handler({ page: pageName, close: () => closePage(true) });
      return;
    }

    const modal = el("div", "ld-modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    const titleFormatted = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    const defaultBody = htmlContent || `<p>${tr("room.comingSoon", `Page <b>${titleFormatted}</b> is coming soon.`, titleFormatted)}</p>`;
    modal.innerHTML = `
      <div class="ld-modal-box">
        <button class="ghost ld-modal-close" type="button" aria-label="Close">✕</button>
        <h2 class="ld-modal-title">${titleFormatted}</h2>
        <div class="ld-modal-content">${defaultBody}</div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("on"));
    activeModal = modal;
    window.dispatchEvent(new CustomEvent("ld:overlay"));

    const doClose = () => closePage(true);
    modal.querySelector(".ld-modal-close").onclick = doClose;
    modal.onclick = (e) => { if (e.target === modal) doClose(); };
  }

  function closePage(updateUrl = true) {
    if (activeModal) {
      activeModal.classList.remove("on");
      const m = activeModal;
      setTimeout(() => m.remove(), 350);
      activeModal = null;
      window.dispatchEvent(new CustomEvent("ld:overlay"));
    }
    if (updateUrl) {
      setUrlRoute({ type: "room" }, true);
      window.dispatchEvent(new CustomEvent("ld:route", { detail: { type: "room" } }));
    }
  }

  function onPage(name, fn) { pageHandlers.set(name.toLowerCase().trim(), fn); }
  function onRouteChapter(fn) { routeChapterHandler = fn; }

  function getShareUrl(opts = {}) {
    const u = new URL(location.href);
    if (opts.ch) u.hash = `ch=${opts.ch}`;
    else if (opts.page) u.hash = `page=${opts.page}`;
    else u.hash = "";
    return u.toString();
  }

  function copyShareUrl(opts = {}) {
    const link = getShareUrl(opts);
    const label = opts.ch ? `${chapterTitle(opts.ch)}` : (opts.page || "Room");
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
          hint(tr("room.linkCopied", `Link copied: ${label}`, label), tr("room.share", "Share"), 2800);
        }).catch(() => prompt(tr("room.sharePrompt", "Shareable link:"), link));
        return;
      }
    } catch (_) {}
    prompt(tr("room.sharePrompt", "Shareable link:"), link);
  }

  function openChapter(n, { onClose, fromHistory = false, fadeMs: customFadeMs, videoFadeInMs: customVideoFadeInMs, beforeStart } = {}) {
    if (chapterOpen) return;
    chapterOpen = true;
    currentChapter = n;
    document.body.classList.add("chapter-open");
    window.dispatchEvent(new CustomEvent("ld:overlay"));

    if (!fromHistory) {
      setUrlRoute({ type: "chapter", ch: n }, false);
      pushedChapterHistory = true;
    } else {
      pushedChapterHistory = false;
      updateDocTitle({ type: "chapter", ch: n });
    }
    window.dispatchEvent(new CustomEvent("ld:route", { detail: { type: "chapter", ch: n } }));

    const o = prepareChapter(n);
    o.active = true;
    /* Prime ONLY this chapter's video (muted at volume 0 inside chapter-engine) inside the click gesture */
    callFrame(o, "ldPrime");

    const wrap = chapterWrap();
    const back = el("button", "ghost back", tr("common.backToRoom", "← Back to room"));
    back.type = "button";
    back.style.transition = "opacity .35s ease";
    let ctlOn = false;
    const syncBack = () => {
      back.textContent = tr("common.backToRoom", "← Back to room");
      back.style.opacity = ctlOn ? "1" : "0";
      back.style.pointerEvents = ctlOn ? "auto" : "none";
      back.setAttribute("aria-hidden", ctlOn ? "false" : "true");
      back.tabIndex = ctlOn ? 0 : -1;
    };
    syncBack();
    const offLang = window.WABTSA_I18N ? WABTSA_I18N.onChange(() => {
      syncBack();
      updateDocTitle({ type: "chapter", ch: n });
    }) : null;
    o.setBack = (on) => { ctlOn = !!on; syncBack(); };

    const t0 = performance.now();
    let closingStarted = false;
    const fadeMs = customFadeMs || window.LD_FADE_MS || 500;
    const videoFadeInMs = customVideoFadeInMs || window.LD_VIDEO_FADE_IN_MS || 1000;

    Promise.all([
      wipe("#000", "in", fadeMs),
      whenReady(o, 6000),
      typeof beforeStart === "function" ? Promise.resolve(beforeStart()) : Promise.resolve()
    ]).then(() => {
      if (closingStarted) return;
      wrap.classList.add("on");
      wrap.classList.remove("reveal");
      o.box.classList.add("on");
      const st = o.box.style;
      st.webkitMaskImage = st.maskImage = "none";
      wrap.appendChild(back);
      callFrame(o, "ldStart");
      window.dispatchEvent(new CustomEvent("ld:pause"));
      wipe("#000", "out", videoFadeInMs);
    });

    function performClose(ended) {
      if (closingStarted) return;
      closingStarted = true;
      if (offLang) offLang();
      o.close = null;
      o.setBack = null;
      currentChapter = null;
      pushedChapterHistory = false;
      pendingCloseEnded = null;
      updateDocTitle({ type: "room" });
      window.dispatchEvent(new CustomEvent("ld:route", { detail: { type: "room" } }));

      const seen = Boolean(ended || performance.now() - t0 > 15000);
      const outMs = window.LD_FADE_MS || 500;
      wipe("#000", "in", outMs).then(() => {
        wrap.classList.remove("on", "reveal");
        back.remove();
        dropFrame(n);
        chapterOpen = false;
        document.body.classList.remove("chapter-open");
        window.dispatchEvent(new CustomEvent("ld:overlay"));
        window.dispatchEvent(new CustomEvent("ld:resume"));
        if (onClose) onClose(n, seen);
        return wipe("#000", "out", outMs);
      });
    }

    function close(ended, closedFromHistory = false) {
      if (closingStarted) return;
      if (!closedFromHistory) {
        if (pushedChapterHistory) {
          pendingCloseEnded = ended;
          pushedChapterHistory = false;
          try {
            history.back();
            /* Safety fallback only if embedded WebView suppresses popstate */
            setTimeout(() => {
              if (!closingStarted) {
                setUrlRoute({ type: "room" }, true);
                performClose(ended);
              }
            }, 900);
            return;
          } catch (_) {
            setUrlRoute({ type: "room" }, true);
            performClose(ended);
            return;
          }
        }
        /* Deep-link case (opened directly via #ch=N at depth 0): replaceState onto room root */
        setUrlRoute({ type: "room" }, true);
      }
      performClose(ended);
    }

    o.close = close;
    back.onclick = () => close(false, false);
  }

  function closeChapter() {
    if (currentChapter && frames[currentChapter] && frames[currentChapter].close) {
      frames[currentChapter].close(false, false);
    }
  }

  function handleRouteChange(ev) {
    if (ev && ev.state && typeof ev.state.depth === "number") {
      historyDepth = ev.state.depth;
    }
    const route = parseRoute();
    updateDocTitle(route);
    window.dispatchEvent(new CustomEvent("ld:route", { detail: route }));

    if (route.type === "chapter") {
      if (activeModal) closePage(false);
      if (!chapterOpen || currentChapter !== route.ch) {
        if (chapterOpen && currentChapter && frames[currentChapter]?.close) {
          frames[currentChapter].close(false, true);
        }
        if (routeChapterHandler) routeChapterHandler(route.ch, true);
        else openChapter(route.ch, { fromHistory: true });
      }
    } else if (route.type === "page") {
      if (chapterOpen && currentChapter && frames[currentChapter]?.close) {
        frames[currentChapter].close(false, true);
      }
      openPage(route.page);
    } else {
      if (activeModal) closePage(false);
      if (chapterOpen && currentChapter && frames[currentChapter]?.close) {
        const endedFlag = pendingCloseEnded !== null ? pendingCloseEnded : false;
        pendingCloseEnded = null;
        frames[currentChapter].close(endedFlag, true);
      }
    }
  }

  window.addEventListener("popstate", handleRouteChange);
  window.addEventListener("hashchange", () => handleRouteChange());

  function checkInitialRoute() {
    const route = parseRoute();
    /* Seed depth-0 state so subsequent pushState / popstate transitions are deterministic */
    try {
      if (!history.state || history.state.wabtsa !== "room") {
        historyDepth = 0;
        history.replaceState({ wabtsa: "room", view: route.type, ch: route.ch || null, depth: 0 }, "");
      }
    } catch (_) {}
    updateDocTitle(route);

    if (route.type === "chapter") {
      setTimeout(() => {
        if (!chapterOpen) {
          if (routeChapterHandler) routeChapterHandler(route.ch, true);
          else openChapter(route.ch, { fromHistory: true });
        }
      }, 280);
    } else if (route.type === "page") {
      setTimeout(() => openPage(route.page), 250);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkInitialRoute);
  } else {
    setTimeout(checkInitialRoute, 120);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.dispatchEvent(new CustomEvent("ld:pause"));
    } else if (!chapterOpen) {
      window.dispatchEvent(new CustomEvent("ld:resume"));
    }
  });

  /* ---------- HUD (Production = Home top-left + 4 chapter icons top-right + language switcher bottom-left; Dev = Home top-left + dots + keys 1–4, 0) ---------- */
  function hud({ st, onReset, onDev }) {
    if (window.WABTSA_I18N) {
      WABTSA_I18N.mountSwitcher(document.body, "ld-room-lang");
    }
    const homeLink = el("a", "ghost ld-home", tr("common.backHome", "← Home"));
    homeLink.id = "roomHomeLink";
    homeLink.href = "../index.html" + (location.search || "");
    document.body.appendChild(homeLink);

    let items, bar;
    if (!DEV_MODE) {
      bar = el("div", "ld-icons");
      bar.setAttribute("aria-label", tr("room.chaptersAria", "Chapters"));
      bar.innerHTML = CHAPTERS.map((c) => `<span class="ld-ico" title="${c.n} · ${chapterTitle(c.n)}">${c.icon}</span>`).join("");
      document.body.appendChild(bar);
      items = [...bar.querySelectorAll(".ld-ico")];
    } else {
      document.body.classList.add("dev-room");
      const top = el("div", "ld-top");
      top.innerHTML = `<div class="ld-tools"><div class="ld-dots" aria-label="${tr("room.completedAria", "Completed chapters")}">${CHAPTERS.map((c) => `<i title="${c.n} · ${chapterTitle(c.n)}"></i>`).join("")}</div></div>`;
      document.body.appendChild(top);
      items = [...top.querySelectorAll(".ld-dots i")];

      addEventListener("keydown", (e) => {
        if (chapterOpen || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        if (e.key >= "1" && e.key <= "4") {
          const n = +e.key;
          if (st.has(n)) st.unmark(n); else st.mark(n);
          update();
          if (onDev) onDev(n);
        }
        if (e.key === "0") {
          st.reset();
          update();
          if (onReset) onReset();
        }
      });
    }

    const update = () => {
      homeLink.textContent = tr("common.backHome", "← Home");
      if (bar) bar.setAttribute("aria-label", tr("room.chaptersAria", "Chapters"));
      items.forEach((node, i) => {
        node.title = `${i + 1} · ${chapterTitle(i + 1)}`;
        node.classList.toggle("on", st.has(i + 1));
      });
    };
    if (window.WABTSA_I18N) WABTSA_I18N.onChange(update);
    update();
    return { update };
  }

  /* ---------- hint & tag ---------- */
  let hintEl = null, hintT = null;
  function hint(text, small, ms) {
    hintEl = hintEl || document.body.appendChild(el("div", "ld-hint off"));
    clearTimeout(hintT);
    if (!text) { hintEl.classList.add("off"); return; }
    hintEl.innerHTML = (small ? `<small>${small}</small>` : "") + text;
    hintEl.classList.remove("off");
    if (ms) hintT = setTimeout(() => hintEl.classList.add("off"), ms);
  }

  let tagEl = null, tagT = null;
  function tag(html, x, y, ms = 0) {
    tagEl = tagEl || document.body.appendChild(el("div", "ld-tag"));
    clearTimeout(tagT);
    if (!html) { tagEl.classList.remove("on"); return; }
    tagEl.innerHTML = html;
    tagEl.style.left = x + "px";
    tagEl.style.top = (y - 14) + "px";
    tagEl.classList.add("on");
    if (ms) tagT = setTimeout(() => tagEl.classList.remove("on"), ms);
  }

  function tex(uri, opts = {}) {
    const t = new THREE.TextureLoader().load(uri, opts.onLoad);
    t.colorSpace = opts.raw ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  }

  window.LD = {
    DEV: DEV_MODE,
    CHAPTERS,
    state,
    wipe,
    openChapter,
    closeChapter,
    prepareChapter,
    hud,
    hint,
    tag,
    tex,
    muted: false,
    get busy() { return chapterOpen; },
    get currentChapter() { return currentChapter; },
    getRoute: parseRoute,
    setRoute: setUrlRoute,
    onRouteChapter,
    getShareUrl,
    copyShareUrl,
    openPage,
    closePage,
    onPage
  };
})();
