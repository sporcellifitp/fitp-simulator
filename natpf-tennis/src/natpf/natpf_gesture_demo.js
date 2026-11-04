// Dimostrazione 3D dei gesti del tutorial: un giocatore stilizzato con il telefono nel pugno (proporzioni di uno
// smartphone Android grande, tipo Samsung S24 Ultra: 162 × 79 × 8,6 mm, angoli quasi squadrati, cornice in titanio,
// quattro fotocamere in colonna) esegue i moti di natpf_gesture_motion.js — gli stessi che i test fanno riconoscere
// al rilevatore vero del telefono. Visto da dietro, sopra la spalla del braccio che colpisce: destra e sinistra sono
// quelle di chi guarda lo schermo. Davanti c'è lo schermo del computer, sotto un pezzo di campo.
//
//   const demo = new NatpfGestureDemo({ width: 240, height: 240 });
//   demo.mount(el); demo.play('forehand', { hand: 'right', speed: .5 });  ...  demo.stop()
//
// Una sola istanza WebGL per tutto il gioco (getGestureDemo): il canvas si sposta da un riquadro all'altro. Senza
// WebGL (test, browser vecchi) available è false e chi la usa mostra la figura statica della presa.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GESTURES, GRIP_POSE, GRIP_STYLE, strokePose, strokeTimeline, strokeFor, serveTimeline, tossBall } from './natpf_gesture_motion.js';

const D = Math.PI/180;
// telefono più grande del vero (1,5×) per leggerne l'orientamento anche nel riquadro piccolo: il moto non cambia
const PHONE = Object.freeze({ w: .079, h: .162, d: .0086, scale: 1.9 });
const SHOULDER = new THREE.Vector3(.19, 1.42, 0);
const ARM = Object.freeze({ upper: .30, fore: .29 });
const C = Object.freeze({ skin: 0xf0c7a0, shirt: 0xf4f6fb, shorts: 0x16224f, frame: 0x5b5f6a, back: 0x2a2d35, glass: 0x0b0f1d, accent: 0xe8ff3a, pink: 0xff3d8b, court: 0x2f6bff, line: 0xffffff, ball: 0xd8ff2e });

function screenTexture(){
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256); grad.addColorStop(0, '#16224f'); grad.addColorStop(1, '#2f6bff');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#e8ff3a'; g.beginPath(); g.arc(64, 98, 26, 0, Math.PI*2); g.fill();
  g.strokeStyle = '#16224f'; g.lineWidth = 4; g.beginPath(); g.arc(40, 98, 26, -.9, .9); g.stroke(); g.beginPath(); g.arc(88, 98, 26, Math.PI - .9, Math.PI + .9); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 22px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('NATPF', 64, 170);
  g.font = '13px system-ui, sans-serif'; g.fillText('racchetta', 64, 190);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function labelTexture(text){
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold 30px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(text, 128, 42);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .6, metalness: 0, ...o });
const capsule = (r, l, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), m);

// Telefono in mano, nel riferimento del telefono: asse lungo y, display verso +z (verso chi gioca, con la posa identità),
// bordo +x a destra. Presa nel palmo (dal 04/11, GRIP_STYLE 'palmo'): il palmo dietro la parte bassa, le dita attorno al
// bordo sinistro, il pollice sul bordo destro; la posa (GRIP_POSE) inclina la cima verso l'interno e in avanti.
// Impugnatura a martello (rollback, 'martello'): il pugno stringe il terzo inferiore, con la cima in avanti il bordo +x
// sta in alto e il display guarda di lato.
function buildGrip(style = GRIP_STYLE){
  const g = new THREE.Group();
  const phone = new THREE.Group(); g.add(phone);
  const body = new THREE.Mesh(new RoundedBoxGeometry(PHONE.w, PHONE.h, PHONE.d, 3, .006), std(C.frame, { metalness: .7, roughness: .35 }));
  phone.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(PHONE.w*.93, PHONE.h*.95), new THREE.MeshBasicMaterial({ map: screenTexture() }));
  screen.position.z = PHONE.d/2 + .0004; phone.add(screen);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(PHONE.w*.96, PHONE.h*.97), std(C.back, { roughness: .4 }));
  back.rotation.y = Math.PI; back.position.z = -PHONE.d/2 - .0004; phone.add(back);
  // quattro fotocamere in colonna e il flash, sul retro in alto (a destra guardando il retro)
  const lensM = std(0x0a0a0d, { metalness: .4, roughness: .15 }), ringM = std(0x9aa0aa, { metalness: .8, roughness: .25 });
  [[.024, .062, .0075], [.024, .042, .0075], [.024, .022, .0075], [.008, .052, .004]].forEach(([x, y, r]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + .0012, r + .0012, .0016, 16), ringM); ring.rotation.x = Math.PI/2; ring.position.set(-x, y, -PHONE.d/2 - .0008); phone.add(ring);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(r*.7, r*.7, .0018, 16), lensM); lens.rotation.x = Math.PI/2; lens.position.set(-x, y, -PHONE.d/2 - .0012); phone.add(lens);
  });
  const skin = std(C.skin, { roughness: .75 });
  if (style === 'palmo'){
    phone.position.y = .03;
    // palmo dietro la parte bassa del telefono, dita che avvolgono il bordo sinistro, pollice lungo il bordo destro
    const palm = new THREE.Mesh(new RoundedBoxGeometry(.09, .075, .032, 3, .014), skin); palm.position.set(.006, -.028, -PHONE.d/2 - .017); g.add(palm);
    for (let i = 0; i < 4; i++){
      const f = capsule(.0105, .03, skin); f.rotation.x = Math.PI/2; f.position.set(-PHONE.w/2 - .004, -.06 + i*.02, -.004); g.add(f);
    }
    const thumb = capsule(.0115, .05, skin); thumb.rotation.z = .12; thumb.position.set(PHONE.w/2 + .007, .0, .001); g.add(thumb);
    const wristM = capsule(.03, .05, skin); wristM.rotation.x = -.6; wristM.position.set(.014, -.088, -.008); g.add(wristM);
    g.scale.setScalar(PHONE.scale);
    g.userData = { phone, wrist: new THREE.Vector3(.016, -.115, .012) };
    return g;
  }
  phone.position.y = .042;
  // pugno: dita attorno ai lati lunghi, pollice sul bordo
  const fist = new THREE.Mesh(new RoundedBoxGeometry(.098, .084, .07, 3, .022), skin); fist.position.set(0, -.012, -.004); g.add(fist);
  for (let i = 0; i < 4; i++){
    const f = capsule(.0125, .07, skin); f.rotation.z = Math.PI/2; f.position.set(.004, -.044 + i*.021, .033); g.add(f);
  }
  const thumb = capsule(.012, .045, skin); thumb.rotation.z = -.6; thumb.rotation.x = .2; thumb.position.set(.03, .03, -.028); g.add(thumb);
  g.scale.setScalar(PHONE.scale);
  g.userData = { phone, wrist: new THREE.Vector3(-.01, -.05, -.01) };
  return g;
}

function buildPlayer(){
  const root = new THREE.Group();
  const shirt = std(C.shirt), shorts = std(C.shorts), skin = std(C.skin, { roughness: .75 });
  const torso = capsule(.17, .38, shirt); torso.position.set(0, 1.18, 0); torso.scale.set(1, 1, .7); root.add(torso);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(.35, .04, .25), std(C.pink)); stripe.position.set(0, 1.33, 0); root.add(stripe);
  const hips = capsule(.16, .1, shorts); hips.position.set(0, .86, 0); hips.scale.set(1, 1, .75); root.add(hips);
  for (const x of [-.09, .09]){ const leg = capsule(.07, .62, skin); leg.position.set(x, .45, 0); root.add(leg); const shoe = new THREE.Mesh(new RoundedBoxGeometry(.11, .07, .24, 2, .03), std(0xffffff)); shoe.position.set(x, .04, -.04); root.add(shoe); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 20, 14), skin); head.position.set(0, 1.63, 0); root.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.125, 20, 12, 0, Math.PI*2, 0, Math.PI*.55), std(0x5a3b25)); hair.position.copy(head.position); hair.rotation.x = .25; root.add(hair);
  const band = new THREE.Mesh(new THREE.TorusGeometry(.122, .012, 6, 24), std(C.accent)); band.position.set(0, 1.67, 0); band.rotation.x = Math.PI/2 - .2; root.add(band);
  // braccio libero, rilassato
  const lu = capsule(.045, .26, shirt); lu.position.set(-.21, 1.25, .02); lu.rotation.z = -.12; root.add(lu);
  const lf = capsule(.04, .24, skin); lf.position.set(-.24, .98, -.04); lf.rotation.x = .35; root.add(lf);
  // braccio che colpisce: due segmenti orientati dalla cinematica inversa
  const upper = capsule(.047, ARM.upper - .06, shirt), fore = capsule(.041, ARM.fore - .05, skin);
  root.add(upper, fore);
  return { root, upper, fore };
}
// orienta un cilindro/capsula (asse y) tra due punti
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
function segment(mesh, a, b){
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  _v.copy(b).sub(a); const l = _v.length() || 1;
  mesh.quaternion.setFromUnitVectors(UP, _v.multiplyScalar(1/l));
}
// gomito dalla spalla al polso (due segmenti), piegato verso il basso e indietro
function elbowFor(s, w, out){
  const d = _v.copy(w).sub(s), L = Math.min(d.length(), ARM.upper + ARM.fore - 1e-3), dir = d.clone().normalize();
  const a = (ARM.upper*ARM.upper - ARM.fore*ARM.fore + L*L)/(2*L), h = Math.sqrt(Math.max(0, ARM.upper*ARM.upper - a*a));
  const pole = new THREE.Vector3(.35, -1, .45).normalize(); pole.addScaledVector(dir, -pole.dot(dir)).normalize();
  return out.copy(s).addScaledVector(dir, a).addScaledVector(pole, h);
}

export class NatpfGestureDemo {
  constructor({ width = 240, height = 240 } = {}){
    this.w = width; this.h = height; this.hand = 'right'; this.speed = .5; this.id = 'ready';
    this.t = 0; this.running = false; this.raf = 0; this.last = 0;
    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (this.canvas) this.canvas.className = 'gesture-demo-canvas';
    this.available = false;
    try {
      // contesto chiesto prima: senza WebGL (test, browser vecchi) niente renderer e niente errori in console
      const opts = { antialias: true, alpha: true, powerPreference: 'low-power' };
      const context = this.canvas?.getContext?.('webgl2', opts) || this.canvas?.getContext?.('webgl', opts);
      if (!context) throw new Error('WebGL non disponibile');
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, context, ...opts });
      this.renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
      this.renderer.setSize(width, height, false);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.available = true;
    } catch { this.renderer = null; }
    if (this.available) this._scene();
  }
  _scene(){
    const S = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, this.w/this.h, .05, 30);
    S.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a3566, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 4, 3); S.add(key);
    const rim = new THREE.DirectionalLight(0xb8c8ff, 1.1); rim.position.set(-3, 2, -3); S.add(rim);
    this.world = new THREE.Group(); S.add(this.world);
    // campo e schermo del computer davanti
    const court = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.4), std(C.court, { roughness: .9 })); court.rotation.x = -Math.PI/2; court.position.z = -.9; this.world.add(court);
    const base = new THREE.Mesh(new THREE.PlaneGeometry(.06, 5.4), new THREE.MeshBasicMaterial({ color: C.line })); base.rotation.x = -Math.PI/2; base.position.set(0, .002, -.9); this.world.add(base);
    const tv = new THREE.Group(); tv.position.set(0, 1.25, -3.1); this.world.add(tv);
    tv.add(new THREE.Mesh(new RoundedBoxGeometry(1.7, 1, .06, 2, .02), std(0x0b1023)));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .9), new THREE.MeshBasicMaterial({ color: 0x1d3a8f })); glass.position.z = .032; tv.add(glass);
    const lab = this.label = new THREE.Mesh(new THREE.PlaneGeometry(.9, .22), new THREE.MeshBasicMaterial({ map: labelTexture('SCHERMO'), transparent: true })); lab.position.z = .034; tv.add(lab);
    // giocatore e telefono
    this.player = buildPlayer(); this.world.add(this.player.root);
    this.grip = buildGrip(); this.world.add(this.grip);
    // palla e scia della cima del telefono
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(.045, 14, 10), std(C.ball, { emissive: 0x2a3300 })); this.world.add(this.ball);
    const N = this.trailN = 40;
    this.trailPts = Array.from({ length: N }, () => new THREE.Vector3());
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N*3), 3));
    const col = new Float32Array(N*3); for (let i = 0; i < N; i++){ const k = i/(N - 1); col.set([.91*k + .05, k, .23*k + .1], i*3); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    this.trail = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .95 }));
    this.trail.frustumCulled = false; this.world.add(this.trail);
    this.trailReset = true; this.tip = new THREE.Vector3(); this.elbow = new THREE.Vector3(); this.wristW = new THREE.Vector3();
  }
  mount(el){ if (!this.canvas || !el) return; if (this.canvas.parentNode !== el) el.appendChild(this.canvas); }
  setSize(w, h){
    if (!this.available || (w === this.w && h === this.h)) return;
    this.w = w; this.h = h; this.renderer.setSize(w, h, false); this.camera.aspect = w/h; this.camera.updateProjectionMatrix();
  }
  // id: chiave di GESTURES; speed: 1 tempo reale, 0,5 rallentato
  play(id, { hand = this.hand, speed = this.speed } = {}){
    const changed = id !== this.id || hand !== this.hand;
    this.id = GESTURES[id] ? id : 'ready'; this.hand = hand === 'left' ? 'left' : 'right'; this.speed = speed;
    if (changed){ this.t = 0; this.trailReset = true; }
    // mancino: tutto specchiato, tranne la scritta dello schermo
    if (this.available){ this.world.scale.x = this.hand === 'left' ? -1 : 1; this.label.scale.x = this.world.scale.x; }
    this.start();
  }
  start(){ if (!this.available || this.running) return; this.running = true; this.last = performance.now(); const loop = now => { if (!this.running) return; this.raf = requestAnimationFrame(loop); this._frame(now); }; this.raf = requestAnimationFrame(loop); }
  stop(){ this.running = false; cancelAnimationFrame(this.raf); }
  // istante dell'impatto nel ciclo (s): per fermare l'animazione nel momento chiave
  hitTime(){
    const g = GESTURES[this.id];
    if (!g || g.still) return 0;
    if (g.toss) return serveTimeline(g).apex;
    return strokeTimeline(strokeFor(g.stroke, this.hand), { short: g.short }).hit;
  }
  // durata di un ciclo dell'animazione (s, al tempo reale)
  cycle(){
    const g = GESTURES[this.id];
    if (!g || g.still) return 6;
    if (g.toss) return serveTimeline(g).total;
    return strokeTimeline(strokeFor(g.stroke, this.hand), { short: g.short }).total;
  }
  _frame(now){
    // al massimo 30 fotogrammi al secondo, niente lavoro se il canvas non si vede
    if (now - this.last < 32) return;
    const dt = Math.min(.1, (now - this.last)/1000); this.last = now;
    if (!this.canvas.isConnected || this.canvas.offsetParent === null) return;
    this.t = (this.t + dt*this.speed) % this.cycle();
    this.pose(this.t);
    this.renderer.render(this.scene, this.camera);
  }
  // posa al tempo t (s, tempo reale del gesto): giocatore, telefono, palla, scia e camera
  pose(t){
    const g = GESTURES[this.id] || GESTURES.ready, hand = this.hand, P = this.grip;
    const E0 = GRIP_POSE[GRIP_STYLE].euler;   // palmo: cima verso l'interno e in avanti, schermo verso chi gioca (martello: display a destra)
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(E0[0]*D, E0[1]*D, E0[2]*D, 'XYZ'));
    let handPos, q = q0.clone(), hit = null, ballPos = null, fast = false;
    const wq = (axis, ang) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis), ang);
    // il mondo è specchiato per il mancino: i moti si scrivono sempre da destro
    if (g.still){
      const bob = Math.sin(t*1.6)*.006;
      handPos = new THREE.Vector3(.16, -.42 + bob, -.32);
      if (g.turntable) q = wq([0, 1, 0], Math.sin(t*.9)*.9).multiply(q0);
    } else if (g.toss){
      const st = serveTimeline(g);
      if (t < st.hitStart){
        const p = strokePose(g.toss, t, {}); handPos = new THREE.Vector3(...p.hand); q = wq(p.axis, p.phi).multiply(q0); fast = p.speed > 200;
      } else {
        const p = strokePose(g.stroke, t - st.hitStart, {}); handPos = new THREE.Vector3(...p.hand); q = wq(p.axis, p.phi).multiply(q0); fast = p.speed > 200;
      }
      const h = tossBall(t, st);
      ballPos = h == null ? null : new THREE.Vector3(.12, SHOULDER.y + .25 + h, -.38);
    } else {
      const p = strokePose(g.stroke, t, { short: g.short, preYaw: g.preYaw || 0 });
      handPos = new THREE.Vector3(...p.hand);
      q = wq([0, 1, 0], p.preYaw).multiply(q0);
      q = wq(p.axis, p.phi).multiply(q);
      if (p.wristAxis) q = wq(p.wristAxis, p.psi).multiply(q);
      fast = p.speed > 200; hit = p.tl.hit;
      ballPos = this._ball(g, t, p.tl);
    }
    const handW = handPos.add(SHOULDER);
    P.position.copy(handW); P.quaternion.copy(q);
    // braccio: polso dal pugno, gomito dalla cinematica inversa
    // tutto nel riferimento del gruppo `world` (specchiato per il mancino): matrice locale del pugno, non quella del mondo
    P.updateMatrix();
    this.wristW.copy(P.userData.wrist).applyMatrix4(P.matrix);
    elbowFor(SHOULDER, this.wristW, this.elbow);
    segment(this.player.upper, SHOULDER, this.elbow); segment(this.player.fore, this.elbow, this.wristW);
    // primo piano della presa nel palmo: si vedono solo la mano e il telefono (il braccio sale verso la spalla e, così
    // vicino, coprirebbe lo schermo)
    const close = g.turntable && GRIP_STYLE === 'palmo';
    this.player.upper.visible = this.player.fore.visible = !close;
    // scia della cima del telefono (solo nella parte veloce del gesto, poi sfuma)
    this.tip.set(0, PHONE.h/2 + P.userData.phone.position.y, 0).applyMatrix4(P.matrix);
    const pts = this.trailPts;
    if (this.trailReset){ for (const p of pts) p.copy(this.tip); this.trailReset = false; }
    pts.push(pts.shift().copy(fast ? this.tip : pts[pts.length - 1]));
    if (!fast) for (let i = 0; i < pts.length - 1; i++) pts[i].lerp(pts[i + 1], .25);
    const arr = this.trail.geometry.attributes.position.array; pts.forEach((p, i) => arr.set([p.x, p.y, p.z], i*3));
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.ball.visible = !!ballPos; if (ballPos) this.ball.position.copy(ballPos);
    // camera: da dietro, sopra la spalla del braccio che colpisce (il mondo specchiato porta la spalla a sinistra)
    const m = hand === 'left' ? -1 : 1;
    // presa nel palmo: lo schermo guarda chi gioca, quindi l'impugnatura si mostra da destra e da dietro, all'altezza della
    // mano (lontano dall'avambraccio, che sale verso la spalla). Martello: il telefono punta verso lo schermo, di profilo (da destra, dove guarda il display). Le
    // altre inquadrature più di lato che alle spalle, perché il telefono non sparisca dietro la mano
    if (g.turntable && GRIP_STYLE === 'palmo'){ this.camera.position.set((handW.x + .45)*m, handW.y + .3, handW.z + .15); this.camera.lookAt(handW.x*m, handW.y + .02, handW.z - .02); }
    else if (g.turntable){ this.camera.position.set((handW.x + .5)*m, handW.y + .2, handW.z - .12); this.camera.lookAt(handW.x*m, handW.y + .02, handW.z - .16); }
    else if (g.ballHigh){ this.camera.position.set(1.45*m, 2.0, 1.5); this.camera.lookAt(.15*m, 1.55, -.3); }
    // rovescio: la mano passa davanti al corpo, si guarda dall'altra spalla
    else if (g.id === 'backhand'){ this.camera.position.set(-1.25*m, 1.85, 1.0); this.camera.lookAt(-.15*m, 1.12, -.38); }
    else { this.camera.position.set(1.5*m, 1.8, .95); this.camera.lookAt(.22*m, 1.12, -.38); }
    void hit;
  }
  // palla dell'animazione: arriva al punto d'impatto nell'istante del colpo, poi riparte nella direzione mostrata
  _ball(g, t, tl){
    const imp = new THREE.Vector3(...strokePose(g.stroke, tl.hit, { short: g.short }).hand).add(SHOULDER);
    imp.y = Math.max(.3, imp.y);
    const before = tl.hit - t;
    if (before > 1.1) return null;
    if (before >= 0){
      const from = g.ball === 'high' ? new THREE.Vector3(imp.x - .2, imp.y + 2.4, imp.z - 2) : new THREE.Vector3(imp.x - .6, .9, imp.z - 3.2);
      const k = 1 - before/1.1, p = from.clone().lerp(imp, k);
      // dopo il rimbalzo (palla da fondo): un arco basso con il rimbalzo a metà
      if (g.ball === 'ground') p.y = imp.y + Math.abs(Math.sin(k*Math.PI*1.5))*(.9 - imp.y*.3)*(1 - k*.6) - (1 - k)*.2;
      return p;
    }
    const after = -before;
    if (after > .8) return null;
    const aim = g.aim || 0, up = g.id === 'lob' ? 3.2 : g.id === 'drop' ? .6 : 1.2, far = g.id === 'drop' ? 1.6 : 5;
    return imp.clone().add(new THREE.Vector3(aim*1.8*after, up*after - 2.5*after*after, -far*after));
  }
  dispose(){ this.stop(); this.renderer?.dispose(); }
}

// istanza condivisa (un solo contesto WebGL)
let shared = null;
export function getGestureDemo(){ return (shared ||= new NatpfGestureDemo()); }
