// Foto: scelta dalla galleria o dalla fotocamera, rimpicciolite e salvate sul telefono.
// Sostituisce il "magazzino delle foto" del sito (che nel browser stava in IndexedDB).
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SaveFormat, manipulateAsync } from "expo-image-manipulator";
import * as FS from "expo-file-system/legacy";
import { leggi, scrivi } from "./archivio";
import { avvisa } from "./motore";

const CARTELLA = (FS.documentDirectory || "") + "foto/";
const nomeFile = (k: string) => CARTELLA + String(k).replace(/[^a-zA-Z0-9_-]/g, "_") + ".jpg";
const WEB = Platform.OS === "web";

/** apre galleria o fotocamera; restituisce l'immagine rimpicciolita (indirizzo sul telefono + testo "data:" se chiesto) */
export async function scegliFoto(o: { camera?: boolean; quadrata?: boolean; lato?: number; base64?: boolean } = {}): Promise<{ uri: string; dati?: string } | null> {
  try {
    if (o.camera) {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) { avvisa("Per scattare una foto serve il permesso della fotocamera."); return null; }
    }
    const opz: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: !!o.quadrata, aspect: o.quadrata ? [1, 1] : undefined, quality: 0.9 };
    const r = o.camera ? await ImagePicker.launchCameraAsync(opz) : await ImagePicker.launchImageLibraryAsync(opz);
    if (r.canceled || !r.assets || !r.assets[0]) return null;
    const a = r.assets[0], lato = o.lato || 1000;
    const scala = Math.min(1, lato / Math.max(a.width || lato, a.height || lato));
    const azioni: any[] = [];
    if (o.quadrata && a.width && a.height && a.width !== a.height) { const q = Math.min(a.width, a.height); azioni.push({ crop: { originX: (a.width - q) / 2, originY: (a.height - q) / 2, width: q, height: q } }); }
    if (scala < 1 || o.quadrata) azioni.push({ resize: o.quadrata ? { width: lato, height: lato } : { width: Math.round((a.width || lato) * scala) } });
    const m = await manipulateAsync(a.uri, azioni, { compress: 0.78, format: SaveFormat.JPEG, base64: !!o.base64 });
    return { uri: m.uri, dati: m.base64 ? "data:image/jpeg;base64," + m.base64 : undefined };
  } catch (e) {
    avvisa("Non riesco a leggere questa immagine");
    return null;
  }
}

/** salva (o toglie, con v vuoto) una foto con un nome; v = indirizzo di un file oppure testo "data:" */
export async function fotoMetti(k: string, v: string | null): Promise<void> {
  if (WEB) { const t = leggi<Record<string, string>>("alldogs-foto-web") || {}; if (v) t[k] = v; else delete t[k]; scrivi("alldogs-foto-web", t); return; }
  await FS.makeDirectoryAsync(CARTELLA, { intermediates: true }).catch(() => {});
  const f = nomeFile(k);
  if (!v) { await FS.deleteAsync(f, { idempotent: true }).catch(() => {}); return; }
  if (v.startsWith("data:")) await FS.writeAsStringAsync(f, v.slice(v.indexOf(",") + 1), { encoding: FS.EncodingType.Base64 });
  else if (v !== f) await FS.copyAsync({ from: v, to: f });
}
/** indirizzo della foto salvata con quel nome, o null */
export async function fotoPrendi(k: string): Promise<string | null> {
  if (WEB) return (leggi<Record<string, string>>("alldogs-foto-web") || {})[k] || null;
  try { const f = nomeFile(k), i = await FS.getInfoAsync(f); return i.exists ? f : null; } catch { return null; }
}
