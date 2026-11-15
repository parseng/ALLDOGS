// Ponte tra la web app (dentro la WebView) e le parti native.
// La web app NON va cambiata: questo script, iniettato prima che la pagina parta,
//  1) sostituisce navigator.geolocation con il GPS nativo (funziona anche a schermo spento durante la passeggiata);
//  2) manda al telefono il profilo del cane (nome, orari liberi, durata) ogni volta che cambia, per i promemoria;
//  3) avvisa il telefono quando una passeggiata parte o finisce (chiave "alldogs-nav" nel localStorage).

export type FromWeb =
  | { t: "geo-start" }
  | { t: "geo-stop" }
  | { t: "geo-once" }
  | { t: "dog"; dog: unknown }
  | { t: "walk"; on: boolean }
  | { t: "log"; msg: string };

export const INJECT_BEFORE = `
(function(){
  if (window.__ALLDOGS_NATIVE__) return; window.__ALLDOGS_NATIVE__ = true;
  var RN = window.ReactNativeWebView;
  function send(o){ try{ RN.postMessage(JSON.stringify(o)); }catch(e){} }

  // ---- GPS nativo al posto di quello del browser ----
  var watchers = {}, nextId = 1, last = null, waitingOnce = [];
  function toPos(p){ return { coords: { latitude:p.latitude, longitude:p.longitude, accuracy:p.accuracy||20,
      altitude:p.altitude, altitudeAccuracy:null, heading:p.heading, speed:p.speed }, timestamp:p.timestamp||Date.now() }; }
  window.__alldogsPos = function(p){ last = toPos(p);
    for (var k in watchers) { try{ watchers[k](last); }catch(e){} }
    var w = waitingOnce; waitingOnce = []; w.forEach(function(f){ try{ f(last); }catch(e){} }); };
  var geo = {
    getCurrentPosition: function(ok, ko, opt){
      if (last && opt && opt.maximumAge && Date.now()-last.timestamp < opt.maximumAge) { ok(last); return; }
      waitingOnce.push(ok); send({t:"geo-once"});
    },
    watchPosition: function(ok){ var id = nextId++; watchers[id] = ok; send({t:"geo-start"}); if (last) setTimeout(function(){ ok(last); }, 0); return id; },
    clearWatch: function(id){ delete watchers[id]; if (!Object.keys(watchers).length) send({t:"geo-stop"}); }
  };
  try { Object.defineProperty(navigator, "geolocation", { value: geo, configurable: true }); } catch(e) {}

  // ---- profilo del cane e passeggiata in corso, letti dal localStorage della web app ----
  function dogNow(){ try { return JSON.parse(localStorage.getItem("alldogs-dog")); } catch(e){ return null; } }
  var setItem = localStorage.setItem.bind(localStorage), removeItem = localStorage.removeItem.bind(localStorage);
  var walking = null; function walk(on){ if (on !== walking) { walking = on; send({t:"walk", on: on}); } }
  localStorage.setItem = function(k, v){ setItem(k, v);
    if (k === "alldogs-dog") send({t:"dog", dog: dogNow()});
    if (k === "alldogs-nav") walk(true); };
  localStorage.removeItem = function(k){ removeItem(k); if (k === "alldogs-nav") walk(false); };
  document.addEventListener("DOMContentLoaded", function(){ var d = dogNow(); if (d) send({t:"dog", dog: d});
    walk(!!localStorage.getItem("alldogs-nav")); });
})();
true;
`;

export const posScript = (p: unknown) => `window.__alldogsPos && window.__alldogsPos(${JSON.stringify(p)}); true;`;
