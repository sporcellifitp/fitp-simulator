// Smartphone come racchetta: il controller di NATPF Simulator collegato al motore di motore base.
// Il telefono apre la pagina NATPF (site/tennis/racchetta.html, servita sotto /natpf/) e si collega al computer
// in WebRTC (PeerJS) con il QR monouso di NATPF; calibrazione e riconoscimento dei gesti restano quelli di NATPF.
// Qui si traducono soltanto gli eventi NATPF negli eventi del motore base (gli stessi di mouse, webcam e tastiera):
//   sw  → swing { side, shotType, speed, dirX, dirY }      toss → lancio di palla al servizio
//   orientamento del telefono → inclinazione della racchetta virtuale (phoneState del motore base)
// Impugnatura NATPF (dal 23/10): telefono di taglio, come il manico, il palmo sui lati lunghi e il display verso destra o
// sinistra (prima: schermo verso il palmo). Verso del colpo e forma del gesto si misurano rispetto alla gravità e non
// cambiano con la rotazione del telefono attorno al suo lato lungo. Con la presa di prima l'asse lungo del
// telefono (Y) è il manico della racchetta, la normale allo schermo (Z) è la normale del piatto e X corre lungo la
// larghezza dell'ovale. La rotazione integrata dal giroscopio (racket-motion.js, nel riferimento del telefono e
// relativa alla presa di riposo) si scompone quindi così:
//   attorno a X → beccheggio della testa della racchetta (pitch)
//   attorno a Y → apertura/chiusura del piatto, pronazione/supinazione (roll)
//   attorno a Z → testa che oscilla a destra/sinistra nel piano del piatto (yaw)
// Presa orizzontale «il telefono è il piatto» (predefinita in NATPF motore base): telefono in orizzontale nel palmo, display
// verso chi gioca, il dorso guarda la rete come le corde. Il telefono calcola l'angolo del piatto all'impatto
// (face-tracker.js) e lo manda nel colpo: la direzione la decide soprattutto il piatto (natpfSwingToEngine), e la
// racchetta in gioco segue l'orientamento del piatto (racketTiltFromFace).
import * as THREE from 'three';
import { createPhoneLink, testSearch } from '@natpf/tennis/link.js';
import { pairingUrl } from '@natpf/tennis/pairing.js';
import { gestureAim } from '@natpf/match/shot-quality.js';
import { lanOrigin } from './natpf_lan.js';
import { VIBRATION } from './natpf_shot_feedback.js';
import { swingPower } from './natpf_skill.js';
import { classifyPhoneShot, aimFromSignals, ENGINE_SHOT, liftBaselineFromProfile, headBaselineFromProfile, resolveLiftBaseline, createLiftModel, createFaceModel, createAimModel, centeredFace, learnSpecials } from './natpf_gestures.js';
import { calReduce, CAL_VIEW_EMPTY } from './natpf_cal_view.js';
import { readHand, readP2Hand, writeP2Hand, normalizeHand } from './natpf_hand.js';
import { strokeIntent, shapeDistinct, strokePower, INTENT } from './natpf_stroke_intent.js';
import { aimFullNow } from './natpf_aim_level.js';
import { weakSwing, livePlan, planOf } from './natpf_impact.js';
import { SMASH_FROM } from './natpf_stroke_outcome.js';
import { createTrialLearner, readCalMode, phoneThresholds, TRIAL, signedSwing } from './natpf_trial_learn.js';
// tempo concesso al telefono per tornare «pronto» dopo il profilo da capo chiesto dal gioco (freshPlayer): tre richieste
// del profilo semplice a 700 ms l'una. Oltre, vale la pausa «telefono non pronto» di sempre
export const RESET_GRACE_MS = 2500;

const NATPF_BASE = '/natpf/';
// B18 (difetto 10): voto del colpo per il telefono dall'esito del computer (natpf_shot_feedback.shotQuality); senza esito
// dal grade del motore, come prima
const PHONE_LABEL = Object.freeze({ Perfetto: 'perfetto', 'Super!': 'perfetto', Anticipo: 'anticipo', Ritardo: 'ritardo', Buono: 'buono' });
export function phoneLabel(quality = null, grade = ''){
  if (quality && PHONE_LABEL[quality.label]) return PHONE_LABEL[quality.label];
  return /PERFECT|POWER/i.test(grade) ? 'perfetto' : /EARLY/i.test(grade) ? 'anticipo' : /LATE/i.test(grade) ? 'ritardo' : 'buono';
}
// perché del colpo per il telefono (riga piccola): il motivo del tempo e, per la palla corta lunga o in rete, la causa se è
// diversa («in ritardo · da troppo lontano»); revisione finale: prima solo il tempo, la causa vera si perdeva
export function phoneWhy(quality = null){
  const w = quality?.why || '', c = quality?.cause || '';
  return w && c && w !== c ? `${w} · ${c}` : w || c;
}
// motivo del punto finito (_awardPoint) in italiano per il telefono: prima arrivava «Out», «Net», «Nice Shot!» in inglese
const POINT_REASON = Object.freeze({ OUT: 'Fuori', NET: 'In rete', 'NICE SHOT!': 'Vincente', POINT: 'Palla non presa', 'POINT WON!': '', 'POINT LOST': '' });
export function pointReason(grade = ''){
  const k = String(grade || '').trim().toUpperCase();
  return k in POINT_REASON ? POINT_REASON[k] : '';
}
const scripts = new Map();
const loadScript = src => scripts.get(src) || scripts.set(src, new Promise((resolve, reject) => {
  const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => { scripts.delete(src); reject(new Error(src)); }; document.head.appendChild(s);
})).get(src);

// Pagina del telefono: stessa origine, oppure un'altra in https (?phone=https://…/tennis/racchetta.html o
// VITE_NATPF_PHONE_PAGE) quando il gioco è aperto in http sulla LAN e il telefono ha bisogno di https per i sensori.
// origin: indirizzo di rete del computer quando il gioco è aperto da localhost sul server LAN (natpf_lan.js).
export function phonePageUrl(location = window.location, origin = null){
  const fromQuery = new URLSearchParams(location.search).get('phone');
  const fromEnv = import.meta.env?.VITE_NATPF_PHONE_PAGE;
  return fromQuery || fromEnv || new URL(`${NATPF_BASE}tennis/racchetta.html`, origin || location.origin).href;
}

// Swing NATPF → swing motore base. dir NATPF: +1 da destra a sinistra (dritto per un destro), -1 da sinistra a destra.
// aim NATPF: -1 sinistra … +1 destra, nel riferimento del giocatore, come dirX del motore base (per P2 motore base specchia già).
export const GRIPS = Object.freeze(['flat', 'upright']);
export const GRIP_STORAGE_KEY = 'natpf-tennis.grip';
// La presa orizzontale («il telefono è il piatto») è stata provata e tolta: scomoda. Resta solo la verticale.
export const normalizeGrip = () => 'upright';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Presa orizzontale: il colpo dall'angolo del piatto all'impatto.
//   yaw (piatto girato a sinistra/destra) → direzione: incrociato o lungolinea
//   pitch aperto → lob (gesto deciso) o palla corta (gesto morbido); chiuso → colpo coperto
//   gesto dal basso verso l'alto → topspin, tagliato dall'alto → slice; forza del gesto → velocità della palla
export const FACE_SHOT = Object.freeze({ open: 18, openSlice: 8, closed: -10, liftSlice: -.3, softDrop: .5 });
export function faceShot(s){
  const f = s.face, lift = Number.isFinite(s.lift) ? s.lift : 0, power = Number.isFinite(s.power) ? s.power : .6;
  if (f.pitch >= FACE_SHOT.open) return power < FACE_SHOT.softDrop ? 'drop' : 'lob';
  if (lift <= FACE_SHOT.liftSlice || (f.pitch >= FACE_SHOT.openSlice && lift < -.1)) return 'slice';
  return 'topspin';
}
// Telefono in verticale (la sola presa in gioco). Il tipo di colpo lo decide la tabella di natpf_gestures.js
// (classifyPhoneShot) da tutti i segnali insieme; la mira viene dal piatto all'impatto (filtro d'orientamento del
// telefono, uguale in LAN e via internet), il tempo del colpo lo misura il motore (latency: dal picco sul telefono a ora).
// La forza mescola il gesto rispetto alla calibrazione e la velocità vera del telefono (peak, °/s).
const SPECIALS_KEY = 'natpf-tennis.specials';
// colpo più vecchio di così all'arrivo (s dal picco sul telefono): consegnato in ritardo dopo un'interruzione della rete
// (il canale recapita tutto insieme quando torna), non si gioca. Di solito arrivano 30–60 ms dopo il picco
export const PHONE_STALE_S = .6;
export const NORMAL_SHOTS = new Set(['topspin', 'flat']);
// salita abituale della testa della racchetta nel verso del colpo (+1/−1), dai gesti della calibrazione
// (profile.rises); null con il profilo semplice («Salta»), senza dati o con il verso 0
export const riseRefOf = (profile, dir) => (profile && !profile.simple && (dir === 1 || dir === -1) && Number.isFinite(profile.rises?.[dir]) ? profile.rises[dir] : null);
// Salita abituale imparata giocando, per verso, quando la calibrazione non la dà («Salta», profili di prima): mediana
// degli ultimi colpi dello scambio in quel verso, pallonetti e schiacciate esclusi, da tre colpi in poi. Senza, chi
// tiene il telefono in verticale con il polso che prona (presa del 19/10) e salta la calibrazione vedeva i dritti
// diventare tagliati per tutta la partita. Come quella della calibrazione sposta le soglie dei colpi speciali solo per
// renderli più difficili (classifyStroke): con molti tagliati voluti i tagliati diventano più difficili, mai più facili.
// 07/11, palle corte: quelle riconosciute dalla forma senza la salita abituale (taglio verticale morbido, o come la
// propria palla corta degli esercizi: intent.byShape) non insegnano niente, come pallonetti e schiacciate (learn). Prima
// la salita abituale le contava (circa −0,88): dopo 4 palle corte e 2 dritti era −0,60 e da lì un tagliato voluto e un
// piatto si leggevano top spin. Quella regola della palla corta non dipende dalla salita abituale, quindi impararla da lì
// non serve a niente e sposta solo le soglie degli altri colpi. Le palle corte «dall'alto in basso» (sotto la soglia del
// tagliato, morbide o corte) restano come i tagliati: senza calibrazione è così che i colpi normali compatti di chi
// prona, letti all'inizio palle corte, diventano colpi normali (escluderle tutte, con 'drop' in skip, lasciava palle
// corte per tutta la partita 31 combinazioni in più su 324 di presa, polso, ampiezza e velocità del telefono simulato)
// 29/10 pomeriggio: anche con la calibrazione, dopo «verified» colpi in quel verso vale quella imparata giocando. Con il
// telefono nel palmo e la cima in avanti la calibrazione dava al rovescio +0,30 e in partita il rovescio normale scendeva
// (mediana −0,45): 15 rovesci su 21 erano tagliati, e i colpi dal basso verso l'alto non arrivavano al pallonetto
export const RISE_LEARN = Object.freeze({ min: 3, verified: 5, keep: 9, skip: Object.freeze(['lob', 'smash']) });
// Colpo tipico di chi gioca (velocità al picco, °/s): la mediana dei colpi dello scambio oltre «from», da «min» colpi in
// poi; prima, il verso più deciso della calibrazione. Dice al motore se un gesto è debole rispetto ai propri colpi
// (natpf_impact.WEAK: preparazione o micro-movimento, che da solo non colpisce in anticipo). Chi gioca con colpetti
// piccoli ha un colpo tipico piccolo
// 07/11 (passaggio di consegne §3.6, verificato con il telefono simulato e le pose del tutorial): il colpo tipico
// imparava da tutti i colpi dello scambio. Le palle corte morbide (≈ 381 °/s contro i 670 del dritto) lo abbassavano:
// dopo 4 palle corte era 381 e il dritto successivo si leggeva colpo piatto (forza 0,69 invece di 0,51; il tagliato 0,59
// invece di 0,40), destro e mancino, calibrazione con il braccio e con l'animazione. Ora, come la salita abituale
// (createRiseModel.learn), non insegnano il colpo tipico pallonetti, schiacciate e i colpi riconosciuti dalla forma
// (byShape: palla corta verticale e morbida, o come il proprio gesto degli esercizi). Le palle corte «dall'alto in basso»
// restano: senza calibrazione possono essere colpi normali compatti letti male, e il colpo tipico che li impara li fa
// tornare colpi normali. Senza la forma (telefoni vecchi) si impara come prima
// B15 (08/11): keep 24 (era 9). Con la mediana degli ultimi 9 colpi chi tirava più forte del solito per cinque colpi
// vedeva il colpo tipico raggiungerlo e la forza tornare a metà (banco colpi.mjs: dieci dritti a 1,5× del proprio colpo,
// forza 0,80 → 0,65 dal sesto, 120 → 114 km/h, 10,9 → 10,3 m); la forza relativa ha senso solo se il riferimento è la
// propria scala di gioco, non gli ultimi colpi. Con 24 serve più di metà finestra al nuovo livello perché il riferimento
// si sposti (una dozzina di colpi forti di fila: allora è davvero il proprio colpo)
export const TYPICAL = Object.freeze({ keep: 24, min: 3, from: 200, skip: Object.freeze(['lob', 'smash']) });
export function createTypicalModel({ keep = TYPICAL.keep, min = TYPICAL.min, from = TYPICAL.from } = {}){
  const h = [];
  return {
    reset(){ h.length = 0; },
    add(peak){ if (Number.isFinite(peak) && peak >= from){ h.push(peak); if (h.length > keep) h.shift(); } },
    // da un colpo letto (strokeIntent): solo i colpi normali
    learn(peak, intent){ if (intent && (intent.byShape || TYPICAL.skip.includes(intent.shot))) return; this.add(peak); },
    get value(){ if (h.length < min) return null; const v = [...h].sort((a, b) => a - b), m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m])/2; },
    // colpi già imparati (picchi), anche meno di min: i primi colpi della partita (powerRefs)
    get seen(){ return h.slice(); },
  };
}
// Primi colpi senza il colpo tipico (B16, riscaldamento facoltativo, decisione dell'utente dell'08/11 sera). Il riscaldamento
// prima della partita (2 dritti, 2 rovesci) insegnava il colpo tipico: senza, i primi tre colpi della partita avevano come
// riferimento la calibrazione, spesso un colpetto (il 23/10 143 °/s contro 670 del dritto): forza letta piena e colpi piatti.
// Banco scripts/audit/riscaldamento.mjs (telefono simulato con il braccio, calibrazione a 0,3–0,6 del proprio colpo): primi
// tre colpi |forza − forza col colpo tipico| 0,20–0,25 senza riscaldamento, 0,00 con. Finché il colpo tipico non c'è, il
// riferimento della calibrazione non sta sotto la mediana dei colpi già fatti né sotto self volte il colpo che si legge (un
// colpo vale al massimo 1/self del riferimento): alza solo i riferimenti troppo bassi, mai li abbassa (una calibrazione
// giusta o decisa resta com'era)
export const BOOT = Object.freeze({ self: .75 });
// riferimento della forza (natpf_stroke_intent.strokeIntent): il colpo tipico imparato giocando, nella stessa misura del
// picco (peak); finché non c'è, quelli della calibrazione (ref sul picco, rawRef sul picco vero), con il pavimento BOOT dei
// colpi già fatti (seen, picchi) e del colpo che si legge (peak)
export function powerRefs(profile, typical = null, { seen = null, peak = null } = {}){
  if (Number.isFinite(typical)) return { ref: typical, rawRef: null };
  const ok = profile && !profile.simple;
  const ref = ok && Number.isFinite(profile.ref) ? profile.ref : null, rawRef = ok && Number.isFinite(profile.rawRef) ? profile.rawRef : null;
  if (!Number.isFinite(ref) || ref <= 0) return { ref, rawRef };
  const prev = (seen || []).filter(Number.isFinite).sort((a, b) => a - b), m = prev.length >> 1;
  const floor = Math.max(prev.length ? (prev.length % 2 ? prev[m] : (prev[m - 1] + prev[m])/2) : 0, Number.isFinite(peak) ? BOOT.self*peak : 0);
  if (!(floor > ref)) return { ref, rawRef };
  return { ref: +floor.toFixed(1), rawRef: Number.isFinite(rawRef) ? +(rawRef*floor/ref).toFixed(1) : null };
}
export const profileTypical = profile => { if (!profile || profile.simple) return null; const v = [profile.refs?.[1], profile.refs?.[-1], profile.ref].filter(x => Number.isFinite(x) && x > 0); return v.length ? Math.max(...v) : null; };
export function createRiseModel({ min = RISE_LEARN.min, keep = RISE_LEARN.keep } = {}){
  const seen = { 1: [], '-1': [] };
  return {
    reset(){ seen[1] = []; seen[-1] = []; },
    add(dir, rise, shot){ if ((dir === 1 || dir === -1) && Number.isFinite(rise) && !RISE_LEARN.skip.includes(shot)){ const h = seen[dir]; h.push(rise); if (h.length > keep) h.shift(); } },
    // da un colpo letto (strokeIntent): non dai colpi riconosciuti dalla forma senza la salita abituale (byShape)
    learn(dir, rise, intent){ if (intent && !intent.byShape) this.add(dir, rise, intent.shot); },
    ref(dir, need = min){ const h = seen[dir]; if (!h || h.length < need) return null; const v = [...h].sort((a, b) => a - b), m = v.length >> 1; return +(v.length % 2 ? v[m] : (v[m - 1] + v[m])/2).toFixed(3); },
  };
}
// salita abituale per il colpo: quella imparata giocando (da RISE_LEARN.verified colpi in quel verso se c'è la
// calibrazione, da min senza), altrimenti quella della calibrazione (o null)
export const habitualRise = (profile, dir, model = null) => { const cal = riseRefOf(profile, dir); return model?.ref(dir, cal == null ? RISE_LEARN.min : RISE_LEARN.verified) ?? cal ?? null; };
// Forma del proprio colpo normale per il confronto con i propri colpi speciali (natpf_stroke_intent.personalSpecial):
// |piano| e forza assoluta (shapePower) dei colpi normali dello scambio (mediana degli ultimi «keep», da «min» in poi;
// prima, un dritto con la forza del colpo della calibrazione, seed, o di un dritto tipico)
export const NORMAL_SHAPE = Object.freeze({ keep: 9, min: 3, plane: .8, power: .4, rise: -.05 });
const median = a => { const v = [...a].sort((x, y) => x - y), m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m])/2; };
export function createShapeModel({ keep = NORMAL_SHAPE.keep, min = NORMAL_SHAPE.min } = {}){
  const h = [];
  let base = NORMAL_SHAPE.power;
  return {
    reset(){ h.length = 0; },
    // forza del proprio colpo normale prima dei colpi della partita: quella del colpo della calibrazione
    seed(power){ base = Number.isFinite(power) ? power : NORMAL_SHAPE.power; },
    add(plane, power){ if (Number.isFinite(plane) && Number.isFinite(power)){ h.push({ plane: Math.abs(plane), power }); if (h.length > keep) h.shift(); } },
    get value(){ return h.length < min ? { plane: NORMAL_SHAPE.plane, power: base } : { plane: +median(h.map(x => x.plane)).toFixed(3), power: +median(h.map(x => x.power)).toFixed(3) }; },
  };
}
// forza assoluta del colpo della calibrazione (picco vero, se c'è): il colpo normale prima dei colpi della partita
export const profileShapePower = profile => (profile && !profile.simple && (Number.isFinite(profile.rawRef) || Number.isFinite(profile.ref)) ? +strokePower(Number.isFinite(profile.rawRef) ? profile.rawRef : profile.ref).toFixed(3) : null);
// Il colpo insegna i riferimenti del colpo normale (forma, colpo tipico, salita, piatto, mira)? Solo un colpo normale dello
// scambio, e mai un gesto fatto a richiesta negli esercizi del pallonetto e della palla corta (expect). Prima i primi gesti
// degli esercizi, letti «normali» prima che il gioco li avesse imparati, finivano nel colpo normale: in partita il colpo
// normale diventava la propria palla corta e la palla corta si leggeva come un dritto
export const teachesNormal = (ev, { rally = true, expect = null } = {}) => !!rally && !expect && !!ev?.natpf && NORMAL_SHOTS.has(ev.natpf.shot) && !weakSwing(ev);
// prototipi del proprio pallonetto e della propria palla corta dai gesti degli esercizi (mediana degli ultimi 6): { lob, drop }
export function learnShapeSpecials(samples = {}){
  const out = {};
  for (const k of ['lob', 'drop']){
    const a = (samples[k] || []).filter(x => Number.isFinite(x?.rise) && Number.isFinite(x?.plane) && Number.isFinite(x?.power));
    if (a.length) out[k] = { rise: +median(a.map(x => x.rise)).toFixed(3), plane: +median(a.map(x => Math.abs(x.plane))).toFixed(3), power: +median(a.map(x => x.power)).toFixed(3), n: a.length };
  }
  return out;
}
// prototipi per strokeIntent: il colpo normale nel verso del colpo (salita abituale; per i gesti verticali quella del
// dritto) e i colpi speciali imparati
export function ownShapes(own, { rise = null, forehandRise = null, normal = null } = {}){
  if (!own?.lob && !own?.drop) return null;
  const r = Number.isFinite(rise) ? rise : Number.isFinite(forehandRise) ? forehandRise : NORMAL_SHAPE.rise;
  return { normal: { rise: r, ...(normal || { plane: NORMAL_SHAPE.plane, power: NORMAL_SHAPE.power }) }, lob: own.lob || null, drop: own.drop || null };
}
const finiteOr = (v, d = 0) => (Number.isFinite(v) ? v : d);
// ritardo dello schermo (ms) salvato su questo computer: 0 finché non lo si misura (pannello della diagnostica)
export const DISPLAY_LAG_KEY = 'natpf.displayLagMs';
export function readDisplayLagMs(){ try { const v = +localStorage.getItem(DISPLAY_LAG_KEY); return Number.isFinite(v) ? Math.max(0, Math.min(200, Math.round(v))) : 0; } catch { return 0; } }
export function writeDisplayLagMs(ms){ const v = Math.max(0, Math.min(200, Math.round(+ms || 0))); try { localStorage.setItem(DISPLAY_LAG_KEY, String(v)); } catch {} return v; }
function readSpecials(key = SPECIALS_KEY){ try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; } }
function writeSpecials(v, key = SPECIALS_KEY){ try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }
// displayLag (s): ritardo dello schermo misurato (impostazione della diagnostica, 0 se non misurato). Chi gioca colpisce
// la palla che vede: con uno schermo in ritardo ogni colpo risulterebbe in ritardo di altrettanto
// own: prototipi dei propri gesti per i telefoni con la forma (ownShapes); personal: soglie personali della tabella di prima
// aimFull: gradi della mira piena (sensibilità della mira, AIM_FULL); null = la base (17°). Torna in natpf.aimFull con
// l'intenzione, per la diagnostica
export function natpfSwingToEngine(s, { hand = 'right', grip = null, liftBaseline = 0, headBaseline = 0, faceCenter = null, aimModel = null, personal = null, own = null, now = null, prep = null, prepCapable = false, ballHigh = false, displayLag = 0, ref = null, rawRef = null, riseRef = null, aimFull = null } = {}){
  const flat = !!s.face && Number.isFinite(s.face.yaw) && (s.grip === 'flat' || grip === 'flat');
  if (flat) return faceSwingToEngine(s, { hand });
  const dirX = Math.max(-1, Math.min(1, gestureAim(s)));
  const forehandDir = hand === 'left' ? -1 : 1;
  // preparazione nel verso opposto poco prima del colpo (0,08…1 s): colpo preparato; dà il lato anche senza calibrazione
  const pr = prep && Number.isFinite(prep.at) && Number.isFinite(s.at) && s.at - prep.at >= .08 && s.at - prep.at <= 1 && (!s.dir || prep.dir === -s.dir) ? prep : null;
  const strokeDir = s.dir || (pr ? -pr.dir : 0);
  const side = strokeDir === forehandDir ? 'forehand' : strokeDir === -forehandDir ? 'backhand' : null;
  const lift = Number.isFinite(s.lift) ? s.lift : 0;
  // la preparazione carica il colpo: un poco più di forza
  const power = clamp(swingPower(Number.isFinite(s.power) ? s.power : .6, Number.isFinite(s.peak) ? s.peak : null) + (pr ? .07*clamp((pr.angle || 30)/50, .3, 1) : 0), 0, 1);
  // forza (0…1) → velocità del motore base (0,8…1,65); un colpo deciso diventa un colpo potente
  const speed = .8 + power*.85;
  // piatto rispetto al proprio colpo abituale in partita (se ci sono abbastanza colpi), altrimenti come dal telefono
  const face = s.face && Number.isFinite(s.face.yaw) ? centeredFace(s.face, faceCenter) : null;
  // colpo scelto a mano sul telefono (gioco con i tocchi: nessun dato dei sensori nel messaggio) → vale la scelta
  const chosen = !Number.isFinite(s.peak) && !face ? (s.drop ? 'drop' : s.lob ? 'lob' : s.slice ? 'slice' : null) : null;
  // verso verticale del piatto che colpisce: il telefono lo misura sul dorso (−z); nel dritto colpisce il palmo, cioè
  // lo schermo (+z), quindi il segno si inverte (anche nel gesto verticale, fatto con il palmo in avanti)
  const head = Number.isFinite(s.head) ? +(s.head*(strokeDir === -forehandDir ? 1 : -1)).toFixed(3) : null;
  // mira dalla direzione assoluta del piatto (telefoni aggiornati); senza, come prima dalla rotazione durante il colpo
  const heading = aimModel && Number.isFinite(s.heading) ? aimModel.aim(s.dir || 0, s.heading) : null;
  // telefoni con la forma del colpo (stroke-shape.js): intenzione dalla forma (natpf_stroke_intent.js), deterministica;
  // il motore aggiunge tempo ed esecuzione all'impatto (natpf_stroke_outcome.js). Senza forma, la tabella di prima.
  const intent = chosen ? null : strokeIntent(s, { ref, rawRef, ballHigh, headingDev: heading?.dev ?? null, riseRef, personal: own, aimFull });
  const cls = chosen ? { shot: chosen, why: ['scelto sul telefono'] } : intent ? { shot: intent.shot, conf: intent.conf, why: intent.why } : classifyPhoneShot({ dir: s.dir || 0, vert: s.vert || null, lift, liftBaseline, head, headBaseline, personal, facePitch: face ? face.pitch : null, power, speed: Number.isFinite(s.speed) ? s.speed : null, ballHigh });
  const shot = cls.shot;
  const faceAim = heading ? heading.aim : face ? face.aim : null, faceUnreliable = heading ? heading.aim == null : !!face && !Number.isFinite(face.aim);
  const aimed = aimFromSignals({ faceAim, faceUnreliable, twist: s.twist, aim: s.aim, dir: s.dir || 0 });
  const latency = Number.isFinite(s.at) && Number.isFinite(now) ? clamp(now - s.at + clamp(finiteOr(displayLag), 0, .2), 0, .3) : .06;
  const rel = lift - resolveLiftBaseline(liftBaseline, s.dir || 0).base;
  const engineSpeed = intent ? .8 + intent.power*.85 : shot === 'drop' ? Math.min(speed, .9) : shot === 'flat' ? Math.max(speed, 1.32) : speed;
  return { source: 'natpf-phone', side, shotType: ENGINE_SHOT[shot], speed: engineSpeed, dirX,
    dirY: shot === 'lob' ? -.85 : shot === 'slice' || shot === 'drop' ? .3 : shot === 'smash' ? .5 : -.45 + clamp(rel, -.5, .5)*.2, timing: null,
    natpf: { aim: 'swing', shot, head, v: cls.v ?? null, move: cls.move ?? null, conf: cls.conf ?? null, speed: Number.isFinite(s.speed) ? s.speed : null, wrist: +aimed.aim.toFixed(3), aimSource: aimed.source, power: +power.toFixed(3), latency: +latency.toFixed(3), hand,
      aimDev: heading ? heading.dev : null, why: cls.why, prep: pr ? { lead: +(s.at - pr.at).toFixed(3), amount: clamp((pr.angle || 30)/50, .3, 1) } : null, prepCapable: !!prepCapable,
      ...(intent ? { intent, peak: Number.isFinite(s.peak) ? s.peak : null, aimFull: Number.isFinite(aimFull) ? aimFull : INTENT.faceDead + INTENT.faceSpan } : {}) } };
}
function faceSwingToEngine(s, { hand = 'right' } = {}){
  const f = s.face, lift = Number.isFinite(s.lift) ? s.lift : 0, power = Number.isFinite(s.power) ? s.power : .6;
  const forehandDir = hand === 'left' ? -1 : 1;
  const side = s.dir === forehandDir ? 'forehand' : s.dir === -forehandDir ? 'backhand' : null;
  // la mira viene dal piatto (yaw rispetto alla posa «pronto»), un poco anche dal gesto
  const faceAim = Number.isFinite(f.aim) ? f.aim : clamp(f.yaw/30, -1, 1);
  const dirX = clamp(faceAim*.88 + gestureAim(s)*.12, -1, 1);
  const shot = faceShot(s);
  const speed = .8 + clamp((power - .3)/.7, 0, 1)*.85;
  const closed = f.pitch <= FACE_SHOT.closed;
  return {
    source: 'natpf-phone', side, shotType: shot === 'drop' ? 'slice' : shot, speed: shot === 'drop' ? Math.min(speed, .9) : speed, dirX,
    dirY: shot === 'lob' ? -.85 : shot === 'slice' || shot === 'drop' ? .3 : -.45 + lift*.2 - (closed ? .1 : 0), timing: null,
    natpf: { aim: 'face', shot, face: { yaw: f.yaw, pitch: f.pitch, roll: f.roll || 0 } },
  };
}
// Orientamento del piatto → inclinazione della racchetta del motore base (gradi, come phoneState.orientation):
// piatto girato → oscillazione della testa (yaw), aperto/chiuso → apertura del piatto (roll), rotazione → beccheggio.
export function racketTiltFromFace(face){
  if (!face || !Number.isFinite(face.yaw)) return null;
  return { pitch: clamp((face.roll || 0)*.5, -40, 40), roll: clamp(face.pitch || 0, -45, 45), yaw: clamp(face.yaw, -50, 50) };
}

const euler = new THREE.Euler(), quat = new THREE.Quaternion(), identity = new THREE.Quaternion();
// Come character.js di NATPF: la rotazione integrata è solo presentazione e deriva nel tempo, quindi se ne
// mostra una parte limitata (al massimo ~0,7 rad), pesata dall'affidabilità del campione.
export function racketTiltFromRotation(rotation, confidence = 1){
  if (!rotation || rotation.length !== 4 || !rotation.every(Number.isFinite)) return null;
  quat.fromArray(rotation).normalize();
  const angle = 2*Math.acos(Math.min(1, Math.abs(quat.w))), c = Math.max(0, Math.min(1, Number.isFinite(confidence) ? confidence : 1));
  quat.slerp(identity, 1 - (angle > .001 ? Math.min(.55, .7/angle) : .55)*c);
  euler.setFromQuaternion(quat, 'ZXY');
  const deg = THREE.MathUtils.RAD2DEG;
  return { pitch: euler.x*deg, roll: euler.y*deg, yaw: euler.z*deg };
}

// Le funzioni qui sotto guardano la partita dal lato di chi tiene il telefono: role 'p1' (player) o 'p2' (opponent),
// predefinito il ruolo di questo computer. Nello split screen (natpf_split.js) il secondo telefono è il P2 locale.
const mineOf = (engine, role = engine.playerRole) => (role === 'p2' ? 'opponent' : 'player');
const actorOf = (engine, role = engine.playerRole) => (role === 'p2' ? engine.opponent : engine.player);
// Fase di gioco mandata al telefono: decide se e come il telefono riconosce i gesti (vedi racchetta.js).
function readGrip(){ try { return globalThis.localStorage?.getItem(GRIP_STORAGE_KEY); } catch { return null; } }
function writeGrip(g){ try { globalThis.localStorage?.setItem(GRIP_STORAGE_KEY, g); } catch {} }

export function phoneGamePhase(engine, role = engine.playerRole){
  const local = mineOf(engine, role);
  switch (engine.phase){
    case 'SERVE_STANCE': return engine.score.server === local ? 'serve' : 'play';
    case 'SERVE_TOSS': return engine.score.server === local ? 'toss' : 'play';
    case 'RALLY': case 'POINT_OVER': return engine.autoPlayMode ? 'menu' : 'play';
    case 'MATCH_OVER': return 'over';
    default: return 'menu';
  }
}

// Palla da schiacciata: alta sopra la testa del giocatore locale, o in arrivo e ancora in salita sopra i 2 m
// Palla alta per chi gioca qui: alta E vicina (entro 6 m). Prima contava solo l'altezza: a metà volo la palla è sempre
// alta e un dritto anticipato con la mano che scende diventava una schiacciata (nelle registrazioni succedeva).
// Palla alta all'impatto (zona della schiacciata, natpf_stroke_outcome.SMASH_FROM): dal piano d'intercetto in corso,
// che sa dove si colpirà (29/10 pomeriggio: con la sola posizione di adesso un gesto arrivato con la palla ancora
// lontana non era «palla alta»); senza piano, dalla palla vicina come prima
// B18 (D7, decisione dell'utente del 31/10: in risposta schiacciata solo se voluta): in risposta al servizio
// (rallyStrokeCount ≤ 1) la palla è «alta» solo molto sopra la testa (SMASH_FROM.always, 2,3 m). La risposta si prende
// fino a 1,72 m (natpf_impact.PLAN.returnTop), sopra SMASH_FROM.gesture: prima ogni risposta al servizio vero della CPU era
// «palla alta» (60 su 60) e tagliati e pallonetti del tutorial diventavano schiacciate a circa 180 km/h
// Revisione: le palle del lanciapalle (natpf_training: rallyStrokeCount 1 anche loro) non sono risposte al servizio
// (ball.natpfFeed, tolto al servizio della partita): l'esercizio «Schiacciata» resta com'era
export const isServeReturn = b => { const n = Number(b?.rallyStrokeCount); return Number.isFinite(n) && n <= 1 && !b?.natpfFeed; };
export function ballIsHigh(engine, role = engine.playerRole){
  const b = engine.ball; if (!b || !b.inPlay) return false;
  const me = actorOf(engine, role), plan = me ? livePlan(engine, me) : null, ret = isServeReturn(b);
  if (plan && plan.kind !== 'letgo' && Number.isFinite(plan.contact?.y))
    return ret ? plan.contact.y >= SMASH_FROM.always : plan.kind === 'smash' || plan.contact.y >= SMASH_FROM.gesture;
  if (me?.pos && Number.isFinite(b.pos?.z) && Math.abs(b.pos.z - me.pos.z) > 6) return false;
  if (ret) return b.pos.y >= SMASH_FROM.always;
  return b.pos.y > 1.7 || (b.pos.y > 1.2 && b.targetLanding && Math.abs(b.vel.y) < 2 && b.pos.y > 1.5);
}
export function ballMovingAway(engine, role = engine.playerRole){
  const b = engine.ball, mine = mineOf(engine, role);
  return engine.phase === 'RALLY' && !!b?.inPlay && b.lastHitter === mine;
}
// Lato del colpo dal verso del gesto (+1 da destra a sinistra = dritto del destro)
export const strokeSide = (dir, hand = 'right') => { const fh = hand === 'left' ? -1 : 1; return dir === fh ? 'forehand' : dir === -fh ? 'backhand' : null; };
// Verso del colpo atteso per il giocatore locale: la palla arriva verso di lui e cade alla sua destra o sinistra.
// 0 quando la palla non arriva o è al centro (lì non si trattiene nessun gesto).
// palla «diretta»: entro 0,6 m dal corpo si gioca sia di dritto sia di rovescio, il telefono non deve aspettarsi un
// verso (prima bastavano 0,25 m: il rovescio su una palla appena a destra veniva trattenuto come preparazione)
export const BODY_ZONE = .6;
function ballRel(engine, role = engine.playerRole){
  const b = engine.ball, p2 = role === 'p2', me = actorOf(engine, role);
  if (!b || !me) return null;
  const x = Number.isFinite(b.targetLanding?.x) ? b.targetLanding.x : b.pos.x;
  return (x - me.pos.x)*(p2 ? -1 : 1);                                         // + alla sua destra
}
// lato del colpo dalla posizione della palla, per i gesti senza verso orizzontale (verticali): prima lo decideva la
// mira nel motore, e un colpo mirato verso sinistra diventava sempre un dritto
export function sideFromBall(engine, hand = 'right', role = engine.playerRole){
  const rel = ballRel(engine, role);
  if (rel == null) return null;
  return (rel >= 0) !== (hand === 'left') ? 'forehand' : 'backhand';
}
// Palla alta o piano della schiacciata (ballIsHigh): 0. La schiacciata si fa dall'alto, di dritto o di rovescio, e il
// lato della palla non dice il verso del gesto: diagnostica 20261030-142438 n. 124, una schiacciata di rovescio con la
// palla dal lato del dritto è stata trattenuta 300 ms sul telefono come preparazione e colpita lontano dalla racchetta
// Chi gioca è a rete (B17.4): entro NET_Z.in m dalla rete durante lo scambio; una volta a rete ci resta fino a NET_Z.out
// (isteresi). Stessa soglia di «net» dell'esito del colpo (game_engine._natpfRacketShot: |z| < 5)
export const NET_Z = Object.freeze({ in: 5, out: 5.6 });
export function atNet(engine, role = engine.playerRole, was = false){
  const me = actorOf(engine, role), z = Math.abs(Number(me?.pos?.z));
  if (!Number.isFinite(z) || engine.phase !== 'RALLY') return false;
  return z < (was ? NET_Z.out : NET_Z.in);
}
// B28, scambi di prova: lato della palla per chi gioca adesso, +1 alla sua destra, −1 alla sua sinistra, 0 se non si sa
// (uguale per destri e mancini: è il verso del gesto che ci si aspetta). Dal piano d'intercetto in corso, che decide da
// che parte della palla si mette il personaggio (natpf_impact: a 0,72 m, dal lato plan.side) ed è quello che chi gioca
// vede; senza piano, dalla posizione della palla (oltre 0,3 m di lato)
// since: istante del motore (elapsedTime) in cui è partita questa palla (scambi di prova: trialBall). Il piano fatto da
// allora è quello di questa palla anche quando, vicino all'impatto, non «combacia» più con la traccia prevista (livePlan:
// nello stesso schermo, nel browser, il piano del Player 2 non combaciava più 0,2 s prima del colpo e il lato tornava 0)
export function ballSideNow(engine, role = engine.playerRole, since = null){
  const me = actorOf(engine, role), b = engine.ball;
  if (!me?.pos || !b) return 0;
  const any = planOf(engine, me), plan = any && Number.isFinite(since) && any.at >= since - .05 && engine.elapsedTime - any.at < 4 ? any : livePlan(engine, me);
  if (plan && plan.kind !== 'letgo' && plan.side) return plan.side*(Math.sign(me.pos.z) || 1) >= 0 ? 1 : -1;
  const rel = ballRel(engine, role);
  return rel == null || Math.abs(rel) < .3 ? 0 : rel > 0 ? 1 : -1;
}
export function expectedStrokeDir(engine, hand = 'right', role = engine.playerRole){
  const b = engine.ball, p2 = role === 'p2', me = actorOf(engine, role);
  if (!b || !me || !b.inPlay || engine.phase !== 'RALLY' || b.lastHitter === (p2 ? 'opponent' : 'player')) return 0;
  const toward = p2 ? b.vel.z < -.5 : b.vel.z > .5;
  if (!toward || ballIsHigh(engine, role)) return 0;
  const rel = ballRel(engine, role);
  if (Math.abs(rel) < BODY_ZONE) return 0;
  const fh = hand === 'left' ? -1 : 1;                                        // verso del dritto
  return (rel > 0) !== (hand === 'left') ? fh : -fh;
}

export class NatpfPhoneRacket {
  // role: null = il giocatore di questo computer (P1, o P2 sul computer del Player 2); 'p2' = Player 2 locale dello
  // split screen (secondo telefono sullo stesso computer): i suoi colpi vanno all'avversario come quelli del P2 in rete,
  // e mano e gesti imparati si salvano a parte (chiavi con «.p2»)
  constructor(engine, { role = null } = {}){
    this.engine = engine;
    this.fixedRole = role === 'p2' ? 'p2' : null;
    this.keySuffix = this.fixedRole ? '.p2' : '';
    this.link = null;
    // mano di chi gioca: una sola, quella del gioco (NatpfHand, salvata sul computer). Va al telefono con la configurazione
    // e la calibrazione non la cambia più (nella sessione del 22/10 il telefono era «mancino» e il gioco «destro»)
    this.hand = this.fixedRole ? readP2Hand() : readHand();
    this.grip = normalizeGrip(readGrip());
    this.gripSent = false;
    this.listeners = new Set();
    this.swingListeners = new Set();
    this.rawListeners = new Set();
    this.dropListeners = new Set();       // colpi arrivati con il telefono non ancora pronto (solo diagnostica)
    // diagnostica dal telefono: gesti scartati sul telefono (scartato), preparazioni (prep), segno «qui è successo un
    // problema» (segno) e telefono/browser (dispositivo, l'ultimo resta in device per chi inizia a registrare dopo)
    this.diagListeners = new Set();
    this.device = null;
    this.displayLagMs = readDisplayLagMs(); // ritardo dello schermo misurato (0 finché non lo si misura)
    this.liftBaseline = 0;               // verso verticale abituale (calibrazione, per verso del colpo): lob e tagliato si leggono rispetto a questo
    this.liftModel = createLiftModel();  // … poi si adatta ai colpi veri della partita
    this.faceModel = createFaceModel();  // piatto abituale per verso del colpo (mira = scarto da questo)
    this.aimModel = createAimModel();    // direzione abituale del piatto all'impatto (mira dei telefoni aggiornati)
    this.headModel = createLiftModel(0); // verso verticale abituale del piatto che colpisce, per verso del colpo
    this.riseModel = createRiseModel();  // salita abituale imparata giocando, se la calibrazione non la dà
    this.typicalModel = createTypicalModel(); // colpo tipico imparato giocando (gesti deboli: natpf_impact.WEAK)
    // pallonetto e palla corta di chi gioca, imparati negli esercizi del riscaldamento (si azzerano con una nuova calibrazione)
    this.specialSamples = readSpecials(SPECIALS_KEY + this.keySuffix); this.personal = learnSpecials(this.specialSamples);
    // … e con la forma del colpo (telefoni di oggi): prototipi dei propri gesti, confrontati con il proprio colpo normale
    // (in «forma», con la forza assoluta del gesto: gli esempi di prima, con la forza relativa, non si usano)
    this.shapeModel = createShapeModel(); this.ownShape = learnShapeSpecials(this.specialSamples.forma);
    // gesto speciale chiesto in questo momento («lob», «drop» o null): lo dice l'allenamento (natpf_training.js)
    this.expectSpecial = null;
    this.calListeners = new Set();
    // tutorial prima della calibrazione (richiesta del 04/11): tutWait = il computer chiede al telefono di aspettare
    // «Tutto chiaro, ho capito»; tutProgress = avanzamento della modale mandato al telefono (tp); tutAnswer = risposta
    // del telefono «so aspettare» (tut w) in questo abbinamento, da cui tutSupported e tutV2 (getter qui sotto)
    this.tutWait = false; this.tutAnswer = null; this.tutProgress = null;
    this.tutListeners = new Set(); this.tutNavListeners = new Set();
    // «Rivincita» toccata sul telefono a fine partita (stesso schermo, B20): la decide natpf_split_ui
    this.rematchListeners = new Set();
    // B28, niente blocchi: «Avanti ›» sul telefono. Dove il gioco chiede un gesto (esercizi dell'Allenamento e del
    // riscaldamento, scambi di prova) il computer offre al telefono un pulsante per andare avanti senza farlo (messaggio
    // nx: on, lb = scritta); il tocco torna come «next» (onNext). Le pagine del telefono di prima ignorano il messaggio
    this.nextListeners = new Set(); this.nextOffer = null; this.nextSent = '';
    // tutorial visto per questo abbinamento del telefono (link.L.pairs): si rivede solo con un abbinamento nuovo (QR), non
    // a ogni ricollegamento (pagina ricaricata, schermo spento, «Ricollega»); tutSaved = dove era arrivata la modale chiusa
    // prima della fine (stesso abbinamento: si riprende da lì). Uno per telefono: vale per Allenamento e stesso schermo.
    // tutSeenSet: quale tutorial è stato visto ('short' prima della partita, 'full' nell'Allenamento: B16)
    this.tutSeenPairs = null; this.tutSeenSet = null; this.tutSaved = null;
    this.lastPhase = null;
    this.cal = { step: null, review: null, freeOk: false, grip: null, attempts: [], idle: false };
    // passo della calibrazione come lo vede il computer (natpf_cal_view.js): si aggiorna con ogni evento del telefono,
    // anche prima di entrare in campo, così il riscaldamento parte sempre dal passo vero
    this.calView = CAL_VIEW_EMPTY;
    // B28, calibrazione giocando (natpf_trial_learn.js): cosa si impara dagli scambi di prova (verso, forza, salita, centro
    // della mira); trial = scambi di prova in corso { ball: numero della palla, want: verso atteso dal lato della palla };
    // gestureCal = calibrazione con i gesti chiesta apposta («Calibra con i gesti») anche se l'opzione dello stand è «Giocando»
    this.learner = createTrialLearner(); this.trial = null; this.gestureCal = false; this.skipAskedAt = -1e9; this.resetAt = null;
    // (revisione del B28, difetto 4) il profilo ricorda come è stato fatto: madeBy = 'gesti' (calibrazione con i gesti),
    // 'salta' («Salta» premuto apposta con «Con i gesti»), 'auto' (profilo semplice dato dal gioco con «Giocando» o
    // «Nessuna»), 'prova' (imparato dagli scambi di prova o dal riscaldamento), null (non si sa: telefono appena tornato).
    // gestureAt: numero dell'attività (activitySeq: partite, minigiochi, allenamenti e riscaldamenti cominciati) in cui
    // è finita una calibrazione con i gesti fatta fuori da un'attività: con «Giocando» e «Nessuna» quel profilo vale
    // per l'attività che segue, qualunque sia, e basta (B28.1: prima contavano solo le partite, e due minigiochi dopo
    // «Calibra con i gesti» lasciavano quel profilo anche alla partita del visitatore dopo)
    this.madeBy = null; this.gestureAt = null;
  }
  // B28: calibrazione dello stand (natpf_trial_learn.readCalMode: 'play' giocando, 'gesti', 'none') e profilo semplice
  // automatico. Con «Giocando» e «Nessuna» il telefono non fa i gesti: appena ha i sensori attivi e comincia a calibrare il
  // computer gli chiede il profilo semplice (lo stesso comando di «Salta», che ogni pagina del telefono conosce, anche una
  // di prima rimasta in cache); con il tutorial aperto il telefono aspetta e lo si chiede dopo
  get calMode(){ return readCalMode(); }
  get autoSimple(){ return this.calMode !== 'gesti' && !this.gestureCal; }
  _autoProfile(){
    if (!this.connected || this.ready || !this.autoSimple || this.tutWait || this.state.phone !== 'cal') return false;
    const now = performance.now();
    if (now - this.skipAskedAt < 700) return false;         // già chiesto: la risposta è in viaggio (si richiede se si perde)
    this.skipAskedAt = now; this.skipCalibration();
    return true;
  }
  // verso del telefono corretto dagli scambi di prova (+1 com'è, −1 al contrario)
  get dirSign(){ return this.learner.sign; }
  // profilo fatto con i gesti (non semplice e non imparato dagli scambi di prova): chi l'ha chiesto apposta lo tiene
  get gestureProfile(){ return !!this.profile && !this.profile.simple && !this.profile.trial; }
  // Il profilo fatto con i gesti vale per chi gioca adesso? Con «Con i gesti» sempre (finché «Nuovo giocatore» o
  // «Ricalibra»: com'era prima del B28). Con «Giocando» e «Nessuna» solo se la calibrazione con i gesti è stata fatta
  // apposta dopo la fine dell'ultima partita, e vale per quella che segue: niente passa da un visitatore al successivo
  get keepsGesture(){
    if (!this.gestureProfile) return false;
    return this.calMode === 'gesti' || (this.gestureAt != null && this.gestureAt === this.activitySeq);
  }
  // attività cominciate finora: partite (motore) più minigiochi, allenamenti e riscaldamenti (NatpfUi.activityStarted)
  get activitySeq(){ return (this.engine.natpfMatchSeq || 0) + (this.engine.natpfUi?.activitySeq || 0); }
  // Con «Con i gesti» conta come calibrato solo un profilo fatto con i gesti (o saltato apposta): un profilo dato dal
  // gioco o imparato dagli scambi di prova, rimasto da quando l'opzione era un'altra, no
  get calStale(){ return this.calMode === 'gesti' && this.connected && this.ready && !this.gestureCal && !!this.profile && (!!this.profile.trial || this.madeBy === 'auto' || this.madeBy === 'prova'); }
  // … e allora il telefono torna a calibrare con i gesti (senza rifare il QR). true se l'ha fatto
  demoteIfStale(){ if (!this.calStale) return false; this.recalibrate(); return true; }
  // pronto, o lo sarà tra un attimo: sensori attivi e profilo semplice già chiesto o da chiedere (senza i gesti)
  get soonReady(){ return this.ready || (this.connected && this.autoSimple && !this.tutWait && ['cal', 'tut', 'ready'].includes(this.state.phone)); }
  // ruolo di chi tiene questo telefono ('p1' o 'p2') e P2 locale (split screen: colpi all'avversario su questo computer)
  get role(){ return this.fixedRole || this.engine.playerRole || 'p1'; }
  get localP2(){ return this.fixedRole === 'p2' && this.engine.playerRole !== 'p2'; }
  get actor(){ return actorOf(this.engine, this.role); }
  get connected(){ return !!this.link?.connected; }
  get ready(){ return !!this.link?.ready; }
  get state(){ return this.link?.L || { state: 'off', phone: null }; }
  // presa scelta nel gioco (lobby, pannello del telefono): va al telefono, che rifà la calibrazione se serve
  // mano scelta nel gioco (NatpfHand.set): va subito al telefono, che la mostra e la usa nella calibrazione
  setHand(h){
    const next = normalizeHand(h);
    if (next === this.hand) return;
    this.hand = next; if (this.fixedRole) writeP2Hand(next); this.gripSent = false; this._sendGrip(); this._changed();
  }
  // mano cambiata sulla pagina del telefono: la decide il gioco (onHand la applica a NatpfHand, che la rimanda qui)
  _onPhoneHand(h){
    const next = normalizeHand(h);
    if (next === this.hand) return;
    if (this.onHand) this.onHand(next); else this.setHand(next);
  }
  setGrip(g){
    this.grip = normalizeGrip(g); writeGrip(this.grip); this.gripSent = false; this._sendGrip(); this._changed();
  }
  // con la presa vanno al telefono anche le richieste facoltative: preparazione del colpo e flusso dei sensori in JSON
  _sendGrip(){
    // telefono ricollegato (anche senza che il computer l'abbia visto cadere: pagina ricaricata entro 5 s): presa,
    // impostazioni, fase e verso atteso vanno rimandati. Prima la fase restava quella vecchia sul computer e il telefono
    // ricaricato, fermo su «menu», scartava i colpi fino al punto dopo
    const joins = this.state.joins || 0;
    if (joins !== this.joins){
      this.joins = joins; this.gripSent = false; this.lastPhase = null; this.lastExpect = null;
      // Un nuovo collegamento può essere una pagina ricaricata: il suo frame d'orientamento riparte da zero.
      // Senza una nuova calibrazione il riferimento si reimpara dai colpi, mai da heading del frame precedente.
      // «Ricollega» (relinked: stessa pagina, canali nuovi) tiene il frame: i riferimenti restano
      if (!this.state.relinked){ this.aimModel.reset(); this.faceModel.reset(); }
    }
    // diag: se la diagnostica sta registrando, anche dopo una riconnessione il telefono rimanda i campioni grezzi
    // (con il tutorial aperto anche l'avanzamento: il telefono riprende dalla scheda raggiunta, B9)
    if (this.connected && !this.gripSent){ this.link.send({ t: 'grip', g: this.grip }); this.link.send(this._cfg()); this._sendTp(); this.gripSent = true; this.lastExpect = null; }
    if (!this.connected) this.gripSent = false;
    // «Nuovo giocatore» con il telefono scollegato (resetPlayer): appena torna, la calibrazione da capo
    if (this.connected && this.recalPending){ this.recalPending = false; this.recalibrate(); }
  }
  get pairingUrl(){ return this.link ? pairingUrl(phonePageUrl(window.location, this.lanOrigin), testSearch(), this.link.session, this.link.token) : null; }
  onChange(fn){ this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _changed(){ for (const fn of this.listeners) try { fn(this); } catch (e){ console.error(e); } }

  start(){
    if (this.link){ this.link.start(); return Promise.resolve(this); }
    // una sola creazione anche con due chiamate ravvicinate (pagina «Collega», pannello del telefono): prima, durante il
    // caricamento delle librerie, ne partivano due, con due collegamenti registrati e un QR che poteva essere l'altro
    return this._starting || (this._starting = this._start().finally(() => { this._starting = null; }));
  }
  async _start(){
    // librerie di NATPF (PeerJS per WebRTC, generatore di QR) dalla cartella del sito
    if (!window.Peer) await loadScript(`${NATPF_BASE}js/vendor/peerjs.min.js`);
    if (!window.qrcode) await loadScript(`${NATPF_BASE}js/vendor/qrcode.js`).catch(() => {});
    // server LAN aperto da localhost: nel QR va l'indirizzo di rete del computer
    this.lanOrigin = await lanOrigin();
    const link = this.link = createPhoneLink();
    link.on('change', () => { this._sendGrip(); this._autoProfile(); this._syncPhoneState(); this._changed(); });
    link.on('cal', e => this._onCal(e));
    link.on('tut', e => this._onTut(e));
    link.on('swing', s => this._onSwing(s));
    link.on('toss', () => this._onToss());
    link.on('prep', p => this._onPrep(p));
    link.on('hand', e => this._onPhoneHand(e.hand));
    link.on('rematch', () => { for (const fn of this.rematchListeners) try { fn(this); } catch (e){ console.error(e); } });
    link.on('next', () => { if (this.nextOffer) for (const fn of this.nextListeners) try { fn(this); } catch (e){ console.error(e); } });
    link.on('raw', k => { for (const fn of this.rawListeners) try { fn(k); } catch (e){ console.error(e); } });
    link.on('dropped', d => { for (const fn of this.dropListeners) try { fn(d.reason, { seq: d.seq, path: d.path }); } catch (e){ console.error(e); } });
    link.on('discard', d => this._diag('scartato', d));
    link.on('mark', d => this._diag('segno', d));
    link.on('device', d => { this.device = d; this._diag('dispositivo', d); });
    await link.start();
    this._changed();
    return this;
  }

  _onCal(e){
    const c = this.cal;
    this.calView = calReduce(this.calView, e);
    if (e.step) c.step = e.step;
    if (e.kind === 'grip' || (e.kind === 'step' && 'upright' in e)) c.grip = !!e.upright;
    if (e.kind === 'step' && e.step === 'still'){ c.review = null; c.freeOk = false; c.attempts = []; }
    if (e.kind === 'attempt'){
      c.attempts[e.globalIdx ?? e.idx ?? c.attempts.length] = e.ok ? 'ok' : 'ko';
      if (e.ok && Number.isFinite(e.lift)){ c.lifts = [...(c.lifts || []), e.lift].slice(-6); const v = [...c.lifts].sort((a, b) => a - b); this.liftBaseline = v[v.length >> 1]; }
    }
    c.idle = e.kind === 'idle';
    if (e.kind === 'review'){ c.review = e; c.freeOk = false; if (e.pass) this.link.cmd('free'); }   // prova libera, poi conferma
    // B28: senza i gesti («Giocando», «Nessuna») il profilo dei tocchi si conferma da solo (prima lo faceva la calibrazione in campo)
    if (e.kind === 'review' && e.touch && e.pass && this.autoSimple) this.link.cmd('confirm');
    // … e un telefono che comincia a calibrare riceve subito la richiesta del profilo semplice
    if (e.kind === 'step') this._autoProfile();
    if (e.kind === 'free' && e.ok) c.freeOk = true;
    if (e.kind === 'done'){
      c.step = 'done'; this.profile = e.profile || null;
      // B28: profilo nuovo, niente di imparato dagli scambi di prova di prima (verso compreso); una calibrazione con i
      // gesti chiesta apposta è finita
      // (come è stato fatto: prima di spegnere gestureCal, che decide autoSimple)
      this.madeBy = !this.profile ? null : this.profile.simple ? (this.autoSimple ? 'auto' : 'salta') : 'gesti';
      // (fatta a metà di una partita, di un minigioco o di un allenamento vale per quell'attività e basta)
      this.gestureAt = this.madeBy === 'gesti' && !this.engine.natpfUi?.activityLive?.() ? this.activitySeq : null;
      this.learner.reset(); this.gestureCal = false; this.simple = !!this.profile?.simple; this.lastExpect = null;
      this.liftBaseline = liftBaselineFromProfile(this.profile) ?? this.liftBaseline;
      this.liftModel.reset(this.liftBaseline); this.faceModel.reset();
      // Allinea prima il collegamento: _sendGrip azzera i riferimenti di un eventuale frame precedente.
      if (e.profile && e.profile.hand !== this.hand) this.gripSent = false;
      this._sendGrip();
      this.aimModel.reset();
      if (!this.profile?.simple) for (const dir of [1, -1]) this.aimModel.seed(dir, this.profile?.faceRef?.[dir]?.heading);
      this.riseModel.reset(); this.typicalModel.reset(); this.shapeModel.reset();
      this.shapeModel.seed(profileShapePower(this.profile)); this.resetSpecials();
      this.headModel.reset(headBaselineFromProfile(this.profile, this.hand) ?? 0);
    }
    c.last = e;
    for (const fn of this.calListeners) try { fn(e); } catch (err){ console.error(err); }
    this._changed();
  }
  onCal(fn){ this.calListeners.add(fn); return () => this.calListeners.delete(fn); }
  // configurazione mandata al telefono (a ogni collegamento e quando cambia l'attesa del tutorial). tv 2: il computer manda
  // l'avanzamento (tp: scheda mostrata e schede viste; dal B28 «Tutto chiaro» è acceso da subito)
  // net (B17.4): chi gioca è a rete (entro NET_Z m), il telefono abbassa la soglia del picco per i tocchi morbidi (swing-detect
  // setNet); si rimanda cfg senza net al rientro
  _cfg(){ return { t: 'cfg', prep: 1, mo: 1, hand: this.hand, ...(this.diagStream ? { diag: 1 } : {}), ...(this.tutWait ? { tut: 1, tv: 2 } : {}), ...(this.atNet ? { net: 1 } : {}) }; }
  // a rete: entro NET_Z.in m dalla rete nello scambio; si esce oltre NET_Z.out (isteresi: niente cfg a ogni passo sul confine).
  // Manda cfg al telefono quando cambia; true se è cambiato
  setNet(v){
    const on = !!v; if (on === !!this.atNet) return false;
    this.atNet = on; if (this.connected) this.link.send(this._cfg());
    return true;
  }
  // il telefono aspetta il tutorial (on) o calibra subito (off); onTutorial: «Tutto chiaro, ho capito» toccato sul telefono.
  // Si chiama con false solo quando il tutorial si chiude davvero (visto, saltato, si lascia la pagina): un telefono che
  // cade a tutorial aperto continua ad aspettare, e al ricollegamento riceve di nuovo cfg con tut e l'avanzamento
  // (_sendGrip). Prima la pagina «Collega» dello stesso schermo lo chiamava anche alla caduta: il telefono ricollegato
  // riceveva un cfg senza tut, calibrava da solo e il tutorial si chiudeva come visto (revisione B9 del 06/11)
  waitTutorial(on){
    const v = !!on; if (v === this.tutWait) return;
    this.tutWait = v; if (!v) this.tutProgress = null;
    if (this.connected) this.link.send(this._cfg());
  }
  // la pagina del telefono sa aspettare il tutorial (ha risposto tut w in questo abbinamento) e tiene il pulsante spento
  // fino all'ultima scheda (v 2). Descrivono la pagina, non l'attesa: valgono finché non cambia l'abbinamento (QR nuovo,
  // link.L.pairs), anche dopo una chiusura del tutorial o un ricollegamento. Senza risposta (pagina di prima) un passo
  // della calibrazione chiude la modale (natpf_split_ui._onCal, natpf_training._onCal)
  get tutSupported(){ return !!this.tutAnswer && this.tutAnswer.pairs === (this.state.pairs || 0); }
  get tutV2(){ return this.tutSupported && this.tutAnswer.v === 2; }
  onTutorial(fn){ this.tutListeners.add(fn); return () => this.tutListeners.delete(fn); }
  // frecce ‹ › toccate sul telefono (-1 indietro, 1 avanti): chi mostra la modale cambia scheda
  onTutorialNav(fn){ this.tutNavListeners.add(fn); return () => this.tutNavListeners.delete(fn); }
  // B20: rivincita dai telefoni nello stesso schermo. onRematch: il telefono ha toccato «Rivincita» (messaggio rm y);
  // offerRematch: il computer dice al telefono se la rivincita si può chiedere e chi l'ha già chiesta (messaggio rm:
  // on, me, ot, nm = nome dell'altro), null per toglierla. Le pagine del telefono di prima ignorano il messaggio
  onRematch(fn){ this.rematchListeners.add(fn); return () => this.rematchListeners.delete(fn); }
  offerRematch(st){
    if (!this.connected) return false;
    this.link.send(st ? { t: 'rm', on: 1, me: st.me ? 1 : 0, ot: st.other ? 1 : 0, nm: String(st.name || '').slice(0, 24) } : { t: 'rm', on: 0 });
    return true;
  }
  onNext(fn){ this.nextListeners.add(fn); return () => this.nextListeners.delete(fn); }
  // label: scritta del pulsante («Avanti ›», «Salta ›»), null per toglierlo. Rimandato a ogni collegamento nuovo (update)
  offerNext(label = null){ this.nextOffer = label ? String(label).slice(0, 24) : null; this._sendNext(); }
  _sendNext(){
    if (!this.connected){ this.nextSent = ''; return; }
    const key = `${this.state.joins || 0}:${this.nextOffer || ''}`;
    if (key === this.nextSent) return;
    this.nextSent = key;
    this.link.send(this.nextOffer ? { t: 'nx', on: 1, lb: this.nextOffer } : { t: 'nx', on: 0 });
  }
  // avanzamento della modale { i, n, s, m, all, nm } (NatpfTutorial.progress), mandato al telefono finché aspetta
  tutorialProgress(p){ this.tutProgress = p ? { ...p } : null; this._sendTp(); }
  // B28 (12/11): il tutorial si chiude da qualunque scheda. «all» va al telefono sempre a 1: una pagina del telefono di
  // prima (in cache) tiene «Tutto chiaro, ho capito» spento finché non lo riceve, e così lo accende subito; le schede viste
  // davvero restano in s e m (puntini). av: tutte le schede viste davvero (solo informazione, pagine nuove)
  _sendTp(){
    const p = this.tutProgress;
    if (!this.tutWait || !p || !this.connected) return;
    this.link.send({ t: 'tp', i: p.i, n: p.n, s: p.s, m: p.m || 0, all: 1, ...(p.all ? { av: 1 } : {}), ...(p.nm ? { nm: String(p.nm).slice(0, 40) } : {}) });
  }
  // messaggi del tutorial dal telefono: w (sa aspettare; v 2 conosce l'avanzamento), nav (frecce), ok («ho capito»).
  // B28: «ok» chiude sempre, da qualunque scheda (prima, da un telefono v2, solo dopo tutte le schede viste)
  _onTut(e){
    if (e.wait) this.tutAnswer = { pairs: this.state.pairs || 0, v: e.v === 2 ? 2 : 1 };
    if (e.nav && this.tutWait) for (const fn of this.tutNavListeners) try { fn(e.nav); } catch (err){ console.error(err); }
    // (chi mostra la modale la chiude e toglie l'attesa con waitTutorial(false), che pulisce anche l'avanzamento)
    if (e.ok){ for (const fn of this.tutListeners) try { fn(e); } catch (err){ console.error(err); } this.tutWait = false; }
    this._changed();
  }
  // tutorial già visto da chi tiene questo telefono (stesso abbinamento): uno qualunque, corto o completo
  get tutorialSeen(){ return this.tutSeenPairs != null && this.tutSeenPairs === (this.state.pairs || 0); }
  // visto il tutorial di questa serie: il completo vale anche per il corto, il corto no per il completo (l'Allenamento dopo
  // una partita mostra le schede che mancano, natpf_tutorial.tutorialResumeAfterShort)
  tutorialSeenFor(set = 'full'){ return this.tutorialSeen && (this.tutSeenSet === 'full' || set === 'short'); }
  // set: la serie appena vista ('short' | 'full'); non si torna dal completo al corto
  markTutorialSeen(set = 'full'){
    const was = this.tutorialSeen ? this.tutSeenSet : null;
    this.tutSeenPairs = this.state.pairs || 0; this.tutSeenSet = was === 'full' || set !== 'short' ? 'full' : 'short'; this.tutSaved = null;
  }
  // visitatore nuovo (chiosco): il tutorial si rivede anche con lo stesso telefono
  forgetTutorial(){ this.tutSeenPairs = null; this.tutSeenSet = null; this.tutSaved = null; }
  // modale chiusa prima della fine (si esce, il telefono cade nella pagina «Collega»): si riprende da lì, stesso abbinamento
  saveTutorial(snap){ this.tutSaved = snap ? { ...snap, pairs: this.state.pairs || 0 } : null; }
  savedTutorial(){ const t = this.tutSaved; return t && t.pairs === (this.state.pairs || 0) ? t : null; }
  // gesto fatto a richiesta (esercizio «Pallonetto» o «Palla corta»): esempio per le soglie personali. Con la forma del
  // colpo (telefoni di oggi) è un esempio della forma del proprio gesto (prima con questi telefoni non si imparava niente,
  // e l'esercizio diceva comunque «Ho imparato il tuo gesto»). Restituisce { learned, distinct }: distinct se il gesto
  // si distingue dal proprio colpo normale (altrimenti il gioco non lo può riconoscere e lo dice)
  learnSpecial(kind, natpf){
    if (!natpf || !['lob', 'drop'].includes(kind)) return { learned: false };
    const I = natpf.intent;
    if (I && Number.isFinite(I.rise) && Number.isFinite(I.plane) && Number.isFinite(I.shapePower)){
      const shapes = this.specialSamples.forma || (this.specialSamples.forma = {});
      shapes[kind] = [...(shapes[kind] || []), { rise: I.rise, plane: Math.abs(I.plane), power: I.shapePower }].slice(-6);
      this.ownShape = learnShapeSpecials(shapes); writeSpecials(this.specialSamples, SPECIALS_KEY + this.keySuffix);
      const own = ownShapes(this.ownShape, { rise: this.profileRise(this.hand === 'left' ? -1 : 1), normal: this.shapeModel.value });
      return { learned: true, distinct: !!own && !!own[kind] && shapeDistinct(own[kind], own.normal) };
    }
    if (!Number.isFinite(natpf.v)) return { learned: false };
    this.specialSamples[kind] = [...(this.specialSamples[kind] || []), kind === 'lob' ? natpf.v : { v: natpf.v, speed: natpf.speed }].slice(-6);
    this.personal = learnSpecials(this.specialSamples); writeSpecials(this.specialSamples, SPECIALS_KEY + this.keySuffix);
    return { learned: true, distinct: Number.isFinite(kind === 'lob' ? this.personal.lob : this.personal.cut) };
  }
  // salita abituale del colpo nel verso dir (calibrazione o imparata giocando), per i prototipi
  profileRise(dir){ return habitualRise(this.profile, dir, this.riseModel); }
  resetSpecials(){ this.specialSamples = {}; this.personal = {}; this.ownShape = {}; writeSpecials({}, SPECIALS_KEY + this.keySuffix); }
  _onSwing(s){
    const mc = this.engine.motionController;
    if (!mc || !this.ready){ for (const fn of this.dropListeners) try { fn('telefono non pronto', s); } catch (e){ console.error(e); } return; }
    // colpo consegnato in forte ritardo: giocato ora sarebbe un colpo «fantasma» fuori tempo (prima si accettava fino a
    // 3 s dopo il picco, e il motore lo trattava come fatto al massimo 0,3 s prima)
    if (Number.isFinite(s?.at) && performance.now()/1000 - s.at > PHONE_STALE_S){
      this.ignoredSwings = (this.ignoredSwings || 0) + 1;
      for (const fn of this.swingListeners) try { fn({ ignored: 'arrivato in ritardo dalla rete', natpf: {} }, s); } catch (e){ console.error(e); }
      return;
    }
    // la palla si allontana (l'ha appena colpita chi gioca qui): è il rientro della mano o un gesto a vuoto, non un
    // colpo. Prima il motore faceva comunque partire swing e fruscio della racchetta.
    if (ballMovingAway(this.engine, this.role)){
      this.ignoredSwings = (this.ignoredSwings || 0) + 1;
      for (const fn of this.swingListeners) try { fn({ ignored: 'palla che si allontana', natpf: {} }, s); } catch (e){ console.error(e); }
      return;
    }
    // B28, scambi di prova: il gioco sa da che parte ha mandato la palla. Prima di leggere il colpo il suo verso vota (il
    // segno può girarsi con questo stesso colpo), poi il colpo si legge con il verso corretto
    // Il lato che vota è quello che si vede al momento del colpo (ballSideNow: dove il personaggio si è messo rispetto alla
    // palla), non quello deciso al lancio: chi gioca intanto si è mosso
    const T = this.trial, probe = T && !T.keep && T.want && this._incoming() ? T.ball : null;
    if (probe != null) this.learner.vote({ ball: probe, want: ballSideNow(this.engine, this.role, T.at), s });
    s = signedSwing(s, this.learner.sign);   // B35a: con il verso anche la direzione del piatto
    // B35a: il telefono ha girato da sé verso e piatto (voto del rilevatore, profilo semplice): i riferimenti per verso
    // imparati prima stanno dalla parte sbagliata e ripartono, come dopo gli scambi di prova con il segno girato
    const phoneSign = s.absSign === -1 ? -1 : 1;
    if (phoneSign !== (this.phoneSign ?? 1)){ this.phoneSign = phoneSign; this.aimModel.reset(); this.riseModel.reset(); this.faceModel.reset(); }
    // forza e profondità voluta rispetto al proprio colpo tipico imparato giocando (richiesta del 23/10, C4): un colpo più
    // forte del solito va più in fondo, uno più morbido più corto. Prima il riferimento era il gesto della calibrazione,
    // spesso un colpetto (il 23/10 143 °/s): la parte relativa della forza era sempre piena e la profondità non seguiva
    // l'intensità. Il colpo tipico è nella stessa misura del picco (peak), quindi la forza si legge su quello. Finché non
    // c'è (primi colpi dello scambio), il riferimento della calibrazione
    const { ref, rawRef } = powerRefs(this.profile, this.typicalModel.value, { seen: this.typicalModel.seen, peak: s.peak });
    // salita abituale dei propri colpi in questo verso (gesti della calibrazione, o imparata giocando): classifyStroke
    const riseRef = habitualRise(this.profile, s.dir, this.riseModel);
    // pallonetto e palla corta come li fa chi gioca (esercizi del riscaldamento), rispetto al proprio colpo normale
    const own = ownShapes(this.ownShape, { rise: riseRef, forehandRise: this.profileRise(this.hand === 'left' ? -1 : 1), normal: this.shapeModel.value });
    const ev = { ...natpfSwingToEngine(s, { hand: this.hand, grip: this.grip, liftBaseline: this.liftModel.value, headBaseline: this.headModel.value, personal: this.personal, own, faceCenter: this.faceModel.center(s.dir), aimModel: this.aimModel, now: performance.now()/1000, displayLag: this.displayLagMs/1000, prep: this.lastPrep, prepCapable: !!this.state.prep, ballHigh: ballIsHigh(this.engine, this.role), ref, rawRef, riseRef, aimFull: aimFullNow() }), role: this.role };
    // numero del colpo del telefono: la diagnostica lega così il gesto (tel.colpo) al suo esito nel motore (colpo.gioco)
    ev.natpf.seq = Number.isFinite(s.seq) ? s.seq : null;
    // colpo tipico di chi gioca, prima di questo colpo: il motore decide così se il gesto è debole (natpf_impact.WEAK)
    ev.natpf.typical = this.typicalModel.value ?? profileTypical(this.profile);
    // B25: il colpo tipico è già quello imparato giocando (almeno 3 colpi) e non ancora quello della calibrazione, spesso un
    // colpetto: il colpo super sulla forza relativa (natpf_duo_rules.relStrong) vale solo da qui in poi
    ev.natpf.typicalOwn = this.typicalModel.value != null;
    if (Number.isFinite(s.peak) && !Number.isFinite(ev.natpf.peak)) ev.natpf.peak = s.peak;
    if (Number.isFinite(s.angle)) ev.natpf.angle = s.angle;
    // gesto fatto a richiesta negli esercizi del pallonetto e della palla corta: non insegna niente del colpo normale
    const expect = typeof this.expectSpecial === 'function' ? this.expectSpecial() || null : null, rally = this.engine.phase === 'RALLY';
    if (rally && !expect) this.typicalModel.learn(s.peak, ev.natpf.intent);
    this.lastPrep = null;
    if (!ev.side) ev.side = sideFromBall(this.engine, this.hand, this.role);
    // riferimenti personali solo dai colpi normali: prima entravano anche pallonetti e palle corte, e dopo tre di fila il
    // quarto sembrava «normale» (usciva un dritto)
    if (!expect && NORMAL_SHOTS.has(ev.natpf.shot)){ this.liftModel.add(s.dir, s.lift); this.headModel.add(s.dir, ev.natpf.head); }
    // piatto e direzione abituali solo dai colpi dello scambio non deboli: servizi, preparazioni e micro-movimenti
    // spostavano il centro (il 23/10 scarti di 50–77° in quasi tutti i colpi)
    if (teachesNormal(ev, { rally, expect })){ this.faceModel.add(s.dir, s.face); this.aimModel.add(s.dir, s.heading); }
    if (rally && !expect) this.riseModel.learn(s.dir, s.shape?.rise, ev.natpf.intent);
    if (ev.natpf.intent && teachesNormal(ev, { rally, expect })) this.shapeModel.add(ev.natpf.intent.plane, ev.natpf.intent.shapePower);
    // colpo di prova: insegna i riferimenti solo se è un colpo normale e non debole; marcato per la diagnostica
    if (probe != null){ this.learner.mark(probe, teachesNormal(ev, { rally, expect })); ev.natpf.prova = true; }
    else if (T) ev.natpf.prova = true;
    for (const fn of this.swingListeners) try { fn(ev, s); } catch (e){ console.error(e); }
    // P2 locale dello split screen: come un colpo del Player 2 arrivato dalla rete (natpf_split.js); altrimenti
    // _emitSwing instrada già P1 in locale e P2 verso l'host (relay della stanza 1v1)
    if (this.localP2) mc._emitP2Swing({ ...ev, source: 'phone', hand: this.hand });
    else mc._emitSwing(ev);
  }
  // Preparazione del colpo (racchetta portata indietro, nel verso opposto al colpo): la racchetta in gioco si carica
  // da quella parte e il colpo che segue vale come «preparato» (natpfSwingToEngine → prep).
  _onPrep(p){
    if (!this.ready) return;
    if (this.learner.sign === -1) p = { ...p, dir: -p.dir };
    this.lastPrep = { ...p };
    this._diag('prep', p);
    const side = strokeSide(-p.dir, this.hand), actor = this.fixedRole ? this.actor : this.engine.localActor || this.engine.player;
    if (actor && side) (actor.userData || (actor.userData = {})).natpfPrep = { side, until: performance.now() + 750, amount: clamp((p.angle || 30)/50, .45, 1) };
  }
  onDiag(fn){ this.diagListeners.add(fn); return () => this.diagListeners.delete(fn); }
  _diag(kind, d){ for (const fn of this.diagListeners) try { fn(kind, d); } catch (e){ console.error(e); } }
  onRaw(fn){ this.rawListeners.add(fn); return () => this.rawListeners.delete(fn); }
  onDropped(fn){ this.dropListeners.add(fn); return () => this.dropListeners.delete(fn); }
  onSwing(fn){ this.swingListeners.add(fn); return () => this.swingListeners.delete(fn); }
  _onToss(){
    const mc = this.engine.motionController;
    if (!mc || !this.ready) return;
    if (this.localP2) mc._emitP2Toss({ source: 'phone', shotType: 'lob', speed: 1.1, dirX: 0, dirY: -.9 });
    else mc._emitToss({ source: 'natpf-phone', shotType: 'lob', speed: 1.1, dirX: 0, dirY: -.9, role: this.engine.playerRole });
  }

  // comandi della calibrazione (vedi racchetta.js → command)
  // gestures (B28): calibrazione con i gesti anche se l'opzione dello stand è «Giocando» o «Nessuna» («Calibra con i gesti»
  // nel pannello del telefono); senza, con quelle opzioni il telefono riceve subito il profilo semplice (_autoProfile)
  recalibrate({ gestures = false } = {}){
    this.simple = false; this.gestureCal = !!gestures; this.skipAskedAt = -1e9;
    this.cal = { step: null, review: null, freeOk: false, grip: null, attempts: [], idle: false }; this.calView = CAL_VIEW_EMPTY; this.link?.cmd('cal'); this._changed();
  }
  // B28, «molte persone, un telefono»: chi gioca adesso non eredita niente da chi c'era prima. Il telefono riparte dal
  // profilo semplice (cal + skip: azzera sul telefono i colpi giocati e il segno imparato, swing-detect setProfile; lo
  // capisce anche una pagina di prima) e sul computer la fine della «calibrazione» azzera colpo tipico, salita, piatto,
  // mira, verso e prototipi dei colpi speciali (_onCal done). Con la calibrazione «Con i gesti» non si tocca niente: il
  // profilo dei gesti resta finché non si preme «Nuovo giocatore» o «Ricalibra». false se non si è fatto niente
  freshPlayer(){
    if (!this.autoSimple || !this.connected || this.tutWait) return false;
    this.recalibrate(); this.skipAskedAt = this.resetAt = performance.now(); this.skipCalibration();
    return true;
  }
  // Il profilo da capo chiesto dal gioco è in viaggio: per un attimo il telefono dice «calibrazione» e non «pronto», ed
  // è previsto. Vale al massimo RESET_GRACE_MS dalla richiesta, solo con il telefono collegato in quello stato; chi
  // guarda la salute del telefono (natpf_phone_watch.phoneHealthOf) in quel tratto non lo prende per «non pronto»
  // (revisione del B28, difetto 6: con 500 ms di rete la partita andava in pausa 3 s all'inizio degli scambi di prova)
  get resetting(){
    return this.resetAt != null && this.connected && !this.ready && this.autoSimple && this.state.phone === 'cal' && performance.now() - this.resetAt < RESET_GRACE_MS;
  }
  /* ---------- scambi di prova (B28): il gioco manda palle di cui conosce il lato ---------- */
  // inizio: profilo da capo e niente di imparato; il telefono mostra «Scambi di prova» (messaggio ph con tr)
  // (keep: chi ha un profilo fatto con i gesti lo tiene: gioca gli scambi di prova ma il gioco non ne impara niente)
  beginTrial({ keep = this.keepsGesture } = {}){
    if (!keep){ this.gestureCal = false; this.freshPlayer(); }
    this.learner.reset(); this.trial = { ball: 0, want: 0, keep }; this.lastPhase = null; this.lastExpect = null;
    this._changed();
  }
  // palla nuova in arrivo: want = +1 alla destra di chi gioca, −1 alla sinistra (0: non si sa, il colpo non vota)
  trialBall(want = 0){ if (this.trial){ this.trial.ball++; this.trial.want = want === 1 ? 1 : want === -1 ? -1 : 0; this.trial.at = this.engine.elapsedTime; } }
  // palla finita (colpita o persa): fino alla prossima i gesti non votano
  trialIdle(){ if (this.trial) this.trial.want = 0; }
  get trialOn(){ return !!this.trial; }
  // colpi di prova imparati finora per lato di chi gioca: { forehand, backhand, total }
  // (chi tiene il profilo dei gesti non ha niente da imparare: conta come fatto. Revisione del B28, difetto 7: nello
  // stesso schermo con un giocatore calibrato con i gesti gli scambi di prova arrivavano sempre al tetto di tempo)
  trialCounts(){
    if (this.trial?.keep) return { 1: TRIAL.perSide, '-1': TRIAL.perSide, forehand: TRIAL.perSide, backhand: TRIAL.perSide, total: 2*TRIAL.perSide, keep: true };
    return this.learner.counts(this.hand);
  }
  // fine: il profilo imparato sostituisce quello semplice (se i colpi bastano) e semina i riferimenti come fa la
  // calibrazione con i gesti; colpo tipico e forma del colpo normale restano quelli imparati dai colpi di prova (come dopo
  // il riscaldamento). Restituisce il riassunto { level, n, sign, ref } per chi mostra l'esito e per la diagnostica
  endTrial(){
    if (!this.trial) return null;
    const keep = !!this.trial.keep;
    this.trial = null; this.lastPhase = null; this.lastExpect = null;
    // (keep: ha tenuto il profilo dei gesti, niente da imparare: chi mostra l'esito lo dice e riempie i puntini)
    if (keep) return { level: 'gesti', keep: true, n: { forehand: 0, backhand: 0 }, sign: 1, ref: this.profile?.ref ?? null, votes: { agree: 0, against: 0 } };
    const L = this.learner, level = L.level(), learned = L.profile(this.profile), counts = L.counts(this.hand);
    if (learned){
      this.profile = learned; this.simple = false; this.madeBy = 'prova'; this.gestureAt = null;
      // i riferimenti per verso hanno visto i primi colpi con il verso di prima della correzione: da capo, dal profilo
      // B35a: seme dai colpi veri dello scambio (trusted): una mira tenuta non sposta il centro (natpf_gestures.AIM)
      this.aimModel.reset(); for (const dir of [1, -1]) this.aimModel.seed(dir, learned.faceRef?.[dir]?.heading, { trusted: true });
      this.riseModel.reset(); this.faceModel.reset();
      this.liftModel.reset(this.liftBaseline); this.headModel.reset(headBaselineFromProfile(learned, this.hand) ?? 0);
      this.shapeModel.seed(profileShapePower(learned));
      // soglie del telefono sul colpo di chi gioca (pagine dal B28; quelle di prima ignorano il messaggio)
      const th = phoneThresholds(learned, learned.noise);
      if (th && this.connected) this.link.send({ t: 'pf', ...th });
    } else if (L.flips){ this.aimModel.reset(); this.riseModel.reset(); this.faceModel.reset(); }
    const out = { level, n: { forehand: counts.forehand, backhand: counts.backhand }, sign: L.sign, ref: learned?.ref ?? null, votes: L.votes };
    this._changed();
    return out;
  }
  // palla in arrivo verso chi tiene questo telefono (l'ha mandata l'altro, o il lanciapalle)
  _incoming(){ const b = this.engine.ball; return this.engine.phase === 'RALLY' && !!b?.inPlay && b.lastHitter !== mineOf(this.engine, this.role); }
  retry(){ this.cal.attempts = []; this.link?.cmd('retry'); }
  confirm(){ this.link?.cmd('confirm'); }
  invert(){ this.link?.cmd('invert'); }
  skipGrip(){ this.link?.cmd('skipGrip'); }
  forget(){ this.link?.forget(); this.recalibrate(); }
  // «Nuovo giocatore» (B18, difetto 5 del B16): chi arriva dopo non eredita niente di chi c'era prima, e il telefono resta
  // collegato (niente link.forget, niente QR da rifare). Si azzerano: tutorial visto (anche il corto), calibrazione
  // (profilo e riferimenti della forza di powerRefs: con il profilo nullo e il colpo tipico vuoto non resta niente del
  // giocatore di prima), colpo tipico, salita, piatto, verso e mira abituali, prototipi dei colpi speciali (pallonetto e
  // palla corta). Sul telefono «cal» cancella il profilo salvato e la calibrazione nuova azzera i colpi giocati
  // (swing-detect setProfile: effRef). gate: il telefono aspetta il tutorial prima di calibrare (lo apre chi porta il
  // visitatore in campo: natpf_training, o la metà dello stesso schermo). Telefono non collegato in quel momento (schermo
  // spento, pagina ricaricata): la calibrazione si chiede appena torna (_sendGrip), anche se il telefono ha ancora il
  // profilo di prima. La mano non si tocca qui: la decide il gioco (natpf_new_player)
  resetPlayer({ gate = true } = {}){
    this.forgetTutorial();
    this.profile = null; this.madeBy = null; this.gestureAt = null; this.liftBaseline = 0; this.lastExpect = null;
    this.liftModel.reset(null); this.faceModel.reset(); this.aimModel.reset(); this.headModel.reset(0);
    this.riseModel.reset(); this.typicalModel.reset(); this.shapeModel.reset(); this.resetSpecials();
    this.learner.reset(); this.trial = null;
    this.recalPending = !this.connected;
    if (this.connected && gate) this.waitTutorial(true);
    this.recalibrate();
  }
  // salta i gesti della calibrazione: il telefono usa un profilo semplice (verso dalla gravità, tipo di colpo dalla forma,
  // forza dalla velocità vera; manca solo il colpo tipico)
  skipCalibration(){ this.simple = true; this.link?.cmd('skip'); this._changed(); }
  // «Ricollega»: il telefono rifà il collegamento con la sua chiave di ripresa (canali nuovi), senza ricaricare la pagina.
  // false se non è collegato (allora si ricollega da solo o con il QR)
  relink(){ return !!this.link?.relink?.(); }

  // Esito dei colpi al telefono (vibrazione e scritta), dalle stesse chiamate che motore base usa per l'aptica.
  feedback({ role, kind, grade = '', shotType = '', quality = null, late = false } = {}){
    if (!this.ready || (role || 'p1') !== this.role) return;
    const shot = /SMASH/i.test(shotType) ? 'smash' : /LOB/i.test(shotType) ? 'lob' : /SLICE/i.test(shotType) ? 'slice' : 'drive';
    // vib: vibrazione per esito (lunga = perfetto, breve = buono, doppia = errore); i telefoni senza supporto la ignorano
    const vib = quality ? VIBRATION[quality.color] : undefined;
    // B18 (difetto 10): il telefono dice la stessa cosa del computer. Il voto viene dall'esito del computer (quality), poi
    // «Fuori» e «In rete» con il perché quando viene dal tempo (why: «troppo presto», «in ritardo»…); prima il telefono
    // ignorava fuori e rete e diceva «In anticipo» mentre il computer diceva «Fuori»
    // B37: in partita «Fuori» e «In rete» aspettano la palla: al colpo wait (scritta neutra, vibrazione breve), poi lo
    // stesso messaggio con l'esito vero e late quando la palla tocca terra o la rete (natpf_shot_feedback.settle)
    if (kind === 'hit') this.link.send({ t: 'ev', k: 'contact', label: phoneLabel(quality, grade), shot, vib,
      ...(quality?.wait ? { wait: 1 } : {}), ...(late ? { late: 1 } : {}),
      out: quality?.label === 'Fuori', net: quality?.label === 'In rete', ...(quality?.label === 'Troppo lunga' ? { long: true } : {}),
      // B18.2 passo 3 (D8): per la palla corta lunga o in rete, senza un errore di tempo, il motivo (cause: «da troppo lontano»…)
      // (revisione finale: con un errore di tempo e una causa diversa vanno tutti e due, «in ritardo · da troppo lontano»,
      // come sul computer; prima il telefono perdeva la causa)
      ...(quality?.why || quality?.cause ? { why: phoneWhy(quality) } : {}) });
    else if (kind === 'whiff') this.link.send({ t: 'ev', k: 'miss', why: /REACH/i.test(grade) ? 'portata' : /EARLY/i.test(grade) ? 'presto' : 'tardi', vib: VIBRATION.red });
    // «Punto tuo» / «Punto avversario» solo a punto finito (_awardPoint: point_won o fault), con il motivo in italiano
    else if (kind === 'point_won' || kind === 'fault') this.link.send({ t: 'ev', k: 'point', mine: kind === 'point_won', txt: pointReason(grade) });
  }

  // B18 (miglioramento 2): lancio del servizio senza battuta, la palla è ricaduta. Il telefono lo dice come il computer
  // (natpf_serve_coach.js): «Lancio a vuoto», poi si rilancia
  tossMissed(){
    if (!this.ready || !this.link) return;
    this.link.send({ t: 'ev', k: 'miss', why: 'lancio', vib: VIBRATION.red });
  }

  // Ogni fotogramma: fase al telefono e orientamento del telefono alla racchetta del motore base.
  update(){
    if (!this.link) return;
    const phase = this.connected ? phoneGamePhase(this.engine, this.role) : null;
    // (tr, B28: scambi di prova in corso, il telefono lo scrive; le pagine di prima lo ignorano)
    if (phase && phase !== this.lastPhase){ this.lastPhase = phase; this.link.send({ t: 'ph', ph: phase, ...(this.trial ? { tr: 1 } : {}) }); }
    this._autoProfile(); this._sendNext();
    // verso del colpo atteso: il telefono distingue così la preparazione (verso opposto) dal colpo. Con il verso corretto
    // dagli scambi di prova (dirSign −1) va al telefono girato: per lui dritto e rovescio sono scambiati
    const ex = phase === 'play' && this.ready ? expectedStrokeDir(this.engine, this.hand, this.role)*this.learner.sign : 0;
    if (this.connected && ex !== this.lastExpect){ this.lastExpect = ex; this.link.send({ t: 'ex', d: ex }); }
    // a rete (B17.4): soglie basse sul telefono per i tocchi morbidi, finché si resta entro NET_Z dalla rete nello scambio
    this.setNet(phase === 'play' && this.ready && atNet(this.engine, this.role, !!this.atNet));
    if (!this.connected) this.lastPhase = null;
    this._syncPhoneState();
  }
  _syncPhoneState(){
    const mc = this.engine.motionController;
    // il P2 locale non tocca lo stato del telefono del motore: quello inclina la racchetta del P1
    if (!mc || this.fixedRole) return;
    const ready = this.ready, was = mc.externalRacket === 'natpf-phone';
    if (!ready && !was) return;                                  // telefono NATPF non in uso: stato del relay del motore base
    // finché il telefono NATPF è pronto il polling del relay non sovrascrive stato e orientamento
    mc.externalRacket = ready ? 'natpf-phone' : null;
    mc.phoneState.connected = ready;
    if (ready){
      // presa orizzontale: la racchetta segue il piatto del telefono; altrimenti il flusso dei sensori (LAN)
      const face = this.link.face && this.link.face(), motion = face ? null : this.link.motion();
      const tilt = face ? racketTiltFromFace(face) : motion && !motion.stale ? racketTiltFromRotation(motion.rotation, motion.confidence) : { pitch: 0, roll: 0, yaw: 0 };
      if (tilt) mc.phoneState.orientation = { ...mc.phoneState.orientation, ...tilt, accelMag: 0 };
    }
    if (was !== ready) mc._notifyStatus({ webcam: mc.webcamActive, phone: ready, p1Phone: ready && this.engine.playerRole === 'p1', p2Phone: ready && this.engine.playerRole === 'p2' });
  }
}
