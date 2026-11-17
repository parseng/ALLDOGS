// Crea giro: Chiedi (chat con l'assistente), Automatico (un tocco), Lo disegno io (durata oppure segnaposti).
// Il giro lo calcola il motore come nel sito (OpenRouteService, giri dentro i parchi, tappe, comandi).
import React, { useEffect, useRef, useState } from "react";
import { Linking, Text, TextInput, View } from "react-native";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, MARGINE, OMBRA, R, TESTATA } from "../theme";
import { motore, pagina, pulito, useMotore } from "../motore";
import { nav } from "../nav";
import { Bottone, BottoneTondo, Chip, Entra, Icona, Interruttore, Segmenti, Sezione, Testo, Tocco } from "../ui/base";
import { FotoCane, nomeCane } from "../ui/BarraMenu";
import { FacciaGohan, StoPensando } from "../ui/FacciaGohan";
import { ChiediAGohan } from "./Allenati";
import { HtmlMotore } from "../ui/HtmlMotore";
import { PaginaGrande } from "../ui/Testate";
import { Dislivello, Striscia } from "../ui/grafici";
import { oggiPerIlCane } from "../ui/meteo";
import { Foto, Verdetto } from "../ui/sentieri";
import { strati } from "../ui/strati";
import { MappaGalleggiante, usePiena } from "../mappa/Galleggiante";
import { StatoVolo, volo } from "../mappa/Mappa";
import { partiCon } from "./Sentiero";

type Scheda = "chat" | "auto" | "man";
const MAPPA_H = 300;
const PUNTO = [C.lime, C.yellow, C.coral];

function Chat({ onCreato, giu }: { onCreato: () => void; giu: () => void }) {
  const M = motore();
  const [testo, setTesto] = useState("");
  useEffect(() => { if (!M.S.chat.length) M.showChat(); }, []);
  const manda = (t: string) => { if (!t.trim() || M.S.busy) return; setTesto(""); M.chatSend(t); setTimeout(giu, 150); };
  const n = (M.S.chat as any[]).length;
  useEffect(() => { setTimeout(giu, 200); }, [n, M.S.busy]);
  const msgs = M.S.chat as any[];
  return (
    <View style={{ paddingHorizontal: MARGINE }}>
      <View style={{ gap: 10, marginTop: 14 }}>
        {msgs.map((m, i) => (
          <React.Fragment key={i}>
            {m.r === "u"
              ? <View style={{ alignSelf: "flex-end", maxWidth: "84%", backgroundColor: C.ink, borderRadius: 20, borderBottomRightRadius: 6, paddingVertical: 11, paddingHorizontal: 14 }}><Text style={S.msgIo}>{m.t}</Text></View>
              : <View style={{ alignSelf: "flex-start", maxWidth: "88%", backgroundColor: m.err ? "#FBD9C9" : C.cream, borderRadius: 20, borderBottomLeftRadius: 6, paddingVertical: 11, paddingHorizontal: 14, flexDirection: "row", gap: 8 }}><FacciaGohan size={32} /><Text style={S.msgLui}>{pulito(m.t)}</Text></View>}
            {(m.sug || []).map((id: number) => {
              const tr = M.TR.get(id);
              if (!tr) return null;
              const res = M.verdict(M.item(tr), M.dog(), 0);
              return (
                <Tocco key={id} hitSlop={0} onPress={() => { M.rememberCell(tr); nav.apri("sentiero", id); }} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.cream, borderRadius: 18, padding: 8 }}>
                  <Foto uri={(M.PH[id] && M.PH[id][0] && M.PH[id][0].u) || M.staticImg(tr.path, 200, 150)} style={{ width: 76, height: 60 }} rotonda={12} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.titolo, fontSize: 17, color: C.ink }}>{tr.name}</Text>
                    <Text numberOfLines={2} style={{ fontFamily: F.t700, fontSize: 13, color: C.ink2 }}>{res.v < 0 ? "" : M.VLABEL[res.v] + " · "}{M.km(M.totLen(tr))} km{tr.shape === "line" ? " a/r" : ""} · {M.fmtH(res.hours)}{tr.zone ? " · " + tr.zone : ""}</Text>
                  </View>
                  <Icona nome="chev" size={18} colore={C.ink2} />
                </Tocco>
              );
            })}
          </React.Fragment>
        ))}
        {M.S.busy ? <StoPensando colore={C.ink2} /> : null}
      </View>
      {msgs.length <= 1 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {["Consigliami un sentiero qui vicino", "Mezz'ora tranquilla nel verde", "Giro breve con giochi di fiuto"].map((s) => <Chip key={s} piccolo testo={s} onPress={() => manda(s)} />)}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <TextInput value={testo} onChangeText={setTesto} onFocus={() => setTimeout(giu, 350)} onSubmitEditing={() => manda(testo)} placeholder="Scrivi cosa vuoi fare" placeholderTextColor={C.ink2} returnKeyType="send" style={{ flex: 1, height: 52, borderRadius: 18, backgroundColor: C.cream, paddingHorizontal: 16, fontFamily: F.t600, fontSize: 16, color: C.ink }} accessibilityLabel="Scrivi all'assistente" />
        <Bottone icona="send" tinta="scuro" onPress={() => manda(testo)} accessibilityLabel="Invia" style={{ width: 52 }} />
      </View>
      <Testo tipo="piccolo" style={{ marginTop: 10 }}>L'assistente usa Gemini di Google e riceve il profilo del cane (senza veterinario né microchip) e il meteo. Può sbagliare: il percorso finale lo calcola l'app con i limiti di {nomeCane()}.</Testo>
    </View>
  );
}

function Risultato({ onVolo }: { onVolo: () => void }) {
  const M = motore(), nome = nomeCane();
  const r = M.S.gen[M.S.genIdx], d = M.dog(), it = M.genItem(r), res = M.verdict(it, d, 0), sp = M.steps(r.len, d);
  const titolo = r.name || `Giro di ${M.km(r.len)} km`;
  const gsh = M.segShare(r.segs);
  const avvia = () => partiCon({ name: titolo, kind: "giro", ways: [r.path], path: r.path, len: r.len, up: r.up, stops: (r.stops || []).map((s: any) => ({ p: s.p, km: s.km, t: s.t, d: s.d })), water: [], scale: "CITY", loop: r.loop !== false, turns: r.turns || null, prof: r.prof || null }, it, titolo);
  const el = (id: string) => pagina().el(id);
  return (
    <Entra chiave={M.S.genIdx + ":" + r.len} style={{ marginTop: 16, backgroundColor: C.cream, borderRadius: R.m, padding: 16 }}>
      <Testo tipo="sezione">{titolo}</Testo>
      <View style={{ marginTop: 8 }}><Verdetto v={Math.max(0, res.v)} motivo={res.short} /></View>
      {r.note ? <Text style={{ fontFamily: F.t600, fontSize: 14.5, lineHeight: 20, color: C.ink, backgroundColor: "#FFF1BF", borderRadius: 12, padding: 10, marginTop: 10, overflow: "hidden" }}>{pulito(r.note)}</Text> : null}
      <View style={{ flexDirection: "row", marginTop: 12, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: C.sage2 }}>
        {[[`${M.km(r.len)} km`, "lunghezza"], [`${r.up ?? 0} m`, "dislivello"], [M.fmtH(res.hours).replace(/ h (\d+) min$/, " h $1"), `con ${nome}`], [M.EFFORT[res.effort], `per ${nome}`]].map(([a, b], i) => (
          <View key={i} style={{ flex: 1, paddingVertical: 10, paddingLeft: i ? 8 : 0, borderLeftWidth: i ? 1.5 : 0, borderColor: C.sage2 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.titolo, fontSize: 19, color: i === 2 ? C.warnInk : C.ink, fontVariant: ["tabular-nums"] }}>{a}</Text>
            <Text style={{ fontFamily: F.t700, fontSize: 12, color: C.ink2 }}>{b}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <Bottone testo="Avvia" icona="play" tinta="scuro" style={{ flex: 1.2, alignSelf: "auto" }} onPress={avvia} />
        <Bottone testo="Salva" icona="heart" tinta="chiaro2" style={{ flex: 1, alignSelf: "auto" }} onPress={() => el("gen-save").click()} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {M.S.gen.length > 1 ? <Chip piccolo sfondo={C.sage} icona="loop" testo="Prova un altro giro" onPress={() => el("gen-next").click()} /> : null}
        <Chip piccolo sfondo={C.sage} icona="cube" testo="Volo 3D" onPress={onVolo} />
        {gsh ? <Chip piccolo sfondo={C.sage} testo="Colora il fondo" attivo={!!M.surfOn} onPress={() => M.setSurf(!M.surfOn)} /> : null}
        <Chip piccolo sfondo={C.sage} icona="bag" testo="Zaino" onPress={() => motore().packSheet({ km: r.len / 1000, p: r.path[0], title: titolo, mount: (r.up || 0) >= 300 })} />
        <Chip piccolo sfondo={C.sage} icona="nav" testo="Portami alla partenza" onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${r.path[0][0]},${r.path[0][1]}`)} />
        <Chip piccolo sfondo={C.sage} icona="x" testo="Rimuovi" onPress={() => el("gen-clear").click()} />
      </View>
      <View style={{ marginTop: 12 }}>
        {res.why.map((x: any, i: number) => (
          <View key={i} style={{ flexDirection: "row", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: x.lvl < 0 ? C.sage2 : PUNTO[x.lvl], borderWidth: 1.5, borderColor: C.ink }} />
            <Text style={{ flex: 1, fontFamily: F.t600, fontSize: 14.5, lineHeight: 19.5, color: C.ink }}>{pulito(x.txt)}</Text>
          </View>
        ))}
      </View>
      <Testo tipo="piccolo" style={{ marginTop: 8 }}>Passi stimati: {nome} circa {sp.dog.toLocaleString("it-IT")}, tu circa {sp.me.toLocaleString("it-IT")}.{r.straight ? " Percorso unito con linee dritte: distanza approssimativa, dislivello non calcolato." : ""}</Testo>
      {r.prof ? <View style={{ marginTop: 12 }}><Text style={S.h}>Dislivello lungo il percorso</Text><Dislivello p={r.prof} len={r.len} /></View> : null}
      {r.hard != null ? (
        <View style={{ marginTop: 12 }}>
          <Text style={S.h}>Sotto le zampe</Text>
          <Striscia pezzi={[{ c: C.forest, w: r.soft }, { c: C.copper, w: r.hard }, { c: C.sage2, w: Math.max(0, 1 - r.soft - r.hard) }]} legenda={[[C.forest, `Terra, erba o sterrato ${Math.round(r.soft * 100)}%`], [C.copper, `Asfalto o pietra ${Math.round(r.hard * 100)}%`]]} />
          {r.green != null ? <Testo tipo="piccolo" style={{ marginTop: 4 }}>Verde intorno: {r.green >= 6 ? "tanto" : r.green >= 3 ? "medio" : "poco"}.{gsh && gsh.g >= 0.01 ? ` Gradini: circa ${Math.max(1, Math.round(gsh.g * 100))}% del percorso.` : ""}</Testo> : null}
        </View>
      ) : null}
      <Text style={[S.h, { marginTop: 14 }]}>Tappe e giochi</Text>
      {(r.stops || []).map((s: any, i: number) => (
        <View key={i} style={{ flexDirection: "row", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, borderColor: C.ink, backgroundColor: C.sage, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.t800, fontSize: 13, color: C.ink }}>{i + 1}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.t800, fontSize: 15, color: C.ink }}>{pulito(s.t)} <Text style={{ fontFamily: F.t600, fontSize: 13, color: C.ink2 }}>· km {M.km(s.km)}</Text></Text>
            <Text style={{ fontFamily: F.t600, fontSize: 14.5, lineHeight: 19.5, color: C.ink }}>{pulito(s.d)}</Text>
          </View>
        </View>
      ))}
      <Testo tipo="piccolo" style={{ marginTop: 8 }}>{r.source === "chat" ? "Tappe proposte dall'assistente, distribuite lungo il giro." : "Tappe proposte con regole fisse."} I numeri corrispondono a quelli sulla mappa.</Testo>
      {r.cmds && r.cmds.length ? (
        <>
          <Text style={[S.h, { marginTop: 14 }]}>Comandi da provare</Text>
          {r.cmds.map((c: any, i: number) => <Text key={i} style={{ fontFamily: F.t600, fontSize: 14.5, lineHeight: 20, color: C.ink, paddingVertical: 6 }}><Text style={{ fontFamily: F.t800 }}>{c.command}</Text>{c.how ? ": " + c.how : ""}</Text>)}
        </>
      ) : null}
    </Entra>
  );
}

export function CreaGiro({ attiva }: { attiva: boolean }) {
  useMotore();
  const M = motore(), ins = useSafeAreaInsets(), nome = nomeCane();
  const y = useSharedValue(0), slotY = useSharedValue(600);
  const scorri = useRef<any>(null);
  const giu = () => { try { scorri.current?.scrollToEnd({ animated: true }); } catch {} };
  const [scheda, setScheda] = useState<Scheda>(M.S.mode === "man" ? "man" : "auto");
  const [piena, tuttoSchermo] = usePiena("hostCrea", attiva);
  const [statoVolo, setVolo] = useState<StatoVolo | null>(null);
  const el = (id: string) => pagina().el(id);
  const gen = M.S.gen && M.S.gen[M.S.genIdx];
  const uscita = String(el("gen-out").innerHTML || "");
  // se il motore ha creato un giro (anche dalla chat) si passa alla scheda con la mappa
  // ogni volta che il motore crea un giro nuovo (anche dalla chat, anche un secondo giro) si passa alla mappa e si mostra il risultato
  const ultimoGiro = useRef<any>(M.S.gen);
  useEffect(() => {
    if (M.S.gen && M.S.gen !== ultimoGiro.current) {
      ultimoGiro.current = M.S.gen;
      if (scheda === "chat") setScheda(M.S.mode === "man" ? "man" : "auto");
      setTimeout(() => { try { scorri.current?.scrollTo({ y: Math.max(0, slotY.value - 120), animated: true }); } catch {} }, 500);
    } else if (scheda === "chat" && /Sto disegnando/.test(uscita)) setScheda(M.S.mode === "man" ? "man" : "auto");
  }, [M.S.gen, uscita]);
  useEffect(() => { if (scheda !== "chat" && M.S.mode !== scheda && attiva) { setScheda(M.S.mode === "man" ? "man" : "auto"); } }, [M.S.mode, attiva]);
  useEffect(() => { if (!piena && statoVolo) { volo.ferma(); setVolo(null); } }, [piena]);
  const cambia = (s: Scheda) => {
    setScheda(s);
    if (s !== "chat") { M.S.mode = s; M.store.set("alldogs-creamode", s); M.showCrea(); }
  };
  const tipoMan = (k: "auto" | "draw") => { M.S.manKind = k; M.store.set("alldogs-mankind", k); M.showCrea(); };
  // sul telefono la mappa, appena diventa grande, si risistema da sola e può fermare il volo appena partito: parto un attimo dopo e, se non è partito, riprovo
  const voloPartito = useRef(false);
  useEffect(() => { voloPartito.current = !!statoVolo; }, [statoVolo]);
  const avviaVolo = () => { if (!gen) return; if (!piena) tuttoSchermo(true); const src = { path: gen.path, prof: gen.prof, len: gen.len, shape: "loop", ret: 0 }; voloPartito.current = false; setTimeout(() => volo.parti(src), 800); setTimeout(() => { if (!voloPartito.current) volo.parti(src); }, 2200); };
  const conMappa = scheda !== "chat";
  const disegno = scheda === "man" && M.S.manKind === "draw";
  const D = M.S.draw;
  const o = oggiPerIlCane();
  const consigli = [{ titolo: "Un consiglio", testo: "Se è la prima volta in un posto nuovo, parti con un giro corto: annusare tutto mi stanca più di quanto sembra." }, ...(o.zampe ? [{ titolo: "Le mie zampe", testo: pulito(o.zampe.t[0]) }] : [])];

  return (
    <View style={{ flex: 1 }}>
    <PaginaGrande scrollRef={scorri} colore={TESTATA.crea} titolo="Crea un giro" frase={scheda === "chat" ? "Dimmi cosa ti va: il giro lo preparo io." : disegno ? "Metti i segnaposti: la strada la trovo io." : "Dimmi quanto tempo hai: il giro lo disegno io."} posa="creagiro" attiva={attiva} consigli={consigli} y={y} fermo={piena} pienaSopra={piena}
      sotto={
        <MappaGalleggiante attiva={attiva} y={y} slotY={slotY} altezza={MAPPA_H} margine={MARGINE} raggio={R.l} piena={piena} onPiena={tuttoSchermo} nascosta={!conMappa} onVolo={setVolo} legendaSu={statoVolo ? 120 : 34}
          sopra={(p) => (
            <>
              {p ? <BottoneTondo icona="x" ombra onPress={() => tuttoSchermo(false)} accessibilityLabel="Chiudi la mappa" style={{ position: "absolute", left: 10, top: ins.top + 6 }} /> : null}
              {p && statoVolo ? (
                <View style={[{ position: "absolute", left: 12, right: 12, bottom: ins.bottom + 14, backgroundColor: C.forest, borderRadius: 20, padding: 14 }, OMBRA]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <BottoneTondo icona={statoVolo.playing ? "pause" : statoVolo.fine ? "loop" : "play"} sfondo={C.lime} onPress={() => volo.pausa()} accessibilityLabel="Pausa o riprendi" />
                    <Text style={{ flex: 1, fontFamily: F.titolo, fontSize: 18, color: C.cream }}>{M.km(statoVolo.km)} di {M.km(statoVolo.tot)} km{statoVolo.quota != null ? ` · quota ${statoVolo.quota} m` : ""}</Text>
                    <BottoneTondo icona="x" sfondo={C.forest2} colore={C.cream} onPress={() => { volo.ferma(); setVolo(null); }} accessibilityLabel="Chiudi l'anteprima" />
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: C.forest2, overflow: "hidden", marginTop: 10 }}><View style={{ height: "100%", width: `${Math.round(statoVolo.fr * 100)}%`, backgroundColor: C.lime }} /></View>
                </View>
              ) : null}
            </>
          )}
        />
      }
    >
      <View onLayout={(e) => { slotY.value = e.nativeEvent.layout.y + e.nativeEvent.layout.height + 12; }}>
        <Segmenti<Scheda> voci={[["chat", "Chiedi"], ["auto", "Automatico"], ["man", "Lo disegno io"]]} valore={scheda} onCambia={cambia} style={{ marginHorizontal: MARGINE, marginTop: 14 }} />
        {scheda === "man" ? <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: MARGINE, marginTop: 10 }}><Chip piccolo testo="Scelgo la durata" attivo={M.S.manKind !== "draw"} onPress={() => tipoMan("auto")} /><Chip piccolo testo="Metto i segnaposti" attivo={M.S.manKind === "draw"} onPress={() => tipoMan("draw")} /></View> : null}
        {conMappa ? <Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2, paddingHorizontal: MARGINE, marginTop: 10 }}>{disegno ? "Tocca la mappa per aggiungere i punti, uno dopo l'altro. Trascinali per spostarli." : "Tocca la mappa per spostare la partenza, oppure parti da dove sei."}</Text> : null}
      </View>
      {scheda === "chat" ? <Chat onCreato={() => cambia("auto")} giu={giu} /> : (
        <>
          <View style={{ height: MAPPA_H, marginTop: 12 }} />
          <View style={{ paddingHorizontal: MARGINE }}>
            <Bottone testo={disegno ? "Aggiungi dove sono" : "Parto da dove sono"} icona="nav" tinta="chiaro" piccolo style={{ marginTop: 10 }} onPress={() => el("new-loc").click()} />
            {gen ? <Risultato onVolo={avviaVolo} /> : (
              <>
                {uscita ? <View style={{ marginTop: 12, backgroundColor: C.cream, borderRadius: 16, padding: 12 }}><HtmlMotore html={uscita} /></View> : null}
                {scheda === "auto" ? (
                  <>
                    <Sezione titolo="Cosa farei adesso" />
                    <HtmlMotore html={String(el("auto-why").innerHTML || "").replace(/<h2>[\s\S]*?<\/h2>/, "")} />
                    <Bottone testo="Crea il giro con un tocco" icona="route" tinta="scuro" largo style={{ marginTop: 14 }} onPress={() => el("auto-go").click()} />
                  </>
                ) : !disegno ? (
                  <>
                    <Sezione titolo="Quanto vuoi camminare?" />
                    <View style={{ flexDirection: "row", gap: 8 }}>{[20, 40, 60, 90].map((m) => <Chip key={m} testo={m < 60 ? m + " min" : m === 60 ? "1 ora" : "1 h 30"} attivo={M.S.mins === m} onPress={() => { M.S.mins = m; M.showMan(); }} />)}</View>
                    <Testo tipo="secondo" style={{ marginTop: 8 }}>{String(el("seg-hint").textContent || "")}</Testo>
                    <View style={{ marginTop: 6 }}><HtmlMotore html={String(el("rules").innerHTML || "").replace(/<h2>/, "<h3>").replace(/<\/h2>/, "</h3>")} /></View>
                    <Bottone testo="Crea il percorso" icona="route" tinta="scuro" largo style={{ marginTop: 14 }} onPress={() => el("gen").click()} />
                  </>
                ) : (
                  <>
                    <View style={{ marginTop: 12, backgroundColor: C.cream, borderRadius: 16, padding: 12 }}><HtmlMotore html={String(el("draw-info").innerHTML || "")} /></View>
                    {([["draw-loop", "Torna alla partenza (anello)"], ["draw-follow", "Segui strade e sentieri"]] as const).map(([id, t]) => (
                      <Tocco key={id} hitSlop={0} onPress={() => { const e2 = el(id); e2.checked = !e2.checked; if (typeof e2.onchange === "function") e2.onchange(); else M.drawRoute(false); }} accessibilityRole="switch" accessibilityState={{ checked: !!el(id).checked }} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
                        <Text style={{ flex: 1, fontFamily: F.t700, fontSize: 15, color: C.ink }}>{t}</Text><Interruttore acceso={!!el(id).checked} />
                      </Tocco>
                    ))}
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                      <Bottone testo="Togli l'ultimo" tinta="chiaro" piccolo disabled={!D.pts.length} onPress={() => el("draw-undo").click()} />
                      <Bottone testo="Togli tutti" tinta="chiaro" piccolo disabled={!D.pts.length} onPress={() => el("draw-reset").click()} />
                    </View>
                    <Bottone testo="Usa questo percorso" icona="check" tinta="scuro" largo disabled={!D.route || D.busy} style={{ marginTop: 14 }} onPress={() => el("draw-use").click()} />
                  </>
                )}
              </>
            )}
            <Testo tipo="piccolo" style={{ marginTop: 18 }}>I percorsi li calcola OpenRouteService sulle strade e i sentieri di OpenStreetMap. Controlla sempre attraversamenti, cartelli e orari dei parchi.</Testo>
          </View>
        </>
      )}
    </PaginaGrande>
    <ChiediAGohan attivo={attiva && scheda !== "chat" && !piena} onPress={() => { cambia("chat"); setTimeout(() => { try { scorri.current?.scrollTo({ y: 0, animated: true }); } catch {} }, 80); }} />
    </View>
  );
}

const S = {
  msgIo: { fontFamily: F.t600, fontSize: 15, lineHeight: 20, color: C.cream } as const,
  msgLui: { flex: 1, fontFamily: F.t600, fontSize: 15, lineHeight: 20, color: C.ink } as const,
  h: { fontFamily: F.titolo, fontSize: 18, letterSpacing: -0.3, color: C.ink, marginBottom: 4 } as const,
};
