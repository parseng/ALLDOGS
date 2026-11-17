// Disegnini colorati (stesso stile delle icone del profilo: contorno scuro, colori pastello) da mettere accanto
// alle voci di Zaino, Pronto soccorso ed Emergenza. disegnoPer(testo) sceglie quello giusto dalle parole della voce.
const K = "#171C14", CR = "#FBF7EC", BL = "#A9D3E6", LI = "#DDF06A", CO = "#F08A6E", GI = "#F6CB45", VE = "#8CC79A", RO = "#F4B6B0", MA = "#B7835A";
const g = (x: string) => `<g stroke="${K}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">${x}</g>`;
const d = (xml: string) => ({ vb: "0 0 32 32", xml: g(xml) });

export const DISEGNI: Record<string, { vb: string; xml: string }> = {
  "d-acqua": d(`<rect x="13" y="3.5" width="6" height="4.5" rx="1.2" fill="${CO}"/><path d="M12 8h8l1.5 3v15a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 10.5 26V11z" fill="${CR}"/><path d="M10.5 16h11v10a2.5 2.5 0 0 1-2.5 2.5h-6a2.5 2.5 0 0 1-2.5-2.5z" fill="${BL}"/>`),
  "d-ciotola": d(`<path d="M4 15h24l-2.6 9.2a3 3 0 0 1-2.9 2.3H9.5a3 3 0 0 1-2.9-2.3z" fill="${CO}"/><ellipse cx="16" cy="15" rx="12" ry="3" fill="${BL}"/><path d="M11 21.5c1.5-1.2 3-1.2 4.5 0" fill="none" stroke="#fff"/>`),
  "d-guinzaglio": d(`<circle cx="9" cy="9" r="5" fill="none" stroke-width="3" stroke="${CO}"/><circle cx="9" cy="9" r="5" fill="none"/><path d="M12.5 12.5 21 21" fill="none"/><rect x="19" y="19.5" width="6" height="8" rx="2" transform="rotate(-45 22 23.5)" fill="${GI}"/>`),
  "d-sacchetti": d(`<path d="M9 11h14l1.5 15a2 2 0 0 1-2 2.2h-13a2 2 0 0 1-2-2.2z" fill="${VE}"/><path d="M12 11c0-3 1.5-5 4-5s4 2 4 5" fill="none"/><path d="M13 7.5 11 4.5M19 7.5l2-3" fill="none"/><circle cx="16" cy="19.5" r="2.4" fill="${CR}"/>`),
  "d-medaglietta": d(`<circle cx="16" cy="6" r="2.5" fill="none"/><circle cx="16" cy="18" r="9.5" fill="${GI}"/><circle cx="16" cy="20" r="2.6" fill="${K}" stroke="none"/><circle cx="12.4" cy="16" r="1.3" fill="${K}" stroke="none"/><circle cx="15" cy="13.8" r="1.3" fill="${K}" stroke="none"/><circle cx="17.9" cy="13.8" r="1.3" fill="${K}" stroke="none"/><circle cx="20.4" cy="16" r="1.3" fill="${K}" stroke="none"/>`),
  "d-premietti": d(`<path d="M8.5 12.5a3 3 0 1 1 3.5-3.5l9 9a3 3 0 1 1 3.5 3.5 3 3 0 1 1-3.5 3.5 3 3 0 1 1-3.5-3.5l-9-9A3 3 0 1 1 5 8.5a3 3 0 1 1 3.5 4z" fill="${CR}"/>`),
  "d-kit": d(`<rect x="4" y="9" width="24" height="18" rx="3" fill="${CO}"/><path d="M12 9V6.5A1.5 1.5 0 0 1 13.5 5h5A1.5 1.5 0 0 1 20 6.5V9" fill="none"/><path d="M14 13h4v3h3v4h-3v3h-4v-3h-3v-4h3z" fill="#fff"/>`),
  "d-telefono": d(`<rect x="9" y="3.5" width="14" height="25" rx="3" fill="${CR}"/><rect x="11.5" y="7" width="9" height="15" rx="1" fill="${BL}"/><circle cx="16" cy="25" r="1.2" fill="${K}" stroke="none"/>`),
  "d-asciugamano": d(`<path d="M7 5h18v22H7z" fill="${BL}"/><path d="M7 10h18M7 21h18" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M7 5h18v22H7z" fill="none"/><path d="M5 5h22" fill="none"/>`),
  "d-zampa": d(`<ellipse cx="16" cy="21" rx="6.5" ry="5.5" fill="${RO}"/><ellipse cx="8" cy="13.5" rx="2.6" ry="3.2" fill="${RO}"/><ellipse cx="12.8" cy="8.5" rx="2.6" ry="3.2" fill="${RO}"/><ellipse cx="19.2" cy="8.5" rx="2.6" ry="3.2" fill="${RO}"/><ellipse cx="24" cy="13.5" rx="2.6" ry="3.2" fill="${RO}"/>`),
  "d-coperta": d(`<path d="M5 9h22l-2 17H7z" fill="${GI}"/><path d="M8.5 13l4 4 4-4 4 4 4-4" fill="none" stroke="#fff" stroke-width="2"/><path d="M5 9h22l-2 17H7z" fill="none"/>`),
  "d-ombrellone": d(`<path d="M3.5 14C5 7 10 4 16 4s11 3 12.5 10c-2-1.5-4-1.5-6 0-2-1.5-4.5-1.5-6.5 0-2-1.5-4.5-1.5-6.5 0-2-1.5-4-1.5-6 0z" fill="${CO}"/><path d="M16 14v13" fill="none"/><path d="M4 28c3-1.5 6-1.5 9 0s6 1.5 9 0 4-1 6-.5" fill="none" stroke="${BL}" stroke-width="2"/>`),
  "d-luce": d(`<path d="M17 3l6 6-9 9-6-6z" fill="${CR}"/><path d="M8 12l-4 4 6 6 4-4" fill="${K}"/><path d="M21 15l7 2M18 19l3 7M23 12l6-2" fill="none" stroke="${GI}" stroke-width="2.4"/>`),
  "d-pinzetta": d(`<path d="M6 26 22 6M10 28 26 8" fill="none" stroke-width="2.4"/><path d="M22 6l4 2" fill="none"/><ellipse cx="7.5" cy="9" rx="3.2" ry="2.5" fill="${MA}"/><path d="M5 7 3 5M6 11.5 3.5 13M10 7l2-2.5M10.5 11l2 1.5" fill="none" stroke-width="1.4"/>`),
  "d-cappottino": d(`<path d="M6 10c3-3 7-4 10-4s7 1 10 4l-2 5-2-1v12H10V14l-2 1z" fill="${RO}"/><path d="M13 6.5c0 2 1.3 3 3 3s3-1 3-3" fill="none"/>`),
  "d-sole": d(`<circle cx="16" cy="16" r="6" fill="${GI}"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" fill="none"/>`),
  "d-spiga": d(`<path d="M16 29V10" fill="none"/><path d="M16 10c-3-1-4-4-4-7 3 1 4 4 4 7zM16 10c3-1 4-4 4-7-3 1-4 4-4 7zM16 16c-3-1-5-3-5.5-6 3 .5 5 3 5.5 6zM16 16c3-1 5-3 5.5-6-3 .5-5 3-5.5 6zM16 22c-3-1-5-3-5.5-6 3 .5 5 3 5.5 6zM16 22c3-1 5-3 5.5-6-3 .5-5 3-5.5 6z" fill="${GI}"/>`),
  "d-zecca": d(`<path d="M9 13 4 10M9 17H3.5M9.5 21 5 25M23 13l5-3M23 17h5.5M22.5 21l4.5 4" fill="none"/><ellipse cx="16" cy="18.5" rx="7.5" ry="8.5" fill="${MA}"/><circle cx="16" cy="8.5" r="3" fill="${K}" stroke="none"/><path d="M12.5 15c2-1.5 5-1.5 7 0" fill="none" stroke="${CR}" stroke-width="1.4"/>`),
  "d-cerotto": d(`<rect x="3" y="11" width="26" height="10" rx="5" transform="rotate(-35 16 16)" fill="${RO}"/><rect x="11" y="12" width="10" height="8" rx="1" transform="rotate(-35 16 16)" fill="${CR}"/><circle cx="14.5" cy="15.5" r=".8" fill="${K}" stroke="none"/><circle cx="17.5" cy="16.5" r=".8" fill="${K}" stroke="none"/>`),
  "d-vipera": d(`<path d="M6 26c4 2 9 0 9-4s-7-3-7-7 4-5 8-5 6-2 6-4" fill="none" stroke="${K}" stroke-width="5.6"/><path d="M6 26c4 2 9 0 9-4s-7-3-7-7 4-5 8-5 6-2 6-4" fill="none" stroke="${VE}" stroke-width="3.2"/><ellipse cx="23" cy="5.5" rx="4" ry="3" fill="${VE}"/><circle cx="24" cy="4.8" r=".9" fill="${K}" stroke="none"/><path d="M27 6l2.5 1M27 6l2 2" fill="none" stroke="${CO}" stroke-width="1.2"/>`),
  "d-bruco": d(`${[5, 10.5, 16, 21.5].map((x) => `<circle cx="${x}" cy="19" r="3.6" fill="${GI}"/><path d="M${x} 15.4v-3M${x - 2.5} 16l-1.5-2.5M${x + 2.5} 16l1.5-2.5" fill="none" stroke-width="1.2"/>`).join("")}<circle cx="27" cy="18" r="3.8" fill="${MA}"/><circle cx="28" cy="17" r=".9" fill="${K}" stroke="none"/>`),
  "d-veleno": d(`<path d="M16 3 29.5 27H2.5z" fill="${GI}"/><path d="M16 11v8" fill="none" stroke-width="2.6"/><circle cx="16" cy="23" r="1.5" fill="${K}" stroke="none"/>`),
  "d-ape": d(`<ellipse cx="11" cy="10" rx="4.5" ry="3.5" fill="${BL}" transform="rotate(-25 11 10)"/><ellipse cx="19" cy="9" rx="4.5" ry="3.5" fill="${BL}" transform="rotate(25 19 9)"/><ellipse cx="15" cy="19" rx="9" ry="6.5" fill="${GI}"/><path d="M12 13v12M17 13v12" fill="none" stroke-width="2.4"/><path d="M24 19h4" fill="none"/>`),
  "d-zoppia": d(`<path d="M10 4v12c0 4 2 8 6 8h7a3 3 0 0 0 0-6h-4c-2 0-3-1-3-3V4z" fill="${RO}"/><path d="M7 26h20" fill="none"/><path d="M24 7l2-2M27 10l2.5-.5M21 6l.5-2.5" fill="none" stroke="${CO}" stroke-width="2"/>`),
  "d-pancia": d(`<ellipse cx="16" cy="17" rx="11" ry="9" fill="${RO}"/><path d="M11 17c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0" fill="none"/><path d="M16 3v4M10 4.5l1.5 3M22 4.5l-1.5 3" fill="none" stroke="${CO}" stroke-width="2"/>`),
  "d-freddo": d(`<path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13" fill="none" stroke="${K}" stroke-width="4.6"/><path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13" fill="none" stroke="${BL}" stroke-width="2.4"/><path d="M13 5.5l3 3 3-3M13 26.5l3-3 3 3" fill="none" stroke-width="1.4"/>`),
  "d-fulmine": d(`<path d="M18 2.5 7 18h7l-2 11.5L25 13h-7.5z" fill="${GI}"/>`),
  "d-veterinario": d(`<path d="M4 14 16 4l12 10v13H4z" fill="${CR}"/><path d="M14 13h4v3h3v4h-3v3h-4v-3h-3v-4h3z" fill="${CO}"/>`),
  "d-chiama": d(`<path d="M8 4h5l2 6-3 2a15 15 0 0 0 8 8l2-3 6 2v5a2 2 0 0 1-2 2C14 26 6 18 6 6a2 2 0 0 1 2-2z" fill="${CO}"/>`),
  "d-posizione": d(`<path d="M16 29s-9-8.5-9-15a9 9 0 0 1 18 0c0 6.5-9 15-9 15z" fill="${LI}"/><circle cx="16" cy="14" r="3.5" fill="${CR}"/>`),
  "d-cerca": d(`<circle cx="13.5" cy="13.5" r="8.5" fill="${BL}"/><path d="M20 20l7.5 7.5" fill="none" stroke-width="3.2"/><path d="M10 11a4 4 0 0 1 4-3" fill="none" stroke="#fff" stroke-width="1.6"/>`),
  "d-acqua-onde": d(`<path d="M3 11c3-2 5-2 8 0s5 2 8 0 5-2 8 0M3 18c3-2 5-2 8 0s5 2 8 0 5-2 8 0M3 25c3-2 5-2 8 0s5 2 8 0 5-2 8 0" fill="none" stroke="${K}" stroke-width="4"/><path d="M3 11c3-2 5-2 8 0s5 2 8 0 5-2 8 0M3 18c3-2 5-2 8 0s5 2 8 0 5-2 8 0M3 25c3-2 5-2 8 0s5 2 8 0 5-2 8 0" fill="none" stroke="${BL}" stroke-width="2"/>`),
  "d-cuore": d(`<path d="M16 27S4 19.5 4 11.5A6 6 0 0 1 16 9a6 6 0 0 1 12 2.5C28 19.5 16 27 16 27z" fill="${CO}"/><path d="M8 15h4l2-3 3 6 2-3h5" fill="none" stroke="#fff" stroke-width="1.8"/>`),
};

const REGOLE: [RegExp, string][] = [
  [/colpo di calore|caldo|scotta|asfalto/i, "d-sole"], [/forasac|spigh/i, "d-spiga"], [/tirazecch/i, "d-pinzetta"], [/zecc/i, "d-zecca"],
  [/taglio|spina|vetro|ferit/i, "d-cerotto"], [/vipera|serpent/i, "d-vipera"], [/processionaria|bruc/i, "d-bruco"],
  [/mangiato|avvelen|esche|veleno|tossic/i, "d-veleno"], [/api|vespe|punture/i, "d-ape"], [/zoppia|storta|zoppica/i, "d-zoppia"],
  [/pancia|torsione|conati/i, "d-pancia"], [/freddo|ipotermia|gelo/i, "d-freddo"], [/convulsion|svenut|crisi/i, "d-fulmine"],
  [/annega|acqua alta|corrente/i, "d-acqua-onde"], [/respir|cuore|battito/i, "d-cuore"],
  [/acqua dolce|sciacquar/i, "d-acqua"], [/acqua per|litr|borraccia|^acqua/i, "d-acqua"], [/ciotola/i, "d-ciotola"],
  [/pettorina|guinzaglio/i, "d-guinzaglio"], [/sacchett/i, "d-sacchetti"], [/medagliett|microchip/i, "d-medaglietta"],
  [/premiett|pasto|snack/i, "d-premietti"], [/kit|primo soccorso|garze/i, "d-kit"], [/telefono carico|telefono/i, "d-telefono"],
  [/cappottino/i, "d-cappottino"], [/asciugaman|bandana|impermeabile/i, "d-asciugamano"], [/calzari|polpastrell|crema/i, "d-zampa"],
  [/coperta|isotermic/i, "d-coperta"], [/ombrellone|telo|ombra/i, "d-ombrellone"], [/luce|luminoso|torcia/i, "d-luce"],
  [/chiama il 112|112|chiama/i, "d-chiama"], [/manda a qualcuno|dove sono|posizione|portami/i, "d-posizione"],
  [/cerca un veterinario|aperto qui vicino/i, "d-cerca"], [/veterinari|vet\b|clinica|ambulatorio/i, "d-veterinario"],
];

/** il disegnino che va bene per questa voce (o null) */
export function disegnoPer(testo: string): string | null {
  const t = String(testo || "");
  for (const [r, n] of REGOLE) if (r.test(t)) return n;
  return null;
}
