// Collegamenti tra il motore e le parti native che il sito faceva "da browser":
// finestrelle, foto, schermo acceso. Si applicano ogni volta che il motore viene creato.
import "react-native-url-polyfill/auto";
import React from "react";
import { createClient } from "@supabase/supabase-js";
import { archivio } from "./archivio";
import { usaSupabase } from "./motore";
import { aOgniAvvio, notifica, pagina, pulito, useMotore } from "./motore";
import { fotoMetti, fotoPrendi } from "./foto";
import { PaginaMotore } from "./ui/PaginaMotore";
import { strati } from "./ui/strati";

// account: la stessa libreria del sito, con la sessione salvata nella memoria dell'app
usaSupabase({ createClient: (url: string, key: string, o: any) => createClient(url, key, { ...o, auth: { ...(o && o.auth), storage: archivio, detectSessionInUrl: false } }) });

// la finestrella del sito (#sheet) diventa una tendina dell'app che resta "viva": i suoi bottoni funzionano
function CorpoFinestrella() {
  useMotore();
  const box = pagina().el("sheet-box");
  if (pagina().el("sheet").hidden) setTimeout(() => strati.chiudiFoglio(), 0);
  return <PaginaMotore id="sheet-box" togli={["#sheet-x", "#sheet-xx", "h2:first-of-type", ".shx"]} />;
}

aOgniAvvio((M) => {
  const apri = M.openSheet;
  M.openSheet = (html: string) => {
    apri(html); // il sito scrive la finestrella e collega i suoi bottoni
    const sheet = pagina().el("sheet");
    sheet.hidden = false;
    const h2 = pagina().el("sheet-box").querySelector("h2");
    strati.foglio({ titolo: h2 ? pulito(h2.textContent).trim() : "AllDogs", pieno: true, corpo: () => <CorpoFinestrella />, alChiudere: () => { sheet.hidden = true; notifica(); } });
  };
  // foto sul telefono al posto del magazzino del browser
  M.photoPut = (k: string, v: string | null) => fotoMetti(String(k), v);
  M.photoGet = (k: string) => fotoPrendi(String(k));
  // parti che nel sito sistemano la pagina: qui non servono
  for (const n of ["navCompass", "navSizes", "wakeOn", "aiBottom", "syncPhoto", "syncTabDog"]) { try { M[n] = () => {}; } catch {} }
});
