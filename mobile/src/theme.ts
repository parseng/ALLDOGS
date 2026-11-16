// Tutti i colori, i caratteri e le misure del nuovo design (repo/design/DESIGN-NUOVO.md).
// Nessun colore va scritto a mano nelle schermate: si prende da qui.
import { Easing } from "react-native-reanimated";

export const C = {
  ink: "#171C14",
  ink2: "#4B5545",
  sage: "#EEF1E6",
  sage2: "#E2E7D6",
  cream: "#FBF7EC",
  white: "#FFFFFF",
  lime: "#DCF26A",
  forest: "#2C3A27",
  forest2: "#3A4B33",
  onForest2: "#C9D4BE",
  copper: "#D2803A",
  water: "#A9D3E6",
  yellow: "#F6CE4B",
  coral: "#EE7A5F",
  pink: "#F4B8AE",
  okBg: "#C6E5AE",
  okInk: "#1E3B17",
  okSoft: "#E6F4C0",
  warnInk: "#8A4A12",
  dangerInk: "#A33A2E",
  waterSoft: "#E2EFF3",
  waterLine: "#C9DDE4",
  mint: "#C3E5CC",
  lilac: "#D8CCF3",
  star: "#B97714",
  scrim: "rgba(23,28,20,0.4)",
} as const;

// colore della testata di ogni sezione
export const TESTATA = {
  crea: C.pink,
  attivita: C.water,
  allenati: C.yellow,
  salute: C.lime,
  impostazioni: C.sage2,
  zaino: C.yellow,
  regole: C.lime,
  soccorso: C.pink,
} as const;

export const F = {
  titolo: "BricolageGrotesque_800ExtraBold",
  t500: "Urbanist_500Medium",
  t600: "Urbanist_600SemiBold",
  t700: "Urbanist_700Bold",
  t800: "Urbanist_800ExtraBold",
} as const;

export const R = { s: 12, m: 20, l: 28, bottone: 18, pieno: 999 } as const;
export const MARGINE = 18;
export const BARRA_H = 84;
export const TOCCO_MIN = 44;

export const OMBRA = {
  shadowColor: C.ink,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 8,
} as const;

// molla per i rimbalzi, arrivo morbido per il resto
export const MOLLA = { damping: 12, stiffness: 180, mass: 0.9 } as const;
export const MORBIDO = { duration: 280, easing: Easing.bezier(0.16, 1, 0.3, 1) } as const;
export const BREVE = { duration: 120 } as const;
