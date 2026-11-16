// La "memoria del telefono" dell'app. Il motore (le regole del sito) legge e scrive subito, senza aspettare:
// per questo all'avvio carico tutto in memoria e poi ogni modifica viene anche salvata sul telefono.
import AsyncStorage from "@react-native-async-storage/async-storage";

const mem = new Map<string, string>();
let pronto = false;

export async function caricaArchivio(): Promise<void> {
  if (pronto) return;
  try {
    const chiavi = await AsyncStorage.getAllKeys();
    // a gruppi: su Android una lettura troppo grande in un colpo solo può fallire
    for (let i = 0; i < chiavi.length; i += 20) {
      const coppie = await AsyncStorage.multiGet(chiavi.slice(i, i + 20));
      for (const [k, v] of coppie) if (v != null) mem.set(k, v);
    }
  } catch (e) {
    console.warn("archivio: non riesco a leggere i dati salvati", e);
  }
  pronto = true;
}

export const archivio = {
  getItem(k: string): string | null {
    return mem.has(k) ? (mem.get(k) as string) : null;
  },
  setItem(k: string, v: string): void {
    v = String(v);
    if (mem.get(k) === v) return;
    mem.set(k, v);
    AsyncStorage.setItem(k, v).catch((e) => console.warn("archivio: salvataggio non riuscito", k, e));
  },
  removeItem(k: string): void {
    if (!mem.has(k)) return;
    mem.delete(k);
    AsyncStorage.removeItem(k).catch(() => {});
  },
  clear(): void {
    mem.clear();
    AsyncStorage.clear().catch(() => {});
  },
  key(i: number): string | null {
    return [...mem.keys()][i] ?? null;
  },
  get length(): number {
    return mem.size;
  },
  chiavi(): string[] {
    return [...mem.keys()];
  },
};

export function leggi<T = any>(k: string): T | null {
  try {
    const v = archivio.getItem(k);
    return v == null ? null : (JSON.parse(v) as T);
  } catch {
    return null;
  }
}
export function scrivi(k: string, v: unknown): void {
  archivio.setItem(k, JSON.stringify(v));
}
