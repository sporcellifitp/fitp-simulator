// Telefono come racchetta: dall'intenzione e dall'esecuzione all'esito del colpo di chi gioca, senza caso
// (docs/NATPF_RACCHETTA_VIRTUALE.md §3 e §6). Lo usa il motore all'istante dell'impatto, quando sa dov'è la palla.
//
//   • intenzione (natpf_stroke_intent.js): tipo di colpo, forza, profondità voluta, salita, mira del piatto;
//   • tempo: dentro la finestra comoda (± timingSpan del livello) è una scelta, come nei giochi con il controller di
//     movimento: in anticipo la palla va incrociata, in ritardo lungolinea. Oltre la finestra è un errore di esecuzione:
//     la palla continua ad andare verso l'esterno (fino alla fine della finestra d'impatto, dove esce), più corta, più
//     alta e più lenta;
//   • campo aperto: la mira si misura attorno a un punto neutro che segue la posizione della palla all'impatto, e va da
//     una riga laterale all'altra; la profondità va dalla riga del servizio (e prima) alla riga di fondo. Tutto è
//     continuo: niente bersagli, zone, gradini o tetti che mettono molte palle nello stesso punto;
//   • allungo e preparazione tolgono qualità come prima (reachQuality, prepQuality di natpf_skill.js).
// Assistenza: con un gesto ragionevole (tempo dentro la finestra e qualità sufficiente) la palla resta in campo, avvicinata
// alle righe senza superarle e senza cambiare l'ordine delle direzioni; sfuma oltre la finestra e sotto la qualità del
// livello. Escono solo i colpi estremi. Stessi ingressi, stesso esito.
import { ARC, flightForClear, swingGrade, timingUnits } from './natpf_skill.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const lerp = (a, b, u) => a + (b - a)*clamp(u);

export const OUTCOME = Object.freeze({
  natural: .15,       // un colpo neutro va un poco incrociato (il colpo più sicuro); la spinta sparisce verso i bordi della
                      // finestra (23/10: prima valeva anche in ritardo e il lungolinea pieno chiedeva anche il piatto)
  timingAim: 1,       // tempo dentro la finestra → mira: ai bordi (±1 unità) incrociato e lungolinea pieni (era .72)
  faceAim: .32,       // piatto girato rispetto al proprio colpo abituale
  xMax: 3.65,         // m: mira piena, 0,45 m dentro la riga laterale del singolare
  follow: .4,         // il punto neutro segue di tanto la posizione laterale della palla all'impatto (0: sempre il centro)
  pushOut: 1.4,       // m di lato per unità di tempo oltre la finestra (per livello in ASSIST: con il lungolinea e
                      // l'incrociato pieni al bordo della finestra la palla esce nell'ultima parte della finestra d'impatto)
  // profondità del rimbalzo (m dalla rete) per tipo, da profondità voluta 0 a 1: dalla riga del servizio (e prima)
  // alla riga di fondo; il proprio colpo tipico (profondità voluta circa 0,5) cade attorno a 8,7 m. Prima un colpo
  // normale andava da 7,4 a 10,9 m (2,5 m con i gesti tipici: metà campo e centro irraggiungibili)
  depth: Object.freeze({ TOPSPIN: [6, 11.4], FLAT: [6.4, 11.6], SLICE: [5.2, 10.6], DROP: [1.8, 4.6], LOB: [8.6, 11.4], SMASH: [5.6, 10.8] }),
  depthKnee: 10.8, maxDepth: 11.6,   // m: con l'assistenza la palla si avvicina alla riga di fondo (11,89) senza superarla
  sideKnee: 3.1, sideEdge: 4,        // m: con l'assistenza la palla si avvicina alla riga laterale (4,115) senza superarla
  minDepth: 3, dropMin: 1.6,         // m: un colpo (una palla corta) non cade più vicino alla rete di così
  assistFade: .25,    // unità di tempo oltre la finestra in cui l'assistenza sparisce (prima di colpo, alla finestra)
  assistQSpan: .1,    // qualità attorno alla soglia del livello in cui l'assistenza sparisce (prima di colpo)
  shortPerQ: 2.4,     // m più corta per la qualità che manca
  shortPerExcess: .8, // m più corta per unità di tempo oltre la finestra
  heavyRise: .45, heavyGain: 4,   // top spin con la testa che sale molto e forte: va lunga (può uscire)
  // incrociato stretto: dalla parte dell'incrociato, oltre wideFrom di lato, la palla cade più corta, verso wideDepth in
  // proporzione (widePull): la differenza di profondità voluta resta. Il lungolinea non è un angolo: resta profondo
  // (23/10: con il lungolinea pieno al bordo della finestra anche lui cadeva a 6,5–7 m, e le palle si ammucchiavano lì)
  wideFrom: 3.2, wideSpan: .8, wideDepth: 6, widePull: .6,
  floatPerQ: .35,     // m più alta sulla rete per la qualità che manca (palla «galleggiante» per l'avversario)
  lobFlight: [2.2, 1.75], smashFlight: .42,
  volleyShort: 1,     // m: la volée spinge meno
  netLowY: .42, netExcess: .45,   // palla presa sotto 0,42 m molto fuori tempo: in rete
  weakDepth: 6.8, weakFloat: .9,  // a rete, colpo fallito con il tempo perfetto: al massimo a 6,8 m dalla rete, 0,9 m più alto
  assistQ: .6,        // sotto questa qualità l'assistenza non tiene la palla dentro
});

// Assistenza per livello: mira piena (xMax, m dal centro), qualità sotto la quale la palla non è più tenuta in campo
// (assistQ) e sotto la quale il colpo fallisce (failQ: in rete se la palla è bassa, lunga se è alta), finestra della
// direzione (span, s; altrimenti timingSpan del livello). Richiesta del 23/10: il livello cambia la precisione chiesta
// (finestra del tempo, qualità sotto cui la palla non è tenuta dentro o fallisce), non dove si può mandare la palla:
// stessa mira piena e stesso peso del tempo a tutti i livelli. Prima a Leggenda 3,1 m e 0,58 (lungolinea al 43%).
// pushOut: m di lato per unità di tempo oltre la finestra della direzione (quanto presto un colpo troppo in anticipo o
// in ritardo esce di lato: a Casual nell'ultima parte della finestra d'impatto, a Leggenda prima)
export const ASSIST = Object.freeze({
  casual: Object.freeze({ xMax: 3.65, assistQ: .5, failQ: .2, pushOut: .8 }),
  '1v1': Object.freeze({ xMax: 3.65, assistQ: .6, failQ: .34, pushOut: .9 }),
  pro: Object.freeze({ xMax: 3.65, assistQ: .62, failQ: .3, pushOut: .9 }),
  leggenda: Object.freeze({ xMax: 3.65, assistQ: .8, failQ: .63, pressureFrom: 10, pushOut: 1.1 }),
});
export const assistOf = level => ASSIST[level?.name] || (level?.cpuLegend ? ASSIST.leggenda : level?.assistWindow <= .16 ? ASSIST.pro : level?.assistWindow >= .3 ? ASSIST.casual : ASSIST['1v1']);
// finestra della direzione (s) del livello
export const directionSpan = level => assistOf(level).span || level?.timingSpan || .16;

// Pressione degli scambi lunghi: dal colpo «from» dello scambio la qualità di tutti e due cala di «step» a colpo (al
// massimo di «max»). Senza, un giocatore molto regolare e la CPU Leggenda arrivavano a scambi senza fine (nel banco
// 6–8 punti su 50 oltre i 60 colpi): ora uno dei due prima o poi lascia una palla corta e alta, o sbaglia.
export const RALLY_PRESSURE = Object.freeze({ from: 16, step: .015, max: .45 });
export const rallyPressure = (strokes, from = RALLY_PRESSURE.from) => 1 - Math.min(RALLY_PRESSURE.max, Math.max(0, finite(strokes) - from)*RALLY_PRESSURE.step);

// Qualità del tempo: piena dentro la finestra, scende oltre (fino a metà)
export const timingQualityOf = t => 1 - .5*clamp(Math.abs(finite(t)) - 1, 0, 1);

// Limiti dolci: uguale fino a knee, poi verso edge senza raggiungerlo. Sempre crescenti: niente gradini e niente
// palle tutte nello stesso punto (prima l'assistenza era un taglio netto alla mira piena e a 11,3 m)
const softEdge = (v, knee, edge) => (v <= knee ? v : knee + (edge - knee)*Math.tanh((v - knee)/(edge - knee)));
const softFloor = (v, floor, knee) => (v >= knee ? v : knee - (knee - floor)*Math.tanh((knee - v)/(knee - floor)));
// Punto neutro (mira 0) nel riferimento di chi colpisce: segue la posizione laterale della palla all'impatto
export const neutralX = (hitX, xMax = OUTCOME.xMax) => clamp(finite(hitX), -xMax, xMax)*OUTCOME.follow;
// Caduta laterale dalla mira: −1 e +1 sono le due righe (xMax), 0 il punto neutro; oltre ±1 si continua in linea
export const landingFromAim = (aim, x0, xMax = OUTCOME.xMax) => x0 + aim*(aim >= 0 ? xMax - x0 : xMax + x0);
// Mira che porta la palla in x (inversa di landingFromAim; per chi vuole mirare un punto, come i banchi di prova)
export const aimForLanding = (x, x0, xMax = OUTCOME.xMax) => (x - x0)/Math.max(.1, x >= x0 ? xMax - x0 : xMax + x0);

// intent: { shot, power, depth, rise, face } (minuscolo o maiuscolo); timing: s di anticipo all'impatto (negativo = in
// ritardo); lateSpan: s di ritardo che valgono il lungolinea pieno (lateSpanOf: con le palle veloci è più breve, perché
// la palla passa il corpo prima); contact: +1 colpo di dritto del destro (o di rovescio del mancino), −1 l'altro lato:
// dice da che parte va la palla in anticipo; hitX: posizione laterale della palla all'impatto (m, riferimento di chi
// colpisce, + a destra); quality: la situazione di chi colpisce, allungo × corsa × preparazione × palla veloce (0…1);
// pressure: pressione degli scambi lunghi (rallyPressure, 0…1); contactY: altezza della palla all'impatto; volley: presa
// al volo; net: chi colpisce è a rete (entro 5 m dalla rete, anche dopo il rimbalzo); level: parametri del livello.
// Restituisce, nel riferimento di chi colpisce (x a destra, depth in avanti dalla rete): { x, depth, clear, topspin,
// flight (solo pallonetto e schiacciata), netFault, failed, weak, pressured, grade, cursor, t, excess, q, aim, x0,
// assist, assisted }.
export function strokeOutcome({ intent = {}, timing = 0, lateSpan = null, contact = 1, hitX = 0, quality = 1, pressure = 1, contactY = 1, volley = false, net = false, level = {} } = {}){
  const O = OUTCOME, shot = String(intent.shot || 'topspin').toUpperCase();
  const power = clamp(finite(intent.power, .5)), want = clamp(finite(intent.depth, power)), rise = clamp(finite(intent.rise), -1, 1);
  const AS = assistOf(level), span = directionSpan(level), late = Number.isFinite(lateSpan) ? clamp(lateSpan, .04, span) : span;
  // tempo in unità della finestra della direzione (+ anticipo). Oltre ±1 la palla continua ad andare verso l'esterno
  // fino alla fine della finestra d'impatto (prima si fermava a 1,6 unità: nell'ultimo 40% della finestra tutte le
  // palle uguali). ±4 è oltre ogni finestra d'impatto, solo per sicurezza
  const c = finite(contact, 1) >= 0 ? 1 : -1, t = clamp(finite(timing) >= 0 ? finite(timing)/span : finite(timing)/late, -4, 4), inside = clamp(t, -1, 1), excess = Math.max(0, Math.abs(t) - 1);
  const qs = clamp(timingQualityOf(t)*clamp(finite(quality, 1)), .2, 1), q = clamp(qs*clamp(finite(pressure, 1)), .2, 1);
  // assistenza: piena dentro la finestra e sopra la qualità del livello, sfuma oltre (prima un gradino)
  const assist = clamp(1 - excess/O.assistFade)*clamp((q - AS.assistQ)/O.assistQSpan + .5), xMax = AS.xMax, k = xMax/O.xMax;
  // direzione: mira dal tempo (ai bordi della finestra le due righe; la spinta naturale verso l'incrociato solo vicino al
  // tempo neutro) e dal piatto attorno al punto neutro, poi la spinta oltre la finestra
  const aim = -c*O.natural*(1 - Math.abs(inside)) - c*inside*finite(AS.timingAim, O.timingAim) + clamp(finite(intent.face), -1, 1)*finite(intent.faceWeight, O.faceAim);
  const x0 = neutralX(hitX, xMax), raw = landingFromAim(aim, x0, xMax) - c*Math.sign(t)*excess*finite(AS.pushOut, O.pushOut);
  const x = raw + (Math.sign(raw)*softEdge(Math.abs(raw), O.sideKnee*k, O.sideEdge*k) - raw)*assist;
  // profondità: voluta (forza e ampiezza dello swing), meno per la qualità che manca e il tempo oltre la finestra
  const D = O.depth[shot] || O.depth.TOPSPIN;
  let depth = lerp(D[0], D[1], want) - (1 - q)*O.shortPerQ - excess*O.shortPerExcess - (volley ? O.volleyShort*(1 - power) : 0);
  if (shot === 'TOPSPIN') depth += clamp(rise - O.heavyRise, 0, .4)*O.heavyGain*power;
  if (shot !== 'DROP' && shot !== 'LOB' && -c*x > 0) depth -= Math.max(0, depth - O.wideDepth)*O.widePull*clamp((Math.abs(x) - O.wideFrom)/O.wideSpan);
  depth += (softEdge(depth, O.depthKnee, O.maxDepth) - depth)*assist;
  depth = shot === 'DROP' ? softFloor(depth, O.dropMin, O.dropMin + .6) : softFloor(depth, O.minDepth, O.minDepth + .6);
  // altezza sulla rete ed effetto
  const A = ARC[shot === 'DROP' ? 'SLICE' : shot === 'SMASH' ? 'FLAT' : shot === 'LOB' ? 'MOON' : shot] || ARC.TOPSPIN, soft = 1 - power;
  const high = clamp((finite(contactY, 1) - 1.5)/.5)*.18;
  const clear = Math.max(ARC.netY + .02, A.clear[0] + (A.clear[1] - A.clear[0])*soft + (1 - q)*O.floatPerQ - high + (shot === 'TOPSPIN' ? .6*clamp(rise - .15, 0, .6) : 0));
  const topspin = shot === 'TOPSPIN' ? 15 + 8*clamp(rise) + 6*soft : shot === 'FLAT' ? 12 : shot === 'SLICE' ? -6.5 : shot === 'DROP' ? -3 : shot === 'LOB' ? 5 : 9;
  const flight = shot === 'LOB' ? lerp(O.lobFlight[0], O.lobFlight[1], power) : shot === 'SMASH' ? Math.max(O.smashFlight, depth/26) : null;
  // colpo fallito: tempo molto sbagliato su una palla bassissima, o qualità sotto failQ (in corsa, in allungo, palla
  // veloce, sotto pressione): in rete se la palla è sotto il metro, altrimenti lunga oltre la riga di fondo. Deterministico.
  // A rete (entro 5 m dalla rete, al volo o dopo il rimbalzo) con il tempo perfetto la situazione non manda più la palla in
  // rete né lunga: passa, corta e alta, una palla facile da attaccare (weak). Segnalazione del 23/10, sera: a rete colpi
  // con il tempo perfetto finivano in rete. A Leggenda (failQ .63) la palla corta della CPU (un colpo su tre contro
  // «amatore») ripresa di corsa arrivava a qualità .55–.62: nel banco, contro «amatore», 245 colpi a rete su 1200 punti
  // finivano in rete con il tempo perfetto, 215 per la situazione. Resta l'errore degli scambi lunghi (pressured: senza la
  // pressione la qualità sarebbe sopra failQ), il modo in cui finiscono gli scambi senza fine: contro «preciso» tutti i
  // colpi falliti con il tempo perfetto sono di questo tipo (dal 15° colpo); senza, la CPU Leggenda vinceva il 43% dei game
  // contro di lui (criterio ≥ 60%)
  const g = swingGrade(t*(level?.timingSpan || span), level), fq = finite(AS.failQ, 0);
  const failed = q < fq && shot !== 'DROP', pressured = failed && qs >= fq;
  const weak = failed && !pressured && (!!volley || !!net) && g.grade === 'PERFECT';
  const netFault = (finite(contactY, 1) < O.netLowY && excess > O.netExcess) || (failed && !weak && finite(contactY, 1) < 1);
  if (failed && !weak && !netFault) depth = Math.max(depth, 12.6 + (fq - q)*4);
  let lift = clear;
  if (weak){ depth = Math.min(depth, O.weakDepth); lift = clear + O.weakFloat; }
  return { x: +x.toFixed(3), depth: +depth.toFixed(3), clear: +lift.toFixed(3), topspin: +topspin.toFixed(2), flight: flight == null ? null : +flight.toFixed(3),
    netFault, failed, weak, pressured, grade: g.grade, cursor: g.cursor, t: +t.toFixed(3), excess: +excess.toFixed(3), q: +q.toFixed(3),
    aim: +aim.toFixed(3), x0: +x0.toFixed(3), assist: +assist.toFixed(3), assisted: assist >= .5, shot };
}

// Ritardo (s) che vale il lungolinea pieno: il tempo che la palla impiega a passare lateBehind metri dietro il punto
// d'impatto, al massimo la finestra del livello. vz: velocità della palla lungo il campo (m/s).
export const lateSpanOf = (vz, level = {}) => clamp(IMPACT.lateBehind/Math.max(1, Math.abs(finite(vz, 15))), .05, directionSpan(level));

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
// In ritardo il lungolinea pieno vale lateSpanOf (la palla passa lateBehind metri dietro il punto d'impatto); si colpisce
// ancora fino a lateExtra volte quel tempo (spinta oltre la finestra, la palla può uscire di lato), poi è a vuoto.
export const IMPACT = Object.freeze({
  casual: Object.freeze({ early: .5, lateExtra: 2 }),
  pro: Object.freeze({ early: .42, lateExtra: 1.8 }),
  leggenda: Object.freeze({ early: .4, lateExtra: 1.5 }),
  '1v1': Object.freeze({ early: .45, lateExtra: 1.8 }),
  contactAhead: .35,  // m: punto d'impatto davanti a chi colpisce (la palla poco davanti al corpo)
  lateBehind: 1.4,    // m dietro il punto d'impatto: lungolinea pieno
  lateExtra: 1.5,     // oltre questo multiplo del ritardo pieno la palla è passata (per livello: più tollerante a Casual)
  reach: 2.4,         // m: portata laterale della racchetta (il movimento automatico porta la palla a ~0,7 m)
});
export const impactWindow = difficulty => IMPACT[String(difficulty || 'casual').toLowerCase()] || IMPACT.casual;

// Intenzione da qualunque colpo arrivato al motore: dal telefono con la forma (natpf.intent), altrimenti ricostruita
// dai campi di sempre (tipo di colpo, forza, mira): telefoni non aggiornati, webcam, controlli di prova.
const RISE_OF = Object.freeze({ lob: .8, topspin: .3, flat: 0, slice: -.4, drop: -.4, smash: -.3 });
export function eventIntent(e = {}){
  const n = e.natpf || {};
  if (n.intent && typeof n.intent === 'object') return n.intent;
  const raw = String(n.shot || (e.natpfDrop ? 'drop' : e.shotType) || 'topspin').toLowerCase();
  const shot = ['topspin', 'flat', 'slice', 'drop', 'lob', 'smash'].includes(raw) ? raw : raw === 'power' ? 'flat' : 'topspin';
  // forza dalla velocità del gesto che arriva al motore (come prima); natpf.power solo se manca
  const power = Number.isFinite(Number(e.speed)) ? clamp((Number(e.speed) - .8)/.85) : Number.isFinite(n.power) ? clamp(n.power) : .5;
  const face = Number.isFinite(n.wrist) ? clamp(n.wrist, -1, 1) : clamp(finite(e.dirX), -1, 1);
  // la mira di questi controlli (dirX) è già una scelta di direzione: pesa più del piatto del telefono
  return { shot, power, depth: power, rise: RISE_OF[shot], face, faceWeight: .7, derived: true };
}
// Schiacciata all'impatto: sopra 2,3 m solo da sopra la testa; tra 1,75 e 2,3 m se il gesto è una schiacciata o scende
export function smashAt(e = {}, ballY = 1){
  const y = finite(ballY, 1), it = eventIntent(e);
  if (y >= 2.3) return true;
  if (y < 1.75) return false;
  return e.side === 'overhead' || it.shot === 'smash' || String(e.shotType || '').toLowerCase() === 'smash' || (finite(it.rise) <= -.05 && finite(it.power, .5) >= .3);
}

// Servizio dal gesto (prima era sempre «POWER SERVE» con la posizione a caso: sessione del 22/10). Il lancio parte con il
// primo gesto; il colpo è il gesto dopo, giocato quando arriva. Il tempo rispetto al punto più alto del lancio (tau, s,
// + prima) decide la qualità; forza, effetto e angolo vengono dal gesto. Il servizio resta nel quadrato come prima
// (assistenza: i falli di servizio non ci sono), ma un servizio sporco è più lento e più centrale.
export const SERVE = Object.freeze({
  ignoreBefore: .42,     // s prima del punto più alto: il gesto fa ancora parte del lancio, non è il colpo
  perfect: .18,          // s attorno al punto più alto: qualità piena
  span: .4,              // s oltre perfect in cui la qualità scende fino a 1 − drop
  drop: .55,
  boxCenter: 2.05, boxHalf: 1.6, margin: .28,   // m: centro e metà larghezza del quadrato, distanza minima dalle righe
  planeAim: 1.5, faceAim: .8,                   // m di lato per il verso dello swing e per il piatto
  depth: [4.3, 6.0],                            // m dalla rete, da forza 0 a forza 1 (riga del servizio a 6,4)
  flight: Object.freeze({ flat: [.92, .56], slice: [.98, .64], kick: [1.12, .84] }),   // s di volo da forza 0 a 1
  spin: Object.freeze({ flat: 14, slice: 9, kick: 24 }),
});
// boxSign: −1/+1 lato del campo del quadrato (segno della x del suo centro); tau: s prima del punto più alto
export function serveOutcome({ intent = {}, tau = 0, boxSign = -1 } = {}){
  const S = SERVE, q = 1 - S.drop*clamp((Math.abs(finite(tau)) - S.perfect)/S.span);
  const power = clamp(finite(intent.power, .6)), pace = power*(.55 + .45*q);
  const rise = finite(intent.rise), plane = finite(intent.plane);
  const kind = rise > .12 ? 'kick' : Math.abs(plane) >= .4 ? 'slice' : 'flat';
  // angolo: verso orizzontale dello swing (+ da destra a sinistra → palla a sinistra) e piatto; un servizio sporco va più
  // verso il centro del quadrato
  const xc = Math.sign(boxSign || -1)*S.boxCenter, dx = (-plane*S.planeAim + clamp(finite(intent.face), -1, 1)*S.faceAim)*q;
  const lo = Math.min(0, xc*2) + S.margin, hi = Math.max(0, xc*2) - S.margin;
  const x = clamp(xc + dx, Math.min(lo, hi), Math.max(lo, hi));
  const depth = lerp(S.depth[0], S.depth[1], pace);
  const F = S.flight[kind], flight = lerp(F[0], F[1], pace);
  return { x: +x.toFixed(3), depth: +depth.toFixed(3), flight: +flight.toFixed(3), topspin: S.spin[kind], sidespin: kind === 'slice' ? -Math.sign(plane)*6 : 0,
    kind, q: +q.toFixed(3), pace: +pace.toFixed(3), grade: q >= .9 && pace >= .62 ? 'POWER SERVE!' : q < .7 ? (tau > 0 ? 'EARLY SERVE' : 'LATE SERVE') : 'GOOD SERVE' };
}
