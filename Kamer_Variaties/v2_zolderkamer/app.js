/* Variatie 2 · De zolderkamer (3D, toon + stift-nabewerking). */
(function(){
"use strict";
const st=LD.state("v2");
const cv=document.getElementById("gl");
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false});
const DPR=Math.min(devicePixelRatio,1.75);
renderer.setPixelRatio(DPR);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(62,1,.05,40);

/* ---------- materialen ---------- */
const grad=(()=>{ const d=new Uint8Array([40,40,40,255, 120,120,120,255, 200,200,200,255, 255,255,255,255]); const t=new THREE.DataTexture(d,4,1); t.minFilter=t.magFilter=THREE.NearestFilter; t.needsUpdate=true; return t; })();
const toon=(c,o={})=>new THREE.MeshToonMaterial(Object.assign({color:c,gradientMap:grad},o));
const PAL={floor:"#c9b48f",wall:"#e3dccb",blue:"#2c4296",white:"#ecebe4",wood:"#b07a3f",woodD:"#7a5128",teal:"#5f97a8",pillow:"#f1efe8",purple:"#3b3048",plant:"#4f8a3a",pink:"#c0507a",mint:"#8fc7b8",ochre:"#D6A93E",red:"#c0402c",metal:"#9aa3a6",ink:"#16130f"};

function box(w,h,d,c,x,y,z,parent=scene,mat){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat||toon(c)); m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; parent.add(m); return m; }
function cyl(rt,rb,h,c,x,y,z,parent=scene,seg=14){ const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),toon(c)); m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; parent.add(m); return m; }
function sph(r,c,x,y,z,parent=scene){ const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),toon(c)); m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; parent.add(m); return m; }

/* ---------- de kamer ---------- */
const X0=-2.6,X1=2.6,Z0=-2.4,Z1=2.6,H=2.7, SLX=-.5, SLY=1.25; // schuin dak links: van (X0,SLY) naar (SLX,H)
box(X1-X0,.05,Z1-Z0,PAL.floor,0,-.025,(Z0+Z1)/2);
// achterwand met dakkapel
const back=new THREE.Shape(); back.moveTo(X0,0); back.lineTo(X1,0); back.lineTo(X1,H); back.lineTo(SLX,H); back.lineTo(X0,SLY); back.lineTo(X0,0);
const win=new THREE.Path(); win.moveTo(-.35,1.05); win.lineTo(1.25,1.05); win.lineTo(1.25,2.05); win.lineTo(-.35,2.05); win.lineTo(-.35,1.05); back.holes.push(win);
const backM=new THREE.Mesh(new THREE.ShapeGeometry(back),toon(PAL.wall,{side:THREE.DoubleSide})); backM.position.z=Z0; backM.receiveShadow=true; scene.add(backM);
// voorwand (achter de camera, voor als je omkijkt)
const fr=back.clone(); fr.holes=[]; const frontM=new THREE.Mesh(new THREE.ShapeGeometry(fr),toon(PAL.wall,{side:THREE.DoubleSide})); frontM.position.z=Z1; scene.add(frontM);
// schuine blauwe wand links
const slopeLen=Math.hypot(SLX-X0,H-SLY), slopeAng=Math.atan2(H-SLY,SLX-X0);
const slope=new THREE.Mesh(new THREE.PlaneGeometry(slopeLen,Z1-Z0),toon(PAL.blue,{side:THREE.DoubleSide}));
slope.position.set((X0+SLX)/2,(SLY+H)/2,(Z0+Z1)/2); slope.rotation.set(-Math.PI/2,0,slopeAng,"ZYX"); slope.receiveShadow=true; scene.add(slope);
const lowWall=new THREE.Mesh(new THREE.PlaneGeometry(Z1-Z0,SLY),toon(PAL.blue,{side:THREE.DoubleSide})); lowWall.rotation.y=Math.PI/2; lowWall.position.set(X0,SLY/2,(Z0+Z1)/2); lowWall.receiveShadow=true; scene.add(lowWall);
const rightWall=new THREE.Mesh(new THREE.PlaneGeometry(Z1-Z0,H),toon(PAL.wall,{side:THREE.DoubleSide})); rightWall.rotation.y=-Math.PI/2; rightWall.position.set(X1,H/2,(Z0+Z1)/2); rightWall.receiveShadow=true; scene.add(rightWall);
const ceil=new THREE.Mesh(new THREE.PlaneGeometry(X1-SLX,Z1-Z0),toon(PAL.wall,{side:THREE.DoubleSide})); ceil.rotation.x=Math.PI/2; ceil.position.set((SLX+X1)/2,H,(Z0+Z1)/2); scene.add(ceil);
// raam: kozijn + lucht
const sky=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.0),new THREE.MeshBasicMaterial({color:"#f0a060"})); sky.position.set(.45,1.55,Z0-.12); scene.add(sky);
const winG=new THREE.Group(); scene.add(winG);
box(1.7,.07,.14,PAL.white,.45,1.02,Z0+.02,winG); box(1.7,.07,.14,PAL.white,.45,2.08,Z0+.02,winG);
box(.07,1.1,.14,PAL.white,-.38,1.55,Z0+.02,winG); box(.07,1.1,.14,PAL.white,1.28,1.55,Z0+.02,winG);
const sash=new THREE.Group(); sash.position.set(1.25,1.55,Z0+.03); scene.add(sash);
box(.05,.98,.05,PAL.white,-.8,0,0,sash); box(.05,.98,.05,PAL.white,0,0,0,sash); box(.8,.05,.05,PAL.white,-.4,0,0,sash);
box(1.8,.05,.25,PAL.white,.45,.99,Z0+.1); // vensterbank
// radiator
const rad=new THREE.Group(); scene.add(rad); for(let i=0;i<9;i++) box(.06,.55,.08,PAL.white,1.45+i*.1,.45,Z0+.08,rad);

/* ---------- meubels ---------- */
// bureau + stoel
box(1.3,.05,.6,PAL.wood,.4,.76,Z0+.35); for(const [x,z] of [[-.2,.1],[1,.1],[-.2,.6],[1,.6]]) box(.05,.74,.05,PAL.woodD,x,.37,Z0+z);
const chair=new THREE.Group(); chair.position.set(.25,0,Z0+.95); chair.rotation.y=.35; scene.add(chair);
box(.45,.04,.42,PAL.wood,0,.46,0,chair); for(const [x,z] of [[-.2,-.18],[.2,-.18],[-.2,.18],[.2,.18]]) box(.04,.46,.04,PAL.woodD,x,.23,z,chair);
box(.45,.5,.04,PAL.wood,0,.73,.2,chair); for(let i=0;i<4;i++) box(.03,.4,.02,PAL.woodD,-.15+i*.1,.72,.2,chair);
// ladekast
const drawer=new THREE.Group(); drawer.position.set(-1.5,0,Z0+.35); scene.add(drawer);
box(.95,.9,.55,PAL.white,0,.45,0,drawer); for(let i=0;i<3;i++) box(.88,.02,.02,"#b9b5aa",0,.28+i*.24,.28,drawer);
// bed
const bed=new THREE.Group(); bed.position.set(1.85,0,.6); scene.add(bed);
box(1.0,.32,2.1,PAL.white,0,.16,0,bed); box(1.02,.18,2.05,PAL.teal,0,.41,.02,bed); box(.6,.12,.4,PAL.pillow,0,.55,-.8,bed); box(1.0,.6,.06,PAL.white,0,.3,-1.05,bed);
// nachtkastje
box(.5,.04,.4,PAL.white,1.3,.5,-.85); box(.5,.04,.4,PAL.white,1.3,.22,-.85); for(const [x,z] of [[1.08,-1.02],[1.52,-1.02],[1.08,-.68],[1.52,-.68]]) box(.035,.52,.035,PAL.white,x,.26,z);
// plant + wasmand + kleren
cyl(.2,.15,.28,"#e7dccb",-1.9,.14,.6); for(let i=0;i<7;i++){ const l=sph(.13,PAL.plant,-1.9+Math.cos(i)*.12,.42+i*.03,.6+Math.sin(i*2)*.12); l.scale.set(1.3,.5,.8); l.rotation.z=i; }
cyl(.22,.18,.38,"#e9e3d8",-1.25,.19,.35); box(.3,.12,.3,PAL.pink,-1.25,.42,.35).rotation.y=.4;
const cloth=box(.6,.03,.35,PAL.mint,-.7,.02,1.0); cloth.rotation.y=.6;
// kast met spiegel links voor
const ward=new THREE.Group(); ward.position.set(-2.35,0,1.7); scene.add(ward);
box(.45,1.25,1.1,"#6aa596",0,.62,0,ward);
const mirror=new THREE.Mesh(new THREE.PlaneGeometry(.95,1.05),new THREE.MeshToonMaterial({color:"#b8c8cc",gradientMap:grad,emissive:"#203038"})); mirror.rotation.y=Math.PI/2; mirror.position.set(.23,.65,0); ward.add(mirror);
// bureaulamp
const lampG=new THREE.Group(); lampG.position.set(-.05,.79,Z0+.25); scene.add(lampG);
cyl(.08,.1,.03,PAL.ink,0,0,0,lampG); cyl(.012,.012,.35,PAL.ink,0,.18,0,lampG); const shade=cyl(.05,.11,.12,PAL.ochre,0,.37,.04,lampG); shade.rotation.x=.5;
const lamp=new THREE.PointLight("#ffcf7a",0,3.5,1.6); lamp.position.set(0,.3,.12); lampG.add(lamp);

/* ---------- vier dingen, vier hoofdstukken ---------- */
const items=[];
function item(ch,name,line,group){ group.userData={ch,name,line}; items.push(group); scene.add(group); return group; }
// 1 · de rugzak (wat hij meenam naar Schiphol)
const bag=new THREE.Group(); bag.position.set(.95,0,Z0+.75); bag.rotation.y=-.3;
{ const b=sph(.22,PAL.purple,0,.24,0,bag); b.scale.set(1,1.25,.7); const p=sph(.14,PAL.purple,0,.17,.12,bag); p.scale.set(1,.9,.6); box(.04,.35,.03,PAL.ink,-.12,.3,-.14,bag); box(.04,.35,.03,PAL.ink,.12,.3,-.14,bag);
  const pass=box(.12,.16,.02,"#1f2c55",.06,.42,.06,bag); pass.rotation.z=.3; }
item(1,"De rugzak","“The air was heavy with stories I didn't want to tell.”",bag);
// 2 · de telefoon (Mom's voice)
const phone=new THREE.Group(); phone.position.set(1.3,.52,-.85);
{ const b=box(.24,.08,.18,PAL.ochre,0,.04,0,phone); const r=box(.26,.05,.07,PAL.ochre,0,.12,-.02,phone); r.rotation.x=.1; const d=cyl(.05,.05,.01,PAL.ink,0,.085,.04,phone); d.rotation.x=.5; }
item(2,"De telefoon","“For a moment, Mom's voice felt like home.”",phone);
// 3 · de duif in de schoenendoos op de vensterbank (a wounded little creature)
const birdBox=new THREE.Group(); birdBox.position.set(.95,1.02,Z0+.12);
{ box(.34,.12,.22,"#c49a6c",0,.06,0,birdBox); const body=sph(.07,"#f2f0ea",0,.17,0,birdBox); body.scale.set(1.4,1,1); sph(.045,"#f2f0ea",-.08,.22,0,birdBox); const tail=cyl(0,.04,.1,"#dcdad2",.11,.18,0,birdBox); tail.rotation.z=-1.2; const bk=cyl(0,.012,.03,PAL.ochre,-.13,.22,0,birdBox); bk.rotation.z=1.57; }
item(3,"De duif","“I found a wounded little creature, fragile and still.”",birdBox);
// 4 · de brief op het bureau
const letter=new THREE.Group(); letter.position.set(.65,.79,Z0+.45); letter.rotation.y=.2;
{ box(.3,.01,.2,"#f4f1e8",0,0,0,letter); box(.05,.012,.06,PAL.red,.1,.002,-.05,letter); box(.28,.004,.012,"#888",0,.006,.04,letter); }
item(4,"De brief","“That day I had received a letter from the IND.”",letter);
// extra: de spiegel
mirror.userData={extra:"mirror",name:"De spiegel",line:"Wie kijkt er terug?"}; items.push(mirror);
// het raam, voor het einde
sky.userData={extra:"window",name:"Het raam",line:"Het is ochtend."}; items.push(sky);

/* ---------- getekende pagina's aan de blauwe muur ---------- */
function pageTex(ch,drawn){
  const c=document.createElement("canvas"); c.width=256; c.height=340; const g=c.getContext("2d");
  g.fillStyle="#efe9dc"; g.fillRect(0,0,256,340);
  if(drawn){
    const C=LD.CHAPTERS[ch-1]; g.strokeStyle="#16130f"; g.lineWidth=4;
    const panels=[[14,14,228,120],[14,142,108,110],[130,142,112,110],[14,260,228,66]];
    panels.forEach(([x,y,w,h],i)=>{ g.fillStyle=i===1?C.color:i===2?"#2a2723":"#c9c2b2"; g.globalAlpha=.85; g.fillRect(x,y,w,h); g.globalAlpha=1;
      g.beginPath(); for(let k=0;k<5;k++){ const j=()=>(Math.random()-.5)*3; g.moveTo(x+j(),y+j()); g.lineTo(x+w+j(),y+j()); g.lineTo(x+w+j(),y+h+j()); g.lineTo(x+j(),y+h+j()); g.closePath(); } g.stroke();
      for(let k=0;k<14;k++){ g.globalAlpha=.5; g.beginPath(); const sx=x+Math.random()*w, sy=y+Math.random()*h; g.moveTo(sx,sy); g.lineTo(sx+(Math.random()-.5)*w*.5,sy+(Math.random()-.5)*h*.5); g.lineWidth=1+Math.random()*3; g.stroke(); } g.globalAlpha=1; g.lineWidth=4; });
    g.fillStyle="#16130f"; g.font="700 26px 'Big Shoulders Display', Impact, sans-serif"; g.fillText(ch+" · "+C.title.toUpperCase(),22,52);
  } else { g.strokeStyle="rgba(0,0,0,.12)"; g.lineWidth=2; g.strokeRect(14,14,228,312); }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
const pages=[];
for(let i=0;i<4;i++){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(.42,.56),new THREE.MeshToonMaterial({map:pageTex(i+1,false),gradientMap:grad,side:THREE.DoubleSide}));
  const s=.25+i*.2; // langs de schuine wand
  m.position.set(X0+(SLX-X0)*s+.02,SLY+(H-SLY)*s-.02,Z0+.7+i*.55);
  m.rotation.copy(slope.rotation); m.translateZ(-.012); m.rotateX(Math.PI); m.rotateZ((i%2?-1:1)*.08);
  m.receiveShadow=true; scene.add(m); pages.push(m);
}

/* ---------- licht: avond → nacht → dageraad → ochtend ---------- */
const amb=new THREE.HemisphereLight("#3a3550","#201a14",.6); scene.add(amb);
const sun=new THREE.DirectionalLight("#ff9a4a",1.6); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:20}); sun.shadow.bias=-.0015; scene.add(sun); scene.add(sun.target); sun.target.position.set(0,0,0);
const TOD=[ // avond, nacht, diepe nacht, dageraad, ochtend
  {sun:"#ff9a4a",si:1.8,sp:[-2.2,1.9,-7],amb:"#7a6a88",ai:1.0,sky:"#f0a060",lamp:0,ink:.92},
  {sun:"#7f9ec8",si:.6,sp:[2,5,-6],amb:"#3a4a70",ai:.7,sky:"#1b2a4a",lamp:2.2,ink:.98},
  {sun:"#6f88b8",si:.4,sp:[3,5,-6],amb:"#2a3558",ai:.55,sky:"#0f182c",lamp:2.6,ink:1},
  {sun:"#ffb0a0",si:1.3,sp:[-1.5,2.2,-7],amb:"#8a7a98",ai:.95,sky:"#e8a3a0",lamp:.6,ink:.94},
  {sun:"#fff1d6",si:2.4,sp:[1.2,5,-5],amb:"#e8e0d0",ai:1.25,sky:"#e3eef4",lamp:0,ink:.85}
];
let tod=0, todTarget=0;
const _c1=new THREE.Color(),_c2=new THREE.Color();
function applyTod(v){
  const i=Math.min(3,Math.floor(v)), f=v-i, a=TOD[i], b=TOD[Math.min(4,i+1)];
  const mixc=(p,q)=>_c1.set(p).lerp(_c2.set(q),f).clone();
  sun.color.copy(mixc(a.sun,b.sun)); sun.intensity=a.si+(b.si-a.si)*f; sun.position.set(...a.sp.map((x,k)=>x+(b.sp[k]-x)*f));
  amb.color.copy(mixc(a.amb,b.amb)); amb.intensity=a.ai+(b.ai-a.ai)*f;
  sky.material.color.copy(mixc(a.sky,b.sky)); lamp.intensity=a.lamp+(b.lamp-a.lamp)*f;
  post.uniforms.uNight.value=1-(Math.abs(v-4)<.01?1:Math.min(1,Math.abs(v-1.5)/1.5));
}

/* ---------- nabewerking: stift, inkt, papier ---------- */
const rtC=new THREE.WebGLRenderTarget(1,1,{depthTexture:new THREE.DepthTexture(1,1),samples:0});
const rtN=new THREE.WebGLRenderTarget(1,1);
const normalMat=new THREE.MeshNormalMaterial();
const post=new THREE.ShaderMaterial({
  uniforms:{tC:{value:rtC.texture},tN:{value:rtN.texture},tD:{value:rtC.depthTexture},uRes:{value:new THREE.Vector2()},uTime:{value:0},uNear:{value:camera.near},uFar:{value:camera.far},uNight:{value:0},uFlash:{value:0},uDpr:{value:DPR}},
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader:`precision highp float; varying vec2 vUv;
  uniform sampler2D tC,tN,tD; uniform vec2 uRes; uniform float uTime,uNear,uFar,uNight,uFlash,uDpr;
  ${LD.GLSL.noise}${LD.GLSL.ink}
  float lin(float d){ float z=d*2.-1.; return 2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear)); }
  float D(vec2 uv){ return lin(texture2D(tD,uv).r); }
  vec3 N(vec2 uv){ return texture2D(tN,uv).rgb*2.-1.; }
  void main(){
    vec2 px=vUv*uRes; float boil=floor(uTime*8.);
    vec2 j=(vec2(vnoise(px*.03+boil),vnoise(px*.03+boil+5.))-.5)*2.5/uRes;        // trillende lijn
    vec2 uv=vUv+j, e=1.25*uDpr/uRes;
    float d0=D(uv);
    float dd=abs(D(uv+vec2(e.x,0))-D(uv-vec2(e.x,0)))+abs(D(uv+vec2(0,e.y))-D(uv-vec2(0,e.y)));
    vec3 n0=N(uv);
    float nd=length(N(uv+vec2(e.x,0))-N(uv-vec2(e.x,0)))+length(N(uv+vec2(0,e.y))-N(uv-vec2(0,e.y)));
    float edge=max(smoothstep(.06,.14,dd/d0),smoothstep(.45,.9,nd));
    edge*=.55+.45*smoothstep(.2,.6,vnoise(px*.08+boil*3.));                       // gebroken stiftlijn
    vec2 mis=vec2(1.8,-1.2)*uDpr/uRes;                                              // kleur valt net naast de lijn
    vec3 c=texture2D(tC,vUv+mis).rgb;
    c=pow(c,vec3(1./2.2));
    float L=dot(c,vec3(.299,.587,.114));
    c=mix(c,floor(c*6.+.5)/6.,.35);
    c*=markerTex(px/uDpr);
    float h1=hatch(px/uDpr,smoothstep(.36,.08,L)*.8,.75,7.);
    float h2=hatch(px/uDpr,smoothstep(.16,.02,L)*.8,-.8,6.);
    vec3 ink=vec3(.07,.06,.05);
    vec3 col=paperCol(px/uDpr,c);
    col=mix(col,ink,clamp(edge*.95+h1*.35+h2*.4,0.,1.));
    // inktrand
    vec2 q=vUv-.5; float vg=length(q*vec2(1.2,1.))+fbm(vUv*5.+uTime*.02)*.25;
    col=mix(col,ink,smoothstep(.55,.62,vg)*(.5+.5*uNight));
    col=mix(col,vec3(1.,.98,.94),uFlash);
    gl_FragColor=vec4(col,1.);
  }`});
const postScene=new THREE.Scene(), postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),post));

function resize(){
  const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov=w/h<1?78:62; camera.updateProjectionMatrix();
  const W=Math.floor(w*DPR),Hh=Math.floor(h*DPR); rtC.setSize(W,Hh); rtN.setSize(W,Hh); post.uniforms.uRes.value.set(W,Hh);
}
addEventListener("resize",resize); resize();

/* ---------- stiftcirkel (canvas) ---------- */
const circCv=document.createElement("canvas"); circCv.width=circCv.height=256;
function drawCircle(p){ const g=circCv.getContext("2d"); g.clearRect(0,0,256,256); g.strokeStyle="#D6A93E"; g.lineCap="round";
  for(let pass=0;pass<2;pass++){ g.lineWidth=pass?4:9; g.globalAlpha=pass?.9:.55; g.beginPath(); const end=Math.PI*2.15*p;
    for(let a=0;a<=end;a+=.05){ const r=100+Math.sin(a*2+pass)*6+a*2.5; const x=128+Math.cos(a-1.9)*r, y=128+Math.sin(a-1.9)*r*.86; a?g.lineTo(x,y):g.moveTo(x,y); } g.stroke(); }
  circTex.needsUpdate=true; }
const circTex=new THREE.CanvasTexture(circCv);
const circ=new THREE.Sprite(new THREE.SpriteMaterial({map:circTex,depthTest:false,transparent:true})); circ.renderOrder=99; circ.scale.setScalar(.6); scene.add(circ);
let circP=0, circFor=null;

/* ---------- interactie ---------- */
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(-9,-9);
const look={yaw:0,pitch:0,ty:0,tp:0}; let hover=null, busy=false, dive=null, endPhase=0, mouseX=0, pan=0;
const coarse=matchMedia("(hover:none)").matches; let drag=null;
function itemOf(o){ while(o){ if(items.includes(o)) return o; o=o.parent; } return null; }
function pick(){ ray.setFromCamera(ndc,camera); const h=ray.intersectObjects(scene.children,true); for(const x of h){ const it=itemOf(x.object); if(it) return it; if(x.object!==circ) return null; } return null; }
function status(it){ const u=it.userData; if(u.extra) return u.extra==="window"?(st.count===4?"next":"extra"):"extra"; if(st.has(u.ch)) return "seen"; return st.next()===u.ch?"next":"locked"; }
function emiss(it,v){ it.traverse(o=>{ if(o.material&&o.material.emissive) o.material.emissive.set(PAL.ochre).multiplyScalar(v); }); }
cv.addEventListener("pointermove",e=>{
  ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
  if(drag){ look.ty=Math.max(-.7,Math.min(.7,look.ty+(e.clientX-drag[0])/innerWidth*1.6)); look.tp=Math.max(-.3,Math.min(.35,look.tp+(e.clientY-drag[1])/innerHeight*.8)); drag=[e.clientX,e.clientY]; return; }
  if(!coarse){ mouseX=ndc.x; look.tp=ndc.y*.22; }
  const it=busy?null:pick();
  if(hover&&hover!==it&&hover!==mirror) emiss(hover,0);
  hover=it; cv.style.cursor=it?"pointer":"default";
  if(it){ const u=it.userData, s=status(it); if(it!==mirror) emiss(it,s==="locked"?.0:.35);
    const C=u.ch&&LD.CHAPTERS[u.ch-1];
    LD.tag(u.extra?u.name:s==="next"?`<em>Hoofdstuk ${u.ch}</em> · ${C.title}`:s==="seen"?`Opnieuw · ${C.title}`:`${u.name} · <em>nog niet</em>`,e.clientX,e.clientY);
  } else LD.tag(null);
});
cv.addEventListener("pointerdown",e=>{ if(coarse) drag=[e.clientX,e.clientY]; down=[e.clientX,e.clientY]; });
addEventListener("pointerup",()=>{ drag=null; });
let down=null;
cv.addEventListener("click",e=>{
  if(busy||(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>8)) return;
  ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
  const it=pick(); if(!it) return; const u=it.userData, s=status(it);
  if(u.extra==="mirror"){ LD.hint(st.count<4?"In de spiegel zie je alleen de kamer. Nog niet wie hier woont.":"Een jongen die thuiskomt.","De spiegel",3500); return; }
  if(u.extra==="window"){ if(st.count===4) return ending(); LD.hint(["Het is avond.","Het is nacht. Iedereen slaapt.","Diep in de nacht.","De lucht wordt licht."][st.count],null,3000); return; }
  if(s==="locked"){ LD.hint("Nog niet. Eerst iets anders in de kamer.",null,3000); return; }
  busy=true; LD.tag(null); emiss(it,0); LD.hint(u.line,"Hoofdstuk "+u.ch,2400);
  const p=new THREE.Vector3(); it.getWorldPosition(p); dive={t:0,p,from:camera.position.clone(),fromLook:lookAt.clone()};
  setTimeout(()=>LD.openChapter(u.ch,{onClose:(ch,seen)=>{
    busy=false; dive=null;
    if(seen&&!st.has(ch)){ st.mark(ch); hudUi.update(); onProgress(true); }
  }}),1000);
});

/* ---------- voortgang ---------- */
function onProgress(anim){
  const c=st.count; todTarget=c; if(!anim) tod=c;
  pages.forEach((m,i)=>{ const on=st.has(i+1); if(m.userData.on!==on){ m.userData.on=on; m.material.map=pageTex(i+1,on); m.material.needsUpdate=true; } });
  const nx=st.next(); circFor=nx?items.find(i=>i.userData.ch===nx):(c===4?sky:null); circP=0;
  // alleen wat je kunt aanklikken staat in de kamer; na elk hoofdstuk komt er iets bij
  items.forEach(it=>{ const ch=it.userData.ch; if(!ch) return; const on=st.has(ch)||nx===ch;
    if(on&&!it.visible&&anim){ it.visible=true; it.scale.setScalar(.01); const t0=performance.now(); (function grow(){ const p=Math.min(1,(performance.now()-t0)/900); it.scale.setScalar(.01+.99*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(grow); })(); }
    else it.visible=on; });
  if(anim){
    setTimeout(()=>LD.hint(c===4?"Het is ochtend. Doe het raam open.":["","Het is nacht geworden. Iedereen slaapt.","Diep in de nacht. Alleen de bureaulamp brandt nog.","De lucht wordt licht."][c],c===4?"Ochtend":"Er ligt nog iets",4500),1600); }
}
function ending(){
  busy=true; endPhase=1; LD.tag(null); circFor=null;
  const t0=performance.now();
  (function open(){ const p=Math.min(1,(performance.now()-t0)/2500); sash.rotation.y=-p*1.3; post.uniforms.uFlash.value=Math.max(0,(p-.4)/.6)*.9; if(p<1) requestAnimationFrame(open); else setTimeout(()=>document.getElementById("end").classList.remove("off"),400); })();
}
document.getElementById("again").onclick=()=>{ document.getElementById("end").classList.add("off"); sash.rotation.y=0; post.uniforms.uFlash.value=0; busy=false; endPhase=0; };

const hudUi=LD.hud({name:"Zolderkamer",st,onReset:()=>onProgress(false),onDev:()=>onProgress(true)});
onProgress(false);
document.getElementById("go").onclick=()=>{ document.getElementById("start").classList.add("off");
  const nx=st.next(); setTimeout(()=>LD.hint(nx?"Iets in deze kamer hoort bij Sams verhaal. Zoek het omcirkelde ding.":"Het is ochtend. Doe het raam open.",nx?"Hoofdstuk "+nx:"Ochtend",5000),900); };

/* ---------- loop ---------- */
const clock=new THREE.Clock(); const lookAt=new THREE.Vector3(0,1,-1.5); const camBase=new THREE.Vector3(-.1,1.5,2.25);
function frame(){
  const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime;
  tod+=(todTarget-tod)*Math.min(1,dt*.6); applyTod(tod);
  // de kamer draait mee naar waar de muis is; aan de rand blijft hij doordraaien
  if(!coarse&&!busy){ const ax=Math.abs(mouseX), edge=ax>.4?Math.sign(mouseX)*Math.pow((ax-.4)/.6,1.5):0;
    pan=Math.max(-.62,Math.min(.62,pan+edge*dt*1.4)); look.ty=Math.max(-.8,Math.min(.8,pan+mouseX*.22)); }
  look.yaw+=(look.ty-look.yaw)*Math.min(1,dt*3); look.pitch+=(look.tp-look.pitch)*Math.min(1,dt*3);
  const L=new THREE.Vector3(camBase.x+Math.sin(look.yaw)*3.5,camBase.y-.5+look.pitch*3,camBase.z-Math.cos(look.yaw)*3.5);
  let P=camBase.clone(); P.y+=Math.sin(t*.5)*.01;
  if(dive){ dive.t=Math.min(1,dive.t+dt*1.1); const e=dive.t*dive.t*(3-2*dive.t); const tp=dive.p.clone().add(new THREE.Vector3(0,.45,.85)); P.lerp(tp,e); L.lerp(dive.p,e); }
  lookAt.copy(L); camera.position.copy(P); camera.lookAt(L);
  // volgende ding: lichte puls + stiftcirkel
  items.forEach(it=>{ if(it===hover||it===mirror||it===sky) return; emiss(it,it===circFor&&!busy?(.12+.1*Math.sin(t*3)):0); });
  if(circFor&&!busy){ circP=Math.min(1,circP+dt*.8); if(Math.floor(t*8)!==circ.userData.f){ circ.userData.f=Math.floor(t*8); drawCircle(circP); } const p=new THREE.Vector3(); circFor.getWorldPosition(p); circ.position.copy(p).add(new THREE.Vector3(0,.12,0)); circ.scale.setScalar(circFor===sky?1.5:.6); circ.visible=true; } else circ.visible=false;
  birdBox.children[1].position.y=.17+Math.abs(Math.sin(t*2))*.005;
  post.uniforms.uTime.value=t;
  // render: normalen, kleur+diepte, compositie
  const cvis=circ.visible; circ.visible=false; scene.overrideMaterial=normalMat;
  renderer.setRenderTarget(rtN); renderer.setClearColor(0x8080ff); renderer.render(scene,camera);
  scene.overrideMaterial=null; circ.visible=cvis;
  renderer.setRenderTarget(rtC); renderer.setClearColor(0x000000); renderer.render(scene,camera);
  renderer.setRenderTarget(null); renderer.render(postScene,postCam);
  requestAnimationFrame(frame);
}
frame();
})();
