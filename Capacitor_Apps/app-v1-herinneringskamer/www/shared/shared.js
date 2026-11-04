/* Like Dust 2 · gedeelde code voor de kamer-apps (Web, iOS & Android via Capacitor). */
(function(){
"use strict";

/* ============================================================================
   STORE / RELEASE REMINDER:
   Zet `DEV_DEFAULT = false` vóór het bouwen voor App Store / Google Play / live web!
   - DEV_MODE = true  → dev-balk bovenin + "toets 1–4" + "← Terug naar de kamer" + "Skip ›"
   - DEV_MODE = false → alleen de 4 hoofdstuk-icoontjes (paspoort, fiets, vogel, brief),
                        geen "Terug naar de kamer"-knop en geen "Skip ›"-knop bij opdrachten.
   (Tip: op web kun je altijd testen met ?dev=0 of ?dev=1 in de URL.)
   ============================================================================ */
const DEV_DEFAULT = true;
const DEV_MODE = /[?&]dev=0\b/.test(location.search) ? false
               : /[?&]dev=1\b/.test(location.search) ? true
               : DEV_DEFAULT;

/* Auto-detect of we in Kamer_Variaties/<variatie>/ draaien of in een standalone www/app bundle */
const IN_VARIATIES = /\/v\d+_[^/]+\//.test(location.pathname);
const ROOT = IN_VARIATIES
  ? "../../All%20hoofdstuken%20met%20interactie%201-4%20/We_All_Breathe_The_Same_Air_DEF_v1/"
  : "chapters/";
const SFX_DIR = IN_VARIATIES ? "../shared/sfx/" : "shared/sfx/";

const CHAPTERS=[
  {n:1,title:"Schiphol",  dir:"Hoofdstuk_1_Schiphol",  color:"#D6A93E",line:"The air was heavy with stories I didn't want to tell.",
   icon:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="1.6" class="fill"/><line x1="7.6" y1="2.5" x2="7.6" y2="21.5"/><circle cx="13.3" cy="11" r="3.2"/><ellipse cx="13.3" cy="11" rx="1.4" ry="3.2"/><line x1="10.1" y1="11" x2="16.5" y2="11"/><line x1="10.5" y1="17.2" x2="16.1" y2="17.2"/></svg>`},
  {n:2,title:"The AZC",   dir:"Hoofdstuk_2_The_AZC",   color:"#7f9ea0",line:"For a moment, Mom's voice felt like home.",
   icon:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="16.5" r="3.8" class="fill"/><circle cx="18.5" cy="16.5" r="3.8" class="fill"/><path d="M5.5 16.5 L9.8 9.5 H15.2 L11.5 16.5 Z" class="fill"/><path d="M15.2 9.5 L18.5 16.5 M14.3 7 H16.8 M8.5 9.5 H11.2 M9.8 9.5 L9.1 7.3 H7.5"/></svg>`},
  {n:3,title:"Amsterdam", dir:"Hoofdstuk_3_Amsterdam", color:"#c0402c",line:"Remembering what freedom tasted like.",
   icon:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 15.5 C6.5 15.2 8.8 13.5 10.5 10.8 C11.4 7.2 14.5 5 18.2 5.2 C16.6 7.4 16.2 9.3 16.8 11 C18.5 10.8 20 11.4 21 12.2 C19.5 12.6 18.7 13.3 18.2 14.5 C16.5 17.8 12.5 19.2 7.8 18.5 L4.2 20 L5.8 17.2 Z" class="fill"/><circle cx="17.2" cy="11.8" r="0.7" fill="currentColor" stroke="none"/></svg>`},
  {n:4,title:"The Letter",dir:"Hoofdstuk_4_The_Letter",color:"#2f5d86",line:"To lose myself in the city.",
   icon:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="1.4" class="fill"/><path d="M3 6.2 L12 13.2 L21 6.2"/><path d="M3 18 L8.8 12.5 M21 18 L15.2 12.5"/></svg>`}
];
CHAPTERS.forEach(c=>c.src=ROOT+c.dir+"/index.html");
const $=s=>document.querySelector(s);
const el=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };

/* ---------- voortgang ---------- */
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

/* ---------- geluid (apparaatvolume regelt alles; geen mute-knop) ---------- */
const pool={};
function sfx(name,vol=0.7,rate=1){
  try{
    const a=(pool[name]||(pool[name]=new Audio(SFX_DIR+name+".mp3"))).cloneNode();
    a.volume=vol; a.playbackRate=rate; a.play().catch(()=>{}); return a;
  }catch(_){ return null; }
}

/* ---------- inkt-overgang ---------- */
let wipeCv=null;
function wipeCanvas(){
  if(wipeCv) return wipeCv;
  wipeCv=el("canvas","ld-wipe"); document.body.appendChild(wipeCv); return wipeCv;
}
function wipe(color="#000",dir="in",ms=1200){
  const cv=wipeCanvas(); cv.style.background="#000"; cv.style.transition="none";
  cv.style.opacity=dir==="in"?0:1; void cv.offsetWidth;
  cv.style.transition=`opacity ${ms}ms ease`; cv.style.opacity=dir==="in"?1:0;
  return new Promise(res=>setTimeout(res,ms));
}

/* ---------- hoofdstuk openen ---------- */
let chapterOpen=false; const frames={};
function chapterWrap(){ return $(".ld-chapter")||document.body.appendChild(el("div","ld-chapter")); }
function prepareChapter(n){
  if(!n) return null; if(frames[n]) return frames[n];
  const keys=Object.keys(frames).filter(k=>!frames[k].active);
  if(keys.length>=2) dropFrame(keys[0]);
  const c=CHAPTERS[n-1], box=el("div","ld-fr"), fr=el("iframe");
  fr.allow="autoplay; fullscreen"; fr.title="Hoofdstuk "+n+" · "+c.title;
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
function call(o,fn){ try{ const w=o.fr.contentWindow; if(w&&w[fn]){ w[fn](); return; } }catch(_){} try{ o.fr.contentWindow.postMessage(fn==="ldPrime"?"ld-prime":"ld-start","*"); }catch(_){} }
const whenReady=(o,ms)=>new Promise(res=>{ if(o.ready) return res(); o.waits.push(res); setTimeout(res,ms); });

function silhouette(renderer,scene,camera,root,grow=0){
  const size=renderer.getSize(new THREE.Vector2()), w=Math.max(2,Math.round(size.x/2)), h=Math.max(2,Math.round(size.y/2));
  const rt=new THREE.WebGLRenderTarget(w,h), keep=new Set();
  root.traverse(o=>keep.add(o));
  const hidden=[]; scene.traverse(o=>{ if((o.isMesh||o.isSprite||o.isLine||o.isPoints)&&o.visible&&!keep.has(o)){ o.visible=false; hidden.push(o); } });
  const bg=scene.background, fog=scene.fog; scene.background=null; scene.fog=null;
  const cc=renderer.getClearColor(new THREE.Color()), ca=renderer.getClearAlpha(), prev=renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000,0); renderer.clear(); renderer.render(scene,camera);
  const px=new Uint8Array(w*h*4); renderer.readRenderTargetPixels(rt,0,0,w,h,px);
  renderer.setRenderTarget(prev); renderer.setClearColor(cc,ca); scene.background=bg; scene.fog=fog; hidden.forEach(o=>o.visible=true); rt.dispose();
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

function openChapter(n,{onClose,approach=0,target}={}){
  if(chapterOpen) return; chapterOpen=true;
  const o=prepareChapter(n); o.active=true;
  call(o,"ldPrime");
  if(o.ready) call(o,"ldStart"); else whenReady(o,8000).then(()=>call(o,"ldStart"));
  const wrap=chapterWrap(), vw=innerWidth, vh=innerHeight;
  /* "← Terug naar de kamer" alleen in DEV_MODE (toont mee bij klik op videovlak + verbergt automatisch) */
  const back=DEV_MODE?el("button","ghost back","← Terug naar de kamer"):null;
  if(back){ back.type="button"; back.style.opacity=0; back.style.pointerEvents="none"; back.style.transition="opacity .35s ease"; }
  o.setBack=on=>{ if(!back) return; back.style.opacity=on?1:0; back.style.pointerEvents=on?"auto":"none"; };
  const t0=performance.now();
  let sil=null, line=null, done=false;
  const arrived=typeof approach==="function"?approach:(()=>performance.now()-t0>=approach);
  const waitArrive=()=>{ if(arrived()||performance.now()-t0>5000) go(); else setTimeout(waitArrive,40); };
  waitArrive();
  function go(){
    try{ const t=target&&target(); if(t) sil=silhouette(t.renderer,t.scene,t.camera,t.root,t.grow||0); }catch(err){ console.warn(err); }
    whenReady(o,8000).then(()=>{
      wrap.classList.add("on","reveal"); o.box.classList.add("on");
      if(back) wrap.appendChild(back);
      if(!sil){ wrap.classList.remove("reveal"); finish(); return; }
      const mask=sil.canvas.toDataURL();
      line=el("div","ld-outline"); line.style.backgroundImage=`url(${outlineOf(sil,"#ece8de")})`; wrap.appendChild(line);
      const S=Math.max(vw/sil.bw,vh/sil.bh)*7, T=window.LD_REVEAL_MS||1300, s0=performance.now();
      const step=()=>{
        const p=Math.min(1,(performance.now()-s0)/T), e=p*p*(3-2*p), s=Math.pow(S,p*p);
        const X=sil.cx+(vw/2-sil.cx)*e, Y=sil.cy+(vh/2-sil.cy)*e, a=Math.max(0,Math.min(1,(p-.55)/.4));
        const sz=`${vw*s}px ${vh*s}px`, pos=`${X-sil.cx*s}px ${Y-sil.cy*s}px, 0 0`;
        for(const st of [o.box.style]){ st.webkitMaskImage=st.maskImage=`url(${mask}), linear-gradient(rgba(0,0,0,${a}),rgba(0,0,0,${a}))`;
          st.webkitMaskSize=st.maskSize=`${sz}, 100% 100%`; st.webkitMaskPosition=st.maskPosition=pos; st.webkitMaskRepeat=st.maskRepeat="no-repeat"; }
        line.style.backgroundSize=sz; line.style.backgroundPosition=`${X-sil.cx*s}px ${Y-sil.cy*s}px`; line.style.opacity=String(1-a);
        if(p<1) requestAnimationFrame(step); else finish();
      };
      step();
    });
  }
  function finish(){
    const st=o.box.style; st.webkitMaskImage=st.maskImage="none";
    if(line){ line.remove(); line=null; } wrap.classList.remove("reveal");
    window.dispatchEvent(new CustomEvent("ld:pause"));
  }
  const poll=setInterval(()=>{ try{ const end=o.fr.contentDocument&&o.fr.contentDocument.getElementById("cardEnd"); if(end&&!end.classList.contains("off")) close(true); }catch(_){} },800);
  function close(ended){
    if(done) return; done=true; clearInterval(poll); o.close=null; o.setBack=null;
    const seen=ended||performance.now()-t0>15000;
    wipe("#000","in",1200).then(()=>{
      wrap.classList.remove("on","reveal"); if(back) back.remove(); dropFrame(n); chapterOpen=false;
      window.dispatchEvent(new CustomEvent("ld:resume"));
      onClose&&onClose(n,seen);
      return wipe("#000","out",1200);
    });
  }
  o.close=close; if(back) back.onclick=()=>close(false);
}

document.addEventListener("visibilitychange", ()=>{
  if(document.hidden){
    window.dispatchEvent(new CustomEvent("ld:pause"));
  } else if(!chapterOpen){
    window.dispatchEvent(new CustomEvent("ld:resume"));
  }
});

/* ---------- HUD (DEV_MODE = balk + dots + reset + 1–4 toetsen; anders = 4 hoofdstuk-icoontjes) ---------- */
function hud({name,st,onReset,onDev}){
  if(!DEV_MODE){
    const bar=el("div","ld-icons");
    bar.setAttribute("aria-label","Hoofdstukken");
    bar.innerHTML=CHAPTERS.map(c=>`<span class="ld-ico" title="${c.n} · ${c.title}">${c.icon}</span>`).join("");
    document.body.appendChild(bar);
    const icons=[...bar.querySelectorAll(".ld-ico")];
    const update=()=>icons.forEach((ic,i)=>ic.classList.toggle("on",st.has(i+1)));
    update();
    return {update};
  }
  const top=el("div","ld-top");
  const backLink=IN_VARIATIES?`<a class="ghost" href="../index.html">← Variaties</a>`:"";
  top.innerHTML=`<div class="ld-tools">${backLink}<span class="ld-chap"><span>De kamer · </span><b>${name}</b></span></div>
  <div class="ld-tools"><div class="ld-dots" aria-label="Gezien">${CHAPTERS.map(c=>`<i title="${c.n} · ${c.title}"></i>`).join("")}</div>
  <button class="ghost" type="button" id="ldReset" title="Voortgang wissen">↺</button></div>`;
  document.body.appendChild(top);
  const dev=el("div","ld-dev","toets 1–4: hoofdstuk als gezien · 0: wissen"); document.body.appendChild(dev);
  const dots=[...top.querySelectorAll(".ld-dots i")];
  const update=()=>dots.forEach((d,i)=>d.classList.toggle("on",st.has(i+1)));
  top.querySelector("#ldReset").onclick=()=>{ st.reset(); update(); onReset&&onReset(); };
  addEventListener("keydown",e=>{
    if(chapterOpen||e.target.tagName==="INPUT") return;
    if(e.key>="1"&&e.key<="4"){ const n=+e.key; st.has(n)?st.unmark(n):st.mark(n); update(); onDev&&onDev(n); }
    if(e.key==="0"){ st.reset(); update(); onReset&&onReset(); }
  });
  update(); return {update};
}

/* ---------- hint & label ---------- */
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
  t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
  if(opts.repeat){ t.wrapS=t.wrapT=THREE.RepeatWrapping; }
  return t;
}

/* ---------- GLSL: stift, inkt en papier ---------- */
const GLSL={
noise:`
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return s; }
`,
ink:`
float hatch(vec2 px,float dark,float ang,float spacing){
  vec2 d=vec2(cos(ang),sin(ang));
  float w=dot(px,d)+ (vnoise(px*.02)-.5)*6.;
  float l=abs(fract(w/spacing)-.5)*2.;
  float th=clamp(dark,0.,1.);
  return 1.-smoothstep(th-.18,th+.05,l);
}
vec3 paperCol(vec2 px,vec3 base){
  float g=fbm(px*.004)*.5+fbm(px*.03)*.35+h21(px)*.15;
  return base*(.9+.12*g);
}
float markerTex(vec2 px){ return .78+.22*fbm(px*vec2(.012,.05)); }
vec2 wash(vec2 p,float t,float seed){
  vec2 q=p+(vec2(fbm(p*2.6+seed),fbm(p*2.6+seed+7.3))-.5)*.42;
  float d=length(q)+(fbm(p*9.+seed*3.1)-.5)*.10;
  float r=t*1.05;
  float feather=.10+.10*fbm(p*5.+seed);
  float m=1.-smoothstep(r-feather,r,d);
  float edge=smoothstep(r-feather,r-feather*.25,d)*m;
  return vec2(m*step(.001,t),edge);
}
float granul(vec2 px,float seed){ return .78+.22*fbm(px*.22+seed)+.06*(h21(px)-.5); }
`
};

window.LD={DEV:DEV_MODE,CHAPTERS,state,sfx,wipe,openChapter,prepareChapter,hud,hint,tag,tex,GLSL,muted:false,
  get busy(){ return chapterOpen; }};
})();
