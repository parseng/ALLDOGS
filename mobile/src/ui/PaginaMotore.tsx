// Disegna in modo nativo, con lo stile nuovo, un pezzo della "pagina invisibile" del motore (la struttura del sito).
// Tocchi e campi da compilare tornano al motore: così liste, moduli e bottoni del sito funzionano tutti.
import React, { useEffect, useState } from "react";
import { Linking, Platform, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { C, F, R } from "../theme";
import { motore, notifica, pagina, pulito, useMotore } from "../motore";
import { simulaCambio, simulaTocco } from "../motore/dom";
import { disegnoPer } from "./disegnini";
import { Bottone, Chip, Icona, Interruttore, Tocco } from "./base";
import { strati } from "./strati";

const A_CAPO = String.fromCharCode(10);
const IN_LINEA = new Set(["b", "strong", "i", "em", "span", "small", "a", "br", "u", "code", "mark", "sup", "sub", "time"]);
const cl = (n: any, c: string) => !!(n.classList && n.classList.contains(c));
const SALTA = new WeakSet<any>();
const nascosto = (n: any) => n.nodeType === 1 && (SALTA.has(n) || n.hasAttribute("hidden") || /display\s*:\s*none/.test(n.getAttribute("style") || "") || (n.style && n.style.display === "none"));
const testo = (n: any): string => (n.nodeType === 3 ? n.textContent : n.nodeType === 1 && n.tagName !== "SVG" && n.tagName !== "svg" ? Array.from(n.childNodes).map(testo).join("") : "");
const tag = (n: any) => String(n.tagName || "").toLowerCase();
const inLinea = (n: any): boolean => n.nodeType === 3 || (n.nodeType === 1 && IN_LINEA.has(tag(n)) && !cl(n, "btn") && !cl(n, "box") && !cl(n, "pill") && !cl(n, "tag") && Array.from(n.childNodes).every(inLinea));

let ultimoTocco: { n: any; t: number } = { n: null, t: 0 };
function tocca(n: any) {
  // un bottone che il motore ha già tolto dalla pagina non fa più niente (come nel browser); e un doppio tocco ravvicinato vale uno
  if (n && n.isConnected === false) return;
  const ora = Date.now();
  if (ultimoTocco.n === n && ora - ultimoTocco.t < 450) return;
  ultimoTocco = { n, t: ora };
  // prima del tocco rimetto quello che hai scritto nei campi (il motore può averli ridisegnati)
  try { const d = pagina().amb.document; DIGITATI.forEach((v, id) => { const e = d.getElementById(id); if (e && e.value !== v) e.value = v; }); } catch {}
  simulaTocco(n);
  notifica();
}
/** disegnino colorato in un tondo chiaro, accanto alle voci */
function Disegno({ nome, grande }: { nome: string; grande?: boolean }) {
  const z = grande ? 40 : 36;
  return <View style={{ width: z, height: z, borderRadius: 12, backgroundColor: C.sage, alignItems: "center", justifyContent: "center" }}><Icona nome={nome} size={z - 8} /></View>;
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
  if (cl(n, "dot")) { const tk = Object.keys(TIPO).find((x) => cl(n, "k-" + x)); return tk ? <Text key={k} style={{ color: TIPO[tk][0] === C.white ? C.ink2 : TIPO[tk][0] }}>● </Text> : null; }
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

// quello che scrivi resta anche se il motore ridisegna il modulo (per esempio quando arriva il meteo)
const DIGITATI = new Map<string, string>();
function ricorda(n: any) {
  const id = n && n.id;
  if (id && DIGITATI.has(id) && n.value !== DIGITATI.get(id)) n.value = DIGITATI.get(id);
}
/** il campo sta in una riga affiancata (es. peso + Salva)? Allora deve allargarsi, non restare stretto */
const inFila = (n: any) => { const p = n && n.parentNode; return !!(p && p.nodeType === 1 && ["row", "tags", "seg", "chips"].some((c) => cl(p, c))); };
function Campo({ n }: { n: any }) {
  ricorda(n);
  const [v, setV] = useState<string>(String(n.value ?? ""));
  useEffect(() => { setV(String(n.value ?? "")); }, [n]);
  const ty = String(n.getAttribute("type") || "text");
  const area = tag(n) === "textarea";
  const cambia = (x: string) => { setV(x); n.value = x; if (n.id) DIGITATI.set(n.id, x); simulaCambio(n, "input"); };
  const fine = () => { simulaCambio(n, "change"); notifica(); };
  return (
    <TextInput
      value={v} onChangeText={cambia} onEndEditing={fine} onBlur={fine} multiline={area}
      onSubmitEditing={() => { fine(); const f = n.closest && n.closest("form"); if (f) { const ev: any = { type: "submit", target: f, preventDefault() {} }; if (typeof f.onsubmit === "function") f.onsubmit(ev); (f._ascolti && f._ascolti.submit || []).forEach((g: any) => g(ev)); setV(String(n.value ?? "")); notifica(); } }}
      placeholder={n.getAttribute("placeholder") || (ty === "date" ? "AAAA-MM-GG" : "")} placeholderTextColor={C.ink2}
      keyboardType={ty === "number" || n.getAttribute("inputmode") === "numeric" ? "numeric" : n.getAttribute("inputmode") === "decimal" ? "decimal-pad" : ty === "tel" ? "phone-pad" : ty === "email" ? "email-address" : "default"}
      secureTextEntry={ty === "password"} autoCapitalize={ty === "email" || ty === "password" ? "none" : "sentences"} autoCorrect={false}
      accessibilityLabel={n.getAttribute("aria-label") || undefined}
      style={{ ...(inFila(n) ? { flexGrow: 1, flexBasis: 150, minWidth: 120 } : null), minHeight: area ? 84 : 48, borderRadius: 14, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.sage2, paddingHorizontal: 14, paddingVertical: area ? 10 : 0, fontFamily: F.t600, fontSize: 16, color: C.ink, textAlignVertical: area ? "top" : "center", marginTop: 6 }}
    />
  );
}

// campo data: un calendarietto del telefono invece di scrivere AAAA-MM-GG
function CampoData({ n }: { n: any }) {
  ricorda(n);
  const [apri, setApri] = useState(false);
  const [v, setV] = useState<string>(String(n.value || ""));
  useEffect(() => { setV(String(n.value || "")); }, [n]);
  const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const leggi = (x: string) => (x ? new Date(x + "T12:00") : new Date());
  const metti = (x: string) => { setV(x); n.value = x; if (n.id) DIGITATI.set(n.id, x); simulaCambio(n, "input"); simulaCambio(n, "change"); notifica(); };
  const min = n.getAttribute("min"), max = n.getAttribute("max");
  if (Platform.OS === "web") return <Campo n={n} />;
  return (
    <View>
      <Tocco hitSlop={0} onPress={() => setApri(!apri)} style={{ minHeight: 48, borderRadius: 14, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.sage2, paddingHorizontal: 14, marginTop: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icona nome="clock" size={18} colore={C.ink2} />
        <Text style={{ flex: 1, fontFamily: F.t700, fontSize: 16, color: v ? C.ink : C.ink2 }}>{v ? leggi(v).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "Scegli una data"}</Text>
        {v ? <Tocco onPress={() => metti("")} accessibilityLabel="Togli la data" style={{ padding: 6 }}><Icona nome="x" size={14} colore={C.ink2} /></Tocco> : null}
      </Tocco>
      {apri ? (
        <DateTimePicker value={leggi(v)} mode="date" locale="it-IT" display={Platform.OS === "ios" ? "inline" : "default"} minimumDate={min ? leggi(min) : undefined} maximumDate={max ? leggi(max) : undefined} accentColor={C.forest}
          onChange={(e: any, d?: Date) => { if (Platform.OS !== "ios") setApri(false); if (e.type === "set" && d) { metti(iso(d)); if (Platform.OS === "ios") setApri(false); } else if (e.type === "dismissed") setApri(false); }} />
      ) : null}
    </View>
  );
}

function Scelta({ n }: { n: any }) {
  useMotore();
  ricorda(n);
  const opz = Array.from(n.querySelectorAll("option")) as any[];
  const val = n.value;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {opz.map((o, i) => { const v = o.hasAttribute("value") ? o.getAttribute("value") : o.textContent; return <Chip key={i} piccolo sfondo={C.white} testo={pulito(o.textContent)} attivo={v === val} onPress={() => { n.value = v; if (n.id) DIGITATI.set(n.id, v); simulaCambio(n, "change"); notifica(); }} />; })}
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
    if (ty === "date") return <CampoData n={n} />;
    return <Campo n={n} />;
  }
  if (t === "textarea") return <Campo n={n} />;
  if (t === "select") return <Scelta n={n} />;
  if (/^h[1-4]$/.test(t)) return <Text accessibilityRole="header" style={{ fontFamily: F.titolo, fontSize: t === "h1" ? 26 : t === "h2" ? 21 : 17.5, letterSpacing: -0.3, color: C.ink, marginTop: 14, marginBottom: 2 }}>{pulito(testo(n))}</Text>;
  // calendario del programma di allenamento: una griglia vera, lunedì-domenica, con i colori del tipo di giorno
  if (cl(n, "cal")) return <Calendario n={n} />;
  if (cl(n, "legend") && n.querySelector("[class*=k-]")) return <LegendaCal />;
  if (cl(n, "prog")) { const i = n.querySelector("i"), w = parseFloat(((i && i.getAttribute("style")) || "").replace(/.*width:\s*/, "")) || 0; return <View style={{ height: 10, borderRadius: 5, backgroundColor: C.sage2, overflow: "hidden", marginTop: 6 }}><View style={{ height: "100%", width: `${Math.min(100, w)}%`, backgroundColor: C.forest, borderRadius: 5 }} /></View>; }
  if (cl(n, "gl")) return <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginTop: 12 }}><Text style={{ flex: 1, fontFamily: F.t600, fontSize: 14.5, color: C.ink2 }}>{pulito(testo(n.children[0] || n))}</Text><Text style={{ fontFamily: F.t800, fontSize: 15, color: C.ink, fontVariant: ["tabular-nums"] }}>{pulito(testo(n.children[1] || n))}</Text></View>;
  // bottoni con più righe (titolo + spiegazione), che si possono scegliere: carta toccabile
  const scelto = cl(n, "on") || cl(n, "sel") || n.getAttribute("aria-pressed") === "true";
  if (t === "button" && !cl(n, "btn") && n.querySelector("b") && n.querySelector("small")) {
    return (
      <Tocco hitSlop={0} onPress={() => tocca(n)} accessibilityState={{ selected: scelto }} style={{ marginTop: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: scelto ? C.ink : C.white, borderWidth: 1.5, borderColor: scelto ? C.ink : C.sage2, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.t800, fontSize: 15.5, color: scelto ? C.lime : C.ink }}>{pulito(testo(n.querySelector("b")))}</Text>
          <Text style={{ fontFamily: F.t600, fontSize: 14, lineHeight: 19, color: scelto ? C.cream : C.ink2, marginTop: 2 }}>{pulito(testo(n.querySelector("small")))}</Text>
        </View>
        {scelto ? <Icona nome="check" size={20} colore={C.lime} /> : null}
      </Tocco>
    );
  }
  // bottoni
  const eBottone = t === "button" || cl(n, "btn") || (t === "a" && (cl(n, "btn") || cl(n, "hrow")));
  if (eBottone && !cl(n, "tcard") && !cl(n, "hrow") && !cl(n, "box")) {
    const tx = pulito(testo(n)).trim();
    const fai = () => (t === "a" && n.getAttribute("href") && !n.onclick ? apriLink(n.getAttribute("href")) : tocca(n));
    if (n.hasAttribute("aria-pressed") || cl(n, "pill") || cl(n, "tag") || cl(n, "whob") || cl(n, "dp")) return <Chip piccolo sfondo={C.white} testo={tx || "…"} attivo={n.getAttribute("aria-pressed") === "true"} onPress={fai} style={{ marginTop: 6, marginRight: 6 }} />;
    if (!tx) return cl(n, "round") ? <Tocco onPress={fai} accessibilityLabel={n.getAttribute("aria-label") || "Bottone"} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.sage, alignItems: "center", justifyContent: "center", marginTop: 6 }}><Icona nome="x" size={16} /></Tocco> : null;
    const dnB = !cl(n, "sm") ? disegnoPer(tx) : null;
    if (dnB) return <Tocco hitSlop={0} disabled={!!n.disabled} onPress={fai} style={{ marginTop: 8, minHeight: 56, borderRadius: 18, backgroundColor: cl(n, "pri") || scelto ? C.lime : C.cream, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 }}><Disegno nome={dnB} grande /><Text style={{ flex: 1, fontFamily: F.t800, fontSize: 15.5, color: C.ink }}>{tx}</Text><Icona nome="chev" size={16} colore={C.ink2} /></Tocco>;
    return <Bottone testo={tx} piccolo={cl(n, "sm")} largo={cl(n, "wide") || !cl(n, "sm")} tinta={cl(n, "pri") || scelto ? "lime" : "chiaro2"} disabled={!!n.disabled} onPress={fai} style={{ marginTop: 8 }} />;
  }
  // righe toccabili (menu, schede, carte)
  if ((t === "button" || t === "a" || typeof n.onclick === "function") && figli.length) {
    return <Tocco hitSlop={0} onPress={() => (t === "a" && n.getAttribute("href") && !n.onclick ? apriLink(n.getAttribute("href")) : tocca(n))} style={{ marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: C.sage }}><Blocchi nodi={figli} k={k} /></Tocco>;
  }
  if (t === "details") return <Apri n={n} k={k} />;
  if (t === "label") {
    const ctl = n.querySelector("input,select,textarea");
    const ck = ctl && (ctl.getAttribute("type") === "checkbox" || ctl.getAttribute("type") === "radio");
    if (ck) return <Tocco hitSlop={0} onPress={() => { ctl.checked = ctl.getAttribute("type") === "radio" ? true : !ctl.checked; simulaCambio(ctl, "change"); tocca(ctl); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>{(() => { const tb = n.querySelector("b") || n; const dn = disegnoPer(pulito(testo(tb))); return dn ? <Disegno nome={dn} /> : null; })()}{(() => { const sm = n.querySelector("small"); const tit = sm ? pulito(testo(n)).replace(pulito(testo(sm)), "").trim() : pulito(testo(n)).trim(); return <View style={{ flex: 1, paddingVertical: 8 }}><Text style={{ fontFamily: F.t700, fontSize: 15, color: C.ink }}>{tit}</Text>{sm ? <Text style={{ fontFamily: F.t500, fontSize: 13, color: C.ink2, marginTop: 2 }}>{pulito(testo(sm)).trim()}</Text> : null}</View>; })()}<Interruttore acceso={!!ctl.checked} /></Tocco>;
    return <View style={{ marginTop: 10 }}><Blocchi nodi={figli} k={k} /></View>;
  }
  // righe fatte di più pezzi affiancati (es. "17 novembre | 25 kg | +1"): in colonna con spazio, non attaccati
  if (t === "li" && n.children.length >= 2 && Array.from(n.childNodes).every((c: any) => (c.nodeType === 3 && !String(c.textContent).trim()) || (c.nodeType === 1 && tag(c) === "span"))) {
    return <View style={{ flexDirection: "row", gap: 14, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>{(Array.from(n.children) as any[]).filter((c, i) => i === 0 || pulito(testo(c)).trim()).map((c, i) => <Text key={i} numberOfLines={i === 0 ? undefined : 1} style={{ ...(i === 0 ? { flex: 1 } : { flexShrink: 0 }), fontFamily: i === 0 ? F.t600 : F.t700, fontSize: 14.5, color: cl(c, "muted") ? C.ink2 : C.ink }}>{pulito(testo(c)).trim()}</Text>)}</View>;
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

// tipi di giorno del calendario: più strada (corallo), normale (lime), corta e fiuto (giallo), riposo (bianco)
const TIPO: Record<string, [string, string, string]> = { lunga: [C.coral, C.ink, "Lunga"], normale: [C.lime, C.ink, "Normale"], fiuto: [C.yellow, C.ink, "Corta e fiuto"], riposo: [C.white, C.ink2, "Riposo"] };
const tipoDi = (n: any) => Object.keys(TIPO).find((k) => cl(n, "k-" + k));
function LegendaCal() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 6, marginTop: 10 }}>
      {Object.values(TIPO).map(([bg, , t]) => <View key={t} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: bg, borderWidth: 1, borderColor: C.sage2 }} /><Text style={{ fontFamily: F.t700, fontSize: 13, color: C.ink2 }}>{t}</Text></View>)}
    </View>
  );
}
function Calendario({ n }: { n: any }) {
  useMotore();
  const celle = (Array.from(n.children) as any[]).filter((c) => !cl(c, "cal-h"));
  const settimane: any[][] = [];
  celle.forEach((c, i) => { if (i % 7 === 0) settimane.push([]); settimane[settimane.length - 1].push(c); });
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
        {["lun", "mar", "mer", "gio", "ven", "sab", "dom"].map((g) => <Text key={g} style={{ flex: 1, textAlign: "center", fontFamily: F.t800, fontSize: 12.5, color: C.ink2, textTransform: "uppercase" }}>{g}</Text>)}
      </View>
      {settimane.map((w, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
          {w.map((c, j) => {
            const tipo = tipoDi(c), vuota = cl(c, "x") || !tipo, [bg, fg] = tipo ? TIPO[tipo] : [C.sage, C.ink2];
            const oggi = cl(c, "today"), sel = cl(c, "sel"), fatto = !!c.querySelector("i"), passato = cl(c, "past");
            const num = pulito(testo(c.querySelector("b") || c)), sotto = c.querySelector("small") ? pulito(testo(c.querySelector("small"))) : "";
            return (
              <Tocco key={j} hitSlop={0} disabled={vuota} onPress={() => tocca(c)} accessibilityLabel={c.getAttribute("aria-label") || num}
                style={{ flex: 1, minHeight: 54, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: vuota ? "transparent" : bg, opacity: passato && !sel && !oggi ? 0.55 : 1, borderWidth: sel ? 2.5 : oggi ? 2 : vuota ? 0 : 1, borderColor: sel || oggi ? C.ink : C.sage2 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.t800, fontSize: num.length > 3 ? 11 : 14, color: vuota ? C.sage2 : C.ink }}>{num}</Text>
                {sotto ? <Text numberOfLines={1} style={{ fontFamily: F.t700, fontSize: 11.5, color: fg, fontVariant: ["tabular-nums"] }}>{sotto === "riposo" ? "riposo" : sotto + " km"}</Text> : null}
                {fatto ? <View style={{ position: "absolute", top: 2, right: 3 }}><Icona nome="check" size={12} /></View> : null}
              </Tocco>
            );
          })}
        </View>
      ))}
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
        {(() => { const dn = sommario ? disegnoPer(pulito(testo(sommario.querySelector("b") || sommario))) : null; return dn ? <Disegno nome={dn} /> : null; })()}
        <View style={{ flex: 1 }}>{sommario ? <Blocchi nodi={Array.from(sommario.childNodes)} k={k + "s"} /> : null}</View>
        <View style={{ transform: [{ rotate: aperto ? "90deg" : "0deg" }] }}><Icona nome="chev" size={16} colore={C.ink2} /></View>
      </Tocco>
      {aperto ? <View style={{ paddingBottom: 14 }}><Blocchi nodi={resto} k={k + "b"} /></View> : null}
    </View>
  );
}

/** disegna l'elemento della pagina invisibile con quell'id (si aggiorna da solo quando il motore lo cambia) */
export function PaginaMotore({ id, sel, togli, senzaTitolo }: { id?: string; sel?: string; togli?: string[]; senzaTitolo?: boolean }) {
  useMotore();
  const M = motore();
  if (!M) return null;
  const el = sel ? pagina().amb.document.querySelector(sel) : pagina().el(id!);
  if (!el) return null;
  if (senzaTitolo) { const h = el.querySelector("h2"); if (h) SALTA.add(h); }
  const nodi = (Array.from(el.childNodes) as any[]).filter((c) => !(togli && c.nodeType === 1 && togli.some((s) => c.matches && c.matches(s))));
  return <View><Blocchi nodi={nodi} k={id || sel || "p"} /></View>;
}
