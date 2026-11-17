// La pagina che sta dentro il riquadro della mappa: qui gira la mappa vera (Mapbox GL JS), la stessa del sito,
// con tutte le sue mappe (Outdoor, Satellite, Sentinel-2, Topografica, Strade, Notte), meteo, satellite, rilievo 3D e volo.
// Riceve i comandi dal motore (vedi remota.ts) e gli rimanda tocchi e spostamenti.
import { C } from "../theme";
import { CODICE_SITO } from "./web-mappa.generated";

export type AvvioMappa = { c: [number, number]; z: number; stile: string; map3d: boolean; hillOn: boolean; wxOv: string | null; scala?: "su" | "giu" | "no"; legendaSu?: number };

const CSS = `
html,body,#map{margin:0;padding:0;height:100%;width:100%;overflow:hidden;background:${C.sage2};font-family:system-ui,sans-serif;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.mapnote{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;color:${C.ink2};font-size:15px;font-weight:600}
.mk-stop{width:26px;height:26px;border-radius:50%;background:${C.cream};color:${C.ink};border:2.5px solid ${C.ink};font:800 13.5px/21px system-ui;text-align:center;box-shadow:0 3px 8px rgba(23,28,20,.35);box-sizing:border-box}
.mk-me{position:relative;width:20px;height:20px}
.mk-me .face{position:absolute;inset:0;border-radius:50%;background:${C.copper};border:3px solid #fff;box-shadow:0 0 0 6px rgba(210,128,58,.22),0 1px 4px rgba(0,0,0,.35);box-sizing:border-box}
.mk-me .face svg{display:none}
.mk-me .hd{display:none;position:absolute;inset:-12px;pointer-events:none}
.mk-me .hd::before{content:"";position:absolute;left:50%;top:0;margin-left:-6px;border:6px solid transparent;border-top:0;border-bottom:9px solid ${C.copper};filter:drop-shadow(0 0 1.5px #fff)}
.mk-me.dir .hd{display:block}
.mk-haz{width:30px;height:27px;position:relative;cursor:pointer;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
.mk-haz::before{content:"";position:absolute;left:0;top:0;border-left:15px solid transparent;border-right:15px solid transparent;border-bottom:26px solid #1b1f17}
.mk-haz::after{content:"";position:absolute;left:3.5px;top:4px;border-left:11.5px solid transparent;border-right:11.5px solid transparent;border-bottom:20px solid #F6CB45}
.mk-haz b{position:absolute;left:0;right:0;top:9px;z-index:1;text-align:center;font:900 14px/14px system-ui;color:#1b1f17}
.mk-start{display:flex;flex-direction:column;align-items:center;pointer-events:none}
.mk-start .pin{width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${C.forest};border:3px solid ${C.cream};box-shadow:0 3px 10px rgba(0,0,0,.45);display:grid;place-items:center;margin-bottom:6px;box-sizing:border-box}
.mk-start svg{width:22px;height:22px;transform:rotate(45deg);fill:none;stroke:${C.lime};stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.mk-start svg .fl{fill:${C.lime}}
.mk-start span{order:-1;margin-bottom:4px;background:${C.forest};color:${C.cream};font:800 12px/1 system-ui;padding:5px 9px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap}
.mk-pin{width:30px;height:30px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:${C.copper};border:3px solid ${C.cream};box-shadow:0 4px 10px rgba(23,28,20,.4);box-sizing:border-box}
.mk-fly{width:34px;height:34px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
.mk-fly svg{width:100%;height:100%;display:block}
.mk-fly path{fill:${C.copper};stroke:#fff;stroke-width:2;stroke-linejoin:round}
.kmscale{position:absolute;right:12px;bottom:12px;z-index:3;pointer-events:none;min-width:60px}
.kmscale.su{top:12px;bottom:auto;left:14px;right:auto}
.kmscale.no{display:none}
.kmscale .kl{display:flex;justify-content:space-between;font:800 13px/1 system-ui;color:#fff;text-shadow:0 0 3px #000,0 0 2px #000,0 1px 2px #000;margin:0 -8px 4px}
.kmscale .kl span{min-width:16px;text-align:center}
.kmscale .kb{height:8px;border-radius:5px;background:${C.cream};border:1.5px solid ${C.ink};overflow:hidden}
.kmscale .kb i{display:block;width:50%;height:100%;background:${C.forest}}
.ovleg{position:absolute;left:10px;bottom:34px;z-index:4;width:min(300px,calc(100% - 90px));background:${C.cream};color:${C.ink};border-radius:16px;padding:9px 11px;box-shadow:0 10px 24px -8px rgba(23,28,20,.35);font-size:14px;font-weight:700}
.ovhd{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ovx{border:0;background:${C.sage};border-radius:50%;width:30px;height:30px;display:grid;place-items:center;color:${C.ink};padding:0}
.ovx svg{width:14px;height:14px;display:block}
.ovbar{height:10px;border-radius:5px;margin:6px 0 3px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1)}
.ovlab{display:flex;justify-content:space-between;font-size:12px;color:${C.ink2}}
.ovleg small{display:block;color:${C.ink2};font-size:12px;font-weight:600;margin-top:3px;line-height:1.3}
.mapboxgl-ctrl-bottom-left{bottom:0;left:0}
.mapboxgl-ctrl-attrib.mapboxgl-compact{background:rgba(251,247,236,.8)}
`;

// questo codice gira dentro la pagina (non nell'app): JavaScript semplice
const CODICE = `
var M=null,styleOK=false,styleNow=INIT.stile,hillOn=INIT.hillOn,map3d=INIT.map3d,rainPath=null,fly=null,spin=null,viewT=0,pronto=false;
function $(id){return document.getElementById(id)}
function post(o){try{window.ReactNativeWebView.postMessage(JSON.stringify(o))}catch(e){}}
function toast(t){post({t:"toast",m:t})}
function syncLayersMenu(){post({t:"ov",wxOv:wxOv,hillOn:hillOn})}
function setStyleKind(k){if(k===wxOv){wxOv=null;overlays();syncLayersMenu()}}
function icon(){return ""}
var AGIL="media";function dog(){return 0}function capacity(){return {agil:AGIL}}
${"__SITO__"}
wxOv=INIT.wxOv||null;
var HAND=["dragPan","scrollZoom","boxZoom","dragRotate","keyboard","doubleClickZoom","touchZoomRotate","touchPitch"];
var LAYERS_Q=["ad-trails-hit","ad-trails-start","ad-cells","ad-poi","ad-poi-g","ad-wt","far-g","far-s","far-v","far-a"];
var MK={};
function vista(user){if(!M)return null;var b=M.getBounds(),c=M.getCenter();return {c:[c.lat,c.lng],z:M.getZoom(),b:[[b.getSouth(),b.getWest()],[b.getNorth(),b.getEast()]],bearing:M.getBearing(),pitch:M.getPitch(),user:!!user}}
function arrow(){if(M.hasImage("ad-arrow"))return;var c=document.createElement("canvas");c.width=c.height=40;var g=c.getContext("2d");
  g.fillStyle="#fff";g.strokeStyle="#171C14";g.lineWidth=3;g.lineJoin="round";g.beginPath();g.moveTo(8,8);g.lineTo(34,20);g.lineTo(8,32);g.lineTo(14,20);g.closePath();g.stroke();g.fill();
  M.addImage("ad-arrow",g.getImageData(0,0,40,40),{pixelRatio:2})}
function avvia(){
  if(!window.mapboxgl){$("map").innerHTML='<div class="mapnote">La mappa non si carica. Controlla la connessione.</div>';post({t:"err",m:"libreria"});return}
  mapboxgl.accessToken=MAPBOX_TOKEN;
  try{M=new mapboxgl.Map({container:"map",style:STYLES[styleNow]||STYLES.map,center:[INIT.c[1],INIT.c[0]],zoom:INIT.z,attributionControl:false,pitchWithRotate:true,fadeDuration:150})}
  catch(e){$("map").innerHTML='<div class="mapnote">Questo telefono non riesce a mostrare la mappa.</div>';M=null;post({t:"err",m:"webgl"});return}
  M.addControl(new mapboxgl.AttributionControl({compact:true,customAttribution:"Sentieri © OpenStreetMap contributors"}),"bottom-left");
  M.on("style.load",function(){styleOK=true;try{itLabels()}catch(e){}if(styleNow==="sat")try{fixSatellite()}catch(e){}try{detailMap()}catch(e){}try{arrow()}catch(e){}
    if(!M.getSource("dem"))M.addSource("dem",{type:"raster-dem",tiles:[DEM_TILES],encoding:"terrarium",tileSize:256,maxzoom:14,attribution:"Rilievo: Terrain Tiles (Mapzen, AWS Open Data)"});
    post({t:"style",k:styleNow,v:vista()});setTimeout(overlays,400)});
  M.on("error",function(e){post({t:"log",m:String(e&&e.error&&e.error.message)})});
  M.on("move",kmScale);M.on("resize",kmScale);M.on("load",kmScale);
  M.on("move",function(){if(viewT)return;viewT=setTimeout(function(){viewT=0;post({t:"vista",v:vista()})},200)});
  M.on("moveend",function(e){post({t:"ev",n:"moveend",v:vista(e&&e.originalEvent)});gridMoved()});
  ["dragstart","zoomstart","rotatestart"].forEach(function(n){M.on(n,function(e){post({t:"ev",n:n,v:vista(e&&e.originalEvent)})})});
  var rotT=0;M.on("rotate",function(){if(rotT)return;rotT=setTimeout(function(){rotT=0;post({t:"ev",n:"rotate",v:vista()})},120)});
  ["mousedown","touchstart","wheel"].forEach(function(n){M.on(n,function(){if(fly&&fly.playing&&fly.started){fly.playing=false;paintFly()}})});
  M.on("click",function(e){
    var t=e.originalEvent&&e.originalEvent.target;if(t&&t.closest&&t.closest(".mapboxgl-marker"))return;
    var L=LAYERS_Q.filter(function(l){return M.getLayer(l)}),F=[];
    try{F=M.queryRenderedFeatures([[e.point.x-10,e.point.y-10],[e.point.x+10,e.point.y+10]],{layers:L}).slice(0,12).map(function(f){return {layer:f.layer.id,properties:f.properties,geometry:f.geometry.type==="Point"?f.geometry:{type:f.geometry.type}}})}catch(x){}
    post({t:"click",lngLat:{lat:e.lngLat.lat,lng:e.lngLat.lng},point:{x:e.point.x,y:e.point.y},feats:F,v:vista()})});
}
function inter(on){if(!M)return;HAND.forEach(function(h){if(M[h])on?M[h].enable():M[h].disable()})}
function mkEl(o){var el=document.createElement("div");el.className=o.cls||"";if(o.html)el.innerHTML=o.html;else if(o.text!=null)el.textContent=o.text;if(o.css)for(var k in o.css)el.style[k]=o.css[k];return el}
function run(c){
  if(!M)return;
  switch(c[0]){
    case "m":M[c[1]].apply(M,c[2]||[]);break;
    case "source":if(!M.getSource(c[1]))M.addSource(c[1],c[2]);break;
    case "layer":{var b=c[2];if(c[1].id==="ad-bld"){var s=(M.getStyle().layers||[]).find(function(l){return l.type==="symbol"});b=s&&s.id}if(b&&!M.getLayer(b))b=undefined;if(!M.getLayer(c[1].id)&&(!c[1].source||typeof c[1].source!=="string"||M.getSource(c[1].source)))M.addLayer(c[1],b);break}
    case "unlayer":if(M.getLayer(c[1]))M.removeLayer(c[1]);break;
    case "unsource":if(M.getSource(c[1]))M.removeSource(c[1]);break;
    case "data":{var so=M.getSource(c[1]);if(so&&so.setData)so.setData(c[2]);break}
    case "paint":if(M.getLayer(c[1]))M.setPaintProperty(c[1],c[2],c[3]);break;
    case "layout":if(M.getLayer(c[1]))M.setLayoutProperty(c[1],c[2],c[3]);break;
    case "terrain":try{if(c[1]){M.setTerrain(c[1]);try{M.setFog({})}catch(e){}}else M.setTerrain(null)}catch(e){}break;
    case "style":{var k=STYLES[c[1]]?c[1]:"map";if(k!==styleNow){styleNow=k;styleOK=false;M.setStyle(STYLES[k],{diff:false})}else if(styleOK)post({t:"style",k:styleNow,v:vista()});break}
    case "inter":inter(c[1]);break;
    case "ov":wxOv=c[1].wxOv||null;hillOn=!!c[1].hillOn;overlays();if(c[1].zoom&&M.getZoom()>c[1].zoom[0])M.easeTo({zoom:c[1].zoom[1]});break;
    case "mk+":{if(MK[c[1]])MK[c[1]].remove();var o=c[2],el=mkEl(o),m=new mapboxgl.Marker({element:el,draggable:!!o.draggable,anchor:o.anchor||"center",rotationAlignment:o.rotAlign||"auto",pitchAlignment:o.pitchAlign||"auto"}).setLngLat(c[3]);if(o.rot!=null)m.setRotation(o.rot);m.addTo(M);MK[c[1]]=m;
      (function(id,m,el){var dragged=false;m.on("dragstart",function(){dragged=true;post({t:"mk",id:id,n:"dragstart"})});m.on("dragend",function(){var q=m.getLngLat();post({t:"mk",id:id,n:"dragend",lngLat:{lat:q.lat,lng:q.lng}});setTimeout(function(){dragged=false},300)});
        if(o.click)el.addEventListener("click",function(ev){ev.stopPropagation();if(!dragged)post({t:"mk",id:id,n:"click"})})})(c[1],m,el);break}
    case "mk~":{var mm=MK[c[1]];if(mm){if(c[2])mm.setLngLat(c[2]);if(c[3]!=null)mm.setRotation(c[3])}break}
    case "mk-":if(MK[c[1]]){MK[c[1]].remove();delete MK[c[1]]}break;
    case "mkdir":{var me=MK[c[1]];if(me){var e2=me.getElement();e2.classList.toggle("dir",c[2]!=null);var hd=e2.querySelector(".hd");if(hd&&c[2]!=null)hd.style.transform="rotate("+(c[2]-M.getBearing())+"deg)"}break}
    case "mkclear":for(var id in MK)MK[id].remove();MK={};break;
    case "scala":$("kmscale").className="kmscale "+(c[1]||"");break;
    case "legenda":$("ovleg").style.bottom=(c[1]||34)+"px";break;
    case "fly":flyStart(c[1]);break;
    case "flyctl":flyCtl(c[1]);break;
    case "resize":M.resize();break;
    case "park":AGIL=c[4]||"media";(function(id){parkShape(c[2],c[3]).then(function(G){post({t:"risposta",id:id,d:G})}).catch(function(){post({t:"risposta",id:id,d:null})})})(c[1]);break;
  }
}
window.AD=function(cmds){for(var i=0;i<cmds.length;i++){try{run(cmds[i])}catch(e){post({t:"log",m:"cmd "+cmds[i][0]+": "+e})}}};
// ---- anteprima 3D in volo: una freccia percorre il sentiero con la visuale che la segue ----
function stopSpin(){if(spin){cancelAnimationFrame(spin);spin=null}}
function paintFly(){if(!fly)return;var F=fly,fr=F.total?F.d/F.total:0,pr=F.prof,back=F.d>F.cOut+1,o=back?Math.max(0,2*F.cOut-F.d):F.d,of=F.cOut?Math.min(1,Math.max(0,o/F.cOut)):0;
  post({t:"fly",fr:fr,km:fr*F.full,tot:F.full,back:back,quota:pr&&pr.length?pr[Math.round(of*(pr.length-1))]:null,playing:F.playing,started:F.started,fine:fr>=1})}
function flyStart(src){
  flyEnd(true);if(!src||!src.path||src.path.length<2)return;
  var O=dense(src.path,15),out=O.length-1,P=O;
  if(src.shape!=="loop"){var k=src.shape==="lolli"?retInfo(O).k:out;P=O.concat(O.slice(0,k).reverse())}
  var Cu=[0];for(var i=1;i<P.length;i++)Cu.push(Cu[i-1]+hav(P[i-1],P[i]));
  var total=Cu[Cu.length-1],el=document.createElement("div");el.className="mk-fly";el.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 2.5 20 21 12 16.5 4 21Z"/></svg>';
  var b0=bearing(P[0],P[Math.min(P.length-1,6)]);
  fly={P:P,C:Cu,total:total,out:out,cOut:Cu[out],prof:src.prof,len:src.len,full:src.len+(src.shape==="loop"?0:src.ret||src.len),d:0,i:0,brg:b0,mb:b0,cen:P[0],playing:true,started:false,last:0,painted:0,
    speed:total/Math.min(100,Math.max(28,total/1000*14)),mk:new mapboxgl.Marker({element:el,rotationAlignment:"map",pitchAlignment:"map"}).setLngLat(ll(P[0])).setRotation(b0).addTo(M)};
  paintFly();
  setTimeout(function(){if(!fly)return;try{M.setTerrain({source:"dem",exaggeration:1.4});M.setFog({})}catch(e){}
    M.easeTo({center:ll(P[0]),zoom:15.6,pitch:62,bearing:b0,duration:1300});
    setTimeout(function(){if(!fly)return;fly.started=true;fly.last=0;stopSpin();spin=requestAnimationFrame(flyStep)},1400)},450);
}
function flyCtl(a){if(a==="stop"){flyEnd();return}if(!fly||!fly.started)return;
  if(!fly.playing&&fly.d>=fly.total){fly.d=0;fly.i=0;fly.brg=fly.mb=bearing(fly.P[0],fly.P[Math.min(fly.P.length-1,6)]);fly.cen=fly.P[0];M.easeTo({center:ll(fly.P[0]),zoom:15.6,pitch:62,bearing:fly.brg,duration:800})}
  fly.playing=!fly.playing;fly.last=0;paintFly()}
function flyEnd(zitto){stopSpin();if(fly){fly.mk.remove();fly=null;if(!zitto){if(!map3d){try{M.setTerrain(null)}catch(e){}M.easeTo({pitch:0,bearing:0,duration:600})}else M.easeTo({pitch:55,duration:400})}}}
(function aspetta(n){if(window.mapboxgl||n>80)avvia();else setTimeout(function(){aspetta(n+1)},150)})(0);
`;

export function paginaMappa(avvio: AvvioMappa): string {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link href="https://cdnjs.cloudflare.com/ajax/libs/mapbox-gl/3.9.4/mapbox-gl.min.css" rel="stylesheet">
<style>${CSS}</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs><symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></symbol></defs></svg>
<div id="map"></div>
<div class="ovleg" id="ovleg" hidden style="bottom:${avvio.legendaSu || 34}px"></div>
<div class="kmscale ${avvio.scala || ""}" id="kmscale"><div class="kl"><span>0</span><span id="ks-m"></span><span id="ks-e"></span></div><div class="kb"><i></i></div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mapbox-gl/3.9.4/mapbox-gl.min.js"></script>
<script>var INIT=${JSON.stringify(avvio)};
${CODICE.replace("__SITO__", () => CODICE_SITO)}
</script></body></html>`;
}
