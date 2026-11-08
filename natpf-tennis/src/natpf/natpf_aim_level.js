// Sensibilità della mira scelta dallo staff (Opzioni del computer → «Mira del telefono», B16 · decisione (d) dell'utente
// dell'08/11: «ok ma come lo misuro?»): alta 17° (la base, scelta del B15), media 20°, bassa 23° (prima del B15). I gradi
// sono quelli di scarto del piatto per la mira piena (natpf_stroke_intent.AIM_FULL). Vale per i telefoni di questo
// computer (P1 e P2 dello stesso schermo), resta salvata come le altre opzioni (localStorage) e la diagnostica la registra
// con ogni colpo (racchetta.miraPiena), a ogni partita (partita.miraPiena) e nella sessione (gioco.miraPiena).
// Come si misura e quando cambiarla: docs/GUIDA_MISURA_MIRA.md
import { aimLevelOf, aimFullOf } from './natpf_stroke_intent.js';

export const AIM_LEVEL_KEY = 'natpf-tennis.mira';
let now = null;
export function readAimLevel(){
  if (now) return now;
  let v = null; try { v = localStorage.getItem(AIM_LEVEL_KEY); } catch {}
  return (now = aimLevelOf(v));
}
export function writeAimLevel(level){ const v = aimLevelOf(level); now = v; try { localStorage.setItem(AIM_LEVEL_KEY, v); } catch {} return v; }
export const aimFullNow = () => aimFullOf(readAimLevel());
// testo per le Opzioni e la diagnostica: «alta (17°)»
export const aimLevelLabel = (level = readAimLevel()) => `${aimLevelOf(level)} (${aimFullOf(level)}°)`;
