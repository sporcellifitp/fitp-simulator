// Arena delle Nitto ATP Finals di NATPF Simulator dentro la scena del motore base.
// L'arena è quella di site/js/tennis/arena.js, usata così com'è: stesse coordinate del motore base (campo centrato
// nell'origine, lunghezza lungo z, misure ITF), quindi tabelloni, sponsor, tribune, cubo e stendardi restano
// nella disposizione originale. È simmetrica: ognuno dei due giocatori la vede dal proprio lato, con lo
// stesso orientamento di gioco (la camera di P2 è già specchiata dal motore base).
import * as THREE from 'three';
import { buildArena } from '@natpf/tennis/arena.js';
import { scoreText } from './natpf_i18n.js';

// Luci e atmosfera di site/js/tennis/scene.js (palazzetto al chiuso in luce blu).
const NATPF_LIGHTS = {
  background: 0x040a1c, fog: [0x061033, 45, 120],
  hemi: { sky: 0x5770e0, ground: 0x060a24, intensity: .95 },
  key: { color: 0xeef3ff, intensity: 2.2, position: [4, 30, 8] },
  fill: { color: 0x3355ff, intensity: .8, position: [-20, 12, -10] },
};
// Campo d'allenamento: la stessa arena a porte chiuse, tribune vuote e luci di lavoro (più chiare, senza la luce blu
// dello spettacolo), così la palla si legge meglio e si capisce subito che non è una partita.
const PRACTICE_LIGHTS = {
  background: 0x0d1424, fog: [0x101a30, 50, 140],
  hemi: { sky: 0xc8d4ff, ground: 0x1a2038, intensity: 1.15 },
  key: { color: 0xffffff, intensity: 2.6 },
  fill: { color: 0x8fa4ff, intensity: .6 },
};
// I personaggi del motore base sono pensati per il sole: un po' di luce in più sul campo li tiene leggibili.
const CHARACTER_LIFT = { hemi: 1.25, key: 1.12 };

export function installNatpfArena(engine, { quality = 1 } = {}){
  const scene = engine.scene;
  // all'aperto → al chiuso: cielo, nuvole e orizzonte del motore base fuori dalla scena
  for (const key of ['skyDome', 'cloudRing1', 'cloudRing2', 'horizonRing']) if (engine[key]) scene.remove(engine[key]);
  scene.background = new THREE.Color(NATPF_LIGHTS.background);
  scene.fog = new THREE.Fog(...NATPF_LIGHTS.fog);

  const lights = scene.children.filter(o => o.isLight);
  const hemi = lights.find(l => l.isHemisphereLight);
  if (hemi){ hemi.color.setHex(NATPF_LIGHTS.hemi.sky); hemi.groundColor.setHex(NATPF_LIGHTS.hemi.ground); hemi.intensity = NATPF_LIGHTS.hemi.intensity*CHARACTER_LIFT.hemi; }
  if (engine.sunLight){
    const s = engine.sunLight; s.color.setHex(NATPF_LIGHTS.key.color); s.intensity = NATPF_LIGHTS.key.intensity*CHARACTER_LIFT.key;
    s.position.set(...NATPF_LIGHTS.key.position);
    Object.assign(s.shadow.camera, { left: -14, right: 14, top: 24, bottom: -24, near: 5, far: 60 }); s.shadow.normalBias = .02; s.shadow.camera.updateProjectionMatrix();
  }
  const fill = lights.find(l => l.isDirectionalLight && l !== engine.sunLight);
  if (fill){ fill.color.setHex(NATPF_LIGHTS.fill.color); fill.intensity = NATPF_LIGHTS.fill.intensity; fill.position.set(...NATPF_LIGHTS.fill.position); }

  const arena = buildArena(scene, { quality, anisotropy: engine.renderer?.capabilities?.getMaxAnisotropy?.() || 8 });
  let lastScore = '', lastSpeed = null, practice = false;
  const look = L => {
    scene.background = new THREE.Color(L.background); scene.fog = new THREE.Fog(...L.fog);
    if (hemi){ hemi.color.setHex(L.hemi.sky); hemi.groundColor.setHex(L.hemi.ground); hemi.intensity = L.hemi.intensity*CHARACTER_LIFT.hemi; }
    if (engine.sunLight){ engine.sunLight.color.setHex(L.key.color); engine.sunLight.intensity = L.key.intensity*CHARACTER_LIFT.key; }
    if (fill){ fill.color.setHex(L.fill.color); fill.intensity = L.fill.intensity; }
  };
  return {
    arena,
    get practice(){ return practice; },
    // campo d'allenamento (riscaldamento) ↔ arena della partita
    setPractice(on){
      on = !!on; if (on === practice) return; practice = on;
      look(on ? PRACTICE_LIGHTS : NATPF_LIGHTS); arena.setCrowd?.(!on);
      lastScore = ''; arena.setScore(on ? 'PROVA' : '0-0');
    },
    // Lo stadio, la rete e il pubblico GLB del motore base restano caricati ma non visibili: l'arena NATPF ha i suoi.
    adoptLegacyStadium({ stadium, net, crowd } = {}){ for (const o of [stadium, net, crowd]) if (o) o.visible = false; },
    // tifo del motore base (0,22…1) → salto del pubblico NATPF (0…1)
    update(time, cheerEnergy = 0){ arena.update(time, practice ? 0 : Math.max(0, Math.min(1, (cheerEnergy - .22)/.78))); },
    // punteggio sui tabelloni in italiano: «0-15», «PARITÀ», «VANT.»
    setScore(text){ if (practice) return; const t = scoreText(text, { short: true }).slice(0, 7); if (t !== lastScore){ lastScore = t; arena.setScore(t); } },
    setSpeed(kmh){ if (Number.isFinite(kmh) && kmh !== lastSpeed){ lastSpeed = kmh; arena.setSpeed(kmh); } },
  };
}
