/* Variatie 2 · De zolderkamer (3D, toon + stift-nabewerking) — Web, iOS & Android. */
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
const grad=(()=>{ const d=new Uint8Array([48,48,52,255, 128,128,132,255, 205,205,205,255, 255,255,255,255]); const t=new THREE.DataTexture(d,4,1); t.minFilter=t.magFilter=THREE.NearestFilter; t.needsUpdate=true; return t; })();
const toon=(c,o={})=>new THREE.MeshToonMaterial(Object.assign({color:c,gradientMap:grad},o));
const PAL={floor:"#c9b48f",wall:"#e3dccb",blue:"#2c4296",white:"#ecebe4",wood:"#b07a3f",woodD:"#7a5128",teal:"#5f97a8",pillow:"#f1efe8",purple:"#3b3048",plant:"#4f8a3a",pink:"#c0507a",mint:"#8fc7b8",ochre:"#D6A93E",red:"#c0402c",navy:"#1d3160",metal:"#9aa3a6",ink:"#16130f"};

function box(w,h,d,c,x,y,z,parent=scene,mat){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat||toon(c)); m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; parent.add(m); return m; }
function cyl(rt,rb,h,c,x,y,z,parent=scene,seg=14,mat){ const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat||toon(c)); m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; parent.add(m); return m; }
function sph(r,c,x,y,z,parent=scene,mat){ const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),mat||toon(c)); m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; parent.add(m); return m; }

/* ---------- de kamer ---------- */
const X0=-2.6,X1=2.6,Z0=-2.4,Z1=2.6,H=2.7, SLX=-.5, SLY=1.25;
box(X1-X0,.05,Z1-Z0,PAL.floor,0,-.025,(Z0+Z1)/2);
const back=new THREE.Shape(); back.moveTo(X0,0); back.lineTo(X1,0); back.lineTo(X1,H); back.lineTo(SLX,H); back.lineTo(X0,SLY); back.lineTo(X0,0);
const win=new THREE.Path(); win.moveTo(-.35,1.05); win.lineTo(1.25,1.05); win.lineTo(1.25,2.05); win.lineTo(-.35,2.05); win.lineTo(-.35,1.05); back.holes.push(win);
const backM=new THREE.Mesh(new THREE.ShapeGeometry(back),toon(PAL.wall,{side:THREE.DoubleSide})); backM.position.z=Z0; backM.receiveShadow=true; scene.add(backM);
const fr=back.clone(); fr.holes=[]; const frontM=new THREE.Mesh(new THREE.ShapeGeometry(fr),toon(PAL.wall,{side:THREE.DoubleSide})); frontM.position.z=Z1; scene.add(frontM);
const slopeLen=Math.hypot(SLX-X0,H-SLY), slopeAng=Math.atan2(H-SLY,SLX-X0);
const slope=new THREE.Mesh(new THREE.PlaneGeometry(slopeLen,Z1-Z0),toon(PAL.blue,{side:THREE.DoubleSide}));
slope.position.set((X0+SLX)/2,(SLY+H)/2,(Z0+Z1)/2); slope.rotation.set(-Math.PI/2,0,slopeAng,"ZYX"); slope.receiveShadow=true; scene.add(slope);
const lowWall=new THREE.Mesh(new THREE.PlaneGeometry(Z1-Z0,SLY),toon(PAL.blue,{side:THREE.DoubleSide})); lowWall.rotation.y=Math.PI/2; lowWall.position.set(X0,SLY/2,(Z0+Z1)/2); lowWall.receiveShadow=true; scene.add(lowWall);
const rightWall=new THREE.Mesh(new THREE.PlaneGeometry(Z1-Z0,H),toon(PAL.wall,{side:THREE.DoubleSide})); rightWall.rotation.y=-Math.PI/2; rightWall.position.set(X1,H/2,(Z0+Z1)/2); rightWall.receiveShadow=true; scene.add(rightWall);
const ceil=new THREE.Mesh(new THREE.PlaneGeometry(X1-SLX,Z1-Z0),toon(PAL.wall,{side:THREE.DoubleSide})); ceil.rotation.x=Math.PI/2; ceil.position.set((SLX+X1)/2,H,(Z0+Z1)/2); scene.add(ceil);

/* ---------- raam & sterrenhemel → heldere ochtend ---------- */
const skyMat=new THREE.ShaderMaterial({
  uniforms:{
    uSkyTop:{value:new THREE.Color("#070f26")},
    uSkyBot:{value:new THREE.Color("#162952")},
    uStars:{value:1},
    uSunGlow:{value:0},
    uTime:{value:0}
  },
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`precision highp float; varying vec2 vUv;
  uniform vec3 uSkyTop, uSkyBot; uniform float uStars, uSunGlow, uTime;
  float h21(vec2 p){ p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+34.23); return fract(p.x*p.y); }
  float starLayer(vec2 uv, vec2 grid, float seed, float sz){
    vec2 g=uv*grid, id=floor(g), f=fract(g)-.5;
    float r=h21(id+seed);
    if(r<.52) return 0.;
    vec2 off=vec2(h21(id+seed+3.1),h21(id+seed+7.7))-.5;
    vec2 d=f-off*.62;
    float dist=length(d);
    float tw=.68+.32*sin(uTime*(1.6+r*3.4)+r*50.);
    float core=smoothstep(sz,sz*.15,dist);
    float glint= r>.88 ? max(smoothstep(.018,.0,abs(d.x))*smoothstep(sz*2.6,.0,abs(d.y)),
                             smoothstep(.018,.0,abs(d.y))*smoothstep(sz*2.6,.0,abs(d.x)))*.75 : 0.;
    return (core+glint)*tw*(.55+.45*fract(r*9.3));
  }
  void main(){
    float y=clamp(vUv.y,0.,1.);
    vec3 col=mix(uSkyBot,uSkyTop,pow(y,.78));
    if(uStars>.005){
      float s1=starLayer(vUv,vec2(26.,16.),1.7,.095);
      float s2=starLayer(vUv,vec2(12.,8.),11.3,.125);
      float st=clamp(s1*.9+s2*1.25,0.,1.4)*uStars;
      /* subtiele maansikkel rechtsboven in het raam */
      vec2 mp=(vUv-vec2(.74,.73))*vec2(2.8,1.8);
      float m1=smoothstep(.16,.145,length(mp));
      float m2=smoothstep(.155,.14,length(mp-vec2(.055,.03)));
      float moon=clamp(m1-m2,0.,1.)*uStars*.92;
      col=mix(col,vec3(1.,.98,.9),clamp(st+moon,0.,1.));
    }
    if(uSunGlow>.005){
      vec2 sp=(vUv-vec2(.66,.68))*vec2(1.6,1.0);
      float g=exp(-length(sp)*2.6)*uSunGlow;
      col+=vec3(1.,.96,.84)*g*.55;
    }
    gl_FragColor=vec4(clamp(col,0.,1.),1.);
  }`
});
const sky=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.8),skyMat); sky.position.set(.45,1.55,Z0-.12); scene.add(sky);

const winG=new THREE.Group(); scene.add(winG);
box(1.7,.07,.14,PAL.white,.45,1.02,Z0+.02,winG); box(1.7,.07,.14,PAL.white,.45,2.08,Z0+.02,winG);
box(.07,1.1,.14,PAL.white,-.38,1.55,Z0+.02,winG); box(.07,1.1,.14,PAL.white,1.28,1.55,Z0+.02,winG);
const sash=new THREE.Group(); sash.position.set(1.25,1.55,Z0+.03); scene.add(sash);
box(.05,.98,.05,PAL.white,-.8,0,0,sash); box(.05,.98,.05,PAL.white,0,0,0,sash); box(.8,.05,.05,PAL.white,-.4,0,0,sash);
box(1.8,.05,.25,PAL.white,.45,.99,Z0+.1);
const rad=new THREE.Group(); scene.add(rad); for(let i=0;i<9;i++) box(.06,.55,.08,PAL.white,1.45+i*.1,.45,Z0+.08,rad);

/* zachte ochtend-zonnestraal door het raam */
const beamMat=new THREE.MeshBasicMaterial({color:"#fff4d4",transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
const sunBeam=new THREE.Group(); scene.add(sunBeam);
{ const b1=new THREE.Mesh(new THREE.PlaneGeometry(1.55,2.3),beamMat);
  b1.position.set(.38,1.12,Z0+.82); b1.rotation.x=-.62; b1.rotation.y=-.08; sunBeam.add(b1); }

/* ---------- meubels ---------- */
/* Tafel (bureau) onder het raam */
box(1.3,.05,.62,PAL.wood,.4,.76,Z0+.36);
for(const [x,z] of [[-.2,.1],[1,.1],[-.2,.62],[1,.62]]) box(.05,.74,.05,PAL.woodD,x,.37,Z0+z);

/* Stoel — links-voor bij de tafel (open houten spijlenrug), camera staat er direct naast */
const chair=new THREE.Group(); chair.position.set(.02,0,Z0+.98); chair.rotation.y=.48; scene.add(chair);
box(.45,.04,.42,PAL.wood,0,.46,0,chair);
for(const [x,z] of [[-.2,-.18],[.2,-.18],[-.2,.18],[.2,.18]]) box(.04,.46,.04,PAL.woodD,x,.23,z,chair);
box(.045,.50,.04,PAL.woodD,-.20,.72,.19,chair);
box(.045,.50,.04,PAL.woodD,.20,.72,.19,chair);
box(.46,.07,.045,PAL.wood,0,.95,.19,chair);
box(.40,.035,.035,PAL.wood,0,.58,.19,chair);
for(let i=-1;i<=1;i++) box(.035,.32,.022,PAL.woodD,i*.10,.76,.19,chair);

/* Bureaulamp op de tafel — brandt bij aanvang in de nacht met warme lichtkring op tafel */
const lampG=new THREE.Group(); lampG.position.set(.04,.79,Z0+.23); lampG.rotation.y=-.35; scene.add(lampG);
cyl(.085,.105,.03,PAL.ink,0,0,0,lampG);
cyl(.013,.013,.35,PAL.ink,0,.18,0,lampG);
const shadeMat=toon(PAL.ochre,{emissive:"#ff9c2a",emissiveIntensity:.85});
const shade=cyl(.052,.115,.13,PAL.ochre,0,.37,.045,lampG,16,shadeMat); shade.rotation.x=.5;
const bulbMat=new THREE.MeshBasicMaterial({color:"#fff4cf"});
const bulb=new THREE.Mesh(new THREE.SphereGeometry(.032,12,10),bulbMat); bulb.position.set(0,.33,.065); lampG.add(bulb);
const lamp=new THREE.PointLight("#ffc466",2.6,2.85,1.65); lamp.position.set(.14,.30,.16); lampG.add(lamp);

/* Ladekast direct links van de tafel (voor Hoofdstuk 2) */
const drawer=new THREE.Group(); drawer.position.set(-.96,0,Z0+.35); scene.add(drawer);
box(.92,.9,.55,PAL.white,0,.45,0,drawer);
for(let i=0;i<3;i++) box(.84,.02,.02,"#b9b5aa",0,.28+i*.24,.28,drawer);

/* Spiegel aan de muur boven de ladekast */
const mirrorFrame=new THREE.Group(); mirrorFrame.position.set(-.96,1.44,Z0+.02); scene.add(mirrorFrame);
box(.56,.68,.03,PAL.woodD,0,0,0,mirrorFrame);
const mirror=new THREE.Mesh(new THREE.PlaneGeometry(.46,.58),new THREE.MeshToonMaterial({color:"#b8c8cc",gradientMap:grad,emissive:"#1e2c36"}));
mirror.position.set(0,0,.02); mirrorFrame.add(mirror);

/* Houten krukje verder naar links in de hoek (voor Hoofdstuk 3) */
const stool=new THREE.Group(); stool.position.set(-1.90,0,-1.70); stool.rotation.y=.25; scene.add(stool);
box(.48,.04,.44,PAL.wood,0,.54,0,stool);
for(const [x,z] of [[-.19,-.17],[.19,-.17],[-.19,.17],[.19,.17]]) box(.04,.54,.04,PAL.woodD,x,.27,z,stool);

/* Klein bijzettafeltje nog verder naar links langs de blauwe muur (voor Hoofdstuk 4) */
const sideTbl=new THREE.Group(); sideTbl.position.set(-2.12,0,-.92); scene.add(sideTbl);
box(.46,.04,.54,PAL.wood,0,.60,0,sideTbl);
for(const [x,z] of [[-.18,-.22],[.18,-.22],[-.18,.22],[.18,.22]]) box(.04,.60,.04,PAL.woodD,x,.30,z,sideTbl);

/* Overige kamer-details (bed rechts, rugzak bij tafelpoot, plant links) */
const bed=new THREE.Group(); bed.position.set(1.85,0,.6); scene.add(bed);
box(1.0,.32,2.1,PAL.white,0,.16,0,bed); box(1.02,.18,2.05,PAL.teal,0,.41,.02,bed); box(.6,.12,.4,PAL.pillow,0,.55,-.8,bed); box(1.0,.6,.06,PAL.white,0,.3,-1.05,bed);
box(.5,.04,.4,PAL.white,1.3,.5,-.85); box(.5,.04,.4,PAL.white,1.3,.22,-.85);
for(const [x,z] of [[1.08,-1.02],[1.52,-1.02],[1.08,-.68],[1.52,-.68]]) box(.035,.52,.035,PAL.white,x,.26,z);

const decorBag=new THREE.Group(); decorBag.position.set(1.12,0,Z0+.62); decorBag.rotation.y=-.45; scene.add(decorBag);
{ const b=sph(.20,PAL.purple,0,.22,0,decorBag); b.scale.set(1,1.22,.7); const p=sph(.13,PAL.purple,0,.15,.11,decorBag); p.scale.set(1,.9,.6); }

cyl(.18,.14,.26,"#e7dccb",-2.15,.13,-.22);
for(let i=0;i<7;i++){ const l=sph(.12,PAL.plant,-2.15+Math.cos(i)*.11,.38+i*.03,-.22+Math.sin(i*2)*.11); l.scale.set(1.3,.5,.8); l.rotation.z=i; }

/* ---------- vier dingen, vier hoofdstukken (tafel → steeds verder naar links) ---------- */
const items=[];
function item(ch,name,line,group,cy=.08,cscale=.52){ group.userData={ch,name,line,cy,cscale}; items.push(group); scene.add(group); return group; }

/* 1. Op de tafel: Het paspoort (Hoofdstuk 1 · Schiphol) */
const passport=new THREE.Group(); passport.position.set(.48,.788,Z0+.50); passport.rotation.y=.26;
{
  box(.22,.010,.30,PAL.navy,0,.005,0,passport);
  box(.208,.014,.286,"#f3eee0",0,.014,.003,passport);
  box(.222,.008,.302,PAL.navy,0,.024,0,passport);
  /* gouden embleem + lijntjes op het omslag */
  cyl(.036,.036,.004,PAL.ochre,0,.030,-.015,passport,16);
  box(.11,.003,.012,PAL.ochre,0,.030,-.085,passport);
  box(.09,.003,.010,PAL.ochre,0,.030,.075,passport);
  /* instapkaart-strookje dat uitsteekt */
  const bp=box(.11,.004,.075,"#f7f4eb",.035,.016,-.105,passport); bp.rotation.y=-.16;
  box(.11,.005,.016,PAL.ochre,.035,.017,-.135,passport).rotation.y=-.16;
}
item(1,"Het paspoort","“The air was heavy with stories I didn't want to tell.”",passport,.03,.48);

/* 2. Links van de tafel (op de ladekast): De telefoon (Hoofdstuk 2 · The AZC) */
const phone=new THREE.Group(); phone.position.set(-.82,.90,Z0+.46); phone.rotation.y=.34;
{
  box(.25,.08,.19,PAL.ochre,0,.04,0,phone);
  const r=box(.27,.05,.075,PAL.ochre,0,.12,-.02,phone); r.rotation.x=.08;
  const d=cyl(.052,.052,.012,PAL.ink,0,.085,.042,phone); d.rotation.x=.45;
}
item(2,"De telefoon","“For a moment, Mom's voice felt like home.”",phone,.08,.52);

/* 3. Verder naar links (op het houten krukje): De duif (Hoofdstuk 3 · Amsterdam) */
const birdBox=new THREE.Group(); birdBox.position.set(-1.88,.56,-1.70); birdBox.rotation.y=.72;
{
  box(.34,.12,.23,"#c49a6c",0,.06,0,birdBox);
  box(.29,.02,.18,PAL.mint,0,.11,0,birdBox);
  const body=sph(.072,"#f4f2ec",0,.175,0,birdBox); body.scale.set(1.42,1,1);
  sph(.046,"#f4f2ec",-.082,.225,0,birdBox);
  const tail=cyl(0,.042,.10,"#dcdad2",.11,.185,0,birdBox); tail.rotation.z=-1.2;
  const bk=cyl(0,.013,.032,PAL.ochre,-.132,.225,0,birdBox); bk.rotation.z=1.57;
}
item(3,"De duif","“I found a wounded little creature, fragile and still.”",birdBox,.14,.56);

/* 4. Nog verder naar links (op het bijzettafeltje langs de blauwe muur): De brief (Hoofdstuk 4 · The Letter) */
const letter=new THREE.Group(); letter.position.set(-2.06,.622,-.92); letter.rotation.y=1.18;
{
  const sheet=box(.31,.006,.21,"#ebe6d8",-.015,.003,.015,letter); sheet.rotation.y=-.16;
  box(.32,.012,.21,"#f6f3ea",0,.012,0,letter);
  box(.055,.014,.065,PAL.red,.105,.015,-.055,letter);
  box(.09,.014,.022,PAL.blue,-.095,.015,-.065,letter);
  box(.15,.013,.045,"#cad2d6",-.04,.015,.035,letter);
}
item(4,"De brief","“That day I had received a letter from the IND.”",letter,.03,.48);

mirror.userData={extra:"mirror",name:"De spiegel",line:"Wie kijkt er terug?"}; items.push(mirror);
sky.userData={extra:"window",name:"Het raam",line:"Het is nacht.",cy:0,cscale:1.45}; items.push(sky);

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
  const s=.24+i*.19;
  m.position.set(X0+(SLX-X0)*s+.02,SLY+(H-SLY)*s-.02,Z0+.55+i*.48);
  m.rotation.copy(slope.rotation); m.translateZ(-.012); m.rotateX(Math.PI); m.rotateZ((i%2?-1:1)*.08);
  m.receiveShadow=true; scene.add(m); pages.push(m);
}

/* ---------- licht: nacht (lamp aan + sterren) → heldere ochtend ---------- */
const amb=new THREE.HemisphereLight("#2c3b63","#1d1820",.74); scene.add(amb);
const sun=new THREE.DirectionalLight("#6b8cc7",.52); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:20}); sun.shadow.bias=-.0015;
scene.add(sun); scene.add(sun.target); sun.target.position.set(0,.4,-1.6);

const TOD=[
  /* 0: Start — Nacht, bureaulamp aan (warme kring op tafel), sterren aan de hemel */
  {sun:"#4b6ba6",si:.32,sp:[1.4,4.2,-6.5],amb:"#1c2b50",gnd:"#141112",ai:.56,skyT:"#060d22",skyB:"#14264e",stars:1.0,lamp:2.65,glow:0,beam:0},
  /* 1: Na H1 — Diep in de nacht, sterren nog helder, lamp warm */
  {sun:"#5c7eb8",si:.42,sp:[1.2,4.0,-6.5],amb:"#263862",gnd:"#191616",ai:.66,skyT:"#0a1533",skyB:"#1d3564",stars:.82,lamp:2.45,glow:0,beam:0},
  /* 2: Na H2 — Vroege schemering, sterren vervagen */
  {sun:"#84a8da",si:.80,sp:[1.0,3.2,-6.5],amb:"#495e88",gnd:"#28231e",ai:.88,skyT:"#1c3362",skyB:"#5672a0",stars:.30,lamp:1.75,glow:.08,beam:0},
  /* 3: Na H3 — Dageraad, eerste gouden ochtendgloren */
  {sun:"#ffc082",si:1.80,sp:[.85,2.4,-6.2],amb:"#c6b5bf",gnd:"#5e5043",ai:1.25,skyT:"#6aa2da",skyB:"#f7be8c",stars:0,lamp:.55,glow:.45,beam:.11},
  /* 4: Verhaal voltooid — Heldere, stralende ochtend */
  {sun:"#fff8e5",si:3.30,sp:[.75,3.1,-5.8],amb:"#fffdf4",gnd:"#e4d8c4",ai:1.82,skyT:"#8ed0ff",skyB:"#fff9e8",stars:0,lamp:0,glow:1.0,beam:.26}
];
let tod=0, todTarget=0;
const _c1=new THREE.Color(),_c2=new THREE.Color();
function applyTod(v){
  const i=Math.min(3,Math.floor(v)), f=v-i, a=TOD[i], b=TOD[Math.min(4,i+1)];
  const mixc=(p,q)=>_c1.set(p).lerp(_c2.set(q),f).clone();
  const lerp=(p,q)=>p+(q-p)*f;
  sun.color.copy(mixc(a.sun,b.sun)); sun.intensity=lerp(a.si,b.si);
  sun.position.set(...a.sp.map((x,k)=>x+(b.sp[k]-x)*f));
  amb.color.copy(mixc(a.amb,b.amb)); amb.groundColor.copy(mixc(a.gnd,b.gnd)); amb.intensity=lerp(a.ai,b.ai);
  skyMat.uniforms.uSkyTop.value.copy(mixc(a.skyT,b.skyT));
  skyMat.uniforms.uSkyBot.value.copy(mixc(a.skyB,b.skyB));
  skyMat.uniforms.uStars.value=lerp(a.stars,b.stars);
  skyMat.uniforms.uSunGlow.value=lerp(a.glow,b.glow);
  const li=lerp(a.lamp,b.lamp); lamp.intensity=li;
  const lf=Math.min(1,li/3.0);
  shadeMat.emissiveIntensity=lf*.8;
  bulbMat.color.copy(_c1.set("#b9b3a4").lerp(_c2.set("#fff5d4"),lf));
  beamMat.opacity=lerp(a.beam,b.beam);
  post.uniforms.uMorning.value=Math.max(0,Math.min(1,(v-2.2)/1.8));
}

/* ---------- nabewerking (géén camera-vignet!) ---------- */
const rtC=new THREE.WebGLRenderTarget(1,1,{depthTexture:new THREE.DepthTexture(1,1),samples:0});
const rtN=new THREE.WebGLRenderTarget(1,1);
const normalMat=new THREE.MeshNormalMaterial();
const post=new THREE.ShaderMaterial({
  uniforms:{tC:{value:rtC.texture},tN:{value:rtN.texture},tD:{value:rtC.depthTexture},uRes:{value:new THREE.Vector2()},uTime:{value:0},uNear:{value:camera.near},uFar:{value:camera.far},uMorning:{value:0},uFlash:{value:0},uDpr:{value:DPR}},
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader:`precision highp float; varying vec2 vUv;
  uniform sampler2D tC,tN,tD; uniform vec2 uRes; uniform float uTime,uNear,uFar,uMorning,uFlash,uDpr;
  ${LD.GLSL.noise}${LD.GLSL.ink}
  float lin(float d){ float z=d*2.-1.; return 2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear)); }
  float D(vec2 uv){ return lin(texture2D(tD,uv).r); }
  vec3 N(vec2 uv){ return texture2D(tN,uv).rgb*2.-1.; }
  void main(){
    vec2 px=vUv*uRes; float boil=floor(uTime*8.);
    vec2 j=(vec2(vnoise(px*.03+boil),vnoise(px*.03+boil+5.))-.5)*2.5/uRes;
    vec2 uv=vUv+j, e=1.25*uDpr/uRes;
    float d0=D(uv);
    float dd=abs(D(uv+vec2(e.x,0))-D(uv-vec2(e.x,0)))+abs(D(uv+vec2(0,e.y))-D(uv-vec2(0,e.y)));
    vec3 n0=N(uv);
    float nd=length(N(uv+vec2(e.x,0))-N(uv-vec2(e.x,0)))+length(N(uv+vec2(0,e.y))-N(uv-vec2(0,e.y)));
    float edge=max(smoothstep(.06,.14,dd/d0),smoothstep(.45,.9,nd));
    edge*=.55+.45*smoothstep(.2,.6,vnoise(px*.08+boil*3.));
    vec2 mis=vec2(1.8,-1.2)*uDpr/uRes;
    vec3 c=texture2D(tC,vUv+mis).rgb;
    c=pow(c,vec3(1./2.2));
    c=mix(c,c*1.16+vec3(.035,.032,.022),uMorning);
    float L=dot(c,vec3(.299,.587,.114));
    c=mix(c,floor(c*6.+.5)/6.,.32);
    c*=mix(markerTex(px/uDpr),1.,.22*uMorning);
    float hm=mix(1.,.42,uMorning);
    float h1=hatch(px/uDpr,smoothstep(.34,.06,L)*.75,.75,7.)*hm;
    float h2=hatch(px/uDpr,smoothstep(.15,.02,L)*.75,-.8,6.)*hm;
    vec3 ink=vec3(.07,.06,.05);
    vec3 col=paperCol(px/uDpr,c);
    col=mix(col,ink,clamp(edge*.92+h1*.28+h2*.34,0.,1.));
    col=mix(col,vec3(1.,.98,.94),uFlash);
    gl_FragColor=vec4(clamp(col,0.,1.),1.);
  }`});
const postScene=new THREE.Scene(), postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),post));

function resize(){
  const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov=w/h<1?78:62; camera.updateProjectionMatrix();
  const W=Math.floor(w*DPR),Hh=Math.floor(h*DPR); rtC.setSize(W,Hh); rtN.setSize(W,Hh); post.uniforms.uRes.value.set(W,Hh);
}
addEventListener("resize",resize); resize();

/* ---------- stiftcirkel ---------- */
const circCv=document.createElement("canvas"); circCv.width=circCv.height=256;
function drawCircle(p){ const g=circCv.getContext("2d"); g.clearRect(0,0,256,256); g.lineCap="round";
  const stroke=(col,w,al,sh)=>{ g.strokeStyle=col; g.lineWidth=w; g.globalAlpha=al; g.beginPath(); const end=Math.PI*2.15*p;
    for(let a=0;a<=end;a+=.05){ const r=100+Math.sin(a*2+sh)*6+a*2.5; const x=128+Math.cos(a-1.9)*r, y=128+Math.sin(a-1.9)*r*.84; a?g.lineTo(x,y):g.moveTo(x,y); } g.stroke(); };
  stroke("#14110d",13,.45,0);
  stroke("#D6A93E",8.5,.75,0);
  stroke("#ffe694",4.2,.95,1);
  circTex.needsUpdate=true; }
const circTex=new THREE.CanvasTexture(circCv);
const circ=new THREE.Sprite(new THREE.SpriteMaterial({map:circTex,depthTest:false,transparent:true})); circ.renderOrder=99; circ.scale.setScalar(.52); scene.add(circ);
let circP=0, circFor=null;

/* ---------- camera naast de stoel + pan naar links ---------- */
const camBase=new THREE.Vector3(.58,1.22,-.58);
const lookAt=new THREE.Vector3(.38,1.06,-2.15);
const YAW_MIN=-1.48, YAW_MAX=.34;
/* Kijkrichting per voortgangsstap: tafel (H1) → links naar H2 → verder links naar H3 → H4 → terug naar het ochtendraam */
const STEP_YAW=[-.06,-.66,-1.05,-1.28,-.04];

const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(-9,-9);
const look={yaw:-.06,pitch:0,ty:-.06,tp:0}; let hover=null, busy=false, dive=null, endPhase=0, mouseX=0, pan=-.06;
const coarse=matchMedia("(hover:none)").matches; let drag=null, velX=0, velY=0;
function itemOf(o){ while(o){ if(items.includes(o)) return o; o=o.parent; } return null; }
function pick(){ ray.setFromCamera(ndc,camera); const h=ray.intersectObjects(scene.children,true); for(const x of h){ if(x.object===circ||x.object.parent===sunBeam) continue; const it=itemOf(x.object); if(it) return it; return null; } return null; }
function status(it){ const u=it.userData; if(u.extra) return u.extra==="window"?(st.count===4?"next":"extra"):"extra"; if(st.has(u.ch)) return "seen"; return st.next()===u.ch?"next":"locked"; }
function emiss(it,v){ it.traverse(o=>{ if(o.material&&o.material.emissive) o.material.emissive.set(PAL.ochre).multiplyScalar(v); }); }

cv.addEventListener("pointermove",e=>{
  ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
  if(drag){
    const dx=-(e.clientX-drag[0])/innerWidth*2.2, dy=(e.clientY-drag[1])/innerHeight*1.0;
    pan=Math.max(YAW_MIN,Math.min(YAW_MAX,pan+dx));
    look.ty=pan;
    look.tp=Math.max(-.32,Math.min(.35,look.tp+dy));
    velX=dx*.35; velY=dy*.35;
    drag=[e.clientX,e.clientY];
    return;
  }
  if(!coarse){ mouseX=ndc.x; look.tp=ndc.y*.20; }
  const it=busy?null:pick();
  if(hover&&hover!==it&&hover!==mirror) emiss(hover,0);
  hover=it; cv.style.cursor=it?"pointer":"default"; if(it&&it.userData.ch&&st.has(it.userData.ch)) LD.prepareChapter(it.userData.ch);
  if(it){ const u=it.userData, s=status(it); if(it!==mirror) emiss(it,s==="locked"?.0:.35);
    const C=u.ch&&LD.CHAPTERS[u.ch-1];
    LD.tag(u.extra?u.name:s==="next"?`<em>Hoofdstuk ${u.ch}</em> · ${C.title}`:s==="seen"?`Opnieuw · ${C.title}`:`${u.name} · <em>nog niet</em>`,e.clientX,e.clientY);
  } else LD.tag(null);
});
cv.addEventListener("pointerdown",e=>{
  down=[e.clientX,e.clientY];
  drag=[e.clientX,e.clientY]; velX=velY=0;
});
addEventListener("pointerup",()=>{ drag=null; });
let down=null;
cv.addEventListener("click",e=>{
  if(busy||(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>14)) return;
  ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
  const it=pick(); if(!it) return; const u=it.userData, s=status(it);
  if(u.extra==="mirror"){ LD.hint(st.count<4?"In de spiegel zie je alleen de kamer. Nog niet wie hier woont.":"Een jongen die thuiskomt.","De spiegel",3500); return; }
  if(u.extra==="window"){
    if(st.count===4) return ending();
    LD.hint([
      "Het is nacht. Buiten staan de sterren.",
      "Diep in de nacht. Alleen de bureaulamp brandt.",
      "De nacht loopt op zijn eind. De sterren vervagen.",
      "De eerste ochtendschemering kleurt de lucht."
    ][st.count],null,3000);
    return;
  }
  if(s==="locked"){ LD.tag(`${u.name} · <em>nog niet</em>`,e.clientX,e.clientY,2200); LD.hint("Nog niet. Eerst iets anders in de kamer.",null,3000); return; }
  busy=true; LD.tag(null); emiss(it,0); LD.hint(u.line,"Hoofdstuk "+u.ch,2400);
  const p=new THREE.Vector3(); it.getWorldPosition(p);
  const dir=camBase.clone().sub(p); dir.y=0; if(dir.lengthSq()<.001) dir.set(0,0,1); else dir.normalize();
  const tp=p.clone().addScaledVector(dir,.70).add(new THREE.Vector3(0,.36,0));
  dive={t:0,p,tp};
  LD.openChapter(u.ch,{approach:()=>dive&&dive.t>=1,target:()=>({renderer,scene,camera,root:it}),onClose:(ch,seen)=>{
    busy=false; dive=null;
    if(seen&&!st.has(ch)){ st.mark(ch); hudUi.update(); onProgress(true); }
  }});
});

/* ---------- voortgang ---------- */
function focusStep(instant){
  const c=Math.min(4,st.count), y=STEP_YAW[c];
  pan=y; look.ty=y;
  if(instant){ look.yaw=y; }
}
function onProgress(anim){
  const c=st.count; todTarget=c; if(!anim) tod=c;
  focusStep(!anim);
  pages.forEach((m,i)=>{ const on=st.has(i+1); if(m.userData.on!==on){ m.userData.on=on; m.material.map=pageTex(i+1,on); m.material.needsUpdate=true; } });
  LD.prepareChapter(st.next());
  const nx=st.next(); circFor=nx?items.find(i=>i.userData.ch===nx):(c===4?sky:null); circP=0;
  items.forEach(it=>{ const ch=it.userData.ch; if(!ch) return; const on=st.has(ch)||nx===ch;
    if(on&&!it.visible&&anim){ it.visible=true; it.scale.setScalar(.01); const t0=performance.now(); (function grow(){ const p=Math.min(1,(performance.now()-t0)/900); it.scale.setScalar(.01+.99*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(grow); })(); }
    else it.visible=on; });
  if(anim){
    setTimeout(()=>LD.hint(
      c===4?"Het is helder ochtend geworden. Doe het raam open.":
      ["","Diep in de nacht. Links van de tafel ligt nog iets.","De sterren vervagen. Verder naar links wacht nog iets.","De lucht wordt licht. Nog één herinnering in de kamer."][c],
      c===4?"Ochtend":"Er ligt nog iets",4500),1400);
  }
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
  const nx=st.next(); setTimeout(()=>LD.hint(nx?"Op tafel ligt een paspoort bij de lamp.":"Het is helder ochtend geworden. Doe het raam open.",nx?"Hoofdstuk "+nx:"Ochtend",5000),900); };
document.getElementById("go").click();

/* ---------- loop ---------- */
const clock=new THREE.Clock();
function frame(){
  const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime;
  tod+=(todTarget-tod)*Math.min(1,dt*.65); applyTod(tod);
  skyMat.uniforms.uTime.value=t;
  if(!coarse&&!drag&&!busy){ const ax=Math.abs(mouseX), edge=ax>.42?Math.sign(mouseX)*Math.pow((ax-.42)/.58,1.5):0;
    pan=Math.max(YAW_MIN,Math.min(YAW_MAX,pan+edge*dt*1.5)); look.ty=Math.max(YAW_MIN,Math.min(YAW_MAX,pan+mouseX*.18)); }
  else if(coarse&&!drag&&!busy){
    velX*=.9; velY*=.9;
    pan=Math.max(YAW_MIN,Math.min(YAW_MAX,pan+velX));
    look.ty=pan;
    look.tp=Math.max(-.32,Math.min(.35,look.tp+velY));
  }
  look.yaw+=(look.ty-look.yaw)*Math.min(1,dt*3); look.pitch+=(look.tp-look.pitch)*Math.min(1,dt*3);
  const L=new THREE.Vector3(camBase.x+Math.sin(look.yaw)*2.2,camBase.y-.24+look.pitch*1.8,camBase.z-Math.cos(look.yaw)*2.2);
  let P=camBase.clone(); P.y+=Math.sin(t*.5)*.008;
  if(dive){ dive.t=Math.min(1,dive.t+dt*1.8); const e=dive.t*dive.t*(3-2*dive.t); P.lerp(dive.tp,e); L.lerp(dive.p,e); }
  lookAt.copy(L); camera.position.copy(P); camera.lookAt(L);
  items.forEach(it=>{ if(it===hover||it===mirror||it===sky) return; emiss(it,it===circFor&&!busy?(.12+.1*Math.sin(t*3)):0); });
  if(circFor&&!busy){
    circP=Math.min(1,circP+dt*.8);
    if(Math.floor(t*8)!==circ.userData.f){ circ.userData.f=Math.floor(t*8); drawCircle(circP); }
    const p=new THREE.Vector3(); circFor.getWorldPosition(p);
    const cy=circFor.userData.cy??.08, cs=circFor.userData.cscale??.52;
    circ.position.copy(p).add(new THREE.Vector3(0,cy,0)); circ.scale.setScalar(cs); circ.visible=true;
  } else circ.visible=false;
  birdBox.children[2].position.y=.175+Math.abs(Math.sin(t*2))*.005;
  post.uniforms.uTime.value=t;
  const cvis=circ.visible, bvis=sunBeam.visible;
  circ.visible=false; sunBeam.visible=false; scene.overrideMaterial=normalMat;
  renderer.setRenderTarget(rtN); renderer.setClearColor(0x8080ff); renderer.render(scene,camera);
  scene.overrideMaterial=null; circ.visible=cvis; sunBeam.visible=bvis;
  renderer.setRenderTarget(rtC); renderer.setClearColor(0x000000); renderer.render(scene,camera);
  renderer.setRenderTarget(null); renderer.render(postScene,postCam);
  requestAnimationFrame(frame);
}
frame();
})();
