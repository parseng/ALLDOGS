// Elenco delle schermate: le 5 sezioni del menu e quelle che si aprono sopra.
import React from "react";
import { Esplora } from "./Esplora";

export type PropsSezione = { attiva: boolean };
export type PropsSchermata = { attiva: boolean; arg?: any };

export const SEZIONI: Record<string, React.ComponentType<PropsSezione>> = {
  esplora: Esplora,
};
export const SCHERMATE: Record<string, React.ComponentType<PropsSchermata>> = {};
