// Bersagli 3D dei minigiochi: tabelloni ad anelli su un supporto, piantati nel campo avversario, che la palla colpisce
// davvero. A ogni fotogramma si controlla se la palla (colpita dal giocatore) attraversa il piano del bersaglio: il punto
// d'attraversamento dà la distanza dal centro e quindi la zona (natpf_arcade.zoneScore). Colpito, il bersaglio si
// piega all'indietro con una molla, scintilla, lancia schegge e sparisce; la palla rimbalza indietro.
// Ancora: ZONE di precisione (cerchi a terra animati) per il minigioco Precision. Solo primitive three.js.
import * as THREE from 'three';
import { zoneScore } from './natpf_arcade.js';

const RING_COLORS = Object.freeze([0xffffff, 0x2f6bff, 0xff3d8b, 0xe3ff36]);   // bordo, anello, anello, centro
const GOLD = 0xffc93c;
// attraversamento del piano z = zt tra due posizioni: punto d'incrocio o null
export function crossing(prev, cur, zt){
  if (!prev || !cur) return null;
  const a = prev.z - zt, b = cur.z - zt;
  if (a === b || (a > 0) === (b > 0) && a !== 0) return null;
  const k = a/(a - b);
  return { x: prev.x + (cur.x - prev.x)*k, y: prev.y + (cur.y - prev.y)*k, z: zt };
}

function boardMesh(r, gold){
  const g = new THREE.Group();
  const mats = (gold ? [GOLD, 0xfff1b0, GOLD, 0xffffff] : RING_COLORS).map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: gold ? .55 : .05, emissive: gold ? 0x553300 : 0x000000, side: THREE.DoubleSide }));
  // anelli dall'esterno: raggi relativi come le zone del punteggio (100%, 65%, 30%)
  const radii = [[.65, 1], [.3, .65], [.12, .3], [0, .12]];
  radii.forEach(([a, b], i) => {
    const m = new THREE.Mesh(a ? new THREE.RingGeometry(a*r, b*r, 40) : new THREE.CircleGeometry(b*r, 32), mats[i]);
    m.position.z = .004*(i + 1); g.add(m);
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, .035, 8, 40), new THREE.MeshStandardMaterial({ color: gold ? GOLD : 0x0b1430, metalness: .5, roughness: .3 }));
  g.add(rim);
  const back = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshStandardMaterial({ color: 0x16224f, roughness: .8 }));
  back.rotation.y = Math.PI; back.position.z = -.01; g.add(back);
  return g;
}

export class TargetField {
  constructor(engine){
    this.engine = engine; this.group = null; this.targets = []; this.zones = []; this.sparks = [];
    this.prev = new THREE.Vector3(); this.hasPrev = false; this.id = 0;
  }
  _ensure(){
    if (this.group) return;
    this.group = new THREE.Group(); this.group.name = 'natpf-targets';
    this.engine.scene?.add(this.group);
  }
  // bersaglio { x, z, y, r, gold, move } (natpf_arcade.rushTarget)
  add(t){
    this._ensure();
    const root = new THREE.Group(), pivot = new THREE.Group(), board = boardMesh(t.r, t.gold);
    // supporto: palo e base; il tabellone ruota sul fondo (si piega all'indietro quando è colpito)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, t.y, 10), new THREE.MeshStandardMaterial({ color: 0xc9d2e6, metalness: .6, roughness: .3 }));
    pole.position.y = t.y/2;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, .08, 18), new THREE.MeshStandardMaterial({ color: 0x0b1430, roughness: .7 }));
    base.position.y = .04;
    pivot.position.y = t.y - t.r*.15; board.position.y = t.r*.15;
    pivot.add(board); root.add(pole, base, pivot);
    root.position.set(t.x, 0, t.z);
    root.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    root.scale.setScalar(.01);
    this.group.add(root);
    const T = { ...t, id: ++this.id, root, pivot, board, baseX: t.x, age: 0, hit: null, alive: true };
    this.targets.push(T);
    return T;
  }
  clear(){
    for (const T of this.targets) this.group?.remove(T.root);
    for (const Z of this.zones) this.group?.remove(Z.root);
    for (const s of this.sparks) this.group?.remove(s.pts);
    this.targets = []; this.zones = []; this.sparks = []; this.hasPrev = false;
  }
  dispose(){ this.clear(); if (this.group) this.engine.scene?.remove(this.group); this.group = null; }
  get alive(){ return this.targets.filter(T => T.alive); }
  // zona a terra (Precision): cerchio pulsante con il centro evidenziato
  zone(z){
    this._ensure();
    for (const Z of this.zones) this.group.remove(Z.root);
    const root = new THREE.Group(); root.position.set(z.x, .015, z.z);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(z.r, 48), new THREE.MeshBasicMaterial({ color: 0xe3ff36, transparent: true, opacity: .22, depthWrite: false }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(z.r - .08, z.r, 64), new THREE.MeshBasicMaterial({ color: 0xe3ff36, transparent: true, opacity: .95, depthWrite: false }));
    const mid = new THREE.Mesh(new THREE.RingGeometry(z.r*.5 - .05, z.r*.5, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthWrite: false }));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(.14, 24), new THREE.MeshBasicMaterial({ color: 0xff3d8b, depthWrite: false }));
    for (const m of [fill, ring, mid, dot]){ m.rotation.x = -Math.PI/2; root.add(m); }
    root.renderOrder = 4; this.group.add(root);
    const Z = { ...z, root, ring, fill, t: 0, mark: null };
    this.zones = [Z];
    return Z;
  }
  // segno dove è atterrata la palla (Precision): un punto che resta finché non cambia zona
  markLanding(p, good){
    const Z = this.zones[0]; if (!Z) return;
    const dot = new THREE.Mesh(new THREE.RingGeometry(.1, .2, 24), new THREE.MeshBasicMaterial({ color: good ? 0x36e07a : 0xff4f61, transparent: true, depthWrite: false }));
    dot.rotation.x = -Math.PI/2; dot.position.set(p.x - Z.x, .01, p.z - Z.z); Z.root.add(dot);
  }
  // A ogni fotogramma: movimento, comparsa, animazioni, e controllo della palla. Restituisce i bersagli colpiti
  // in questo fotogramma: [{ target, dist, points, zone, at }]
  tick(dt){
    const out = [], E = this.engine, b = E.ball;
    const live = b && b.inPlay && b.lastHitter === 'player' && b.vel.z < 0;
    for (const T of this.targets){
      T.age += dt;
      if (T.alive && !T.hit){
        const s = Math.min(1, T.age/.35), pop = s < 1 ? 1 + Math.sin(s*Math.PI)*.25 : 1;
        T.root.scale.setScalar(Math.max(.01, s*pop));
        if (T.move){ T.x = T.baseX + Math.sin(T.age*T.move.speed + T.move.phase)*T.move.amp; T.root.position.x = T.x; }
        if (T.gold) T.board.rotation.z += dt*1.5;
      }
      if (T.hit){
        T.hit.t += dt;
        const k = T.hit.t;
        // molla: si piega all'indietro e oscilla, poi si rimpicciolisce e sparisce
        T.pivot.rotation.x = -1.35*(1 - Math.exp(-k*9)) + Math.sin(k*18)*Math.exp(-k*5)*.25;
        T.board.rotation.z += dt*(6 - k*6);
        if (k > .7) T.root.scale.setScalar(Math.max(.01, 1 - (k - .7)/.35));
        if (k > 1.05){ T.alive = false; this.group.remove(T.root); }
      }
    }
    this.targets = this.targets.filter(T => T.alive || T.hit?.t <= 1.05);
    if (live && this.hasPrev){
      for (const T of this.targets){
        if (!T.alive || T.hit || T.age < .3) continue;
        const p = crossing(this.prev, b.pos, T.z);
        if (!p) continue;
        const cy = T.y;   // centro del tabellone (supporto a T.y, tabellone centrato lì)
        const dist = Math.hypot(p.x - T.x, p.y - cy), sc = zoneScore(dist, T.r);
        if (!sc.points) continue;
        T.hit = { t: 0 };
        out.push({ target: T, dist, points: sc.points, zone: sc.zone, at: new THREE.Vector3(p.x, p.y, p.z) });
        this._burst(new THREE.Vector3(p.x, p.y, p.z), T.gold ? 0xffc93c : sc.zone === 'centro' ? 0xe3ff36 : 0xffffff, sc.zone === 'centro' ? 40 : 24);
        // la palla rimbalza indietro dal tabellone e cade
        b.vel.z = Math.abs(b.vel.z)*.22; b.vel.x *= .4; b.vel.y = Math.max(1.2, b.vel.y*.3);
        break;
      }
    }
    if (b){ this.prev.copy(b.pos); this.hasPrev = !!live; }
    for (const Z of this.zones){ Z.t += dt; Z.ring.material.opacity = .65 + Math.sin(Z.t*4)*.3; Z.fill.material.opacity = .16 + Math.sin(Z.t*4)*.06; }
    for (const s of this.sparks){
      s.t += dt; const a = s.pts.geometry.attributes.position.array;
      for (let i = 0; i < s.v.length; i++){ s.v[i].y -= 9.8*dt; a[i*3] += s.v[i].x*dt; a[i*3 + 1] += s.v[i].y*dt; a[i*3 + 2] += s.v[i].z*dt; }
      s.pts.geometry.attributes.position.needsUpdate = true; s.pts.material.opacity = Math.max(0, 1 - s.t/.8);
    }
    for (const s of this.sparks.filter(s => s.t > .8)) this.group.remove(s.pts);
    this.sparks = this.sparks.filter(s => s.t <= .8);
    return out;
  }
  _burst(at, color, n = 24){
    this._ensure();
    const pos = new Float32Array(n*3), v = [];
    for (let i = 0; i < n; i++){
      pos.set([at.x, at.y, at.z], i*3);
      const a = Math.random()*Math.PI*2, e = Math.random()*Math.PI*.6, sp = 2 + Math.random()*4;
      v.push({ x: Math.cos(a)*Math.cos(e)*sp, y: Math.sin(e)*sp + 1, z: Math.sin(a)*Math.cos(e)*sp*.6 + 1.5 });
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: .12, transparent: true, depthWrite: false }));
    this.group.add(pts); this.sparks.push({ pts, v, t: 0 });
  }
}
