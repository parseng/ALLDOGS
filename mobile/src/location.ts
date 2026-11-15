// GPS nativo: in primo piano (watchPosition) e in background durante una passeggiata (TaskManager).
// Le posizioni vanno alla web app attraverso il ponte (vedi bridge.ts), che le passa a navigator.geolocation.
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const BG_TASK = "alldogs-gps-background";

export type Pos = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

type Listener = (p: Pos) => void;
const listeners = new Set<Listener>();
export function onPosition(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(l: Location.LocationObject) {
  const p: Pos = {
    latitude: l.coords.latitude,
    longitude: l.coords.longitude,
    accuracy: l.coords.accuracy,
    altitude: l.coords.altitude,
    heading: l.coords.heading,
    speed: l.coords.speed,
    timestamp: l.timestamp,
  };
  listeners.forEach((fn) => fn(p));
}

// definito a livello di modulo: il sistema lo richiama anche con l'app in background
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(BG_TASK, async ({ data, error }) => {
  if (error || !data) return;
  for (const l of data.locations) emit(l);
});

export async function currentPosition(): Promise<Pos | null> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return null;
  const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  emit(l);
  return null;
}

let fgSub: Location.LocationSubscription | null = null;
export async function startWatch(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return false;
  if (!fgSub) {
    fgSub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3, timeInterval: 2000 },
      emit,
    );
  }
  return true;
}
export function stopWatch() {
  fgSub?.remove();
  fgSub = null;
}

// passeggiata in corso: continua a registrare anche a schermo spento
export async function startBackground(): Promise<boolean> {
  if (!(await startWatch())) return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") return false;
  if (await Location.hasStartedLocationUpdatesAsync(BG_TASK)) return true;
  await Location.startLocationUpdatesAsync(BG_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 5,
    timeInterval: 3000,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Fitness,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "AllDogs: passeggiata in corso",
      notificationBody: "Sto registrando il percorso.",
      notificationColor: "#1d4f3c",
    },
  });
  return true;
}
export async function stopBackground() {
  if (await Location.hasStartedLocationUpdatesAsync(BG_TASK)) await Location.stopLocationUpdatesAsync(BG_TASK);
}
