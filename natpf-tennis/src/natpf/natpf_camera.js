// Visuale in prima persona per il motore base, sul modello di NATPF Simulator (site/js/tennis/viewpoint.js):
// occhi del giocatore locale, sguardo fisso verso il fondo campo avversario (niente rotazioni dovute a corsa
// o swing), corpo nascosto ma mani e racchetta visibili in primo piano. La terza persona resta quella del motore base,
// adattata alla forma dello schermo (B8, thirdPersonFrame più sotto).
// Vale per entrambi i giocatori: il giocatore locale è `player` per P1 e `opponent` per P2, e lo sguardo è
// sempre verso la metà campo avversaria.
import * as THREE from 'three';
import { cameraFieldOfView, normalizeCameraMode } from '@natpf/tennis/viewpoint.js';
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
// poi la camera arretra lungo lo sguardo (dolly: moltiplica la distanza camera → punto guardato) fino a maxDolly, che
// basta per il quadrato e tiene il bordo basso dell'immagine sul pavimento o sul muretto di fondo (non sulle teste del
// pubblico); oltre, solo sugli schermi in verticale, il campo visivo si allarga ancora fino a tallFov e da lì in poi il
// campo di lato si stringe (in 9:16 restano in vista singolare e pali della rete, e anche gli angoli del doppio).
// Prima persona (firstPersonFov, da viewpoint.js condiviso con il sito) e split screen (natpf_split.js, camera per ogni
// metà) restano come sono.
export const MATCH_CAM = Object.freeze({ height: 7.8, z: 22.8, lookY: SPLIT_CAM.lookY, lookZ: SPLIT_CAM.lookZ, baseline: SPLIT_CAM.baseline });
export const THIRD_PERSON = Object.freeze({
  fov: SPLIT_CAM.fov,                         // 45°: campo visivo verticale del motore base (16:9 e più largo)
  refAspect: 16/9,                            // forma di riferimento: da qui in su nessun cambiamento
  maxFov: SPLIT_CAM.fov + SPLIT_CAM.tallFov,  // 58°: tetto del primo allargamento (4:3 → 57,8° con la camera ferma)
  maxDolly: 1.2,                              // tetto dell'arretramento (1:1 → 1,19: camera a z 26,8, alta 9,2 m)
  tallFov: 70,                                // secondo tetto, solo per gli schermi in verticale
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
