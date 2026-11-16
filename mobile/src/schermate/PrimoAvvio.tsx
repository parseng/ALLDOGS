// Primo avvio: poche domande corte sul cane, con Gohan animato. Alla fine il profilo viene salvato
// con le stesse regole del sito (motore: wzFinish), così limiti e verdetti partono subito giusti.
import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "../theme";
import { motore, pulito } from "../motore";
import { Bottone, BottoneTondo, Chip, Disegno, Entra, S, Testo, Tocco } from "../ui/base";
import { FORMA, Mascotte, Posa } from "../ui/Mascotte";
import { strati } from "../ui/strati";
import { nav } from "../nav";

const POSE: Posa[] = ["ciao", "esplora", "allenati", "attivita", "salute"];
const TINTE_ENERGIA = [C.water, C.yellow, C.lime];
const barre = (n: number) => `<rect x="2" y="2" width="36" height="36" rx="11" fill="#FBF7EC" stroke="#171C14" stroke-width="1.6"/>${[0, 1, 2].map((i) => `<rect x="${9 + i * 8.5}" y="${26 - i * 6}" width="6" height="${6 + i * 6}" rx="1.5" fill="${i < n ? "#2C3A27" : "#E2E7D6"}" stroke="#171C14" stroke-width="1.2"/>`).join("")}`;

export function PrimoAvvio({ modo = "new", alFine }: { modo?: "new" | "add"; alFine?: () => void }) {
  const M = motore(), ins = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [d, setD] = useState<any>({ name: "", breed: "", age: "", weight: "", energy: "", lim: {} as Record<string, boolean>, altro: "" });
  const [cerca, setCerca] = useState("");
  const nome = d.name.trim() || "il tuo cane";
  const N = 5;

  const razze = useMemo(() => {
    const q = M.norm(cerca);
    return (q ? M.RAZZE.filter((r: string) => M.norm(r).includes(q)) : M.RAZZE).slice(0, q ? 12 : 9) as string[];
  }, [cerca]);
  const fascia = useMemo(() => { try { return M.breedRange({ breed: d.breed }); } catch { return null; } }, [d.breed]);

  const num = (v: string) => parseFloat(String(v).replace(",", "."));
  const avanti = () => {
    if (i === 0 && !d.name.trim()) { strati.avviso("Scrivi il suo nome, oppure tocca Salta."); return; }
    if (i === 2) {
      if (d.age !== "" && !(num(d.age) >= 0 && num(d.age) <= 25)) { strati.avviso("Controlla l'età."); return; }
      if (d.weight !== "" && !(num(d.weight) > 0 && num(d.weight) <= 100)) { strati.avviso("Controlla il peso, in chili."); return; }
    }
    setI(i + 1);
  };
  const fine = () => {
    // stesso profilo che crea il sito: il motore completa i valori mancanti e salva
    const p: any = {};
    for (const k of ["art", "cuore", "peso", "conv", "altro"]) if (d.lim[k]) p[k] = true;
    M.W.mode = modo;
    M.W.photo = undefined;
    M.W.d = {
      name: d.name.trim(), breed: d.breed, age: d.age === "" ? "" : num(d.age), weight: d.weight === "" ? "" : num(d.weight),
      train: "medio", agil: d.lim.salti ? "bassa" : "media", coat: "corto", brachy: !!d.lim.brachy, caldo: !!d.lim.caldo, brachyAsked: true,
      energy: d.energy || undefined, pat: p, patOther: d.lim.altro ? d.altro.trim() : "", healthOk: !Object.keys(p).length, health: {},
    };
    M.wzFinish(false); // salva e "ricarica": l'app riparte con il cane nuovo
    if (alFine) alFine();
    setTimeout(() => { nav.sezione("esplora"); strati.avviso(`Fatto! Ora i sentieri sono giudicati su ${d.name.trim() || "il tuo cane"}.`); }, 60);
  };

  const hG = 170;
  const eroe = (p: Posa) => (
    <View style={{ alignItems: "center", marginTop: 8, height: hG }}>
      <Entra chiave={p}><Mascotte posa={p} style={{ height: hG, width: hG * FORMA[p] }} /></Entra>
    </View>
  );
  const cima = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
      {i > 0 && i < N ? <BottoneTondo icona="back" onPress={() => setI(i - 1)} accessibilityLabel="Domanda precedente" /> : modo === "add" && i === 0 ? <BottoneTondo icona="x" onPress={alFine} accessibilityLabel="Annulla" /> : null}
      <View style={{ flex: 1, flexDirection: "row", gap: 4 }} accessibilityLabel={i < N ? `Domanda ${i + 1} di ${N}` : "Fatto"}>
        {Array.from({ length: N }, (_, k) => <View key={k} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: k <= i ? C.forest : C.sage2 }} />)}
      </View>
      {i < N ? <Tocco onPress={() => setI(i + 1)} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 6 }}><Text style={{ fontFamily: F.t800, fontSize: 15, color: C.ink2 }}>Salta</Text></Tocco> : null}
    </View>
  );

  if (i >= N) {
    return (
      <View style={{ flex: 1, backgroundColor: C.sage, paddingTop: ins.top + 10, paddingHorizontal: 20, paddingBottom: ins.bottom + 18 }}>
        {cima}
        {eroe("felice")}
        <Testo tipo="momento" style={{ marginTop: 10 }}>Pronti, {d.name.trim() || "si parte"}!</Testo>
        <Text style={{ fontFamily: F.t600, fontSize: 15.5, lineHeight: 21, color: C.ink2, marginTop: 6 }}>Da ora giudico ogni sentiero su di lui: caldo, salita, acqua e quanto può camminare.</Text>
        <Bottone testo="Andiamo!" largo style={{ marginTop: 22 }} onPress={fine} />
        {modo === "new" ? <Testo tipo="piccolo" style={{ marginTop: 14 }}>Toccando Andiamo accetti le condizioni d'uso. I dati restano su questo telefono (e nel tuo account, se accedi). Le trovi in Impostazioni, con l'informativa sulla privacy.</Testo> : null}
      </View>
    );
  }
  const T = [
    modo === "add" ? "Come si chiama il nuovo cane?" : "Ciao! Come si chiama il tuo cane?",
    `Di che razza è ${nome}?`, `Età e peso di ${d.name.trim() || "lui"}`, `Quanta energia ha ${d.name.trim() || "lui"}?`, `${d.name.trim() || "Il tuo cane"} ha qualche limite?`,
  ][i];
  const SUB = ["Cinque domande veloci per consigliarti i giri giusti per lui. Puoi saltarle.", "Scrivi per cercare. Se è un meticcio, scegli la sua taglia.", "Anche a occhio va bene: servono per sapere quanta strada può fare.", "Pensa a una giornata normale.", "Ne tengo conto per i giri e per il caldo. Anche più di uno, o nessuno."][i];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.sage }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingTop: ins.top + 10, paddingHorizontal: 20, paddingBottom: ins.bottom + 18 }}>
        {cima}
        {eroe(POSE[i])}
        <Testo tipo="momento" accessibilityRole="header" style={{ marginTop: 10 }}>{T}</Testo>
        <Text style={{ fontFamily: F.t600, fontSize: 15.5, lineHeight: 21, color: C.ink2, marginTop: 6 }}>{SUB}</Text>
        <Entra chiave={i} style={{ marginTop: 16, flex: 1 }}>
          {i === 0 ? <TextInput style={S.campo} value={d.name} onChangeText={(v) => setD({ ...d, name: v })} placeholder="Nome" placeholderTextColor={C.ink2} autoCapitalize="words" autoCorrect={false} returnKeyType="next" onSubmitEditing={avanti} accessibilityLabel="Nome del cane" /> : null}
          {i === 1 ? (
            <>
              <TextInput style={[S.campo, { marginBottom: 12 }]} value={cerca} onChangeText={setCerca} placeholder="Cerca la razza" placeholderTextColor={C.ink2} autoCorrect={false} accessibilityLabel="Razza" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {razze.map((r) => <Chip key={r} piccolo testo={r} attivo={d.breed === r} onPress={() => { setD({ ...d, breed: r }); setCerca(""); setI(2); }} />)}
                {cerca.trim() && !M.RAZZE.some((r: string) => M.norm(r) === M.norm(cerca)) ? <Chip piccolo testo={`Usa «${cerca.trim()}»`} sfondo={C.okSoft} onPress={() => { setD({ ...d, breed: cerca.trim() }); setCerca(""); setI(2); }} /> : null}
              </View>
            </>
          ) : null}
          {i === 2 ? (
            <>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}><Text style={{ fontFamily: F.t800, fontSize: 14, marginBottom: 6, color: C.ink }}>Anni</Text><TextInput style={S.campo} value={String(d.age)} onChangeText={(v) => setD({ ...d, age: v })} placeholder="Es. 4" placeholderTextColor={C.ink2} keyboardType="decimal-pad" accessibilityLabel="Età in anni" /></View>
                <View style={{ flex: 1 }}><Text style={{ fontFamily: F.t800, fontSize: 14, marginBottom: 6, color: C.ink }}>Chili</Text><TextInput style={S.campo} value={String(d.weight)} onChangeText={(v) => setD({ ...d, weight: v })} placeholder="Es. 20" placeholderTextColor={C.ink2} keyboardType="decimal-pad" accessibilityLabel="Peso in chili" /></View>
              </View>
              <Testo tipo="piccolo" style={{ marginTop: 12 }}>{fascia ? `Di solito pesa tra ${fascia.min} e ${fascia.max} kg. ` : ""}Per un cucciolo: 6 mesi = 0,5.</Testo>
            </>
          ) : null}
          {i === 3 ? M.ENERGIA.map(([v, b, s]: string[], k: number) => {
            const on = d.energy === v;
            return (
              <Tocco key={v} onPress={() => { setD({ ...d, energy: v }); setI(4); }} accessibilityState={{ selected: on }} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: on ? C.ink : C.cream, marginBottom: 8, minHeight: 64 }}>
                <Disegno xml={barre(k + 1)} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.t700, fontSize: 16, color: on ? C.cream : C.ink }}>{b}</Text>
                  <Text style={{ fontFamily: F.t600, fontSize: 13.5, color: on ? C.onForest2 : C.ink2 }}>{pulito(s)}</Text>
                </View>
              </Tocco>
            );
          }) : null}
          {i === 4 ? (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {M.LIMITI.map(([k, t]: string[]) => <Chip key={k} piccolo testo={t} attivo={!!d.lim[k]} onPress={() => setD({ ...d, lim: { ...d.lim, [k]: !d.lim[k] } })} />)}
              </View>
              {d.lim.altro ? <TextInput style={[S.campoPiccolo, { marginTop: 12 }]} value={d.altro} onChangeText={(v) => setD({ ...d, altro: v })} placeholder="Quale?" placeholderTextColor={C.ink2} /> : null}
              <Testo tipo="piccolo" style={{ marginTop: 12 }}>Non sostituisce il veterinario: se hai dubbi, chiedi a lui.</Testo>
            </>
          ) : null}
        </Entra>
        <Bottone testo={i < N - 1 ? "Avanti" : "Fatto"} largo style={{ marginTop: 16 }} onPress={avanti} />
        {i === 0 && modo === "new" ? (
          <Tocco onPress={() => strati.avviso("Prima rispondi alle domande: poi accedi dalla pagina del cane, in «Il tuo account».")} style={{ minHeight: 44, justifyContent: "center", alignItems: "center", marginTop: 6 }}>
            <Text style={{ fontFamily: F.t600, fontSize: 13, color: C.ink2 }}>Hai già un account? <Text style={{ fontFamily: F.t800, textDecorationLine: "underline", color: C.ink }}>Accedi</Text></Text>
          </Tocco>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
