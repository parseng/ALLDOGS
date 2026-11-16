// Il riquadro della mappa. Dentro c'è la mappa vera (Mapbox GL JS, la stessa del sito) in una pagina interna.
// Quando la schermata è quella visibile, questa mappa diventa quella "comandata" dal motore.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import { C } from "../theme";
import { SITO, avvisa, motore, notifica } from "../motore";
import { Testo } from "../ui/base";
import { paginaMappa } from "./pagina";
import { mappaRemota } from "./remota";

let prossimo = 0;
export type StatoVolo = { fr: number; km: number; tot: number; back: boolean; quota: number | null; playing: boolean; started: boolean; fine: boolean };

export function Mappa({ attiva, style, scala, legendaSu, onVolo, onTocco }: { attiva: boolean; style?: StyleProp<ViewStyle>; scala?: "su" | "giu" | "no"; legendaSu?: number; onVolo?: (s: StatoVolo) => void; onTocco?: (on: boolean) => void }) {
  const web = useRef<WebView>(null);
  const id = useRef(++prossimo).current;
  const [pronta, setPronta] = useState(false);
  const [errore, setErrore] = useState("");
  const html = useMemo(() => {
    const M = motore(), v = M.S.view || { c: [41.9, 12.5], z: 5 };
    let stile = "map";
    try { stile = M.wantStyle(); } catch {}
    return paginaMappa({ c: v.c, z: v.z, stile, map3d: !!M.map3d, hillOn: !!M.hillOn, wxOv: M.wxOv || null, scala, legendaSu });
  }, []);
  const bersaglio = useMemo(() => ({ id, manda: (cmds: any[]) => web.current?.injectJavaScript(`window.AD&&AD(${JSON.stringify(cmds).replace(/ | /g, " ")});true;`) }), []);

  useEffect(() => {
    if (attiva && pronta) mappaRemota.attiva(bersaglio);
    return () => { if (attiva) mappaRemota.disattiva(id); };
  }, [attiva, pronta]);
  useEffect(() => { if (pronta) bersaglio.manda([["scala", scala || ""], ["legenda", legendaSu || 34]]); }, [scala, legendaSu, pronta]);

  const onMessage = (e: any) => {
    let m: any;
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (m.t === "style" && !pronta) setPronta(true);
    if (m.t === "err") { setErrore(m.m === "webgl" ? "Questo telefono non riesce a mostrare la mappa." : "La mappa non si carica. Controlla la connessione."); return; }
    if (m.t === "toast") { avvisa(m.m); return; }
    if (m.t === "fly") { onVolo && onVolo(m); return; }
    if (m.t === "log") { if (__DEV__) console.log("mappa:", m.m); return; }
    mappaRemota.daPagina(id, m);
    if (m.t === "ov") notifica();
  };

  return (
    <View style={[{ backgroundColor: C.sage2, overflow: "hidden" }, style]} onTouchStart={() => onTocco && onTocco(true)} onTouchEnd={() => onTocco && onTocco(false)} onTouchCancel={() => onTocco && onTocco(false)}>
      <WebView
        ref={web}
        source={{ html, baseUrl: SITO }}
        originWhitelist={["*"]}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        androidLayerType="hardware"
        cacheEnabled
        textZoom={100}
        onError={() => setErrore("La mappa non si carica. Controlla la connessione.")}
        onContentProcessDidTerminate={() => web.current?.reload()}
        onShouldStartLoadWithRequest={(r) => r.url.startsWith(SITO) || r.url === "about:blank" || r.url.startsWith("data:")}
        style={{ flex: 1, backgroundColor: C.sage2 }}
        accessibilityLabel="Mappa"
      />
      {errore ? <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: C.sage2 }}><Testo tipo="secondo" centro>{errore}</Testo></View> : null}
    </View>
  );
}

/** comandi diretti alla mappa visibile (volo 3D) */
export const volo = {
  parti(src: { path: number[][]; prof?: number[]; len: number; shape: string; ret: number }) { mappaRemota.manda(["fly", src]); },
  pausa() { mappaRemota.manda(["flyctl", "toggle"]); },
  ferma() { mappaRemota.manda(["flyctl", "stop"]); },
};
