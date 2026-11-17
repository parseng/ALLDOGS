// La faccina della mascotte (Gohan) nei messaggi dell'assistente: è lui che parla, non la foto del tuo cane.
import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { F } from "../theme";
import { TESTA_GOHAN } from "../mappa/testa-gohan";

export function FacciaGohan({ size = 32 }: { size?: number }) {
  return <Image source={{ uri: TESTA_GOHAN }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" accessibilityLabel="Gohan" />;
}

/** "Sto pensando…" mentre l'assistente risponde: solo la scritta con la faccina, senza riquadro */
export function StoPensando({ colore }: { colore: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" }}>
      <FacciaGohan size={26} />
      <Text style={{ fontFamily: F.t600, fontSize: 15, color: colore, fontStyle: "italic" }}>Sto pensando…</Text>
    </View>
  );
}
