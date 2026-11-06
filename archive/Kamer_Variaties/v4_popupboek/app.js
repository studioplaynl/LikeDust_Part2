/* Variatie 4 · Het pop-upboek. */
(function(){
"use strict";
const st=LD.state("v4");
const A=LD_ASSETS.room, IW=A.w, IH=A.h;
const cv=document.getElementById("gl");
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(); scene.background=new THREE.Color("#0b0907");
const camera=new THREE.PerspectiveCamera(38,1,.1,100);

/* ---------- licht en tafel ---------- */
scene.add(new THREE.HemisphereLight("#d8cbb0","#20180f",.9));
const lampL=new THREE.DirectionalLight("#ffe2b0",2.2); lampL.position.set(-4,9,5); lampL.castShadow=true; lampL.shadow.mapSize.set(2048,2048);
Object.assign(lampL.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:1,far:30}); lampL.shadow.bias=-.0008; scene.add(lampL);
const tableTex=(()=>{ const c=document.createElement("canvas"); c.width=c.height=512; const g=c.getContext("2d"); g.fillStyle="#2a1d12"; g.fillRect(0,0,512,512);
  for(let i=0;i<220;i++){ g.strokeStyle=`rgba(${60+Math.random()*40},${38+Math.random()*25},${20},${.25+Math.random()*.3})`; g.lineWidth=1+Math.random()*3; g.beginPath(); const y=Math.random()*512; g.moveTo(0,y); g.bezierCurveTo(170,y+Math.random()*20-10,340,y+Math.random()*20-10,512,y+Math.random()*16-8); g.stroke(); }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,3); return t; })();
const table=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshStandardMaterial({map:tableTex,roughness:.8})); table.rotation.x=-Math.PI/2; table.position.y=-.12; table.receiveShadow=true; scene.add(table);

/* ---------- pagina's tekenen (canvas) ---------- */
const PW=4, PH=5.4, CW=900, CH=Math.round(900*PH/PW);
/* waterverfvlek: dunne lagen pigment met een donkere droogrand, multiply op het papier */
function wcBlob(g,x,y,r,hex,a=.2){
  g.save(); g.globalCompositeOperation="multiply";
  const shape=(rr,ph)=>{ g.beginPath(); for(let k=0;k<=60;k++){ const t=k/60*6.283; const w=1+.14*Math.sin(t*3+ph)+.08*Math.sin(t*7+ph*2)+.04*Math.sin(t*17+ph); const px=x+Math.cos(t)*rr*w, py=y+Math.sin(t)*rr*w*.85; k?g.lineTo(px,py):g.moveTo(px,py); } g.closePath(); };
  const ph=x*.013+y*.007;
  for(let i=0;i<7;i++){ shape(r*(.55+i*.07),ph+i*.6); g.globalAlpha=a*.35; g.fillStyle=hex; g.filter="blur("+(3+i*1.5)+"px)"; g.fill(); }
  g.filter="blur(1.2px)"; shape(r,ph+4.2); g.globalAlpha=a*.9; g.strokeStyle=hex; g.lineWidth=3; g.stroke();   // droogrand
  g.restore();
}
function paperCanvas(dark){
  const c=document.createElement("canvas"); c.width=CW; c.height=CH; const g=c.getContext("2d");
  g.fillStyle=dark?"#15120e":"#ece5d3"; g.fillRect(0,0,CW,CH);
  const id=g.getImageData(0,0,CW,CH), d=id.data; for(let i=0;i<d.length;i+=4){ const n=(Math.random()-.5)*(dark?10:14); d[i]+=n; d[i+1]+=n; d[i+2]+=n; } g.putImageData(id,0,0);
  if(!dark){ const gr=g.createRadialGradient(CW/2,CH/2,CH*.2,CW/2,CH/2,CH*.75); gr.addColorStop(0,"rgba(0,0,0,0)"); gr.addColorStop(1,"rgba(90,60,20,.18)"); g.fillStyle=gr; g.fillRect(0,0,CW,CH); }
  return [c,g];
}
function wrapText(g,text,x,y,maxW,lh){ const words=text.split(" "); let line=""; for(const w of words){ const t=line?line+" "+w:w; if(g.measureText(t).width>maxW&&line){ g.fillText(line,x,y); y+=lh; line=w; } else line=t; } g.fillText(line,x,y); return y; }
function texOf(c,flip){ const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; if(flip){ t.center.set(.5,.5); t.rotation=Math.PI; } return t; }
const DISPLAY="'Big Shoulders Display', Impact, sans-serif", BODY="Literata, Georgia, serif";
function pCover(){ const [c,g]=paperCanvas(true);
  g.strokeStyle="#D6A93E"; g.lineWidth=3; g.strokeRect(50,50,CW-100,CH-100);
  g.fillStyle="#D6A93E"; g.font=`500 30px ${DISPLAY}`; g.textAlign="center"; g.fillText("SAM YAZDANPANNA",CW/2,190);
  g.fillStyle="#ece8de"; g.font=`800 132px ${DISPLAY}`; ["WE ALL","BREATHE","THE SAME","AIR"].forEach((l,i)=>g.fillText(l,CW/2,420+i*128));
  g.fillStyle="#D6A93E"; g.font=`700 34px ${DISPLAY}`; g.fillText("LIKE DUST · DEEL 2",CW/2,CH-170); return texOf(c); }
function pText(eye,title,line,sub,col){ const [c,g]=paperCanvas(false);
  wcBlob(g,CW*.8,CH*.17,120,col,.3);
  g.fillStyle="#8a5d10"; g.font=`600 30px ${DISPLAY}`; g.fillText(eye.toUpperCase(),90,200);
  g.fillStyle="#16130f"; g.font=`800 120px ${DISPLAY}`; let y=wrapText(g,title.toUpperCase(),86,320,CW-170,112);
  g.strokeStyle=col; g.lineWidth=10; g.lineCap="round"; g.beginPath(); g.moveTo(90,y+50); for(let x=90;x<420;x+=20) g.lineTo(x,y+50+Math.sin(x*.07)*4); g.stroke();
  g.fillStyle="#2a2620"; g.font=`italic 400 44px ${BODY}`; y=wrapText(g,line,90,y+160,CW-180,62);
  if(sub){ g.fillStyle="#6a6458"; g.font=`400 30px ${BODY}`; wrapText(g,sub,90,CH-200,CW-180,44); }
  return texOf(c,true); }
function pBase(col,ground){ const [c,g]=paperCanvas(false);
  if(ground){ g.strokeStyle="rgba(22,19,15,.55)"; g.lineWidth=3; for(let i=0;i<14;i++){ g.beginPath(); const y=CH*.18+i*CH*.05+Math.random()*8; g.moveTo(60+Math.random()*40,y); g.lineTo(CW-60-Math.random()*40,y+Math.random()*10-5); g.stroke(); } }
  if(col) wcBlob(g,CW*.86,CH*.9,70,col,.22); return texOf(c); }

/* ---------- uitgesneden karton met inkt-shader ---------- */
const cutVS=`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const cutFS=`precision highp float; varying vec2 vUv;
uniform sampler2D map; uniform vec2 texSize; uniform float uColor,uGlow,uTime,uPad,uSeed;
${LD.GLSL.noise}${LD.GLSL.ink}
float lum(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
vec4 tx(vec2 uv){ if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.) return vec4(0); return texture2D(map,uv); }
void main(){
  vec2 uv=(vUv-.5)*uPad+.5; vec4 c=tx(uv); vec2 e=1.5/texSize;
  float gx=lum(tx(uv+vec2(e.x,0)).rgb)-lum(tx(uv-vec2(e.x,0)).rgb), gy=lum(tx(uv+vec2(0,e.y)).rgb)-lum(tx(uv-vec2(0,e.y)).rgb);
  float edge=smoothstep(.05,.22,length(vec2(gx,gy)));
  // witte snijrand rond de vorm (zoals uitgeknipt karton), met een inktlijn erom
  float r1=0.,r2=0.; for(int i=0;i<12;i++){ float a=float(i)*.5236; vec2 o=vec2(cos(a),sin(a)); r1=max(r1,tx(uv+o*e*5.).a); r2=max(r2,tx(uv+o*e*8.).a); }
  float card=max(c.a,r1); float outline=clamp(r2-r1,0.,1.);
  vec2 px=gl_FragCoord.xy;
  vec3 paper=paperCol(px,vec3(.93,.9,.83));
  // schets: inktlijnen + arcering op het papier
  float dark=1.-lum(c.rgb);
  vec3 sketch=mix(paper,vec3(.09,.08,.07),clamp(edge*c.a*1.2+hatch(px,dark*.5*c.a,.8,6.)*.5,0.,1.));
  // inkleuren als waterverf
  float asp=texSize.x/texSize.y;
  vec2 w=wash((uv-.5)*vec2(asp,1.)/max(asp,1.)*1.6,uColor,uSeed);
  float m=w.x*c.a, rim=w.y*c.a;
  vec3 pig=mix(vec3(1.),c.rgb*1.12,.92*granul(px,uSeed));     // verf werkt als filter op het papier
  vec3 col=sketch*mix(vec3(1.),pig,m)*(1.-rim*.25);
  col=mix(col,c.rgb*(1.-edge*.25),m*.45);                     // in de kern dekt hij meer
  col=mix(col,vec3(.09,.08,.07),outline*.9);
  col=mix(col,vec3(.84,.66,.24),outline*uGlow);
  float alpha=max(card,outline*.95);
  if(alpha<.5) discard;
  gl_FragColor=vec4(col,1.);
}`;
function cutout(src,w,h,pxW,pxH,opts={}){
  const t=LD.tex(src), PAD=1.12;
  const mat=new THREE.ShaderMaterial({vertexShader:cutVS,fragmentShader:cutFS,side:THREE.DoubleSide,
    uniforms:{map:{value:t},texSize:{value:new THREE.Vector2(pxW,pxH)},uColor:{value:opts.color??0},uGlow:{value:0},uTime:{value:0},uPad:{value:PAD},uSeed:{value:Math.random()*20}}});
  const geo=new THREE.PlaneGeometry(w*PAD,h*PAD); geo.translate(0,h*PAD/2,0);
  const m=new THREE.Mesh(geo,mat); m.castShadow=true;
  m.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:t,alphaTest:.5});
  const pivot=new THREE.Group(); pivot.add(m); pivot.userData.mesh=m; return pivot;
}
function card(src,w,h){ // de achterwand: hele rechthoek, met dikke rand
  const t=LD.tex(src); const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h).translate(0,h/2,0),new THREE.MeshStandardMaterial({map:t,roughness:1,side:THREE.DoubleSide}));
  m.castShadow=true; const pivot=new THREE.Group(); pivot.add(m); pivot.userData.mesh=m; return pivot; }

/* ---------- het boek ---------- */
const book=new THREE.Group(); scene.add(book);
const boardMat=new THREE.MeshStandardMaterial({color:"#1b1610",roughness:.7});
const boardL=new THREE.Mesh(new THREE.BoxGeometry(PW+.15,.08,PH+.2),boardMat); boardL.position.set(-PW/2,-.06,0); boardL.receiveShadow=true; book.add(boardL);
const boardR=boardL.clone(); boardR.position.x=PW/2; book.add(boardR);
const block=new THREE.Mesh(new THREE.BoxGeometry(PW,.08,PH),new THREE.MeshStandardMaterial({color:"#e6dcc6",roughness:1})); block.position.set(PW/2,-.01,0); block.receiveShadow=true; book.add(block);

const leaves=[]; const NL=7;
function leaf(front,back,thick=.006){
  const g=new THREE.Group(); book.add(g);
  const f=new THREE.Mesh(new THREE.PlaneGeometry(PW,PH),new THREE.MeshStandardMaterial({map:front,roughness:1})); f.rotation.x=-Math.PI/2; f.position.set(PW/2,thick,0); f.receiveShadow=true; f.castShadow=true; g.add(f);
  const b=new THREE.Mesh(new THREE.PlaneGeometry(PW,PH),new THREE.MeshStandardMaterial({map:back,roughness:1})); b.rotation.x=Math.PI/2; b.position.set(PW/2,-thick*0,0); b.receiveShadow=true; g.add(b);
  const L={g,front:f,back:b,theta:0,target:0,pops:[]}; leaves.push(L); return L;
}
function pop(L,obj,x,z,stand=1){ obj.position.set(x,.008+L.pops.length*.006,z); obj.userData.base=stand; L.g.add(obj); L.pops.push(obj); return obj; }

/* ---------- inhoud per spread ---------- */
const OBJ=[ // per hoofdstuk het ding dat omhoog klapt
  {ch:1,layer:"passport",scale:2.2,line:"“Passport, please…” Welcome to freedom, I thought. But even freedom has its guards.",sub:"Schiphol, 1997"},
  {ch:2,layer:"frame",scale:2.6,line:"“For a moment, Mom's voice felt like home. Then the distance tore through me.”",sub:"Het AZC"},
  {ch:3,layer:"bicycle",scale:3.3,line:"“Taking in every little thing this city had to offer. Remembering what freedom tasted like.”",sub:"Amsterdam"},
  {ch:4,layer:"letter",scale:2.6,line:"“I tried to be cheerful, but that day I had received a letter from the IND.”",sub:"De brief"}
];
const clickables=[]; let roomPops={}, finalPops={};
function layerCut(name,worldW,opts){ const L=A.layers[name]; const w=worldW, h=worldW*L.h/L.w; const c=cutout(L.src,w,h,L.w,L.h,opts); c.userData.name=name; return c; }

async function build(){
  try{ await Promise.all([document.fonts.load(`800 120px "Big Shoulders Display"`),document.fonts.load(`italic 400 44px Literata`),document.fonts.load(`600 30px "Big Shoulders Display"`)]); }catch(_){}
  // blad 0: omslag / binnenkant omslag
  leaf(pCover(),pText("We All Breathe The Same Air","De kamer","Elk ding in deze kamer draagt een hoofdstuk. Sla de bladzijde om en het klapt omhoog.","Wat je nog niet zag, is alleen een inktschets.","#D6A93E"),.05);
  // de voorplat draait mee met de omslag (zo ligt er geen losse linkerplank naast een dicht boek)
  book.remove(boardL); boardL.position.set(PW/2,-.05,0); leaves[0].g.add(boardL);
  // blad 1: de kamer als pop-up / hoofdstuk 1 tekst
  const L1=leaf(pBase("#D6A93E",true),pText("Hoofdstuk 1","Schiphol",OBJ[0].line,OBJ[0].sub,"#D6A93E"));
  { const wall=card(A.bg,3.7,3.7*IH/IW); pop(L1,wall,PW/2,-1.55); wall.userData.wall=true;
    const s=3.7/IW; const at=(n,z,extra=1)=>{ const l=A.layers[n]; const c=layerCut(n,l.w*s*extra); pop(L1,c,PW/2+((l.x+l.w/2)/IW-.5)*3.7,z); roomPops[n]=c; return c; };
    at("bicycle",-1.1,1.3); at("sam",-.7,1.3); at("bird",-.9,1.5); at("letter",-.3,1.9); at("frame",.2,1.6); at("passport",.75,1.9);
    for(const n of ["passport","frame","bicycle","letter"]) clickables.push(roomPops[n]); }
  // bladen 2–5: per hoofdstuk het ding / tekst volgend hoofdstuk
  OBJ.forEach((o,i)=>{
    const nx=OBJ[i+1];
    const L=leaf(pBase(LD.CHAPTERS[o.ch-1].color,false), nx?pText("Hoofdstuk "+nx.ch,LD.CHAPTERS[nx.ch-1].title,nx.line,nx.sub,LD.CHAPTERS[nx.ch-1].color):pText("Einde van deel 2","Hoe kwam ik hier terecht?","“To lose myself in the city and in illegality.” En toch eindigt hij hier, in deze kamer.","Sla om.","#D6A93E"));
    const c=layerCut(o.layer,o.scale); c.userData.ch=o.ch; pop(L,c,PW/2,-.4); clickables.push(c); o.pop=c;
  });
  // blad 6: de kamer in kleur, met Sam van achteren
  const L6=leaf(pBase("#D6A93E",true),pBase(null,false));
  { const wall=card(A.bg,3.7,3.7*IH/IW); pop(L6,wall,PW/2,-1.55);
    const s=3.7/IW; for(const [n,z,ex] of [["bicycle",-1.1,1.3],["bird",-.9,1.5],["letter",-.3,1.9],["frame",.2,1.6],["passport",.75,1.9]]){ const l=A.layers[n]; const c=layerCut(n,l.w*s*ex,{color:1}); pop(L6,c,PW/2+((l.x+l.w/2)/IW-.5)*3.7,z); finalPops[n]=c; }
    const SB=LD_ASSETS.sam_back; const sb=cutout(SB.src,1.1*SB.w/SB.h*1.0,1.1,SB.w,SB.h,{color:1}); pop(L6,sb,PW/2-.1,.9); finalPops.sam=sb; }
  // de bladen liggen op een stapel
  leaves.forEach((L,i)=>L.g.position.y=(NL-i)*.02);
  applyProgress(true); layout(); ready=true;
  LD.hint("Klik op het boek om het open te slaan.",null,6000);
}

/* ---------- voortgang ---------- */
function applyProgress(instant){
  LD.prepareChapter(st.next());
  for(const o of OBJ){ const v=st.has(o.ch)?1:0; const set=c=>{ const u=c.userData.mesh.material.uniforms.uColor; if(instant) u.value=v; else if(v&&u.value<1) colorIn(u); else if(!v) u.value=0; }; set(o.pop); set(roomPops[o.layer]); }
  updateNav();
}
const tweens=[]; function tween(ms,fn,done){ tweens.push({t0:performance.now(),ms,fn,done}); }
function colorIn(u){ tween(6500,p=>u.value=Math.max(u.value,1-Math.pow(1-p,2.2))); }

/* ---------- bladeren ---------- */
let spread=0, ready=false;   // spread = aantal omgeslagen bladen
function canForward(){ if(spread>=NL-1) return false; if(spread>=2&&spread<=5) return st.has(spread-1); return true; }
function flipTo(target){ if(spread>=target||LD.busy) return; const before=spread; turn(1); if(spread>before) setTimeout(()=>flipTo(target),1100); }
function turn(dir){
  if(LD.busy||!ready) return;
  if(dir>0&&!canForward()){ LD.hint(spread>=2&&spread<=5?"Kijk eerst het hoofdstuk. Klik op het ding dat omhoog staat.":"",null,3000); return; }
  if(dir<0&&spread<=0) return;
  if(dir>0){ leaves[spread].target=Math.PI; spread++; } else { spread--; leaves[spread].target=0; }
  if(spread===1&&dir>0) LD.sfx("book",.5);
  updateNav(); LD.hint(null);
  if(spread===1) setTimeout(()=>LD.hint("De kamer vouwt open. Elk ding hoort bij een hoofdstuk. Blader verder.",null,5000),900);
  if(spread>=2&&spread<=5){ const o=OBJ[spread-2]; setTimeout(()=>LD.hint(st.has(o.ch)?"Gezien. Blader verder of kijk opnieuw.":"Klik op wat omhoog klapt om het hoofdstuk te openen.","Hoofdstuk "+o.ch,4500),900); }
  if(spread===6) setTimeout(()=>LD.hint("Dezelfde kamer. Nu weet je wat erin ligt. Hoe Sam hier kwam, vertelt deel 3.","Einde van deel 2",8000),1200);
}
const $=id=>document.getElementById(id);
function updateNav(){ $("nav").hidden=spread===0; $("prev").disabled=spread<=0; $("next").disabled=!canForward()&&!(spread>=2&&spread<=5);
  $("where").textContent=["Omslag","De kamer","Hoofdstuk 1","Hoofdstuk 2","Hoofdstuk 3","Hoofdstuk 4","De kamer"][spread]||""; }
$("prev").onclick=()=>turn(-1); $("next").onclick=()=>turn(1);
addEventListener("keydown",e=>{ if(e.key==="ArrowRight") turn(1); if(e.key==="ArrowLeft") turn(-1); });

/* ---------- klikken ---------- */
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(); let hover=null, dive=null;
function visibleClickables(){ return clickables.filter(c=>{ const L=leaves.find(l=>l.pops.includes(c)); return L&&leaves.indexOf(L)===spread&&c.userData.stand>.9&&shownPop(c); }).map(c=>c.userData.mesh); }
function pickPop(){ ray.setFromCamera(ndc,camera); const h=ray.intersectObjects(visibleClickables(),false); for(const x of h){ const tu=x.uv; const p=x.object.parent; return p; } return null; }
function chOf(p){ if(p.userData.ch) return p.userData.ch; const o=OBJ.find(o=>roomPops[o.layer]===p); return o&&o.ch; }
cv.addEventListener("pointermove",e=>{
  ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1); look.tx=ndc.x; look.ty=ndc.y;
  const p=ready&&!LD.busy?pickPop():null; hover=p; if(p&&st.has(chOf(p))) LD.prepareChapter(chOf(p));
  if(p){ const ch=chOf(p); const C=LD.CHAPTERS[ch-1]; const ok=st.has(ch)||ch===nextCh();
    LD.tag(ok?(st.has(ch)?`Opnieuw · ${C.title}`:`<em>Hoofdstuk ${ch}</em> · ${C.title}`):`${C.title} · <em>nog niet</em>`,e.clientX,e.clientY); cv.style.cursor="pointer"; }
  else { LD.tag(null); cv.style.cursor=ready?"pointer":"default"; }
});
function nextCh(){ return st.next(); }
/* alleen wat je kunt aanklikken staat in het boek; na elk hoofdstuk komt er iets bij (de duif pas aan het eind) */
function shownPop(p){ if(p===roomPops.bird) return st.count>=4; const ch=chOf(p); return !ch||st.has(ch)||st.next()===ch; }
cv.addEventListener("click",e=>{
  if(!ready||LD.busy) return;
  ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
  const p=pickPop();
  if(p){ const ch=chOf(p); if(!(st.has(ch)||ch===nextCh())){ LD.hint("Nog niet. Eerst "+LD.CHAPTERS[nextCh()-1].title+".",null,3000); return; }
    LD.tag(null);
    const wp=new THREE.Vector3(); p.userData.mesh.getWorldPosition(wp); dive={t:0,p:wp};
    LD.openChapter(ch,{approach:()=>dive&&dive.t>=1,target:()=>({renderer,scene,camera,root:p.userData.mesh}),onClose:(c,seen)=>{ if(dive) dive.back=true; if(seen&&!st.has(c)){ st.mark(c); hudUi.update(); applyProgress(false); } updateNav();
      // na het hoofdstuk slaat het boek vanzelf om naar het volgende hoofdstuk (na hoofdstuk 4: de kamer in kleur)
      if(seen) setTimeout(()=>flipTo(c+2),1500); }});
    return; }
  // anders: rechterhelft = verder, linkerhelft = terug
  if(spread===0) return turn(1);
  turn(e.clientX>innerWidth/2?1:-1);
});

/* ---------- camera ---------- */
const look={x:0,y:0,tx:0,ty:0};
function layout(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); }
addEventListener("resize",layout); layout();

const hudUi=LD.hud({name:"Pop-upboek",st,onReset:()=>{ applyProgress(true); while(spread>0) { spread--; leaves[spread].target=0; } updateNav(); },onDev:()=>applyProgress(false)});

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
  const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime, now=performance.now();
  for(let i=tweens.length-1;i>=0;i--){ const w=tweens[i]; const p=Math.min(1,(now-w.t0)/w.ms); w.fn(p); if(p>=1){ tweens.splice(i,1); w.done&&w.done(); } }
  // bladen draaien om de rug, met een beetje doorbuiging
  leaves.forEach((L,i)=>{ L.theta+=(L.target-L.theta)*Math.min(1,dt*3.2); if(Math.abs(L.target-L.theta)<.002) L.theta=L.target;
    L.g.rotation.z=L.theta; const turned=L.theta/Math.PI; L.g.position.y=(1-turned)*(NL-i)*.02+turned*i*.02+Math.sin(L.theta)*.02; });
  // pop-ups: staan als hun spread open ligt, vouwen plat als het blad omslaat
  leaves.forEach((L,i)=>{ const prev=i>0?leaves[i-1].theta/Math.PI:1; const own=L.theta/Math.PI;
    const s=Math.max(0,Math.min(1,(prev-.35)/.6))*Math.max(0,1-own/.45);
    L.pops.forEach((p,k)=>{ const e=s*s*(3-2*s); const lag=Math.max(0,Math.min(1,e*1.15-k*.03)); p.userData.stand=lag; p.rotation.x=(Math.PI/2)*(1-lag); p.visible=lag>.002&&shownPop(p); }); });
  // glow
  clickables.forEach(c=>{ const u=c.userData.mesh.material.uniforms; const target=(c===hover)?1:(chOf(c)===nextCh()&&c.userData.stand>.9?.45+.35*Math.sin(t*3):0); u.uGlow.value+=(target-u.uGlow.value)*Math.min(1,dt*6); });
  // camera: van boven bij dicht boek, schuiner als het open ligt
  const open=Math.min(1,spread);
  look.x+=(look.tx-look.x)*dt*2; look.y+=(look.ty-look.y)*dt*2;
  const aspect=camera.aspect, wide=Math.max(1,lerp(.95,1.5,open)/aspect);
  const cx=(open?0:PW/2)*(1)+look.x*.4, cz=lerp(5.6,7.2,open)*wide;
  camera.position.set(cx*(open?1:.9),lerp(10.5,8.2,open)*wide*.95+look.y*.3,cz);
  camTarget.lerp(new THREE.Vector3(open?0:PW/2,0,open?-.4:0),Math.min(1,dt*2.5)); camera.lookAt(camTarget);
  // klik: de camera duikt naar het pop-up-ding
  if(dive&&dive.back&&dive.t<=0) dive=null;
  if(dive){ dive.t=Math.max(0,Math.min(1,dive.t+dt*(dive.back?-1.3:1.8))); const e=dive.t*dive.t*(3-2*dive.t);
    camera.position.lerp(dive.p.clone().add(new THREE.Vector3(0,1.6,2.6)),e); camera.lookAt(camTarget.clone().lerp(dive.p,e)); }
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
const camTarget=new THREE.Vector3(PW/2,0,0);
function lerp(a,b,t){ return a+(b-a)*t; }
build(); frame();
})();
