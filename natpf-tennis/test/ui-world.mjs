// Mondo di prova per i flussi del gioco: interfaccia NATPF vera (NatpfUi con lobby, allenamento, sfide, pausa, chiosco,
// 1v1 e telefono) sul motore senza disegno, con un DOM finto e un orologio virtuale (performance.now, setTimeout e
// setInterval avanzano solo con advance()). Il telefono è finto ma i suoi eventi passano dalla stessa catena del gioco
// (NatpfPhoneRacket._onCal). Sostituisce variabili globali: va importato solo da file di test dedicati (node --test esegue
// ogni file in un processo a sé).
let vnow = 1000;
Object.defineProperty(performance, 'now', { value: () => vnow, configurable: true, writable: true });
const timeouts = [], intervals = []; let tid = 0;
globalThis.setTimeout = (fn, ms = 0) => { const id = ++tid; timeouts.push({ id, at: vnow + (ms || 0), fn }); return id; };
globalThis.clearTimeout = id => { const i = timeouts.findIndex(t => t.id === id); if (i >= 0) timeouts.splice(i, 1); };
globalThis.setInterval = (fn, ms) => { const id = ++tid; intervals.push({ id, ms, next: vnow + ms, fn }); return id; };
globalThis.clearInterval = id => { const i = intervals.findIndex(t => t.id === id); if (i >= 0) intervals.splice(i, 1); };
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; };
globalThis.localStorage = mem(); globalThis.sessionStorage = mem();
export const fetches = [];
globalThis.fetch = async (url, opt = {}) => {
  fetches.push({ url, body: opt.body });
  if (String(url).includes('/api/match/create')) return { ok: true, json: async () => ({ roomId: 'AT-AB12' }) };
  return { ok: false, status: 404, json: async () => ({}) };
};
class ClassList { constructor(){ this.s = new Set(); } add(...c){ c.forEach(x => this.s.add(x)); } remove(...c){ c.forEach(x => this.s.delete(x)); } contains(c){ return this.s.has(c); } toggle(c, f){ const on = f === undefined ? !this.s.has(c) : !!f; on ? this.s.add(c) : this.s.delete(c); return on; } }
export class El {
  constructor(id = '', tag = 'DIV'){ Object.assign(this, { id, tagName: tag, classList: new ClassList(), style: {}, dataset: {}, textContent: '', innerHTML: '', ls: {}, disabled: false, hidden: false, value: '', offsetParent: {}, offsetWidth: 1, _q: new Map(), parentNode: null }); }
  addEventListener(t, fn, cap){ (this.ls[t] ||= []).push({ fn, cap: !!(cap === true || cap?.capture) }); }
  removeEventListener(){}
  click(){ const ev = mkEvent('click', this); for (const l of [...(this.ls.click || [])].sort((a, b) => b.cap - a.cap)){ l.fn(ev); if (ev._stopImm) break; } return ev; }
  querySelector(sel){ if (!this._q.has(sel)) this._q.set(sel, new El(sel)); return this._q.get(sel); }
  querySelectorAll(){ return []; }
  closest(){ return null; }
  focus(){} blur(){} setAttribute(){} getAttribute(){ return null; } insertAdjacentHTML(){} appendChild(){} insertBefore(){} remove(){} scrollBy(){}
  getBoundingClientRect(){ return { left: 0, top: 0, width: 0, height: 0 }; } play(){ return Promise.resolve(); } getContext(){ return null; }
}
export function mkEvent(type, target, extra = {}){ return { type, target, code: '', key: '', _stopImm: false, defaultPrevented: false, stopPropagation(){}, stopImmediatePropagation(){ this._stopImm = true; }, preventDefault(){ this.defaultPrevented = true; }, ...extra }; }
const els = new Map();
export const $ = id => { if (!els.has(id)) els.set(id, new El(id)); return els.get(id); };
const SHEETS = ['natpf-nick', 'natpf-staff', 'natpf-phone-modal', 'natpf-guest-modal', 'natpf-guest-cam', 'natpf-pause', 'natpf-onboarding', 'natpf-versus-wait'];
const winLs = {};
globalThis.document = {
  getElementById: $,
  querySelector: () => null,
  querySelectorAll: sel => (String(sel).includes('natpf-sheet-backdrop') ? SHEETS.filter(id => !(String(sel).includes(':not(#natpf-staff)') && id === 'natpf-staff')).map($) : []),
  createElement: tag => new El('', String(tag).toUpperCase()),
  addEventListener(){}, removeEventListener(){},
  documentElement: new El('html'), body: new El('body'), head: new El('head'), readyState: 'complete', hidden: false,
};
globalThis.window = globalThis;
globalThis.addEventListener = (t, fn, cap) => { (winLs[t] ||= []).push({ fn, cap: !!(cap === true || cap?.capture) }); };
globalThis.removeEventListener = () => {};
globalThis.dispatchEvent = () => true;
globalThis.Event = class { constructor(t){ this.type = t; } };
const LOCATION = { search: '?intro=0', hostname: 'stand.local', protocol: 'https:', origin: 'https://stand.local', href: 'https://stand.local/', pathname: '/', host: 'stand.local' };
globalThis.location = { ...LOCATION };
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
try { Object.defineProperty(globalThis, 'navigator', { value: { clipboard: null, mediaDevices: null, userAgent: 'node' }, configurable: true }); } catch {}
// tasto premuto (keydown sulla finestra, prima i listener in cattura), come nel browser
export function key(code, k = '', target = document.body){
  const ev = mkEvent('keydown', target, { code, key: k });
  for (const l of [...(winLs.keydown || [])].sort((a, b) => b.cap - a.cap)){ l.fn(ev); if (ev._stopImm) break; }
  return ev;
}
export const visible = id => !$(id).classList.contains('hidden');

const THREE = await import('three');
const { createHeadlessEngine } = await import('../scripts/audit/headless-engine.mjs');
const { NatpfPhoneRacket } = await import('../src/natpf/natpf_phone_racket.js');
const { NatpfUi } = await import('../src/natpf/natpf_ui.js');

// controller: 'phone' (telefono collegato con i sensori attivi, calibrazione da fare) o 'mouse' (modalità prova)
// p2p: collegamento senza server finto ({ mode, status, error, active, onStatus }) per la sfida tra due computer
export async function makeWorld({ controller = 'phone', difficulty = 'casual', role = 'p1', p2p = null } = {}){
  // mondo nuovo: DOM, timer, ascoltatori, archivio e indirizzo da capo
  els.clear(); for (const k of Object.keys(winLs)) delete winLs[k];
  timeouts.length = 0; intervals.length = 0; fetches.length = 0;
  localStorage.clear(); sessionStorage.clear(); globalThis.location = { ...LOCATION };
  document.documentElement = new El('html');
  for (const id of [...SHEETS, 'victory-modal', 'natpf-coach', 'natpf-challenge-hud', 'natpf-wipe', 'natpf-toast']) $(id).classList.add('hidden');
  localStorage.setItem('natpf-tennis.controller', controller);
  if (controller === 'mouse') localStorage.setItem('natpf-tennis.testInput', '1');
  const E = createHeadlessEngine({ difficulty });
  const title = $('title-modal');
  const hud = {
    selectedDifficulty: difficulty, selectedGamesToWin: 1, selectedInputMode: controller,
    hideTitleModal(){ document.documentElement.classList.add('autoplay-mode'); title.classList.add('hidden'); },
    showTitleModal(){ document.documentElement.classList.remove('autoplay-mode'); title.classList.remove('hidden'); },
    hideVictoryModal(){ $('victory-modal').classList.add('hidden'); },
    showVictoryModal(){ $('victory-modal').classList.remove('hidden'); },
  };
  const noop = () => {};
  E.hud = new Proxy(hud, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  E.scene = new THREE.Scene();
  Object.assign(E, { viewMode: 'third', urlRoom: '', roomStatus: { p2Online: false, p2Ready: false }, lastSyncSentAt: 0, versus: undefined, swingVfx: null });
  E._updateEffects = noop; E._updateCameraRig = noop; E.render = noop; E._snapCameraImmediate = noop;
  // controller minimo: i colpi vanno al motore come nel gioco
  const mc = E.motionController = {
    webcamActive: false, latestHandSeenAt: 0, phoneState: { connected: false, orientation: {} }, role: 'p1', roomId: 'default',
    _emitSwing: e => (e.role === 'p2' ? E._handleP2SwingInput(e) : E._handleUserSwingInput(e)),
    _emitToss: e => (e.role === 'p2' ? E._handleP2TossInput(e) : E._handleUserTossInput(e)),
    // colpi del Player 2 come li consegna il controller vero (rete, o secondo telefono dello split screen)
    _emitP2Swing: e => E._handleP2SwingInput({ ...e, role: 'p2' }),
    _emitP2Toss: e => { const t = { ...e, role: 'p2' }; if (E._handleP2TossInput(t) === false) E._handleP2SwingInput(t); },
    _notifyStatus: noop, setRoomConfig: noop, enableWebcam: async () => { mc.webcamActive = true; return true; }, disableWebcam(){ mc.webcamActive = false; },
    triggerHapticFeedback: e => { const q = E.natpfUi?.feedback?.(e); E.natpfPhone.feedback({ ...e, quality: q }); E.natpfPhone2?.feedback({ ...e, quality: q }); },
  };
  if (role === 'p2'){ Object.assign(E, { playerRole: 'p2', urlRoom: 'AT-AB12', roomId: 'at-ab12', isMultiplayer: true }); hud.selectedDifficulty = '1v1'; }
  if (p2p) E.natpfP2p = p2p;
  E.natpfPhone = new NatpfPhoneRacket(E);
  // telefono finto, già collegato con i sensori attivi; «confirm» e «skip» lo rendono pronto, «cal» lo rimette a calibrare
  const link = E.natpfPhone.link = {
    connected: controller === 'phone', ready: false, L: { state: 'connected', phone: controller === 'phone' ? 'cal' : null }, session: 's', token: 't', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); },
    cmd(c){ this.cmds.push(c); if (c === 'skip' || c === 'confirm'){ this.ready = true; this.L.phone = 'ready'; } if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } },
    forget(){ this.connected = false; this.ready = false; this.L = { state: 'waiting', phone: null }; }, motion(){ return null; }, face(){ return null; }, on(){},
  };
  E.natpfUi = new NatpfUi(E);
  E._bootInitialStateFromURL();
  const ui = E.natpfUi;
  // un fotogramma del gioco come il ciclo di requestAnimationFrame (loadAssetsAndStart)
  const frame = dt => { if (E._natpfBackdropFrame(dt)) return 'backdrop'; if (E.natpfPaused) return 'paused'; E.update(dt); return 'update'; };
  const stats = { backdrop: 0, paused: 0, update: 0 };
  function advance(ms, { dt = 1/60 } = {}){
    const end = vnow + ms;
    while (vnow < end){
      vnow += dt*1000;
      for (const t of [...timeouts].sort((a, b) => a.at - b.at)) if (t.at <= vnow){ timeouts.splice(timeouts.indexOf(t), 1); t.fn(); }
      for (const iv of [...intervals]) while (iv.next <= vnow){ iv.next += iv.ms; iv.fn(); }
      stats[frame(dt)]++;
    }
  }
  // «Gioca» della pagina Partita: prima i listener NATPF (in cattura), poi quello del motore base (HUD → onStartMatch)
  function pressStart(){
    const ev = $('btn-start-match').click();
    if (ev._stopImm) return false;
    E.hud.hideTitleModal();
    Object.assign(E.matchConfig, { gamesToWin: hud.selectedGamesToWin, inputMode: hud.selectedInputMode });
    E._applyDifficultyTuning(hud.selectedDifficulty); E.autoPlayMode = false; E.userHasInteracted = true; E.persistentStateLock = false;
    E.startNewMatch({ showStartBanner: true });
    return true;
  }
  const cal = e => E.natpfPhone._onCal(e);
  const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
  await flush();
  return { E, ui, lobby: ui.lobby, link, mc, hud, advance, stats, pressStart, cal, key, flush };
}
