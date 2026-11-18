/* We All Breathe The Same Air · Shared Window-Scene Flicker & Terminal WebAudio Ambience */
(function () {
  "use strict";

  /* Continuous, organic fluorescent / glass-reflection flicker for young Sam in #scene.
     Never locks static on pointer hover or touch; stops only when young Sam is clicked ("chosen"). */
  function createReflectionFlicker(silEl, wrapEl) {
    let timer = null;
    let active = false;
    const reduceQuery = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false };

    function clear() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function setSil(opacity, ms, easing = "linear") {
      if (!silEl) return;
      silEl.style.transition = ms > 0 ? `opacity ${ms}ms ${easing}` : "none";
      silEl.style.opacity = String(opacity);
    }

    function schedulePattern() {
      if (!active || !silEl || (wrapEl && wrapEl.classList.contains("chosen"))) return;

      /* Build a short burst of 2–4 rapid flickers followed by a brief glimpse or shadow beat */
      const steps = [];
      const pulses = 2 + Math.floor(Math.random() * 3); // 2..4 quick pulses
      for (let i = 0; i < pulses; i++) {
        const lit = +(0.06 + Math.random() * 0.22).toFixed(2); // face flashes through
        const dim = +(0.72 + Math.random() * 0.23).toFixed(2); // back to dark silhouette
        steps.push({ o: lit, ms: Math.round(55 + Math.random() * 85), wait: Math.round(70 + Math.random() * 110) });
        steps.push({ o: dim, ms: Math.round(60 + Math.random() * 95), wait: Math.round(65 + Math.random() * 130) });
      }

      /* After the burst, either linger briefly as a ghostly reflection (~0.45–0.85s) or in shadow (~0.5–1.05s) */
      if (Math.random() < 0.58) {
        const glimpse = +(0.08 + Math.random() * 0.16).toFixed(2);
        steps.push({ o: glimpse, ms: 180, wait: Math.round(420 + Math.random() * 440), ease: "ease-out" });
        steps.push({ o: +(0.82 + Math.random() * 0.13).toFixed(2), ms: 220, wait: Math.round(320 + Math.random() * 480), ease: "ease-in" });
      } else {
        steps.push({ o: +(0.80 + Math.random() * 0.15).toFixed(2), ms: 160, wait: Math.round(480 + Math.random() * 580), ease: "ease-in-out" });
      }

      let idx = 0;
      function runStep() {
        if (!active || (wrapEl && wrapEl.classList.contains("chosen"))) return;
        if (idx >= steps.length) {
          schedulePattern();
          return;
        }
        const s = steps[idx++];
        setSil(s.o, s.ms, s.ease || "linear");
        timer = setTimeout(runStep, s.wait);
      }
      runStep();
    }

    return {
      start() {
        clear();
        if (!silEl) return;
        if (reduceQuery.matches) {
          active = false;
          setSil(0.28, 0);
          return;
        }
        active = true;
        setSil(0.9, 0);
        void silEl.offsetHeight;
        timer = setTimeout(schedulePattern, 140);
      },
      stop() {
        active = false;
        clear();
      },
      choose() {
        active = false;
        clear();
        setSil(0, 320, "ease-out");
      }
    };
  }

  /* Synthesized empty terminal room tone, fluorescent strip-light hum, rain on glass & distant jet */
  function createTerminalAmbience() {
    let ctx = null;
    let master = null;
    let jetTimer = null;
    let active = false;

    function noise(seconds, brown) {
      const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
      const d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        } else {
          d[i] = w;
        }
      }
      return b;
    }

    function loop(buf) {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      return s;
    }

    function build() {
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (_) {}
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      const room = loop(noise(6, true));
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 380;
      const rg = ctx.createGain();
      rg.gain.value = 0.55;
      room.connect(lp).connect(rg).connect(master);
      room.start();

      [100, 200, 300].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = [0.012, 0.006, 0.003][i];
        o.connect(g).connect(master);
        o.start();
      });

      const rain = loop(noise(4, false));
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2600;
      bp.Q.value = 0.6;
      const rgn = ctx.createGain();
      rgn.gain.value = 0.05;
      rain.connect(bp).connect(rgn).connect(master);
      rain.start();

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lg = ctx.createGain();
      lg.gain.value = 0.02;
      lfo.connect(lg).connect(rgn.gain);
      lfo.start();
    }

    function jet() {
      if (!ctx || !active) return;
      const s = ctx.createBufferSource();
      s.buffer = noise(10, true);
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 200;
      const g = ctx.createGain();
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.9, t + 4);
      g.gain.linearRampToValueAtTime(0, t + 9.5);
      f.frequency.setValueAtTime(140, t);
      f.frequency.linearRampToValueAtTime(420, t + 4);
      f.frequency.linearRampToValueAtTime(160, t + 9.5);
      s.connect(f).connect(g).connect(master);
      s.start();
      s.stop(t + 10);
      jetTimer = setTimeout(jet, 22000 + Math.random() * 14000);
    }

    return {
      unlock() {
        try {
          if (!ctx) build();
          if (ctx.state !== "running") ctx.resume().catch(() => {});
          if (active) {
            const t = ctx.currentTime;
            master.gain.cancelScheduledValues(t);
            master.gain.setValueAtTime(master.gain.value, t);
            master.gain.linearRampToValueAtTime(0.8, t + 1.5);
          }
        } catch (_) {}
      },
      start() {
        active = true;
        try {
          if (!ctx) build();
          if (ctx.state !== "running") ctx.resume().catch(() => {});
        } catch (_) {
          return;
        }
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(0.8, t + 2.5);
        clearTimeout(jetTimer);
        jetTimer = setTimeout(jet, 6000);
      },
      stop() {
        active = false;
        clearTimeout(jetTimer);
        if (!ctx) return;
        const t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(0, t + 1.0);
      }
    };
  }

  window.WABTSA_INTRO_SHARED = {
    createReflectionFlicker,
    createTerminalAmbience
  };
})();
