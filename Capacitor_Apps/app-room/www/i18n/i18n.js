/* We All Breathe The Same Air · Unified Zero-Dependency i18n Runtime (en, nl, fa) */
(function () {
  "use strict";

  const SUPPORTED = ["en", "nl", "fa"];
  const STORAGE_LANG = "wabtsa-lang";
  const STORAGE_CC = "wabtsa-cc";

  /* Resolve base directory of i18n/ from script tag regardless of page depth */
  const scriptEl = document.currentScript || document.querySelector('script[src*="i18n/i18n.js"]');
  const BASE_URL = scriptEl ? new URL(".", scriptEl.src).href : new URL("i18n/", location.href).href;

  const cache = {};
  const listeners = new Set();
  const switchers = new Set();

  function detectInitialLang() {
    try {
      const q = new URLSearchParams(location.search).get("lang");
      if (q && SUPPORTED.includes(q.toLowerCase())) {
        const clean = q.toLowerCase();
        try { localStorage.setItem(STORAGE_LANG, clean); } catch (_) {}
        if (clean !== "en" && localStorage.getItem(STORAGE_CC) === null) {
          try { localStorage.setItem(STORAGE_CC, "1"); } catch (_) {}
        }
        return clean;
      }
    } catch (_) {}
    try {
      const saved = localStorage.getItem(STORAGE_LANG);
      if (saved && SUPPORTED.includes(saved)) return saved;
    } catch (_) {}
    return "en";
  }

  let currentLang = detectInitialLang();
  let readyResolve = null;
  const readyPromise = new Promise((r) => { readyResolve = r; });

  function syncHtmlLangAttr(lang) {
    const root = document.documentElement;
    root.lang = lang;
    root.dataset.lang = lang;
  }
  syncHtmlLangAttr(currentLang);

  async function loadDict(lang) {
    if (cache[lang]) return cache[lang];
    try {
      const res = await fetch(BASE_URL + lang + ".json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      cache[lang] = await res.json();
      return cache[lang];
    } catch (err) {
      console.warn("[i18n] Failed to load", lang, err);
      return null;
    }
  }

  function lookup(dict, path) {
    if (!dict || !path) return undefined;
    const parts = String(path).split(".");
    let cur = dict;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object" || !(p in cur)) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function format(str, args) {
    if (typeof str !== "string" || !args.length) return str;
    return str.replace(/\{(\d+)\}/g, (_, idx) => {
      const v = args[Number(idx)];
      return v === undefined || v === null ? "" : String(v);
    });
  }

  function t(path, ...args) {
    let val = lookup(cache[currentLang], path);
    if (val === undefined) val = lookup(cache.en, path);
    if (val === undefined) return path;
    return format(val, args);
  }

  function cues(scope) {
    if (currentLang === "en") return [];
    const dict = cache[currentLang];
    if (!dict) return [];
    if (scope === "intro") return (dict.intro && dict.intro.cues) || [];
    return (dict.chapters && dict.chapters.cues && dict.chapters.cues[String(scope)]) || [];
  }

  function isCcAllowed() {
    return currentLang !== "en";
  }

  function getCcEnabled() {
    if (!isCcAllowed()) return false;
    try {
      const v = localStorage.getItem(STORAGE_CC);
      return v === null ? true : v === "1";
    } catch (_) {
      return true;
    }
  }

  function setCcEnabled(on) {
    try {
      localStorage.setItem(STORAGE_CC, on ? "1" : "0");
    } catch (_) {}
    notify();
    broadcast({ type: "ld:cc", on: !!on });
  }

  function toggleCc() {
    if (!isCcAllowed()) return false;
    const next = !getCcEnabled();
    setCcEnabled(next);
    return next;
  }

  function applyDom(root = document) {
    syncHtmlLangAttr(currentLang);
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const v = t(el.dataset.i18n);
      if (v !== el.dataset.i18n) el.textContent = v;
    });
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const v = t(el.dataset.i18nHtml);
      if (v !== el.dataset.i18nHtml) el.innerHTML = v;
    });
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const v = t(el.dataset.i18nAria);
      if (v !== el.dataset.i18nAria) el.setAttribute("aria-label", v);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const v = t(el.dataset.i18nPlaceholder);
      if (v !== el.dataset.i18nPlaceholder) el.setAttribute("placeholder", v);
    });
    root.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      const v = t(el.dataset.i18nAlt);
      if (v !== el.dataset.i18nAlt) el.setAttribute("alt", v);
    });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const v = t(el.dataset.i18nTitle);
      if (v !== el.dataset.i18nTitle) el.setAttribute("title", v);
    });
    syncSwitchers();
  }

  function syncSwitchers() {
    const aria = t("common.langAria");
    for (const sw of switchers) {
      if (!sw.isConnected) {
        switchers.delete(sw);
        continue;
      }
      if (aria && aria !== "common.langAria") sw.setAttribute("aria-label", aria);
      sw.querySelectorAll("button[data-lang-opt]").forEach((b) => {
        const active = b.dataset.langOpt === currentLang;
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
  }

  function broadcast(msg) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, "*");
      }
    } catch (_) {}
    try {
      document.querySelectorAll("iframe").forEach((fr) => {
        if (fr.contentWindow) fr.contentWindow.postMessage(msg, "*");
      });
    } catch (_) {}
  }

  function notify() {
    applyDom(document);
    for (const fn of listeners) {
      try { fn(currentLang); } catch (e) { console.error(e); }
    }
    window.dispatchEvent(new CustomEvent("wabtsa:lang", {
      detail: { lang: currentLang, rtl: currentLang === "fa", cc: getCcEnabled(), ccAllowed: isCcAllowed() }
    }));
  }

  async function setLang(lang, opts = {}) {
    const next = String(lang || "").toLowerCase();
    if (!SUPPORTED.includes(next)) return currentLang;
    const changed = next !== currentLang;
    currentLang = next;
    try { localStorage.setItem(STORAGE_LANG, next); } catch (_) {}

    /* Selecting NL or FA defaults subtitles ON (Q8); EN always hides overlay subtitles */
    if (changed && next !== "en" && !opts.preserveCc) {
      try { localStorage.setItem(STORAGE_CC, "1"); } catch (_) {}
    }

    /* Keep ?lang= query param in sync if present in URL */
    try {
      const u = new URL(location.href);
      if (u.searchParams.has("lang")) {
        u.searchParams.set("lang", next);
        history.replaceState(history.state, "", u.pathname + u.search + u.hash);
      }
    } catch (_) {}

    await loadDict(next);
    notify();
    if (!opts.fromBroadcast) {
      broadcast({ type: "ld:lang", lang: next });
    }
    return currentLang;
  }

  function mountSwitcher(target, className = "") {
    if (!target) return null;
    const wrap = document.createElement("div");
    wrap.className = ("lang-switch " + className).trim();
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Language");
    const labels = { en: "EN", nl: "NL", fa: "فارسی" };
    SUPPORTED.forEach((code) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.langOpt = code;
      btn.textContent = labels[code];
      btn.setAttribute("aria-pressed", code === currentLang ? "true" : "false");
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        setLang(code);
      });
      wrap.appendChild(btn);
    });
    target.appendChild(wrap);
    switchers.add(wrap);
    syncSwitchers();
    return wrap;
  }

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_LANG && e.newValue && SUPPORTED.includes(e.newValue) && e.newValue !== currentLang) {
      setLang(e.newValue, { fromBroadcast: true, preserveCc: true });
    } else if (e.key === STORAGE_CC) {
      notify();
    }
  });

  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || typeof d !== "object") return;
    if (d.type === "ld:lang" && d.lang && SUPPORTED.includes(d.lang) && d.lang !== currentLang) {
      setLang(d.lang, { fromBroadcast: true, preserveCc: true });
    } else if (d.type === "ld:cc") {
      notify();
    }
  });

  Promise.all([loadDict("en"), currentLang !== "en" ? loadDict(currentLang) : Promise.resolve()]).then(() => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        notify();
        readyResolve();
      }, { once: true });
    } else {
      notify();
      readyResolve();
    }
  });

  window.WABTSA_I18N = {
    SUPPORTED,
    ready: readyPromise,
    getLang: () => currentLang,
    isRtl: () => currentLang === "fa",
    setLang,
    t,
    cues,
    isCcAllowed,
    getCcEnabled,
    setCcEnabled,
    toggleCc,
    applyDom,
    mountSwitcher,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
})();
