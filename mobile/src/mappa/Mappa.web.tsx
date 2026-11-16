// Versione "per il browser" del riquadro della mappa: serve solo per provare l'app sul PC (npx expo start --web).
// Sul telefono si usa Mappa.tsx.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { C } from "../theme";
import { avvisa, motore, notifica } from "../motore";
import { paginaMappa } from "./pagina";
import { mappaRemota } from "./remota";

let prossimo = 1000;
export type StatoVolo = { fr: number; km: number; tot: number; back: boolean; quota: number | null; playing: boolean; started: boolean; fine: boolean };

export function Mappa({ attiva, style, scala, legendaSu, onVolo }: any) {
  const id = useRef(++prossimo).current;
  const frame = useRef<any>(null);
  const [pronta, setPronta] = useState(false);
  const html = useMemo(() => {
    const M = motore(), v = M.S.view || { c: [41.9, 12.5], z: 5 };
    let stile = "map";
    try { stile = M.wantStyle(); } catch {}
    return paginaMappa({ c: v.c, z: v.z, stile, map3d: !!M.map3d, hillOn: !!M.hillOn, wxOv: M.wxOv || null, scala, legendaSu })
      .replace("<head>", `<head><script>window.ReactNativeWebView={postMessage:function(t){parent.postMessage({__ad:${id},d:t},"*")}}</script>`);
  }, []);
  const indirizzo = useMemo(() => URL.createObjectURL(new Blob([html], { type: "text/html" })), [html]);
  const bersaglio = useMemo(() => ({ id, manda: (cmds: any[]) => { try { frame.current?.contentWindow?.AD?.(JSON.parse(JSON.stringify(cmds))); } catch (e) { console.warn(e); } } }), []);
  useEffect(() => {
    const f = (e: any) => {
      if (!e.data || e.data.__ad !== id) return;
      let m: any;
      try { m = JSON.parse(e.data.d); } catch { return; }
      if (m.t === "style") setPronta(true);
      if (m.t === "toast") { avvisa(m.m); return; }
      if (m.t === "fly") { onVolo && onVolo(m); return; }
      if (m.t === "log" || m.t === "err") { console.log("mappa:", m.m); return; }
      mappaRemota.daPagina(id, m);
      if (m.t === "ov") notifica();
    };
    window.addEventListener("message", f);
    return () => window.removeEventListener("message", f);
  }, []);
  useEffect(() => {
    if (attiva && pronta) mappaRemota.attiva(bersaglio);
    return () => { if (attiva) mappaRemota.disattiva(id); };
  }, [attiva, pronta]);
  useEffect(() => { if (pronta) bersaglio.manda([["scala", scala || ""], ["legenda", legendaSu || 34]]); }, [scala, legendaSu, pronta]);
  return (
    <View style={[{ backgroundColor: C.sage2, overflow: "hidden" }, style]}>
      {React.createElement("iframe", { ref: frame, src: indirizzo, style: { border: 0, width: "100%", height: "100%" } })}
    </View>
  );
}
export const volo = {
  parti(src: any) { mappaRemota.manda(["fly", src]); },
  pausa() { mappaRemota.manda(["flyctl", "toggle"]); },
  ferma() { mappaRemota.manda(["flyctl", "stop"]); },
};
