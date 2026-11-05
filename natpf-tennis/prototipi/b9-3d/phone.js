// Prototipo B9 «3D realistico» — telefono generico (nessun marchio): 162 × 79 × 8,6 mm, angoli arrotondati 8,5 mm,
// cornice metallica satinata, vetro anteriore con lo schermo «Pronto» della pagina racchetta acceso, retro in vetro
// scuro con un modulo fotocamere generico. Riferimento: y cima, +z schermo, +x bordo destro guardando lo schermo.
import * as THREE from 'three';
import { PHONE } from './hand.js';

function roundRectShape(w, h, r){
  const s = new THREE.Shape(), x = -w/2, y = -h/2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// UV normalizzati sul rettangolo (ShapeGeometry li dà in metri)
function normalizeUV(geo, w, h){
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i)/w + .5, p.getY(i)/h + .5);
  uv.needsUpdate = true; return geo;
}

// schermo «Pronto» come nella pagina del telefono (foto dell'utente): anello verde, testo, pulsanti in basso
export function screenCanvas(mirror = false){
  const W = 540, H = 1110, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (mirror){ g.translate(W, 0); g.scale(-1, 1); }
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  // area attiva con angoli arrotondati (bordo nero ~2 mm)
  const m = 14, r = 46;
  g.save(); g.beginPath(); g.roundRect(m, m, W - 2*m, H - 2*m, r); g.clip();
  const bg = g.createLinearGradient(0, 0, W*.3, H); bg.addColorStop(0, '#1a2a9c'); bg.addColorStop(.55, '#14207a'); bg.addColorStop(1, '#0c1450');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W/2, 470, 40, W/2, 470, 330); glow.addColorStop(0, 'rgba(90,120,255,.45)'); glow.addColorStop(1, 'rgba(90,120,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  // barra di stato e «Collegato al computer»
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 26px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('9:41', 52, 64);
  g.textAlign = 'right'; g.fillText('▮▮▮ 86%', W - 52, 64);
  g.fillStyle = '#3ee08f'; g.beginPath(); g.arc(60, 128, 9, 0, Math.PI*2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.8)'; g.textAlign = 'left'; g.font = '500 25px system-ui, sans-serif'; g.fillText('Collegato al computer', 80, 137);
  // anello «Pronto»
  g.lineWidth = 14; g.strokeStyle = '#3ee08f'; g.shadowColor = 'rgba(62,224,143,.8)'; g.shadowBlur = 26;
  g.beginPath(); g.arc(W/2, 470, 150, 0, Math.PI*2); g.stroke(); g.shadowBlur = 0;
  g.fillStyle = 'rgba(20,32,120,.85)'; g.beginPath(); g.arc(W/2, 470, 140, 0, Math.PI*2); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '700 64px system-ui, sans-serif'; g.fillText('Pronto', W/2, 492);
  g.fillStyle = 'rgba(255,255,255,.78)'; g.font = '500 27px system-ui, sans-serif'; g.fillText('Guarda il computer per iniziare', W/2, 700);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '400 23px system-ui, sans-serif';
  g.fillText('Dai un colpetto quando la palla', W/2, 860); g.fillText('arriva alla racchetta sul computer', W/2, 892);
  // pulsanti
  const btn = (x, label) => { g.fillStyle = 'rgba(70,96,255,.55)'; g.beginPath(); g.roundRect(x, 960, 150, 66, 33); g.fill(); g.fillStyle = '#fff'; g.font = '600 25px system-ui, sans-serif'; g.fillText(label, x + 75, 1002); };
  btn(30, 'Ricalibra'); btn(195, 'Ricollega'); btn(360, 'Scollega');
  g.restore();
  return c;
}

export function buildPhone(renderer){
  const { w, h, d, corner } = PHONE;
  const group = new THREE.Group();
  const frameM = new THREE.MeshPhysicalMaterial({ color: 0x8d9198, metalness: 1, roughness: .32, clearcoat: .2, clearcoatRoughness: .3 });
  // corpo: rettangolo arrotondato estruso con lo smusso dei bordi
  const bevel = .0011, depth = d - 2*bevel;
  const body = new THREE.ExtrudeGeometry(roundRectShape(w - 2*bevel, h - 2*bevel, corner - bevel), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 10 });
  body.translate(0, 0, -depth/2);
  const frame = new THREE.Mesh(body, frameM); frame.castShadow = true; frame.receiveShadow = true; group.add(frame);
  // vetro anteriore con lo schermo acceso
  const tex = new THREE.CanvasTexture(screenCanvas());
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer?.capabilities.getMaxAnisotropy?.() || 4;
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.25, roughness: .06, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, reflectivity: .5 });
  const gw = w - .0012, gh = h - .0012;
  const front = new THREE.Mesh(normalizeUV(new THREE.ShapeGeometry(roundRectShape(gw, gh, corner - .0006), 12), gw, gh), glassM);
  front.position.z = d/2 + .00005; group.add(front);
  // retro in vetro scuro e modulo fotocamere (generico)
  const backM = new THREE.MeshPhysicalMaterial({ color: 0x1d2027, roughness: .32, metalness: .1, clearcoat: 1, clearcoatRoughness: .12 });
  const back = new THREE.Mesh(new THREE.ShapeGeometry(roundRectShape(gw, gh, corner - .0006), 12), backM);
  back.rotation.y = Math.PI; back.position.z = -d/2 - .00005; group.add(back);
  const isl = new THREE.ExtrudeGeometry(roundRectShape(.030, .042, .008), { depth: .0008, bevelEnabled: true, bevelThickness: .0004, bevelSize: .0004, bevelSegments: 2 });
  const island = new THREE.Mesh(isl, new THREE.MeshPhysicalMaterial({ color: 0x2a2e36, roughness: .25, metalness: .3, clearcoat: 1 }));
  island.rotation.y = Math.PI; island.position.set(w/2 - .021, h/2 - .028, -d/2 - .0001); group.add(island);
  const ringM = new THREE.MeshPhysicalMaterial({ color: 0xa9adb5, metalness: 1, roughness: .25 }), lensM = new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: .05, clearcoat: 1, metalness: 0 });
  [[.0070, .0105], [.0070, -.0005], [-.0055, .0050]].forEach(([x, y], i) => {
    const r = i < 2 ? .0052 : .0036;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .0014, 28), ringM); ring.rotation.x = Math.PI/2;
    ring.position.set(w/2 - .021 - x, h/2 - .028 + y, -d/2 - .0016); group.add(ring);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(r*.72, r*.72, .0016, 28), lensM); lens.rotation.x = Math.PI/2;
    lens.position.set(w/2 - .021 - x, h/2 - .028 + y, -d/2 - .0019); group.add(lens);
  });
  // tasti sul bordo destro
  const keyM = frameM;
  [[.030, .020], [-.004, .034]].forEach(([y, l]) => {
    const k = new THREE.Mesh(new THREE.CapsuleGeometry(.0011, l, 4, 8), keyM); k.position.set(w/2 + .0004, y, 0); group.add(k);
  });
  group.traverse(o => { if (o.isMesh){ o.castShadow = true; } });
  front.castShadow = false;
  return { group, screen: front, screenTex: tex, setMirror(m){ const c = screenCanvas(m); tex.image = c; tex.needsUpdate = true; } };
}
