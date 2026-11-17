// Barra del peso: a sinistra sottopeso (blu), al centro peso giusto (verde), a destra sovrappeso (rosso),
// con la freccetta sul peso di oggi. Il peso tipico viene dalla razza (come nel sito); se manca, dalla prova delle costole.
import React from "react";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { C, F } from "../theme";
import { motore, useMotore } from "../motore";
import { nomeCane } from "./BarraMenu";

const BLU = "#4C8DDB", VERDE = "#5BB36A", ROSSO = "#E0584A";

export function BarraPeso() {
  useMotore();
  const M = motore();
  if (!M) return null;
  const d = M.dog(), nome = nomeCane();
  let stato: any = null, br: any = null;
  try { stato = M.weightState(d); br = stato.br || M.breedRange(d); } catch {}
  const pesi = ((M.HS && M.HS.w) || []) as any[];
  const kg = pesi.length ? +pesi[0].kg : +d.weight || 0;
  const s = stato ? stato.s : null;

  // scala: dal 70% del minimo al 135% del massimo; zona verde = peso tipico ±10%
  let a = 0, b = 0, g1 = 0, g2 = 0, pos: number | null = null;
  if (br && kg) {
    a = br.min * 0.7; b = br.max * 1.35; g1 = br.min * 0.9; g2 = br.max * 1.1;
    pos = Math.max(0.02, Math.min(0.98, (kg - a) / (b - a)));
  } else if (s != null) {
    a = 0; b = 1; g1 = 0.3; g2 = 0.65; pos = s < 0 ? 0.15 : s === 0 ? 0.475 : s === 1 ? 0.75 : 0.92;
  }
  const z1 = b > a ? (g1 - a) / (b - a) : 0.3, z2 = b > a ? (g2 - a) / (b - a) : 0.65;
  const verdetto = s == null ? (pos == null ? null : pos < z1 ? "Sottopeso" : pos > z2 ? "Sovrappeso" : "Peso giusto") : s < 0 ? "Sottopeso" : s === 0 ? "Peso giusto" : s === 1 ? "Sovrappeso" : "Obeso";
  const colore = verdetto === "Peso giusto" ? VERDE : verdetto === "Sottopeso" ? BLU : ROSSO;

  return (
    <View style={{ backgroundColor: C.cream, borderRadius: 20, padding: 16, marginTop: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: F.titolo, fontSize: 20, color: C.ink }}>Il peso di {nome}</Text>
        {kg ? <Text style={{ fontFamily: F.titolo, fontSize: 26, color: C.ink }}>{String(Math.round(kg * 10) / 10).replace(".", ",")}<Text style={{ fontSize: 15 }}> kg</Text></Text> : null}
      </View>
      {pos == null ? (
        <Text style={{ fontFamily: F.t600, fontSize: 14, color: C.ink2, marginTop: 6 }}>Scrivi la razza nei dati del cane, oppure fai la prova delle costole qui sotto: così ti mostro se il peso è giusto.</Text>
      ) : (
        <>
          {verdetto ? <View style={{ alignSelf: "flex-start", marginTop: 6, backgroundColor: colore, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}><Text style={{ fontFamily: F.t800, fontSize: 13, color: "#fff" }}>{verdetto}</Text></View> : null}
          <View style={{ marginTop: 26 }}>
            {/* freccetta */}
            <View style={{ position: "absolute", left: `${pos * 100}%`, top: -20, marginLeft: -10, alignItems: "center" }}>
              <Svg width={20} height={16} viewBox="0 0 20 16"><Path d="M2 1h16L10 15Z" fill={C.ink} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" /></Svg>
            </View>
            <View style={{ height: 16, borderRadius: 8, overflow: "hidden", flexDirection: "row" }}>
              <View style={{ flex: z1, backgroundColor: BLU }} />
              <View style={{ flex: z2 - z1, backgroundColor: VERDE }} />
              <View style={{ flex: 1 - z2, backgroundColor: ROSSO }} />
            </View>
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              <Text style={{ flex: z1, fontFamily: F.t700, fontSize: 12, color: BLU }}>Sottopeso</Text>
              <Text style={{ flex: z2 - z1, fontFamily: F.t700, fontSize: 12, color: VERDE, textAlign: "center" }}>Giusto{br ? `\n${String(br.min).replace(".", ",")}-${String(br.max).replace(".", ",")} kg` : ""}</Text>
              <Text style={{ flex: 1 - z2, fontFamily: F.t700, fontSize: 12, color: ROSSO, textAlign: "right" }}>Sovrappeso</Text>
            </View>
          </View>
          {br ? <Text style={{ fontFamily: F.t600, fontSize: 12.5, color: C.ink2, marginTop: 8 }}>Peso tipico di un {br.n} adulto. Conta di più la prova delle costole: ogni cane è fatto a modo suo.</Text>
            : <Text style={{ fontFamily: F.t600, fontSize: 12.5, color: C.ink2, marginTop: 8 }}>Dalla prova delle costole. Con la razza nei dati del cane ti mostro anche i chili giusti.</Text>}
        </>
      )}
    </View>
  );
}
