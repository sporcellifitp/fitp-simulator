// B67 · Effetti disegnati intorno alla mascotte nella fotografia della card (docs/b67/pose-mascotte.md): l'alone con le
// fiammelle dell'«Aura» e la nuvoletta con la pioggia del «Sospiro». Niente asset: texture piccole fatte qui con il canvas
// (64 × 64 e 128 × 128, meno di 0,2 MB in tutto), sprite sempre di fronte alla camera del ritratto, SOLO nel layer del
// ritratto (in campo non si vedono), nella scena solo durante la fotografia. Un programma per tutti (SpriteMaterial con
// la texture), compilato prima della fotografia (natpf_ritratti._start). Tutto dipende solo dal tempo del giro: si
// chiude come il movimento (le fiammelle salgono tre volte per giro, le gocce cadono due volte).
import * as THREE from 'three';

const TAU = 2*Math.PI;
const tex = (size, draw) => {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
let TEXTURES = null;
function textures(){
  if (TEXTURES) return TEXTURES;
  TEXTURES = {
    // alone: un ovale morbido, più chiaro al centro
    glow: tex(128, (g, n) => {
      const r = g.createRadialGradient(n/2, n/2, 0, n/2, n/2, n/2);
      r.addColorStop(0, 'rgba(255,250,225,1)'); r.addColorStop(0.42, 'rgba(255,224,90,0.95)'); r.addColorStop(0.7, 'rgba(255,170,30,0.55)'); r.addColorStop(1, 'rgba(255,140,20,0)');
      g.fillStyle = r; g.fillRect(0, 0, n, n);
    }),
    // fiammella: una goccia rovesciata, bianca dentro e arancio fuori
    flame: tex(64, (g, n) => {
      g.translate(n/2, n*0.72);
      const path = () => { g.beginPath(); g.moveTo(0, -0.66*n); g.bezierCurveTo(0.2*n, -0.36*n, 0.26*n, -0.1*n, 0.2*n, 0.06*n); g.arc(0, 0.06*n, 0.2*n, 0, Math.PI); g.bezierCurveTo(-0.26*n, -0.1*n, -0.2*n, -0.36*n, 0, -0.66*n); };
      path(); g.fillStyle = 'rgba(255,140,30,0.9)'; g.fill();
      g.scale(0.6, 0.62); path(); g.fillStyle = 'rgba(255,236,150,1)'; g.fill();
    }),
    // scintilla a quattro punte
    spark: tex(64, (g, n) => {
      g.translate(n/2, n/2); g.fillStyle = '#fffbe6';
      g.beginPath();
      for (let i = 0; i < 8; i++){ const a = i*Math.PI/4, r = i % 2 ? 0.09*n : 0.48*n; g.lineTo(r*Math.sin(a), -r*Math.cos(a)); }
      g.closePath(); g.fill();
    }),
    // nuvoletta grigia con il bordo scuro
    cloud: tex(128, (g, n) => {
      const blobs = [[0.3, 0.58, 0.19], [0.5, 0.45, 0.24], [0.71, 0.58, 0.18], [0.5, 0.64, 0.2]];
      g.fillStyle = '#2b3140';
      for (const [x, y, r] of blobs){ g.beginPath(); g.arc(x*n, y*n, r*n + 4, 0, TAU); g.fill(); }
      g.fillStyle = '#9aa3b5';
      for (const [x, y, r] of blobs){ g.beginPath(); g.arc(x*n, y*n, r*n, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.arc(0.44*n, 0.4*n, 0.11*n, 0, TAU); g.fill();
    }),
    // goccia di pioggia
    drop: tex(64, (g, n) => {
      g.translate(n/2, n*0.62);
      g.beginPath(); g.moveTo(0, -0.5*n); g.bezierCurveTo(0.12*n, -0.25*n, 0.2*n, -0.08*n, 0.2*n, 0.04*n); g.arc(0, 0.04*n, 0.2*n, 0, Math.PI); g.bezierCurveTo(-0.2*n, -0.08*n, -0.12*n, -0.25*n, 0, -0.5*n);
      g.fillStyle = '#7fd3ff'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#123a6b'; g.stroke();
    }),
  };
  return TEXTURES;
}

const sprite = (map, layer, additive = false) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  s.layers.set(layer); s.frustumCulled = false; s.userData.natpfCardFx = true;
  return s;
};
export const AURA_FLAMES = 12, AURA_SPARKS = 5, RAIN_DROPS = 3;

// Un effetto ('aura' | 'nuvola') per il layer del ritratto. update(u, box, head, cam): u tempo del giro (0..1), box
// riquadro del personaggio nel mondo (quello dell'inquadratura), head punto sopra la testa (mondo), cam camera del
// ritratto. Il gruppo va nella scena solo durante la fotografia.
export function createCardFx(kind, layer){
  const T = textures(), group = new THREE.Group();
  group.name = `NatpfCardFx-${kind}`;
  const parts = [];
  if (kind === 'aura'){
    const glow = sprite(T.glow, layer); glow.material.opacity = 0.92; group.add(glow); parts.push(glow);
    for (let i = 0; i < AURA_FLAMES; i++){ const f = sprite(T.flame, layer); group.add(f); parts.push(f); }
    for (let i = 0; i < AURA_SPARKS; i++){ const s = sprite(T.spark, layer, true); group.add(s); parts.push(s); }
  } else if (kind === 'nuvola'){
    const c = sprite(T.cloud, layer); group.add(c); parts.push(c);
    for (let i = 0; i < RAIN_DROPS; i++){ const d = sprite(T.drop, layer); group.add(d); parts.push(d); }
  }
  const _c = new THREE.Vector3(), _back = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  const update = (u, box, head, cam) => {
    box.getCenter(_c);
    const h = box.max.y - box.min.y, w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    // «dietro»: lontano dalla camera; «destra»: di lato per chi guarda
    _back.subVectors(_c, cam.position).setY(0).normalize();
    _right.crossVectors(_back, _up).normalize();
    if (kind === 'aura'){
      const [glow] = parts, R = 0.42*h;
      glow.position.copy(_c).addScaledVector(_back, 0.45*w);
      const pulse = 1 + 0.04*Math.sin(TAU*3*u);
      glow.scale.set(1.25*h*pulse, 1.35*h*pulse, 1);
      for (let i = 0; i < AURA_FLAMES; i++){
        const f = parts[1 + i], a = (i + 0.5)/AURA_FLAMES*TAU, ph = (3*u + i*0.37) % 1;
        // intorno alla sagoma (un ovale), salgono e si spengono; le fiammelle di sotto restano basse
        const x = Math.sin(a)*0.78*R, y = -0.85*Math.cos(a)*R + ph*0.3*h;
        f.position.copy(_c).addScaledVector(_right, x).addScaledVector(_back, 0.2*w); f.position.y += y;
        const s = (0.24 + 0.08*Math.sin(TAU*(u*3 + i*0.21)))*h*(1 - 0.5*ph);
        f.scale.set(0.55*s, s, 1);
        f.material.opacity = 0.85*Math.sin(Math.PI*ph);
      }
      for (let i = 0; i < AURA_SPARKS; i++){
        const sp = parts[1 + AURA_FLAMES + i], a = (i*0.618 % 1)*TAU, ph = (2*u + i/AURA_SPARKS) % 1;
        sp.position.copy(_c).addScaledVector(_right, Math.sin(a)*0.62*R).addScaledVector(_back, -0.1*w); sp.position.y += Math.cos(a)*0.85*R;
        const s = 0.09*h*Math.sin(Math.PI*ph);
        sp.scale.set(s, s, 1); sp.material.opacity = Math.sin(Math.PI*ph);
      }
    } else if (kind === 'nuvola'){
      const [cloud] = parts, cw = 0.36*h, bob = 0.012*h*Math.sin(TAU*u);
      cloud.position.copy(head); cloud.position.y += 0.11*h + bob;
      cloud.scale.set(cw, 0.72*cw, 1);
      for (let i = 0; i < RAIN_DROPS; i++){
        const d = parts[1 + i], ph = (2*u + i/RAIN_DROPS) % 1;
        d.position.copy(cloud.position).addScaledVector(_right, (i - 1)*0.26*cw); d.position.y -= 0.12*cw + ph*0.2*h;
        const s = 0.07*h; d.scale.set(0.7*s, s, 1);
        d.material.opacity = Math.min(1, 4*(1 - ph))*Math.min(1, 6*ph);
      }
    }
  };
  // quanto allargare il riquadro dell'inquadratura perché l'effetto ci stia (frazioni dell'altezza)
  const pad = kind === 'nuvola' ? { top: 0.3, side: 0.02 } : kind === 'aura' ? { top: 0.12, side: 0.12, bottom: 0.02 } : null;
  return { kind, group, parts, update, pad };
}
