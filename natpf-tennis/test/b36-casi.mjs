// B36.1 «La cima comanda (interna)» (docs/b73/direzione-b36-1.md): 10 000 colpi a caso, sempre gli stessi, per l'esito del
// colpo di chi gioca (natpf_stroke_outcome.strokeOutcome). Servono alla prova «con Classica l'esito è identico a prima»
// (natpf-b36-interruttore.test.mjs): l'impronta di questi casi è stata presa sulla base 09cdac6b (2026-11-19.1), prima
// della regola nuova. Non è un file di prove (node --test prende solo test/*.test.mjs).
// Ogni caso copre tutto quello che entra nell'esito: tipo di colpo (anche schiacciata, palla corta, pallonetto), forza,
// salita, piatto (0, ±1, a caso), intenzione ricostruita (webcam, mouse, telefoni senza la forma) o dal telefono con la
// forma, tempo, finestra in ritardo, velocità della palla, lato, posizione e profondità dell'impatto, qualità, pressione,
// scambio caldo, ritmo e ritardo abituale, altezza della palla, volée, rete, palla corta e cinque livelli.
import { skillLevel } from '../src/natpf/natpf_skill.js';

// generatore deterministico (mulberry32), lo stesso a ogni prova
export function rngCasi(seed){
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
}
const LIVELLI = ['casual', 'pro', 'leggenda', '1v1', 'bambini'];
const TIPI = ['topspin', 'topspin', 'topspin', 'flat', 'slice', 'drop', 'lob', 'smash'];
export function casoB36(R){
  const u = (a, b) => a + (b - a)*R(), pick = a => a[Math.floor(R()*a.length)], p = q => R() < q, f = (v, k) => +v.toFixed(k);
  const fr = R(), face = fr < .1 ? 0 : fr < .15 ? 1 : fr < .2 ? -1 : f(u(-1.2, 1.2), 3);
  const shot = pick(TIPI);
  const intent = { shot, power: f(u(0, 1), 3), depth: f(u(0, 1), 3), rise: f(u(-1, 1), 3), face, conf: f(u(0, 1), 2), typePower: f(u(0, 1), 3) };
  // intenzione ricostruita (natpf_stroke_outcome.eventIntent: webcam, mouse, tastiera, telefoni senza la forma)
  if (p(.15)) Object.assign(intent, { derived: true, faceWeight: .7 });
  return { intent, timing: p(.1) ? 0 : f(u(-.4, .4), 4), lateSpan: p(.3) ? null : f(u(.04, .2), 3), ballVz: p(.1) ? null : f(u(-34, 34), 2), contact: p(.5) ? 1 : -1,
    hitX: f(u(-6, 6), 2), hitZ: p(.1) ? null : f(u(0, 14), 2), quality: f(u(.2, 1), 3), touch: f(u(.2, 1), 3), pressure: f(u(.5, 1), 3), hotPress: p(.7) ? 1 : f(u(.4, 1), 3),
    rhythm: p(.3) ? 0 : f(u(-.8, .8), 3), rhythmLag: p(.7) ? 0 : f(u(0, .12), 3), contactY: f(u(.2, 2.6), 2), volley: p(.2), net: p(.2), shortBall: p(.15), level: skillLevel(pick(LIVELLI)) };
}
export const casiB36 = (n = 10000, seed = 3601) => { const R = rngCasi(seed); return Array.from({ length: n }, () => casoB36(R)); };
