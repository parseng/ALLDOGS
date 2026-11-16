// Crea mobile/src/motore/web.generated.js a partire da ../index.html (l'app web).
// Lo script principale del sito viene chiuso dentro una funzione: così l'app nativa usa le STESSE regole
// (verdetti, limiti del cane, meteo, programma di allenamento…) senza riscriverle. Si rilancia a ogni modifica del sito:
//   node tools/genera-motore.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";

const QUI = fileURLToPath(new URL(".", import.meta.url));
const html = readFileSync(QUI + "../../index.html", "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
let src = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
if (src.length < 10000) throw new Error("script principale non trovato");

// Nomi che lo script si aspetta dal browser: li riceve dall'ambiente finto (src/motore/ambiente.ts)
const AMB = ["window", "document", "localStorage", "sessionStorage", "navigator", "location", "history", "fetch",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame",
  "addEventListener", "removeEventListener", "dispatchEvent", "matchMedia", "getComputedStyle", "indexedDB", "caches",
  "speechSynthesis", "SpeechSynthesisUtterance", "alert", "confirm", "prompt", "open", "scrollTo", "Image", "Event",
  "IntersectionObserver", "ResizeObserver", "MutationObserver", "innerWidth", "innerHeight", "devicePixelRatio",
  "mapboxgl", "Blob", "URL", "console"];

const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script" });
const funzioni = [], variabili = [], costanti = [];
const nomi = (id, out) => {
  if (id.type === "Identifier") out.push(id.name);
  else if (id.type === "ObjectPattern") id.properties.forEach((p) => nomi(p.value || p.argument, out));
  else if (id.type === "ArrayPattern") id.elements.forEach((e) => e && nomi(e, out));
  else if (id.type === "AssignmentPattern") nomi(id.left, out);
  else if (id.type === "RestElement") nomi(id.argument, out);
};
for (const n of ast.body) {
  if (n.type === "FunctionDeclaration") funzioni.push(n.id.name);
  else if (n.type === "VariableDeclaration") for (const d of n.declarations) nomi(d.id, n.kind === "const" ? costanti : variabili);
}
const tutti = [...funzioni, ...variabili, ...costanti];
const doppi = tutti.filter((x) => AMB.includes(x));
if (doppi.length) throw new Error("nomi in conflitto con l'ambiente: " + doppi.join(", "));

const getter = tutti.map((n) => `get ${JSON.stringify(n)}(){return ${n}}`);
const setter = [...funzioni, ...variabili].map((n) => `set ${JSON.stringify(n)}(v){${n}=v}`);

const out = `// GENERATO da tools/genera-motore.mjs a partire da index.html: non modificare a mano.
/* eslint-disable */
// @ts-nocheck
export function creaMotore(__amb){
const {${AMB.join(",")}}=__amb;
${src}
return {${[...getter, ...setter].join(",\n")}};
}
`;
mkdirSync(QUI + "../src/motore", { recursive: true });
writeFileSync(QUI + "../src/motore/web.generated.js", out);
console.log(`motore creato: ${funzioni.length} funzioni, ${variabili.length + costanti.length} valori, ${(out.length / 1024).toFixed(0)} KB`);
