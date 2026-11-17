// Collegamenti tra il motore e le parti native che il sito faceva "da browser":
// finestrelle, foto, schermo acceso. Si applicano ogni volta che il motore viene creato.
import { aOgniAvvio, pagina } from "./motore";
import { fotoMetti, fotoPrendi } from "./foto";
import { foglioDaHtml } from "./ui/HtmlMotore";

aOgniAvvio((M) => {
  // le finestrelle del sito diventano tendine dell'app
  M.openSheet = (html: string) => { try { pagina().el("sheet").hidden = false; } catch {} foglioDaHtml(String(html)); };
  // foto sul telefono al posto del magazzino del browser
  M.photoPut = (k: string, v: string | null) => fotoMetti(String(k), v);
  M.photoGet = (k: string) => fotoPrendi(String(k));
  // parti che nel sito sistemano la pagina: qui non servono
  for (const n of ["navCompass", "navSizes", "wakeOn", "aiBottom", "syncPhoto", "syncTabDog"]) { try { M[n] = () => {}; } catch {} }
});
