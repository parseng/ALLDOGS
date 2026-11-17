// La foto del cane come "avatar" in tutta l'app: un invito (che si può chiudere) e la scelta dalle impostazioni.
import React from "react";
import { Text, View } from "react-native";
import { C, F, MARGINE } from "../theme";
import { motore, notifica, useMotore } from "../motore";
import { scegliFoto } from "../foto";
import { Bottone, Icona, Tocco } from "./base";
import { FotoCane, fotoCane, nomeCane } from "./BarraMenu";
import { strati } from "./strati";

const CHIAVE = () => "alldogs-fotoinvito-" + (motore().DOGS.cur || "d1");

/** sceglie la foto dalla galleria (o la scatta) e la salva come avatar del cane attuale */
export async function cambiaFotoCane(camera = false) {
  const M = motore();
  const f = await scegliFoto({ camera, quadrata: true, lato: 640, base64: true });
  if (f && f.dati) { M.store.set(M.PHK, f.dati); notifica(); strati.avviso("Foto salvata: ora è l'avatar di " + nomeCane()); }
}

/** invito a mettere la foto: appare finché non c'è una foto o finché non lo chiudi con la X */
export function InvitoFoto() {
  useMotore();
  const M = motore();
  let chiuso = false;
  try { chiuso = !!M.store.get(CHIAVE()); } catch {}
  if (!M || fotoCane() || chiuso) return null;
  const nome = nomeCane();
  return (
    <View style={{ marginHorizontal: MARGINE, marginTop: 14, backgroundColor: C.cream, borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <FotoCane size={54} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.t800, fontSize: 15.5, color: C.ink }}>Metti la foto di {nome}</Text>
        <Text style={{ fontFamily: F.t600, fontSize: 13, color: C.ink2, marginTop: 2 }}>Diventa il suo avatar in tutta l'app.</Text>
        <Bottone testo="Scegli la foto" tinta="lime" piccolo style={{ marginTop: 8, alignSelf: "flex-start" }} onPress={() => cambiaFotoCane()} />
      </View>
      <Tocco onPress={() => { M.store.set(CHIAVE(), 1); notifica(); }} accessibilityLabel="Chiudi l'invito" style={{ position: "absolute", right: 6, top: 6, width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
        <Icona nome="x" size={16} colore={C.ink2} />
      </Tocco>
    </View>
  );
}

/** riga delle impostazioni: anteprima dell'avatar e bottoni per cambiarlo */
export function SceltaAvatar() {
  useMotore();
  const M = motore(), nome = nomeCane(), presente = !!fotoCane();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <FotoCane size={72} />
      <View style={{ flex: 1, gap: 8 }}>
        <Bottone testo={presente ? "Cambia foto" : "Scegli dalla galleria"} tinta="chiaro2" piccolo style={{ alignSelf: "flex-start" }} onPress={() => cambiaFotoCane()} />
        <Bottone testo="Scatta una foto" tinta="chiaro2" piccolo style={{ alignSelf: "flex-start" }} onPress={() => cambiaFotoCane(true)} />
        {presente ? <Bottone testo="Togli la foto" tinta="chiaro2" piccolo style={{ alignSelf: "flex-start" }} onPress={() => { M.store.del(M.PHK); notifica(); strati.avviso(`Foto di ${nome} tolta`); }} /> : null}
      </View>
    </View>
  );
}
