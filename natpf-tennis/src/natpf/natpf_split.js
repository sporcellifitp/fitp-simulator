// Split screen (28/10): 1v1 sullo stesso computer e sullo stesso schermo, ognuno con il suo telefono. Pensato anche per
// i ledwall (2×2, 3×2 cabinet): lo schermo intero o l'area scelta (natpf_screen.js) si divide in due metà affiancate,
// a sinistra il Player 1 visto da dietro il suo lato del campo, a destra il Player 2 dal lato opposto.
// La partita è il 1v1 dell'host (game_engine.js, «NATPF 1v1») con una sessione locale: nessuna stanza, nessuna rete;
// i colpi del P2 arrivano dal secondo telefono (natpf_phone_racket.js con role 'p2') come quelli del P2 in rete.
// Qui: geometria delle due metà, camera di ciascuna metà (adattata a viste strette e alte) e disegno con lo scissor.
import * as THREE from 'three';
import { deepCamShift } from './natpf_camera_depth.js';

// fasi in cui si vede la partita divisa in due; menu, moviola e fine partita restano a schermo intero
export const SPLIT_PHASES = Object.freeze(['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER']);
// camera di gioco del motore base (dietro il fondo campo, alta 7,8 m, 45°) e quanto campo deve restare in vista di
// lato: tutto il singolare più un margine per il giocatore che corre largo (m dal centro)
export const SPLIT_CAM = Object.freeze({ baseline: 11.89, halfWidth: 5.2, back: 10.91, elevation: 20.4, fov: 45, tallFov: 13, tallElevation: 8, lookZ: 1.8, tallLook: 4, lookY: .35, follow: 6.5 });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Le due metà (pixel CSS, origine in basso a sinistra come il viewport di WebGL): P1 a sinistra, P2 a destra, con una
// linea scura in mezzo
export function splitViewports(w, h, { gap = Math.max(2, Math.round(w*.004)) } = {}){
  const half = Math.max(1, Math.floor((w - gap)/2));
  return { p1: { x: 0, y: 0, w: half, h }, p2: { x: w - half, y: 0, w: half, h }, gap };
}

// Camera di una metà. side: +1 per il P1 (sta a z > 0 e guarda verso z < 0), −1 per il P2. Con una metà larga è la camera
// del motore base; più la metà è stretta e alta (16:9 diviso in due: 8:9; ledwall 2×2: 1:2) più la camera si allarga
// (fino a 58°), arretra quanto serve per vedere tutto il singolare di lato e sale, così il campo riempie l'altezza;
// lo sguardo va un po' oltre la rete, così il campo sta al centro della metà (meno tribune sopra, meno pavimento sotto).
// actorZ: con chi gioca oltre ~12,5 m dal fondo la camera arretra e guarda più giù come quella a schermo intero (C16)
export function splitCameraPose({ side = 1, actorX = 0, actorZ = 0, ballX = 0, aspect = 1 } = {}){
  const C = SPLIT_CAM, tall = clamp((1.2 - aspect)/.7, 0, 1);
  const fov = C.fov + C.tallFov*tall;
  const tanH = Math.tan(fov*Math.PI/360)*aspect;
  const back = Math.max(C.back, C.halfWidth/tanH);                  // dal fondo campo alla camera
  const elevation = (C.elevation + C.tallElevation*tall)*Math.PI/180;
  const height = Math.tan(elevation)*(C.baseline + back - C.lookZ);
  const deep = deepCamShift(actorZ*side);
  return {
    fov,
    pos: [actorX*.16, height, side*(C.baseline + back + deep.back)],
    look: [ballX*.12, C.lookY, side*(C.lookZ - C.tallLook*tall + deep.look)],
  };
}

// lo split si vede solo a partita in corso (non con la moviola o una camera scelta a mano)
export function splitVisible(engine){
  return !!engine.natpfSplit?.active && SPLIT_PHASES.includes(engine.phase) && !engine.autoPlayMode
    && engine.cameraMode !== 'REPLAY_CAM' && !engine.natpfReplay?.playing && !engine.manualCameraOverride;
}

export class NatpfSplit {
  constructor(engine){
    this.e = engine;
    this.active = false;                       // sessione split (dalla scelta nel menu all'uscita)
    this.shown = false;                        // ultimo fotogramma disegnato diviso
    this.cam2 = new THREE.PerspectiveCamera(45, 1, .1, 500);
    this.smooth = { 1: null, '-1': null };
    this.size = new THREE.Vector2();
    this.last = 0;
  }
  // camera di una metà, con lo stesso inseguimento morbido della camera del motore
  _pose(cam, side, actor, v, dt, snap){
    const E = this.e, aspect = v.w/v.h, p = splitCameraPose({ side, actorX: actor.pos.x, actorZ: actor.pos.z, ballX: E.ball?.pos?.x || 0, aspect });
    const s = this.smooth[side] || (this.smooth[side] = { pos: new THREE.Vector3(...p.pos), look: new THREE.Vector3(...p.look) });
    const k = snap ? 1 : 1 - Math.exp(-SPLIT_CAM.follow*dt);
    s.pos.lerp(new THREE.Vector3(...p.pos), k); s.look.lerp(new THREE.Vector3(...p.look), k);
    if (Math.abs(cam.fov - p.fov) > .01 || Math.abs(cam.aspect - aspect) > 1e-4){ cam.fov = p.fov; cam.aspect = aspect; cam.updateProjectionMatrix(); }
    cam.position.copy(s.pos); cam.lookAt(s.look); cam.updateMatrixWorld();
  }
  // Disegna la partita divisa; false quando va disegnata a schermo intero (e la camera del motore torna com'era)
  render(){
    const E = this.e, r = E.renderer;
    if (!r || !splitVisible(E)){
      if (this.shown){ this.shown = false; E._onResize?.(); }
      this._serveTags(null);
      return false;
    }
    const now = performance.now(), dt = clamp((now - (this.last || now))/1000, 0, .1), snap = !this.shown;
    this.last = now; this.shown = true;
    r.getSize(this.size);
    const vp = splitViewports(this.size.x, this.size.y);
    r.setScissorTest(true);
    // linea tra le due metà: tutto lo schermo scuro, poi le due viste
    r.setViewport(0, 0, this.size.x, this.size.y); r.setScissor(0, 0, this.size.x, this.size.y);
    const clear = r.getClearColor(new THREE.Color()), alpha = r.getClearAlpha();
    r.setClearColor(0x04060f, 1); r.clear(); r.setClearColor(clear, alpha);
    // ombre calcolate una volta sola per fotogramma: la seconda vista le riusa
    const autoShadow = r.shadowMap.autoUpdate;
    this._pose(E.camera, 1, E.player, vp.p1, dt, snap);
    r.setViewport(vp.p1.x, vp.p1.y, vp.p1.w, vp.p1.h); r.setScissor(vp.p1.x, vp.p1.y, vp.p1.w, vp.p1.h);
    r.render(E.scene, E.camera);
    r.shadowMap.autoUpdate = false;
    this._pose(this.cam2, -1, E.opponent, vp.p2, dt, snap);
    r.setViewport(vp.p2.x, vp.p2.y, vp.p2.w, vp.p2.h); r.setScissor(vp.p2.x, vp.p2.y, vp.p2.w, vp.p2.h);
    r.render(E.scene, this.cam2);
    r.shadowMap.autoUpdate = autoShadow;
    r.setScissorTest(false); r.setViewport(0, 0, this.size.x, this.size.y);
    this._serveTags(vp);
    return true;
  }
  // B35 (collaudo dell'utente del 13/11: «non esce scritto chi deve servire»): nello stesso schermo la scritta «Al
  // servizio» del motore non c'è (è di una vista sola: _updateProjectedHUD la spegne); qui una per metà, sopra chi batte,
  // come a schermo intero contro la CPU, con i personaggi Classici e con Lob & Drop. Solo al servizio (in posizione e
  // con la palla in aria), come quella del motore
  _serveTags(vp){
    const E = this.e, on = !!vp && ['SERVE_STANCE', 'SERVE_TOSS'].includes(E.phase) && E.cameraMode !== 'REPLAY_CAM';
    const tags = this._tags || (on ? (this._tags = serveTagEls()) : null);
    if (!tags) return;
    const who = E.score?.server === 'opponent' ? E.opponent : E.player;
    [[E.camera, vp?.p1, tags[0]], [this.cam2, vp?.p2, tags[1]]].forEach(([cam, v, el]) => {
      const at = on && who?.pos ? serveTagPoint(who.pos, cam, v, E.natpfUi?.serveMark?.tagHeight?.(who, cam)) : null;   // (B37: sopra la gemma vista da questa camera)
      if (!el) return;
      if (!at){ if (!el.classList.contains('hidden')) el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      const left = `${at.x.toFixed(1)}px`, top = `${at.y.toFixed(1)}px`;
      if (el.style.left !== left) el.style.left = left;
      if (el.style.top !== top) el.style.top = top;
    });
  }
  // fuori dallo split (fine partita, menu, moviola): le due scritte si spengono
  hideServeTags(){ for (const el of this._tags || []) el?.classList.add('hidden'); }
}

// punto della scritta «Al servizio» in una metà: h m sopra chi batte (di base 2,25; B37: sopra la gemma, come
// _updateProjectedHUD), nella metà v
// ({ x, y, w, h } in px), tenuta dentro la sua metà; null se è dietro la camera. Funzione pura (la provano i test)
const _tagP = new THREE.Vector3();
export function serveTagPoint(pos, cam, v, h = 2.25){
  if (!pos || !cam || !v) return null;
  _tagP.set(pos.x, (pos.y || 0) + (Number.isFinite(h) ? h : 2.25), pos.z).project(cam);
  if (!(_tagP.z >= -1 && _tagP.z <= 1)) return null;
  const x = v.x + (_tagP.x*.5 + .5)*v.w, y = v.y + (-_tagP.y*.5 + .5)*v.h;
  return { x: clamp(x, v.x + Math.min(70, v.w/2), v.x + v.w - Math.min(70, v.w/2)), y: clamp(y, v.y + Math.min(60, v.h/2), v.y + v.h - 40) };
}
// le due scritte, una per metà, accanto a quella del motore (stesso aspetto: classe nt-server-tag)
function serveTagEls(){
  if (typeof document === 'undefined') return null;
  const layer = document.getElementById('world-labels-layer'); if (!layer) return null;
  return ['p1', 'p2'].map(id => {
    let el = document.getElementById(`server-tag-${id}`);
    if (!el){
      el = document.createElement('div'); el.id = `server-tag-${id}`; el.className = 'nt-server-tag nt-server-tag-half hidden';
      el.dataset.half = id; el.innerHTML = '<span class="server-tag-text">Al servizio</span>';
      layer.appendChild(el);
    }
    return el;
  });
}
