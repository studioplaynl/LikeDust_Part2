/* Like Dust 2 · gedeelde code voor de kamer-variaties.
   - hoofdstukken (alleen de filmversies met interactie) in een overlay openen
   - voortgang per variatie (localStorage, faalt stil)
   - inkt-overgang (vlek die het scherm dichtloopt), geluid, HUD, hint, label
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

/* ---------- hoofdstuk openen ---------- */
let chapterOpen=false;
function openChapter(n,{onClose,color}={}){
  if(chapterOpen) return; chapterOpen=true;
  const c=CHAPTERS[n-1];
  const wrap=$(".ld-chapter")||document.body.appendChild(el("div","ld-chapter"));
  wrap.innerHTML=""; const fr=el("iframe"); fr.allow="autoplay; fullscreen"; fr.title="Hoofdstuk "+n+" · "+c.title;
  const back=el("button","ghost back","← Terug naar de kamer"); back.type="button";
  wrap.append(fr,back);
  const t0=performance.now(); let ended=false, poll=null;
  wipe("#000","in",1200).then(()=>{
    fr.src=c.src+"?autoplay=1"; wrap.classList.add("on");
    return wipe("#000","out",1200);
  });
  /* Bij een webserver (zelfde origin) zien we de eindkaart van het hoofdstuk; via file:// niet, dan telt 15 s kijken. */
  poll=setInterval(()=>{ try{ const end=fr.contentDocument&&fr.contentDocument.getElementById("cardEnd"); if(end&&!end.classList.contains("off")&&!ended){ ended=true; back.textContent="Terug naar de kamer →"; back.style.borderColor="var(--ochre)"; back.style.color="var(--ochre)"; } }catch(_){} },800);
  const onMsg=e=>{ if(e.data==="ld-room-back"&&e.source===fr.contentWindow){ ended=true; back.onclick(); } };
  addEventListener("message",onMsg);
  back.onclick=()=>{
    clearInterval(poll); removeEventListener("message",onMsg); back.onclick=null;
    const seen=ended||performance.now()-t0>15000;
    wipe("#000","in",1200).then(()=>{
      wrap.classList.remove("on"); fr.src="about:blank"; chapterOpen=false;
      onClose&&onClose(n,seen);
      return wipe("#000","out",1200);
    });
  };
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

window.LD={CHAPTERS,state,sfx,wipe,openChapter,hud,hint,tag,tex,GLSL,get muted(){return muted;},
  get busy(){ return chapterOpen; }};
})();
