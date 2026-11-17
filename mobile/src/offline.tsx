// Percorsi scaricati: il tracciato, il profilo e le indicazioni restano sul telefono, così si possono
// aprire e seguire col GPS anche senza campo. (Lo sfondo della mappa senza internet si vede solo nelle zone già guardate.)
import React from "react";
import { Text, View } from "react-native";
import { C, F } from "./theme";
import { leggi, scrivi } from "./archivio";
import { motore, notifica } from "./motore";
import { Bottone, Testo } from "./ui/base";
import { strati } from "./ui/strati";

export type Scaricata = { id: string; nome: string; riga: string; o: any; t: number };
const CHIAVE = "alldogs-scaricati-app";
const tutte = (): Record<string, Scaricata> => leggi(CHIAVE) || {};

export const listaScaricate = (): Scaricata[] => Object.values(tutte()).sort((a, b) => b.t - a.t);
export const eScaricata = (id: string) => !!tutte()[id];
export function scarica(id: string, o: any, riga: string) {
  const t = tutte();
  t[id] = { id, nome: o.name, riga, o, t: Date.now() };
  scrivi(CHIAVE, t);
  notifica();
}
export function togliScaricata(id: string) {
  const t = tutte();
  delete t[id];
  scrivi(CHIAVE, t);
  notifica();
}

/** tendina "Scarica" / "Scaricata" di un percorso */
export function foglioScarica(id: string, o: any, riga: string, avvia: () => void) {
  strati.foglio({
    titolo: eScaricata(id) ? "Percorso scaricato" : "Scarica il percorso",
    corpo: () => {
      const c = eScaricata(id), M = motore();
      return (
        <View>
          <Text style={{ fontFamily: F.t800, fontSize: 16, color: C.ink }}>{o.name}</Text>
          <Testo tipo="secondo">{riga}</Testo>
          <Text style={{ fontFamily: F.t600, fontSize: 14.5, lineHeight: 20, color: C.ink, marginTop: 10 }}>
            {c ? "Tracciato, dislivello e indicazioni sono sul telefono: puoi aprirlo da Attività › Scaricate e seguirlo col GPS anche senza campo."
              : "Salvo sul telefono il tracciato, il dislivello e le indicazioni: potrai seguirlo col GPS anche senza campo."}
          </Text>
          <Testo tipo="piccolo" style={{ marginTop: 8 }}>Senza internet lo sfondo della mappa si vede solo nelle zone che hai già guardato: prima di partire apri la mappa del percorso e scorrila tutta una volta.</Testo>
          {c ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <Bottone testo="Avvia" icona="play" tinta="scuro" style={{ flex: 1.2, alignSelf: "auto" }} onPress={() => { strati.chiudiFoglio(); avvia(); }} />
              <Bottone testo="Togli" tinta="chiaro2" style={{ flex: 1, alignSelf: "auto" }} onPress={() => { togliScaricata(id); strati.chiudiFoglio(); strati.avviso("Tolto dal telefono."); }} />
            </View>
          ) : <Bottone testo="Scarica" icona="down" largo style={{ marginTop: 14 }} onPress={() => { scarica(id, o, riga); strati.avviso("Scaricato: lo trovi in Attività › Scaricate."); }} />}
        </View>
      );
    },
  });
}
