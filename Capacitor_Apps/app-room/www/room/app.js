/* We All Breathe the Same Air · Flat 2D Room in Three.js integrated with the 4 Interactive Video Chapters.
   Preserves the exact flat 2D artwork, Sam green-screen/sprite-sheet clips, lighting, sunbeams, dust,
   blackboard chalk, growing letter stack, foley/ambient audio, and dove finale from DEF 2 — rendered in Three.js
   and wired to the interactive video chapters (Hoofdstuk 1–4) for Web, iOS & Android (Capacitor). */
(function () {
  "use strict";

  const STAGE_W = 1920;
  const STAGE_H = 1080;
  const FOCUS = { x: 300, y: 150, w: 1520, h: 930 };
  const FPS12 = 1000 / 12;
  const step12 = (t) => Math.floor(t / FPS12) * FPS12;
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const lerp = (a, b, t) => a + (b - a) * t;
  const lp = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

  /* ===== Chapters & Stage Coordinates (1920 × 1080) ===== */
  const CHAPTERS = [
    {
      n: 1,
      id: "passport",
      amb: "airport",
      label: "Passport",
      title: "Schiphol",
      sub: "Arrival",
      clip: "think",
      real: ["passport2", 0.2],
      fb: "rustle",
      hit: [1378, 918, 152, 110],
      silObj: "passport",
      text: "His passport. Arriving at Schiphol.",
    },
    {
      n: 2,
      id: "frame",
      amb: "azc",
      label: "Photo",
      title: "The Asylum Centre",
      sub: "",
      clip: "frame",
      hide: "frame",
      real: ["frame", 0],
      fb: "pickup",
      hit: [1600, 749, 205, 250],
      silObj: "frame",
      text: "A photo from the asylum centre.",
    },
    {
      n: 3,
      id: "bike",
      amb: "city",
      label: "Bike",
      title: "Amsterdam",
      sub: "",
      clip: "bike",
      hide: "bike",
      real: ["bike", 0.25],
      fb: "bell",
      hit: [790, 508, 280, 271],
      mark: [842, 528],
      silObj: "bike",
      flutter: "money",
      text: "His bike. Amsterdam.",
      afterChapter: {
        clip: "money",
        real: "money",
        sfx: "rustle",
        text: "He counts what is left.",
      },
    },
    {
      n: 4,
      id: "reject",
      amb: "wind",
      label: "Letter",
      title: "The Letter",
      sub: "Rejected · final chapter",
      clip: "sad",
      real: ["sad", 0.5],
      fb: "cloth",
      hit: [330, 415, 105, 190],
      openHit: [255, 398, 420, 238],
      silObj: "rejectOpen",
      text: "The letter. Rejected.",
    },
  ];

  const CLIPS = {
    standup: { rect: [417, 330, 983, 644], order: 17 },
    idle:    { rect: [349, 332, 1121, 625], loop: true, order: 18 },
    think:   { rect: [349, 332, 1121, 625], order: 19 },
    frame:   { rect: [382, 332, 1121, 625], order: 20 },
    bike:    { rect: [219, 396, 1264, 706], grade: 0.92, order: 21 },
    money:   { rect: [176, 332, 1121, 625], order: 22 },
    sad:     { rect: [363, 343, 1121, 625], order: 23 },
    pigeon:  { rect: [1005, 303, 599, 306], order: 24 },
  };

  const LAYERS = {
    rejectOpen: { src: "assets/reject_open.png",   rect: [233, 392, 801, 250], order: 2,  gone: true, interactive: true },
    reject:     { src: "assets/reject_rolled.png", rect: [233, 392, 801, 250], order: 3,  gone: true, interactive: true },
    roll:       { src: "assets/reject_roll.png",   rect: [351, 471, 81, 32],   order: 4,  gone: true, interactive: true },
    bike:       { src: "assets/bike.png",          rect: [790, 508, 426, 271], order: 5,  gone: true, interactive: true },
    bedBack:    { src: "assets/bedfront.png",      rect: [1056, 440, 244, 362], order: 6 },
    man:        { src: "assets/man.png",           rect: [960, 540, 261, 415], order: 7,  interactive: true },
    paper:      { src: "assets/paper.png",         rect: [486, 605, 183, 98],  order: 8 },
    bird:       { src: "assets/bird.png",          rect: [1298, 424, 87, 62],  order: 11, interactive: true },
    money:      { src: "assets/money.png",         rect: [1518, 1010, 146, 67], order: 13, gone: true, interactive: true },
    frame:      { src: "assets/frame.png",         rect: [1591, 749, 214, 295], order: 14, gone: true, interactive: true },
    passport:   { src: "assets/passport.png",      rect: [1380, 922, 149, 106], order: 15, interactive: true },
    seat:       { src: "assets/seat.png",          rect: [1140, 777, 105, 178], order: 25, gone: true, interactive: true },
    bed:        { src: "assets/bedfront.png",      rect: [1056, 440, 244, 362], order: 26, gone: true, interactive: true },
    post:       { src: "assets/post.png",          rect: [1210, 510, 50, 538], order: 27 },
    light1:     { src: "assets/light1.png",        rect: [436, 368, 539, 650], order: 28, softLight: true },
    light2:     { src: "assets/light2.png",        rect: [523, 873, 455, 136], order: 29, softLight: true },
  };

  /* ===== Platform Capabilities ===== */
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const SAFARI = IOS || /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  const LITE = SAFARI || matchMedia("(pointer: coarse)").matches || Math.min(screen.width, screen.height) < 820;
  const REDUCED_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===== Persistent Chapter Progress (shared with HUD & Dashboard) ===== */
  const st = LD.state("main");

  /* ===== Three.js Flat 2D Setup ===== */
  const wrap = $("wrap");
  const hotsEl = $("hots");
  const cv = $("gl");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // Raw sRGB pass-through matching 2D artwork & green-screen keys

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0c0b);

  const camera = new THREE.OrthographicCamera(0, innerWidth || 1, 0, -(innerHeight || 1), -100, 100);
  camera.position.set(0, 0, 10);

  const stageGroup = new THREE.Group();
  scene.add(stageGroup);

  let stageScale = 1;
  let uiScale = 1;
  let rotateOk = false;

  function fit() {
    const W = wrap.clientWidth || innerWidth || 1;
    const H = wrap.clientHeight || innerHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);

    camera.left = 0;
    camera.right = W;
    camera.top = 0;
    camera.bottom = -H;
    camera.updateProjectionMatrix();

    const contain = Math.min(W / STAGE_W, H / STAGE_H);
    const cover = Math.max(W / STAGE_W, H / STAGE_H);
    let s = Math.min(W / FOCUS.w, H / FOCUS.h);
    s = Math.min(Math.max(s, contain), cover);

    const sw = STAGE_W * s;
    const sh = STAGE_H * s;
    let tx = W / 2 - (FOCUS.x + FOCUS.w / 2) * s;
    let ty = H / 2 - (FOCUS.y + FOCUS.h / 2) * s;
    tx = sw >= W ? Math.min(0, Math.max(W - sw, tx)) : (W - sw) / 2;
    ty = sh >= H ? Math.min(0, Math.max(H - sh, ty)) : (H - sh) / 2;

    const C = window.CAM || { z: 1, dx: 0, dy: 0, cx: 0, cy: 0 };
    const S = s * C.z;
    const X = tx + s * (C.dx + C.cx * (1 - C.z));
    const Y = ty + s * (C.dy + C.cy * (1 - C.z));

    stageScale = S;
    uiScale = Math.max(1, 0.8 / s);
    stageGroup.position.set(X, -Y, 0);
    stageGroup.scale.set(S, S, 1);

    hotsEl.style.transform = `translate(${tx}px,${ty}px) scale(${s}) translate(${C.dx}px,${C.dy}px) translate(${C.cx}px,${C.cy}px) scale(${C.z}) translate(${-C.cx}px,${-C.cy}px)`;

    const port = H > W && W <= 1024;
    $("rotate").hidden = !port || rotateOk;
  }

  addEventListener("resize", fit);
  addEventListener("orientationchange", () => setTimeout(fit, 200));

  /* ===== Texture & Geometry Helpers ===== */
  const texLoader = new THREE.TextureLoader();
  function rawTex(uri, onLoad) {
    const t = texLoader.load(uri, onLoad);
    t.colorSpace = THREE.NoColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }

  function placeRect(mesh, x, y, w, h, z = 0) {
    mesh.position.set(x + w / 2, -(y + h / 2), z);
  }

  const baseVS = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  /* Object shader: supports smooth alpha, golden hover drop-shadow glow (.obj.glow), and vertical unroll clipping */
  const objFS = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D map;
    uniform vec2 texSize;
    uniform float uPad;
    uniform float uAlpha;
    uniform float uGlow;
    uniform float uClipY;

    vec4 sampleClamped(vec2 uv) {
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
      if (1.0 - uv.y > uClipY) return vec4(0.0);
      return texture2D(map, uv);
    }

    void main() {
      vec2 uv = (vUv - 0.5) * uPad + 0.5;
      vec4 c = sampleClamped(uv);
      vec3 rgb = c.rgb * (1.0 + 0.12 * uGlow);
      float a = c.a;

      if (uGlow > 0.004) {
        vec2 px = 1.0 / max(texSize, vec2(1.0));
        float halo = 0.0;
        float tight = 0.0;
        for (int i = 0; i < 12; i++) {
          float ang = float(i) * 0.5235988;
          vec2 dir = vec2(cos(ang), sin(ang));
          halo += sampleClamped(uv + dir * px * 8.5).a;
          tight = max(tight, sampleClamped(uv + dir * px * 2.2).a);
        }
        halo /= 12.0;
        float glowA = clamp(max(halo * 1.15, tight * 0.95) * (1.0 - c.a * 0.85), 0.0, 1.0) * uGlow;
        vec3 gold = vec3(0.949, 0.780, 0.420);
        float outA = a + glowA * (1.0 - a);
        if (outA > 0.0001) {
          rgb = (rgb * a + gold * glowA * (1.0 - a)) / outA;
        }
        a = outA;
      }

      a *= uAlpha;
      if (a < 0.002) discard;
      gl_FragColor = vec4(rgb, a);
    }
  `;

  /* ===== Build Flat 2D Room Layers ===== */
  const roomMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(STAGE_W, STAGE_H),
    new THREE.MeshBasicMaterial({ map: rawTex("assets/room.jpg"), depthTest: false, depthWrite: false })
  );
  roomMesh.renderOrder = 1;
  placeRect(roomMesh, 0, 0, STAGE_W, STAGE_H);
  stageGroup.add(roomMesh);

  const objs = {};
  for (const [name, cfg] of Object.entries(LAYERS)) {
    const [x, y, w, h] = cfg.rect;
    if (cfg.softLight) {
      const mat = new THREE.MeshBasicMaterial({
        map: rawTex(cfg.src),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor,
        opacity: 0.34,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.renderOrder = cfg.order;
      placeRect(mesh, x, y, w, h);
      stageGroup.add(mesh);
      objs[name] = { name, mesh, mat, rect: cfg.rect, softLight: true };
    } else if (cfg.interactive) {
      const pad = 1.16;
      const u = {
        map: { value: null },
        texSize: { value: new THREE.Vector2(w, h) },
        uPad: { value: pad },
        uAlpha: { value: cfg.gone ? 0 : 1 },
        uGlow: { value: 0 },
        uClipY: { value: 2.0 },
      };
      u.map.value = rawTex(cfg.src, (tex) => {
        if (tex.image && tex.image.width) {
          u.texSize.value.set(tex.image.width, tex.image.height);
        }
      });
      const mat = new THREE.ShaderMaterial({
        vertexShader: baseVS,
        fragmentShader: objFS,
        uniforms: u,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * pad, h * pad), mat);
      mesh.renderOrder = cfg.order;
      mesh.visible = !cfg.gone;
      placeRect(mesh, x, y, w, h);
      stageGroup.add(mesh);
      objs[name] = {
        name,
        mesh,
        mat,
        uniforms: u,
        rect: cfg.rect.slice(),
        baseX: x + w / 2,
        baseY: -(y + h / 2),
        gone: !!cfg.gone,
        alpha: cfg.gone ? 0 : 1,
        targetAlpha: cfg.gone ? 0 : 1,
        alphaSpeed: 1 / 0.35,
        glowTarget: 0,
        flutter: false,
      };
    } else {
      const mat = new THREE.MeshBasicMaterial({
        map: rawTex(cfg.src),
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.renderOrder = cfg.order;
      placeRect(mesh, x, y, w, h);
      stageGroup.add(mesh);
      objs[name] = { name, mesh, mat, rect: cfg.rect };
    }
  }

  function setGone(name, gone, fadeSec = 0.35) {
    const o = objs[name];
    if (!o || !o.uniforms) return;
    o.gone = !!gone;
    o.targetAlpha = gone ? 0 : 1;
    if (fadeSec <= 0.005) {
      o.alpha = o.targetAlpha;
      o.uniforms.uAlpha.value = o.alpha;
      o.mesh.visible = o.alpha > 0.002;
    } else {
      o.alphaSpeed = 1 / fadeSec;
      if (!gone) o.mesh.visible = true;
    }
  }

  function setGlow(name, on) {
    const o = objs[name];
    if (o && o.uniforms) o.glowTarget = on ? 1 : 0;
  }

  function clearAllGlows() {
    for (const k in objs) {
      if (objs[k].uniforms) objs[k].glowTarget = 0;
    }
  }

  /* ===== Dynamic Canvas Planes in Three.js (Blackboard, Desk Letter Stack, Money Counter) ===== */
  function makeCanvasPlane(w, h, rect, order) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rect[2], rect[3]), mat);
    mesh.renderOrder = order;
    placeRect(mesh, rect[0], rect[1], rect[2], rect[3]);
    stageGroup.add(mesh);
    return { canvas, ctx: canvas.getContext("2d"), tex, mesh };
  }

  const boardPlane = makeCanvasPlane(560, 1200, [1640, 120, 280, 600], 9);
  const stackPlane = makeCanvasPlane(480, 440, [392, 524, 240, 220], 10);
  const countPlane = makeCanvasPlane(720, 360, [1400, 900, 360, 180], 16);

  /* ===== Sam & Pigeon Pre-Keyed Sprite-Sheet Clips in Three.js ===== */
  const SP = {
    standup: { vw: 1024, vh: 672, bx: 382, by: 48,  bw: 468, bh: 606, fw: 281, fh: 364, cols: 14, n: 61,  fps: 12 },
    idle:    { vw: 1024, vh: 572, bx: 446, by: 42,  bw: 132, bh: 524, fw: 92,  fh: 367, cols: 44, n: 61,  fps: 12 },
    think:   { vw: 1024, vh: 572, bx: 446, by: 42,  bw: 130, bh: 524, fw: 91,  fh: 367, cols: 45, n: 61,  fps: 12 },
    frame:   { vw: 1024, vh: 572, bx: 443, by: 48,  bw: 205, bh: 518, fw: 133, fh: 337, cols: 30, n: 61,  fps: 12 },
    bike:    { vw: 1024, vh: 572, bx: 246, by: 18,  bw: 584, bh: 536, fw: 350, fh: 322, cols: 11, n: 61,  fps: 12 },
    money:   { vw: 1024, vh: 572, bx: 556, by: 54,  bw: 201, bh: 512, fw: 131, fh: 333, cols: 31, n: 61,  fps: 12 },
    sad:     { vw: 1024, vh: 572, bx: 384, by: 194, bw: 284, bh: 362, fw: 185, fh: 235, cols: 22, n: 61,  fps: 12 },
    pigeon:  { vw: 1024, vh: 522, bx: 480, by: 108, bw: 232, bh: 226, fw: 139, fh: 136, cols: 29, n: 121, fps: 24 },
  };

  class Flip {
    constructor(n) {
      this.n = n;
      this.m = SP[n];
      this.img = new Image();
      this.img.decoding = "async";
      this.readyState = 0;
      this.loop = false;
      this.paused = true;
      this.ended = false;
      this._t = 0;
      this._t0 = 0;
      this._ev = {};
      this.duration = this.m.n / this.m.fps;
      this.img.onload = () => {
        const ok = () => {
          this.readyState = 4;
          this._emit("loadeddata");
          this._emit("canplaythrough");
        };
        (this.img.decode ? this.img.decode() : Promise.resolve()).then(ok, ok);
      };
      this.img.onerror = () => this._emit("error");
    }
    load() {
      if (!this.img.src) this.img.src = "assets/sp/" + this.n + ".webp";
    }
    _now() {
      let t = (performance.now() - this._t0) / 1000;
      if (this.loop) t %= this.duration;
      return Math.min(t, this.duration);
    }
    get currentTime() {
      return this.paused ? this._t : this._now();
    }
    set currentTime(v) {
      this._t = v;
      if (!this.paused) this._t0 = performance.now() - v * 1000;
      this.ended = false;
      setTimeout(() => this._emit("seeked"), 0);
    }
    play() {
      if (this.paused) {
        if (this.ended || this._t >= this.duration) this._t = 0;
        this.paused = false;
        this.ended = false;
        this._t0 = performance.now() - this._t * 1000;
        setTimeout(() => this._emit("playing"), 0);
        clearTimeout(this._tk);
        this._tick();
      }
      return Promise.resolve();
    }
    pause() {
      if (!this.paused) {
        this._t = this._now();
        this.paused = true;
        clearTimeout(this._tk);
      }
    }
    _tick() {
      if (this.paused) return;
      const t = this._now();
      this._emit("timeupdate");
      if (!this.loop && t >= this.duration) {
        this.paused = true;
        this._t = this.duration;
        this.ended = true;
        this._emit("ended");
        return;
      }
      this._tk = setTimeout(() => this._tick(), 60);
    }
    frame() {
      return Math.max(0, Math.min(this.m.n - 1, Math.floor(this.currentTime * this.m.fps + 1e-4)));
    }
    addEventListener(e, f, o) {
      (this._ev[e] = this._ev[e] || []).push({ f, once: !!(o && o.once) });
    }
    removeEventListener(e, f) {
      this._ev[e] = (this._ev[e] || []).filter((x) => x.f !== f);
    }
    _emit(e) {
      const L = this._ev[e];
      if (!L || !L.length) return;
      this._ev[e] = L.filter((x) => !x.once);
      for (const x of L) {
        try {
          x.f({ type: e, target: this });
        } catch (err) {
          console.error(err);
        }
      }
    }
  }

  /* Sprite-sheet sub-UV shader (used across all devices with pre-keyed .webp sprite sheets) */
  const stoolMaskGLSL = `
    float stoolMask(vec2 fullUv, vec3 rgb, float p) {
      if (p < 0.0) return 0.0;
      float u = fullUv.x;
      float vy = fullUv.y;
      float q = clamp(p / 0.57, 0.0, 1.0);
      float yA = mix(0.748, 0.680, q);
      float yB = mix(0.733, 0.678, q);
      float s = clamp((u - 0.745) / (0.805 - 0.745), 0.0, 1.0);
      float yTop = max(0.678, mix(yA, yB, s));
      float mx = smoothstep(0.741, 0.745, u) * (1.0 - smoothstep(0.822, 0.828, u));
      float my = smoothstep(yTop - 0.003, yTop + 0.002, vy) * (1.0 - smoothstep(0.825, 0.832, vy));
      float notJeans = 1.0 - smoothstep(0.006, 0.020, rgb.b - rgb.r);
      float notJacket = 1.0 - smoothstep(0.28, 0.34, rgb.r);
      return mx * my * notJeans * notJacket;
    }
  `;

  const spriteFS = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D t;
    uniform vec4 uSubUv;
    uniform float uAlpha;
    uniform float uStool;
    uniform float uGrade;
    ${stoolMaskGLSL}
    void main() {
      vec2 uv = uSubUv.xy + vUv * uSubUv.zw;
      vec4 c = texture2D(t, uv);
      float a = c.a * uAlpha;
      vec2 fullUv = vec2(0.37305 + vUv.x * 0.45703, 0.07143 + (1.0 - vUv.y) * 0.90179);
      a *= 1.0 - stoolMask(fullUv, c.rgb, uStool);
      float y = dot(c.rgb, vec3(0.3, 0.59, 0.11));
      vec3 rgb = mix(vec3(y), c.rgb, 0.85 + 0.15 * uGrade) * uGrade;
      if (a < 0.002) discard;
      gl_FragColor = vec4(rgb, a);
    }
  `;

  /* Horizontal stride offset for standup clip so frame 22 lands at the exact X of idle (916.9) */
  function standupOffsetX(f12) {
    if (f12 <= 13) return 0;
    if (f12 <= 22) return -70 * ((f12 - 13) / 9);
    if (f12 < 29) return -70 * (1 - (f12 - 22) / 7);
    return 0;
  }

  const vids = {};
  const clipMeshes = {};

  for (const n in CLIPS) {
    const cfg = CLIPS[n];
    const v = new Flip(n);
    v.loop = !!cfg.loop;
    const tex = new THREE.Texture(v.img);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    v.addEventListener("loadeddata", () => { tex.needsUpdate = true; });

    const m = SP[n];
    const r = cfg.rect;
    const sx = r[2] / m.vw;
    const sy = r[3] / m.vh;
    const rx = r[0] + m.bx * sx;
    const ry = r[1] + m.by * sy;
    const rw = m.bw * sx;
    const rh = m.bh * sy;

    const mat = new THREE.ShaderMaterial({
      vertexShader: baseVS,
      fragmentShader: spriteFS,
      uniforms: {
        t: { value: tex },
        uSubUv: { value: new THREE.Vector4(0, 0, 1, 1) },
        uAlpha: { value: 0 },
        uStool: { value: -1 },
        uGrade: { value: cfg.grade || 1 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rw, rh), mat);
    mesh.renderOrder = cfg.order;
    mesh.visible = false;
    placeRect(mesh, rx, ry, rw, rh);
    stageGroup.add(mesh);
    clipMeshes[n] = { mesh, mat, tex, lastFrame: -1, baseX: rx + rw / 2 };
    vids[n] = v;
  }

  let clipLayers = [];
  const findClipLayer = (n) => clipLayers.find((l) => l.name === n);
  function showClip(n, d = 280) {
    let l = findClipLayer(n);
    if (!l) {
      l = { name: n, alpha: 0, target: 1, speed: 1000 / Math.max(1, d) };
      clipLayers.push(l);
    } else {
      l.target = 1;
      l.speed = 1000 / Math.max(1, d);
    }
  }
  function hideClip(n, d = 280) {
    const l = findClipLayer(n);
    if (l) {
      l.target = 0;
      l.speed = 1000 / Math.max(1, d);
    }
  }

  function firstFrame() {
    return Promise.resolve();
  }
  async function startClip(n) {
    const v = vids[n];
    v.pause();
    try { v.currentTime = 0; } catch (_) {}
    const p = v.play();
    if (p) p.catch(() => {});
    await firstFrame(v);
    return v;
  }
  const waitClipEnded = (v) => new Promise((r) => v.addEventListener("ended", r, { once: true }));

  /* ===== Sunbeams (raysA / raysB) & Evening Atmosphere in Three.js ===== */
  function beamsFor(e) {
    return [
      { top: [[790, 388], [905, 388]], bot: [lp([430, 1015], [40, 1080], e), lp([985, 1015], [600, 1080], e)], k: 1 },
      { top: [[888, 0], [952, 0]],     bot: [[830, 760], [1010, 760]], k: 0.45 * (1 - e) },
    ];
  }
  let BEAMS = beamsFor(0);
  function beamAt(px, py) {
    let best = 0;
    for (const B of BEAMS) {
      const y0 = B.top[0][1], y1 = B.bot[0][1];
      if (py < y0 || py > y1) continue;
      const t = (py - y0) / (y1 - y0);
      const l = B.top[0][0] + (B.bot[0][0] - B.top[0][0]) * t;
      const r = B.top[1][0] + (B.bot[1][0] - B.top[1][0]) * t;
      if (px < l || px > r) continue;
      const u = (px - l) / (r - l), edge = Math.min(u, 1 - u) * 2;
      const fall = 1 - t * 0.55;
      best = Math.max(best, B.k * Math.min(1, edge * 2.2) * fall);
    }
    return best;
  }

  function makeRayPlane(order) {
    const cvRay = document.createElement("canvas");
    cvRay.width = 960;
    cvRay.height = 540;
    const tex = new THREE.CanvasTexture(cvRay);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    /* Premultiplied screen blend in shader: rgb*opacity + dst*(1 - rgb*opacity) */
    const mat = new THREE.ShaderMaterial({
      vertexShader: baseVS,
      fragmentShader: `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D map;
        uniform float uGain;
        void main() {
          vec4 c = texture2D(map, vUv);
          vec3 s = clamp(c.rgb * c.a * uGain, 0.0, 1.0);
          gl_FragColor = vec4(s, 1.0);
        }
      `,
      uniforms: { map: { value: tex }, uGain: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcColorFactor,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(STAGE_W, STAGE_H), mat);
    mesh.renderOrder = order;
    placeRect(mesh, 0, 0, STAGE_W, STAGE_H);
    stageGroup.add(mesh);
    return { canvas: cvRay, tex, mat, mesh };
  }

  const raysA = makeRayPlane(30);
  const raysB = makeRayPlane(31);
  if (LITE) raysB.mesh.visible = false;

  function drawRays(rayObj, seed, e) {
    const cvRay = rayObj.canvas;
    const sm = cvRay._sm || (cvRay._sm = Object.assign(document.createElement("canvas"), { width: 240, height: 135 }));
    const md = cvRay._md || (cvRay._md = Object.assign(document.createElement("canvas"), { width: 480, height: 270 }));
    const x = sm.getContext("2d");
    let r = seed;
    const R = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, sm.width, sm.height);
    x.setTransform(sm.width / 1920, 0, 0, sm.height / 1080, 0, 0);
    x.globalCompositeOperation = "lighter";
    const C = [255, Math.round(lerp(222, 150, e)), Math.round(lerp(162, 72, e))];
    const col = (a) => `rgba(${C[0]},${C[1]},${C[2]},${a})`;

    for (const B of beamsFor(e)) {
      if (B.k < 0.01) continue;
      const n = B.k > 0.9 ? 9 : 4;
      for (let i = 0; i < n; i++) {
        const a = i / n, w = (1 / n) * (0.5 + R() * 0.6);
        const tl = B.top[0][0] + (B.top[1][0] - B.top[0][0]) * a;
        const tr = tl + (B.top[1][0] - B.top[0][0]) * w;
        const bl = B.bot[0][0] + (B.bot[1][0] - B.bot[0][0]) * a;
        const br = bl + (B.bot[1][0] - B.bot[0][0]) * w;
        const g = x.createLinearGradient(B.top[0][0], B.top[0][1], B.bot[0][0], B.bot[0][1]);
        const A = B.k * (0.10 + R() * 0.12) * (1 + 0.8 * e);
        g.addColorStop(0, col(A * 1.6));
        g.addColorStop(0.55, col(A * 0.8));
        g.addColorStop(1, col(A * 0.25));
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(tl, B.top[0][1]);
        x.lineTo(tr, B.top[0][1]);
        x.lineTo(br, B.bot[0][1]);
        x.lineTo(bl, B.bot[0][1]);
        x.closePath();
        x.fill();
      }
    }

    if (e > 0.02) {
      const q = [lp([470, 1012], [150, 968], e), lp([900, 1012], [520, 968], e), lp([985, 1080], [600, 1080], e), lp([430, 1080], [40, 1080], e)];
      const P = (u, v) => {
        const ax = lerp(q[0][0], q[1][0], u), ay = lerp(q[0][1], q[1][1], u);
        const bx = lerp(q[3][0], q[2][0], u), by = lerp(q[3][1], q[2][1], u);
        return [lerp(ax, bx, v), lerp(ay, by, v)];
      };
      x.fillStyle = col(0.45 * e);
      for (let cI = 0; cI < 4; cI++) {
        for (let rI = 0; rI < 2; rI++) {
          const u0 = cI / 4 + 0.02, u1 = (cI + 1) / 4 - 0.02, v0 = rI / 2 + 0.04, v1 = (rI + 1) / 2 - 0.04;
          const p1 = P(u0, v0), p2 = P(u1, v0), p3 = P(u1, v1), p4 = P(u0, v1);
          x.beginPath();
          x.moveTo(...p1);
          x.lineTo(...p2);
          x.lineTo(...p3);
          x.lineTo(...p4);
          x.closePath();
          x.fill();
        }
      }
    }

    const gl2 = x.createRadialGradient(848, 438, 10, 848, 438, 190 + 60 * e);
    gl2.addColorStop(0, col(0.55 + 0.15 * e));
    gl2.addColorStop(1, col(0));
    x.fillStyle = gl2;
    x.fillRect(560, 160, 580, 560);

    const m = md.getContext("2d");
    m.clearRect(0, 0, md.width, md.height);
    m.imageSmoothingEnabled = true;
    m.imageSmoothingQuality = "high";
    m.drawImage(sm, 0, 0, md.width, md.height);

    const o = cvRay.getContext("2d");
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, cvRay.width, cvRay.height);
    o.imageSmoothingEnabled = true;
    o.imageSmoothingQuality = "high";
    o.drawImage(md, 0, 0, cvRay.width, cvRay.height);
    rayObj.tex.needsUpdate = true;
  }

  let rayE = -1;
  let eveCur = 0;
  let eveTarget = 0;
  function setRays(e) {
    if (Math.abs(e - rayE) < 0.004) return;
    rayE = e;
    BEAMS = beamsFor(e);
    drawRays(raysA, 7, e);
    if (!LITE) drawRays(raysB, 31, e);
  }
  setRays(0);

  /* Evening Multiply Layer (exact match to CSS mix-blend-mode: multiply #34385f -> #4d4266 -> #6a4636) */
  const eveMultMat = new THREE.ShaderMaterial({
    vertexShader: baseVS,
    fragmentShader: `
      precision mediump float;
      varying vec2 vUv;
      uniform float uEve;
      void main() {
        float y = 1.0 - vUv.y;
        vec3 top = vec3(0.204, 0.220, 0.373);
        vec3 mid = vec3(0.302, 0.259, 0.400);
        vec3 bot = vec3(0.416, 0.275, 0.212);
        vec3 grad = y < 0.5 ? mix(top, mid, y * 2.0) : mix(mid, bot, (y - 0.5) * 2.0);
        float a = clamp(uEve * 0.60, 0.0, 1.0);
        gl_FragColor = vec4(mix(vec3(1.0), grad, a), 1.0);
      }
    `,
    uniforms: { uEve: { value: 0 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.DstColorFactor,
    blendDst: THREE.ZeroFactor,
  });
  const eveMultMesh = new THREE.Mesh(new THREE.PlaneGeometry(STAGE_W, STAGE_H), eveMultMat);
  eveMultMesh.renderOrder = 32;
  placeRect(eveMultMesh, 0, 0, STAGE_W, STAGE_H);
  stageGroup.add(eveMultMesh);

  /* Warmth + Evening Window Glow (Screen) & Subtle Room Vignette (#shade) */
  const warmGlowMat = new THREE.ShaderMaterial({
    vertexShader: baseVS,
    fragmentShader: `
      precision mediump float;
      varying vec2 vUv;
      uniform float uEve;
      void main() {
        vec2 p = vec2(vUv.x, 1.0 - vUv.y);
        /* Afternoon warm center wash */
        vec2 dWarm = (p - vec2(0.44, 0.55)) / vec2(0.55, 0.60);
        float wMask = 1.0 - smoothstep(0.0, 1.0, length(dWarm));
        vec3 aft = vec3(1.0, 0.68, 0.36) * wMask * 0.14 * (1.0 - uEve * 0.6);

        /* Evening warm orange window glow */
        vec2 dEve = (p - vec2(0.40, 0.41)) / vec2(0.26, 0.34);
        float eMask = 1.0 - smoothstep(0.0, 0.85, length(dEve));
        vec3 eveGlow = vec3(1.0, 0.50, 0.20) * eMask * 0.34 * uEve;

        gl_FragColor = vec4(aft + eveGlow, 1.0);
      }
    `,
    uniforms: { uEve: { value: 0 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcColorFactor,
  });
  const warmGlowMesh = new THREE.Mesh(new THREE.PlaneGeometry(STAGE_W, STAGE_H), warmGlowMat);
  warmGlowMesh.renderOrder = 33;
  placeRect(warmGlowMesh, 0, 0, STAGE_W, STAGE_H);
  stageGroup.add(warmGlowMesh);

  const shadeMat = new THREE.ShaderMaterial({
    vertexShader: baseVS,
    fragmentShader: `
      precision mediump float;
      varying vec2 vUv;
      void main() {
        vec2 p = vec2(vUv.x, 1.0 - vUv.y);
        vec2 d = (p - vec2(0.48, 0.52)) / vec2(0.72, 0.68);
        float v = smoothstep(0.40, 1.0, length(d));
        float a = clamp(0.12 + v * 0.48, 0.0, 1.0);
        gl_FragColor = vec4(vec3(0.031, 0.027, 0.024), a);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const shadeMesh = new THREE.Mesh(new THREE.PlaneGeometry(STAGE_W, STAGE_H), shadeMat);
  shadeMesh.renderOrder = 34;
  placeRect(shadeMesh, 0, 0, STAGE_W, STAGE_H);
  stageGroup.add(shadeMesh);

  /* ===== Floating Dust Motes in Three.js (3 Air Vortices + Sam Turbulence + Sunbeam Catch) ===== */
  const DUST_N = LITE ? 80 : 300;
  const dustParticles = [];
  const dustPos = new Float32Array(DUST_N * 3);
  const dustSize = new Float32Array(DUST_N);
  const dustAlpha = new Float32Array(DUST_N);
  const dustBlur = new Float32Array(DUST_N);

  for (let i = 0; i < DUST_N; i++) {
    const z = Math.random();
    const r = 0.5 + z * z * 3.2;
    const blur = z > 0.93;
    dustParticles.push({
      x: Math.random() * STAGE_W,
      y: Math.random() * STAGE_H,
      z,
      r,
      blur,
      ph: Math.random() * 6.283,
      sp: 0.15 + Math.random() * 0.5,
      vx: 0,
      vy: 0,
      tw: 1 + Math.random() * 3,
      spin: (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.7),
      orb: 4 + Math.random() * 14,
    });
    dustPos[i * 3] = dustParticles[i].x;
    dustPos[i * 3 + 1] = -dustParticles[i].y;
    dustPos[i * 3 + 2] = 0;
    dustSize[i] = blur ? r * 5.0 : r * 2.4;
    dustAlpha[i] = 0;
    dustBlur[i] = blur ? 1 : 0;
  }

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("aSize", new THREE.BufferAttribute(dustSize, 1));
  dustGeo.setAttribute("aAlpha", new THREE.BufferAttribute(dustAlpha, 1));
  dustGeo.setAttribute("aBlur", new THREE.BufferAttribute(dustBlur, 1));

  const dustMat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      attribute float aBlur;
      uniform float uScale;
      varying float vAlpha;
      varying float vBlur;
      void main() {
        vAlpha = aAlpha;
        vBlur = aBlur;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.0, aSize * uScale);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying float vAlpha;
      varying float vBlur;
      void main() {
        if (vAlpha < 0.01) discard;
        float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
        if (d > 1.0) discard;
        float fall = vBlur > 0.5
          ? pow(1.0 - d, 1.8) * 0.65
          : (1.0 - smoothstep(0.35, 1.0, d));
        float a = vAlpha * fall;
        if (a < 0.005) discard;
        gl_FragColor = vec4(vec3(1.0, 0.955, 0.86), a);
      }
    `,
    uniforms: { uScale: { value: 1 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.renderOrder = 35;
  dustPoints.frustumCulled = false;
  stageGroup.add(dustPoints);

  const VORTICES = [
    { x: 700, y: 650, r: 260, s: 1 },
    { x: 1150, y: 500, r: 220, s: -1 },
    { x: 450, y: 850, r: 240, s: -1 },
  ];

  /* ===== Golden Ripple Marker in Three.js (#marker) ===== */
  const markerUniforms = {
    uTime: { value: 0 },
    uAlpha: { value: 0 },
  };
  const markerMat = new THREE.ShaderMaterial({
    vertexShader: baseVS,
    fragmentShader: `
      precision mediump float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uAlpha;
      void main() {
        if (uAlpha < 0.01) discard;
        float d = length(vUv - vec2(0.5)) * 2.0; // 0..1 where 1 = 80px radius
        float p = mod(uTime, 3.4) / 3.4;
        float r = mix(0.11, 0.52, 1.0 - pow(1.0 - p, 2.2));
        float w = 0.026;
        float ring = 1.0 - smoothstep(w * 0.5, w * 1.4, abs(d - r));
        float env = p < 0.15 ? (p / 0.15) * 0.78 : (1.0 - (p - 0.15) / 0.85) * 0.78;
        float a = ring * max(0.0, env) * uAlpha;
        if (a < 0.004) discard;
        gl_FragColor = vec4(vec3(1.0, 0.808, 0.329), a);
      }
    `,
    uniforms: markerUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const markerMesh = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), markerMat);
  markerMesh.renderOrder = 40;
  markerMesh.visible = false;
  stageGroup.add(markerMesh);
  let markerTargetAlpha = 0;

  /* ===== WebAudio Engine (Room Ambience + Recorded Foley + Procedural Fallbacks) ===== */
  let muted = false;
  let actx = null;
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (_) {}

  function ac() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
    }
    if (actx && actx.state !== "running" && actx.state !== "closed") {
      actx.resume().catch(() => {});
    }
    return actx;
  }

  const SILENT = (() => {
    const n = 4410, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
    const w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true);
    v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
  })();
  const keepAlive = new Audio(SILENT);
  keepAlive.loop = true;
  keepAlive.setAttribute("playsinline", "");

  function unlockAudio() {
    const c = ac();
    if (!c) return;
    try {
      const bf = c.createBuffer(1, 1, 22050), src = c.createBufferSource();
      src.buffer = bf; src.connect(c.destination); src.start(0);
    } catch (_) {}
    try { const q = keepAlive.play(); if (q) q.catch(() => {}); } catch (_) {}
  }

  let audioPrimed = false;
  function primeRoomAudioAndVideo() {
    if (audioPrimed) return;
    audioPrimed = true;
    unlockAudio();
    loadSounds();
    loadAmb();
    if (started && !LD.busy) amb("room", 3.5);
    try {
      if (cineV.paused) {
        const q = cineV.play();
        cineV.pause();
        if (q) q.catch(() => {});
      }
    } catch (_) {}
  }

  ["pointerdown", "pointermove", "touchstart", "touchend", "keydown", "click"].forEach((ev) => {
    addEventListener(ev, () => {
      primeRoomAudioAndVideo();
      if (actx && actx.state !== "running") unlockAudio();
      if (started && !LD.busy && !ambCur && ambWant && AMB[ambWant]) amb(ambWant, 2.5);
    }, { passive: true });
  });

  function nz(c, sec, shape) {
    const len = Math.max(1, Math.floor(c.sampleRate * sec)), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * shape(i / len);
    const s = c.createBufferSource();
    s.buffer = b;
    return s;
  }
  function out(c, vol) {
    const g = c.createGain();
    g.gain.value = vol;
    g.connect(c.destination);
    return g;
  }
  function bell() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    [[2350, 0.18], [3120, 0.09], [4720, 0.05]].forEach(([f, g]) => {
      for (const d of [0, 0.16]) {
        const o = c.createOscillator(), a = c.createGain();
        o.frequency.value = f;
        a.gain.setValueAtTime(0, t + d);
        a.gain.linearRampToValueAtTime(g, t + d + 0.005);
        a.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.1);
        o.connect(a).connect(c.destination);
        o.start(t + d); o.stop(t + d + 1.2);
      }
    });
  }
  function rustle() {
    const c = ac(); if (!c) return;
    const len = c.sampleRate * 0.7, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * i / len), 2) * (0.5 + 0.5 * Math.random() * Math.random());
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = 0.7; g.gain.value = 0.22;
    s.connect(f).connect(g).connect(c.destination); s.start();
  }
  function chime() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    [196, 293.7, 392].forEach((f, i) => {
      const o = c.createOscillator(), a = c.createGain();
      o.type = "triangle"; o.frequency.value = f;
      a.gain.setValueAtTime(0, t + i * 0.09);
      a.gain.linearRampToValueAtTime(0.07, t + i * 0.09 + 0.04);
      a.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 2.2);
      o.connect(a).connect(c.destination); o.start(t + i * 0.09); o.stop(t + 2.5);
    });
  }
  function creak() {
    const c = ac(); if (!c) return;
    const t = c.currentTime + 0.02;
    for (const [d, f0, f1, v] of [[0, 190, 150, 0.045], [0.22, 240, 175, 0.035]]) {
      const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), bp = c.createBiquadFilter(), g = c.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t + d); o.frequency.linearRampToValueAtTime(f1, t + d + 0.45);
      lfo.frequency.value = 23; lg.gain.value = 18; lfo.connect(lg).connect(o.frequency);
      bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 2.5;
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(v, t + d + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5);
      o.connect(bp).connect(g).connect(c.destination); o.start(t + d); lfo.start(t + d); o.stop(t + d + 0.55); lfo.stop(t + d + 0.55);
    }
  }
  function cloth(vol = 0.16) {
    const c = ac(); if (!c) return;
    const s = nz(c, 0.55, (p) => Math.pow(Math.sin(Math.PI * p), 1.5) * (0.4 + 0.6 * Math.random()));
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1100; f.Q.value = 0.6;
    s.connect(f).connect(out(c, vol)); s.start();
  }
  function footstep(at = 0, vol = 0.5) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + at;
    const s = nz(c, 0.12, (p) => Math.pow(1 - p, 4));
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
    const s2 = nz(c, 0.06, (p) => Math.pow(1 - p, 6)), f2 = c.createBiquadFilter();
    f2.type = "highpass"; f2.frequency.value = 2500;
    s2.connect(f2).connect(out(c, 0.05)); s2.start(t + 0.01);
  }
  function pickup() {
    const c = ac(); if (!c) return;
    const t = c.currentTime + 0.02;
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.14);
    const s = nz(c, 0.05, (p) => Math.pow(1 - p, 3)), f = c.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = 1800; s.connect(f).connect(out(c, 0.12)); s.start(t);
  }
  function unrollSnd() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const s = nz(c, 1.35, (p) => Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.1)), 0.8) * (1 - p * 0.6) * (0.55 + 0.45 * Math.random()));
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.9;
    f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(4200, t + 1.2);
    s.connect(f).connect(out(c, 0.2)); s.start(t);
    for (let i = 0; i < 9; i++) {
      const k = nz(c, 0.02, (p) => 1 - p), kf = c.createBiquadFilter();
      kf.type = "highpass"; kf.frequency.value = 3500;
      k.connect(kf).connect(out(c, 0.07 + Math.random() * 0.05)); k.start(t + 0.1 + Math.random() * 1.1);
    }
    const th = c.createOscillator(), tg = c.createGain();
    th.frequency.setValueAtTime(110, t + 1.3); th.frequency.exponentialRampToValueAtTime(60, t + 1.45);
    tg.gain.setValueAtTime(0.0001, t + 1.29); tg.gain.linearRampToValueAtTime(0.09, t + 1.3); tg.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    th.connect(tg).connect(c.destination); th.start(t + 1.29); th.stop(t + 1.55);
  }
  function chirp(vol = 0.12) {
    const c = ac(); if (!c || muted) return;
    let t = c.currentTime + 0.02;
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const f0 = 3200 + Math.random() * 900, f1 = f0 + 900 + Math.random() * 1300, d = 0.05 + Math.random() * 0.05;
      const o = c.createOscillator(), g = c.createGain(), v = c.createOscillator(), vg = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d * 0.6); o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + d);
      v.frequency.value = 38; vg.gain.value = 120; v.connect(vg).connect(o.frequency);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); v.start(t); o.stop(t + d + 0.02); v.stop(t + d + 0.02);
      t += d + (i % 2 ? 0.04 : 0.09) + Math.random() * 0.06;
    }
  }
  function wingFlutterSnd() {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime, dur = 1.6, len = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const tt = i / c.sampleRate;
      const flap = Math.pow(Math.max(0, Math.sin(tt * 2 * Math.PI * 11)), 3);
      d[i] = (Math.random() * 2 - 1) * flap * Math.min(1, (dur - tt) * 2) * Math.min(1, tt * 8);
    }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 0.6; g.gain.value = 0.35;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  }

  const SND = {}, SNDV = { standup2: 0.85, passport2: 0.9, frame: 0.8, bike: 0.75, money: 0.8, poster: 0.8, sad: 0.85, bird: 0.8 };
  let sndLoading = false;
  function loadSounds() {
    const c = ac();
    if (!c || sndLoading) return;
    sndLoading = true;
    for (const n in SNDV) {
      fetch("assets/snd/" + n + ".mp3")
        .then((r) => r.arrayBuffer())
        .then((b) => new Promise((ok, no) => c.decodeAudioData(b, ok, no)))
        .then((buf) => { SND[n] = buf; })
        .catch(() => {});
    }
  }
  function playReal(n, fallback, at = 0) {
    if (muted) return;
    const c = ac();
    if (c && SND[n]) {
      const s = c.createBufferSource(), g = c.createGain();
      s.buffer = SND[n]; g.gain.value = SNDV[n];
      s.connect(g).connect(c.destination);
      s.start(c.currentTime + at);
      return;
    }
    if (fallback) setTimeout(fallback, at * 1000);
  }
  function playSfx(n) {
    if (muted || !n) return;
    if (n === "bell") bell();
    else if (n === "rustle") rustle();
    else if (n === "chime") chime();
    else if (n === "creak") creak();
    else if (n === "cloth") cloth();
    else if (n === "pickup") pickup();
    else if (n === "unroll") unrollSnd();
    else if (n === "pigeon") chirp(0.14);
  }

  const AMB = {}, AMBV = { room: 0.55, airport: 0.55, azc: 0.55, city: 0.55, wind: 0.6 };
  let ambCur = null, ambWant = null, ambLoading = false;
  function loadAmb() {
    const c = ac();
    if (!c || ambLoading) return;
    ambLoading = true;
    for (const n in AMBV) {
      fetch("assets/snd/amb_" + n + ".mp3")
        .then((r) => r.arrayBuffer())
        .then((b) => new Promise((ok, no) => c.decodeAudioData(b, ok, no)))
        .then((buf) => {
          AMB[n] = buf;
          if (ambWant === n && (!ambCur || ambCur.n !== n)) amb(n);
        })
        .catch(() => {});
    }
  }
  function amb(n, fade = 2.5) {
    ambWant = n;
    const c = actx;
    if (!c) return;
    const t = c.currentTime;
    if (ambCur && ambCur.n === n) return;
    if (ambCur) {
      const o = ambCur;
      o.g.gain.cancelScheduledValues(t);
      o.g.gain.setValueAtTime(o.g.gain.value, t);
      o.g.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => { try { o.s.stop(); } catch (_) {} }, fade * 1000 + 100);
      ambCur = null;
    }
    if (!n || !AMB[n]) return;
    const s = c.createBufferSource(), g = c.createGain();
    s.buffer = AMB[n];
    s.loop = true;
    s.loopStart = 0.06;
    s.loopEnd = Math.max(0.2, AMB[n].duration - 0.06);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(muted ? 0 : AMBV[n], t + fade);
    s.connect(g).connect(c.destination);
    s.start(t, 0.06);
    ambCur = { n, s, g };
  }

  /* ===== Money Counting Canvas (Ch 3 after Amsterdam) ===== */
  const countMoney = (() => {
    const x = countPlane.ctx;
    x.scale(2, 2);
    let bill = null;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 52; c.height = 30;
      c.getContext("2d").drawImage(img, 5, 5, 52, 30, 0, 0, 52, 30);
      bill = c;
    };
    img.src = "assets/money.png";

    let on = false, fly = [], pile = [], lastSpawn = 0, fade = 1;
    const FROM = [180, 118], TO = [78, 142];
    function flick() {
      const c = ac(); if (!c || muted) return;
      const len = Math.floor(c.sampleRate * 0.07), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = b; f.type = "highpass"; f.frequency.value = 2500; g.gain.value = 0.12;
      s.connect(f).connect(g).connect(c.destination); s.start();
    }
    function drawBill(cx, cy, rot, sy, shade, alpha) {
      if (!bill) return;
      x.save();
      x.globalAlpha = alpha;
      x.translate(cx, cy);
      x.rotate(rot);
      x.scale(1, Math.max(0.06, Math.abs(sy)));
      x.drawImage(bill, -26, -15);
      if (shade > 0) {
        x.fillStyle = `rgba(20,30,20,${shade})`;
        x.fillRect(-26, -15, 52, 30);
      }
      x.restore();
    }
    let lastCountSt = -1;
    function update(now) {
      if (!on && fade <= 0 && !pile.length && !fly.length) return;
      const stNow = step12(now);
      if (stNow === lastCountSt) return;
      lastCountSt = stNow;
      x.clearRect(0, 0, 360, 180);
      if (on && stNow - lastSpawn > 430) {
        lastSpawn = stNow;
        fly.push({ t0: stNow, r: (Math.random() - 0.5) * 0.25 });
      }
      if (!on) fade = Math.max(0, fade - 0.03);
      for (const p of pile) drawBill(p.x, p.y, p.r, 1, 0, fade);
      fly = fly.filter((b) => {
        const t = Math.min(1, (stNow - b.t0) / 520);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const px = FROM[0] + (TO[0] - FROM[0]) * e;
        const py = FROM[1] + (TO[1] - FROM[1]) * e - Math.sin(Math.PI * e) * 38 - pile.length * 0.9 * e;
        const sy = Math.cos(Math.PI * e);
        drawBill(px, py, -0.15 + b.r * e + Math.sin(Math.PI * e) * 0.35, sy, sy < 0 ? 0.25 : 0, fade);
        if (t >= 1) {
          pile.push({ x: TO[0] + (Math.random() - 0.5) * 5, y: TO[1] - pile.length * 0.9, r: b.r + (Math.random() - 0.5) * 0.12 });
          flick();
          if (pile.length > 14) pile.shift();
          return false;
        }
        return true;
      });
      if (!on && fade <= 0) {
        pile = [];
        fly = [];
        x.clearRect(0, 0, 360, 180);
      }
      countPlane.tex.needsUpdate = true;
    }
    return {
      set(active) {
        if (active) {
          on = true;
          fade = 1;
          pile = [];
          fly = [];
          lastSpawn = 0;
        } else {
          on = false;
        }
      },
      reset() {
        on = false;
        fade = 0;
        pile = [];
        fly = [];
        x.clearRect(0, 0, 360, 180);
        countPlane.tex.needsUpdate = true;
      },
      update,
    };
  })();

  /* ===== Blackboard Chalk Progression & Growing Desk Letter Stack ===== */
  const timeProgression = (() => {
    /* 1. Blackboard (starts wiped clean with board_clean.png; chalk regions gradually revealed per chapter) */
    const bx = boardPlane.ctx;
    const boardImg = new Image();
    boardImg.src = "assets/board_clean.png";
    const REG = [
      [0.35,  135, 30,  145, 90],
      [0.51,  32,  135, 173, 135],
      [0.675, 45,  268, 100, 57],
      [0.675, 155, 258, 125, 142],
      [0.675, 190, 108, 90,  152],
      [0.84,  32,  403, 148, 142],
      [0.84,  170, 388, 110, 157],
    ];
    let bTarget = 0.12, bShown = {}, bDirty = true, bLastSt = -1, fullT = null;
    const wantReg = (t) => REG.map((r, i) => (t >= r[0] - 1e-4 ? i : -1)).filter((i) => i >= 0);

    function chalkSnd(at) {
      const c = actx; if (!c || muted) return;
      for (let j = 0; j < 7; j++) {
        const t0 = c.currentTime + at + j * 0.11 + Math.random() * 0.05;
        const s = nz(c, 0.07 + Math.random() * 0.06, (p) => Math.sin(Math.PI * p) * (0.5 + 0.5 * Math.random()));
        const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3200 + Math.random() * 1800; f.Q.value = 1.4;
        const g = c.createGain(); g.gain.value = 0.05;
        s.connect(f).connect(g).connect(c.destination); s.start(t0);
      }
    }

    function applyBoard(t, instant) {
      const now = performance.now();
      let k = 0;
      for (const i of wantReg(t)) {
        if (!(i in bShown)) {
          bShown[i] = instant ? -1e9 : now + k * 900;
          k++;
        }
      }
      if (t >= 0.999 && fullT === null) fullT = instant ? -1e9 : now + k * 900 + 600;
      bDirty = true;
      if (!instant && k && !muted && actx) {
        for (let q = 0; q < k; q++) chalkSnd(q * 0.9);
      }
    }
    boardImg.onload = () => { bDirty = true; };

    function updateBoard(now) {
      const stNow = step12(now);
      if (!boardImg.complete || !boardImg.naturalWidth) return;
      if (!bDirty && stNow === bLastSt) return;
      let anim = false;
      const prog = {};
      for (const i in bShown) {
        const p = Math.max(0, Math.min(1, (now - bShown[i]) / 1600));
        prog[i] = p;
        if (p < 1) anim = true;
      }
      const fa = fullT === null ? 0 : Math.max(0, Math.min(1, (now - fullT) / 1800));
      if (fullT !== null && fa < 1) anim = true;
      if (!bDirty && !anim) return;

      bLastSt = stNow;
      bDirty = false;
      bx.setTransform(1, 0, 0, 1, 0, 0);
      bx.clearRect(0, 0, 560, 1200);
      if (fa < 1) {
        bx.globalAlpha = 1 - fa;
        bx.drawImage(boardImg, 0, 0, 560, 1200);
        bx.globalAlpha = 1;
        bx.setTransform(2, 0, 0, 2, 0, 0);
        bx.globalCompositeOperation = "destination-out";
        for (const i in prog) {
          const [, rx, ry, rw, rh] = REG[i], p = prog[i];
          if (p <= 0) continue;
          const L = rw + rh * 0.6, front = p * (L + 30);
          const g = bx.createLinearGradient(rx, ry, rx + L * 0.86, ry + L * 0.5);
          const a = Math.max(0, Math.min(1, (front - 30) / L));
          const b = Math.max(0, Math.min(1, front / L));
          g.addColorStop(0, "rgba(0,0,0,1)");
          g.addColorStop(a, "rgba(0,0,0,1)");
          g.addColorStop(Math.max(a, b), "rgba(0,0,0,0)");
          g.addColorStop(1, "rgba(0,0,0,0)");
          bx.fillStyle = g;
          bx.beginPath();
          if (bx.roundRect) bx.roundRect(rx, ry, rw, rh, 10);
          else bx.rect(rx, ry, rw, rh);
          bx.fill();
        }
        bx.globalCompositeOperation = "source-over";
      }
      boardPlane.tex.needsUpdate = true;
    }

    /* 2. Desk Letter & Form Stack */
    const sx = stackPlane.ctx;
    const MAP = [[0, 1], [0.12, 1], [0.35, 2], [0.51, 5], [0.675, 9], [0.84, 14], [1, 19]];
    const wantStack = (t) => { let n = 1; for (const [a, c] of MAP) if (t >= a - 1e-4) n = c; return n; };
    let sr = 5;
    const SR = () => { sr = (sr * 16807) % 2147483647; return sr / 2147483647; };
    const KINDS = [
      { f: "#cfc8b8", lines: 1 },
      { f: "#bfae8c", env: 1 },
      { f: "#d6cfc0", lines: 1, stamp: 1 },
      { f: "#9f845b", env: 1 },
      { f: "#c4c8ca", lines: 1 },
      { f: "#cdc2ae", env: 1, stamp: 1 },
    ];
    const IT = [];
    for (let i = 0; i < 20; i++) {
      const k = KINDS[Math.floor(SR() * KINDS.length)];
      IT.push({ k, w: 70 + SR() * 16, h: 90 + SR() * 12, rot: (SR() - 0.5) * 0.5, dx: (SR() - 0.5) * 14, dy: (SR() - 0.5) * 6 });
    }
    let sShown = 1, drops = [], sDirty = true, sLastSt = -1;
    const BX = 120, BY = 170, TH = 2.6;

    function chainStack(t, instant) {
      const n = wantStack(t);
      if (n <= sShown) return;
      const now = performance.now();
      for (let i = sShown; i < n; i++) drops.push({ i, t0: instant ? -1e9 : now + (i - sShown) * 380 });
      if (!instant && !muted && actx) {
        for (let i = 0; i < n - sShown; i++) setTimeout(() => { try { rustle(); } catch (_) {} }, i * 380 + 250);
      }
      sShown = n;
      sDirty = true;
    }

    function drawStackItem(it, lift, alpha) {
      const k = it.k;
      sx.save();
      sx.globalAlpha = alpha;
      sx.translate(0, -lift);
      sx.scale(1, 0.42);
      sx.rotate(-0.26 + it.rot);
      const w = it.w, h = it.h;
      sx.fillStyle = "rgba(0,0,0,.25)";
      sx.fillRect(-w / 2 + 3, -h / 2 + 5, w, h);
      sx.fillStyle = k.f;
      sx.fillRect(-w / 2, -h / 2, w, h);
      sx.lineWidth = 2;
      sx.strokeStyle = "#1b1712";
      sx.strokeRect(-w / 2, -h / 2, w, h);
      if (k.env) {
        sx.beginPath(); sx.moveTo(-w / 2, -h / 2); sx.lineTo(0, -h * 0.05); sx.lineTo(w / 2, -h / 2);
        sx.lineWidth = 1.4; sx.strokeStyle = "rgba(27,23,18,.6)"; sx.stroke();
      }
      if (k.lines) {
        sx.strokeStyle = "rgba(40,34,28,.45)"; sx.lineWidth = 2.2;
        for (let j = 0; j < 7; j++) {
          const yy = -h / 2 + 16 + j * 11;
          sx.beginPath(); sx.moveTo(-w / 2 + 10, yy); sx.lineTo(w / 2 - 10 - (j % 3) * 12, yy); sx.stroke();
        }
      }
      if (k.stamp) {
        sx.strokeStyle = "rgba(150,36,28,.8)"; sx.lineWidth = 2.5; sx.strokeRect(w / 2 - 34, h / 2 - 24, 26, 16);
      }
      sx.restore();
    }

    function updateStack(now) {
      const stNow = step12(now);
      const anim = drops.some((d) => now - d.t0 < 700);
      if ((!sDirty && !anim) || stNow === sLastSt) return;
      sLastSt = stNow;
      sDirty = false;
      sx.setTransform(1, 0, 0, 1, 0, 0);
      sx.clearRect(0, 0, 480, 440);
      sx.setTransform(2, 0, 0, 2, 0, 0);
      const fall = {};
      for (const d of drops) fall[d.i] = Math.max(0, Math.min(1, (now - d.t0) / 700));
      for (let i = 0; i < sShown; i++) {
        const it = IT[i];
        const p = i in fall ? fall[i] : 1;
        if (p <= 0) continue;
        const e = 1 - Math.pow(1 - p, 3);
        sx.save();
        sx.translate(BX + it.dx + (1 - e) * -30, BY + it.dy * 0.4);
        drawStackItem(it, i * TH + (1 - e) * 60, Math.min(1, p * 2));
        sx.restore();
      }
      drops = drops.filter((d) => now - d.t0 < 700);
      stackPlane.tex.needsUpdate = true;
    }

    return {
      advanceTo(t) {
        if (t > bTarget) {
          bTarget = t;
          applyBoard(t, false);
        }
        chainStack(t, false);
      },
      setNow(t) {
        bTarget = t;
        bShown = {};
        fullT = null;
        applyBoard(t, true);
        sShown = 1;
        drops = [];
        sDirty = true;
        chainStack(t, true);
      },
      update(now) {
        updateBoard(now);
        updateStack(now);
      },
    };
  })();

  /* ===== Captions ===== */
  const capEl = $("caption");
  let capTimer = null;
  function say(text, ms = 4200) {
    clearTimeout(capTimer);
    if (!text) {
      capEl.classList.remove("show");
      return;
    }
    capEl.textContent = text;
    capEl.classList.add("show");
    if (ms) capTimer = setTimeout(() => capEl.classList.remove("show"), ms);
  }

  /* ===== Camera Zoom Tween (camTo) & Dove Cinematic Interlude (birdCine) ===== */
  function camTo(z, dx, dy, cx, cy, ms) {
    return new Promise((res) => {
      const from = Object.assign({ z: 1, dx: 0, dy: 0, cx, cy }, window.CAM || {});
      const t0 = performance.now();
      (function f(now) {
        const p = Math.min(1, (now - t0) / ms);
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        window.CAM = {
          z: from.z + (z - from.z) * e,
          dx: from.dx + (dx - from.dx) * e,
          dy: from.dy + (dy - from.dy) * e,
          cx,
          cy,
        };
        fit();
        if (p < 1) requestAnimationFrame(f);
        else res();
      })(performance.now());
    });
  }

  const cineV = $("cineV");
  cineV.muted = true;
  cineV.playsInline = true;
  function cineSrc() {
    const want = "birdout" + (innerHeight > innerWidth ? "_v" : "") + ".mp4";
    if (!cineV.src.endsWith("/" + want)) {
      cineV.src = "assets/" + want;
      cineV.load();
      return true;
    }
    return false;
  }
  let cineLoading = false;
  function loadCine() {
    if (cineLoading) return;
    cineLoading = true;
    cineV.preload = "auto";
    cineSrc();
    cineV.load();
  }
  const CINE_START = 0.4;
  async function birdCine() {
    const box = $("cine");
    loadCine();
    if (cineSrc()) cineV.load();
    if (cineV.readyState < 4) {
      await new Promise((r) => {
        cineV.addEventListener("canplaythrough", () => r(), { once: true });
        setTimeout(r, 3500);
      });
    }
    await new Promise((r) => {
      const d = () => r();
      cineV.addEventListener("seeked", d, { once: true });
      setTimeout(d, 700);
      try { cineV.currentTime = CINE_START; } catch (_) { d(); }
    });
    const [bx, by, bw, bh] = LAYERS.bird.rect;
    const P = { x: bx + bw * 0.5, y: by + bh * 0.55 };
    const zoomP = camTo(1.8, 0, 0, P.x, P.y, 1300);
    await sleep(850);
    box.classList.add("on");
    await zoomP;
    if (!muted && actx) {
      playReal("bird", () => {
        chirp(0.12);
        setTimeout(() => wingFlutterSnd(), 1000);
        setTimeout(() => chirp(0.07), 2600);
      });
    }
    const p = cineV.play();
    if (p) p.catch(() => {});
    await new Promise((r) => {
      const done = () => r();
      cineV.addEventListener("ended", done, { once: true });
      setTimeout(done, ((cineV.duration || 5) - CINE_START) * 1000 + 800);
    });
    setGone("bird", true, 0);
    window.CAM = null;
    fit();
    box.classList.remove("on");
    await sleep(750);
  }

  /* ===== Occasional Ambient Dove Movement on Bedpost ===== */
  let birdBusy = false;
  async function birdMove() {
    if (birdBusy || objs.bird.gone || $("start").classList.contains("show") || LD.busy) return;
    birdBusy = true;
    const v = await startClip("pigeon");
    showClip("pigeon", 150);
    setGone("bird", true, 0.12);
    if (!muted && actx) {
      chirp(0.1);
      setTimeout(() => chirp(0.08), 900);
    }
    await waitClipEnded(v);
    hideClip("pigeon", 150);
    if (!st.has(4)) setGone("bird", false, 0.15);
    birdBusy = false;
  }

  /* ===== Reject Poster Unrolling Animation (Ch 4) ===== */
  async function unrollPoster() {
    if (objs.reject.gone) return;
    playReal("poster", () => playSfx("unroll"));
    const top = 392, h = 250, startY = 487, endY = 612, dur = 1300;
    const rollBaseY = objs.roll.baseY;
    objs.rejectOpen.uniforms.uClipY.value = (startY - top) / h;
    setGone("rejectOpen", false, 0);
    setGone("roll", false, 0);
    setGone("reject", true, 0);

    await new Promise((res) => {
      const t0 = performance.now();
      (function f(now) {
        const stNow = step12(now - t0) + t0;
        const p = Math.min(1, (stNow - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        const y = startY + (endY - startY) * e;
        objs.rejectOpen.uniforms.uClipY.value = (y - top) / h;
        objs.roll.mesh.position.y = rollBaseY - (y - startY);
        objs.roll.mesh.scale.setScalar(1 - 0.35 * e);
        objs.roll.alpha = 1 - Math.max(0, (p - 0.75) / 0.25);
        objs.roll.targetAlpha = objs.roll.alpha;
        objs.roll.uniforms.uAlpha.value = objs.roll.alpha;
        if (p < 1) requestAnimationFrame(f);
        else res();
      })(performance.now());
    });

    objs.rejectOpen.uniforms.uClipY.value = 2.0;
    setGone("roll", true, 0);
    objs.roll.mesh.position.y = rollBaseY;
    objs.roll.mesh.scale.setScalar(1);
    await sleep(450);
  }

  /* ===== Room State, Hotspots & Refresh ===== */
  let started = false;
  let introSeen = false;
  let busy = false;
  const hots = {};

  function nextIdx() {
    const nxt = st.next();
    return nxt ? nxt - 1 : CHAPTERS.length;
  }
  function isChapterVisible(chNum) {
    if (chNum === 1) return true;
    if (st.has(chNum) || st.has(chNum - 1)) return true;
    return nextIdx() >= chNum - 1;
  }
  function syncChapterObjects(instant = false) {
    const fadeSec = instant ? 0 : 0.45;
    setGone("passport", false, 0);
    setGone("frame", !isChapterVisible(2), fadeSec);
    const ch3Vis = isChapterVisible(3);
    setGone("bike", !ch3Vis, fadeSec);
    setGone("money", !ch3Vis, fadeSec);
    const ch4Vis = isChapterVisible(4);
    if (!ch4Vis) {
      setGone("reject", true, fadeSec);
      setGone("rejectOpen", true, fadeSec);
    } else if (st.has(4)) {
      setGone("reject", true, 0);
      setGone("rejectOpen", false, fadeSec);
      objs.rejectOpen.uniforms.uClipY.value = 2.0;
    } else if (objs.reject.gone && objs.rejectOpen.gone) {
      setGone("reject", false, fadeSec);
      setGone("rejectOpen", true, 0);
    }
  }
  function unlocked(i) {
    return introSeen && isChapterVisible(i + 1) && (st.has(i + 1) || i <= nextIdx());
  }

  function mkHot(id, hit, label, onClick, glowObjFn) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hot";
    b.setAttribute("aria-label", label);
    const [x, y, w, h] = hit;
    Object.assign(b.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
    b.onmouseenter = b.onfocus = () => {
      if (!b.disabled && !b.classList.contains("locked")) {
        const gName = glowObjFn();
        if (gName) setGlow(gName, true);
      }
    };
    b.onmouseleave = b.onblur = () => {
      const gName = glowObjFn();
      if (gName) setGlow(gName, false);
    };
    b.onclick = onClick;
    hotsEl.appendChild(b);
    hots[id] = b;
    return b;
  }

  mkHot("sam", [985, 545, 235, 405], "Sam", () => standUp(), () => "man");
  CHAPTERS.forEach((c, i) => {
    mkHot(
      c.id,
      c.hit,
      `Chapter ${c.n} · ${c.title}`,
      () => triggerChapter(i),
      () => (c.id === "reject" ? (objs.reject.gone ? "rejectOpen" : "reject") : c.id)
    );
  });

  function refresh(instantTime = false) {
    const count = st.count;
    const pEve = introSeen ? Math.min(1, count / (CHAPTERS.length - 1)) : 0;
    eveTarget = pEve;
    if (instantTime) {
      eveCur = pEve;
      setRays(pEve);
    }

    const pt = introSeen ? 0.35 + 0.65 * Math.min(1, count / CHAPTERS.length) : 0.12;
    if (instantTime) timeProgression.setNow(pt);
    else timeProgression.advanceTo(pt);

    const n = introSeen ? nextIdx() : -1;
    const sb = hots.sam;
    sb.hidden = introSeen;
    sb.disabled = busy || LD.busy;

    syncChapterObjects(instantTime);

    CHAPTERS.forEach((c, i) => {
      const b = hots[c.id];
      const vis = isChapterVisible(c.n);
      b.hidden = !vis;
      b.disabled = busy || LD.busy || !vis;
      const isOpen = unlocked(i);
      b.classList.toggle("locked", !isOpen);
      if (c.id === "reject") {
        const rect = objs.reject.gone ? c.openHit : c.hit;
        Object.assign(b.style, { left: rect[0] + "px", top: rect[1] + "px", width: rect[2] + "px", height: rect[3] + "px" });
      }
    });

    /* Preload next interactive chapter iframe quietly when idle in room */
    const nxt = st.next() || 1;
    if (nxt && !busy && !LD.busy) {
      LD.prepareChapter(nxt);
    }

    /* Update Three.js Golden Ripple Marker */
    let tgt = null;
    if (!introSeen) {
      tgt = [985, 545, 235, 405];
    } else if (n >= 0 && n < CHAPTERS.length) {
      const c = CHAPTERS[n];
      tgt = c.mark ? [c.mark[0], c.mark[1], 0, 0] : c.hit;
    }
    const showMarker = !!tgt && !busy && !LD.busy && !$("start").classList.contains("show") && !$("end").classList.contains("show");
    document.body.classList.toggle("card-open", $("start").classList.contains("show") || $("end").classList.contains("show"));
    markerTargetAlpha = showMarker ? 1 : 0;
    if (tgt) {
      markerMesh.visible = true;
      markerMesh.position.set(tgt[0] + tgt[2] / 2, -(tgt[1] + tgt[3] / 2), 0);
    }
  }

  /* ===== Prologue: Sam Stands Up From Bed -> Immediately to Hand-on-Chin Idle ===== */
  const STANDUP_TO_IDLE_TIME = 1.83; // Frame 22: Sam has stood up and brought both feet together, before turning to window

  async function standUp() {
    if (busy || introSeen || LD.busy) return;
    primeRoomAudioAndVideo();
    unlockAudio();
    busy = true;
    clearAllGlows();
    refresh();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

    const v = vids.standup;
    const preLayer = findClipLayer("standup");
    if (preLayer && preLayer.alpha > 0.5 && v.currentTime < 0.15) {
      const p = v.play();
      if (p) p.catch(() => {});
      await firstFrame(v);
    } else {
      await startClip("standup");
    }
    showClip("standup", 60);
    setGone("man", true, 0.06);
    if (!muted && actx) {
      playReal("standup2", () => {
        playSfx("creak");
        setTimeout(() => playSfx("cloth"), 350);
        [1.15, 1.62].forEach((a, idx) => footstep(a, 0.42 - idx * 0.06));
      });
    }

    await new Promise((r) => {
      const iv = setInterval(() => {
        if (v.currentTime >= STANDUP_TO_IDLE_TIME || v.ended) {
          clearInterval(iv);
          r();
        }
      }, 20);
      v.addEventListener("ended", () => { clearInterval(iv); r(); }, { once: true });
    });
    v.pause();

    await startClip("idle");
    showClip("idle", 70);
    hideClip("standup", 70);
    introSeen = true;
    busy = false;
    refresh();
  }

  /* ===== Finale After Chapter 4: Sam Turns to Look Out the Window -> Dove Flies Out -> Slow Window Zoom ===== */
  async function playWindowGaze() {
    const v = vids.standup;
    v.pause();
    await new Promise((res) => {
      let done = false;
      const ok = () => {
        if (!done) {
          done = true;
          res();
        }
      };
      v.addEventListener("seeked", ok, { once: true });
      setTimeout(ok, 400);
      try {
        v.currentTime = STANDUP_TO_IDLE_TIME;
      } catch (_) {
        ok();
      }
    });
    const p = v.play();
    if (p) p.catch(() => {});
    await firstFrame(v);
    showClip("standup", 90);
    hideClip("idle", 90);

    await new Promise((r) => {
      const iv = setInterval(() => {
        if (v.currentTime >= v.duration - 0.12 || v.ended) {
          clearInterval(iv);
          r();
        }
      }, 40);
      v.addEventListener("ended", () => { clearInterval(iv); r(); }, { once: true });
      setTimeout(() => { clearInterval(iv); r(); }, 3400);
    });
    v.pause();
  }

  async function playFinale(c) {
    await playWindowGaze();
    if (!objs.bird.gone) {
      await birdCine();
    }
    await sleep(900);
    hideClip("standup", 1800);
    hideClip("idle", 600);
    refresh();
    await sleep(1900);
    const zoom = camTo(1.14, 0, 0, 870, 470, 7000);
    await sleep(4200);
    $("end").classList.add("final", "show");
    document.body.classList.add("card-open");
    await zoom;
    busy = false;
  }

  /* ===== Chapter Trigger: Smooth Fade -> Interactive Video Chapter -> Return ===== */
  async function triggerChapter(i, skipInRoomLead = false, fromHistory = false) {
    const c = CHAPTERS[i];
    if (!c || busy || LD.busy) return;
    primeRoomAudioAndVideo();
    unlockAudio();
    stopIdleReact();

    if (!introSeen) {
      if (!skipInRoomLead) return;
      introSeen = true;
      setGone("man", true, 0);
      await startClip("idle");
      showClip("idle", 10);
    }

    if (!skipInRoomLead && !unlocked(i)) {
      return;
    }

    busy = true;
    clearAllGlows();
    say("", 0);
    refresh();

    /* Ensure Chapter 4 letter is open when Chapter 4 is triggered */
    if (c.id === "reject") {
      setGone("reject", true, 0);
      setGone("rejectOpen", false, 0);
      objs.rejectOpen.uniforms.uClipY.value = 2.0;
    }

    /* Advance blackboard & desk letters as Sam progresses */
    const nextCount = st.count + (st.has(c.n) ? 0 : 1);
    timeProgression.advanceTo(0.35 + 0.65 * Math.min(1, nextCount / CHAPTERS.length));

    if (c.id === "bike" || c.id === "reject") loadCine();

    /* Subtle foley feedback when clicking the object, then fade out room ambience for chapter video */
    if (!skipInRoomLead && c.fb) playSfx(c.fb);
    amb(null, 0.8);

    LD.openChapter(c.n, {
      fromHistory,
      onClose: async (chNum, seen) => {
        if (seen && !st.has(chNum)) {
          st.mark(chNum);
          hudUi.update();
        }

        /* Update evening light, blackboard, desk stack, and progressive chapter objects */
        refresh(false);

        /* Chapter 4 Finale: Sam turns to look out the window -> Dove flies out -> Sam fades out -> Slow window zoom -> The End */
        if (chNum === 4 && st.count === CHAPTERS.length && seen) {
          setGone("reject", true, 0);
          setGone("rejectOpen", false, 0);
          objs.rejectOpen.uniforms.uClipY.value = 2.0;
          await playFinale(c);
          return;
        }

        /* Return Sam to calm room idle loop & fade room ambience back in */
        await startClip("idle");
        showClip("idle", 250);
        hideClip(c.clip, 250);
        amb("room", 3.5);
        busy = false;
        refresh(false);
      },
    });
  }

  /* Handle direct URL chapter deep links (#ch=1..4) and Browser Back/Forward */
  LD.onRouteChapter((chNum, fromHistory) => {
    if ($("start").classList.contains("show")) {
      $("start").classList.remove("show");
      started = true;
    }
    triggerChapter(chNum - 1, true, !!fromHistory);
  });

  /* ===== Restore / Reset Room State ===== */
  function poseSittingOnBed() {
    introSeen = false;
    for (const l of clipLayers) l.target = 0;
    Object.values(vids).forEach((v) => v.pause());
    if (clipMeshes.standup) {
      clipMeshes.standup.mesh.position.x = clipMeshes.standup.baseX;
      clipMeshes.standup.mat.uniforms.uStool.value = -1;
    }
    setGone("man", false, 0);
    const sv = vids.standup;
    sv.pause();
    let swapped = false;
    const minReady = 4;
    const doSwap = () => {
      if (swapped || introSeen || busy) return;
      if (sv.readyState < minReady) {
        sv.addEventListener("canplaythrough", doSwap, { once: true });
        return;
      }
      swapped = true;
      const l = findClipLayer("standup");
      if (l) l.alpha = 0;
      showClip("standup", 300);
      setTimeout(() => {
        if (!introSeen && !busy) setGone("man", true, 0.25);
      }, 320);
    };
    const seekFirstFrame = () => {
      if (swapped || introSeen || busy) return;
      sv.addEventListener("seeked", doSwap, { once: true });
      setTimeout(doSwap, 550);
      try { sv.currentTime = 0.04; } catch (_) { doSwap(); }
    };
    if (sv.readyState >= minReady) seekFirstFrame();
    else sv.addEventListener("canplaythrough", seekFirstFrame, { once: true });
  }

  async function syncRoomFromSavedState(instant = true) {
    $("end").classList.remove("final", "show");
    window.CAM = null;
    fit();
    stopIdleReact();
    say("", 0);
    countMoney.reset();
    objs.money.flutter = false;
    setGone("seat", true, 0);
    setGone("roll", true, 0);
    syncChapterObjects(true);

    if (st.count === 0) {
      setGone("bird", false, 0);
      poseSittingOnBed();
      busy = false;
      refresh(true);
      if (started && actx) amb("room", 3);
      return;
    }

    /* Saved progress exists: Sam is already standing in the room */
    introSeen = true;
    busy = false;
    setGone("man", true, 0);
    setGone("bird", st.has(4), 0);
    refresh(instant);
    for (const l of clipLayers) {
      if (l.name !== "idle") l.target = 0;
    }
    await startClip("idle");
    showClip("idle", instant ? 10 : 300);
    refresh(instant);
    if (started && actx) amb("room", 3);
  }

  /* ===== Shared HUD (Production 4 Icons in ?dev=0 / Dev Bar & Shortcuts 1-4, 0 in ?dev=1) ===== */
  const hudUi = LD.hud({
    name: "The Room",
    st,
    onReset: () => {
      if ($("start").classList.contains("show")) {
        $("start").classList.remove("show");
        started = true;
      }
      syncRoomFromSavedState(true);
    },
    onDev: () => {
      if ($("start").classList.contains("show")) {
        $("start").classList.remove("show");
        started = true;
        unlockAudio();
        loadSounds();
        loadAmb();
      }
      syncRoomFromSavedState(false);
    },
  });

  $("again").onclick = () => {
    st.reset();
    hudUi.update();
    syncRoomFromSavedState(true);
  };

  $("rotateOk").onclick = () => {
    rotateOk = true;
    fit();
  };

  /* ===== Idle 15s Room Reaction (Sam looks around / thinks) ===== */
  let idleT = performance.now();
  let reacting = false;
  let reactAbort = null;
  const poke = () => { idleT = performance.now(); };
  addEventListener("pointerdown", poke, { passive: true });
  addEventListener("keydown", poke);
  addEventListener("pointermove", poke, { passive: true });

  function stopIdleReact() {
    if (!reacting) return;
    reacting = false;
    if (reactAbort) reactAbort();
    reactAbort = null;
    showClip("idle", 250);
    hideClip("think", 250);
    try { vids.think.pause(); } catch (_) {}
  }

  setInterval(async () => {
    if (busy || LD.busy || !started || !introSeen || document.hidden || st.count >= CHAPTERS.length) {
      idleT = performance.now();
      return;
    }
    if ($("start").classList.contains("show") || $("end").classList.contains("show")) return;
    if (performance.now() - idleT < 15000 || reacting) return;

    reacting = true;
    idleT = performance.now();
    const v = await startClip("think");
    if (!reacting) return;
    showClip("think", 450);
    hideClip("idle", 450);
    if (!muted && actx) setTimeout(() => { if (reacting) playSfx("cloth"); }, 400);
    await Promise.race([waitClipEnded(v), new Promise((r) => { reactAbort = r; })]);
    if (reacting) {
      reacting = false;
      reactAbort = null;
      showClip("idle", 450);
      hideClip("think", 450);
      idleT = performance.now();
    }
  }, 1000);

  /* ===== Initial Asset Preloading & Direct Entry Into 2D Room ===== */
  const startBtn = $("startBtn");
  const loadBarFill = document.querySelector("#loadbar span");
  const curtainEl = $("curtain");
  let loadedClips = 0;
  let roomRevealed = false;
  const totalClips = Object.keys(vids).length;

  function revealRoom() {
    if (roomRevealed) return;
    roomRevealed = true;
    started = true;
    $("start").classList.remove("show");
    if (curtainEl) curtainEl.classList.add("off");
    unlockAudio();
    loadSounds();
    loadAmb();
    amb("room", 4);
    LD.prepareChapter(st.next() || 1);
    if (!st.has(4)) setTimeout(() => birdMove(), 2000);
  }

  function onClipLoaded() {
    loadedClips++;
    if (loadBarFill) loadBarFill.style.width = Math.min(100, (loadedClips / totalClips) * 100) + "%";
    if (loadedClips >= totalClips) {
      startBtn.disabled = false;
      startBtn.textContent = st.count > 0 && st.count < 4 ? "Continue" : "Start";
      revealRoom();
    }
  }

  for (const v of Object.values(vids)) {
    let done = false;
    const ok = () => {
      if (!done) {
        done = true;
        onClipLoaded();
      }
    };
    v.addEventListener("canplaythrough", ok, { once: true });
    v.addEventListener("error", ok, { once: true });
    setTimeout(ok, 1800);
    v.load();
  }

  startBtn.onclick = () => {
    primeRoomAudioAndVideo();
    revealRoom();
  };

  if ($("backHome") && location.search) {
    $("backHome").href = "../index.html" + location.search;
  }

  /* Initialize stage sizing & background room state */
  started = true;
  fit();
  syncRoomFromSavedState(true);
  setTimeout(revealRoom, 900);

  /* ===== Pause / Resume When Chapter Video Opens or App Backgrounds ===== */
  let running = true;
  let lastFrameNow = performance.now();

  window.addEventListener("ld:pause", () => {
    running = false;
    amb(null, 0.3);
  });
  window.addEventListener("ld:resume", () => {
    if (!running) {
      running = true;
      lastFrameNow = performance.now();
      requestAnimationFrame(renderLoop);
    }
  });

  /* ===== Main Three.js Render Loop ===== */
  function renderLoop(now) {
    if (!running) return;
    const dt = Math.min(0.08, Math.max(0.001, (now - lastFrameNow) / 1000));
    lastFrameNow = now;
    const T = now / 1000;
    const st12 = step12(now);

    /* 1. Evening progression (~5s smooth transition) & Sunbeam updates */
    if (Math.abs(eveTarget - eveCur) > 0.0005) {
      eveCur += (eveTarget - eveCur) * Math.min(1, dt * 0.55);
      if (Math.abs(eveTarget - eveCur) < 0.001) eveCur = eveTarget;
      setRays(eveCur);
    }
    eveMultMat.uniforms.uEve.value = eveCur;
    warmGlowMat.uniforms.uEve.value = eveCur;
    objs.light1.mat.opacity = 0.36 * (1 - eveCur);
    objs.light2.mat.opacity = 0.34 * (1 - eveCur);

    if (!REDUCED_MOTION && !LITE) {
      raysA.mat.uniforms.uGain.value = 0.85 + 0.15 * Math.cos((T / 9) * Math.PI * 2);
      raysB.mat.uniforms.uGain.value = 0.40 - 0.40 * Math.cos((T / 13) * Math.PI * 2);
    }

    /* 2. Interactive object fades, hover glows & Ch 3 money flutter */
    for (const k in objs) {
      const o = objs[k];
      if (!o.uniforms) continue;
      if (Math.abs(o.targetAlpha - o.alpha) > 0.001) {
        const stepA = Math.min(Math.abs(o.targetAlpha - o.alpha), o.alphaSpeed * dt);
        o.alpha += Math.sign(o.targetAlpha - o.alpha) * stepA;
        o.uniforms.uAlpha.value = o.alpha;
        o.mesh.visible = o.alpha > 0.002;
      }
      const gDiff = o.glowTarget - o.uniforms.uGlow.value;
      if (Math.abs(gDiff) > 0.002) {
        o.uniforms.uGlow.value += gDiff * Math.min(1, dt * 10);
      } else {
        o.uniforms.uGlow.value = o.glowTarget;
      }
    }

    if (objs.money.flutter && !REDUCED_MOTION) {
      const stepIdx = Math.floor((now % 1100) / (1100 / 4));
      const poses = [
        [0, 0],
        [-0.044, 4],
        [0.026, 1],
        [-0.018, 5],
      ];
      const [rot, liftY] = poses[stepIdx] || poses[0];
      objs.money.mesh.rotation.z = rot;
      objs.money.mesh.position.y = objs.money.baseY + liftY;
    } else if (objs.money.mesh.rotation.z !== 0) {
      objs.money.mesh.rotation.z = 0;
      objs.money.mesh.position.y = objs.money.baseY;
    }

    /* 3. Sam & Pigeon Clips (Video chroma-key on desktop / WebP sprite sheets on LITE) */
    for (const l of clipLayers) {
      l.alpha += Math.sign(l.target - l.alpha) * Math.min(Math.abs(l.target - l.alpha), l.speed * dt);
    }
    clipLayers = clipLayers.filter((l) => {
      if (l.target === 0 && l.alpha <= 0.002) {
        clipMeshes[l.name].mesh.visible = false;
        return false;
      }
      return true;
    });

    for (const n in clipMeshes) {
      const l = findClipLayer(n);
      const cm = clipMeshes[n];
      if (!l) {
        cm.mesh.visible = false;
        continue;
      }
      const v = vids[n];
      const f12 = Math.floor(v.currentTime * 12 + 1e-4);
      const stoolP =
        n === "standup" && f12 >= 4 && f12 <= 11
          ? (f12 - 4) / 7
          : -1;
      if (v.readyState >= 4 && v.img.naturalWidth) {
        const f = v.frame();
        if (f !== cm.lastFrame) {
          cm.lastFrame = f;
          const m = v.m;
          const col = f % m.cols;
          const row = Math.floor(f / m.cols);
          const iw = v.img.naturalWidth;
          const ih = v.img.naturalHeight;
          const u0 = (col * m.fw) / iw;
          const du = m.fw / iw;
          const v0 = 1 - ((row + 1) * m.fh) / ih;
          const dv = m.fh / ih;
          cm.mat.uniforms.uSubUv.value.set(u0, v0, du, dv);
          cm.mat.uniforms.uStool.value = stoolP;
          if (n === "standup") {
            cm.mesh.position.x = cm.baseX + standupOffsetX(f);
          }
        }
        cm.mat.uniforms.uAlpha.value = Math.max(0, Math.min(1, l.alpha));
        cm.mesh.visible = l.alpha > 0.002;
      }
    }

    /* 4. Blackboard, Desk Letter Stack & Money Counter Canvas Updates */
    timeProgression.update(now);
    countMoney.update(now);

    /* 5. Floating Dust Motes Physics & Illumination */
    VORTICES[0].x = 700 + Math.sin(T * 0.05) * 180;
    VORTICES[0].y = 640 + Math.cos(T * 0.04) * 90;
    VORTICES[1].x = 1150 + Math.cos(T * 0.045) * 150;
    VORTICES[1].y = 520 + Math.sin(T * 0.06) * 110;
    VORTICES[2].x = 430 + Math.sin(T * 0.035) * 120;

    const samMoving = clipLayers.some((l) => l.alpha > 0.5 && l.name !== "idle" && l.name !== "pigeon");
    for (let i = 0; i < DUST_N; i++) {
      const p = dustParticles[i];
      if (!REDUCED_MOTION) {
        p.ph += dt * p.sp;
        let fx = Math.sin(p.y * 0.0042 + T * 0.21) * 9 + Math.sin(p.y * 0.012 - T * 0.15) * 4;
        let fy = Math.cos(p.x * 0.0033 + T * 0.16) * 6 + Math.sin(p.x * 0.009 + T * 0.11) * 2.5 - 2.2 * beamAt(p.x, p.y);
        for (const v of VORTICES) {
          const dx = p.x - v.x, dy = p.y - v.y, d2 = dx * dx + dy * dy, R2 = v.r * v.r;
          if (d2 < R2) {
            const k = (1 - d2 / R2) * 14 * v.s;
            fx += (-dy / v.r) * k;
            fy += (dx / v.r) * k;
          }
        }
        if (samMoving) {
          const dx = p.x - 927, dy = p.y - 680, d = Math.hypot(dx, dy) + 1;
          if (d < 320) {
            const k = (1 - d / 320) * 22;
            fx += (dx / d) * k;
            fy += (dy / d) * k - 6 * (1 - d / 320);
          }
        }
        p.vx += (fx * (0.45 + p.z) - p.vx) * Math.min(1, dt * 1.6);
        p.vy += (fy * (0.45 + p.z) - p.vy) * Math.min(1, dt * 1.6);
        p.x += (p.vx + Math.cos(p.ph * p.spin) * p.orb * 0.25) * dt;
        p.y += (p.vy + Math.sin(p.ph * p.spin) * p.orb * 0.2) * dt;
        if (p.x < -20) p.x += STAGE_W + 40;
        if (p.x > STAGE_W + 20) p.x -= STAGE_W + 40;
        if (p.y < -20) p.y += STAGE_H + 40;
        if (p.y > STAGE_H + 20) p.y -= STAGE_H + 40;
      }
      dustPos[i * 3] = p.x;
      dustPos[i * 3 + 1] = -p.y;
      const L = beamAt(p.x, p.y) * (1 - 0.55 * eveCur);
      const glint = 0.5 + 0.5 * Math.pow(Math.max(0, Math.sin(p.ph * p.tw * 2)), 3);
      const a = L * 1.05 * glint + 0.02;
      dustAlpha[i] = a < 0.03 ? 0 : Math.min(1, a * (p.blur ? 0.45 : 1));
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustGeo.attributes.aAlpha.needsUpdate = true;
    dustMat.uniforms.uScale.value = stageScale * renderer.getPixelRatio();

    /* 6. Golden Ripple Marker */
    markerUniforms.uTime.value = T;
    const mDiff = markerTargetAlpha - markerUniforms.uAlpha.value;
    if (Math.abs(mDiff) > 0.002) {
      markerUniforms.uAlpha.value += mDiff * Math.min(1, dt * 4);
    } else {
      markerUniforms.uAlpha.value = markerTargetAlpha;
    }
    markerMesh.scale.setScalar(uiScale);
    markerMesh.visible = markerUniforms.uAlpha.value > 0.004 && !REDUCED_MOTION;

    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);
})();
