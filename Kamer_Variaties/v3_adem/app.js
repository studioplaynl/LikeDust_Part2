/* Variatie 3 · Adem: inktstof die bij elke ademhaling een nieuwe vorm aanneemt. */
(function(){
"use strict";
const st=LD.state("v3");
const N=matchMedia("(max-width:700px)").matches?9000:14000;
const cv=document.getElementById("gl");
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1,.1,100); camera.position.set(0,0,14);

/* ---------- papier met inktvlekken die blijven na elk hoofdstuk ---------- */
const STAIN=[[-.62,.52],[.68,.46],[-.58,-.5],[.62,-.55]];
const paper=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({depthWrite:false,
  uniforms:{uTime:{value:0},uRes:{value:new THREE.Vector2()},uAmt:{value:[0,0,0,0]},uCol:{value:LD.CHAPTERS.map(c=>new THREE.Color(c.color))},uEnd:{value:0}},
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,.999,1.); }`,
  fragmentShader:`precision highp float; varying vec2 vUv; uniform float uTime,uAmt[4],uEnd; uniform vec3 uCol[4]; uniform vec2 uRes;
  ${LD.GLSL.noise}${LD.GLSL.ink}
  void main(){
    vec2 px=vUv*uRes; vec2 p=(vUv-.5)*vec2(uRes.x/uRes.y,1.);
    vec3 col=paperCol(px,vec3(.914,.886,.816));
    vec2 S[4]; S[0]=vec2(${STAIN[0]}); S[1]=vec2(${STAIN[1]}); S[2]=vec2(${STAIN[2]}); S[3]=vec2(${STAIN[3]});
    for(int i=0;i<4;i++){
      vec2 c=S[i]*vec2(uRes.x/uRes.y,1.)*.5;
      vec2 w=wash((p-c)*2.4,uAmt[i]*.75,float(i)*5.3);           // druppel die op nat papier uitbloeit
      float gran=granul(px,float(i));
      vec3 pig=mix(vec3(1.),uCol[i]*1.1,.55*gran);
      col*=mix(vec3(1.),pig,w.x*.8);
      col*=1.-w.y*.18;
    }
    col=mix(col,vec3(.97,.95,.9),uEnd*.4);
    gl_FragColor=vec4(col,1.);
  }`}));
paper.frustumCulled=false; paper.renderOrder=-1; scene.add(paper);

/* ---------- vormen bemonsteren (stippelen) ---------- */
function loadImg(src){ return new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.src=src; }); }
function sampleCanvas(c,weightFn,W=7.6,Hm=4.3,yOff=-.25){
  const g=c.getContext("2d"), w=c.width, h=c.height, d=g.getImageData(0,0,w,h).data;
  const lum=new Float32Array(w*h), al=new Float32Array(w*h);
  for(let i=0;i<w*h;i++){ al[i]=d[i*4+3]/255; lum[i]=(d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114)/255; }
  const wt=new Float32Array(w*h); let tot=0;
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){ const i=y*w+x;
    const gx=lum[i+1]-lum[i-1]+ (al[i+1]-al[i-1]), gy=lum[i+w]-lum[i-w]+(al[i+w]-al[i-w]);
    const v=weightFn(al[i],lum[i],Math.min(1,Math.hypot(gx,gy)*2)); wt[i]=v; tot+=v; }
  const cdf=new Float32Array(w*h); let acc=0; for(let i=0;i<w*h;i++){ acc+=wt[i]/tot; cdf[i]=acc; }
  const s=Math.min(W/w,Hm/h), out=new Float32Array(N*3);
  for(let k=0;k<N;k++){ const r=Math.random(); let lo=0,hi=w*h-1; while(lo<hi){ const m=(lo+hi)>>1; if(cdf[m]<r) lo=m+1; else hi=m; }
    const x=lo%w+Math.random(), y=Math.floor(lo/w)+Math.random();
    out[k*3]=(x-w/2)*s; out[k*3+1]=(h/2-y)*s+yOff; out[k*3+2]=(Math.random()-.5)*.5; }
  return out;
}
function imgCanvas(img,max=420,inset=0){
  // eerst bijsnijden tot wat echt getekend is (alfa > .5), anders worden vormen met veel lege rand te klein
  const t=document.createElement("canvas"); t.width=img.width; t.height=img.height; const tg=t.getContext("2d"); tg.drawImage(img,0,0);
  const d=tg.getImageData(0,0,t.width,t.height).data; let x0=t.width,y0=t.height,x1=0,y1=0;
  for(let y=0;y<t.height;y+=2) for(let x=0;x<t.width;x+=2) if(d[(y*t.width+x)*4+3]>128){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  const iw=(x1-x0)*inset, ih=(y1-y0)*inset; x0+=iw; x1-=iw; y0+=ih; y1-=ih;
  const w=x1-x0, h=y1-y0, s=Math.min(1,max/Math.max(w,h)); const c=document.createElement("canvas"); c.width=Math.round(w*s); c.height=Math.round(h*s);
  c.getContext("2d").drawImage(t,x0,y0,w,h,0,0,c.width,c.height); return c; }
const tone=(a,l,e)=>a*(Math.pow(1-l,1.6)*.8+e*1.6+.02);
function dustCloud(){ const o=new Float32Array(N*3); for(let k=0;k<N;k++){ const r=Math.pow(Math.random(),.6)*3.6, a=Math.random()*6.283, b=(Math.random()-.5)*2; o[k*3]=Math.cos(a)*r*1.4; o[k*3+1]=Math.sin(a)*r*.6+b*.3; o[k*3+2]=(Math.random()-.5)*3; } return o; }
function plane(){ const c=document.createElement("canvas"); c.width=440; c.height=240; const g=c.getContext("2d"); g.fillStyle="#000"; g.translate(220,120);
  g.beginPath(); g.ellipse(0,0,185,17,0,0,7); g.fill();
  const poly=pts=>{ g.beginPath(); pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y)); g.closePath(); g.fill(); };
  poly([[25,-8],[-60,-112],[-28,-112],[80,-8]]); poly([[25,8],[-60,112],[-28,112],[80,8]]);
  poly([[-140,-6],[-178,-52],[-160,-52],[-115,-6]]); poly([[-140,6],[-178,52],[-160,52],[-115,6]]);
  g.fillRect(-30,-70,30,10); g.fillRect(-30,60,30,10);   // motoren
  return sampleCanvas(c,(a,l,e)=>a*(.25+e*2.5),7.6,3.8,.1); }

const SHAPES=[]; const META=[
  {eye:"",title:"Like dust",hint:"Houd ingedrukt om in te ademen. Laat los."},
  {ch:1,eye:"Hoofdstuk 1",title:"Schiphol"},
  {ch:2,eye:"Hoofdstuk 2",title:"The AZC"},
  {ch:3,eye:"Hoofdstuk 3",title:"Amsterdam"},
  {ch:4,eye:"Hoofdstuk 4",title:"The Letter"},
  {eye:"Sam",title:"Waar nu heen?",hint:"Adem nog één keer uit."},
  {eye:"De kamer",title:"Hier kwam hij terecht"}
];
async function buildShapes(){
  const R=LD_ASSETS.room.layers;
  const [kn,bi,le,sb,bg]=await Promise.all([LD_ASSETS.sam_knees.src,R.bicycle.src,R.letter.src,LD_ASSETS.sam_back.src,LD_ASSETS.room.bg].map(loadImg));
  SHAPES.push(dustCloud(),plane(),
    sampleCanvas(imgCanvas(kn),(a,l,e)=>a*(Math.pow(1-l,1.8)*.7+e*2+.03),6,4.4),
    sampleCanvas(imgCanvas(bi),(a,l,e)=>a*(Math.pow(1-l,1.2)*.5+e*2.2+.02),7.4,4.3),
    sampleCanvas(imgCanvas(le,520),(a,l,e)=>a*(Math.pow(1-l,2)*1.2+e*1.4+.08),7.2,4.0),
    sampleCanvas(imgCanvas(sb),tone,5,4.6,-.1),
    sampleCanvas(imgCanvas(bg,240),(a,l,e)=>(e>.3?Math.pow(e,2)*2:0)+Math.pow(l,4)*1.4+.002,8.6,4.8,-.15));
}

/* ---------- deeltjes ---------- */
const geo=new THREE.BufferGeometry();
const aR=new Float32Array(N*4); for(let i=0;i<N*4;i++) aR[i]=Math.random();
geo.setAttribute("aR",new THREE.BufferAttribute(aR,4));
geo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(N*3),3));
const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  uniforms:{uT:{value:1},uBreath:{value:0},uExhale:{value:0},uTime:{value:0},uSize:{value:1},uMouse:{value:new THREE.Vector2(99,99)},uAccent:{value:new THREE.Color("#D6A93E")},uFade:{value:1}},
  vertexShader:`attribute vec3 aA,aB; attribute vec4 aR; uniform float uT,uBreath,uExhale,uTime,uSize; uniform vec2 uMouse;
  varying float vA; varying float vK; varying vec4 vR;
  void main(){
    float k=smoothstep(aR.x*.45,aR.x*.45+.55,uT);
    vec3 p=mix(aA,aB,k);
    float mid=sin(k*3.14159);
    float an=aR.y*6.283+uTime*.4;
    p+=vec3(cos(an)*(1.+aR.z*2.),sin(an*1.3)*(.6+aR.w),sin(an*.7)*1.5)*mid*1.4;     // wervelt tijdens de vormverandering
    p+=vec3(sin(uTime*.31+aR.y*40.),cos(uTime*.27+aR.z*40.),sin(uTime*.2+aR.w*30.))*.035;  // zweeft altijd een beetje
    vec3 c=vec3((aR.y-.5)*.6,(aR.z-.5)*.4,(aR.w-.5)*.6);
    p=mix(p,c,uBreath*(.75+.2*aR.x));                                                // inademen: alles naar je toe
    p+=normalize(p+vec3(.001))*uExhale*(1.5+aR.w*3.);                                // uitademen: wegwaaien
    vec2 d=p.xy-uMouse; float f=exp(-dot(d,d)*2.2); p.xy+=normalize(d+.0001)*f*.55;  // wat je aanraakt, waait opzij
    vec4 mv=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*mv;
    float wash=step(aR.w,.07);                                                       // een paar grote, waterige vlekken
    gl_PointSize=uSize*(wash>.5?(18.+aR.z*26.):(1.3+pow(aR.z,3.)*4.))*(14./-mv.z);
    vA=wash>.5?.06:(.55+.4*aR.x); vK=wash; vR=aR;
  }`,
  fragmentShader:`precision highp float; varying float vA,vK; varying vec4 vR; uniform vec3 uAccent; uniform float uFade;
  void main(){
    vec2 q=gl_PointCoord-.5; float a=atan(q.y,q.x);
    float r=.5-.08*sin(a*5.+vR.y*30.)-.05*sin(a*11.+vR.z*20.);                       // rafelige inktvlek
    float d=length(q); float m=smoothstep(r,r-.08,d);
    if(m<.01) discard;
    vec3 ink=mix(vec3(.08,.07,.06),vec3(.18,.13,.09),vR.z);
    vec3 col=mix(ink,uAccent,step(.86,vR.y));
    if(vK>.5) col=mix(ink,uAccent,.5);
    gl_FragColor=vec4(col,m*vA*uFade);
  }`});
const pts=new THREE.Points(geo,mat); pts.frustumCulled=false; scene.add(pts);
function setShapes(a,b){ geo.setAttribute("aA",new THREE.BufferAttribute(SHAPES[a],3)); geo.setAttribute("aB",new THREE.BufferAttribute(SHAPES[b],3)); }

let camZ=14, dive=null;
function resize(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h;
  const needW=9.2, needH=6; const vh=2*14*Math.tan(THREE.MathUtils.degToRad(17.5)); const z=Math.max(14,needW/(w/h)/vh*14,needH/vh*14); camZ=z; camera.position.z=z; camera.updateProjectionMatrix();
  paper.material.uniforms.uRes.value.set(w,h); mat.uniforms.uSize.value=Math.min(devicePixelRatio,2)*Math.max(.8,Math.min(1.4,w/1100)); }
addEventListener("resize",resize); resize();

/* ---------- het verloop ---------- */
let cur=0, morph=null, busy=true, holding=false, hold=0, breath=0, exhale=0;
const $=id=>document.getElementById(id);
function canBreathe(){ if(busy||morph) return false; if(cur===0||cur===5) return true; if(cur>=1&&cur<=4) return st.has(cur); return false; }
function showLabel(){
  if(META[cur].ch) LD.prepareChapter(META[cur].ch); // film alvast klaarzetten
  const m=META[cur], el=$("shape");
  $("shEye").textContent=m.eye; $("shTitle").textContent=m.title;
  $("shOpen").hidden=!m.ch; if(m.ch) $("shOpen").textContent=st.has(m.ch)?"Opnieuw kijken":"Open het hoofdstuk";
  el.classList.toggle("on",cur>0);
  mat.uniforms.uAccent.value.set(m.ch?LD.CHAPTERS[m.ch-1].color:"#D6A93E");
  if(m.ch&&!st.has(m.ch)) LD.hint("Klik op het beeld om het hoofdstuk te openen.",m.eye,6000);
  else if(m.ch) LD.hint("Houd ingedrukt om in te ademen. Laat los.","Gezien",6000);
  else if(m.hint) LD.hint(m.hint,null,6000);
  $("breath").classList.toggle("on",canBreathe());
}
function goTo(n){
  const from=cur; cur=n; morph={t:0,t0:performance.now(),from,to:n}; setShapes(from,n); mat.uniforms.uT.value=0;
  $("shape").classList.remove("on"); LD.hint(null);
}
function openCur(){ const m=META[cur]; if(!m.ch||busy||morph) return; busy=true;
  dive={t:0}; LD.hint(null);
  LD.openChapter(m.ch,{approach:()=>dive&&dive.t>=1,target:()=>({renderer,scene,camera,root:pts,grow:5}),onClose:(ch,seen)=>{ busy=false; if(dive) dive.back=true; if(seen&&!st.has(ch)){ st.mark(ch); hudUi.update(); stainIn(ch); }
    showLabel();
    // na het hoofdstuk blaast de kamer vanzelf uit: het stof wordt de volgende vorm
    if(seen){ const at=cur; setTimeout(()=>{ if(cur===at&&!busy&&!morph&&!holding){ exhale=1; goTo(cur+1); } },1800); } }}); }
$("shOpen").onclick=openCur;

/* adem-meter */
function arc(p){ const a=Math.min(p,1)*Math.PI*2-.001, r=44; const x=50+r*Math.sin(a), y=50-r*Math.cos(a); $("breathArc").setAttribute("d",p<=0?"":`M50 6 A${r} ${r} 0 ${a>Math.PI?1:0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`); }
let inhaleSnd=null, holdT0=0;
function press(){ if(!canBreathe()) return; holding=true; hold=0; holdT0=performance.now(); $("breathLbl").textContent="in…"; }
function release(){ if(!holding) return; holding=false; hold=Math.max(hold,(performance.now()-holdT0)/1400); $("breathLbl").textContent="adem in";
  if(hold>=1){ exhale=1; goTo(cur+1); } else if(hold>.2){ LD.hint("Dieper. Houd langer vast.",null,2000); }
  hold=0; arc(0); }

/* ---------- invoer ---------- */
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(), plane0=new THREE.Plane(new THREE.Vector3(0,0,1),0), hit=new THREE.Vector3();
let downAt=null, downT=0;
cv.addEventListener("pointermove",e=>{ ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(ndc,camera); ray.ray.intersectPlane(plane0,hit); mat.uniforms.uMouse.value.set(hit.x,hit.y);
  cv.style.cursor=(META[cur].ch&&!busy&&!morph&&Math.abs(hit.x)<3.8&&Math.abs(hit.y+.2)<2.3)?"pointer":"default"; });
cv.addEventListener("pointerleave",()=>mat.uniforms.uMouse.value.set(99,99));
cv.addEventListener("pointerdown",e=>{ downAt=[e.clientX,e.clientY]; downT=performance.now(); press(); });
addEventListener("pointerup",e=>{
  const quick=downAt&&performance.now()-downT<300&&Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])<8;
  if(holding) release();
  if(quick&&META[cur].ch){ ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); ray.setFromCamera(ndc,camera); ray.ray.intersectPlane(plane0,hit); if(Math.abs(hit.x)<3.8&&Math.abs(hit.y+.2)<2.3) openCur(); }
  downAt=null;
});
addEventListener("keydown",e=>{ if(e.code==="Space"&&!e.repeat){ e.preventDefault(); press(); } });
addEventListener("keyup",e=>{ if(e.code==="Space") release(); });

/* inktvlekken */
const stainAmt=[0,0,0,0];
function stainIn(ch){ const t0=performance.now(); (function s(){ const p=Math.min(1,(performance.now()-t0)/7000); stainAmt[ch-1]=1-Math.pow(1-p,3); if(p<1) requestAnimationFrame(s); })(); }

/* ---------- start ---------- */
const hudUi=LD.hud({name:"Adem",st,onReset:()=>{ stainAmt.fill(0); if(!busy){ cur=0; setShapes(0,0); showLabel(); } },onDev:n=>{ stainAmt[n-1]=st.has(n)?1:0; if(!busy&&!morph) showLabel(); }});
LD.CHAPTERS.forEach(c=>{ if(st.has(c.n)) stainAmt[c.n-1]=1; });
const ready=buildShapes().then(()=>{
  // verder waar je was: het laatst geziene hoofdstuk staat er nog
  cur=Math.min(st.count,4); setShapes(cur,cur); mat.uniforms.uT.value=1;
});
$("go").onclick=()=>{ $("go").textContent="…"; ready.then(()=>{ $("start").classList.add("off"); busy=false; showLabel(); }); }; $("go").click(); // geen startpaneel: meteen de kamer in
$("again").onclick=()=>{ $("end").classList.add("off"); busy=false; cur=6; goTo(0); };

/* ---------- loop ---------- */
const clock=new THREE.Clock();
let running=true;
window.addEventListener("ld:pause",()=>{ running=false; });
window.addEventListener("ld:resume",()=>{
  if(!running){
    running=true;
    clock.getDelta();
    requestAnimationFrame(frame);
  }
});
function frame(){
  if(!running) return;
  const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime;
  if(holding){ hold=Math.min(1.2,(performance.now()-holdT0)/1400); arc(hold); if(hold>=1) $("breathLbl").textContent="laat los"; }
  const bTarget=holding?Math.min(1,hold):0; breath+=(bTarget-breath)*Math.min(1,dt*(holding?4:5));
  exhale*=Math.pow(.02,dt);
  if(morph){ morph.t=Math.min(1,(performance.now()-morph.t0)/3200); mat.uniforms.uT.value=morph.t;
    if(morph.t>=1){ const to=morph.to; morph=null;
      if(to===6){ busy=true; setTimeout(()=>$("end").classList.remove("off"),2500); }
      showLabel(); } }
  else if(SHAPES.length&&!holding){ $("breath").classList.toggle("on",canBreathe()); }
  mat.uniforms.uBreath.value=breath; mat.uniforms.uExhale.value=exhale; mat.uniforms.uTime.value=t;
  pts.rotation.y=Math.sin(t*.15)*.12; pts.rotation.x=Math.sin(t*.11)*.04;
  const P=paper.material.uniforms; P.uTime.value=t; for(let i=0;i<4;i++) P.uAmt.value[i]=stainAmt[i]; P.uEnd.value+=((cur===6?1:0)-P.uEnd.value)*dt;
  // klik: de camera gaat naar de vorm toe
  if(dive&&dive.back&&dive.t<=0) dive=null;
  if(dive){ dive.t=Math.max(0,Math.min(1,dive.t+dt*(dive.back?-1.3:1.8))); const e=dive.t*dive.t*(3-2*dive.t); camera.position.z=camZ*(1-.42*e); }
  if(SHAPES.length) renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
frame();
})();
