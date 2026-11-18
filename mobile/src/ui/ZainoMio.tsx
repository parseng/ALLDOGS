// Zaino: oltre alla lista dell'app, le cose che aggiungi tu (restano salvate e si spuntano come le altre).
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { C, F } from "../theme";
import { motore, notifica, useMotore } from "../motore";
import { Bottone, Icona, Interruttore, Tocco } from "./base";
import { disegnoPer } from "./disegnini";

const CHIAVE = "alldogs-zaino-miei";
type Cosa = { t: string; ck: boolean };

export function ZainoMio() {
  useMotore();
  const M = motore();
  const [nuova, setNuova] = useState("");
  const L: Cosa[] = (M && M.store.get(CHIAVE)) || [];
  const salva = (x: Cosa[]) => { M.store.set(CHIAVE, x); notifica(); };
  const aggiungi = () => { const t = nuova.trim().slice(0, 80); if (!t) return; salva([...L, { t, ck: false }]); setNuova(""); };
  return (
    <View style={{ backgroundColor: C.cream, borderRadius: 20, padding: 14, marginTop: 14 }}>
      <Text style={{ fontFamily: F.titolo, fontSize: 19, color: C.ink }}>Le tue cose</Text>
      <Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2, marginTop: 2 }}>Aggiungi quello che porti sempre tu: restano qui anche le prossime volte.</Text>
      {L.map((x, i) => {
        const dn = disegnoPer(x.t);
        return (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 50, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.sage, alignItems: "center", justifyContent: "center" }}><Icona nome={dn || "bag"} size={dn ? 28 : 20} /></View>
            <Tocco hitSlop={0} onPress={() => salva(L.map((y, j) => (j === i ? { ...y, ck: !y.ck } : y)))} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 }} accessibilityRole="switch" accessibilityState={{ checked: x.ck }}>
              <Text style={{ flex: 1, fontFamily: F.t700, fontSize: 15, color: C.ink, textDecorationLine: x.ck ? "line-through" : "none" }}>{x.t}</Text>
              <Interruttore acceso={x.ck} />
            </Tocco>
            <Tocco onPress={() => salva(L.filter((_, j) => j !== i))} accessibilityLabel={`Togli ${x.t}`} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Icona nome="x" size={16} colore={C.ink2} /></Tocco>
          </View>
        );
      })}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <TextInput value={nuova} onChangeText={setNuova} onSubmitEditing={aggiungi} returnKeyType="done" maxLength={80} placeholder="Es. pallina, spazzola, cuccia da viaggio" placeholderTextColor={C.ink2}
          style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.sage2, paddingHorizontal: 14, fontFamily: F.t600, fontSize: 15, color: C.ink }} />
        <Bottone icona="plus" tinta="lime" onPress={aggiungi} accessibilityLabel="Aggiungi allo zaino" style={{ width: 48 }} />
      </View>
      {L.some((x) => x.ck) ? <Bottone testo="Togli tutte le spunte" tinta="chiaro2" piccolo style={{ marginTop: 10, alignSelf: "flex-start" }} onPress={() => salva(L.map((y) => ({ ...y, ck: false })))} /> : null}
    </View>
  );
}
