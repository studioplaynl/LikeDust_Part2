/* Variatie 1 · De herinneringskamer (2.5D, lagen uit room 2.psd). */
(function(){
"use strict";
const A=LD_ASSETS.room, IW=A.w, IH=A.h, WW=16, WH=9;
const st=LD.state("v1");
const cv=document.getElementById("gl");
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x000000);
const FOV=30, camera=new THREE.PerspectiveCamera(FOV,1,0.1,100);
let D=16.8;

/* ---------- wat waar ligt ---------- */
const OBJ={
  passport:{ch:1,z:2.9,name:"Het paspoort",line:"“Passport, please…”"},
  frame:   {ch:2,z:2.6,name:"De foto van thuis",line:"“For a moment, Mom's voice felt like home.”"},
  bicycle: {ch:3,z:1.2,name:"De fiets",line:"“Remembering what freedom tasted like.”"},
  letter:  {ch:4,z:0.9,name:"De brief",line:"“That day I had received a letter from the IND.”"},
  money:   {z:3.0,name:"Honderd dollar",line:"“The only thing I had was a hundred-dollar bill. A gift from my mother.”"},
  wallpics:{z:0.25,name:"Foto's van Iran",line:"Herinneringen aan Iran · <em>Like Dust</em>, deel 1"},
  bird:    {z:1.7,name:"De duif",line:"“A wounded little creature, fragile and still.”"},
  sam:     {z:1.9,name:"Sam"},
  light:   {z:0.5}
};

/* ---------- shaders ---------- */
const layerVS=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const layerFS=`
precision highp float;
varying vec2 vUv;
uniform sampler2D map; uniform vec2 texSize; uniform float uColor,uGlow,uTime,uFog,uPad,uSeed,uAlpha,uBreath,uLight,uShow;
${LD.GLSL.noise}${LD.GLSL.ink}
float lum(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
vec4 tx(vec2 uv){ if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.) return vec4(0); return texture2D(map,uv); }
void main(){
  vec2 uv=(vUv-.5)*uPad+.5;
  float boil=floor(uTime*8.);                       // lijnen 'koken' op 8 fps, zoals hertekend
  vec2 wob=(vec2(vnoise(uv*14.+boil),vnoise(uv*14.+boil+9.))-.5)*.004;
  vec4 c=tx(uv);
  vec2 e=1.6/texSize;
  float tl=lum(tx(uv+wob+vec2(-e.x, e.y)).rgb), t=lum(tx(uv+wob+vec2(0,e.y)).rgb), tr=lum(tx(uv+wob+e).rgb);
  float l=lum(tx(uv+wob-vec2(e.x,0)).rgb), r=lum(tx(uv+wob+vec2(e.x,0)).rgb);
  float bl=lum(tx(uv+wob-e).rgb), b=lum(tx(uv+wob-vec2(0,e.y)).rgb), br=lum(tx(uv+wob+vec2(e.x,-e.y)).rgb);
  float gx=-tl-2.*l-bl+tr+2.*r+br, gy=-bl-2.*b-br+tl+2.*t+tr;
  float edge=smoothstep(.10,.42,length(vec2(gx,gy)));
  // silhouetlijn uit de alfa
  float aE=0.; for(int i=0;i<8;i++){ float an=float(i)*.785; aE=max(aE,tx(uv+wob+vec2(cos(an),sin(an))*e*1.5).a); }
  float sil=clamp(aE-c.a*.85,0.,1.);
  float a=max(c.a,sil*.9);
  vec2 px=gl_FragCoord.xy;

  // krijtschets: lichte lijnen + wat arcering in de donkere delen
  float dark=1.-lum(c.rgb);
  float h=hatch(px,dark*.55,.9,6.)*c.a*.35;
  vec3 chalk=vec3(.93,.91,.86);
  float sketchA=clamp(max(edge*c.a,sil)*.9+h,0.,1.)*(.55+.45*vnoise(px*.05));

  // inkleuren: de verf loopt als inkt het papier in (fbm-drempel), met een donkere natte rand
  float asp=texSize.x/texSize.y;
  vec2 w=wash((uv-.5)*vec2(asp,1.)/max(asp,1.)*1.6,uColor,uSeed);
  float m=w.x, rim=w.y*c.a;
  vec3 paint=c.rgb;
  paint=mix(paint,floor(paint*7.)/7.,.22);           // iets geposteriseerd: stift i.p.v. olieverf
  paint*=1.-edge*.45;                                  // lijnwerk aanzetten
  paint*=markerTex(px*1.3);
  paint=mix(paint,paint*vec3(1.08,1.0,.86),uLight);    // warmer licht naarmate het verhaal vordert

  float g=granul(px,uSeed);
  paint*=mix(1.,g,.6)*(1.-rim*.28);                     // korrel + donkere droogrand
  vec3 col=mix(chalk,paint,m);
  float alpha=mix(sketchA,a,m);
  // glow: oker contour
  col=mix(col,vec3(.84,.66,.24),sil*uGlow);
  alpha=max(alpha,sil*uGlow);
  col=mix(col,vec3(.96,.95,.92),uFog);
  alpha*=1.-uFog*.8;
  gl_FragColor=vec4(col,clamp(alpha,0.,1.)*uAlpha*uShow);
}`;

const bgFS=`
precision highp float;
varying vec2 vUv;
uniform sampler2D map; uniform float uTime,uSat,uInk,uFog,uLight; uniform vec2 uRes;
${LD.GLSL.noise}${LD.GLSL.ink}
void main(){
  vec4 c=texture2D(map,vUv);
  float L=dot(c.rgb,vec3(.299,.587,.114));
  vec3 col=mix(vec3(L),c.rgb,uSat);
  col=mix(col,col*vec3(1.1,1.0,.82),uLight*.6);
  col*=markerTex(gl_FragCoord.xy);
  // inktrand: zwarte inkt die vanaf de randen naar binnen kruipt en langzaam ademt
  vec2 p=(vUv-.5)*vec2(1.78,1.);
  float d=length(p*vec2(.85,1.15));
  float n=fbm(vUv*vec2(7.,4.)+uTime*.03)*.35;
  float ink=smoothstep(.0,.06,d+n-(1.05-uInk*.62));
  col=mix(col,vec3(.02,.018,.015),ink);
  col=mix(col,vec3(.96,.95,.92),uFog*(.75+.25*fbm(vUv*4.+uTime*.1)));
  gl_FragColor=vec4(col,1.);
}`;

/* ---------- lagen opbouwen ---------- */
const layers={}, hitData={};
const order=["bg","wallpics","light","letter","bicycle","bird","sam","frame","passport","money"];
function toWorld(x,y){ return new THREE.Vector2((x/IW-.5)*WW,(.5-y/IH)*WH); }
function alphaReader(name,uri,w,h){
  const img=new Image(); img.onload=()=>{ const s=Math.min(1,256/Math.max(w,h)); const c=document.createElement("canvas"); c.width=Math.max(1,Math.round(w*s)); c.height=Math.max(1,Math.round(h*s));
    const g=c.getContext("2d"); g.drawImage(img,0,0,c.width,c.height); hitData[name]={w:c.width,h:c.height,d:g.getImageData(0,0,c.width,c.height).data}; };
  img.src=uri;
}
const bgMat=new THREE.ShaderMaterial({vertexShader:layerVS,fragmentShader:bgFS,uniforms:{map:{value:LD.tex(A.bg)},uTime:{value:0},uSat:{value:.3},uInk:{value:0},uFog:{value:0},uLight:{value:0},uRes:{value:new THREE.Vector2()}}});
const bg=new THREE.Mesh(new THREE.PlaneGeometry(WW,WH),bgMat); bg.renderOrder=0; scene.add(bg);
layers.bg={mesh:bg,z:0,cx:0,cy:0,w:WW,h:WH};

let seed=1;
for(const name of order.slice(1)){
  const L=A.layers[name]; const o=OBJ[name];
  const PAD=name==="light"?1:1.08;
  let mat;
  if(name==="light"){
    mat=new THREE.MeshBasicMaterial({map:LD.tex(L.src),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.35,color:new THREE.Color(.7,.75,.85)});
  } else {
    mat=new THREE.ShaderMaterial({vertexShader:layerVS,fragmentShader:layerFS,transparent:true,depthWrite:false,
      uniforms:{map:{value:LD.tex(L.src)},texSize:{value:new THREE.Vector2(L.w,L.h)},uColor:{value:0},uGlow:{value:0},uTime:{value:0},uFog:{value:0},uPad:{value:PAD},uSeed:{value:(seed++)*3.7},uAlpha:{value:1},uShow:{value:1},uBreath:{value:0},uLight:{value:0}}});
    alphaReader(name,L.src,L.w,L.h);
  }
  const c=toWorld(L.x+L.w/2,L.y+L.h/2);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(L.w/IW*WW*PAD,L.h/IH*WH*PAD),mat);
  mesh.renderOrder=1+order.indexOf(name); mesh.userData.name=name;
  scene.add(mesh);
  layers[name]={mesh,mat,z:o.z,cx:c.x,cy:c.y,pad:PAD,L};
}
/* Sam en de duif zijn niet 'iets van een hoofdstuk': altijd geschilderd */
layers.sam.mat.uniforms.uColor.value=1;

/* duif die kan klapperen (green-screen clip, uitgekeyd) */
const DV=LD_ASSETS.dove;
const doveTex=LD.tex(DV.src); doveTex.repeat.set(1/DV.cols,1/DV.rows);
const doveMat=new THREE.MeshBasicMaterial({map:doveTex,transparent:true,depthWrite:false,opacity:0});
const DS=151/190, dW=DV.fw*DS/IW*WW, dH=DV.fh*DS/IH*WH;
const dove=new THREE.Mesh(new THREE.PlaneGeometry(dW,dH),doveMat); dove.renderOrder=20; scene.add(dove);
const doveHome=toWorld(1365,392); dove.userData={x:doveHome.x,y:doveHome.y,z:1.7,s:1};

/* Sam van achteren, voor het einde */
const SB=LD_ASSETS.sam_back;
const backMat=new THREE.MeshBasicMaterial({map:LD.tex(SB.src),transparent:true,depthWrite:false,opacity:0});
const bh=600/IH*WH, back=new THREE.Mesh(new THREE.PlaneGeometry(bh*SB.w/SB.h,bh),backMat); back.renderOrder=21; scene.add(back);
const backPos=toWorld(1000,1010-300); back.userData={x:backPos.x,y:backPos.y,z:2.2};

/* stof in de lichtbundel */
const dustN=380, dustPos=new Float32Array(dustN*3), dustSeed=new Float32Array(dustN);
const LB=A.layers.light;
for(let i=0;i<dustN;i++){ dustSeed[i]=Math.random(); }
const dotCv=document.createElement("canvas"); dotCv.width=dotCv.height=32; { const g=dotCv.getContext("2d"); const gr=g.createRadialGradient(16,16,0,16,16,16); gr.addColorStop(0,"rgba(255,245,220,1)"); gr.addColorStop(1,"rgba(255,245,220,0)"); g.fillStyle=gr; g.fillRect(0,0,32,32); }
const dustGeo=new THREE.BufferGeometry(); dustGeo.setAttribute("position",new THREE.BufferAttribute(dustPos,3));
const dustMat=new THREE.PointsMaterial({size:.05,map:new THREE.CanvasTexture(dotCv),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.5});
const dust=new THREE.Points(dustGeo,dustMat); dust.renderOrder=15; scene.add(dust);

/* stiftcirkel om het volgende ding */
const ringMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  uniforms:{uP:{value:0},uTime:{value:0},uCol:{value:new THREE.Color("#D6A93E")}},
  vertexShader:layerVS,
  fragmentShader:`precision highp float; varying vec2 vUv; uniform float uP,uTime; uniform vec3 uCol;
  ${LD.GLSL.noise}
  void main(){ vec2 p=vUv*2.-1.; float a=atan(p.y,p.x); float t=(a+3.14159)/6.28318;
    float boil=floor(uTime*6.);
    float r=.82+.05*sin(a*2.+boil)+.03*(vnoise(vec2(a*3.,boil))-.5)+ .04*t;     // spiraalt een beetje: niet netjes dicht
    float w=.035+.02*vnoise(vec2(a*8.,boil));
    float d=abs(length(p)-r);
    float s=1.-smoothstep(w*.5,w,d);
    float drawn=step(t,uP*1.08);
    float dry=.65+.35*vnoise(vec2(a*40.,length(p)*30.));                       // droge stift
    gl_FragColor=vec4(uCol,s*drawn*dry); }`});
const ring=new THREE.Mesh(new THREE.PlaneGeometry(1,1),ringMat); ring.renderOrder=30; scene.add(ring);
let ringFor=null;

/* ---------- layout: dekkend in beeld, met pannen ---------- */
let visW=WW,visH=WH,panX=0,panY=0,aspect=1;
function layout(){
  const w=innerWidth,h=innerHeight; aspect=w/h;
  renderer.setSize(w,h,false); camera.aspect=aspect;
  visH=(aspect>=WW/WH?WW/aspect:WH)*0.97; visW=visH*aspect;
  D=(visH/2)/Math.tan(THREE.MathUtils.degToRad(FOV/2));
  camera.updateProjectionMatrix();
  panX=Math.max(0,(WW-visW)/2); panY=Math.max(0,(WH-visH)/2);
  for(const k in layers){ const l=layers[k]; const s=(D-l.z)/D; l.mesh.position.set(l.cx*s,l.cy*s,l.z); l.mesh.scale.setScalar(s); }
  bgMat.uniforms.uRes.value.set(w,h);
}
addEventListener("resize",layout); layout();

function placeAt(mesh,x,y,z,sc=1){ const s=(D-z)/D; mesh.position.set(x*s,y*s,z); mesh.scale.setScalar(s*sc); }

/* ---------- interactie ---------- */
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(); let hover=null;
const look={x:0,y:0,tx:0,ty:0}; let dragging=false, dragX=0, dragY=0, panTx=0, panTy=0, panVx=0, panVy=0;
const coarse=matchMedia("(hover:none)").matches;
const clickable=["money","passport","frame","bird","bicycle","letter","wallpics","sam"];
function pick(){
  ray.setFromCamera(ndc,camera);
  const hits=ray.intersectObjects(clickable.map(n=>layers[n].mesh),false);
  for(const h of hits){ const n=h.object.userData.name, l=layers[n], hd=hitData[n]; if(!hd||l.mat.uniforms.uShow.value<.5) continue;
    const u=(h.uv.x-.5)*l.pad+.5, v=(h.uv.y-.5)*l.pad+.5; if(u<0||u>1||v<0||v>1) continue;
    const i=(Math.floor((1-v)*(hd.h-1))*hd.w+Math.floor(u*(hd.w-1)))*4+3; if(hd.d[i]>60) return n; }
  return null;
}
/* alleen wat je kunt aanklikken staat in de kamer; na elk hoofdstuk komt er iets bij */
function shown(n){ const o=OBJ[n]; if(!o||!o.z||n==="sam"||n==="light") return true;
  if(o.ch) return st.has(o.ch)||st.next()===o.ch;
  if(n==="money") return st.has(1); if(n==="wallpics") return st.count>=2; if(n==="bird") return st.count>=4; return true; }
function status(n){ const o=OBJ[n]; if(!o.ch) return "extra"; if(st.has(o.ch)) return "seen"; return st.next()===o.ch?"next":"locked"; }
function tagFor(n,x,y){
  const o=OBJ[n]; const s=status(n);
  if(n==="sam"){ LD.tag(null); return; }
  if(s==="extra"){ LD.tag(n==="bird"&&st.count===4?`<em>Laat los</em> · ${o.name}`:o.name,x,y); return; }
  const c=LD.CHAPTERS[o.ch-1];
  LD.tag(s==="next"?`<em>Hoofdstuk ${o.ch}</em> · ${c.title}`:s==="seen"?`Opnieuw · ${c.title}`:`${o.name} · <em>nog niet</em>`,x,y);
}
cv.addEventListener("pointermove",e=>{
  ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
  if(dragging){ panTx=Math.max(-1,Math.min(1,panTx-(e.clientX-dragX)/innerWidth*3)); panTy=Math.max(-1,Math.min(1,panTy+(e.clientY-dragY)/innerHeight*3)); dragX=e.clientX; dragY=e.clientY; return; }
  if(!coarse){ look.tx=ndc.x; look.ty=ndc.y; }
  const n=busy?null:pick(); hover=n; cv.style.cursor=n&&n!=="sam"?"pointer":"default";
  if(n&&OBJ[n].ch&&st.has(OBJ[n].ch)) LD.prepareChapter(OBJ[n].ch); // terugkijken: film alvast klaarzetten
  if(n) tagFor(n,e.clientX,e.clientY); else LD.tag(null);
  if(n==="sam") LD.hint(nextWhisper(),null,3500);
});
cv.addEventListener("pointerdown",e=>{ if(coarse){ dragging=true; dragX=e.clientX; dragY=e.clientY; downAt=[e.clientX,e.clientY]; } });
let downAt=null;
addEventListener("pointerup",e=>{ dragging=false; });
cv.addEventListener("click",e=>{
  if(busy) return;
  if(downAt&&Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>8) return;
  ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
  const n=pick(); if(!n) return; activate(n,e.clientX,e.clientY);
});

const whispers=["I had never felt so alone.","Every sound felt like danger.","When will this nightmare end?","It's been a long time since I've felt this light.","How did I end up here?"];
function nextWhisper(){ return "<em>"+whispers[Math.min(st.count,4)]+"</em>"; }

let busy=false;
function activate(n,x,y){
  const o=OBJ[n], s=status(n);
  if(n==="sam") return;
  if(n==="wallpics"){ LD.hint(o.line,"Aan de muur",4000); setTimeout(()=>window.open("https://likedust.nl/","_blank","noopener"),600); return; }
  if(n==="money"){ LD.hint(o.line,"Onder het kussen",5000); flash("money"); return; }
  if(n==="bird"){ if(st.count===4) return ending(); flap(2.5); LD.hint(st.has(3)?o.line:"De duif kijkt naar het raam.",null,4000); return; }
  if(s==="locked"){ LD.hint("Dit is nog een schets. Eerst iets anders.",null,3000); shake(n); return; }
  // hoofdstuk openen: camera duikt naar het ding toe, dan inkt
  busy=true; LD.tag(null); LD.hint(o.line,"Hoofdstuk "+o.ch,2600);
  const l=layers[n]; dive={t:0,x:l.mesh.position.x,y:l.mesh.position.y,z:l.z};
  LD.openChapter(o.ch,{approach:()=>dive&&dive.t>=1,target:()=>({renderer,scene,camera,root:l.mesh}),onClose:(ch,seen)=>{
    dive=null; busy=false;
    if(seen&&!st.has(ch)){ st.mark(ch); hudUi.update(); colorIn(n); }
    afterReturn(); LD.prepareChapter(st.next());
  }});
}
let dive=null;

/* ---------- animaties ---------- */
const tweens=[];
function tween(ms,fn,done){ tweens.push({t0:performance.now(),ms,fn,done}); }
function ease(t){ return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
function colorIn(n){ const u=layers[n].mat.uniforms.uColor; tween(6500,p=>u.value=1-Math.pow(1-p,2.2)); }
function flash(n){ const u=layers[n].mat.uniforms.uColor; const v0=u.value; tween(2600,p=>u.value=Math.max(v0,Math.sin(p*Math.PI))); }
function shake(n){ const l=layers[n]; const x0=l.cx; tween(400,p=>{ l.cx=x0+Math.sin(p*30)*.03*(1-p); layout(); },()=>{ l.cx=x0; layout(); }); }
let flapT=0; function flap(s){ flapT=s; }

let showInstant=true;
function applyProgress(instant){
  LD.prepareChapter(st.next());
  if(instant) showInstant=true;
  const c=st.count;
  for(const n in OBJ){ const o=OBJ[n]; if(!o.ch) continue; layers[n].mat.uniforms.uColor.value=st.has(o.ch)?1:0; }
  layers.money.mat.uniforms.uColor.value=st.has(1)?1:0;
  layers.wallpics.mat.uniforms.uColor.value=Math.min(1,c/2);
  layers.bird.mat.uniforms.uColor.value=st.has(3)?1:0.0;
  target.sat=.25+c*.19; target.ink=.55*(1-c/4); target.light=c/4;
  if(instant){ cur.sat=target.sat; cur.ink=target.ink; cur.light=target.light; }
  const nx=st.next(); ringFor=nx?Object.keys(OBJ).find(k=>OBJ[k].ch===nx):(c===4?"bird":null);
  ringMat.uniforms.uP.value=0;
}
const target={sat:.25,ink:.55,light:0}, cur={sat:.25,ink:.55,light:0};
function afterReturn(){
  applyProgressSoft();
  const nx=st.next();
  if(nx) setTimeout(()=>LD.hint(`Er ligt nog iets in de kamer.`,"Hoofdstuk "+nx,4000),2400);
  else setTimeout(()=>LD.hint("Alles is gezien. De duif wil naar buiten.","Einde",5000),2600);
}
function applyProgressSoft(){ // zonder kleur terug te zetten die net inkleurt
  const c=st.count; target.sat=.25+c*.19; target.ink=.55*(1-c/4); target.light=c/4;
  layers.wallpics.mat.uniforms.uColor.value=Math.min(1,c/2);
  if(st.has(1)) layers.money.mat.uniforms.uColor.value=1;
  if(st.has(3)) tween(2500,p=>layers.bird.mat.uniforms.uColor.value=Math.max(layers.bird.mat.uniforms.uColor.value,p));
  const nx=st.next(); ringFor=nx?Object.keys(OBJ).find(k=>OBJ[k].ch===nx):(c===4?"bird":null); ringMat.uniforms.uP.value=0;
}

/* ---------- einde: de duif vliegt, Sam staat op, de kamer loopt wit vol ---------- */
let endPhase=0;
function ending(){
  busy=true; endPhase=1; LD.tag(null); LD.hint(null); ringFor=null;
  LD.sfx("pigeon",.4);
  layers.bird.mat.uniforms.uAlpha.value=0; doveMat.opacity=1; flapT=99;
  const from={x:doveHome.x,y:doveHome.y}, to=toWorld(917,60);
  tween(3800,p=>{ const e=ease(p); dove.userData.x=from.x+(to.x-from.x)*e+Math.sin(p*9)*.2*(1-p); dove.userData.y=from.y+(to.y-from.y)*e; dove.userData.s=1-.75*e; doveMat.opacity=p>.85?(1-p)/.15:1; });
  setTimeout(()=>{
    tween(1600,p=>{ layers.sam.mat.uniforms.uAlpha.value=1-p; backMat.opacity=p; });
  },2200);
  setTimeout(()=>{ tween(4200,p=>{ const f=ease(p); setFog(f); }); },3600);
  setTimeout(()=>{ document.getElementById("end").classList.remove("off"); },8200);
}
function setFog(f){ bgMat.uniforms.uFog.value=f; for(const n in layers){ const u=layers[n].mat&&layers[n].mat.uniforms; if(u&&u.uFog) u.uFog.value=f; } layers.light.mat.opacity=.35*(1-f); dustMat.opacity=.5*(1-f); backMat.color.setScalar(1-f*.9); }
document.getElementById("again").onclick=()=>{
  document.getElementById("end").classList.add("off");
  tween(2200,p=>{ setFog(1-p); backMat.opacity=1-p; layers.sam.mat.uniforms.uAlpha.value=p; layers.bird.mat.uniforms.uAlpha.value=p; },()=>{ busy=false; endPhase=0; doveMat.opacity=0; dove.userData={x:doveHome.x,y:doveHome.y,z:1.7,s:1}; flapT=0; ringFor="bird"; });
};

/* ---------- start ---------- */
const hudUi=LD.hud({name:"Herinneringskamer",st,onReset:()=>applyProgress(true),onDev:n=>{ const k=Object.keys(OBJ).find(x=>OBJ[x].ch===n); const u=layers[k].mat.uniforms.uColor; if(st.has(n)) colorIn(k); else u.value=0; applyProgressSoft(); }});
applyProgress(true);
document.getElementById("go").onclick=()=>{
  document.getElementById("start").classList.add("off");
  const nx=st.next();
  setTimeout(()=>LD.hint(nx?"Iets in de kamer wacht op je. Zoek de omcirkelde schets.":"Alles is gezien. De duif wil naar buiten.",nx?"Hoofdstuk "+nx:"Einde",5000),900);
};

document.getElementById("go").click(); // geen startpaneel: meteen de kamer in

/* ---------- loop ---------- */
const clock=new THREE.Clock();
function frame(){
  const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime;
  const now=performance.now();
  for(let i=tweens.length-1;i>=0;i--){ const w=tweens[i]; const p=Math.min(1,(now-w.t0)/w.ms); w.fn(p); if(p>=1){ tweens.splice(i,1); w.done&&w.done(); } }
  for(const k of ["sat","ink","light"]) cur[k]+=(target[k]-cur[k])*Math.min(1,dt*1.5);
  bgMat.uniforms.uTime.value=t; bgMat.uniforms.uSat.value=cur.sat; bgMat.uniforms.uInk.value=cur.ink; bgMat.uniforms.uLight.value=cur.light;
  layers.light.mat.opacity=endPhase?layers.light.mat.opacity:.22+cur.light*.4;
  layers.light.mat.color.setRGB(.65+.35*cur.light,.7+.2*cur.light,.85-.25*cur.light);
  for(const n in layers){ const u=layers[n].mat&&layers[n].mat.uniforms; if(!u||!u.uTime) continue; u.uTime.value=t; u.uLight.value=cur.light;
    const g=(n===hover&&status(n)!=="locked"&&!busy)?1:0; u.uGlow.value+=(g-u.uGlow.value)*Math.min(1,dt*8);
    const sv=shown(n)?1:0; u.uShow.value=showInstant?sv:u.uShow.value+(sv-u.uShow.value)*Math.min(1,dt*.9); }
  showInstant=false;
  // Sam ademt
  const sam=layers.sam.mesh; sam.scale.y=sam.scale.x*(1+Math.sin(t*1.3)*.006);

  // camera: parallax + pannen + duiken
  look.x+=(look.tx-look.x)*Math.min(1,dt*3); look.y+=(look.ty-look.y)*Math.min(1,dt*3);
  if(coarse){ panTx+=panVx; }
  let cx=look.x*.35+panTx*panX*(coarse?1:0)+look.x*panX, cy=look.y*.2+panTy*panY*(coarse?1:0)+look.y*panY, cz=D;
  if(dive){ dive.t=Math.min(1,dive.t+dt*1.8); const e=ease(dive.t); cx+= (dive.x-cx)*e*.8; cy+=(dive.y-cy)*e*.8; cz=D-(D-dive.z-2.5)*e; }
  camera.position.set(cx,cy,cz); camera.lookAt(cx*.92,cy*.92,0);

  // stiftcirkel
  ring.visible=!!ringFor&&!busy;
  if(ring.visible){ const l=layers[ringFor]; const s=l.mesh.scale.x, rw=Math.max(l.L.w,l.L.h*.8)/IW*WW*1.25, rh=Math.max(l.L.h,l.L.w*.6)/IH*WH*1.25; ring.position.set(l.mesh.position.x,l.mesh.position.y,l.z+.02); ring.scale.set(rw*s,rh*s,1);
    ringMat.uniforms.uP.value=Math.min(1,ringMat.uniforms.uP.value+dt*.7); ringMat.uniforms.uTime.value=t; }

  // duif
  if(flapT>0){ flapT-=dt; doveMat.opacity=endPhase?doveMat.opacity:1; layers.bird.mat.uniforms.uAlpha.value=endPhase?0:0; }
  else if(!endPhase){ doveMat.opacity=0; layers.bird.mat.uniforms.uAlpha.value=1; }
  { const f=Math.floor((t*8)%DV.frames); doveTex.offset.set((f%DV.cols)/DV.cols,1-(Math.floor(f/DV.cols)+1)/DV.rows); }
  placeAt(dove,dove.userData.x,dove.userData.y,dove.userData.z,dove.userData.s);
  placeAt(back,back.userData.x,back.userData.y,back.userData.z,1+Math.sin(t*1.2)*.004);

  // stof
  const p=dustGeo.attributes.position.array;
  for(let i=0;i<dustN;i++){ const s=dustSeed[i]; const ty=((s*7.3+t*.012*(.5+s))%1);
    const px=LB.x+LB.w*(.35+.45*ty+.15*Math.sin(s*40+t*.3)), py=LB.y+LB.h*(1-ty);
    const w=toWorld(px,py); p[i*3]=w.x+Math.sin(t*.5+s*20)*.15; p[i*3+1]=w.y; p[i*3+2]=.6+s*1.2; }
  dustGeo.attributes.position.needsUpdate=true;
  dustMat.opacity=endPhase?dustMat.opacity:.25+cur.light*.4;

  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
frame();
})();
