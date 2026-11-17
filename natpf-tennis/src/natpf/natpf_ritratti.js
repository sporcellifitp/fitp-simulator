// B40.6 · ritratti della card della partita dai modelli 3D (fine partita v2, docs/b40/fine-partita-v2.md §5; piano
// docs/coda/B40-piano-analisi.md §5.2, tecnica C scelta dall'utente il 15/11).
// Come funziona:
//   - a fine partita (fase MATCH_OVER) i personaggi della partita esultano o applaudono in loop (player_body_animation:
//     «cheer» e «clap», periodo CHEER_PERIOD = 0,683 s);
//   - durante la scritta della partita (la card arriva 1,8 s dopo) si fotografa UN periodo di ciascun personaggio della
//     card: K fotogrammi (12; 8 su Android o con meno di 4 GB) resi UNA volta dal renderer del gioco, con le luci e la
//     nebbia dell'arena (nessun programma nuovo), solo il personaggio (layer PORTRAIT_LAYER), in una finestra al centro
//     del canvas (sotto la card) di al più 256×320 pixel, copiata in un foglio (canvas 2D). Il personaggio non segue il
//     motore mentre lo si fotografa: avanza di P/K a ogni fotogramma (in tre passi), senza l'inclinazione del telefono
//     né la mano della webcam (game_engine._updatePlayerAnimation con own = true);
//   - la card mostra il ritratto SVG (natpf_portrait.js, con un salto o un dondolio in CSS) finché i fotogrammi non sono
//     pronti, poi li sfoglia nel suo canvas solo con la schermata in vista (anche dopo «‹ Indietro» della rivincita);
//   - con la card in vista l'arena sotto non si ridisegna a ogni fotogramma (frozen): la copre per il 96 % × 94 %. Si
//     ridisegna al ridimensionamento (natpfBackdropDirty) e riparte da sola su qualunque strada chiuda la schermata
//     (Rivincita, Indietro, Menu, Nuovo/Prossimo giocatore, chiosco, telecomando, rivincita dai telefoni, «Torna al menu»):
//     il controllo è sulla schermata stessa a ogni fotogramma;
//   - ripiego: ?ritratti=svg nell'indirizzo, contesto WebGL perso o un errore → resta il ritratto SVG. Una riga nella
//     diagnostica con i ms della cattura (da misurare sul PC dello stand).
// Parti pure in alto (le provano i test), poi la classe collegata al motore.
import * as THREE from 'three';
import { CHEER_PERIOD } from '../player_body_animation.js';
import { cardModel } from './natpf_end_card.js';
import { castLooks, getCast } from './natpf_personaggi.js';
import { updateNatpfCharacters } from './natpf_character.js';
// B63: mascotte 3D con animazioni nuove (interruttore finché l'utente non approva l'anteprima)
import { CARD_LOOP, CARD_K, CARD_K_LOW, cardMovesOn, pickCardMove, applyCardMove } from './natpf_card_moves.js';

export const PORTRAIT_LAYER = 5;
export const PORTRAIT_MAX = Object.freeze({ w: 256, h: 320 });
export const PORTRAIT_K = 12, PORTRAIT_K_LOW = 8;
export const PORTRAIT_MARGIN = 0.06;
// la cattura parte quando chi perde applaude già da un po' (l'applauso parte 1 s dopo il punto)
export const PORTRAIT_START_AFTER = 1.3;
export const PORTRAIT_SUBSTEPS = 3;
// tempo per fotogramma che la cattura si prende (ms): almeno un ritratto per fotogramma, altri finché ce n'è
export const PORTRAIT_BUDGET_MS = 6;
export const PORTRAIT_FOV = 26;

// ?ritratti=svg | 3d (prove e confronti); di base 3d
export function portraitMode(search = ''){
  const v = new URLSearchParams(String(search || '')).get('ritratti');
  return v === 'svg' ? 'svg' : '3d';
}
// fotogrammi per periodo: 8 su Android o con poca memoria (navigator.deviceMemory < 4), altrimenti 12
export function portraitK({ ua = '', deviceMemory = undefined } = {}){
  return /Android/i.test(String(ua)) || (Number.isFinite(deviceMemory) && deviceMemory < 4) ? PORTRAIT_K_LOW : PORTRAIT_K;
}
// grandezza di un fotogramma (pixel del dispositivo): 4:5, al più PORTRAIT_MAX, e non più del canvas del gioco
export function frameSize({ canvasW = 1e9, canvasH = 1e9 } = {}){
  const s = Math.min(1, canvasW/PORTRAIT_MAX.w, canvasH/PORTRAIT_MAX.h);
  return { w: Math.max(8, Math.floor(PORTRAIT_MAX.w*s)), h: Math.max(10, Math.floor(PORTRAIT_MAX.h*s)) };
}
// foglio: K fotogrammi in fila; byte in memoria (RGBA)
export const sheetLayout = (K, w, h) => ({ width: K*w, height: h, x: k => k*w, bytes: K*w*h*4 });
// orario della cattura: per ogni personaggio un giro di prova (K passi senza disegno: misura del riquadro e loop già
// avviato), poi K passi con il ritratto; passo P/K
export function captureSchedule(sides = [], K = PORTRAIT_K){
  const out = [];
  for (const side of sides){ for (let k = 0; k < K; k++) out.push({ side, k, shoot: false }); for (let k = 0; k < K; k++) out.push({ side, k, shoot: true }); }
  return { steps: out, dt: CHEER_PERIOD/K };
}
// inquadratura: distanza della camera perché il riquadro del personaggio (min, max nel mondo) stia nel fotogramma con il
// margine (per lato), vista da davanti (asse z del campo). fov verticale in gradi, aspect = w/h
export function frameCamera(min, max, { fov = PORTRAIT_FOV, aspect = PORTRAIT_MAX.w/PORTRAIT_MAX.h, margin = PORTRAIT_MARGIN } = {}){
  const c = { x: (min.x + max.x)/2, y: (min.y + max.y)/2, z: (min.z + max.z)/2 };
  const hh = (max.y - min.y)/2/(1 - 2*margin), hw = (max.x - min.x)/2/(1 - 2*margin), depth = (max.z - min.z)/2;
  const t = Math.tan(fov*Math.PI/360);
  const dist = Math.max(hh/t, hw/(t*aspect)) + depth;
  return { center: c, dist };
}
// macchina degli stati: idle → warm → shoot → ready; da ogni stato a svg (contesto perso, errore, modo svg)
export const STATES = Object.freeze(['idle', 'warm', 'shoot', 'ready', 'svg']);
export function nextState(state, ev){
  if (ev === 'fail' || ev === 'lost' || ev === 'svg') return 'svg';
  if (ev === 'reset') return 'idle';
  if (state === 'idle' && ev === 'start') return 'warm';
  if (state === 'warm' && ev === 'measured') return 'shoot';
  if (state === 'shoot' && ev === 'done') return 'ready';
  return state;
}
// fotogramma da mostrare al tempo t (ms dall'inizio): il loop dura un periodo
// (B63: con i movimenti nuovi il giro dura CARD_LOOP: period)
export const playFrame = (tMs, K, period = CHEER_PERIOD) => Math.floor(((tMs/1000)/period)*K) % K;
// riquadro delle sole parti visibili (racchetta compresa; non l'arco del colpo nascosto, non il modello nascosto sotto la
// mascotte 3D); le mesh con le ossa si misurano nella posa di adesso
const _tb = new THREE.Box3();
export function visibleBox(root, box){
  box.makeEmpty();
  root.updateMatrixWorld(true);
  root.traverseVisible(o => {
    if (!o.geometry || !(o.isMesh || o.isLine) || o.isSprite) return;
    if (o.isSkinnedMesh){ o.computeBoundingBox(); _tb.copy(o.boundingBox); }
    else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); _tb.copy(o.geometry.boundingBox); }
    box.union(_tb.applyMatrix4(o.matrixWorld));
  });
  return box;
}

/* ---------- collegamento al motore ---------- */
const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
export class NatpfRitratti {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.mode = portraitMode(globalThis.location?.search || '');
    this.K = portraitK({ ua: globalThis.navigator?.userAgent || '', deviceMemory: globalThis.navigator?.deviceMemory });
    this.state = 'idle'; this.job = null; this.sheets = {}; this.canvases = {}; this.last = null;
    this.cam = new THREE.PerspectiveCamera(PORTRAIT_FOV, PORTRAIT_MAX.w/PORTRAIT_MAX.h, 0.05, 60);
    this.cam.layers.set(PORTRAIT_LAYER);
    this._box = new THREE.Box3(); this._b = new THREE.Box3(); this._v = new THREE.Vector4(); this._c = new THREE.Color();
    this._reduce = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (this._reduce) globalThis.document?.documentElement?.classList?.add('natpf-reduce-motion');
    this.stats = { renders: 0, ms: 0 };
    if (typeof window !== 'undefined') window.addEventListener('natpf:victory', () => this._attach());
  }
  // la schermata finale con la card è in vista (l'arena sotto non serve)
  cardShown(){ const m = $('victory-modal'); return !!m && !m.classList.contains('hidden') && m.classList.contains('has-stats'); }
  // game_engine._natpfFrame: arena ferma sotto la card
  frozen(){ return this.cardShown(); }
  // game_engine._natpfFrame, a ogni fotogramma prima del disegno dell'arena: cattura e riproduzione
  frame(now = performance.now()){
    try { this._capture(now); } catch (e){ this._fail(e); }
    this._play(now);
  }
  _fail(e){
    if (this.job) for (const it of this.job.items) this._release(it);
    this.state = nextState(this.state, 'fail'); this.job = null;
    this._log({ esito: 'svg', motivo: String(e?.message || e).slice(0, 60) });
  }
  _log(o){ this.lastLog = o; try { this.ui?.diag?.recorder?.log?.('fine.ritratti', o); } catch {} }
  // partita finita su questo computer: i personaggi della card
  _want(){
    const E = this.engine, m = E.natpfStats?.m;
    if (this.mode === 'svg' || E.phase !== 'MATCH_OVER' || E.autoPlayMode || !m || !m.over || !E.renderer || !E.scene) return null;
    if (this.job?.m === m || this.last?.m === m) return null;
    return m;
  }
  _start(m){
    const E = this.engine, gl = E.renderer.getContext?.();
    if (gl?.isContextLost?.()){ this.state = 'svg'; this.last = { m, state: 'svg' }; return; }
    const winner = m.winner || 'player', view = E._natpfMatchEndView?.(winner);
    const model = view?.stats ? cardModel(view.stats, view, { looks: castLooks(getCast(), view.stats.mode !== 'cpu'), bands: view.stats.bands }) : null;
    if (!model?.cards?.length){ this.last = { m, state: 'idle' }; return; }
    const db = E.renderer.getDrawingBufferSize(new THREE.Vector2()), size = frameSize({ canvasW: db.x, canvasH: db.y });
    // B63: con i movimenti nuovi un movimento per card (dal suo esito), un giro più lungo e più fotogrammi
    const moves = cardMovesOn(), period = moves ? CARD_LOOP : CHEER_PERIOD, K = moves ? (this.K === PORTRAIT_K_LOW ? CARD_K_LOW : CARD_K) : this.K;
    const items = model.cards.map(c => ({ side: c.side, actor: c.side === 'opponent' ? E.opponent : E.player, color: c.art, k: 0, warm: 0, box: null, move: moves ? pickCardMove(c.won ? 'win' : 'lose') : null, t: 0 }))
      .filter(it => it.actor?.root && it.actor.rig);
    if (!items.length){ this.last = { m, state: 'idle' }; return; }
    for (const it of items){
      const L = sheetLayout(K, size.w, size.h);
      let s = this.sheets[it.side];
      if (!s){ s = this.sheets[it.side] = document.createElement('canvas'); }
      if (s.width !== L.width || s.height !== L.height){ s.width = L.width; s.height = L.height; }
      it.sheet = s; it.ctx = s.getContext('2d');
    }
    this.job = { m, items, K, period, w: size.w, h: size.h, i: 0, since: E.elapsedTime, t0: performance.now(), ms: 0, programs: 0 };
    this.state = nextState('idle', 'start');
  }
  _capture(now){
    const E = this.engine;
    if (!this.job){ const m = this._want(); if (m) this._start(m); if (!this.job) return; }
    const J = this.job;
    if (J.m !== E.natpfStats?.m || E.phase !== 'MATCH_OVER'){ for (const it of J.items) this._release(it); this.job = null; this.state = 'idle'; return; }
    if (E.elapsedTime - J.since < PORTRAIT_START_AFTER) return;
    if (E.renderer.getContext?.()?.isContextLost?.()) throw new Error('contesto WebGL perso');
    const t0 = performance.now();
    while (J.i < J.items.length){
      const it = J.items[J.i];
      if (!it.held){ this._hold(it); }
      if (it.warm < J.K){
        // giro di prova: il loop si assesta e si misura il riquadro del personaggio (racchetta compresa)
        while (it.warm < J.K){ this._advance(it, J.period/J.K); if (it.move || it.warm % 2 === 0) this._measure(it); it.warm++; }
        this.state = nextState(this.state, 'measured');
      }
      this._advance(it, J.period/J.K);
      this._shoot(it, J);
      it.k++;
      if (it.k >= J.K){ this._release(it); J.i++; }
      if (performance.now() - t0 >= PORTRAIT_BUDGET_MS) break;
    }
    // B63: tra una fetta e l'altra della fotografia il personaggio sta al suo posto (l'arena sotto si disegna ancora finché
    // la card non c'è: niente salti in campo); _advance lo rimette nel movimento
    const cur = J.items[J.i]; if (cur?.base){ cur.actor.root.position.copy(cur.base.pos); cur.actor.root.rotation.set(cur.base.rotX, cur.base.rotY, cur.base.rotZ); }
    J.ms += performance.now() - t0;
    if (J.i >= J.items.length){
      this.state = nextState(this.state, 'done');
      this.last = { m: J.m, state: 'ready', items: J.items.map(it => ({ side: it.side, sheet: it.sheet, move: it.move?.id || null })), K: J.K, period: J.period, w: J.w, h: J.h, t0: performance.now() };
      this._log({ esito: '3d', ms: Math.round(J.ms), fotogrammi: J.K, px: `${J.w}x${J.h}`, personaggi: J.items.length, programmi: J.programs, ...(J.items.some(it => it.move) ? { mosse: J.items.map(it => it.move?.id || '') } : {}) });
      this.job = null;
      this._attach();
    }
  }
  // il personaggio non segue più il motore mentre lo si fotografa; il layer del ritratto su di lui e sulle luci
  _hold(it){
    const E = this.engine;
    it.actor.natpfPortraitHold = true; it.held = true;
    // (viso contento anche per chi applaude: la sorpresa della sconfitta è già passata)
    try { E.facialFX?.setExpression?.(it.actor, 'happy_grin', 12); } catch {}
    it.actor.root.traverse(o => o.layers.enable(PORTRAIT_LAYER));
    E.scene.traverse(o => { if (o.isLight) o.layers.enable(PORTRAIT_LAYER); });
    it.box = null;
    // B63: posto e direzione di partenza (si rimettono al rilascio) e la reazione del corpo del movimento, da capo
    if (it.move){
      const r = it.actor.root, R = it.actor.rig?.reaction;
      it.base = { pos: r.position.clone(), rotY: r.rotation.y, rotX: r.rotation.x, rotZ: r.rotation.z }; it.t = 0;
      if (R){ R.active = true; R.type = it.move.base; R.timer = 0; }
    }
  }
  _release(it){
    if (!it?.held) return;
    it.actor.natpfPortraitHold = false; it.held = false;
    it.actor.root.traverse(o => o.layers.disable(PORTRAIT_LAYER));
    // B63: il personaggio torna dov'era (sotto la card l'arena resta ferma)
    if (it.base){ const r = it.actor.root; r.position.copy(it.base.pos); r.rotation.set(it.base.rotX, it.base.rotY, it.base.rotZ); r.updateMatrixWorld?.(true); it.base = null; }
  }
  // un passo di P/K del solo personaggio (in PORTRAIT_SUBSTEPS passi), con le braccia e la mascotte aggiornate
  _advance(it, dt){
    const E = this.engine, n = PORTRAIT_SUBSTEPS;
    for (let i = 0; i < n; i++) E._updatePlayerAnimation(it.actor, dt/n, true);
    // B63: tutto il personaggio nel movimento (prima di riportare le parti sulle ossa della mascotte 3D)
    if (it.move && it.base){ it.t += dt; applyCardMove(it.actor, it.move, it.t, it.base, (it.actor.sideSign || 1) > 0 ? -1 : 1); }
    updateNatpfCharacters(E);
  }
  _measure(it){
    visibleBox(it.actor.root, this._b);
    it.box = it.box ? it.box.union(this._b) : this._b.clone();
  }
  _shoot(it, J){
    const E = this.engine, R = E.renderer, S = E.scene, cam = this.cam, a = it.actor;
    const B = it.box || visibleBox(a.root, this._b);
    const f = frameCamera(B.min, B.max, { aspect: J.w/J.h });
    // davanti al personaggio (chi gioca guarda verso la rete: z negativo), un filo dall'alto
    const dir = (a.sideSign || 1) > 0 ? -1 : 1;
    cam.aspect = J.w/J.h; cam.updateProjectionMatrix();
    cam.position.set(f.center.x + 0.12*f.dist, f.center.y + 0.08*f.dist, f.center.z + dir*f.dist);
    cam.lookAt(f.center.x, f.center.y, f.center.z);
    cam.updateMatrixWorld();
    const pr = R.getPixelRatio(), db = R.getDrawingBufferSize(new THREE.Vector2());
    const x = Math.max(0, Math.floor((db.x - J.w)/2)), y = Math.max(0, Math.floor((db.y - J.h)/2));
    const bg = S.background, autoSh = R.shadowMap.autoUpdate, a0 = R.getClearAlpha();
    R.getClearColor(this._c); const c0 = this._c.getHex();
    try {
      S.background = null; R.shadowMap.autoUpdate = false;
      R.setClearColor(it.color, 1);
      R.setScissorTest(true);
      R.setViewport(x/pr, y/pr, J.w/pr, J.h/pr); R.setScissor(x/pr, y/pr, J.w/pr, J.h/pr);
      // (programmi shader compilati da questo disegno: con le luci e la nebbia dell'arena devono essere 0)
      const p0 = R.info?.programs?.length ?? 0;
      R.render(S, cam);
      J.programs += (R.info?.programs?.length ?? 0) - p0;
      this.stats.renders++;
      R.getCurrentViewport(this._v);
      const v = this._v, sy = db.y - v.y - v.w;
      it.ctx.clearRect(it.k*J.w, 0, J.w, J.h);
      it.ctx.drawImage(R.domElement, v.x, sy, v.z, v.w, it.k*J.w, 0, J.w, J.h);
    } finally {
      S.background = bg; R.shadowMap.autoUpdate = autoSh;
      R.setClearColor(c0, a0);
      R.setScissorTest(false);
      const s = R.getSize(new THREE.Vector2()); R.setViewport(0, 0, s.x, s.y); R.setScissor(0, 0, s.x, s.y);
    }
  }
  // canvas della card al posto del ritratto SVG (quando i fotogrammi della partita della schermata sono pronti)
  _attach(){
    const L = this.last, E = this.engine;
    if (!L || L.state !== 'ready' || L.m !== E.natpfStats?.m || typeof document === 'undefined') return;
    for (const it of L.items){
      const art = document.querySelector(`#victory-cards .card-art[data-portrait="${it.side}"]`); if (!art) continue;
      // B58: la card con Lob o Drop (natpf_mascotte.js) non prende il ritratto 3D
      if (art.closest('.end-card')?.dataset.mascot === '1') continue;
      let c = this.canvases[it.side];
      if (!c){ c = this.canvases[it.side] = document.createElement('canvas'); c.className = 'card-portrait'; c.setAttribute('aria-hidden', 'true'); }
      if (c.parentNode !== art) art.insertBefore(c, art.firstChild);
      c.classList.remove('hidden'); c.dataset.k = '';
      art.querySelector('.card-svg')?.classList.add('hidden');
      art.dataset.ritratto = '3d';
    }
    L.t0 = performance.now(); L.shown = -1;
  }
  // riproduzione: solo con la schermata in vista; fermo con «riduci movimento»
  _play(now){
    const L = this.last;
    if (!L || L.state !== 'ready' || !this.cardShown()) return;
    // («riduci movimento»: fermo il ritratto di sempre; le mascotte 3D nuove si muovono sempre, come le GIF: B61)
    const k = this._reduce && !L.items.some(i => i.move) ? 0 : playFrame(now - L.t0, L.K, L.period || CHEER_PERIOD);
    for (const it of L.items){
      const c = this.canvases[it.side]; if (!c || !c.isConnected) continue;
      const W = Math.max(1, Math.min(L.w, Math.round(c.clientWidth*(globalThis.devicePixelRatio || 1)))), H = Math.max(1, Math.min(L.h, Math.round(c.clientHeight*(globalThis.devicePixelRatio || 1))));
      const resized = c.width !== W || c.height !== H;
      if (resized){ c.width = W; c.height = H; }
      if (!resized && c.dataset.k === String(k)) continue;
      c.dataset.k = String(k);
      // copertura: il fotogramma (4:5) riempie la finestra, tagliato ai lati o sopra e sotto
      const fr = L.w/L.h, cr = W/H; let sw = L.w, sh = L.h;
      if (cr > fr) sh = L.w/cr; else sw = L.h*cr;
      const g = c.getContext('2d');
      g.clearRect(0, 0, W, H);
      g.drawImage(it.sheet, k*L.w + (L.w - sw)/2, (L.h - sh)/2, sw, sh, 0, 0, W, H);
    }
  }
  // per le prove e la diagnostica
  info(){
    const L = this.last?.state === 'ready' ? this.last : null;
    return { mode: this.mode, state: this.state, K: L?.K || this.K, ready: !!L, size: L ? [L.w, L.h] : null, sheetBytes: L ? L.items.length*sheetLayout(L.K, L.w, L.h).bytes : 0, renders: this.stats.renders, log: this.lastLog || null };
  }
}
