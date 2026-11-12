// B29 · Lob & Drop dai modelli 3D: caricamento dei due modelli (public/media/mascotte-drop.glb e mascotte-lob.glb,
// fatti da scripts/mascotte-modelli.py) e loro aspetto. Si caricano SOLO quando servono: la prima volta che in campo
// c'è una mascotte con «Personaggi: Lob & Drop». Con «Classici» non si scarica niente.
// Finché un modello non è arrivato, o se non arriva (file mancante, rete, errore), in campo resta la mascotte
// costruita nel codice (natpf_lob_drop.js): nessun buco, nessun avviso a schermo, una riga nella console.
// Dall'indirizzo: ?mascotte=3d (di base) oppure ?mascotte=codice (sempre le mascotte costruite nel codice: serve per
// confrontare e per le prove).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

export const MASCOT_MODE_PARAM = 'mascotte';
export const MASCOT_MODES = Object.freeze(['3d', 'codice']);
export const MASCOT_MODEL_FILES = Object.freeze({ drop: './media/mascotte-drop.glb', lob: './media/mascotte-lob.glb' });
const NAMES = { drop: 'Drop', lob: 'Lob' };

export function mascotModeFromSearch(search = ''){
  try {
    const v = String(new URLSearchParams(search || '').get(MASCOT_MODE_PARAM) || '').toLowerCase();
    return MASCOT_MODES.includes(v) ? v : '3d';
  } catch { return '3d'; }
}
let mode = null;
export const getMascotMode = () => mode || (mode = mascotModeFromSearch(globalThis.location?.search));
// Per le prove: cambia il modo (o lo dimentica: alla prossima lettura si rilegge dall'indirizzo)
export function setMascotMode(v){ mode = MASCOT_MODES.includes(v) ? v : null; return getMascotMode(); }

// Materiale dei modelli: uno per mascotte, semplice (luce diffusa, niente riflessi), con la texture anche come luce
// propria (sotto le luci fredde dell'arena il colore resta quello del peluche) e un bordo di luce morbido che stacca
// la sagoma dal fondo (Drop è blu su un campo blu: il suo bordo è più deciso).
export const MASCOT_LOOK = Object.freeze({
  drop: Object.freeze({ glow: 0.22, rim: 0.2, rimColor: Object.freeze([0.75, 0.9, 1.0]) }),
  lob: Object.freeze({ glow: 0.26, rim: 0.1, rimColor: Object.freeze([1.0, 0.98, 0.9]) }),
});
export function mascotMaterial(key, map = null){
  const L = MASCOT_LOOK[key] || MASCOT_LOOK.drop;
  const m = new THREE.MeshLambertMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: L.glow });
  m.name = `natpf-mascotte-${key}`;
  m.userData.natpfMaterial = true;
  const c = L.rimColor;
  // forza del bordo: un numero che si può cambiare a programma già compilato (le prove lo spengono per il confronto)
  m.userData.natpfRim = { value: L.rim };
  m.customProgramCacheKey = () => `natpf-mascotte-${c.join('-')}`;
  m.onBeforeCompile = shader => {
    shader.uniforms.natpfRimK = m.userData.natpfRim;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', 'uniform float natpfRimK;\n#include <common>').replace('#include <opaque_fragment>', `
      float natpfRim = pow( 1.0 - max( dot( normalize( vNormal ), normalize( vViewPosition ) ), 0.0 ), 2.5 ) * natpfRimK;
      outgoingLight += vec3( ${c[0].toFixed(3)}, ${c[1].toFixed(3)}, ${c[2].toFixed(3)} ) * natpfRim;
      #include <opaque_fragment>`);
  };
  return m;
}

// Stato del caricamento, per mascotte: 'idle' (mai chiesto), 'loading', 'ready', 'failed'
const STATE = { drop: { status: 'idle', scene: null, promise: null, error: null }, lob: { status: 'idle', scene: null, promise: null, error: null } };
export const mascotModelStatus = key => STATE[key]?.status || 'failed';
export const mascotModelError = key => STATE[key]?.error || null;

// Prepara la scena di un modello appena letto: materiale del gioco, ombre, niente scarto per inquadratura (la sfera
// di ingombro di una mesh con pelle andrebbe ricalcolata a ogni posa)
function prepare(key, scene){
  let skinned = 0, map = null;
  scene.traverse(o => { if (o.isSkinnedMesh && !map) map = o.material?.map || null; });
  const material = mascotMaterial(key, map);
  scene.traverse(o => {
    if (!o.isMesh) return;
    if (o.isSkinnedMesh) skinned++;
    o.material?.dispose?.();
    o.material = material;
    o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
    o.userData.natpfMaterial = true; o.userData.natpfMascot3d = key;
    o.name = `NatpfMascotte3d${NAMES[key]}`;
  });
  if (!skinned) throw new Error('nel file non c\'è una mesh con lo scheletro');
  return scene;
}

// Chiede un modello (una volta sola: le chiamate dopo restituiscono la stessa promessa). Non lancia mai errori:
// la promessa dà true se il modello è pronto, false se non è arrivato. opts.loader e opts.url servono alle prove.
export function loadMascotModel(key, opts = {}){
  const st = STATE[key];
  if (!st) return Promise.resolve(false);
  if (st.promise) return st.promise;
  st.status = 'loading';
  const fail = err => {
    st.status = 'failed'; st.scene = null; st.error = String(err?.message || err || 'errore');
    console.warn(`[natpf-mascotte] modello 3D di ${NAMES[key]} non caricato (${st.error}): in campo resta la mascotte costruita nel codice`);
    return false;
  };
  st.promise = new Promise(resolve => {
    try {
      const loader = opts.loader || new GLTFLoader();
      loader.load(opts.url || MASCOT_MODEL_FILES[key], gltf => {
        try { st.scene = prepare(key, gltf.scene || gltf.scenes?.[0]); st.status = 'ready'; resolve(true); } catch (err) { resolve(fail(err)); }
      }, undefined, err => resolve(fail(err)));
    } catch (err) { resolve(fail(err)); }
  });
  return st.promise;
}
// Per le prove senza browser: adotta una scena già costruita come se fosse stata caricata
export function adoptMascotModel(key, scene){
  const st = STATE[key];
  st.scene = prepare(key, scene); st.status = 'ready'; st.error = null; st.promise = Promise.resolve(true);
  return st.scene;
}
// Per le prove: dimentica i modelli (alla prossima richiesta si ricaricano)
export function resetMascotModels(){
  for (const st of Object.values(STATE)){ st.status = 'idle'; st.scene = null; st.promise = null; st.error = null; }
}
// Una copia del modello per un attore: scheletro suo, geometria, materiale e texture condivisi. null se non è pronto.
export function mascotModelInstance(key){
  const st = STATE[key];
  if (!st || st.status !== 'ready' || !st.scene) return null;
  return cloneSkinned(st.scene);
}
