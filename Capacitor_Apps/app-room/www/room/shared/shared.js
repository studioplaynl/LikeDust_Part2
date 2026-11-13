/* We All Breathe the Same Air · Shared runtime for the 2D Three.js room + 4 interactive video chapters (Web, iOS & Android via Capacitor). */
(function(){
"use strict";

/* ============================================================================
   STORE / RELEASE REMINDER:
   Set `DEV_DEFAULT = false` before building for App Store / Google Play / live production!
   - DEV_MODE = true  → dev bar on top + "keys 1–4" + "← Back to the room" + "Skip ›"
   - DEV_MODE = false → only the 4 chapter icons (passport, photo, bicycle, letter),
                        no "Back to the room" button and no "Skip ›" button on chapter interactions.
   (Tip: on web you can always override with ?dev=0 or ?dev=1 in the URL.)
   ============================================================================ */
const DEV_DEFAULT = true;
const DEV_MODE = /[?&]dev=0\b/.test(location.search) ? false
               : /[?&]dev=1\b/.test(location.search) ? true
               : DEV_DEFAULT;

const ROOT = "chapters/";
const SFX_DIR = "shared/sfx/";

const CHAPTERS=[
  {n:1,title:"Schiphol",  dir:"Hoofdstuk_1_Schiphol",  color:"#D6A93E",line:"The air was heavy with stories I didn't want to tell.",
   icon:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="1.6" class="fill"/><line x1="7.6" y1="2.5" x2="7.6" y2="21.5"/><circle cx="13.3" cy="11" r="3.2"/><ellipse cx="13.3" cy="11" rx="1.4" ry="3.2"/><line x1="10.1" y1="11" x2="16.5" y2="11"/><line x1="10.5" y1="17.2" x2="16.1" y2="17.2"/></svg>`},
  {n:2,title:"The AZC",   dir:"Hoofdstuk_2_The_AZC",   color:"#7f9ea0",line:"For a moment, Mom's voice felt like home.",
   icon:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="1.4" class="fill"/><rect x="6.2" y="6.6" width="11.6" height="10.8" rx=".6"/><circle cx="9.6" cy="10" r="1.3"/><path d="M6.6 16.8 L10.6 12.8 L13.4 15.3 L15.4 13.5 L17.4 16.8"/></svg>`},
  {n:3,title:"Amsterdam", dir:"Hoofdstuk_3_Amsterdam", color:"#c0402c",line:"Remembering what freedom tasted like.",
   icon:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="16.5" r="3.8" class="fill"/><circle cx="18.5" cy="16.5" r="3.8" class="fill"/><path d="M5.5 16.5 L9.8 9.5 H15.2 L11.5 16.5 Z" class="fill"/><path d="M15.2 9.5 L18.5 16.5 M14.3 7 H16.8 M8.5 9.5 H11.2 M9.8 9.5 L9.1 7.3 H7.5"/></svg>`},
  {n:4,title:"The Letter",dir:"Hoofdstuk_4_The_Letter",color:"#2f5d86",line:"To lose myself in the city.",
   icon:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="1.4" class="fill"/><path d="M3 6.2 L12 13.2 L21 6.2"/><path d="M3 18 L8.8 12.5 M21 18 L15.2 12.5"/></svg>`}
];
CHAPTERS.forEach(c=>c.src=ROOT+c.dir+"/index.html");
const $=s=>document.querySelector(s);
const el=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };

/* ---------- progress state ---------- */
function state(key){
  const k="ld2-room-"+key; let seen=new Set();
  try{ seen=new Set(JSON.parse(localStorage.getItem(k)||"[]")); }catch(_){}
  const save=()=>{ try{ localStorage.setItem(k,JSON.stringify([...seen])); }catch(_){} };
  return {
    has:n=>seen.has(n),
    mark(n){ seen.add(n); save(); },
    unmark(n){ seen.delete(n); save(); },
    reset(){ seen.clear(); save(); },
    get count(){ return seen.size; },
    next(){ for(const c of CHAPTERS) if(!seen.has(c.n)) return c.n; return null; },
    list:()=>[...seen]
  };
}

/* ---------- sfx helper ---------- */
const pool={};
function sfx(name,vol=0.7,rate=1){
  try{
    const a=(pool[name]||(pool[name]=new Audio(SFX_DIR+name+".mp3"))).cloneNode();
    a.volume=vol; a.playbackRate=rate; a.play().catch(()=>{}); return a;
  }catch(_){ return null; }
}

/* ---------- ink / fade wipe ---------- */
let wipeCv=null;
function wipeCanvas(){
  if(wipeCv) return wipeCv;
  wipeCv=el("canvas","ld-wipe"); document.body.appendChild(wipeCv); return wipeCv;
}
function wipe(color="#000",dir="in",ms=1200){
  const cv=wipeCanvas(); cv.style.background=color||"#000"; cv.style.transition="none";
  cv.style.opacity=dir==="in"?0:1; void cv.offsetWidth;
  cv.style.transition=`opacity ${ms}ms ease`; cv.style.opacity=dir==="in"?1:0;
  return new Promise(res=>setTimeout(res,ms));
}

/* ---------- chapter iframe lifecycle ---------- */
let chapterOpen=false; const frames={};
function chapterWrap(){ return $(".ld-chapter")||document.body.appendChild(el("div","ld-chapter")); }
function prepareChapter(n){
  if(!n) return null; if(frames[n]) return frames[n];
  const keys=Object.keys(frames).filter(k=>!frames[k].active);
  if(keys.length>=2) dropFrame(keys[0]);
  const c=CHAPTERS[n-1], box=el("div","ld-fr"), fr=el("iframe");
  fr.allow="autoplay; fullscreen"; fr.title="Chapter "+n+" · "+c.title;
  fr.src=c.src+"?embed=1"+(DEV_MODE?"&dev=1":"");
  box.appendChild(fr); chapterWrap().appendChild(box);
  const o={n,box,fr,ready:false,active:false,waits:[]}; frames[n]=o; return o;
}
function dropFrame(n){ const o=frames[n]; if(!o) return; o.fr.src="about:blank"; o.box.remove(); delete frames[n]; }
addEventListener("message",e=>{
  for(const k in frames){ const o=frames[k]; if(e.source!==o.fr.contentWindow) continue;
    if(e.data==="ld-ready"){ o.ready=true; o.waits.splice(0).forEach(f=>f()); }
    if(e.data==="ld-room-back"&&o.close) o.close(true);
    if(e.data==="ld-ctl-on"&&o.setBack) o.setBack(true);
    if(e.data==="ld-ctl-off"&&o.setBack) o.setBack(false); }
});
function call(o,fn){
  if(!o) return;
  const run=()=>{
    try{ const w=o.fr.contentWindow; if(w&&w[fn]){ w[fn](); return; } }catch(_){}
    try{ o.fr.contentWindow.postMessage(fn==="ldPrime"?"ld-prime":"ld-start","*"); }catch(_){}
  };
  run();
  if(!o.ready) o.waits.push(run);
}
["pointerdown","touchstart","touchend","keydown","click"].forEach(ev=>{
  addEventListener(ev,()=>{
    for(const k in frames){
      const o=frames[k];
      if(o && o.fr && o.fr.contentWindow) call(o,"ldPrime");
    }
  },{passive:true});
});
const whenReady=(o,ms)=>new Promise(res=>{ if(o.ready) return res(); o.waits.push(res); setTimeout(res,ms); });

function silhouette(renderer,scene,camera,root,grow=0){
  const size=renderer.getSize(new THREE.Vector2()), w=Math.max(2,Math.round(size.x/2)), h=Math.max(2,Math.round(size.y/2));
  const rt=new THREE.WebGLRenderTarget(w,h), keep=new Set(), restored=[];
  let cur=root; while(cur){ keep.add(cur); cur=cur.parent; }
  root.traverse(o=>{
    keep.add(o);
    const saved={o,vis:o.visible,hasAlpha:false,alpha:1};
    o.visible=true;
    if(o.material&&o.material.uniforms&&o.material.uniforms.uAlpha){
      saved.hasAlpha=true;
      saved.alpha=o.material.uniforms.uAlpha.value;
      o.material.uniforms.uAlpha.value=1;
    }
    restored.push(saved);
  });
  const hidden=[];
  scene.traverse(o=>{ if((o.isMesh||o.isSprite||o.isLine||o.isPoints)&&o.visible&&!keep.has(o)){ o.visible=false; hidden.push(o); } });
  const bg=scene.background, fog=scene.fog; scene.background=null; scene.fog=null;
  const cc=renderer.getClearColor(new THREE.Color()), ca=renderer.getClearAlpha(), prev=renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000,0); renderer.clear(); renderer.render(scene,camera);
  const px=new Uint8Array(w*h*4); renderer.readRenderTargetPixels(rt,0,0,w,h,px);
  renderer.setRenderTarget(prev); renderer.setClearColor(cc,ca); scene.background=bg; scene.fog=fog;
  hidden.forEach(o=>o.visible=true);
  restored.forEach(s=>{ s.o.visible=s.vis; if(s.hasAlpha) s.o.material.uniforms.uAlpha.value=s.alpha; });
  rt.dispose();
  const cv=document.createElement("canvas"); cv.width=w; cv.height=h; const g=cv.getContext("2d"), im=g.createImageData(w,h);
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const a=px[((h-1-y)*w+x)*4+3]; if(a>25){ const k=(y*w+x)*4; im.data[k]=im.data[k+1]=im.data[k+2]=255; im.data[k+3]=255; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
  g.putImageData(im,0,0);
  if(x1<0) return null;
  if(grow){
    const t=document.createElement("canvas"); t.width=w; t.height=h; const tg=t.getContext("2d");
    for(const r of [grow,grow/2]) for(let k=0;k<12;k++){ const a=k/12*Math.PI*2; tg.drawImage(cv,Math.cos(a)*r,Math.sin(a)*r); }
    tg.drawImage(cv,0,0); g.clearRect(0,0,w,h); g.drawImage(t,0,0); x0=Math.max(0,x0-grow); y0=Math.max(0,y0-grow); x1=Math.min(w-1,x1+grow); y1=Math.min(h-1,y1+grow); }
  const sx=size.x/w, sy=size.y/h;
  return {canvas:cv,cx:(x0+x1)/2*sx,cy:(y0+y1)/2*sy,bw:(x1-x0+1)*sx,bh:(y1-y0+1)*sy};
}
function outlineOf(sil,color){
  const m=sil.canvas, w=m.width, h=m.height, o=document.createElement("canvas"); o.width=w; o.height=h; const g=o.getContext("2d");
  const tint=document.createElement("canvas"); tint.width=w; tint.height=h; const tg=tint.getContext("2d");
  tg.drawImage(m,0,0); tg.globalCompositeOperation="source-in"; tg.fillStyle=color; tg.fillRect(0,0,w,h);
  for(let i=0;i<14;i++){ const a=i/14*Math.PI*2, r=2.2+((i*7)%3)*.5; g.drawImage(tint,Math.cos(a)*r,Math.sin(a)*r); }
  g.globalCompositeOperation="destination-out"; g.drawImage(m,0,0);
  return o.toDataURL();
}

/* ---------- URL routing & shareable links (#ch=1..4 & #page=about) ---------- */
let currentChapter = null;
let pushedChapterHistory = false;
let pendingCloseEnded = null;
const pageHandlers = new Map();
let routeChapterHandler = null;
let activeModal = null;

function parseRoute(){
  const h = (location.hash || "").replace(/^#\/?/, "").trim();
  const search = new URLSearchParams(location.search);

  const qCh = search.get("ch") || search.get("chapter");
  if(qCh && /^[1-4]$/.test(qCh)){
    return { type: "chapter", ch: parseInt(qCh, 10), raw: qCh };
  }

  const qPage = search.get("page") || search.get("p");
  if(qPage && !/^(?:dev=?[01]|v\d+|room)$/i.test(qPage)){
    return { type: "page", page: qPage.toLowerCase().trim(), raw: qPage };
  }

  if(h){
    const chMatch = h.match(/^(?:ch(?:apter)?[-_=]?|c[-_=]?)([1-4])$/i) || h.match(/^([1-4])$/);
    if(chMatch){
      return { type: "chapter", ch: parseInt(chMatch[1], 10), raw: h };
    }

    const pageMatch = h.match(/^(?:page[-_=]|p[-_=])?([a-z0-9_-]+)$/i);
    if(pageMatch){
      const name = pageMatch[1].toLowerCase();
      if(!/^(?:dev=?[01]|v\d+|room|gl|start|top|ctl|again|end)$/i.test(name)){
        return { type: "page", page: name, raw: h };
      }
    }
  }

  return { type: "room", raw: "" };
}

function setUrlRoute(route, replace = true){
  try {
    const url = new URL(location.href);
    if(route.type === "chapter"){
      url.hash = `ch=${route.ch}`;
    } else if(route.type === "page"){
      url.hash = `page=${route.page}`;
    } else {
      const h = (url.hash || "").replace(/^#\/?/, "");
      if(/^(?:ch|chapter|[1-4]|page|p=)/i.test(h)){
        url.hash = "";
      }
    }
    const target = url.pathname + (url.search || "") + (url.hash || "");
    if(replace){
      history.replaceState(null, "", target);
    } else {
      history.pushState(null, "", target);
    }
  } catch(_){}
}

function openPage(name, htmlContent){
  closePage(false);
  const pageName = (name || "").toLowerCase().trim();
  setUrlRoute({ type: "page", page: pageName });
  window.dispatchEvent(new CustomEvent("ld:route", { detail: { type: "page", page: pageName } }));

  const handler = pageHandlers.get(pageName);
  if(handler){
    handler({ page: pageName, close: () => closePage(true) });
    return;
  }

  const modal = el("div", "ld-modal");
  const titleFormatted = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  const defaultBody = htmlContent || `<p>Page <b>${titleFormatted}</b> is coming soon.</p>`;
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

  const doClose = () => closePage(true);
  modal.querySelector(".ld-modal-close").onclick = doClose;
  modal.onclick = e => { if(e.target === modal) doClose(); };
}

function closePage(updateUrl = true){
  if(activeModal){
    activeModal.classList.remove("on");
    const m = activeModal;
    setTimeout(() => m.remove(), 350);
    activeModal = null;
  }
  if(updateUrl){
    setUrlRoute({ type: "room" });
    window.dispatchEvent(new CustomEvent("ld:route", { detail: { type: "room" } }));
  }
}

function onPage(name, fn){
  pageHandlers.set(name.toLowerCase().trim(), fn);
}

function onRouteChapter(fn){
  routeChapterHandler = fn;
}

function getShareUrl(opts = {}){
  const u = new URL(location.href);
  if(opts.ch){
    u.hash = `ch=${opts.ch}`;
  } else if(opts.page){
    u.hash = `page=${opts.page}`;
  } else {
    u.hash = "";
  }
  return u.toString();
}

function copyShareUrl(opts = {}){
  const link = getShareUrl(opts);
  try {
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(link).then(() => {
        hint(`Link copied: ${opts.ch ? "Chapter " + opts.ch : opts.page || "Room"}`, "Share", 2800);
      }).catch(() => {
        prompt("Shareable link:", link);
      });
      return;
    }
  } catch(_){}
  prompt("Shareable link:", link);
}

function openChapter(n,{onClose,fromHistory=false}={}){
  if(chapterOpen) return; chapterOpen=true; currentChapter=n;
  if(!fromHistory){
    setUrlRoute({ type: "chapter", ch: n }, false);
    pushedChapterHistory = true;
  } else {
    pushedChapterHistory = false;
  }
  window.dispatchEvent(new CustomEvent("ld:route", { detail: { type: "chapter", ch: n } }));
  const o=prepareChapter(n); o.active=true;
  call(o,"ldPrime");
  const wrap=chapterWrap();
  /* "← Back to room" top-left in video overlay (always accessible to return to the room) */
  const back=el("button","ghost back","← Back to room");
  back.type="button"; back.style.opacity=0.85; back.style.pointerEvents="auto"; back.style.transition="opacity .35s ease";
  let ctlOn=false, hoverBack=false;
  const syncBack=()=>{
    back.style.opacity=(ctlOn||hoverBack)?1:0.78;
    back.style.pointerEvents="auto";
  };
  back.addEventListener("pointerenter",()=>{ hoverBack=true; syncBack(); });
  back.addEventListener("pointerleave",()=>{ hoverBack=false; syncBack(); });
  o.setBack=on=>{ ctlOn=!!on; syncBack(); };
  const t0=performance.now();
  let done=false;
  const fadeMs=window.LD_FADE_MS||520;
  Promise.all([wipe("#000","in",fadeMs), whenReady(o,6000)]).then(()=>{
    if(done) return;
    wrap.classList.add("on");
    wrap.classList.remove("reveal");
    o.box.classList.add("on");
    const st=o.box.style; st.webkitMaskImage=st.maskImage="none";
    if(back) wrap.appendChild(back);
    call(o,"ldStart");
    window.dispatchEvent(new CustomEvent("ld:pause"));
    wipe("#000","out",fadeMs);
  });
  const poll=setInterval(()=>{ try{ const end=o.fr.contentDocument&&o.fr.contentDocument.getElementById("cardEnd"); if(end&&!end.classList.contains("off")) close(true,false); }catch(_){} },800);
  function performClose(ended){
    if(done) return; done=true; clearInterval(poll); o.close=null; o.setBack=null; currentChapter=null; pushedChapterHistory=false; pendingCloseEnded=null;
    window.dispatchEvent(new CustomEvent("ld:route", { detail: { type: "room" } }));
    const seen=ended||performance.now()-t0>15000;
    const outMs=window.LD_FADE_MS||550;
    wipe("#000","in",outMs).then(()=>{
      wrap.classList.remove("on","reveal"); if(back) back.remove(); dropFrame(n); chapterOpen=false;
      window.dispatchEvent(new CustomEvent("ld:resume"));
      onClose&&onClose(n,seen);
      return wipe("#000","out",outMs);
    });
  }
  function close(ended, closedFromHistory=false){
    if(done) return;
    if(!closedFromHistory){
      if(pushedChapterHistory){
        pendingCloseEnded = ended;
        pushedChapterHistory = false;
        try{ history.back(); }catch(_){ performClose(ended); }
        setTimeout(()=>{ if(!done) { setUrlRoute({ type: "room" }, true); performClose(ended); } }, 180);
        return;
      }
      setUrlRoute({ type: "room" }, true);
    }
    performClose(ended);
  }
  o.close=close; if(back) back.onclick=()=>close(false,false);
}

function closeChapter(){
  if(currentChapter && frames[currentChapter] && frames[currentChapter].close){
    frames[currentChapter].close(false,false);
  }
}

function handleRouteChange(){
  const route = parseRoute();
  window.dispatchEvent(new CustomEvent("ld:route", { detail: route }));

  if(route.type === "chapter"){
    if(activeModal) closePage(false);
    if(!chapterOpen || currentChapter !== route.ch){
      if(chapterOpen && currentChapter){
        const prev = frames[currentChapter];
        if(prev && prev.close) prev.close(false, true);
      }
      if(routeChapterHandler) routeChapterHandler(route.ch, true);
      else openChapter(route.ch, { fromHistory: true });
    }
  } else if(route.type === "page"){
    if(chapterOpen && currentChapter){
      const prev = frames[currentChapter];
      if(prev && prev.close) prev.close(false, true);
    }
    openPage(route.page);
  } else {
    if(activeModal) closePage(false);
    if(chapterOpen && currentChapter){
      const prev = frames[currentChapter];
      const endedFlag = pendingCloseEnded !== null ? pendingCloseEnded : false;
      pendingCloseEnded = null;
      if(prev && prev.close) prev.close(endedFlag, true);
    }
  }
}

window.addEventListener("popstate", handleRouteChange);
window.addEventListener("hashchange", handleRouteChange);

function checkInitialRoute(){
  const route = parseRoute();
  if(route.type === "chapter"){
    setTimeout(()=>{
      if(!chapterOpen){
        if(routeChapterHandler) routeChapterHandler(route.ch, true);
        else openChapter(route.ch, { fromHistory: true });
      }
    }, 350);
  } else if(route.type === "page"){
    setTimeout(()=>{
      openPage(route.page);
    }, 300);
  }
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", checkInitialRoute);
} else {
  setTimeout(checkInitialRoute, 200);
}

document.addEventListener("visibilitychange", ()=>{
  if(document.hidden){
    window.dispatchEvent(new CustomEvent("ld:pause"));
  } else if(!chapterOpen){
    window.dispatchEvent(new CustomEvent("ld:resume"));
  }
});

/* ---------- HUD (DEV_MODE = top bar + dots + reset + 1–4 keys; Production = 4 chapter icons) ---------- */
function hud({name,st,onReset,onDev}){
  if(!DEV_MODE){
    const bar=el("div","ld-icons");
    bar.setAttribute("aria-label","Chapters");
    bar.innerHTML=CHAPTERS.map(c=>`<span class="ld-ico" title="${c.n} · ${c.title}">${c.icon}</span>`).join("");
    document.body.appendChild(bar);
    const icons=[...bar.querySelectorAll(".ld-ico")];
    const update=()=>icons.forEach((ic,i)=>ic.classList.toggle("on",st.has(i+1)));
    update();
    return {update};
  }
  const top=el("div","ld-top");
  top.innerHTML=`<div class="ld-tools"><a class="ghost" href="../index.html${location.search||""}" title="Back to Home">← Home</a></div>
  <div class="ld-tools"><div class="ld-dots" aria-label="Completed chapters">${CHAPTERS.map(c=>`<i title="${c.n} · ${c.title}"></i>`).join("")}</div></div>`;
  document.body.appendChild(top);
  const dots=[...top.querySelectorAll(".ld-dots i")];
  const update=()=>dots.forEach((d,i)=>dots.length&&d.classList.toggle("on",st.has(i+1)));
  const resetBtn=top.querySelector("#ldReset");
  if(resetBtn) resetBtn.onclick=()=>{ st.reset(); update(); onReset&&onReset(); };
  addEventListener("keydown",e=>{
    if(chapterOpen||e.target.tagName==="INPUT") return;
    if(e.key>="1"&&e.key<="4"){ const n=+e.key; st.has(n)?st.unmark(n):st.mark(n); update(); onDev&&onDev(n); }
    if(e.key==="0"){ st.reset(); update(); onReset&&onReset(); }
  });
  update(); return {update};
}

/* ---------- hint & tag ---------- */
let hintEl=null, hintT=null;
function hint(text,small,ms){
  hintEl=hintEl||document.body.appendChild(el("div","ld-hint off"));
  clearTimeout(hintT);
  if(!text){ hintEl.classList.add("off"); return; }
  hintEl.innerHTML=(small?`<small>${small}</small>`:"")+text; hintEl.classList.remove("off");
  if(ms) hintT=setTimeout(()=>hintEl.classList.add("off"),ms);
}
let tagEl=null, tagT=null;
function tag(html,x,y,ms=0){
  tagEl=tagEl||document.body.appendChild(el("div","ld-tag"));
  clearTimeout(tagT);
  if(!html){ tagEl.classList.remove("on"); return; }
  tagEl.innerHTML=html; tagEl.style.left=x+"px"; tagEl.style.top=(y-14)+"px"; tagEl.classList.add("on");
  if(ms) tagT=setTimeout(()=>tagEl.classList.remove("on"),ms);
}

/* ---------- textures ---------- */
function tex(uri,opts={}){
  const t=new THREE.TextureLoader().load(uri,opts.onLoad);
  t.colorSpace=opts.raw?THREE.NoColorSpace:THREE.SRGBColorSpace;
  t.anisotropy=4;
  if(opts.repeat){ t.wrapS=t.wrapT=THREE.RepeatWrapping; }
  return t;
}

window.LD={
  DEV:DEV_MODE,
  CHAPTERS,
  state,
  sfx,
  wipe,
  openChapter,
  closeChapter,
  prepareChapter,
  hud,
  hint,
  tag,
  tex,
  muted:false,
  get busy(){ return chapterOpen; },
  get currentChapter(){ return currentChapter; },
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
