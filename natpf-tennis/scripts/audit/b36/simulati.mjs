// B36.0 (docs/b36/misure-b36-0.md): i giocatori simulati dei banchi vedono la direzione del telefono.
//   cimaSimulata  piatto letto di un colpo simulato e, dagli stessi numeri, lo scarto della cima in gradi (natpf.aimDev) e
//                 la mira piena (natpf.aimFull), come li manda il telefono. Un sorteggio solo (g, normale standard, preso
//                 dal banco nello stesso punto di sempre): con «Classica» il motore non usa aimDev e le impronte restano
//                 identiche. Profili «gira tanto» (giro, giroSd): quando mirano girano la cima di giro ± giroSd gradi
//   contaColpo    quanti colpi della racchetta simulata hanno usato la regola nuova della direzione
//                 (natpf_direction.usedNewRule sull'esito). Lo contano rally-balance.simulate, b19/due-umani.play,
//                 b19/due-umani-distanza.match e direzione-telefono.mjs, così ogni banco costruito sopra di loro lo dice
//                 senza toccarlo: alla fine del programma una riga sull'uscita degli errori (uscite in JSON e righe delle
//                 impronte restano le stesse; sotto `node --test` niente riga: i test leggono out.direzione). Oggi la
//                 regola nuova non c'è: 0 colpi. Dalla B36.1 un test fallisce se con «Nuova» restano 0.
import { usedNewRule, devOfFace, FACE_DEAD } from '../../../src/natpf/natpf_direction.js';
import { AIM_FULL } from '../../../src/natpf/natpf_stroke_intent.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// P: profilo (sd: deviazione del piatto in unità della mira piena; giro, giroSd in gradi; aimFull), face: piatto voluto
// (−1…+1, senza rumore), aimed: colpo mirato, g: un numero dalla normale standard
export function cimaSimulata(P, face, aimed, g, { sd = P.wristSd } = {}){
  const full = P.aimFull ?? AIM_FULL.alta, span = full - FACE_DEAD;
  const f = P.giro && aimed && face ? Math.sign(face)*(P.giro - FACE_DEAD)/span + g*(P.giroSd ?? 0)/span : face + g*sd;
  return { f, face: clamp(f, -1, 1), aimDev: +devOfFace(f, full).toFixed(1), aimFull: full };
}

export const REGOLA = { colpi: 0, nuova: 0 };
let armato = false;
// out: l'esito del colpo (natpfLastRacket.out); conti: i conti del banco (out.direzione), facoltativi
export function contaColpo(out, conti = null){
  const nuova = usedNewRule(out);
  REGOLA.colpi++; if (nuova) REGOLA.nuova++;
  if (conti){ conti.colpi++; if (nuova) conti.nuova++; }
  if (!armato && !process.env.NODE_TEST_CONTEXT){ armato = true; process.once('exit', () => { if (REGOLA.colpi) process.stderr.write(rigaRegola()); }); }
  return nuova;
}
export const rigaRegola = (R = REGOLA) => `[B36] colpi della racchetta simulata con la regola nuova della direzione: ${R.nuova} su ${R.colpi}${R.nuova ? '' : ' (con «Classica» sono sempre 0)'}\n`;
