// Sensibilità della mira scelta dallo staff (pannello dello stand → «Mira del telefono»: Ctrl+Maiusc+K, o 3 s sul marchio
// NATPF del menu; B16 · decisione (d) dell'utente dell'08/11: «ok ma come lo misuro?»; è un'opzione dello staff, non dei
// visitatori: non sta nelle Opzioni): alta 17° (la base, scelta del B15), media 20°, bassa 23° (prima del B15). I gradi
// sono quelli di scarto del piatto per la mira piena (natpf_stroke_intent.AIM_FULL). Vale per i telefoni di questo
// computer (P1 e P2 dello stesso schermo), resta salvata (localStorage, chiave natpf-tennis.mira) e la diagnostica la
// registra con ogni colpo (racchetta.miraPiena), a ogni partita (partita.miraPiena) e nella sessione (gioco.miraPiena).
// Come si misura e quando cambiarla: docs/GUIDA_MISURA_MIRA.md
import { aimLevelOf, aimFullOf, AIM_LEVELS } from './natpf_stroke_intent.js';

export const AIM_LEVEL_KEY = 'natpf-tennis.mira';
let now = null;
export function readAimLevel(){
  if (now) return now;
  let v = null; try { v = localStorage.getItem(AIM_LEVEL_KEY); } catch {}
  return (now = aimLevelOf(v));
}
export function writeAimLevel(level){ const v = aimLevelOf(level); now = v; try { localStorage.setItem(AIM_LEVEL_KEY, v); } catch {} return v; }
export const aimFullNow = () => aimFullOf(readAimLevel());
// testo per gli avvisi e la diagnostica: «alta (17°)»
export const aimLevelLabel = (level = readAimLevel()) => `${aimLevelOf(level)} (${aimFullOf(level)}°)`;
// pulsante del pannello dello stand: «Alta · 17°»; un clic passa alla successiva (alta → media → bassa → alta)
export const aimLevelButton = (level = readAimLevel()) => { const v = aimLevelOf(level); return `${v[0].toUpperCase()}${v.slice(1)} · ${aimFullOf(v)}°`; };
export const nextAimLevel = (level = readAimLevel()) => AIM_LEVELS[(AIM_LEVELS.indexOf(aimLevelOf(level)) + 1) % AIM_LEVELS.length];
