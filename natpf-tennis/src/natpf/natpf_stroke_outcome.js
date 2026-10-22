// Telefono come racchetta: dall'intenzione e dall'esecuzione all'esito del colpo di chi gioca, senza caso
// (docs/NATPF_RACCHETTA_VIRTUALE.md §3). Lo usa il motore all'istante dell'impatto, quando sa dov'è la palla.
//
//   • intenzione (natpf_stroke_intent.js): tipo di colpo, forza, profondità voluta, salita, mira del piatto;
//   • tempo: dentro la finestra comoda (± timingSpan del livello) è una scelta, come nei giochi con il controller di
//     movimento: in anticipo la palla va incrociata, in ritardo lungolinea. Oltre la finestra è un errore di esecuzione:
//     la direzione non va più in là della scelta piena, ma la palla esce più corta, più alta e più lenta, e se il
//     ritardo o l'anticipo sono grandi spinge fuori di lato;
//   • allungo e preparazione tolgono qualità come prima (reachQuality, prepQuality di natpf_skill.js).
// Assistenza: con un gesto ragionevole (tempo dentro la finestra e qualità sufficiente) la palla resta in campo; escono
// solo i colpi estremi. Stessi ingressi, stesso esito.
import { ARC, flightForClear, swingGrade, timingUnits } from './natpf_skill.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const lerp = (a, b, u) => a + (b - a)*clamp(u);

export const OUTCOME = Object.freeze({
  natural: .15,       // un colpo neutro va un poco incrociato (il colpo più sicuro)
  timingAim: .72,     // tempo dentro la finestra → mira (piena a ±1 unità)
  faceAim: .32,       // piatto girato rispetto al proprio colpo abituale
  xMax: 3.65,         // m: mira piena, 0,45 m dentro la riga laterale del singolare
  pushOut: 1.4,       // m di lato per unità di tempo oltre la finestra (può uscire)
  // profondità del rimbalzo (m dalla rete) per tipo, da forza 0 a forza 1
  depth: Object.freeze({ TOPSPIN: [7.4, 10.9], FLAT: [8.2, 11.2], SLICE: [7.0, 10.3], DROP: [2.4, 4.4], LOB: [9.2, 11.0], SMASH: [6.2, 10.2] }),
  maxDepth: 11.3,     // m: profondità massima con l'assistenza (la riga di fondo è a 11,89)
  shortPerQ: 2.4,     // m più corta per la qualità che manca
  shortPerExcess: .8, // m più corta per unità di tempo oltre la finestra
  heavyRise: .45, heavyGain: 4,   // top spin con la testa che sale molto e forte: va lunga (può uscire)
  wideFrom: 2.9, wideSpan: 1, wideDepth: 6,   // angolo stretto: oltre 2,9 m di lato la palla cade più corta
  floatPerQ: .35,     // m più alta sulla rete per la qualità che manca (palla «galleggiante» per l'avversario)
  lobFlight: [2.2, 1.75], smashFlight: .42,
  volleyShort: 1,     // m: la volée spinge meno
  netLowY: .42, netExcess: .45,   // palla presa sotto 0,42 m molto fuori tempo: in rete
  assistQ: .6,        // sotto questa qualità l'assistenza non tiene la palla dentro
});

// Qualità del tempo: piena dentro la finestra, scende oltre (fino a metà)
export const timingQualityOf = t => 1 - .5*clamp(Math.abs(finite(t)) - 1, 0, 1);

// intent: { shot, power, depth, rise, face } (minuscolo o maiuscolo); timing: s di anticipo all'impatto (negativo = in
// ritardo); contact: +1 se la palla è alla destra di chi colpisce, −1 a sinistra; quality: allungo × preparazione (0…1);
// contactY: altezza della palla all'impatto; volley: presa al volo; level: parametri del livello (skillLevel).
// Restituisce, nel riferimento di chi colpisce (x a destra, depth in avanti dalla rete): { x, depth, clear, topspin,
// flight (solo pallonetto e schiacciata), netFault, grade, cursor, t, excess, q, assisted }.
export function strokeOutcome({ intent = {}, timing = 0, contact = 1, quality = 1, contactY = 1, volley = false, level = {} } = {}){
  const O = OUTCOME, shot = String(intent.shot || 'topspin').toUpperCase();
  const power = clamp(finite(intent.power, .5)), want = clamp(finite(intent.depth, power)), rise = clamp(finite(intent.rise), -1, 1);
  const c = finite(contact, 1) >= 0 ? 1 : -1, t = timingUnits(timing, level), inside = clamp(t, -1, 1), excess = Math.max(0, Math.abs(t) - 1);
  const q = clamp(timingQualityOf(t)*clamp(finite(quality, 1)), .2, 1);
  const assisted = excess === 0 && q >= O.assistQ;
  // direzione: tempo dentro la finestra e piatto, poi la spinta oltre la finestra
  const aim = clamp(-c*O.natural - c*inside*O.timingAim + clamp(finite(intent.face), -1, 1)*O.faceAim, -1, 1);
  let x = aim*O.xMax - c*Math.sign(t)*excess*O.pushOut;
  // profondità: forza voluta, meno per la qualità che manca e il tempo oltre la finestra
  const D = O.depth[shot] || O.depth.TOPSPIN;
  let depth = lerp(D[0], D[1], want) - (1 - q)*O.shortPerQ - excess*O.shortPerExcess - (volley ? O.volleyShort*(1 - power) : 0);
  if (shot === 'TOPSPIN') depth += clamp(rise - O.heavyRise, 0, .4)*O.heavyGain*power;
  if (shot !== 'DROP' && shot !== 'LOB') depth += (O.wideDepth - depth)*clamp((Math.abs(x) - O.wideFrom)/O.wideSpan)*(depth > O.wideDepth ? 1 : 0);
  if (assisted){ x = clamp(x, -O.xMax, O.xMax); depth = Math.min(depth, O.maxDepth); }
  depth = Math.max(shot === 'DROP' ? 1.6 : 3, depth);
  // altezza sulla rete ed effetto
  const A = ARC[shot === 'DROP' ? 'SLICE' : shot === 'SMASH' ? 'FLAT' : shot === 'LOB' ? 'MOON' : shot] || ARC.TOPSPIN, soft = 1 - power;
  const high = clamp((finite(contactY, 1) - 1.5)/.5)*.18;
  const clear = Math.max(ARC.netY + .02, A.clear[0] + (A.clear[1] - A.clear[0])*soft + (1 - q)*O.floatPerQ - high + (shot === 'TOPSPIN' ? .6*clamp(rise - .15, 0, .6) : 0));
  const topspin = shot === 'TOPSPIN' ? 15 + 8*clamp(rise) + 6*soft : shot === 'FLAT' ? 12 : shot === 'SLICE' ? -6.5 : shot === 'DROP' ? -3 : shot === 'LOB' ? 5 : 9;
  const flight = shot === 'LOB' ? lerp(O.lobFlight[0], O.lobFlight[1], power) : shot === 'SMASH' ? Math.max(O.smashFlight, depth/26) : null;
  const netFault = finite(contactY, 1) < O.netLowY && excess > O.netExcess;
  const g = swingGrade(timing, level);
  return { x: +x.toFixed(3), depth: +depth.toFixed(3), clear: +clear.toFixed(3), topspin: +topspin.toFixed(2), flight: flight == null ? null : +flight.toFixed(3),
    netFault, grade: g.grade, cursor: g.cursor, t: +t.toFixed(3), excess: +excess.toFixed(3), q: +q.toFixed(3), assisted, shot };
}

// Tempo di volo per arrivare alla profondità con l'altezza voluta sulla rete (come shotArc, senza caso)
export function outcomeFlight(out, { fromY = 1, fromZ = 11, toZ = -9, flight = .8 } = {}){
  if (Number.isFinite(out?.flight)) return out.flight;
  return flightForClear({ fromY, fromZ, toZ, flight, topspin: out.topspin, clear: out.clear });
}

// Finestra d'impatto per livello (s): uno swing arrivato fino a «early» prima che la palla raggiunga il punto
// d'impatto resta in attesa ed è giocato all'arrivo con il suo tempo vero; oltre è un colpo a vuoto. Dopo il punto
// d'impatto si colpisce ancora per «late» secondi. Arcade a tutti i livelli: i livelli cambiano quanto costa il tempo
// sbagliato (timingSpan), non se si prende la palla. Prima a Esperto e Leggenda l'attesa era di 0,16 s: colpi a vuoto
// con la palla ancora a 3–10 m (sessione del 22/10).
export const IMPACT = Object.freeze({
  casual: Object.freeze({ early: .5, late: .16 }),
  pro: Object.freeze({ early: .42, late: .13 }),
  leggenda: Object.freeze({ early: .4, late: .12 }),
  '1v1': Object.freeze({ early: .45, late: .14 }),
  contactAhead: .35,  // m: punto d'impatto davanti a chi colpisce (la palla poco davanti al corpo)
  reach: 2.4,         // m: portata laterale della racchetta (il movimento automatico porta la palla a ~0,7 m)
});
export const impactWindow = difficulty => IMPACT[String(difficulty || 'casual').toLowerCase()] || IMPACT.casual;
