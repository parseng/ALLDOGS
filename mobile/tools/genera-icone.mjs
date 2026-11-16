// Copia le icone del prototipo approvato (repo/design/index.html) in src/ui/icone.generated.ts,
// così nell'app sono identiche. Uso: node tools/genera-icone.mjs [percorso del prototipo]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const QUI = fileURLToPath(new URL(".", import.meta.url));
const file = process.argv[2] || QUI + "../../../repo/design/index.html";
const html = readFileSync(file, "utf8");

const sym = {};
for (const m of html.matchAll(/<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g)) sym[m[1]] = { vb: m[2], xml: m[3] };
const defs = {};
for (const m of html.matchAll(/<path id="([^"]+)" d="([^"]+)"\/>/g)) defs[m[1]] = m[2];

const attr = (s, n) => (s.match(new RegExp(`(?:^|\\s)${n}="([^"]*)"`)) || [])[1];
function risolvi(xml, giro = 0) {
  if (giro > 4) return xml;
  return xml.replace(/<use ([^>]*?)\/>/g, (tutto, a) => {
    const id = (attr(a, "href") || "").slice(1);
    const resto = a.replace(/\s*href="[^"]*"/, "").replace(/\s*style="[^"]*"/, "").trim();
    const col = ((attr(a, "style") || "").match(/color:([^;"]+)/) || [])[1];
    if (defs[id]) return `<path d="${defs[id]}" ${resto}/>`;
    const s = sym[id];
    if (!s) return "";
    let dentro = risolvi(s.xml, giro + 1);
    if (col) dentro = dentro.replaceAll("currentColor", col);
    const pos = ["x", "y", "width", "height"].map((k) => (attr(a, k) != null ? `${k}="${attr(a, k)}"` : "")).join(" ");
    return pos.trim() ? `<svg ${pos} viewBox="${s.vb}">${dentro}</svg>` : dentro;
  });
}
const out = {};
for (const [id, s] of Object.entries(sym)) out[id.replace(/^i-/, "")] = { vb: s.vb, xml: risolvi(s.xml) };

writeFileSync(
  QUI + "../src/ui/icone.generated.ts",
  `// GENERATO da tools/genera-icone.mjs a partire dal prototipo approvato: non modificare a mano.\nexport const ICONE: Record<string, { vb: string; xml: string }> = ${JSON.stringify(out, null, 1)};\n`,
);
console.log("icone:", Object.keys(out).join(" "));
