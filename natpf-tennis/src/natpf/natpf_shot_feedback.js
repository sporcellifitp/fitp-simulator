// Esito del colpo senza barra del tempo. Per i colpi del giocatore locale:
// - anello di arrivo a terra, nel punto in cui atterrerà la palla (noto già al momento del colpo), colorato:
//   verde = perfetto, giallo = buono / in anticipo / in ritardo, rosso = finirà fuori; al rimbalzo pulsa;
// - lampo dello stesso colore sulla racchetta;
// - messaggio breve («Perfetto», «Anticipo», «Ritardo», «Buono», «Fuori · troppo presto», «In rete», «Troppo tardi»,
//   «Troppo lunga» per la palla corta), con il motivo quando la
//   situazione rende il colpo debole o lo fa fallire («palla debole: in corsa», «scambio lungo»).
// I colpi dell'avversario restano con l'anello bianco di rimbalzo del motore base.
// B37 (collaudo dell'utente del 13/11: «aspetta che la palla vada realmente fuori … è brutto che tu anticipi la palla
// che va fuori»): in partita il verdetto «Fuori» / «In rete» non si dice più al colpo. Al colpo una scritta e un lampo
// neutri (nessun esito, niente anello); quando la palla tocca terra fuori o la rete (game_engine._awardPoint, motivo
// «Out» / «Net») arrivano insieme la scritta «Fuori · …», l'anello rosso dove è caduta, l'etichetta del gesto e il
// telefono (scritta e vibrazione dell'errore), con il punto. Se la palla cade dentro lo stesso (previsione sbagliata, o
// servizio vicino alla riga) al primo rimbalzo si mostra l'esito in campo; se l'avversario la prende al volo, niente.
// Allenamento, minigiochi e scambi di prova restano come prima (lì l'esito subito fa parte della lezione).
import * as THREE from 'three';
import { splitViewports } from './natpf_split.js';
import { predictBall } from './natpf_impact.js';
import { MOVE_WHY } from './natpf_movement.js';

export const QUALITY_COLORS = Object.freeze({ green: 0x3be37f, yellow: 0xffd23f, red: 0xff4d5e });
const COURT = { halfW: 4.115, halfL: 11.885, service: 6.4 };

// Dentro il campo avversario? (P1 tira verso z < 0, P2 verso z > 0; servizio: nel riquadro del servizio)
// target.predicted (revisione B18): rimbalzo vero previsto (landingOf) → la tolleranza delle righe del motore
// (game_engine: |x| > SINGLES_X + 0,22 o |z| > BASELINE_Z + 0,28 al primo rimbalzo è «Out»)
export const LINE_TOL = Object.freeze({ x: .22, z: .28 });
export function landsIn(target, { towardNegativeZ = true, serve = false } = {}){
  if (!target) return false;
  const z = towardNegativeZ ? -target.z : target.z, tx = target.predicted && !serve ? LINE_TOL.x : .02, tz = target.predicted && !serve ? LINE_TOL.z : .02;
  if (Math.abs(target.x) > COURT.halfW + tx) return false;
  return serve ? z > 0 && z <= COURT.service + .02 : z > 0 && z <= COURT.halfL + tz;
}
// Dove rimbalzerà davvero la palla appena colpita. Revisione B18: il bersaglio del motore (ball.targetLanding) non è il
// rimbalzo vero, l'effetto e l'aria portano la palla fino a 1,3 m più verso il centro (banco scritte-esito: 16 «Fuori»
// su 34 del profilo «umano» con la palla poi dentro e il punto vinto, «Nice Shot!»). Si prevede il primo rimbalzo con la
// fisica del motore (natpf_impact.predictBall); senza posizione e velocità (prove, palla ferma) vale il bersaglio
export function landingOf(ball){
  const t = ball?.targetLanding || null, p = ball?.pos, v = ball?.vel;
  if (!p || !v || ![p.x, p.y, p.z, v.x, v.y, v.z].every(Number.isFinite) || Math.hypot(v.x, v.y, v.z) < .5) return t;
  const b = predictBall(ball, { maxT: 3.5, stopZ: 40 }).find(k => k.bounces >= 1);
  return b ? { x: b.x, z: b.z, predicted: true } : t;
}
// grade del motore (es. «PERFECT • FOREHAND TOPSPIN», «POWER SERVE!», «EARLY SERVE», «TOO LATE! • WHIFF») → esito.
// net: la palla va in rete. Il motore lascia il bersaglio in campo e abbassa la traiettoria: prima il messaggio diceva
// «Perfetto», con l'anello verde in campo, e poi la palla finiva in rete (segnalazione del 23/10, sera)
// B18 (difetto 10 dell'audit B16): quando l'errore viene dal tempo la scritta dice anche il perché, «Fuori · troppo
// presto», «In rete · in ritardo» (why), e il colpo a vuoto in ritardo dice «Troppo tardi» invece di «Mancata». label
// resta l'esito breve («Fuori», «In rete»: lo leggono allenamento e minigiochi); text è la scritta intera da mostrare.
export function timingWhy(grade = ''){
  const g = String(grade).toUpperCase();
  return /VERY EARLY/.test(g) ? 'troppo presto' : /VERY LATE/.test(g) ? 'troppo tardi' : /EARLY/.test(g) ? 'in anticipo' : /LATE/.test(g) ? 'in ritardo' : null;
}
const withWhy = (q, why) => why ? { ...q, why, text: `${q.label} · ${why}` } : q;
export const qualityText = q => q?.text || q?.label || '';
// B18.2 passo 3 (D8): la palla corta può venire troppo lunga (long: dentro il campo, lenta a metà campo, «Troppo lunga» in
// giallo) o finire in rete; cause: il motivo che pesa di più (natpf_stroke_outcome.dropCause: «da troppo lontano», «gesto
// troppo forte», «in corsa», «in ritardo»…), che il computer mostra nella riga piccola e il telefono sotto la scritta
const withCause = (q, cause) => cause ? { ...q, cause } : q;
export function shotQuality(grade = '', { inCourt = true, net = false, long = false, cause = null } = {}){
  const g = String(grade).toUpperCase();
  if (/WHIFF/.test(g) && /EARLY/.test(g)) return { color: 'red', label: 'Troppo presto' };
  if (/WHIFF/.test(g) && /REACH/.test(g)) return { color: 'red', label: 'Troppo lontana' };
  if (/TOO LATE|WHIFF.*LATE|LATE.*WHIFF/.test(g)) return { color: 'red', label: 'Troppo tardi' };
  if (/WHIFF/.test(g)) return { color: 'red', label: 'Mancata' };
  if (net) return withCause(withWhy({ color: 'red', label: 'In rete' }, timingWhy(g)), cause);
  if (!inCourt) return withWhy({ color: 'red', label: 'Fuori' }, timingWhy(g));
  if (long) return withCause(withWhy({ color: 'yellow', label: 'Troppo lunga' }, timingWhy(g)), cause);
  if (/PERFECT|POWER/.test(g)) return { color: 'green', label: 'Perfetto' };
  if (/EARLY/.test(g)) return { color: 'yellow', label: 'Anticipo' };
  if (/LATE/.test(g)) return { color: 'yellow', label: 'Ritardo' };
  return { color: 'yellow', label: 'Buono' };
}
// nome del colpo speciale dal grade del motore («PERFECT • FOREHAND LOB!», «EARLY • SMASH!»): si mostra insieme
// all'esito, altrimenti pallonetto, palla corta e schiacciata non si distinguono da un colpo normale
export function shotName(grade = ''){
  const g = String(grade).toUpperCase();
  if (/SERVE/.test(g)) return null;
  return /DROP SHOT/.test(g) ? 'Palla corta' : /SMASH/.test(g) ? 'Schiacciata' : /\bLOB\b/.test(g) ? 'Pallonetto' : /\bSLICE\b/.test(g) ? 'Tagliato' : null;
}
// motivo del colpo debole o fallito della racchetta (natpfLastRacket del motore, solo se è il colpo appena fatto da chi):
// «palla debole: in corsa» a rete con il tempo perfetto, altrimenti la causa («in allungo», «scambio lungo», …)
// (B18.2 passo 3: anche la palla corta troppo lunga, che non è fallita, ha il suo motivo)
// B32: un colpo riuscito preso in corsa o in allungo contro la CPU lo dice anche lui («in corsa», «in allungo»: L.move,
// natpf_movement.moveTag), perché è più debole e meno preciso di quello da fermo
// (B34: la scritta segue L.say, «in corsa» solo con la corsa forte: natpf_movement.moveSay; L.move resta per il registro)
export function shotWhy(L, { now = null, who = 'player' } = {}){
  const say = L && ('say' in L ? L.say : L.move);
  if (L && !L.out?.failed && !L.out?.dropLong && MOVE_WHY[say] && L.who === who && (now == null || L.at === now)) return MOVE_WHY[say];
  if (!(L?.out?.failed || L?.out?.dropLong) || !L.cause || L.who !== who || (now != null && L.at !== now)) return null;
  return L.out.weak ? `palla debole: ${L.cause}` : L.cause;
}
// B18.2 passo 3 (D8): la palla corta appena giocata da «who» ('player' o 'p2') è venuta troppo lunga o è finita in rete?
// { long, cause } per shotQuality; null per gli altri colpi, per una palla corta riuscita o se non è il colpo di adesso
export function dropOutcome(L, { now = null, who = 'player' } = {}){
  const o = L?.out;
  if (!o || o.shot !== 'DROP' || !(o.dropLong || o.failed) || L.who !== who || (now != null && L.at !== now)) return null;
  return { long: !!o.dropLong && !o.netFault, cause: L.cause || null };
}
// Posto della scritta dell'esito (B10, segnalazione del 06/11: «se gioco 2v2, i nomi dei colpi (es. "Perfetto!")
// ostruiscono la visuale del campo»). Prima la scritta si apriva sopra la testa di chi colpiva (+2,35 m): nel doppio il
// colpo del compagno a rete la metteva in mezzo al campo, sopra la rete e gli avversari, e nel singolo copriva chi
// gioca e la palla. Ora sta nell'angolo in basso del proprio lato, sopra Potenza ed Energia (fuori dal campo):
// - chi gioca qui (P1, o il P2 dall'altro computer): angolo sinistro, dove ha le sue barre;
// - stesso schermo: P1 a sinistra, P2 a destra, ciascuno sopra le sue barre;
// - il colpo dell'altro giocatore che si vede qui (sfida un amico): angolo destro, più piccolo («avversario»);
// - il colpo del compagno CPU nel doppio è il tuo (lo fa il tuo gesto quando la palla è sua): nel tuo angolo, con
//   «compagno» nella riga piccola, non come un colpo diverso.
// p2: il colpo è del lato del P2 (grade «P2 …»); role: chi gioca qui; split: stesso schermo; partner: l'ha fatto il compagno
export function popupPlace({ p2 = false, role = 'p1', split = false, partner = false } = {}){
  const mine = split || p2 === (role === 'p2');
  return { side: split ? (p2 ? 'right' : 'left') : mine ? 'left' : 'right', kind: !mine ? 'other' : partner ? 'partner' : 'mine' };
}
// revisione finale B31: scritta che annuncia un colpo della CPU («CPU DROP SHOT»), non l'esito di un colpo di chi gioca
export const isCpuGrade = (grade = '') => /^CPU\b/i.test(String(grade));
// … sta nell'angolo dell'avversario (la CPU), piccola come il colpo dell'altro giocatore
export const cpuPopupPlace = (role = 'p1') => ({ side: role === 'p2' ? 'left' : 'right', kind: 'other' });
// durata della scritta (ms): più breve di prima (1,1 s il colpo, 0,75 s l'errore)
export const POPUP_MS = Object.freeze({ hit: 900, miss: 700 });

// vibrazione del telefono: lunga per il perfetto, breve per il buono, doppia corta per l'errore
export const VIBRATION = Object.freeze({ green: [70], yellow: [25], red: [25, 60, 25], wait: [25] });   // wait: colpo che aspetta il verdetto (B37)

// B37: verdetto rimandato. In partita, con la palla in gioco (non allenamento, minigiochi, scambi di prova né dimostrazione)
export const VERDICT = Object.freeze({ maxWait: 6 });    // s: verdetto mai arrivato (punto interrotto): si lascia perdere
export function defersVerdict(engine){
  const ui = engine?.natpfUi;
  return !!engine && engine.phase === 'RALLY' && !engine.autoPlayMode && !ui?.training?.active && !ui?.events?.active && !ui?.trial?.active;
}
// esito che dipende da dove cadrà la palla: «Fuori» o «In rete» (un colpo a vuoto invece è già successo)
export const isPendingVerdict = q => !!q && q.color === 'red' && (q.label === 'Fuori' || q.label === 'In rete');
// esito da far vedere al colpo mentre il verdetto aspetta: neutro, senza «Fuori» né «Perfetto»
export const waitQuality = q => ({ color: 'wait', label: 'Colpita', wait: true, ...(q?.label ? { verdict: q.label } : {}) });
// motivo del punto del motore («Out», «Net») → esito vero del colpo: quello previsto, con fuori e rete dal motore
export function settledQuality(V, why){
  const q = V?.q; if (!q) return null;
  if (why === 'Net' && q.label !== 'In rete') return shotQuality(V.grade, { net: true, ...(V.drop || {}) });
  if (why === 'Out' && q.label !== 'Fuori') return shotQuality(V.grade, { inCourt: false });
  return q;
}

// Lampo sulla racchetta: macchia di luce rotonda e sfumata. Diagnostica del 30/10 (C17, «rettangolo chiaro accanto alla
// racchetta a ogni colpo»): lo sprite del lampo non aveva una texture e three.js lo disegna come un quadrato pieno, che
// cresceva e svaniva in 0,28 s (con la fusione additiva sul campo blu: un riquadro azzurro). La scia della racchetta
// (swing_vfx.js) e l'arco del motore base non c'entravano: spenti, il quadrato restava. Texture creata con i dati (niente
// canvas: vale anche nei test senza DOM), una sola per tutti i lampi.
export const FLASH_TEX_SIZE = 64;
let flashTexture = null;
export function flashGlowTexture(){
  if (flashTexture) return flashTexture;
  const N = FLASH_TEX_SIZE, data = new Uint8Array(N*N*4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
    const r = Math.hypot(x + .5 - N/2, y + .5 - N/2)/(N/2), a = r >= 1 ? 0 : Math.pow(1 - r, 1.6), i = (y*N + x)*4;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.round(255*a);
  }
  flashTexture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  flashTexture.needsUpdate = true;
  return flashTexture;
}

// rettangolo {l, r, t, b} contro quadrilatero convesso [[x, y], …] (campo proiettato): angoli dentro o lati che si incrociano
export function rectHitsPoly(R, poly){
  const inPoly = ([x, y]) => { let s = 0; for (let i = 0; i < poly.length; i++){ const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1)%poly.length], c = (x2 - x1)*(y - y1) - (y2 - y1)*(x - x1); if (c){ if (s && Math.sign(c) !== s) return false; s = Math.sign(c); } } return true; };
  const pts = [[R.l, R.t], [R.r, R.t], [R.r, R.b], [R.l, R.b]];
  if (pts.some(inPoly) || poly.some(([x, y]) => x > R.l && x < R.r && y > R.t && y < R.b)) return true;
  const o = (p, q, r) => Math.sign((q[0] - p[0])*(r[1] - p[1]) - (q[1] - p[1])*(r[0] - p[0]));
  const cross = (a, b, c, d) => o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
  for (let i = 0; i < 4; i++) for (let j = 0; j < poly.length; j++) if (cross(pts[i], pts[(i + 1)%4], poly[j], poly[(j + 1)%poly.length])) return true;
  return false;
}

// Esito di un colpo dal giro dell'aptica (funzione pura, senza anello né lampo): lo stesso calcolo della scritta del
// computer (showTimingPopup) per il giocatore del colpo (role: 'p1' tira verso z < 0, 'p2' verso z > 0). Colpo a vuoto:
// troppo presto, troppo tardi o troppo lontana (prima «Mancata» in ritardo). Lo usano onLocalFeedback (chi gioca qui) e,
// revisione B18, il telefono del Player 2 nello stesso schermo (prima riceveva null: niente «Fuori», niente «In rete»)
export function eventQuality(engine, { kind, grade = '', role = 'p1' } = {}){
  if (kind === 'whiff') return shotQuality(/WHIFF/i.test(grade || '') ? grade : 'WHIFF');
  if (kind !== 'hit') return null;
  const towardNegativeZ = (role || 'p1') !== 'p2', serve = /SERVE/i.test(grade || '');
  const drop = serve ? null : dropOutcome(engine?.natpfLastRacket, { now: engine?.elapsedTime, who: towardNegativeZ ? 'player' : 'p2' });
  return shotQuality(grade, { inCourt: landsIn(landingOf(engine?.ball), { towardNegativeZ, serve }), net: !!engine?.ball?.natpfNetFault, ...(drop || {}) });
}
// Esito per il telefono del Player 2 nello stesso schermo (natpfPhone2): q è quello di chi gioca qui (natpf_ui.feedback,
// null per i colpi del P2); per i colpi del P2 con lo stesso schermo attivo si calcola con eventQuality
export function splitPhoneQuality(engine, e = {}, q = null){
  // (B28: negli scambi di prova i colpi non si giudicano; nel palleggio assistito ogni colpo è rimandato in campo)
  if (q || (e.role || 'p1') !== 'p2' || !engine?.natpfSplit?.active || engine.playerRole === 'p2' || engine.natpfUi?.trial?.active) return q;
  return eventQuality(engine, e);
}
// Giro dell'aptica verso i telefoni (game_engine._initNatpfPhone): l'esito di chi gioca qui (natpf_ui.feedback: anello,
// allenamento, minigiochi) va al suo telefono; il telefono del Player 2 nello stesso schermo riceve il suo esito
// B37: se il verdetto del colpo aspetta la palla (fuori o in rete), al telefono va l'esito neutro (wait); il verdetto
// arriva quando la palla tocca terra o la rete (NatpfShotFeedback.settle)
export function relayPhoneFeedback(engine, e = {}){
  const q = engine?.natpfUi?.feedback ? engine.natpfUi.feedback(e) : null, S = engine?.natpfUi?.shot;
  const shown = v => (S?.phoneQuality ? S.phoneQuality(e, v) : v);
  engine?.natpfPhone?.feedback?.({ ...e, quality: shown(q) });
  engine?.natpfPhone2?.feedback?.({ ...e, quality: shown(splitPhoneQuality(engine, e, q)) });
  return q;
}

export class NatpfShotFeedback {
  constructor(engine){
    this.engine = engine;
    this.markers = [];
    this.flashes = [];
    const ring = new THREE.RingGeometry(.55, .82, 48); ring.rotateX(-Math.PI/2);
    const disc = new THREE.CircleGeometry(.55, 40); disc.rotateX(-Math.PI/2);
    for (let i = 0; i < 4; i++){
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const fill = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const g = new THREE.Group(); g.add(new THREE.Mesh(ring, mat), new THREE.Mesh(disc, fill)); g.visible = false; g.renderOrder = 4;
      engine.scene.add(g); this.markers.push({ g, mat, fill, age: 0, active: false, bounced: 0, life: 0 });
    }
    const flashMat = () => new THREE.SpriteMaterial({ map: flashGlowTexture(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 3; i++){ const s = new THREE.Sprite(flashMat()); s.visible = false; s.renderOrder = 9; engine.scene.add(s); this.flashes.push({ s, age: 0, active: false }); }
    this.last = null;
    // B37: verdetto rimandato del colpo appena fatto { stroke, hitter, p2, q, grade, drop, at, show(q), local, phone }
    this.verdict = null;
    // rimbalzo: l'anello del colpo appena fatto pulsa nel suo colore
    const bounce = engine._spawnBounceRing?.bind(engine);
    if (bounce) engine._spawnBounceRing = (x, z) => { bounce(x, z); this.onBounce(x, z); };
    // messaggio breve al posto di «PERFECT • FOREHAND TOPSPIN!»
    const popup = engine.hud?.showTimingPopup?.bind(engine.hud);
    // (il motore mostra il messaggio subito dopo aver lanciato la palla: il punto di arrivo è già noto)
    if (popup) engine.hud.showTimingPopup = (o = {}) => {
      const g = String(o.grade || ''), p2 = /^P2\b/.test(g);
      // revisione finale B31: le scritte della CPU («CPU DROP SHOT» → «Palla corta della CPU») non sono un colpo di chi
      // gioca. Prima passavano dall'esito: la palla della CPU cade nella metà di chi gioca, landsIn la dava «Fuori» e chi
      // gioca leggeva in rosso «Fuori · Palla corta» nel proprio angolo, come un suo errore. Ora: la scritta tradotta, in
      // bianco, nell'angolo dell'avversario, senza esito dentro/fuori
      if (isCpuGrade(g)){
        popup({ ...o, screenPos: null, detail: '' });
        const el = document.getElementById('timing-popup-grade');
        if (el){ el.classList.remove('grade-early', 'grade-late', 'grade-perfect', 'q-green', 'q-yellow', 'q-red', 'q-super'); el.classList.add('q-cpu'); }
        this._place(document.getElementById('timing-popup'), cpuPopupPlace(engine.playerRole));
        return;
      }
      // colpo super potente: «Super!» in oro (prima l'esito breve copriva la scritta «SUPER SHOT» del motore)
      const sup = /SUPER SHOT/i.test(g);
      const serve = /SERVE/i.test(g), drop = serve ? null : dropOutcome(engine.natpfLastRacket, { now: engine.elapsedTime, who: p2 ? 'p2' : 'player' });
      const q = sup ? { color: 'super', label: 'Super!' } : shotQuality(g, { inCourt: landsIn(landingOf(engine.ball), { towardNegativeZ: !p2, serve }), net: !!engine.ball?.natpfNetFault, ...(drop || {}) });
      // B37: un colpo nuovo chiude il verdetto del colpo di prima (la palla è stata ripresa)
      this.verdict = null;
      const kmh = String(o.detail || '').match(/\d+\s*KM\/H/i)?.[0] || '';
      // nell'angolo del proprio lato, mai sul campo (popupPlace); anche in prima persona (prima al centro dello sguardo)
      const place = popupPlace({ p2, role: engine.playerRole, split: !!engine.natpfSplit?.active, partner: !!o.partner });
      const who = place.kind === 'partner' ? 'compagno' : place.kind === 'other' ? 'avversario' : null;
      // (il motivo della palla corta che viene dal tempo è già nella scritta grande: non si ripete)
      const name = shotName(g), why0 = shotWhy(engine.natpfLastRacket, { now: engine.elapsedTime, who: p2 ? 'p2' : 'player' });
      const why = why0 && q.why && (why0 === q.why || engine.natpfLastRacket?.out?.dropWhy === 'tempo') ? null : why0;
      const miss = q.color === 'red' && /WHIFF/.test(g.toUpperCase());
      const dropTempo = engine.natpfLastRacket?.out?.dropWhy === 'tempo';
      const show = (Q = q) => {
        // (verdetto arrivato dopo: la scritta dice l'esito vero, con lo stesso nome del colpo, il motivo e i km/h)
        const why1 = Q === q ? why : why0 && Q.why && (why0 === Q.why || dropTempo) ? null : why0;
        popup({ ...o, screenPos: null, durationMs: Math.min(o.durationMs ?? POPUP_MS.hit, miss ? POPUP_MS.miss : POPUP_MS.hit), grade: qualityText(Q), detail: [who, name, why1, kmh.toLowerCase()].filter(Boolean).join(' · ') });
        const el = document.getElementById('timing-popup-grade');
        if (el){ el.classList.remove('grade-early', 'grade-late', 'grade-perfect', 'q-green', 'q-yellow', 'q-red', 'q-super'); el.classList.add('q-' + Q.color); }
        this._place(document.getElementById('timing-popup'), place);
      };
      // B37: in partita «Fuori» e «In rete» aspettano che la palla tocchi terra o la rete (settle); adesso niente scritta
      if (!miss && isPendingVerdict(q) && defersVerdict(engine)){
        const b = engine.ball;
        this.verdict = { stroke: b?.rallyStrokeCount, hitter: b?.lastHitter, p2, q, grade: g, drop, at: engine.elapsedTime, show, local: null, phone: null, settled: false };
        return;
      }
      show();
    };
  }
  // Posto della scritta: si provano alcuni posti e si tiene il primo che non copre il campo, i giocatori, la palla e gli
  // altri elementi dell'interfaccia in basso (barre, scheda dell'Allenamento, etichette delle metà):
  // - schermo intero: l'angolo del proprio lato sopra le barre, poi l'altro angolo (chi gioca molto largo e in fondo);
  // - stesso schermo (revisione B10: la camera di ogni metà è più larga e il campo arriva quasi al bordo in basso, così la
  //   scritta sopra le barre toccava il corridoio e copriva chi giocava largo): nella stessa metà, in basso sotto le barre
  //   accanto all'etichetta del giocatore, poi sopra le barre, poi accanto alle barre (mai nella metà dell'altro).
  // Se nessuno è libero: il primo che non copre interfaccia, giocatori e palla, altrimenti il primo.
  _place(el, place){
    if (!el?.classList) return;
    el.classList.add('anchored'); el.classList.toggle('other', place.kind === 'other');
    el.style.left = el.style.top = el.style.right = '';
    const split = !!this.engine.natpfSplit?.active, other = place.side === 'left' ? 'right' : 'left';
    const tries = split ? [['low', place.side], ['above', place.side], ['beside', place.side]] : [['above', place.side], ['above', other]];
    let pick = null, safe = null, cur = null;
    for (const t of tries){
      this._set(el, ...(cur = t));
      const b = this._blocked(el, split ? t[1] : null);
      if (!b.ui && !b.actors && !b.court){ pick = t; break; }
      if (!safe && !b.ui && !b.actors) safe = t;
    }
    const best = pick || safe || tries[0];
    if (best !== cur) this._set(el, ...best);
  }
  // riquadro della scritta senza l'animazione d'entrata (translateY): quello della pagina nei primi 0,16 s è spostato in
  // basso e la farebbe sembrare sopra le barre
  _box(el){
    const layer = el.offsetParent?.getBoundingClientRect?.();
    if (layer && el.offsetWidth){ const left = layer.left + el.offsetLeft, top = layer.top + el.offsetTop; return { left, top, right: left + el.offsetWidth, bottom: top + el.offsetHeight, width: el.offsetWidth, height: el.offsetHeight }; }
    return el.getBoundingClientRect?.();
  }
  // riquadri degli elementi dell'interfaccia in vista (pixel della pagina)
  _uiBoxes(sel){
    const out = [];
    for (const g of document.querySelectorAll?.(sel) || []){ const r = g.getBoundingClientRect?.(); if (r?.height && r.width) out.push(r); }
    return out;
  }
  // above: sopra le barre di Potenza ed Energia e, nell'Allenamento, sopra la scheda dell'esercizio quando sta dal lato
  // della scritta (revisione B10: la scheda .coach-main, sopra il gioco, la copriva del tutto e chi si allenava non vedeva
  // l'esito); low: nell'angolo in basso (stesso schermo: le barre sono alzate sopra le etichette dei giocatori, sotto resta
  // posto); beside: accanto alle barre del proprio lato, alla loro altezza
  _set(el, mode, side){
    el.classList.toggle('side-right', side === 'right');
    el.style.bottom = el.style.left = el.style.right = '';
    if (mode === 'low') return;
    const layer = el.parentElement?.getBoundingClientRect?.(), me = this._box(el);
    if (!layer) return;
    const meters = this._uiBoxes('.natpf-meters:not(.hidden) .meter-group:not(.hidden)');
    if (mode === 'beside'){
      const mid = layer.left + layer.width/2, g = meters.find(r => side === 'right' ? r.left >= mid : r.right <= mid);
      if (!g) return;
      if (side === 'right') el.style.right = `${(layer.right - g.left + 10).toFixed(1)}px`;
      else el.style.left = `${(g.right - layer.left + 10).toFixed(1)}px`;
      el.style.bottom = `${Math.max(0, layer.bottom - g.bottom).toFixed(1)}px`;
      return;
    }
    const tops = meters.map(r => r.top);
    for (const r of this._uiBoxes('.natpf-coach:not(.hidden) .coach-main')) if (!me?.width || (r.left < me.right && r.right > me.left)) tops.push(r.top);
    if (tops.length) el.style.bottom = `${Math.max(0, layer.bottom - Math.min(...tops) + 6).toFixed(1)}px`;
  }
  // Che cosa copre la scritta: ui (barre, scheda, etichette delle metà), actors (giocatori o palla), court (campo del
  // doppio, con i corridoi). Proiezione con la camera della vista in cui sta la scritta: stesso schermo disegnato diviso,
  // la metà del suo lato (camera del P1 a sinistra, del P2 a destra); altrimenti la camera del motore a schermo intero
  _blocked(el, half = null){
    const E = this.engine, r = this._box(el), layer = el.parentElement?.getBoundingClientRect?.();
    const out = { ui: false, actors: false, court: false };
    if (!r?.width || !layer) return out;
    const hit = (a, m) => a.left < r.right + m && a.right > r.left - m && a.top < r.bottom + m && a.bottom > r.top - m;
    out.ui = this._uiBoxes('.natpf-meters:not(.hidden) .meter-group:not(.hidden), .natpf-coach:not(.hidden) .coach-main, .natpf-split-hud:not(.hidden) .split-tag').some(a => hit(a, 4));
    const view = half && E.natpfSplit?.shown ? this._halfView(half, layer) : null;
    const project = view || (E._projectToScreen && E.camera ? p => E._projectToScreen(p) : null);
    if (!project) return out;
    // margine di 6 px per giocatori e palla; il campo senza margine (la scritta può stare a filo delle righe)
    const R0 = { l: r.left - layer.left, r: r.right - layer.left, t: r.top - layer.top, b: r.bottom - layer.top };
    const R = { l: R0.l - 6, r: R0.r + 6, t: R0.t - 6, b: R0.b + 6 };
    const V = THREE.Vector3;
    const hits = pts => { const q = pts.map(project).filter(p => p.visible); if (!q.length) return false; const xs = q.map(p => p.x), ys = q.map(p => p.y); return Math.min(...xs) < R.r && Math.max(...xs) > R.l && Math.min(...ys) < R.b && Math.max(...ys) > R.t; };
    for (const a of [E.player, E.opponent, ...(E.isDoubles ? [E.playerPartner, E.opponentPartner] : [])]){
      if (!a?.pos) continue;
      const { x, z } = a.pos;
      if (hits([new V(x - .55, 0, z), new V(x + .55, 0, z), new V(x - .55, 2.1, z), new V(x + .55, 2.1, z)])){ out.actors = true; break; }
    }
    const b = E.ball?.pos;
    if (!out.actors && b) out.actors = hits([new V(b.x - .3, b.y - .3, b.z), new V(b.x + .3, b.y + .3, b.z)]);
    // campo: quadrilatero proiettato, solo se i quattro angoli stanno davanti alla camera (in prima persona no)
    const W = 5.485, L = COURT.halfL, poly = [[-W, L], [W, L], [W, -L], [-W, -L]].map(([x, z]) => project(new V(x, 0, z)));
    if (poly.every(p => p.visible)) out.court = rectHitsPoly(R0, poly.map(p => [p.x, p.y]));
    return out;
  }
  // proiezione nella metà dello stesso schermo (pixel dell'area del gioco, come _projectToScreen)
  _halfView(half, layer){
    const E = this.engine, cam = half === 'right' ? E.natpfSplit?.cam2 : E.camera;
    if (!cam?.matrixWorldInverse) return null;
    const vp = splitViewports(layer.width, layer.height)[half === 'right' ? 'p2' : 'p1'];
    cam.updateMatrixWorld();
    return p => { const t = p.clone().project(cam); return { x: vp.x + (t.x*.5 + .5)*vp.w, y: (-t.y*.5 + .5)*vp.h, visible: t.z >= -1 && t.z <= 1 }; };
  }
  get localActor(){ return this.engine.playerRole === 'p2' ? this.engine.opponent : this.engine.player; }
  // dal giro dell'aptica: kind «hit»/«whiff» del giocatore locale; restituisce l'esito (anche per il telefono)
  onLocalFeedback({ kind, grade } = {}){
    const e = this.engine;
    const q = eventQuality(e, { kind, grade, role: e.playerRole });
    if (kind === 'whiff'){ this.pending = q; return q; }
    if (kind !== 'hit') return null;
    const target = landingOf(e.ball), net = !!e.ball?.natpfNetFault;
    this.pending = q; this.last = q;
    // B37: verdetto che aspetta la palla (stesso colpo della scritta): niente anello adesso, lampo neutro
    const V = this.verdict;
    if (V && !V.settled && V.stroke === e.ball?.rallyStrokeCount && isPendingVerdict(q)){
      V.local = { net };
      this._flash('wait');
      return q;
    }
    // in rete: niente anello nel campo (il bersaglio del motore resta in campo)
    if (!net) this._marker(target, q.color);
    this._flash(q.color);
    return q;
  }
  // B37: esito da far vedere adesso (etichetta del gesto, telefono): neutro se il verdetto aspetta la palla
  shown(q){
    const V = this.verdict, b = this.engine.ball;
    return q && V && !V.settled && V.stroke === b?.rallyStrokeCount && isPendingVerdict(q) ? waitQuality(q) : q;
  }
  // B37: esito per il telefono dal giro dell'aptica: se il verdetto del colpo aspetta, si ricorda il colpo (ruolo, voto,
  // tipo) per mandargli il verdetto dopo, e al colpo va l'esito neutro
  phoneQuality(e = {}, q = null){
    const V = this.verdict, b = this.engine.ball;
    if (!q || e.kind !== 'hit' || !V || V.settled || V.stroke !== b?.rallyStrokeCount || !isPendingVerdict(q)) return q;
    V.phone = { role: e.role, kind: e.kind, grade: e.grade, shotType: e.shotType };
    return waitQuality(q);
  }
  // B37: la palla ha toccato terra fuori o la rete (game_engine._awardPoint, prima del punto): adesso il verdetto.
  // why: motivo del motore. Vale solo per la palla del colpo in attesa (non ripresa da nessuno); sul computer del P2
  // della sfida tra due computer anche con la scritta del punto che arriva dall'host (stesso colpo, motivo dall'host)
  settle(winner, why = '', { remote = false } = {}){
    const V = this.verdict, E = this.engine, b = E.ball;
    if (!V || V.settled) return false;
    const guest = E.playerRole === 'p2' && E.isMultiplayer;
    if (!/^(Out|Net)$/.test(why) || E.elapsedTime - V.at > VERDICT.maxWait || (!guest && !remote && (V.stroke !== b?.rallyStrokeCount || b?.lastHitter !== V.hitter))){
      if (!remote) this.verdict = null;
      return false;
    }
    V.settled = true; this.verdict = null;
    const q = settledQuality(V, why);
    V.show(q);
    if (V.local){
      if (why === 'Out' && b?.pos) this._marker({ x: b.pos.x, z: b.pos.z }, 'red', { bounced: true });
      E.natpfUi?.gesture?.lateOutcome?.(q);
    }
    if (V.phone){ const ev = { ...V.phone, quality: q, late: true }; E.natpfPhone?.feedback?.(ev); E.natpfPhone2?.feedback?.(ev); }
    return true;
  }
  // B37: primo rimbalzo dentro del colpo in attesa (la previsione diceva fuori: capita vicino alle righe e col servizio,
  // che per il motore è in campo fino in fondo): l'esito in campo, adesso, dove è caduta
  _settleIn(x, z){
    const V = this.verdict, E = this.engine, b = E.ball;
    if (!V || V.settled || V.stroke !== b?.rallyStrokeCount || b?.lastHitter !== V.hitter || (b.bounceCountOnCurrentSide || 0) > 0) return false;
    if (!landsIn({ x, z, predicted: true }, { towardNegativeZ: !V.p2 }) || V.q.label === 'In rete') return false;
    V.settled = true; this.verdict = null;
    const q = shotQuality(V.grade, { inCourt: true, ...(V.drop || {}) });
    V.show(q);
    if (V.local){ this._marker({ x, z }, q.color, { bounced: true }); E.natpfUi?.gesture?.lateOutcome?.(q); }
    if (V.phone){ const ev = { ...V.phone, quality: q, late: true }; E.natpfPhone?.feedback?.(ev); E.natpfPhone2?.feedback?.(ev); }
    return true;
  }
  _marker(target, color, { bounced = false } = {}){
    if (!target) return;
    const m = this.markers.find(k => !k.active) || this.markers[0];
    m.active = true; m.age = 0; m.bounced = 0; m.life = bounced ? 1.6 : 3.2;
    if (bounced){ m.bounced = 1; m.age = m.life - .9; }
    m.mat.color.setHex(QUALITY_COLORS[color]); m.fill.color.setHex(QUALITY_COLORS[color]);
    m.g.position.set(target.x, .03, target.z); m.g.scale.setScalar(1); m.g.visible = true;
  }
  _flash(color){
    const a = this.localActor, rk = this.engine.racketKinematics;
    let p = null;
    try { p = rk?.getRacketRimWorldPoints?.(a)?.centerWorld; } catch {}
    if (!p) return;
    const f = this.flashes.find(k => !k.active) || this.flashes[0];
    f.active = true; f.age = 0; f.s.material.color.setHex(QUALITY_COLORS[color] ?? 0xffffff); f.s.position.copy(p); f.s.visible = true;   // (B37: 'wait' neutro, bianco)
  }
  onBounce(x, z){
    this._settleIn(x, z);
    for (const m of this.markers) if (m.active && !m.bounced && Math.hypot(m.g.position.x - x, m.g.position.z - z) < 2.2){ m.bounced = 1; m.age = Math.min(m.age, m.life - .9); }
  }
  update(dt){
    // B37: verdetto mai arrivato (palla ripresa dall'avversario, punto interrotto, menu, moviola): si lascia perdere. Sul
    // computer del P2 della sfida tra due computer il numero del colpo arriva anche dall'host: lì contano fase e tempo
    const V = this.verdict, E = this.engine;
    if (V && (V.settled || E.elapsedTime - V.at > VERDICT.maxWait || !['RALLY', 'POINT_OVER', 'MATCH_OVER'].includes(E.phase)
      || (!(E.playerRole === 'p2' && E.isMultiplayer) && E.ball?.rallyStrokeCount !== V.stroke))) this.verdict = null;
    for (const m of this.markers){
      if (!m.active) continue;
      m.age += dt;
      const fadeIn = Math.min(1, m.age/.15), fadeOut = Math.max(0, Math.min(1, (m.life - m.age)/.6));
      const pulse = m.bounced ? 1 + .45*Math.sin(Math.min(1, (m.age - (m.life - .9))/.9)*Math.PI) : 1 + .06*Math.sin(m.age*9);
      m.g.scale.setScalar(pulse);
      m.mat.opacity = .95*fadeIn*fadeOut; m.fill.opacity = .22*fadeIn*fadeOut;
      if (m.age >= m.life){ m.active = false; m.g.visible = false; }
    }
    for (const f of this.flashes){
      if (!f.active) continue;
      f.age += dt; const k = f.age/.28;
      f.s.scale.setScalar(.25 + k*.9); f.s.material.opacity = Math.max(0, .9*(1 - k));
      if (k >= 1){ f.active = false; f.s.visible = false; }
    }
  }
}
