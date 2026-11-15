// Promemoria locali agli orari liberi del cane (salvati dal primo avvio della web app in d.orariSlots).
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type Slot = { giorni: number[]; fascia: string; dalle: string; alle: string }; // giorni: 0 = domenica
export type DogInfo = { name?: string; orariSlots?: Slot[]; durata?: number };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const FRASI: Record<string, string> = {
  mattina: "Buongiorno! È un buon momento per la passeggiata del mattino",
  pranzo: "Pausa pranzo: una passeggiata breve, all'ombra se fa caldo",
  pomeriggio: "Pomeriggio libero: che ne dici di un giro",
  sera: "È sera: l'ora giusta per uscire insieme",
};

let lastKey = "";

export async function scheduleWalkReminders(dog: DogInfo): Promise<number> {
  const slots = dog.orariSlots || [];
  const key = JSON.stringify([dog.name, slots, dog.durata]);
  if (key === lastKey) return -1; // niente di nuovo
  lastKey = key;

  const perm = await Notifications.getPermissionsAsync();
  let ok = perm.granted;
  if (!ok && perm.canAskAgain) ok = (await Notifications.requestPermissionsAsync()).granted;
  if (!ok) return 0;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("passeggiate", {
      name: "Promemoria passeggiate",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // si rifà tutto da capo: semplice e sempre allineato al profilo
  await Notifications.cancelAllScheduledNotificationsAsync();
  const nome = (dog.name || "il tuo cane").trim();
  let n = 0;
  for (const s of slots) {
    const [h, m] = s.dalle.split(":").map(Number);
    for (const g of s.giorni) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${FRASI[s.fascia] || "È l'ora della passeggiata"} con ${nome}?`,
          body: dog.durata ? `Anche ${dog.durata} minuti fanno bene. Tocca per scegliere un giro.` : "Tocca per scegliere un giro.",
          data: { url: "#crea" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: g + 1, // Expo: 1 = domenica
          hour: h,
          minute: m || 0,
          channelId: "passeggiate",
        },
      });
      n++;
    }
  }
  return n;
}
