// Elenco delle schermate: le 5 sezioni del menu e quelle che si aprono sopra.
import React from "react";
import { Esplora } from "./Esplora";
import { Sentiero } from "./Sentiero";
import { Cerca } from "./Cerca";
import { Filtri } from "./Filtri";
import { CreaGiro } from "./CreaGiro";

export type PropsSezione = { attiva: boolean };
export type PropsSchermata = { attiva: boolean; arg?: any };

export const SEZIONI: Record<string, React.ComponentType<PropsSezione>> = {
  esplora: Esplora,
  crea: CreaGiro,
};
export const SCHERMATE: Record<string, React.ComponentType<PropsSchermata>> = {
  sentiero: Sentiero,
  cerca: Cerca,
  filtri: Filtri,
};
