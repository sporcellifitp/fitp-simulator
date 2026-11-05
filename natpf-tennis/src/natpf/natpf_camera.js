// Visuale in prima persona per il motore base, sul modello di NATPF Simulator (site/js/tennis/viewpoint.js):
// occhi del giocatore locale, sguardo fisso verso il fondo campo avversario (niente rotazioni dovute a corsa
// o swing), corpo nascosto ma mani e racchetta visibili in primo piano. La terza persona resta quella del motore base,
// adattata alla forma dello schermo (B8, thirdPersonFrame più sotto).
// Vale per entrambi i giocatori: il giocatore locale è `player` per P1 e `opponent` per P2, e lo sguardo è
// sempre verso la metà campo avversaria.
import * as THREE from 'three';
import { cameraFieldOfView, normalizeCameraMode } from '@natpf/tennis/viewpoint.js';
import { STAND_FRONT } from '@natpf/tennis/arena.js';
import { SPLIT_CAM } from './natpf_split.js';

export const VIEW_STORAGE_KEY = 'natpf-tennis.view';
export const normalizeViewMode = normalizeCameraMode;           // 'first' | 'third'

// Camera poco dietro e sopra la testa: la racchetta a riposo (all'altezza dell'anca, davanti al corpo) entra
// nell'inquadratura in basso, come un'arma in un FPS, e durante lo swing attraversa la scena.
export const FIRST_PERSON = Object.freeze({ eyeHeight: 1.38, back: .78, gazeHeight: .95, gazeBeyond: 2, follow: 16, shake: .35 });

export function firstPersonPose(actor, baselineZ, out = { position: new THREE.Vector3(), target: new THREE.Vector3() }){
  const side = actor.sideSign > 0 ? 1 : -1;                    // P1 a +z guarda verso -z, P2 il contrario
  out.position.set(actor.pos.x, FIRST_PERSON.eyeHeight, actor.pos.z + side*FIRST_PERSON.back);
  out.target.set(actor.pos.x, FIRST_PERSON.gazeHeight, -side*(baselineZ + FIRST_PERSON.gazeBeyond));
  return out;
}
export const firstPersonFov = aspect => cameraFieldOfView(aspect, 'first');

// ── Terza persona adattata alla forma dello schermo (B8, «adatta il fullscreen in base alla finestra/monitor») ──
// La camera della partita del motore base (game_engine.js, _computeTargetCameraPose: servizio e scambio, dietro il fondo
// campo a z 22,8, alta 7,8 m, sguardo a 1,8 m dalla rete e 0,35 m da terra) ha 45° in verticale: è pensata per il 16:9.
// Sugli schermi più stretti (4:3, ledwall 2×2 quadrato, finestra in verticale) si vedeva meno campo di lato e gli angoli
// vicini del doppio uscivano dallo schermo (audit B8: ±1,05 sul quadrato, ±1,8 in verticale). Qui, da 16:9 in su tutto
// come prima; più stretto, si tiene la larghezza che il 16:9 vede sulla riga di fondo vicina (dove gli angoli escono per
// primi): prima si allarga il campo visivo verticale fino al tetto dello split screen (45° + 13° = 58°, natpf_split.js),
// poi la camera si allontana dal punto guardato (dolly: moltiplica la distanza camera → punto guardato) fino a maxDolly,
// che basta per il quadrato; oltre, solo sugli schermi in verticale, il campo visivo si allarga ancora fino a tallFov e da
// lì in poi il campo di lato si stringe (in 9:16 restano in vista singolare e pali della rete, e anche gli angoli del
// doppio). La posa vera (frameMatchCamera) tiene la camera davanti al maxischermo del proprio fondo: allontanandosi lungo
// lo sguardo sul quadrato finiva dietro (z 26,8), e con chi gioca in profondità (C16, fino a z 28,4) la cassa nera del
// maxischermo copriva fino a un terzo dell'immagine dal basso, con le gambe di chi gioca (revisione B8); oltre maxZ la
// camera sale invece di arretrare, alla stessa distanza dal punto guardato.
// Prima persona (firstPersonFov, da viewpoint.js condiviso con il sito) e split screen (natpf_split.js, camera per ogni
// metà) restano come sono.
export const MATCH_CAM = Object.freeze({ height: 7.8, z: 22.8, lookY: SPLIT_CAM.lookY, lookZ: SPLIT_CAM.lookZ, baseline: SPLIT_CAM.baseline });
// maxischermo sopra il passaggio di fondo (site/js/tennis/arena.js: piano a z = ±(STAND_FRONT.hz + 3,2) = ±25,6, largo
// 5,8 m, con dietro una cassa nera 6 × 4,2 × 0,3 m da z ±25,65 a ±25,95, alta fino a 7,2 m). Prima del B8 la camera
// della partita arrivava al massimo a z 24,96 (C16)
export const NEAR_SCREEN_Z = STAND_FRONT.hz + 3.2;
export const THIRD_PERSON = Object.freeze({
  fov: SPLIT_CAM.fov,                         // 45°: campo visivo verticale del motore base (16:9 e più largo)
  refAspect: 16/9,                            // forma di riferimento: da qui in su nessun cambiamento
  maxFov: SPLIT_CAM.fov + SPLIT_CAM.tallFov,  // 58°: tetto del primo allargamento (4:3 → 57,8° con la camera ferma)
  maxDolly: 1.2,                              // tetto dell'allontanamento (1:1 → 1,19: 26,5 m dal punto guardato)
  tallFov: 70,                                // secondo tetto, solo per gli schermi in verticale
  maxZ: NEAR_SCREEN_Z - .3,                   // 25,3 m: la camera resta davanti al maxischermo del proprio fondo
  tallElevation: SPLIT_CAM.tallElevation,     // 8°: in verticale (9:16) la camera sale ancora, come le metà alte dello split
  tallFrom: 1, tallTo: 9/16,                  // da 1:1 (nulla) a 9:16 (tutto)
});
const rad = deg => deg*Math.PI/180, tanHalf = deg => Math.tan(rad(deg)/2), fovOf = t => 2*Math.atan(t)*180/Math.PI;
// profondità della riga di fondo vicina lungo lo sguardo della camera della partita, in frazione della distanza camera →
// punto guardato (≈ 0,58): arretrando di (dolly − 1) volte quella distanza, la riga di fondo si allontana di altrettanto
export const NEAR_BASELINE_DEPTH = (() => {
  const C = MATCH_CAM, oy = C.height - C.lookY, oz = C.z - C.lookZ;
  return (C.height*oy + (C.z - C.baseline)*oz)/(oy*oy + oz*oz);
})();

// { fov, dolly } della terza persona per uno schermo largo/alto = aspect: esattamente { fov: 45, dolly: 1 } da 16:9 in su
export function thirdPersonFrame(aspect, C = THIRD_PERSON){
  const a = Number(aspect);
  if (!(a > 0) || a >= C.refAspect) return { fov: C.fov, dolly: 1 };
  const need = tanHalf(C.fov)*C.refAspect/a;           // tan del mezzo campo verticale che dà la larghezza del 16:9
  const t1 = tanHalf(C.maxFov);
  if (need <= t1) return { fov: fovOf(need), dolly: 1 };
  const n = NEAR_BASELINE_DEPTH, dolly = 1 - n + n*need/t1;
  if (dolly <= C.maxDolly) return { fov: C.maxFov, dolly };
  return { fov: fovOf(Math.min(n*need/(n + C.maxDolly - 1), tanHalf(C.tallFov))), dolly: C.maxDolly };
}
// larghezza vista sulla riga di fondo vicina rispetto al 16:9: 1 = la stessa (fino al quadrato e un po' oltre), > 1 sugli
// schermi più larghi, < 1 solo oltre il secondo tetto (schermi in verticale)
export function thirdPersonCoverage(aspect, C = THIRD_PERSON){
  const a = Number(aspect) > 0 ? Number(aspect) : C.refAspect, f = thirdPersonFrame(a, C), n = NEAR_BASELINE_DEPTH;
  return tanHalf(f.fov)*a*(n + f.dolly - 1)/n/(tanHalf(C.fov)*C.refAspect);
}
// arretra la camera lungo lo sguardo: pos ← look + (pos − look)·dolly (sul posto; THREE.Vector3)
export function dollyCamera(pos, look, dolly){
  if (dolly !== 1) pos.sub(look).multiplyScalar(dolly).add(look);
  return pos;
}
// alza la camera attorno al punto guardato, alla stessa distanza: elevazione dello sguardo + deg (sul posto)
export function raiseCamera(pos, look, deg){
  if (!(deg > 0)) return pos;
  const ox = pos.x - look.x, oy = pos.y - look.y, oz = pos.z - look.z, h = Math.hypot(ox, oz);
  if (!(h > 0)) return pos;
  const L = Math.hypot(h, oy), el = Math.min(Math.atan2(oy, h) + rad(deg), rad(85)), k = L*Math.cos(el)/h;
  return pos.set(look.x + ox*k, look.y + L*Math.sin(el), look.z + oz*k);
}
const NO_DEEP = Object.freeze({ back: 0, look: 0 });
const _base = new THREE.Vector3(), _look = new THREE.Vector3();
// Posa della camera della partita (servizio e scambio, terza persona) per uno schermo largo/alto = aspect, sul posto.
// pos e look sono la posa obiettivo del motore (game_engine.js _computeTargetCameraPose) con dentro lo spostamento per chi
// gioca in profondità (C16: deep = deepCamShift di natpf_camera_depth.js, nullo al servizio; side +1 per il P1, −1 per
// il P2). Da 4:3 in su (dolly 1) la posa resta quella del motore; più stretto:
//   1. la posa di base (senza C16) si allontana lungo lo sguardo (dolly);
//   2. C16 come sempre per lo sguardo, che scende verso chi gioca; la camera arretra ancora solo se C16 da solo la
//      porterebbe più indietro (i due arretramenti non si sommano: la camera già lontana tiene in vista chi gioca);
//   3. mai oltre maxZ (davanti al maxischermo del proprio fondo): oltre, la camera sale alla stessa distanza dal punto
//      guardato (sul quadrato da 19,5° a 27,6° sopra l'orizzonte), così la riga di fondo vicina resta alla stessa
//      profondità o poco più e il campo visto di lato non cala;
//   4. in verticale (da 1:1 a 9:16) la camera sale ancora fino a tallElevation, alla stessa distanza: il campo sta al
//      centro dell'immagine, meno pavimento in basso e segnapunti del fondo vicino fuori dall'immagine.
// Tutto continuo nella forma e nella profondità di chi gioca (nessuno scatto). Restituisce { fov, dolly } (thirdPersonFrame).
export function frameMatchCamera(pos, look, { aspect, side = 1, deep = NO_DEEP } = {}, C = THIRD_PERSON){
  const a = Number(aspect), f = thirdPersonFrame(a, C), s = side < 0 ? -1 : 1, d = deep || NO_DEEP;
  if (f.dolly !== 1){
    _base.set(pos.x, pos.y, pos.z - s*(d.back || 0)); _look.set(look.x, look.y, look.z - s*(d.look || 0));
    dollyCamera(_base, _look, f.dolly);
    pos.set(_base.x, _base.y, s*Math.max(s*_base.z, s*pos.z));
  }
  if (s*pos.z > C.maxZ){
    const oy = pos.y - look.y, oz = pos.z - look.z, nz = s*C.maxZ - look.z;   // x resta, la distanza anche
    pos.set(pos.x, look.y + Math.sqrt(Math.max(0, oy*oy + oz*oz - nz*nz)), s*C.maxZ);
  }
  const tall = a > 0 ? Math.min(1, Math.max(0, (C.tallFrom - a)/(C.tallFrom - C.tallTo))) : 0;
  if (tall > 0) raiseCamera(pos, look, C.tallElevation*tall);
  return f;
}
// camere della partita (servizio e scambio, dietro chi gioca: il ramo «else» di _computeTargetCameraPose): le uniche
// che arretrano. Vista aerea, vetrina e moviola hanno pose loro (in giro per l'arena o vicino al campo) e prendono solo
// il campo visivo
export const isMatchCamera = mode => mode !== 'INTRO_PAN' && mode !== 'SHOWCASE_CAM' && mode !== 'REPLAY_CAM';
// densità dei pixel del disegno: quella dello schermo in uso, al massimo 2 (prestazioni)
export const renderPixelRatio = dpr => Math.min(Number(dpr) > 0 ? Number(dpr) : 1, 2);
// Avvisa quando cambia la densità dei pixel (finestra spostata su un monitor con un'altra scala, zoom del browser): non
// sempre arriva anche un «resize», perché la finestra può restare della stessa misura in pixel CSS. Restituisce la
// funzione che smette di ascoltare.
export function watchPixelRatio(onChange, w = globalThis){
  if (typeof w?.matchMedia !== 'function') return () => {};
  let mq = null, off = false;
  const fire = () => { if (off) return; arm(); onChange(w.devicePixelRatio || 1); };
  const arm = () => {
    mq = w.matchMedia(`(resolution: ${w.devicePixelRatio || 1}dppx)`);
    mq?.addEventListener?.('change', fire, { once: true });
  };
  arm();
  return () => { off = true; mq?.removeEventListener?.('change', fire); };
}

// Nasconde testa, busto, gambe e parte alta delle braccia del personaggio locale: restano avambracci, mani e racchetta.
// Si nascondono i gruppi «genitori»: le espressioni del viso, che accendono e spengono i propri pezzi, restano
// comunque invisibili perché figlie della testa.
export function setFirstPersonBody(actor, firstPerson){
  if (!actor?.model) return;
  const hideable = actor.__natpfHideable || (actor.__natpfHideable = collectHideable(actor.model, [actor.parts?.handL, actor.parts?.handR, actor.racketPivot].filter(Boolean)));
  for (const o of hideable) o.visible = !firstPerson;
  // braccia (fino al gomito) e gambe del personaggio NATPF, che stanno fuori dal modello
  for (const o of actor.natpfFirstPersonHidden || []) o.visible = !firstPerson;
}
// Rami del modello che non portano a mani o racchetta.
function collectHideable(root, keep){
  const out = [];
  const leadsToKept = o => keep.some(k => { for (let p = k.parent; p; p = p.parent) if (p === o) return true; return false; });
  const walk = o => { for (const c of o.children){ if (keep.includes(c) || c.isLight || c.isCamera) continue; if (leadsToKept(c)) walk(c); else out.push(c); } };
  walk(root);
  return out;
}
