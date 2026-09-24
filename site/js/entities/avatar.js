// Avatar a blocchi: busto, gambe e braccia in pochi oggetti con colori per vertice (pochi disegni anche con molti NPC).
// Le pose (fermo, cammina, corre, salta, colpisce, esulta, seduto) si impostano con pose().
import * as THREE from 'three';

const MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
const unit = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const col = new THREE.Color();

// fonde una lista di scatole [w,h,d, colore, x,y,z] in un'unica geometria colorata
function boxes(list){
  const P = unit.attributes.position.array, N = unit.attributes.normal.array, n = P.length/3;
  const pos = new Float32Array(list.length*n*3), nor = new Float32Array(list.length*n*3), cols = new Float32Array(list.length*n*3);
  list.forEach(([w, h, d, c, x, y, z], k) => {
    col.set(c); const o = k*n*3;
    for (let i = 0; i < n; i++){
      pos[o + i*3] = P[i*3]*w + x; pos[o + i*3 + 1] = P[i*3 + 1]*h + y; pos[o + i*3 + 2] = P[i*3 + 2]*d + z;
      nor[o + i*3] = N[i*3]; nor[o + i*3 + 1] = N[i*3 + 1]; nor[o + i*3 + 2] = N[i*3 + 2];
      cols[o + i*3] = col.r; cols[o + i*3 + 1] = col.g; cols[o + i*3 + 2] = col.b;
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

export const SKINS = [0xf0d0b4, 0xe8c2a0, 0xe0b48f, 0xd6a67e, 0xb07a52, 0x8a5a3a];
export const DEFAULT_LOOK = { shirt: 0x1f4fa3, shorts: 0xffffff, cap: 0xffffff, skin: 0xe0b48f, shoes: 0xf7f7f7, racket: 0x1f4fa3, hair: 0x3a2a1c, hasRacket: true, hasCap: true };

export function makeAvatar(look = {}, scale = 1){
  const L = { ...DEFAULT_LOOK, ...look };
  const g = new THREE.Group();
  const mesh = (list, parent) => { const m = new THREE.Mesh(boxes(list), MAT); m.castShadow = true; parent.add(m); return m; };
  const limb = (x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); g.add(p); return p; };
  const body = new THREE.Group(); g.add(body);
  const legL = limb(.16, .95), legR = limb(-.16, .95), armL = limb(.47, 1.64), armR = limb(-.47, 1.64);
  const parts = { g, body, legL, legR, armL, armR, look: L, meshes: [] };
  const build = () => {
    for (const m of parts.meshes){ m.parent.remove(m); m.geometry.dispose(); }
    const head = [
      [.72, .74, .42, L.shirt, 0, 1.32, 0], [.2, .12, .03, 0xffffff, .14, 1.5, .22],
      [.46, .46, .46, L.skin, 0, 1.94, 0],
      [.07, .07, .02, 0x1d2430, .1, 1.97, .235], [.07, .07, .02, 0x1d2430, -.1, 1.97, .235],
      L.hasCap ? [.48, .12, .48, L.cap, 0, 2.2, 0] : [.48, .14, .48, L.hair, 0, 2.2, -.01],
      L.hasCap ? [.46, .05, .24, L.cap, 0, 2.15, .32] : [.48, .3, .1, L.hair, 0, 2.02, -.21],
    ];
    const leg = [[.3, .42, .32, L.shorts, 0, -.21, 0], [.24, .44, .26, L.skin, 0, -.62, 0], [.28, .12, .38, L.shoes, 0, -.9, .04]];
    const arm = [[.22, .3, .26, L.shirt, 0, -.15, 0], [.19, .46, .21, L.skin, 0, -.52, 0]];
    const armWithRacket = L.hasRacket ? arm.concat([[.06, .36, .06, 0x222222, 0, -.93, .05], [.34, .42, .05, L.racket, 0, -1.28, .05], [.26, .34, .06, 0xe9e2c6, 0, -1.28, .05]]) : arm;
    parts.meshes = [mesh(head, body), mesh(leg, legL), mesh(leg, legR), mesh(arm, armL), mesh(armWithRacket, armR)];
  };
  build();
  parts.setLook = look2 => { Object.assign(L, look2); build(); };
  g.scale.setScalar(scale);
  return parts;
}

// posa dell'avatar. s: { state, phase, amt, swing (0..1), t }
export function pose(av, s){
  const { legL, legR, armL, armR, body } = av;
  const st = s.state || 'idle', amt = s.amt ?? 1, ph = s.phase || 0, t = s.t || 0;
  let lL = 0, lR = 0, aL = 0, aR = 0, aRz = 0, aLz = 0, lean = 0, by = 0;
  if (st === 'walk' || st === 'run'){
    const k = st === 'run' ? 1 : .75, sw = Math.sin(ph)*k*amt;
    lL = sw; lR = -sw; aL = -sw*.8; aR = sw*.8; lean = st === 'run' ? .12*amt : 0; by = Math.abs(Math.cos(ph))*.05*amt;
  } else if (st === 'jump'){
    lL = -.7; lR = -.3; aL = -2.6; aR = -2.4; aLz = .2; aRz = -.2;
  } else if (st === 'cheer'){
    aL = -2.9 + Math.sin(t*8)*.25; aR = -2.9 - Math.sin(t*8)*.25; by = Math.abs(Math.sin(t*8))*.08;
  } else if (st === 'sit'){
    lL = lR = -1.45; by = -.45; aL = aR = -.3;
  } else if (st === 'talk'){
    aR = -.6 + Math.sin(t*3)*.25; aL = Math.sin(t*2.3)*.1; aRz = -.2;
  } else if (st === 'wave'){
    aR = -2.8; aRz = -.3 + Math.sin(t*10)*.35;
  } else { // fermo: respiro leggero
    by = Math.sin(t*2)*.012; aL = Math.sin(t*2)*.04; aR = -Math.sin(t*2)*.04;
  }
  // colpo: il braccio destro carica e chiude (sovrascrive la posa del braccio)
  if (s.swing > 0){
    const u = 1 - s.swing;             // 0 → 1 durante il colpo
    if (s.overhead){ aR = -3 + u*3.4; aRz = 0; }
    else { aR = -1.2 + Math.sin(u*Math.PI)*-.6; aRz = -1.6 + u*3.2; }
  }
  legL.rotation.x = lL; legR.rotation.x = lR; armL.rotation.x = aL; armR.rotation.x = aR;
  armR.rotation.z = aRz; armL.rotation.z = aLz; body.rotation.x = lean; body.position.y = by;
  legL.position.y = legR.position.y = .95 + Math.min(0, by);
  armL.position.y = armR.position.y = 1.64 + by;
}

// mette l'avatar nel punto (lx,lz) del sistema locale F, girato di ry rispetto all'impianto
export function placeOn(av, F, lx, lz, ry, y = 0){ const [x, z] = F.w(lx, lz); av.g.position.set(x, y, z); av.g.rotation.y = F.rot + ry; }
