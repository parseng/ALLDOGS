// ALLDOGS, prototipo opzione A: la web app pubblicata dentro una WebView a tutto schermo,
// con GPS nativo (anche in background durante la passeggiata) e promemoria agli orari liberi del cane.
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as Notifications from "expo-notifications";
import { INJECT_BEFORE, posScript, type FromWeb } from "./src/bridge";
import { currentPosition, onPosition, startBackground, startWatch, stopBackground, stopWatch } from "./src/location";
import { scheduleWalkReminders, type DogInfo } from "./src/notifications";

const APP_URL = "https://parseng.github.io/ALLDOGS/";
const COLORE = "#1d4f3c";

export default function App() {
  const web = useRef<WebView>(null);
  const [errore, setErrore] = useState(false);
  const [indietro, setIndietro] = useState(false);
  const inCammino = useRef(false);

  // posizioni native -> web app
  useEffect(() => onPosition((p) => web.current?.injectJavaScript(posScript(p))), []);

  // tasto Indietro di Android: torna indietro nella web app
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const s = BackHandler.addEventListener("hardwareBackPress", () => {
      if (indietro) { web.current?.goBack(); return true; }
      return false;
    });
    return () => s.remove();
  }, [indietro]);

  // tocco su un promemoria: apre la pagina giusta della web app
  useEffect(() => {
    const s = Notifications.addNotificationResponseReceivedListener((r) => {
      const url = r.notification.request.content.data?.url;
      if (typeof url === "string") web.current?.injectJavaScript(`location.hash=${JSON.stringify(url)};true;`);
    });
    return () => s.remove();
  }, []);

  async function onMessage(e: WebViewMessageEvent) {
    let m: FromWeb;
    try { m = JSON.parse(e.nativeEvent.data); } catch { return; }
    switch (m.t) {
      case "geo-start": await startWatch(); break;
      case "geo-once": await currentPosition(); break;
      case "geo-stop": if (!inCammino.current) stopWatch(); break;
      case "walk":
        inCammino.current = m.on;
        if (m.on) await startBackground(); else { await stopBackground(); }
        break;
      case "dog": if (m.dog && typeof m.dog === "object") await scheduleWalkReminders(m.dog as DogInfo); break;
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.box} edges={["top", "bottom"]}>
        <StatusBar style="auto" />
        {errore ? (
          <View style={styles.centro}>
            <Text style={styles.titolo}>Non riesco ad aprire AllDogs</Text>
            <Text style={styles.testo}>Controlla la connessione a internet e riprova.</Text>
            <Pressable style={styles.btn} onPress={() => { setErrore(false); web.current?.reload(); }}>
              <Text style={styles.btnTxt}>Riprova</Text>
            </Pressable>
          </View>
        ) : null}
        <WebView
          ref={web}
          source={{ uri: APP_URL }}
          style={[styles.box, errore && { display: "none" }]}
          injectedJavaScriptBeforeContentLoaded={INJECT_BEFORE}
          onMessage={onMessage}
          onNavigationStateChange={(s) => setIndietro(s.canGoBack)}
          onError={() => setErrore(true)}
          javaScriptEnabled
          domStorageEnabled
          geolocationEnabled={false}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          setSupportMultipleWindows={false}
          pullToRefreshEnabled={false}
          startInLoadingState
          renderLoading={() => (
            <View style={[styles.centro, StyleSheet.absoluteFill]}>
              <ActivityIndicator size="large" color={COLORE} />
            </View>
          )}
          // i link esterni (Google Maps, privacy dei servizi...) si aprono fuori dall'app
          onShouldStartLoadWithRequest={(r) => {
            if (r.url.startsWith(APP_URL) || r.url.startsWith("about:") || r.url.startsWith("blob:") || r.url.startsWith("data:")) return true;
            if (!r.isTopFrame) return true;
            Linking.openURL(r.url).catch(() => {});
            return false;
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: "#eef0ec" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#eef0ec" },
  titolo: { fontSize: 22, fontWeight: "600", color: "#18201c", textAlign: "center" },
  testo: { fontSize: 17, color: "#5a6660", marginTop: 8, textAlign: "center" },
  btn: { marginTop: 20, backgroundColor: COLORE, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13 },
  btnTxt: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
