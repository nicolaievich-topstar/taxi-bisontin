Cesium.Ion.defaultAccessToken='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6InY4MDNrX09OQkw3eENPMWMiLCJqdGkiOiI2NGI1NTA5Ny02YmNiLTQzMGQtOTgyZS1lZDgxMzcxZjYyZjYiLCJpZCI6NTUwMDE3LCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3OTQ3NTA5MzF9.0pC_4zKbCNgffRH1cCICX1sOypBdVEl1qKXCPjWDjA0';

const OFFLINE=location.search.includes('offline');
const ORIGIN={lat:47.2382,lon:6.0238};
const M_LAT=110540,M_LON=111320*Math.cos(ORIGIN.lat*Math.PI/180);
const toLL=(x,z)=>[ORIGIN.lon+x/M_LON,ORIGIN.lat-z/M_LAT];
const loadTxt=t=>{const e=document.getElementById('loadtxt');if(e)e.textContent=t;};
const viewer=new Cesium.Viewer('cz',{globe:false,baseLayerPicker:false,geocoder:false,timeline:false,animation:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,useDefaultRenderLoop:false});
const scene=viewer.scene;viewer.resolutionScale=Math.min(1,1.2/Math.max(1,devicePixelRatio));scene.fxaa=false;scene.postProcessStages.fxaa.enabled=false;scene.screenSpaceCameraController.enableInputs=false;
viewer.clock.currentTime=Cesium.JulianDate.fromIso8601('2026-06-21T13:30:00Z');viewer.clock.shouldAnimate=false;
if(OFFLINE){scene.skyAtmosphere.show=true;scene.backgroundColor=Cesium.Color.fromCssColorString('#8fb4d8');}
const enu=Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(ORIGIN.lon,ORIGIN.lat,0));
let H0=0,delta=0;
const WB=SCENE.wb,GS=40,NX=Math.ceil((WB[2]-WB[0])/GS)+1,NZ=Math.ceil((WB[3]-WB[1])/GS)+1;const HG=new Float32Array(NX*NZ);
let tileset=null,tilesOK=false;
function cwt(x,z){let fi=(x-WB[0])/GS,fj=(z-WB[1])/GS;fi=Math.max(0,Math.min(NX-1.001,fi));fj=Math.max(0,Math.min(NZ-1.001,fj));const i=fi|0,j=fj|0,a=fi-i,b=fj-j,k=j*NX+i;
  return HG[k]*(1-a)*(1-b)+HG[k+1]*a*(1-b)+HG[k+NX]*(1-a)*b+HG[k+NX+1]*a*b;}
const cache=new Map();let budget=0;
const RH=new Map();
function rel(x,z){const base=OFFLINE?0:cwt(x,z)+delta-H0;
  const i=Math.round(x/3),j=Math.round(z/3);let best=null,bd=1e9;
  for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const v=RH.get((i+a)+','+(j+b));if(v!==undefined){const d=a*a+b*b;if(d<bd){bd=d;best=v;}}}
  return best!==null?best-H0:base;}
const dirE=new Cesium.Cartesian3(),dest=new Cesium.Cartesian3(),dirF=new Cesium.Cartesian3(),upF=new Cesium.Cartesian3(),rightF=new Cesium.Cartesian3(),tmp=new Cesium.Cartesian3();
function sync(cam,look){updateClip(look.x,look.z);
  const p=cam.position;
  Cesium.Cartesian3.fromElements(look.x-p.x,-(look.z-p.z),look.y-p.y,dirE);Cesium.Cartesian3.normalize(dirE,dirE);
  Cesium.Matrix4.multiplyByPoint(enu,Cesium.Cartesian3.fromElements(p.x,-p.z,p.y+H0,tmp),dest);
  Cesium.Matrix4.multiplyByPointAsVector(enu,dirE,dirF);Cesium.Cartesian3.normalize(dirF,dirF);
  Cesium.Matrix4.multiplyByPointAsVector(enu,Cesium.Cartesian3.UNIT_Z,upF);
  Cesium.Cartesian3.cross(dirF,upF,rightF);Cesium.Cartesian3.normalize(rightF,rightF);Cesium.Cartesian3.cross(rightF,dirF,upF);Cesium.Cartesian3.normalize(upF,upF);
  viewer.camera.setView({destination:dest,orientation:{direction:dirF,up:upF}});
  const asp=innerWidth/innerHeight,v=cam.fov*Math.PI/180;viewer.camera.frustum.fov=asp>=1?2*Math.atan(Math.tan(v/2)*asp):v;
  viewer.render();}
let ROADLINES=null,clipAt=null,clipT=0;
function corridor(pts,w){const n=pts.length;const L=[],R=[];
  for(let i=0;i<n;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];const dx=b[0]-a[0],dz=b[1]-a[1],ll=Math.hypot(dx,dz)||1;const nx=-dz/ll*w,nz=dx/ll*w;
    let [x,z]=pts[i];if(i===0){x-=dx/ll*w*.8;z-=dz/ll*w*.8;}if(i===n-1){x+=dx/ll*w*.8;z+=dz/ll*w*.8;}L.push([x+nx,z+nz]);R.push([x-nx,z-nz]);}
  return L.concat(R.reverse());}
function updateClip(cx,cz){if(!tileset||!ROADLINES)return;const now=performance.now();
  if(clipAt&&(now-clipT<2500||Math.hypot(cx-clipAt[0],cz-clipAt[1])<30))return;clipAt=[cx,cz];clipT=now;
  const runs=[];
  for(const ln of ROADLINES){let cur=[];
    for(const q of ln.pts){if(Math.hypot(q[0]-cx,q[1]-cz)<150)cur.push(q);else{if(cur.length>1)runs.push({w:ln.w/2,pts:cur});cur=[];}}
    if(cur.length>1)runs.push({w:ln.w/2,pts:cur});}
  runs.forEach(r=>{let m=1e9;for(const q of r.pts)m=Math.min(m,Math.hypot(q[0]-cx,q[1]-cz));r.d=m;});runs.sort((a,b)=>a.d-b.d);
  const polys=[];
  for(const r of runs.slice(0,18)){let p=r.pts;if(p.length>10){const k=Math.ceil(p.length/10);p=p.filter((_,i)=>i%k===0||i===p.length-1);}
    try{polys.push(new Cesium.ClippingPolygon({positions:corridor(p,r.w*.7).map(([x,z])=>{const [lo,la]=toLL(x,z);return Cesium.Cartesian3.fromDegrees(lo,la);})}));}catch(e){}}
  try{tileset.clippingPolygons=new Cesium.ClippingPolygonCollection({polygons:polys});}catch(e){console.error('découpage',e);}}
async function buildRoads(SP){
  const R=750,STEP=5,W={secondary:9,residential:6.5,living_street:5.5,busway:6.5};
  const lines=[];
  for(const r of SCENE.roads){const p=r.p;if(!p.some(([x,z])=>Math.hypot(x-SP.x,z-SP.z)<R))continue;
    const pts=[];for(let i=0;i<p.length-1;i++){const [x1,z1]=p[i],[x2,z2]=p[i+1];const L=Math.hypot(x2-x1,z2-z1);const n=Math.max(1,Math.ceil(L/STEP));
      for(let k=0;k<n;k++)pts.push([x1+(x2-x1)*k/n,z1+(z2-z1)*k/n]);}
    pts.push(p[p.length-1]);if(pts.length>1)lines.push({w:W[r.k]||6,pts});}
  const all=[];for(const ln of lines)for(const q of ln.pts){const [lo,la]=toLL(q[0],q[1]);all.push(Cesium.Cartographic.fromDegrees(lo,la));}
  const hs=null;
  const CP=[];for(let a=0;a<6;a++)for(let b=0;b<6;b++){const x=SP.x-R+(a+.5)*R/3,z=SP.z-R+(b+.5)*R/3;let best=null,bd=1e9;
    for(const ln of lines)for(const q of ln.pts){const dd=Math.hypot(q[0]-x,q[1]-z);if(dd<bd){bd=dd;best=q;}}if(best&&bd<R/3)CP.push(best);}
  CP.push([SP.x,SP.z]);let corr=[];
  try{const res=await Promise.race([scene.sampleHeightMostDetailed(CP.map(([x,z])=>{const [lo,la]=toLL(x,z);return Cesium.Cartographic.fromDegrees(lo,la);})),new Promise(r=>setTimeout(()=>r(null),20000))]);
    if(res)res.forEach((c,i)=>{if(c&&isFinite(c.height)){const ref=cwt(CP[i][0],CP[i][1]);const dv=c.height-ref;if(dv>-15&&dv<30)corr.push([CP[i][0],CP[i][1],dv]);}});}catch(e){console.warn(e);}
  const dlt=(x,z)=>{if(!corr.length)return delta;let s=0,w=0;for(const [cx,cz,dv] of corr){const q=1/((cx-x)**2+(cz-z)**2+400);s+=dv*q;w+=q;}return s/w;};
  let k=0;const inst=[];
  for(const ln of lines){const n=ln.pts.length;const h=[];
    for(let i=0;i<n;i++){const ref=cwt(ln.pts[i][0],ln.pts[i][1])+dlt(ln.pts[i][0],ln.pts[i][1]);let v=hs&&hs[k+i]!=null?hs[k+i]:ref;if(v>ref+3||v<ref-4)v=ref;h.push(v);}
    k+=n;const hm=h.map(v=>v+.05);
    for(let i=0;i<n;i++)RH.set(Math.round(ln.pts[i][0]/3)+','+Math.round(ln.pts[i][1]/3),hm[i]);
    const pos=[];const w=ln.w/2+1.5;
    for(let i=0;i<n;i++){const a=ln.pts[Math.max(0,i-1)],b=ln.pts[Math.min(n-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const L=Math.hypot(dx,dz)||1;const nx=-dz/L*w,nz=dx/L*w;
      const [x,z]=ln.pts[i];const [lo1,la1]=toLL(x+nx,z+nz),[lo2,la2]=toLL(x-nx,z-nz);
      pos.push(Cesium.Cartesian3.fromDegrees(lo1,la1,hm[i]),Cesium.Cartesian3.fromDegrees(lo2,la2,hm[i]));}
    const P=new Float64Array(pos.length*3);pos.forEach((c,i)=>{P[i*3]=c.x;P[i*3+1]=c.y;P[i*3+2]=c.z;});
    const idx=[];for(let i=0;i<n-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    const geo=new Cesium.Geometry({attributes:{position:new Cesium.GeometryAttribute({componentDatatype:Cesium.ComponentDatatype.DOUBLE,componentsPerAttribute:3,values:P})},
      indices:new Uint32Array(idx),primitiveType:Cesium.PrimitiveType.TRIANGLES,boundingSphere:Cesium.BoundingSphere.fromVertices(P)});
    inst.push(new Cesium.GeometryInstance({geometry:geo,attributes:{color:Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString('#3c3e43'))}}));}
  ROADLINES=lines;
  for(let i=0;i<inst.length;i+=150)scene.primitives.add(new Cesium.Primitive({geometryInstances:inst.slice(i,i+150),appearance:new Cesium.PerInstanceColorAppearance({flat:true,translucent:false,closed:false}),asynchronous:false}));}
window.CESIUMGAME={rel,sync,viewer,ready:null};
window.CESIUMGAME.ready=(async()=>{
  const SP={x:297.7,z:287.2};
  if(!OFFLINE){
    loadTxt('Chargement de la ville 3D de Google…');
    tileset=await Cesium.createGooglePhotorealistic3DTileset(undefined,{maximumScreenSpaceError:12,cacheBytes:1.2e9,maximumCacheOverflowBytes:1.2e9});scene.primitives.add(tileset);
    // on regarde le point de départ d'en haut pour charger les tuiles
    const fake={position:{x:SP.x,y:120,z:SP.z},fov:60};const look={x:SP.x,y:0,z:SP.z-.01};
    const t0=performance.now();
    while(performance.now()-t0<40000){sync(fake,look);await new Promise(r=>setTimeout(r,60));if(tileset.tilesLoaded&&performance.now()-t0>2500)break;
      loadTxt('Chargement de la ville 3D de Google… '+Math.min(99,Math.round((performance.now()-t0)/400))+' %');}
    tilesOK=true;
    window.__roadsPending=true;

    // hauteur du sol au départ (sur la couche Google) + relief de référence
    loadTxt('Lecture du relief…');
    const [lo,la]=toLL(SP.x,SP.z);
    let hs=undefined;try{hs=scene.sampleHeight(Cesium.Cartographic.fromDegrees(lo,la));}catch(e){}
    const tp=await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
    const pts=[];for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const [a,b]=toLL(WB[0]+i*GS,WB[1]+j*GS);pts.push(Cesium.Cartographic.fromDegrees(a,b));}
    await Cesium.sampleTerrainMostDetailed(tp,pts);pts.forEach((p,k)=>HG[k]=p.height||0);
    const c0=cwt(SP.x,SP.z);H0=(hs!==undefined&&isFinite(hs))?hs:c0+5;delta=H0-c0;
  }
  if(!OFFLINE){try{loadTxt('Dessin des routes…');await buildRoads(SP);}catch(e){console.error('routes',e);}}
  const ov=document.getElementById('loadov');if(ov)ov.remove();
})().catch(e=>{const o=document.getElementById('loadtxt');if(o)o.textContent='Erreur de chargement : '+(e&&e.message||e);throw e;});
