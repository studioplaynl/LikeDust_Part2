/* Like Dust 2 · gedeelde code voor de kamer-variaties.
   - hoofdstukken (alleen de filmversies met interactie) in een overlay openen
   - voortgang per variatie (localStorage, faalt stil)
   - overgang naar de film (omtrek van het voorwerp komt op je af), fade, geluid, HUD, hint, label
   - GLSL-bouwstenen voor de stift/inkt-look
   Klassiek script (geen modules) zodat alles ook vanaf file:// draait. */
(function(){
"use strict";

/* De kamer-variaties staan in Kamer_Variaties/<variatie>/, de hoofdstukken twee mappen hoger.
   Let op: de mapnaam "All hoofdstuken met interactie 1-4 " eindigt op een spatie. */
const ROOT="../../All%20hoofdstuken%20met%20interactie%201-4%20/We_All_Breathe_The_Same_Air_DEF_v1/";
const CHAPTERS=[
  {n:1,title:"Schiphol",  dir:"Hoofdstuk_1_Schiphol",  color:"#D6A93E",line:"The air was heavy with stories I didn't want to tell."},
  {n:2,title:"The AZC",   dir:"Hoofdstuk_2_The_AZC",   color:"#7f9ea0",line:"For a moment, Mom's voice felt like home."},
  {n:3,title:"Amsterdam", dir:"Hoofdstuk_3_Amsterdam", color:"#c0402c",line:"Remembering what freedom tasted like."},
  {n:4,title:"The Letter",dir:"Hoofdstuk_4_The_Letter",color:"#2f5d86",line:"To lose myself in the city."}
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

/* ---------- geluid ---------- */
let muted=false; const pool={};
function sfx(name,vol=0.7,rate=1){
  if(muted) return null;
  try{
    const a=(pool[name]||(pool[name]=new Audio("../shared/sfx/"+name+".mp3"))).cloneNode();
    a.volume=vol; a.playbackRate=rate; a.play().catch(()=>{}); return a;
  }catch(_){ return null; }
}

/* ---------- inkt-overgang ---------- */
let wipeCv=null;
function wipeCanvas(){
  if(wipeCv) return wipeCv;
  wipeCv=el("canvas","ld-wipe"); document.body.appendChild(wipeCv); return wipeCv;
}
/* Rustige fade door zwart (zelfde 1,2 s-gevoel als de intro). dir "in" = naar zwart, "out" = terug naar beeld. */
function wipe(color="#000",dir="in",ms=1200){
  const cv=wipeCanvas(); cv.style.background="#000"; cv.style.transition="none";
  cv.style.opacity=dir==="in"?0:1; void cv.offsetWidth;
  cv.style.transition=`opacity ${ms}ms ease`; cv.style.opacity=dir==="in"?1:0;
  return new Promise(res=>setTimeout(res,ms));
}

/* ---------- hoofdstuk openen ----------
   Het hoofdstuk staat al klaar in een verborgen iframe (prepareChapter), met het eerste filmbeeld geladen.
   Bij de klik (openChapter) mag de film van de browser geluid maken: we "primen" hem op dat moment.
   Dan rijdt de kamer-camera naar het voorwerp (approach ms), de omtrek van het voorwerp komt met het
   eerste filmbeeld erin op je af tot hij het scherm vult, en de film speelt. Aan het eind: terug naar de kamer. */
let chapterOpen=false; const frames={};
function chapterWrap(){ return $(".ld-chapter")||document.body.appendChild(el("div","ld-chapter")); }
function prepareChapter(n){
  if(!n) return null; if(frames[n]) return frames[n];
  // niet te veel films tegelijk laden: oude, ongebruikte weg
  const keys=Object.keys(frames).filter(k=>!frames[k].active);
  if(keys.length>=2) dropFrame(keys[0]);
  const c=CHAPTERS[n-1], box=el("div","ld-fr"), fr=el("iframe");
  fr.allow="autoplay; fullscreen"; fr.title="Hoofdstuk "+n+" · "+c.title; fr.src=c.src+"?embed=1";
  box.appendChild(fr); chapterWrap().appendChild(box);
  const o={n,box,fr,ready:false,active:false,waits:[]}; frames[n]=o; return o;
}
function dropFrame(n){ const o=frames[n]; if(!o) return; o.fr.src="about:blank"; o.box.remove(); delete frames[n]; }
addEventListener("message",e=>{
  for(const k in frames){ const o=frames[k]; if(e.source!==o.fr.contentWindow) continue;
    if(e.data==="ld-ready"){ o.ready=true; o.waits.splice(0).forEach(f=>f()); }
    if(e.data==="ld-room-back"&&o.close) o.close(true); }
});
function call(o,fn){ try{ const w=o.fr.contentWindow; if(w&&w[fn]){ w[fn](); return; } }catch(_){} try{ o.fr.contentWindow.postMessage(fn==="ldPrime"?"ld-prime":"ld-start","*"); }catch(_){} }
const whenReady=(o,ms)=>new Promise(res=>{ if(o.ready) return res(); o.waits.push(res); setTimeout(res,ms); });

/* Silhouet van één object zoals de camera het nu ziet: canvas ter grootte van het scherm (halve resolutie), wit waar het object is. */
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
  if(grow){ // losse punten (zoals stof) dichtsmeren tot één vorm: silhouet in een ring van richtingen over zichzelf tekenen
    const t=document.createElement("canvas"); t.width=w; t.height=h; const tg=t.getContext("2d");
    for(const r of [grow,grow/2]) for(let k=0;k<12;k++){ const a=k/12*Math.PI*2; tg.drawImage(cv,Math.cos(a)*r,Math.sin(a)*r); }
    tg.drawImage(cv,0,0); g.clearRect(0,0,w,h); g.drawImage(t,0,0); x0=Math.max(0,x0-grow); y0=Math.max(0,y0-grow); x1=Math.min(w-1,x1+grow); y1=Math.min(h-1,y1+grow); }
  const sx=size.x/w, sy=size.y/h;
  return {canvas:cv,cx:(x0+x1)/2*sx,cy:(y0+y1)/2*sy,bw:(x1-x0+1)*sx,bh:(y1-y0+1)*sy};
}
/* stiftlijn rond het silhouet */
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
  // de klik start de film meteen, met geluid (de browser staat dat alleen binnen de klik toe); de overgang loopt eroverheen
  if(o.ready) call(o,"ldStart"); else whenReady(o,8000).then(()=>call(o,"ldStart"));
  const wrap=chapterWrap(), vw=innerWidth, vh=innerHeight;
  const back=el("button","ghost back","← Terug naar de kamer"); back.type="button"; back.style.opacity=0;
  const t0=performance.now();
  let sil=null, line=null, done=false;
  // approach: ms, of een functie die true geeft zodra de camera bij het voorwerp is
  const arrived=typeof approach==="function"?approach:(()=>performance.now()-t0>=approach);
  const waitArrive=()=>{ if(arrived()||performance.now()-t0>5000) go(); else setTimeout(waitArrive,40); };
  waitArrive();
  function go(){
    try{ const t=target&&target(); if(t) sil=silhouette(t.renderer,t.scene,t.camera,t.root,t.grow||0); }catch(err){ console.warn(err); }
    whenReady(o,8000).then(()=>{
      wrap.classList.add("on","reveal"); o.box.classList.add("on"); wrap.appendChild(back);
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
    back.style.transition="opacity .8s"; back.style.opacity=1;
  }
  /* Via een webserver zien we het einde ook zelf; via file:// telt 15 s kijken. */
  const poll=setInterval(()=>{ try{ const end=o.fr.contentDocument&&o.fr.contentDocument.getElementById("cardEnd"); if(end&&!end.classList.contains("off")) close(true); }catch(_){} },800);
  function close(ended){
    if(done) return; done=true; clearInterval(poll); o.close=null;
    const seen=ended||performance.now()-t0>15000;
    wipe("#000","in",1200).then(()=>{
      wrap.classList.remove("on","reveal"); back.remove(); dropFrame(n); chapterOpen=false;
      onClose&&onClose(n,seen);
      return wipe("#000","out",1200);
    });
  }
  o.close=close; back.onclick=()=>close(false);
}

/* ---------- HUD ---------- */
function hud({name,st,onReset,onDev}){
  const top=el("div","ld-top");
  top.innerHTML=`<div class="ld-tools"><a class="ghost" href="../index.html">← Variaties</a><span class="ld-chap"><span>De kamer · </span><b>${name}</b></span></div>
  <div class="ld-tools"><div class="ld-dots" aria-label="Gezien">${CHAPTERS.map(c=>`<i title="${c.n} · ${c.title}"></i>`).join("")}</div>
  <button class="ghost" type="button" id="ldMute" aria-pressed="false">Geluid aan</button>
  <button class="ghost" type="button" id="ldReset" title="Voortgang wissen">↺</button></div>`;
  document.body.appendChild(top);
  const dev=el("div","ld-dev","toets 1–4: hoofdstuk als gezien · 0: wissen"); document.body.appendChild(dev);
  const dots=[...top.querySelectorAll(".ld-dots i")];
  const update=()=>dots.forEach((d,i)=>d.classList.toggle("on",st.has(i+1)));
  top.querySelector("#ldMute").onclick=e=>{ muted=!muted; e.currentTarget.textContent=muted?"Geluid uit":"Geluid aan"; e.currentTarget.setAttribute("aria-pressed",muted); };
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
let tagEl=null;
function tag(html,x,y){
  tagEl=tagEl||document.body.appendChild(el("div","ld-tag"));
  if(!html){ tagEl.classList.remove("on"); return; }
  tagEl.innerHTML=html; tagEl.style.left=x+"px"; tagEl.style.top=(y-14)+"px"; tagEl.classList.add("on");
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
/* Arcering zoals met een fineliner: lijnen onder een hoek, dikker waar het donkerder is, met een beetje beven. */
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
/* stiftvlek: onregelmatige dekking zoals een alcoholmarker die opdroogt */
float markerTex(vec2 px){ return .78+.22*fbm(px*vec2(.012,.05)); }
/* Waterverf die zich vanuit een punt verspreidt. p = positie rond de oorsprong (0,0), t = 0..1.
   x: hoeveel pigment er ligt (zachte, uitlopende rand), y: de rand waar het pigment zich ophoopt bij het drogen. */
vec2 wash(vec2 p,float t,float seed){
  vec2 q=p+(vec2(fbm(p*2.6+seed),fbm(p*2.6+seed+7.3))-.5)*.42;          // het water zoekt zijn weg
  float d=length(q)+(fbm(p*9.+seed*3.1)-.5)*.10;
  float r=t*1.05;
  float feather=.10+.10*fbm(p*5.+seed);                                  // rand loopt ongelijk uit
  float m=1.-smoothstep(r-feather,r,d);
  float edge=smoothstep(r-feather,r-feather*.25,d)*m;
  return vec2(m*step(.001,t),edge);
}
/* pigmentkorrel: het papier neemt de verf ongelijk op */
float granul(vec2 px,float seed){ return .78+.22*fbm(px*.22+seed)+.06*(h21(px)-.5); }
`
};

window.LD={CHAPTERS,state,sfx,wipe,openChapter,prepareChapter,hud,hint,tag,tex,GLSL,get muted(){return muted;},
  get busy(){ return chapterOpen; }};
})();
