// Lanciapalle 3D del riscaldamento e dei minigiochi. Prima la palla nasceva dal nulla oltre la rete (z = −11,6) e
// in campo non c'era niente: ora c'è una macchina vera, costruita con primitive three.js (nessun file da scaricare,
// poche decine di triangoli per parte), che si sposta lungo la riga di fondo, ruota la canna verso il bersaglio e
// spara. La palla parte dalla bocca della canna, nello stesso istante del rinculo, del lampo e del suono.
//
//   const m = new NatpfBallMachine(engine);  m.show(true);
//   const start = m.fire(target, { flight, profile });   // posizione della bocca (Vector3) da cui lanciare la palla
//   m.tick(dt)                                            // a ogni fotogramma (animazioni)
//
// Profili di lancio (funzioni pure, per i test): velocità, altezza e rotazione cambiano con il profilo e il livello.
import * as THREE from 'three';

// riga di fondo dell'avversario: z = −11,885. La macchina sta appena dietro, la bocca della canna a ~1 m
// scale: più grande del vero (1,6×), come negli arcade sportivi: alla scala reale da fondo campo si vedeva appena
export const MACHINE = Object.freeze({ z: -12.6, minX: -3.6, maxX: 3.6, muzzleY: 1.05, barrel: .62, slideSpeed: 3.2, scale: 1.6 });

// Profili: flight = secondi di volo fino al rimbalzo (meno = più veloce), spin = topspin del motore
export const FEED_PROFILES = Object.freeze({
  soft:    { flight: 1.35, spin: 8,  label: 'Palla lenta' },
  rally:   { flight: 1.15, spin: 10, label: 'Palla da scambio' },
  fast:    { flight: .92,  spin: 13, label: 'Palla veloce' },
  heavy:   { flight: 1.02, spin: 22, label: 'Topspin carico' },
  slice:   { flight: 1.25, spin: -6, label: 'Palla tagliata' },
  lob:     { flight: 1.9,  spin: 5,  label: 'Palla alta' },
  short:   { flight: 1.1,  spin: 4,  label: 'Palla corta' },
});
// profilo per un livello di difficoltà 0…1 (Survival, Target Rush): più veloce e più vario salendo
export function feedForLevel(level = 0, rand = Math.random){
  const l = Math.max(0, Math.min(1, level));
  const pool = l < .25 ? ['soft', 'rally'] : l < .5 ? ['rally', 'rally', 'fast', 'slice'] : l < .75 ? ['rally', 'fast', 'heavy', 'slice', 'short'] : ['fast', 'heavy', 'slice', 'short', 'lob', 'fast'];
  const id = pool[Math.floor(rand()*pool.length) % pool.length], p = FEED_PROFILES[id];
  // il volo si accorcia un poco con il livello anche dentro lo stesso profilo (minimo 0,72 s: resta giocabile)
  return { id, ...p, flight: Math.max(.72, +(p.flight*(1 - .18*l)).toFixed(3)) };
}
// posizione laterale della macchina per una palla verso targetX: si sposta poco, così la diagonale si vede
export const machineXFor = (targetX, rand = Math.random) => Math.max(MACHINE.minX, Math.min(MACHINE.maxX, -targetX*.35 + (rand() - .5)*2.2));

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .15, ...o });

export class NatpfBallMachine {
  constructor(engine){
    this.engine = engine;
    this.root = null;
    this.x = 0; this.targetX = 0; this.yaw = 0; this.targetYaw = 0; this.pitch = .18;
    this.recoil = 0; this.flash = 0; this.spinner = 0; this.shots = 0;
  }
  _build(){
    const g = new THREE.Group(); g.name = 'natpf-ball-machine';
    const body = mat(0xf3f5fb, { roughness: .35 }), trim = mat(0xe8ff3a, { roughness: .4 }), dark = mat(0x111833, { roughness: .8 }), accent = mat(0xff3d8b, { roughness: .4 }), steel = mat(0xb9c3d6, { metalness: .6, roughness: .3 });
    // carrello con ruote
    const base = new THREE.Mesh(new THREE.BoxGeometry(.9, .42, .72), body); base.position.y = .33; g.add(base);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(.92, .07, .74), trim); stripe.position.y = .47; g.add(stripe);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(.92, .05, .74), accent); skirt.position.y = .15; g.add(skirt);
    const wheelG = new THREE.CylinderGeometry(.13, .13, .08, 18);
    for (const [x, z] of [[-.42, -.24], [.42, -.24], [-.42, .24], [.42, .24]]){
      const w = new THREE.Mesh(wheelG, dark); w.rotation.z = Math.PI/2; w.position.set(x, .13, z); g.add(w);
    }
    // cesto delle palle: tronco di cono aperto con le palle dentro
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(.42, .26, .42, 20, 1, true), mat(0x9fb4ff, { transparent: true, opacity: .35, side: THREE.DoubleSide, roughness: .1 }));
    hopper.position.set(0, .78, .1); g.add(hopper);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.42, .025, 6, 24), steel); rim.rotation.x = Math.PI/2; rim.position.set(0, .99, .1); g.add(rim);
    const ballMat = mat(0xd8ff2e, { roughness: .9, metalness: 0 }), ballG = new THREE.SphereGeometry(.068, 10, 8);
    this.balls = new THREE.Group(); this.balls.position.set(0, .66, .1); g.add(this.balls);
    for (let i = 0; i < 14; i++){
      const a = i*2.4, r = .08 + (i % 4)*.055, b = new THREE.Mesh(ballG, ballMat);
      b.position.set(Math.cos(a)*r, Math.floor(i/5)*.11 + (i % 2)*.03, Math.sin(a)*r); this.balls.add(b);
    }
    // testa girevole con la canna (ruota verso il bersaglio)
    this.head = new THREE.Group(); this.head.position.set(0, .62, -.18); g.add(this.head);
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(.2, .22, .26, 20), body); housing.rotation.x = Math.PI/2; this.head.add(housing);
    this.tilt = new THREE.Group(); this.head.add(this.tilt);
    this.barrel = new THREE.Group(); this.tilt.add(this.barrel);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.085, .1, MACHINE.barrel, 18), steel);
    tube.rotation.x = Math.PI/2; tube.position.z = MACHINE.barrel/2; this.barrel.add(tube);
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(.09, .022, 6, 18), trim); muzzle.position.z = MACHINE.barrel; this.barrel.add(muzzle);
    // ruote di lancio dentro la testa (si vedono girare dai lati)
    this.wheels = [];
    for (const x of [-.13, .13]){ const w = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .04, 14), dark); w.rotation.z = Math.PI/2; w.position.set(x, 0, .02); this.head.add(w); this.wheels.push(w); }
    // spia: verde pronta, gialla al lancio
    this.led = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2bd36b })); this.led.position.set(.32, .5, -.37); g.add(this.led);
    // lampo alla bocca
    this.flashMesh = new THREE.Mesh(new THREE.RingGeometry(.05, .2, 20), new THREE.MeshBasicMaterial({ color: 0xfff6b0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    this.flashMesh.position.z = MACHINE.barrel + .02; this.barrel.add(this.flashMesh);
    g.traverse(o => { if (o.isMesh && o !== this.flashMesh){ o.castShadow = true; o.receiveShadow = true; } });
    g.scale.setScalar(MACHINE.scale);
    g.position.set(0, 0, MACHINE.z);
    g.visible = false;
    this.engine.scene?.add(g);
    this.root = g;
  }
  get visible(){ return !!this.root?.visible; }
  show(on = true){
    if (!this.root){ if (!on) return; this._build(); }
    this.root.visible = !!on;
  }
  // posizione della bocca della canna nel mondo
  muzzle(out = new THREE.Vector3()){
    if (!this.root) return out.set(this.x, MACHINE.muzzleY, MACHINE.z + .5);
    this.root.updateMatrixWorld(true);
    return this.barrel.localToWorld(out.set(0, 0, MACHINE.barrel + .05));
  }
  // Spara verso target (Vector3 al rimbalzo): orienta subito la canna (la palla deve uscire dalla bocca giusta),
  // avvia rinculo, lampo, ruote e suono, e restituisce la posizione di partenza della palla.
  fire(target, { profile = null, moveAfter = true } = {}){
    this.show(true);
    this.yaw = this.targetYaw = Math.atan2(target.x - this.x, target.z - MACHINE.z);
    this.pitch = profile?.id === 'lob' ? .55 : profile?.id === 'short' ? .05 : .18;
    this._apply();
    const start = this.muzzle();
    this.recoil = 1; this.flash = 1; this.spinner = 1; this.shots++;
    this.engine.audioEngine?.playMachineLaunch?.(profile?.id || 'rally');
    // dopo il colpo si sposta verso la prossima posizione (si vede muoversi tra una palla e l'altra)
    if (moveAfter) this.targetX = machineXFor(target.x);
    return start;
  }
  // posizione laterale voluta (minigiochi: la macchina che si muove è parte della difficoltà)
  moveTo(x){ this.targetX = Math.max(MACHINE.minX, Math.min(MACHINE.maxX, x)); }
  _apply(){
    if (!this.root) return;
    this.root.position.x = this.x;
    this.head.rotation.y = this.yaw;
    this.tilt.rotation.x = -this.pitch;
    this.barrel.position.z = -.09*this.recoil;
  }
  tick(dt){
    if (!this.root?.visible) return;
    const d = this.targetX - this.x, step = MACHINE.slideSpeed*dt;
    this.x += Math.abs(d) <= step ? d : Math.sign(d)*step;
    // la testa torna verso il giocatore quando la macchina si muove
    const p = this.engine.player?.pos, want = p ? Math.atan2(p.x - this.x, p.z - MACHINE.z) : 0;
    this.targetYaw = want; this.yaw += (this.targetYaw - this.yaw)*Math.min(1, dt*3);
    this.recoil = Math.max(0, this.recoil - dt*6);
    this.flash = Math.max(0, this.flash - dt*7);
    this.spinner = Math.max(.25, this.spinner - dt*1.5);
    for (const w of this.wheels) w.rotation.x += dt*40*this.spinner;
    this.flashMesh.material.opacity = this.flash*.9; this.flashMesh.scale.setScalar(1 + (1 - this.flash)*1.6);
    this.led.material.color.setHex(this.flash > .05 ? 0xe8ff3a : 0x2bd36b);
    // le palle nel cesto sobbalzano al lancio
    this.balls.position.y = .66 + Math.sin(this.recoil*Math.PI)*.03;
    this._apply();
  }
}
