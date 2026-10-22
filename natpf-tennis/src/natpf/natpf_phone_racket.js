// Smartphone come racchetta: il controller di NATPF Simulator collegato al motore di motore base.
// Il telefono apre la pagina NATPF (site/tennis/racchetta.html, servita sotto /natpf/) e si collega al computer
// in WebRTC (PeerJS) con il QR monouso di NATPF; calibrazione e riconoscimento dei gesti restano quelli di NATPF.
// Qui si traducono soltanto gli eventi NATPF negli eventi del motore base (gli stessi di mouse, webcam e tastiera):
//   sw  → swing { side, shotType, speed, dirX, dirY }      toss → lancio di palla al servizio
//   orientamento del telefono → inclinazione della racchetta virtuale (phoneState del motore base)
// Impugnatura NATPF: telefono in verticale nel palmo, schermo verso il palmo. Con questa presa l'asse lungo del
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
import { readHand, normalizeHand } from './natpf_hand.js';
import { strokeIntent } from './natpf_stroke_intent.js';

const NATPF_BASE = '/natpf/';
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
const finiteOr = (v, d = 0) => (Number.isFinite(v) ? v : d);
// ritardo dello schermo (ms) salvato su questo computer: 0 finché non lo si misura (pannello della diagnostica)
export const DISPLAY_LAG_KEY = 'natpf.displayLagMs';
export function readDisplayLagMs(){ try { const v = +localStorage.getItem(DISPLAY_LAG_KEY); return Number.isFinite(v) ? Math.max(0, Math.min(200, Math.round(v))) : 0; } catch { return 0; } }
export function writeDisplayLagMs(ms){ const v = Math.max(0, Math.min(200, Math.round(+ms || 0))); try { localStorage.setItem(DISPLAY_LAG_KEY, String(v)); } catch {} return v; }
function readSpecials(){ try { return JSON.parse(localStorage.getItem(SPECIALS_KEY) || '{}') || {}; } catch { return {}; } }
function writeSpecials(v){ try { localStorage.setItem(SPECIALS_KEY, JSON.stringify(v)); } catch {} }
// displayLag (s): ritardo dello schermo misurato (impostazione della diagnostica, 0 se non misurato). Chi gioca colpisce
// la palla che vede: con uno schermo in ritardo ogni colpo risulterebbe in ritardo di altrettanto
export function natpfSwingToEngine(s, { hand = 'right', grip = null, liftBaseline = 0, headBaseline = 0, faceCenter = null, aimModel = null, personal = null, now = null, prep = null, prepCapable = false, ballHigh = false, displayLag = 0, ref = null } = {}){
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
  const intent = chosen ? null : strokeIntent(s, { ref, ballHigh, headingDev: heading?.dev ?? null });
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
      ...(intent ? { intent, peak: Number.isFinite(s.peak) ? s.peak : null } : {}) } };
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

// Fase di gioco mandata al telefono: decide se e come il telefono riconosce i gesti (vedi racchetta.js).
function readGrip(){ try { return globalThis.localStorage?.getItem(GRIP_STORAGE_KEY); } catch { return null; } }
function writeGrip(g){ try { globalThis.localStorage?.setItem(GRIP_STORAGE_KEY, g); } catch {} }

export function phoneGamePhase(engine){
  const local = engine.playerRole === 'p2' ? 'opponent' : 'player';
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
export function ballIsHigh(engine){
  const b = engine.ball; if (!b || !b.inPlay) return false;
  const me = engine.playerRole === 'p2' ? engine.opponent : engine.player;
  if (me?.pos && Number.isFinite(b.pos?.z) && Math.abs(b.pos.z - me.pos.z) > 6) return false;
  return b.pos.y > 1.7 || (b.pos.y > 1.2 && b.targetLanding && Math.abs(b.vel.y) < 2 && b.pos.y > 1.5);
}
export function ballMovingAway(engine){
  const b = engine.ball, mine = engine.playerRole === 'p2' ? 'opponent' : 'player';
  return engine.phase === 'RALLY' && !!b?.inPlay && b.lastHitter === mine;
}
// Lato del colpo dal verso del gesto (+1 da destra a sinistra = dritto del destro)
export const strokeSide = (dir, hand = 'right') => { const fh = hand === 'left' ? -1 : 1; return dir === fh ? 'forehand' : dir === -fh ? 'backhand' : null; };
// Verso del colpo atteso per il giocatore locale: la palla arriva verso di lui e cade alla sua destra o sinistra.
// 0 quando la palla non arriva o è al centro (lì non si trattiene nessun gesto).
// palla «diretta»: entro 0,6 m dal corpo si gioca sia di dritto sia di rovescio, il telefono non deve aspettarsi un
// verso (prima bastavano 0,25 m: il rovescio su una palla appena a destra veniva trattenuto come preparazione)
export const BODY_ZONE = .6;
function ballRel(engine){
  const b = engine.ball, p2 = engine.playerRole === 'p2', me = p2 ? engine.opponent : engine.player;
  if (!b || !me) return null;
  const x = Number.isFinite(b.targetLanding?.x) ? b.targetLanding.x : b.pos.x;
  return (x - me.pos.x)*(p2 ? -1 : 1);                                         // + alla sua destra
}
// lato del colpo dalla posizione della palla, per i gesti senza verso orizzontale (verticali): prima lo decideva la
// mira nel motore, e un colpo mirato verso sinistra diventava sempre un dritto
export function sideFromBall(engine, hand = 'right'){
  const rel = ballRel(engine);
  if (rel == null) return null;
  return (rel >= 0) !== (hand === 'left') ? 'forehand' : 'backhand';
}
export function expectedStrokeDir(engine, hand = 'right'){
  const b = engine.ball, p2 = engine.playerRole === 'p2', me = p2 ? engine.opponent : engine.player;
  if (!b || !me || !b.inPlay || engine.phase !== 'RALLY' || b.lastHitter === (p2 ? 'opponent' : 'player')) return 0;
  const toward = p2 ? b.vel.z < -.5 : b.vel.z > .5;
  if (!toward) return 0;
  const rel = ballRel(engine);
  if (Math.abs(rel) < BODY_ZONE) return 0;
  const fh = hand === 'left' ? -1 : 1;                                        // verso del dritto
  return (rel > 0) !== (hand === 'left') ? fh : -fh;
}

export class NatpfPhoneRacket {
  constructor(engine){
    this.engine = engine;
    this.link = null;
    // mano di chi gioca: una sola, quella del gioco (NatpfHand, salvata sul computer). Va al telefono con la configurazione
    // e la calibrazione non la cambia più (nella sessione del 22/10 il telefono era «mancino» e il gioco «destro»)
    this.hand = readHand();
    this.grip = normalizeGrip(readGrip());
    this.gripSent = false;
    this.listeners = new Set();
    this.swingListeners = new Set();
    this.rawListeners = new Set();
    this.dropListeners = new Set();       // colpi arrivati con il telefono non ancora pronto (solo diagnostica)
    this.displayLagMs = readDisplayLagMs(); // ritardo dello schermo misurato (0 finché non lo si misura)
    this.liftBaseline = 0;               // verso verticale abituale (calibrazione, per verso del colpo): lob e tagliato si leggono rispetto a questo
    this.liftModel = createLiftModel();  // … poi si adatta ai colpi veri della partita
    this.faceModel = createFaceModel();  // piatto abituale per verso del colpo (mira = scarto da questo)
    this.aimModel = createAimModel();    // direzione abituale del piatto all'impatto (mira dei telefoni aggiornati)
    this.headModel = createLiftModel(0); // verso verticale abituale del piatto che colpisce, per verso del colpo
    // pallonetto e palla corta di chi gioca, imparati negli esercizi del riscaldamento (si azzerano con una nuova calibrazione)
    this.specialSamples = readSpecials(); this.personal = learnSpecials(this.specialSamples);
    this.calListeners = new Set();
    this.lastPhase = null;
    this.cal = { step: null, review: null, freeOk: false, grip: null, attempts: [], idle: false };
    // passo della calibrazione come lo vede il computer (natpf_cal_view.js): si aggiorna con ogni evento del telefono,
    // anche prima di entrare in campo, così il riscaldamento parte sempre dal passo vero
    this.calView = CAL_VIEW_EMPTY;
  }
  get connected(){ return !!this.link?.connected; }
  get ready(){ return !!this.link?.ready; }
  get state(){ return this.link?.L || { state: 'off', phone: null }; }
  // presa scelta nel gioco (lobby, pannello del telefono): va al telefono, che rifà la calibrazione se serve
  // mano scelta nel gioco (NatpfHand.set): va subito al telefono, che la mostra e la usa nella calibrazione
  setHand(h){
    const next = normalizeHand(h);
    if (next === this.hand) return;
    this.hand = next; this.gripSent = false; this._sendGrip(); this._changed();
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
    if (joins !== this.joins){ this.joins = joins; this.gripSent = false; this.lastPhase = null; this.lastExpect = null; }
    // diag: se la diagnostica sta registrando, anche dopo una riconnessione il telefono rimanda i campioni grezzi
    if (this.connected && !this.gripSent){ this.link.send({ t: 'grip', g: this.grip }); this.link.send({ t: 'cfg', prep: 1, mo: 1, hand: this.hand, ...(this.diagStream ? { diag: 1 } : {}) }); this.gripSent = true; this.lastExpect = null; }
    if (!this.connected) this.gripSent = false;
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
    link.on('change', () => { this._sendGrip(); this._syncPhoneState(); this._changed(); });
    link.on('cal', e => this._onCal(e));
    link.on('swing', s => this._onSwing(s));
    link.on('toss', () => this._onToss());
    link.on('prep', p => this._onPrep(p));
    link.on('hand', e => this._onPhoneHand(e.hand));
    link.on('raw', k => { for (const fn of this.rawListeners) try { fn(k); } catch (e){ console.error(e); } });
    link.on('dropped', d => { for (const fn of this.dropListeners) try { fn(d.reason, { seq: d.seq, path: d.path }); } catch (e){ console.error(e); } });
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
    if (e.kind === 'free' && e.ok) c.freeOk = true;
    if (e.kind === 'done'){ c.step = 'done'; this.profile = e.profile || null; this.liftBaseline = liftBaselineFromProfile(this.profile) ?? this.liftBaseline; this.liftModel.reset(this.liftBaseline); this.faceModel.reset(); this.aimModel.reset(); this.resetSpecials(); if (e.profile && e.profile.hand !== this.hand){ this.gripSent = false; this._sendGrip(); } this.headModel.reset(headBaselineFromProfile(this.profile, this.hand) ?? 0); }
    c.last = e;
    for (const fn of this.calListeners) try { fn(e); } catch (err){ console.error(err); }
    this._changed();
  }
  onCal(fn){ this.calListeners.add(fn); return () => this.calListeners.delete(fn); }
  // gesto fatto a richiesta (esercizio «Pallonetto» o «Palla corta»): esempio per le soglie personali
  learnSpecial(kind, natpf){
    if (!natpf || !Number.isFinite(natpf.v) || !['lob', 'drop'].includes(kind)) return this.personal;
    const list = this.specialSamples[kind] = [...(this.specialSamples[kind] || []), kind === 'lob' ? natpf.v : { v: natpf.v, speed: natpf.speed }].slice(-6);
    this.personal = learnSpecials(this.specialSamples); writeSpecials(this.specialSamples);
    return this.personal;
  }
  resetSpecials(){ this.specialSamples = {}; this.personal = {}; writeSpecials({}); }
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
    if (ballMovingAway(this.engine)){
      this.ignoredSwings = (this.ignoredSwings || 0) + 1;
      for (const fn of this.swingListeners) try { fn({ ignored: 'palla che si allontana', natpf: {} }, s); } catch (e){ console.error(e); }
      return;
    }
    const ref = this.profile && !this.profile.simple && Number.isFinite(this.profile.ref) ? this.profile.ref : null;
    const ev = { ...natpfSwingToEngine(s, { hand: this.hand, grip: this.grip, liftBaseline: this.liftModel.value, headBaseline: this.headModel.value, personal: this.personal, faceCenter: this.faceModel.center(s.dir), aimModel: this.aimModel, now: performance.now()/1000, displayLag: this.displayLagMs/1000, prep: this.lastPrep, prepCapable: !!this.state.prep, ballHigh: ballIsHigh(this.engine), ref }), role: this.engine.playerRole };
    this.lastPrep = null;
    if (!ev.side) ev.side = sideFromBall(this.engine, this.hand);
    // riferimenti personali solo dai colpi normali: prima entravano anche pallonetti e palle corte, e dopo tre di fila il
    // quarto sembrava «normale» (usciva un dritto)
    if (NORMAL_SHOTS.has(ev.natpf.shot)){ this.liftModel.add(s.dir, s.lift); this.headModel.add(s.dir, ev.natpf.head); }
    this.faceModel.add(s.dir, s.face); this.aimModel.add(s.dir, s.heading);
    for (const fn of this.swingListeners) try { fn(ev, s); } catch (e){ console.error(e); }
    // _emitSwing instrada già P1 in locale e P2 verso l'host (relay della stanza 1v1)
    mc._emitSwing(ev);
  }
  // Preparazione del colpo (racchetta portata indietro, nel verso opposto al colpo): la racchetta in gioco si carica
  // da quella parte e il colpo che segue vale come «preparato» (natpfSwingToEngine → prep).
  _onPrep(p){
    if (!this.ready) return;
    this.lastPrep = { ...p };
    const side = strokeSide(-p.dir, this.hand), actor = this.engine.localActor || this.engine.player;
    if (actor && side) (actor.userData || (actor.userData = {})).natpfPrep = { side, until: performance.now() + 750, amount: clamp((p.angle || 30)/50, .45, 1) };
  }
  onRaw(fn){ this.rawListeners.add(fn); return () => this.rawListeners.delete(fn); }
  onDropped(fn){ this.dropListeners.add(fn); return () => this.dropListeners.delete(fn); }
  onSwing(fn){ this.swingListeners.add(fn); return () => this.swingListeners.delete(fn); }
  _onToss(){
    const mc = this.engine.motionController;
    if (mc && this.ready) mc._emitToss({ source: 'natpf-phone', shotType: 'lob', speed: 1.1, dirX: 0, dirY: -.9, role: this.engine.playerRole });
  }

  // comandi della calibrazione (vedi racchetta.js → command)
  recalibrate(){ this.simple = false; this.cal = { step: null, review: null, freeOk: false, grip: null, attempts: [], idle: false }; this.calView = CAL_VIEW_EMPTY; this.link?.cmd('cal'); this._changed(); }
  retry(){ this.cal.attempts = []; this.link?.cmd('retry'); }
  confirm(){ this.link?.cmd('confirm'); }
  invert(){ this.link?.cmd('invert'); }
  skipGrip(){ this.link?.cmd('skipGrip'); }
  forget(){ this.link?.forget(); this.recalibrate(); }
  // salta i gesti della calibrazione: il telefono usa un profilo semplice (il gioco sceglie dritto o rovescio da solo)
  skipCalibration(){ this.simple = true; this.link?.cmd('skip'); this._changed(); }

  // Esito dei colpi al telefono (vibrazione e scritta), dalle stesse chiamate che motore base usa per l'aptica.
  feedback({ role, kind, grade = '', shotType = '', quality = null } = {}){
    if (!this.ready || (role || 'p1') !== this.engine.playerRole) return;
    const shot = /SMASH/i.test(shotType) ? 'smash' : /LOB/i.test(shotType) ? 'lob' : /SLICE/i.test(shotType) ? 'slice' : 'drive';
    // vib: vibrazione per esito (lunga = perfetto, breve = buono, doppia = errore); i telefoni senza supporto la ignorano
    const vib = quality ? VIBRATION[quality.color] : undefined;
    if (kind === 'hit') this.link.send({ t: 'ev', k: 'contact', label: /PERFECT|POWER/i.test(grade) ? 'perfetto' : /EARLY/i.test(grade) ? 'anticipo' : /LATE/i.test(grade) ? 'ritardo' : 'buono', shot, vib, out: quality?.label === 'Fuori' });
    else if (kind === 'whiff') this.link.send({ t: 'ev', k: 'miss', why: /EARLY/i.test(grade) ? 'presto' : 'tardi', vib: VIBRATION.red });
    else if (kind === 'point_won' || kind === 'fault') this.link.send({ t: 'ev', k: 'point', mine: kind === 'point_won', txt: grade });
  }

  // Ogni fotogramma: fase al telefono e orientamento del telefono alla racchetta del motore base.
  update(){
    if (!this.link) return;
    const phase = this.connected ? phoneGamePhase(this.engine) : null;
    if (phase && phase !== this.lastPhase){ this.lastPhase = phase; this.link.send({ t: 'ph', ph: phase }); }
    // verso del colpo atteso: il telefono distingue così la preparazione (verso opposto) dal colpo
    const ex = phase === 'play' && this.ready ? expectedStrokeDir(this.engine, this.hand) : 0;
    if (this.connected && ex !== this.lastExpect){ this.lastExpect = ex; this.link.send({ t: 'ex', d: ex }); }
    if (!this.connected) this.lastPhase = null;
    this._syncPhoneState();
  }
  _syncPhoneState(){
    const mc = this.engine.motionController;
    if (!mc) return;
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
