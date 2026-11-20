// Passeggiata libera: GPS e mappa accesi, si cammina e basta, senza un percorso prestabilito.
// Usa la stessa schermata "In cammino" (tempo, km, passi, pausa, SOS, foto, diario) ma senza indicazioni né "fuori percorso".
import { Alert } from "react-native";
import { aOgniAvvio, motore } from "./motore";

export async function avviaPasseggiataLibera() {
  const M = motore();
  let p: number[] | null = null;
  try { p = await M.getPos(); } catch {}
  const q: number[] = p || (M.S.view && M.S.view.c) || [41.9, 12.5];
  const nome = (M.dog() && M.dog().name) || "il cane";
  const o = { kind: "free", free: true, id: null, name: `Passeggiata libera con ${nome}`, path: [q, [q[0] + 0.00002, q[1]]], ways: [[q, [q[0] + 0.00002, q[1]]]], len: 0, up: 0, loop: true, turns: [], stops: [] };
  const parti = () => M.startNav(o);
  if (!M.nav) { parti(); return; }
  Alert.alert("C'è già una passeggiata in corso", "Vuoi chiuderla senza salvarla e iniziare una passeggiata libera?", [
    { text: "No", style: "cancel" },
    { text: "Sì, nuova", style: "destructive", onPress: () => { M.stopNav(); parti(); } },
  ]);
}

aOgniAvvio((M: any) => {
  // senza percorso non c'è un "a che punto siamo" né un "fuori percorso"
  const avanti = M.navProgress;
  M.navProgress = (p: any) => { const n = M.nav; if (n && n.o && n.o.free) { n.off = 0; n.prog = 0; return; } return avanti(p); };
});
