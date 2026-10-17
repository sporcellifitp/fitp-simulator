// Smartphone come racchetta: il controller di NATPF Simulator collegato al motore di Argon Tennis.
// Il telefono apre la pagina NATPF (site/tennis/racchetta.html, servita sotto /natpf/) e si collega al computer
// in WebRTC (PeerJS) con il QR monouso di NATPF; calibrazione e riconoscimento dei gesti restano quelli di NATPF.
// Qui si traducono soltanto gli eventi NATPF negli eventi di Argon (gli stessi di mouse, webcam e tastiera):
//   sw  → swing { side, shotType, speed, dirX, dirY }      toss → lancio di palla al servizio
//   orientamento del telefono → inclinazione della racchetta virtuale (phoneState di Argon)
// Impugnatura NATPF: telefono in verticale nel palmo, schermo verso il palmo. Con questa presa l'asse lungo del
// telefono (Y) è il manico della racchetta, la normale allo schermo (Z) è la normale del piatto e X corre lungo la
// larghezza dell'ovale. La rotazione integrata dal giroscopio (racket-motion.js, nel riferimento del telefono e
// relativa alla presa di riposo) si scompone quindi così:
//   attorno a X → beccheggio della testa della racchetta (pitch)
//   attorno a Y → apertura/chiusura del piatto, pronazione/supinazione (roll)
//   attorno a Z → testa che oscilla a destra/sinistra nel piano del piatto (yaw)
import * as THREE from 'three';
import { createPhoneLink, testSearch } from '@natpf/tennis/link.js';
import { pairingUrl } from '@natpf/tennis/pairing.js';
import { gestureAim } from '@natpf/match/shot-quality.js';
import { lanOrigin } from './natpf_lan.js';

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

// Swing NATPF → swing Argon. dir NATPF: +1 da destra a sinistra (dritto per un destro), -1 da sinistra a destra.
// aim NATPF: -1 sinistra … +1 destra, nel riferimento del giocatore, come dirX di Argon (per P2 Argon specchia già).
export function natpfSwingToArgon(s, { hand = 'right' } = {}){
  const dirX = Math.max(-1, Math.min(1, gestureAim(s)));
  const forehandDir = hand === 'left' ? -1 : 1;
  const side = s.dir === forehandDir ? 'forehand' : s.dir === -forehandDir ? 'backhand' : null;
  const power = Number.isFinite(s.power) ? s.power : .6;
  const lift = Number.isFinite(s.lift) ? s.lift : 0;
  // forza del gesto (0,3…1) → velocità di Argon (0,8…1,65); un colpo deciso diventa un colpo potente
  const speed = .8 + Math.max(0, Math.min(1, (power - .3)/.7))*.85;
  const shotType = s.lob ? 'lob' : s.slice ? 'slice' : s.drop ? 'slice' : 'topspin';
  return { source: 'natpf-phone', side, shotType, speed: s.drop ? Math.min(speed, .9) : speed, dirX, dirY: s.lob ? -.85 : s.slice || s.drop ? .3 : -.45 + lift*.2, timing: null };
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

export class NatpfPhoneRacket {
  constructor(engine){
    this.engine = engine;
    this.link = null;
    this.hand = 'right';
    this.listeners = new Set();
    this.lastPhase = null;
    this.cal = { step: null, review: null, freeOk: false, grip: null, attempts: [], idle: false };
  }
  get connected(){ return !!this.link?.connected; }
  get ready(){ return !!this.link?.ready; }
  get state(){ return this.link?.L || { state: 'off', phone: null }; }
  get pairingUrl(){ return this.link ? pairingUrl(phonePageUrl(window.location, this.lanOrigin), testSearch(), this.link.session, this.link.token) : null; }
  onChange(fn){ this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _changed(){ for (const fn of this.listeners) try { fn(this); } catch (e){ console.error(e); } }

  async start(){
    if (this.link){ this.link.start(); return this; }
    // librerie di NATPF (PeerJS per WebRTC, generatore di QR) dalla cartella del sito
    if (!window.Peer) await loadScript(`${NATPF_BASE}js/vendor/peerjs.min.js`);
    if (!window.qrcode) await loadScript(`${NATPF_BASE}js/vendor/qrcode.js`).catch(() => {});
    // server LAN aperto da localhost: nel QR va l'indirizzo di rete del computer
    this.lanOrigin = await lanOrigin();
    const link = this.link = createPhoneLink();
    link.on('change', () => { this._syncPhoneState(); this._changed(); });
    link.on('cal', e => this._onCal(e));
    link.on('swing', s => this._onSwing(s));
    link.on('toss', () => this._onToss());
    await link.start();
    this._changed();
    return this;
  }

  _onCal(e){
    const c = this.cal;
    if (e.step) c.step = e.step;
    if (e.kind === 'grip' || (e.kind === 'step' && 'upright' in e)) c.grip = !!e.upright;
    if (e.kind === 'step' && e.step === 'still'){ c.review = null; c.freeOk = false; c.attempts = []; }
    if (e.kind === 'attempt') c.attempts[e.globalIdx ?? e.idx ?? c.attempts.length] = e.ok ? 'ok' : 'ko';
    c.idle = e.kind === 'idle';
    if (e.kind === 'review'){ c.review = e; c.freeOk = false; if (e.pass) this.link.cmd('free'); }   // prova libera, poi conferma
    if (e.kind === 'free' && e.ok) c.freeOk = true;
    if (e.kind === 'done'){ c.step = 'done'; if (e.profile?.hand === 'left' || e.profile?.hand === 'right') this.hand = e.profile.hand; }
    c.last = e;
    this._changed();
  }
  _onSwing(s){
    const mc = this.engine.motionController;
    if (!mc || !this.ready) return;
    // _emitSwing instrada già P1 in locale e P2 verso l'host (relay della stanza 1v1)
    mc._emitSwing({ ...natpfSwingToArgon(s, { hand: this.hand }), role: this.engine.playerRole });
  }
  _onToss(){
    const mc = this.engine.motionController;
    if (mc && this.ready) mc._emitToss({ source: 'natpf-phone', shotType: 'lob', speed: 1.1, dirX: 0, dirY: -.9, role: this.engine.playerRole });
  }

  // comandi della calibrazione (vedi racchetta.js → command)
  recalibrate(){ this.cal = { step: null, review: null, freeOk: false, grip: null, attempts: [], idle: false }; this.link?.cmd('cal'); this._changed(); }
  retry(){ this.cal.attempts = []; this.link?.cmd('retry'); }
  confirm(){ this.link?.cmd('confirm'); }
  invert(){ this.link?.cmd('invert'); }
  skipGrip(){ this.link?.cmd('skipGrip'); }
  forget(){ this.link?.forget(); this.recalibrate(); }

  // Esito dei colpi al telefono (vibrazione e scritta), dalle stesse chiamate che Argon usa per l'aptica.
  feedback({ role, kind, grade = '', shotType = '' } = {}){
    if (!this.ready || (role || 'p1') !== this.engine.playerRole) return;
    const shot = /SMASH/i.test(shotType) ? 'smash' : /LOB/i.test(shotType) ? 'lob' : /SLICE/i.test(shotType) ? 'slice' : 'drive';
    if (kind === 'hit') this.link.send({ t: 'ev', k: 'contact', label: /PERFECT|POWER/i.test(grade) ? 'perfetto' : /EARLY/i.test(grade) ? 'anticipo' : /LATE/i.test(grade) ? 'ritardo' : 'buono', shot });
    else if (kind === 'whiff') this.link.send({ t: 'ev', k: 'miss', why: 'tardi' });
    else if (kind === 'point_won' || kind === 'fault') this.link.send({ t: 'ev', k: 'point', mine: kind === 'point_won', txt: grade });
  }

  // Ogni fotogramma: fase al telefono e orientamento del telefono alla racchetta di Argon.
  update(){
    if (!this.link) return;
    const phase = this.connected ? phoneGamePhase(this.engine) : null;
    if (phase && phase !== this.lastPhase){ this.lastPhase = phase; this.link.send({ t: 'ph', ph: phase }); }
    if (!this.connected) this.lastPhase = null;
    this._syncPhoneState();
  }
  _syncPhoneState(){
    const mc = this.engine.motionController;
    if (!mc) return;
    const ready = this.ready, was = mc.externalRacket === 'natpf-phone';
    if (!ready && !was) return;                                  // telefono NATPF non in uso: stato del relay di Argon
    // finché il telefono NATPF è pronto il polling del relay non sovrascrive stato e orientamento
    mc.externalRacket = ready ? 'natpf-phone' : null;
    mc.phoneState.connected = ready;
    if (ready){
      const motion = this.link.motion();
      const tilt = motion && !motion.stale ? racketTiltFromRotation(motion.rotation, motion.confidence) : { pitch: 0, roll: 0, yaw: 0 };
      if (tilt) mc.phoneState.orientation = { ...mc.phoneState.orientation, ...tilt, accelMag: 0 };
    }
    if (was !== ready) mc._notifyStatus({ webcam: mc.webcamActive, phone: ready, p1Phone: ready && this.engine.playerRole === 'p1', p2Phone: ready && this.engine.playerRole === 'p2' });
  }
}
