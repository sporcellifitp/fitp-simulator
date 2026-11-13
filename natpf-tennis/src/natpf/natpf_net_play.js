// B31 (tappa 3, punto 1 del rapporto docs/b16/rapporto-gameplay.md: miglioramento 6, scheda M6 e punto 22): più gioco a
// rete per tutti e due. Misure e scelte: docs/b31/gioco-a-rete.md; banco: scripts/audit/rete.mjs (npm run audit:rete).
// Il riconoscimento dei gesti non cambia: qui ci sono solo movimento, esiti e scelte della CPU.
//   • Chi gioca (e il Player 2 nello stesso schermo, stessa regola) sale a rete dopo un attacco riuscito: un colpo
//     profondo e pulito giocato da dentro il campo (palla corta raggiunta, o un tagliato da poco dietro la riga del
//     servizio in su), e resta a rete dopo una volée o una schiacciata riuscite. Prima tornava sempre in fondo.
//   • A rete ci si muove meno in fretta (passo laterale corto e reazione un poco più lunga): la palla che passa lontana
//     (passante) o sopra la testa (pallonetto) può battere chi è salito male. Prima il movimento automatico arrivava su
//     tutto anche a rete, e andare a rete pagava sempre.
//   • La CPU sale a rete quando ha un colpo d'attacco (palla debole di chi gioca, palla corta raggiunta), gioca la volée
//     e schiaccia le palle alte (anche il pallonetto corto quando è in fondo); fa qualche rara palla corta, con un tetto
//     per game, e la scritta la dichiara.
//   • Il tagliato basso mette in difficoltà chi lo riceve da lontano (CPU in fondo); la palla rimbalza più bassa.
import { skillLevel } from './natpf_skill.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const NET_PLAY = Object.freeze({
  // Chi gioca: attacco riuscito che porta a rete. z: colpito entro tanto dalla rete (dentro il campo, non dalla riga di
  // fondo); sliceZ: il tagliato porta a rete anche da un poco più indietro (palla bassa, buona per avvicinarsi); depth:
  // cade almeno a tanto dalla rete (un approccio corto lascia il passante facile); q: qualità minima del colpo; stay:
  // da entro tanto dalla rete (volée, schiacciata, palla corta presa vicino) un colpo riuscito tiene a rete; netZ: dove ci
  // si ferma a rete (m dalla rete).
  // drive: il colpo forte, profondo e pulito da poco dentro la riga di fondo (entro drive.z) porta a rete anche lui
  approach: Object.freeze({ z: 9.2, depth: 8, q: .6, y: .85, stay: 6.4, netZ: 5.2,
    slice: Object.freeze({ z: 11.2, depth: 7.5, q: .7 }), drive: Object.freeze({ z: 10.8, depth: 9.4, q: .85, power: .6 }) }),
  // A rete (entro zone m dalla rete): reazione in più (s) e velocità del passo (× velocità piena) per arrivare sulla palla
  netMove: Object.freeze({ zone: 7, react: .12, speed: .55 }),
});

// L'esito del colpo (natpf_stroke_outcome.strokeOutcome) e da dove è partito portano chi colpisce a rete?
//   out: { shot, depth, q, failed, weak, netFault } · contactZ: distanza dalla rete al colpo (m, segno qualsiasi)
//   volley: palla presa al volo (volée o schiacciata)
//   power: forza del gesto (intenzione, 0…1) · contactY: altezza della palla all'impatto (m)
export function approachOf(out, contactZ, { volley = false, power = .5, contactY = 1 } = {}){
  if (!out || out.failed || out.weak || out.netFault) return false;
  const A = NET_PLAY.approach, z = Math.abs(finite(contactZ, 11.5)), shot = String(out.shot || '').toUpperCase();
  if (shot === 'LOB' || shot === 'DROP') return false;
  // già a rete: la volée o la schiacciata riuscita tiene lì (la palla corta raggiunta no: vale la regola dell'attacco)
  if (volley && z <= A.stay) return true;
  if (shot === 'SMASH') return false;
  const d = finite(out.depth), q = finite(out.q, 1);
  // palla corta raggiunta alta (da attaccare, non scavata da terra) e giocata in profondità
  if (z <= A.z && d >= A.depth && q >= A.q && finite(contactY, 1) >= A.y) return true;
  if (shot === 'SLICE') return z <= A.slice.z && d >= A.slice.depth && q >= A.slice.q;   // tagliato d'approccio
  return z <= A.drive.z && d >= A.drive.depth && q >= A.drive.q && finite(power) >= A.drive.power;
}

// Movimento a rete (natpf_impact.planPlayerIntercept): reazione in più e passo più corto entro netMove.zone dalla rete.
// { react, speed } da sommare alla reazione e da moltiplicare alla velocità; { 0, 1 } lontano dalla rete
export function netMoveOf(actorZ){
  const M = NET_PLAY.netMove;
  return Math.abs(finite(actorZ, 11.5)) < M.zone ? { react: M.react, speed: M.speed } : { react: 0, speed: 1 };
}
void clamp; void skillLevel;
