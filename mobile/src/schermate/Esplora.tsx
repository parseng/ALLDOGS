import React from "react";
import { View } from "react-native";
import { Testo } from "../ui/base";
export function Esplora({ attiva }: { attiva: boolean }) {
  return <View style={{ flex: 1, paddingTop: 80, paddingHorizontal: 18 }}><Testo tipo="testata">Esplora</Testo></View>;
}
