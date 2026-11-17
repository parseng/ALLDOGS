// Elenco delle schermate: le 5 sezioni del menu e quelle che si aprono sopra.
import React from "react";
import { Esplora } from "./Esplora";
import { Sentiero } from "./Sentiero";
import { Cerca } from "./Cerca";
import { Filtri } from "./Filtri";
import { CreaGiro } from "./CreaGiro";
import { Attivita } from "./Attivita";
import { Allenati } from "./Allenati";
import { Account, Cane, Dati, Domande, Impostazioni, Proponi, Regole, Salute, Soccorso, Zaino } from "./Cane";
import { PrimoAvvio } from "./PrimoAvvio";
import { nav } from "../nav";
import { Uscita, Vai } from "./Vai";

export type PropsSezione = { attiva: boolean };
export type PropsSchermata = { attiva: boolean; arg?: any };

export const SEZIONI: Record<string, React.ComponentType<PropsSezione>> = {
  esplora: Esplora,
  crea: CreaGiro,
  attivita: Attivita,
  allenati: Allenati,
  cane: Cane,
};
export const SCHERMATE: Record<string, React.ComponentType<PropsSchermata>> = {
  sentiero: Sentiero,
  cerca: Cerca,
  filtri: Filtri,
  vai: Vai,
  uscita: Uscita,
  salute: Salute,
  zaino: Zaino,
  soccorso: Soccorso,
  regole: Regole,
  dati: Dati,
  proponi: Proponi,
  account: Account,
  impostazioni: Impostazioni,
  domande: Domande,
  nuovocane: () => <PrimoAvvio modo="add" alFine={() => nav.indietro()} />,
};
