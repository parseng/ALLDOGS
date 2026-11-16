// Grafici semplici: profilo del dislivello, strisce (fondo, ombra), ore del giorno.
import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { C, F, R } from "../theme";
import { motore } from "../motore";

/** Profilo del dislivello. In rame i tratti ripidi PER IL CANE (stessa regola del sito). */
export function Dislivello({ p, len, segno, scuro }: { p: number[]; len: number; segno?: number | null; scuro?: boolean }) {
  if (!p || p.length < 3) return null;
  const M = motore(), d = M.dog();
  const W = 300, H = 96, n = p.length, mn = Math.min(...p), mx = Math.max(...p), rg = Math.max(20, mx - mn), passo = len / (n - 1);
  const x = (i: number) => (W * i) / (n - 1), y = (v: number) => 8 + (H - 16) * (1 - (v - mn) / rg);
  const lim = M.capacity(d).agil === "bassa" ? 12 : 18;
  let ripidi = "", metri = 0;
  for (let i = 1; i < n; i++) if ((Math.abs(p[i] - p[i - 1]) / passo) * 100 >= lim) { metri += passo; ripidi += `M${x(i - 1).toFixed(1)},${H}L${x(i - 1).toFixed(1)},${y(p[i - 1]).toFixed(1)}L${x(i).toFixed(1)},${y(p[i]).toFixed(1)}L${x(i).toFixed(1)},${H}Z`; }
  const linea = p.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1)).join("");
  const im = segno != null ? Math.round(Math.max(0, Math.min(1, segno)) * (n - 1)) : -1;
  return (
    <View>
      <View style={{ backgroundColor: scuro ? C.forest2 : C.cream, borderRadius: R.m, padding: 12, paddingBottom: 8 }}>
        <Svg width="100%" height={96} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Path d={`${linea}L${W},${H}L0,${H}Z`} fill={scuro ? "rgba(220,242,106,0.35)" : C.lime} />
          {ripidi ? <Path d={ripidi} fill={C.copper} opacity={0.9} /> : null}
          <Path d={linea} fill="none" stroke={scuro ? C.lime : C.forest} strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {im >= 0 ? <><Line x1={x(im)} x2={x(im)} y1={4} y2={H} stroke={C.copper} strokeWidth={2} vectorEffect="non-scaling-stroke" /><Circle cx={x(im)} cy={y(p[im])} r={4} fill={C.copper} /></> : null}
        </Svg>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {["0 km", `${M.km(len / 2)} km`, `${M.km(len)} km`].map((t) => <Text key={t} style={{ fontFamily: F.t700, fontSize: 12, color: scuro ? C.onForest2 : C.ink2, fontVariant: ["tabular-nums"] }}>{t}</Text>)}
        </View>
      </View>
      {scuro ? null : <Text style={{ fontFamily: F.t600, fontSize: 13, color: C.ink2, marginTop: 6 }}>{metri >= passo ? `In rame i tratti ripidi per ${d.name || "il cane"} (pendenza oltre il ${lim}%): circa ${M.fmtM(metri)} in tutto.` : `Nessun tratto molto ripido per ${d.name || "il cane"}.`}</Text>}
    </View>
  );
}

/** striscia a pezzi colorati (fondo o ombra) con la legenda sotto */
export function Striscia({ pezzi, legenda }: { pezzi: { c: string; w: number }[]; legenda: [string, string][] }) {
  return (
    <View>
      <View style={{ flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", gap: 2, marginTop: 8 }}>
        {pezzi.map((x, i) => <View key={i} style={{ flex: Math.max(0.001, x.w), backgroundColor: x.c }} />)}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4, marginTop: 6 }}>
        {legenda.map(([c, t]) => <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} /><Text style={{ fontFamily: F.t700, fontSize: 12.5, color: C.ink2 }}>{t}</Text></View>)}
      </View>
    </View>
  );
}

/** la stringa dell'ombra del sito ("0011…") a gruppi */
export function pezziOmbra(sh: string) {
  const out: { c: string; w: number }[] = [];
  for (let i = 0; i < sh.length;) { let j = i; while (j < sh.length && sh[j] === sh[i]) j++; out.push({ c: sh[i] === "1" ? C.forest : C.yellow, w: j - i }); i = j; }
  return out;
}

/** ore dalle 6 alle 22 colorate per il cane, per un giorno */
export function OreDelGiorno({ w, lim }: { w: any; lim: number }) {
  const ora = new Date().getHours();
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 2, marginTop: 8 }}>
        {w.H.slice(6, 23).map((x: any) => (
          <View key={x.h} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ alignSelf: "stretch", height: 26, borderRadius: 3, backgroundColor: x.f <= lim ? C.lime : x.f <= lim + 4 ? C.yellow : C.coral }} />
            <Text style={{ fontFamily: F.t700, fontSize: 10, color: C.ink2, marginTop: 2, fontVariant: ["tabular-nums"] }}>{Math.round(x.f)}°</Text>
            {x.h % 4 === 2 ? <Text style={{ fontFamily: F.t700, fontSize: 10.5, color: C.ink }}>{x.h}</Text> : <Text style={{ fontSize: 10.5 }}> </Text>}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4, marginTop: 2 }}>
        {([[C.lime, "fresco"], [C.yellow, "caldo, con prudenza"], [C.coral, "troppo caldo"]] as const).map(([c, t]) => <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} /><Text style={{ fontFamily: F.t700, fontSize: 12.5, color: C.ink2 }}>{t}</Text></View>)}
      </View>
    </View>
  );
}
