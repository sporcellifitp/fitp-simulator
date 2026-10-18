// Visuale in prima persona per il motore base, sul modello di NATPF Simulator (site/js/tennis/viewpoint.js):
// occhi del giocatore locale, sguardo fisso verso il fondo campo avversario (niente rotazioni dovute a corsa
// o swing), corpo nascosto ma mani e racchetta visibili in primo piano. La terza persona resta quella del motore base.
// Vale per entrambi i giocatori: il giocatore locale è `player` per P1 e `opponent` per P2, e lo sguardo è
// sempre verso la metà campo avversaria.
import * as THREE from 'three';
import { cameraFieldOfView, normalizeCameraMode } from '@natpf/tennis/viewpoint.js';

export const VIEW_STORAGE_KEY = 'natpf-argon.view';
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
