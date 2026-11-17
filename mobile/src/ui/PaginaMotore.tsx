// Disegna in modo nativo, con lo stile nuovo, un pezzo della "pagina invisibile" del motore (la struttura del sito).
// Tocchi e campi da compilare tornano al motore: così liste, moduli e bottoni del sito funzionano tutti.
import React, { useState } from "react";
import { Linking, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { C, F, R } from "../theme";
import { motore, notifica, pagina, pulito, useMotore } from "../motore";
import { simulaCambio, simulaTocco } from "../motore/dom";
import { Bottone, Chip, Icona, Interruttore, Tocco } from "./base";
import { strati } from "./strati";

const A_CAPO = String.fromCharCode(10);
const IN_LINEA = new Set(["b", "strong", "i", "em", "span", "small", "a", "br", "u", "code", "mark", "sup", "sub", "time"]);
const cl = (n: any, c: string) => !!(n.classList && n.classList.contains(c));
const nascosto = (n: any) => n.nodeType === 1 && (n.hasAttribute("hidden") || /display\s*:\s*none/.test(n.getAttribute("style") || "") || (n.style && n.style.display === "none"));
const testo = (n: any): string => (n.nodeType === 3 ? n.textContent : n.nodeType === 1 && n.tagName !== "SVG" && n.tagName !== "svg" ? Array.from(n.childNodes).map(testo).join("") : "");
const tag = (n: any) => String(n.tagName || "").toLowerCase();
const inLinea = (n: any): boolean => n.nodeType === 3 || (n.nodeType === 1 && IN_LINEA.has(tag(n)) && !cl(n, "btn") && !cl(n, "box") && !cl(n, "pill") && !cl(n, "tag") && Array.from(n.childNodes).every(inLinea));

function tocca(n: any) {
  simulaTocco(n);
  notifica();
}
function apriLink(href: string) {
  if (/^(tel:|mailto:|https?:)/.test(href)) Linking.openURL(href).catch(() => {});
  else if (/^(privacy|termini)\.html/.test(href)) Linking.openURL("https://parseng.github.io/ALLDOGS/" + href).catch(() => {});
  else if (href.startsWith("#")) { strati.chiudiFoglio(); pagina().amb.location.hash = href; }
}

function Riga({ n, k }: { n: any; k: string }): any {
  if (n.nodeType === 3) return String(n.textContent).replace(/\s+/g, " ");
  if (n.nodeType !== 1 || nascosto(n)) return null;
  const t = tag(n);
  if (t === "svg" || t === "img" || t === "input") return null;
  if (t === "br") return "\n";
  if (t === "i" && testo(n).trim() === "›") return null;
  const st: any = {};
  const prima = n.previousElementSibling;
  const aCapo = t === "small" && prima && (tag(prima) === "b" || tag(prima) === "strong");
  if (t === "b" || t === "strong") st.fontFamily = F.t800;
  if (t === "small" || cl(n, "small")) st.fontSize = 13;
  if (cl(n, "muted")) st.color = C.ink2;
  if (cl(n, "c0")) st.color = C.forest;
  if (cl(n, "c1")) st.color = C.warnInk;
  if (cl(n, "c2")) st.color = C.dangerInk;
  const figli = Array.from(n.childNodes).map((c: any, i) => <Riga key={k + i} n={c} k={k + i} />);
  if (t === "a" && n.getAttribute("href")) return <Text key={k} style={{ fontFamily: F.t800, textDecorationLine: "underline" }} onPress={() => apriLink(n.getAttribute("href"))}>{figli}</Text>;
  if (typeof n.onclick === "function" || t === "button") return <Text key={k} style={{ fontFamily: F.t800, textDecorationLine: "underline" }} onPress={() => tocca(n)}>{figli}</Text>;
  if (aCapo) { st.fontSize = 13.5; st.color = C.ink2; st.fontFamily = F.t600; }
  return <Text key={k} style={st}>{aCapo ? A_CAPO : null}{figli}</Text>;
}

function Campo({ n }: { n: any }) {
  const [v, setV] = useState<string>(String(n.value ?? ""));
  const ty = String(n.getAttribute("type") || "text");
  const area = tag(n) === "textarea";
  const cambia = (x: string) => { setV(x); n.value = x; simulaCambio(n, "input"); };
  const fine = () => { simulaCambio(n, "change"); notifica(); };
  return (
    <TextInput
      value={v} onChangeText={cambia} onEndEditing={fine} onBlur={fine} multiline={area}
      onSubmitEditing={() => { fine(); const f = n.closest && n.closest("form"); if (f) { const ev: any = { type: "submit", target: f, preventDefault() {} }; if (typeof f.onsubmit === "function") f.onsubmit(ev); (f._ascolti && f._ascolti.submit || []).forEach((g: any) => g(ev)); setV(String(n.value ?? "")); notifica(); } }}
      placeholder={n.getAttribute("placeholder") || (ty === "date" ? "AAAA-MM-GG" : "")} placeholderTextColor={C.ink2}
      keyboardType={ty === "number" || n.getAttribute("inputmode") === "numeric" ? "numeric" : n.getAttribute("inputmode") === "decimal" ? "decimal-pad" : ty === "tel" ? "phone-pad" : ty === "email" ? "email-address" : "default"}
      secureTextEntry={ty === "password"} autoCapitalize={ty === "email" || ty === "password" ? "none" : "sentences"} autoCorrect={false}
      accessibilityLabel={n.getAttribute("aria-label") || undefined}
      style={{ minHeight: area ? 84 : 48, borderRadius: 14, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.sage2, paddingHorizontal: 14, paddingVertical: area ? 10 : 0, fontFamily: F.t600, fontSize: 16, color: C.ink, textAlignVertical: area ? "top" : "center", marginTop: 6 }}
    />
  );
}

function Scelta({ n }: { n: any }) {
  useMotore();
  const opz = Array.from(n.querySelectorAll("option")) as any[];
  const val = n.value;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {opz.map((o, i) => { const v = o.hasAttribute("value") ? o.getAttribute("value") : o.textContent; return <Chip key={i} piccolo sfondo={C.white} testo={pulito(o.textContent)} attivo={v === val} onPress={() => { n.value = v; simulaCambio(n, "change"); notifica(); }} />; })}
    </View>
  );
}

function Blocchi({ nodi, k }: { nodi: any[]; k: string }): any {
  const out: any[] = [];
  let riga: any[] = [];
  const chiudi = () => {
    if (riga.some((x) => testo(x).trim())) out.push(<Text key={k + "t" + out.length} style={{ fontFamily: F.t500, fontSize: 15, lineHeight: 21, color: C.ink, marginTop: 4 }}>{riga.map((x, i) => <Riga key={i} n={x} k={k + "r" + out.length + "-" + i} />)}</Text>);
    riga = [];
  };
  nodi.forEach((n, i) => {
    if (n.nodeType === 8) return;
    if (inLinea(n)) { riga.push(n); return; }
    chiudi();
    out.push(<Nodo key={k + i} n={n} k={k + i} />);
  });
  chiudi();
  return out;
}

export function Nodo({ n, k = "n" }: { n: any; k?: string }): any {
  if (!n || n.nodeType !== 1 || nascosto(n)) return null;
  const t = tag(n), figli = Array.from(n.childNodes);
  if (t === "svg" || t === "script" || t === "style" || t === "template") return null;
  if (t === "img") { const src = n.getAttribute("src"); return src ? <Image source={{ uri: src }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 14, marginTop: 8 }} contentFit="cover" /> : null; }
  if (t === "input") {
    const ty = String(n.getAttribute("type") || "text");
    if (ty === "hidden" || ty === "file") return null;
    if (ty === "checkbox" || ty === "radio") return <Tocco hitSlop={0} onPress={() => { n.checked = ty === "radio" ? true : !n.checked; simulaCambio(n, "change"); tocca(n); }} style={{ alignSelf: "flex-start" }}><Interruttore acceso={!!n.checked} /></Tocco>;
    return <Campo n={n} />;
  }
  if (t === "textarea") return <Campo n={n} />;
  if (t === "select") return <Scelta n={n} />;
  if (/^h[1-4]$/.test(t)) return <Text accessibilityRole="header" style={{ fontFamily: F.titolo, fontSize: t === "h1" ? 26 : t === "h2" ? 21 : 17.5, letterSpacing: -0.3, color: C.ink, marginTop: 14, marginBottom: 2 }}>{pulito(testo(n))}</Text>;
  // bottoni
  const eBottone = t === "button" || cl(n, "btn") || (t === "a" && (cl(n, "btn") || cl(n, "hrow")));
  if (eBottone && !cl(n, "tcard") && !cl(n, "hrow") && !cl(n, "box")) {
    const tx = pulito(testo(n)).trim();
    const fai = () => (t === "a" && n.getAttribute("href") && !n.onclick ? apriLink(n.getAttribute("href")) : tocca(n));
    if (n.hasAttribute("aria-pressed") || cl(n, "pill") || cl(n, "tag") || cl(n, "whob") || cl(n, "dp")) return <Chip piccolo sfondo={C.white} testo={tx || "…"} attivo={n.getAttribute("aria-pressed") === "true"} onPress={fai} style={{ marginTop: 6, marginRight: 6 }} />;
    if (!tx) return cl(n, "round") ? <Tocco onPress={fai} accessibilityLabel={n.getAttribute("aria-label") || "Bottone"} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.sage, alignItems: "center", justifyContent: "center", marginTop: 6 }}><Icona nome="x" size={16} /></Tocco> : null;
    return <Bottone testo={tx} piccolo={cl(n, "sm")} largo={cl(n, "wide") || !cl(n, "sm")} tinta={cl(n, "pri") ? "lime" : "chiaro2"} disabled={!!n.disabled} onPress={fai} style={{ marginTop: 8 }} />;
  }
  // righe toccabili (menu, schede, carte)
  if ((t === "button" || t === "a" || typeof n.onclick === "function") && figli.length) {
    return <Tocco hitSlop={0} onPress={() => (t === "a" && n.getAttribute("href") && !n.onclick ? apriLink(n.getAttribute("href")) : tocca(n))} style={{ marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: C.sage }}><Blocchi nodi={figli} k={k} /></Tocco>;
  }
  if (t === "details") return <Apri n={n} k={k} />;
  if (t === "label") {
    const ctl = n.querySelector("input,select,textarea");
    const ck = ctl && (ctl.getAttribute("type") === "checkbox" || ctl.getAttribute("type") === "radio");
    if (ck) return <Tocco hitSlop={0} onPress={() => { ctl.checked = ctl.getAttribute("type") === "radio" ? true : !ctl.checked; simulaCambio(ctl, "change"); tocca(ctl); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: C.sage2 }}><Text style={{ flex: 1, fontFamily: F.t700, fontSize: 15, color: C.ink }}>{pulito(testo(n)).trim()}</Text><Interruttore acceso={!!ctl.checked} /></Tocco>;
    return <View style={{ marginTop: 10 }}><Blocchi nodi={figli} k={k} /></View>;
  }
  if (t === "li") return <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}><Text style={{ fontFamily: F.t800, color: C.ink2, marginTop: 4 }}>•</Text><View style={{ flex: 1 }}><Blocchi nodi={figli} k={k} /></View></View>;
  if (cl(n, "stats")) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.sage2 }}>
        {(Array.from(n.children) as any[]).map((c, i) => (
          <View key={i} style={{ flex: 1, minWidth: 80, paddingVertical: 8, paddingLeft: i ? 8 : 0, borderLeftWidth: i ? 1 : 0, borderColor: C.sage2 }}>
            <Text style={{ fontFamily: F.titolo, fontSize: 18, color: C.ink, fontVariant: ["tabular-nums"] }}>{pulito(testo(c.querySelector("b") || c))}</Text>
            {c.querySelector("span") ? <Text style={{ fontFamily: F.t700, fontSize: 12, color: C.ink2 }}>{pulito(testo(c.querySelector("span")))}</Text> : null}
          </View>
        ))}
      </View>
    );
  }
  const scatola = cl(n, "box") || cl(n, "note") || cl(n, "hz") || cl(n, "lesson") || cl(n, "card");
  const fila = cl(n, "row") || cl(n, "tags") || cl(n, "seg") || cl(n, "days") || cl(n, "chips") || cl(n, "wz-opts");
  return (
    <View style={[{ marginTop: cl(n, "block") || cl(n, "stack") ? 12 : 0 }, scatola ? { backgroundColor: C.cream, borderRadius: R.m, padding: 14, marginTop: 10 } : null, fila ? { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 6 } : null, cl(n, "err") ? { backgroundColor: "#FBD9C9", borderRadius: 14, padding: 12, marginTop: 10 } : null]}>
      <Blocchi nodi={figli} k={k} />
    </View>
  );
}

function Apri({ n, k }: { n: any; k: string }) {
  const [, giro] = useState(0);
  const sommario = n.querySelector("summary");
  const aperto = !!n.open;
  const resto = (Array.from(n.childNodes) as any[]).filter((c) => c !== sommario);
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
      <Tocco hitSlop={0} onPress={() => { n.open = !aperto; ((n._ascolti && n._ascolti.toggle) || []).forEach((f: any) => f({ type: "toggle", target: n })); giro((x) => x + 1); notifica(); }} accessibilityState={{ expanded: aperto }} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 12 }}>
        <View style={{ flex: 1 }}>{sommario ? <Blocchi nodi={Array.from(sommario.childNodes)} k={k + "s"} /> : null}</View>
        <View style={{ transform: [{ rotate: aperto ? "90deg" : "0deg" }] }}><Icona nome="chev" size={16} colore={C.ink2} /></View>
      </Tocco>
      {aperto ? <View style={{ paddingBottom: 14 }}><Blocchi nodi={resto} k={k + "b"} /></View> : null}
    </View>
  );
}

/** disegna l'elemento della pagina invisibile con quell'id (si aggiorna da solo quando il motore lo cambia) */
export function PaginaMotore({ id, sel, togli }: { id?: string; sel?: string; togli?: string[] }) {
  useMotore();
  const M = motore();
  if (!M) return null;
  const el = sel ? pagina().amb.document.querySelector(sel) : pagina().el(id!);
  if (!el) return null;
  const nodi = (Array.from(el.childNodes) as any[]).filter((c) => !(togli && c.nodeType === 1 && togli.some((s) => c.matches && c.matches(s))));
  return <View><Blocchi nodi={nodi} k={id || sel || "p"} /></View>;
}
