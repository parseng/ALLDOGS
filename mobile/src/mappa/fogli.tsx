// Tendina "Mappe": mappa di base, meteo, satellite, rilievo e cosa mostrare sulla mappa. Le scelte sono quelle del sito.
import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { C, F } from "../theme";
import { motore } from "../motore";
import { Bottone, Interruttore, Testo, Tocco } from "../ui/base";
import { strati } from "../ui/strati";

const IMG: Record<string, any> = {
  map: require("../../assets/mappe/map.jpg"), sat: require("../../assets/mappe/sat.jpg"), s2: require("../../assets/mappe/s2.jpg"), topo: require("../../assets/mappe/topo.jpg"),
  str: require("../../assets/mappe/str.jpg"), dark: require("../../assets/mappe/dark.jpg"), rain: require("../../assets/mappe/rain.jpg"), rainf: require("../../assets/mappe/rainf.jpg"),
  temp: require("../../assets/mappe/temp.jpg"), wind: require("../../assets/mappe/wind.jpg"), snow: require("../../assets/mappe/snow.jpg"), clouds: require("../../assets/mappe/clouds.jpg"),
  ndvi: require("../../assets/mappe/ndvi.jpg"), "3d": require("../../assets/mappe/3d.jpg"), hill: require("../../assets/mappe/hill.jpg"),
};
const GRUPPI: [string, [string, string, string?, string?][]][] = [
  ["Mappa di base", [["map", "Outdoor", "Sentieri e curve"], ["sat", "Satellite", "Foto aeree"], ["s2", "Sentinel-2", "Satellite europeo"], ["topo", "Topografica", "Carta classica"], ["str", "Strade"], ["dark", "Notte"]]],
  ["Meteo", [["rain", "Pioggia adesso", "Radar", "Live"], ["rainf", "Pioggia prevista", "Prossime 24 ore"], ["temp", "Temperatura", "Aria, adesso"], ["wind", "Vento", "Forza e direzione"]]],
  ["Dal satellite", [["snow", "Neve", "Vista dall'alto"], ["clouds", "Nuvole", "Foto di oggi"], ["ndvi", "Vegetazione", "Quanto è verde"]]],
  ["Rilievo", [["3d", "Rilievo 3D", "Inclina la mappa"], ["hill", "Ombre del rilievo", "Valli e creste"]]],
];
const LUOGHI: [string, string, string][] = [["trails", "Sentieri", "#3E8E41"], ["poi-a", "Aree cani", "#1f8a4c"], ["poi-v", "Veterinari", "#d9483b"], ["poi-s", "Spiagge per cani", "#1e88e5"], ["poi-g", "Ville comunali e parchi", "#6a9f2a"], ["poi-w", "Fontanelle e punti acqua", "#1e88e5"]];

function acceso(k: string): boolean {
  const M = motore();
  if (k === "3d") return !!M.map3d;
  if (k === "hill") return !!M.hillOn;
  if (k === "trails") return !!M.trailsOn;
  if (k.startsWith("poi-")) return !!M.poiK[k.slice(4)];
  if (M.OVNAME[k]) return M.wxOv === k;
  return M.mapStyle === k;
}

export function foglioMappe(extra?: { legenda?: () => void; proponi?: () => void }) {
  const M = motore();
  strati.foglio({
    titolo: "Mappe",
    corpo: () => (
      <View>
        {GRUPPI.map(([t, voci]) => (
          <View key={t}>
            <Text style={{ fontFamily: F.t800, fontSize: 14, color: C.ink2, marginTop: 14, marginBottom: 8 }}>{t}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 }}>
              {voci.map(([k, nome, sotto, tag]) => {
                const on = acceso(k);
                return (
                  <Tocco key={k} hitSlop={0} onPress={() => M.setStyleKind(k)} accessibilityState={{ selected: on }} accessibilityLabel={nome} style={{ width: "33.33%", paddingHorizontal: 5, marginBottom: 10 }}>
                    <View style={{ borderRadius: 16, padding: 3, borderWidth: 3, borderColor: on ? C.ink : "transparent", backgroundColor: on ? C.lime : "transparent" }}>
                      <View style={{ aspectRatio: 4 / 3, borderRadius: 11, overflow: "hidden", backgroundColor: C.sage2 }}>
                        <Image source={IMG[k]} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                        {tag ? <Text style={{ position: "absolute", left: 6, top: 6, backgroundColor: C.lime, color: C.ink, fontFamily: F.t800, fontSize: 10.5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: "hidden" }}>{tag}</Text> : null}
                      </View>
                    </View>
                    <Text style={{ fontFamily: F.t800, fontSize: 13, color: C.ink, marginTop: 3, marginLeft: 4 }}>{nome}</Text>
                    {sotto ? <Text style={{ fontFamily: F.t600, fontSize: 12, color: C.ink2, marginLeft: 4 }}>{sotto}</Text> : null}
                  </Tocco>
                );
              })}
            </View>
          </View>
        ))}
        <Text style={{ fontFamily: F.t800, fontSize: 14, color: C.ink2, marginTop: 14, marginBottom: 2 }}>Sulla mappa</Text>
        {LUOGHI.map(([k, nome, col]) => (
          <Tocco key={k} hitSlop={0} onPress={() => M.setStyleKind(k)} accessibilityRole="switch" accessibilityState={{ checked: acceso(k) }} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, minHeight: 44, borderBottomWidth: 1.5, borderBottomColor: C.sage2 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: col }} />
            <Text style={{ flex: 1, fontFamily: F.t700, fontSize: 15, color: C.ink }}>{nome}</Text>
            <Interruttore acceso={acceso(k)} />
          </Tocco>
        ))}
        <Bottone testo="Legenda della mappa" tinta="chiaro2" largo style={{ marginTop: 14 }} onPress={foglioLegenda} />
        {extra && extra.proponi ? <Bottone testo="Manca un posto? Proponilo" tinta="chiaro2" largo style={{ marginTop: 8 }} onPress={extra.proponi} /> : null}
        <Testo tipo="piccolo" style={{ marginTop: 12 }}>Una mappa meteo o satellite alla volta. Fonti gratuite: Open-Meteo, RainViewer, NASA, Sentinel-2 di EOX.</Testo>
      </View>
    ),
  });
}

/** Legenda: i segni di AllDogs e i colori della mappa */
export function foglioLegenda() {
  const M = motore(), nome = (M.dog().name || "il tuo cane") as string;
  const linea = (c: string, w = 4, tratti?: boolean) => <View style={{ width: 46, height: 18, borderRadius: 4, backgroundColor: "#E7EADF", justifyContent: "center", paddingHorizontal: 4 }}><View style={{ height: w, borderRadius: w, backgroundColor: tratti ? "transparent" : c, borderTopWidth: tratti ? w : 0, borderColor: c, borderStyle: tratti ? "dashed" : "solid" }} /></View>;
  const punto = (c: string, t?: string) => <View style={{ width: 46, alignItems: "center" }}><View style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: c, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>{t ? <Text style={{ fontSize: 9, fontFamily: F.t800, color: "#fff" }}>{t}</Text> : null}</View></View>;
  const box = (c: string, b?: string) => <View style={{ width: 46, height: 18, borderRadius: 4, backgroundColor: c, borderWidth: 1.5, borderColor: b || "rgba(0,0,0,.15)" }} />;
  const riga = (s: React.ReactNode, t: string, sub?: string, k?: string) => <View key={k || t} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 }}>{s}<View style={{ flex: 1 }}><Text style={{ fontFamily: F.t700, fontSize: 14.5, color: C.ink }}>{t}</Text>{sub ? <Text style={{ fontFamily: F.t600, fontSize: 12.5, color: C.ink2 }}>{sub}</Text> : null}</View></View>;
  const h = (t: string) => <Text style={{ fontFamily: F.titolo, fontSize: 19, color: C.ink, marginTop: 16, marginBottom: 4 }}>{t}</Text>;
  const SFT: Record<string, string> = { a: "D'estate può scottare le zampe", g: "Faticosi per le articolazioni", u: "Nei dati non c'è scritto", n: "Il migliore per le zampe" };
  strati.foglio({
    titolo: "Legenda della mappa",
    corpo: () => (
      <View>
        <Testo tipo="secondo">I colori dello sfondo valgono per la mappa Outdoor; nelle altre mappe possono cambiare un po'.</Testo>
        {h("I segni di AllDogs")}
        {riga(punto("#3E8E41"), `Sentiero adatto a ${nome}`, "Il colore del sentiero è il verdetto per il tuo cane")}
        {riga(punto("#D99A1C"), "Con prudenza")}{riga(punto("#D4503C"), "Sconsigliato")}{riga(punto("#8C9486"), "Lo sto ancora valutando")}
        {riga(linea("#ff5d2a"), "Percorso scelto")}{riga(linea("#2f7bff"), "Strada già fatta", "Durante la passeggiata")}
        {riga(punto("#1e88e5"), "Fontanella", "Acqua lungo il percorso, da verificare sul posto")}
        {riga(punto("#1f8a4c", "C"), "Area cani")}{riga(punto("#d9483b", "+"), "Veterinario")}{riga(punto("#1e88e5", "~"), "Spiaggia per cani")}{riga(punto("#6a9f2a"), "Villa comunale o parco", "Da vicino, con il nome")}
        {M.SFK.map((k: string) => riga(linea(M.SFC[k], 5), "Fondo: " + String(M.SFL[k]).toLowerCase(), SFT[k], "sf" + k))}
        {h("Sentieri e strade")}
        {riga(linea("#8a6a4a", 3, true), "Sentiero a piedi o sterrata")}{riga(linea("#f0a23c", 5), "Strada principale")}{riga(linea("#ffffff", 5), "Strada secondaria o via")}
        {h("Terreno")}
        {riga(box("#b9dca4"), "Bosco", "Ombra: bene quando fa caldo")}{riga(box("#dcebc8"), "Prato o erba")}{riga(box("#f1e7c6"), "Sabbia o spiaggia")}{riga(box("#d9d6cf"), "Roccia o terreno nudo")}{riga(box("#a6d4f0"), "Acqua: mare, laghi, fiumi")}
        {riga(linea("#b89b7a", 1), "Curve di livello", "Più sono vicine, più il terreno è ripido. I numeri sono la quota in metri")}
        {h("Aree")}
        {riga(box("#c9e6b3", "#5fa04a"), "Parco nazionale o riserva", "Controlla le regole per i cani: spesso serve il guinzaglio")}{riga(box("#dff0cf", "#9cc487"), "Parco cittadino o giardino")}{riga(box("#f3d9d6", "#d9483b"), "Zona militare o vietata")}
      </View>
    ),
  });
}
