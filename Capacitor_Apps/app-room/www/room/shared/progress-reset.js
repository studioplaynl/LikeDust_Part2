/* One-shot URL progress reset (?reset=1) and shared progress storage cleanup. */
(function () {
  "use strict";

  const PROGRESS_KEYS = ["wabtsa-number", "wabtsa-line"];

  function clearProgress(opts) {
    const keepRoomKeys = !!(opts && opts.keepRoomKeys);
    try {
      for (const k of PROGRESS_KEYS) {
        localStorage.removeItem(k);
      }
      if (!keepRoomKeys) {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith("ld2-room-")) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch (_) {}
  }

  function consumeUrlResetFlag() {
    try {
      const params = new URLSearchParams(location.search);
      const val = params.get("reset");
      const queryReset = params.has("reset") && val !== "0" && val !== "false";
      const hashReset = /^#\/?reset$/i.test((location.hash || "").trim());
      if (!queryReset && !hashReset) return false;

      clearProgress();

      params.delete("reset");
      const qs = params.toString();
      const nextHash = hashReset ? "" : location.hash;
      const nextUrl = location.pathname + (qs ? "?" + qs : "") + nextHash;
      try {
        history.replaceState(history.state, "", nextUrl);
      } catch (_) {}
      return true;
    } catch (_) {
      return false;
    }
  }

  consumeUrlResetFlag();
  window.WABTSA_RESET_PROGRESS = clearProgress;
})();
