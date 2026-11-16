// Alcune finestrelle del sito (un luogo sulla mappa, una fontanella, l'emergenza…) arrivano dal motore già scritte
// come pezzetti di pagina web. Qui vengono tradotte nei componenti dell'app, con lo stile nuovo.
import React from "react";
import { Linking, Text, View } from "react-native";
import { C, F } from "../theme";
import { pagina, pulito } from "../motore";
import { Bottone } from "./base";
import { strati } from "./strati";

type Nodo = { tag: string; attr: Record<string, string>; figli: (Nodo | string)[] };
const VUOTI = new Set(["br", "input", "img", "use", "hr", "path", "circle", "rect", "line"]);
const BLOCCHI = new Set(["div", "p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "a.btn", "button", "label", "details", "summary", "figure", "nav", "section", "article"]);

export function analizza(html: string): Nodo {
  const radice: Nodo = { tag: "root", attr: {}, figli: [] };
  const pila = [radice];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)\s*>|<([a-zA-Z0-9]+)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const cima = pila[pila.length - 1];
    if (m[1]) { const t = m[1].toLowerCase(); for (let i = pila.length - 1; i > 0; i--) if (pila[i].tag === t) { pila.length = i; break; } }
    else if (m[2]) {
      const attr: Record<string, string> = {};
      const ra = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
      let a: RegExpExecArray | null;
      while ((a = ra.exec(m[3] || ""))) attr[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? "";
      const n: Nodo = { tag: m[2].toLowerCase(), attr, figli: [] };
      cima.figli.push(n);
      if (!m[4] && !VUOTI.has(n.tag)) pila.push(n);
    } else if (m[5]) cima.figli.push(m[5]);
  }
  return radice;
}
const ha = (n: Nodo, c: string) => (" " + (n.attr.class || "") + " ").includes(" " + c + " ");
const eBlocco = (n: Nodo | string) => typeof n !== "string" && (BLOCCHI.has(n.tag) || (n.tag === "a" && ha(n, "btn")) || (n.tag === "span" && ha(n, "box")));
const testoDi = (n: Nodo | string): string => (typeof n === "string" ? n : n.tag === "svg" ? "" : n.figli.map(testoDi).join(""));

function inLinea(n: Nodo | string, k: number): React.ReactNode {
  if (typeof n === "string") return pulito(n.replace(/\s+/g, " "));
  if (n.tag === "svg" || n.tag === "input") return null;
  if (n.tag === "br") return "\n";
  const st: any = {};
  if (n.tag === "b" || n.tag === "strong") st.fontFamily = F.t800;
  if (n.tag === "small" || ha(n, "small")) st.fontSize = 13;
  if (ha(n, "muted")) st.color = C.ink2;
  if (ha(n, "c1")) st.color = C.warnInk;
  if (ha(n, "c2")) st.color = C.dangerInk;
  if (n.tag === "a" && n.attr.href) return <Text key={k} style={{ textDecorationLine: "underline", fontFamily: F.t700 }} onPress={() => apri(n.attr.href)}>{n.figli.map(inLinea)}</Text>;
  return <Text key={k} style={st}>{n.figli.map(inLinea)}</Text>;
}
function apri(href: string) {
  if (/^(tel:|mailto:|https?:)/.test(href)) Linking.openURL(href).catch(() => {});
  else if (href.startsWith("#")) { strati.chiudiFoglio(); pagina().amb.location.hash = href; }
}
function premi(id: string) {
  const el = pagina().el(id);
  el.click();
  // nel sito molte finestrelle si chiudono da sole dopo il tocco
  if (pagina().el("sheet").hidden) strati.chiudiFoglio();
}

function blocchi(figli: (Nodo | string)[], pref: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let riga: (Nodo | string)[] = [];
  const chiudi = () => {
    if (riga.some((x) => testoDi(x).trim())) out.push(<Text key={pref + out.length} style={{ fontFamily: F.t500, fontSize: 15, lineHeight: 21, color: C.ink, marginTop: 6 }}>{riga.map(inLinea)}</Text>);
    riga = [];
  };
  figli.forEach((n) => {
    if (!eBlocco(n)) { riga.push(n); return; }
    chiudi();
    const b = n as Nodo, k = pref + out.length;
    if (b.attr.hidden != null) return;
    if (b.tag === "button" || (b.tag === "a" && ha(b, "btn"))) {
      const t = pulito(testoDi(b)).trim();
      if (!t || b.attr.id === "sheet-x" || b.attr.id === "sheet-xx") return;
      out.push(<Bottone key={k} testo={t} largo={ha(b, "wide") || !ha(b, "sm")} piccolo={ha(b, "sm")} tinta={ha(b, "pri") ? "lime" : "chiaro2"} style={{ marginTop: 8 }} onPress={() => (b.tag === "a" ? apri(b.attr.href || "") : b.attr.id ? premi(b.attr.id) : undefined)} />);
      return;
    }
    if (/^h[1-4]$/.test(b.tag)) { out.push(<Text key={k} accessibilityRole="header" style={{ fontFamily: F.titolo, fontSize: b.tag === "h3" ? 18 : 22, letterSpacing: -0.4, color: C.ink, marginTop: out.length ? 14 : 2 }}>{pulito(testoDi(b))}</Text>); return; }
    if (b.tag === "li") { out.push(<View key={k} style={{ flexDirection: "row", gap: 8, marginTop: 4 }}><Text style={{ fontFamily: F.t800, color: C.ink2 }}>•</Text><View style={{ flex: 1 }}>{blocchi(b.figli, k)}</View></View>); return; }
    const dentro = blocchi(b.figli, k + "-");
    if (!dentro.length) return;
    const fila = ha(b, "row");
    out.push(
      <View key={k} style={[{ marginTop: ha(b, "stack") || ha(b, "block") ? 10 : 0 }, ha(b, "box") || ha(b, "hz") ? { backgroundColor: C.sage, borderRadius: 14, padding: 12, marginTop: 8 } : null, fila ? { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" } : null, ha(b, "muted") ? { opacity: 0.8 } : null]}>
        {dentro}
      </View>,
    );
  });
  chiudi();
  return out;
}

export function HtmlMotore({ html }: { html: string }) {
  return <View>{blocchi(analizza(html).figli, "h")}</View>;
}

/** apre una finestrella del sito come tendina dell'app; il primo titolo diventa il titolo della tendina */
export function foglioDaHtml(html: string) {
  let titolo = "AllDogs";
  const m = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(html);
  if (m) { titolo = pulito(m[1]).trim(); html = html.replace(m[0], ""); }
  strati.foglio({ titolo, corpo: () => <HtmlMotore html={html} />, alChiudere: () => { try { pagina().el("sheet").hidden = true; } catch {} } });
}
