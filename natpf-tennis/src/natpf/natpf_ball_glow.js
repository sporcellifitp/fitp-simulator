// Scia luminosa della palla (B22, richiesta dell'utente dell'11/11/2026: «la scia luminosa la vorrei aggiungere anche
// come effetto per l'attuale gameplay, magari leggermente meno luminosa. Dalle impostazioni dammi la possibilità per
// disabilitarla in caso, ripristinando a com'è attualmente»). Riferimento: la scia gialla del trailer.
// Cos'è: un nastro giallo, luminoso, dietro la palla in gioco (colpi di chi gioca, del Player 2 e della CPU), lungo e
// intenso quanto la palla è veloce (lunghezza = velocità × BALL_GLOW.seconds, niente sotto BALL_GLOW.minSpeed: il lancio
// del servizio e i pallonetti lenti non ce l'hanno). Si aggiunge alla scia sottile di prima (game_engine.js, classe te),
// che resta com'è: bianca per i colpi normali, bianca e azzurra più larga per il colpo potente, il colpo super e lo
// scambio caldo, che così si riconoscono ancora (la coda azzurra è più lunga della scia gialla, e ci sono le scintille).
// Opzione: Opzioni → «Scia della palla: Sì · No», di base Sì, salvata (localStorage, chiave natpf-tennis.sciaPalla:
// '0' spenta). Spenta: il nastro non è nella scena (mesh.visible = false, nessun calcolo): il disegno è quello di prima,
// pixel per pixel (tools/e2e/natpf-scia-palla.mjs).
// Solo disegno: non legge né cambia la fisica, i colpi, i sorteggi (niente Math.random). Niente allocazioni per
// fotogramma (storia in un anello di Float32Array, vertici riscritti sul posto). Il nastro si orienta verso la camera
// nel vertex shader: vale per ogni vista (le due metà dello stesso schermo, la moviola, il computer del Player 2).
// La storia arriva dalla scia di prima (te.pushPoint a ogni passo della fisica, te.clear al servizio e ai cambi di
// scena): sul computer del Player 2 e nella moviola è la palla disegnata, senza fisica in più.
// B26 (collaudo dell'utente dell'11/11 sulla 2026-11-11.2: «gialla ma poco diversa» da quella bianca di prima): scia
// rifatta sul modello del trailer. Nastro giallo PIENO e largo (il doppio alla testa), più lungo, con il centro più
// chiaro e un ALONE largo e tenue intorno (stesso oggetto, stesso disegno: il nastro è largo quanto l'alone e il
// profilo lo fa il fragment shader); intensità piena già alle velocità normali di scambio (da 14 m/s, prima da 24).
// Resta un po' meno luminosa del trailer: non è mai del tutto opaca e non ha il bagliore bianco. Nei colpi potenti,
// super e nello scambio caldo sta sotto la scia bianca e azzurra ed è attenuata (powerAlpha): si riconoscono ancora.
import * as THREE from 'three';

export const TRAIL_KEY = 'natpf-tennis.sciaPalla';
export const BALL_GLOW = Object.freeze({
  points: 60,        // campioni della storia (anello)
  step: .18,         // m tra due campioni (i passi della fisica più fitti si saltano)
  seconds: .42,      // lunghezza della scia = velocità × seconds (prima del B26 .22) …
  maxLen: 10,        // … al più 10 m (nel trailer attraversa mezzo campo; prima 6)
  minSpeed: 10,      // m/s: sotto, niente scia (lancio del servizio, palla che rotola, pallonetto lento; prima 7)
  fullSpeed: 14,     // m/s: da qui l'intensità è piena (prima 24: nello scambio medio, 15–20 m/s, la scia era tenue)
  width: .8,         // m del nastro pieno alla testa (prima .42 con i bordi sfumati: pieno per meno della metà)
  halo: 2.2,         // l'alone è largo halo volte il nastro pieno
  haloAlpha: .5,     // intensità dell'alone rispetto al nastro
  tailWidth: .4,     // larghezza della coda rispetto alla testa
  alpha: .92,        // opacità massima del nastro (il trailer è pieno, con il bagliore: qui «leggermente meno luminosa»)
  powerAlpha: .5,    // nei colpi potenti, super e nello scambio caldo: sotto la scia bianca e azzurra, attenuata
  head: .2,          // m dietro la palla in cui la scia sfuma da zero: la palla non è mai coperta
  follow: 14,        // 1/s: prontezza con cui l'intensità segue la velocità
  back: .3,          // m all'indietro (lungo il campo) oltre i quali la palla è stata colpita: la storia riparte
  jump: 1.2,         // m: un salto più lungo di così (oltre lo spazio di un passo) è un cambio di scena, non un volo
  replaySpeed: 18,   // m/s presi per buoni nella moviola (lì la palla non ha velocità)
});
// colori (sRGB): centro giallo chiaro, nastro giallo pieno e saturo, alone giallo caldo
export const GLOW_COLORS = Object.freeze({ core: '#fff38a', body: '#ffdd00', halo: '#ffb400' });

export function readBallTrail({ storage = globalThis.localStorage } = {}){
  try { return storage?.getItem(TRAIL_KEY) !== '0'; } catch { return true; }
}
export function writeBallTrail(on, { storage = globalThis.localStorage } = {}){
  try { storage?.setItem(TRAIL_KEY, on ? '1' : '0'); } catch {}
  return !!on;
}
export const trailToast = on => (on ? 'Scia della palla accesa' : 'Scia della palla spenta: la palla è come prima');

// ordine di disegno rispetto alla scia di prima (renderOrder 6): sopra nei colpi normali, sotto in quelli potenti
export const GLOW_ORDER = Object.freeze({ under: 5, over: 7 });
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
// intensità 0…1 dalla velocità della palla (m/s): 0 fino a minSpeed, 1 da fullSpeed, morbida in mezzo
export function glowLevel(speed, G = BALL_GLOW){
  const u = clamp01(((+speed || 0) - G.minSpeed)/(G.fullSpeed - G.minSpeed));
  return u*u*(3 - 2*u);
}
// lunghezza della scia (m) dalla velocità della palla (m/s)
export const glowLength = (speed, G = BALL_GLOW) => Math.max(0, Math.min(G.maxLen, (+speed || 0)*G.seconds));

const VERT = `
attribute vec3 aDir;
attribute vec2 aSide;
uniform float uWidth;
uniform float uTail;
varying vec2 vUv;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 dir = (modelViewMatrix * vec4(aDir, 0.0)).xyz;
  vec3 n = cross(dir, mv.xyz);
  float l = length(n);
  n = l > 1e-6 ? n / l : vec3(1.0, 0.0, 0.0);
  mv.xyz += n * aSide.x * uWidth * 0.5 * mix(1.0, uTail, aSide.y);
  vUv = aSide;
  gl_Position = projectionMatrix * mv;
}`;
// Profilo attraverso il nastro (vUv.x da −1 a 1, larghezza = nastro pieno × halo): al centro il nastro pieno (fino a
// uBand, con il bordo morbido) con il cuore più chiaro, intorno l'alone che sfuma fino al bordo. Lungo la scia (vUv.y
// da 0 sulla palla a 1 in coda): parte da zero dietro la palla e si apre, poi sfuma verso la coda
const FRAG = `
uniform vec3 uCore;
uniform vec3 uBody;
uniform vec3 uHalo;
uniform float uAlpha;
uniform float uHead;
uniform float uBand;
uniform float uHaloAlpha;
varying vec2 vUv;
void main(){
  // dietro la palla il nastro si apre da poco più della palla alla sua larghezza piena (testa a cometa, non tronca)
  float y = vUv.y, x = abs(vUv.x) / mix(0.5, 1.0, smoothstep(0.0, uHead * 4.0, y));
  float along = smoothstep(0.0, uHead, y) * (1.0 - y * y);
  float band = (1.0 - smoothstep(uBand * 0.62, uBand, x)) * along * uAlpha;
  float hot = 1.0 - smoothstep(0.0, uBand * 0.7, x);
  float glow = pow(1.0 - smoothstep(uBand * 0.5, 1.0, x), 2.0) * along * uAlpha * uHaloAlpha;
  vec3 col = mix(uBody, uCore, hot * hot * (1.0 - 0.55 * y));
  // colore già moltiplicato per l'opacità. Il nastro copre quasi tutto il fondo (pieno, come nel trailer); l'alone lo
  // copre poco e si somma: sul blu del campo e sull'azzurro intorno resta giallo e luminoso, e righe e campo si vedono
  gl_FragColor = vec4(col * band + uHalo * glow * (1.0 - band), band * 0.93 + glow * (1.0 - band) * 0.55);
  #include <colorspace_fragment>
}`;

// three.js dà un uuid a ogni geometria, materiale e oggetto con Math.random: qui un generatore a parte, così creare la
// scia non consuma nessun numero della sequenza casuale del gioco (che resta la stessa con e senza la scia)
function withOwnRandom(fn){
  const r = Math.random; let a = (Date.now() ^ 0x5c1a9a11) >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
  try { return fn(); } finally { Math.random = r; }
}

export class NatpfBallGlow {
  // scene: THREE.Scene (o { add }); enabled: opzione (di base quella salvata)
  constructor(scene, { enabled = readBallTrail(), config = BALL_GLOW } = {}){
    const G = this.cfg = config, n = this.n = G.points;
    this.enabled = !!enabled;
    this.level = 0; this.length = 0; this.segments = 0; this.power = false;
    // storia: anello di n punti, hist[(first + k) % n] dal più nuovo (k = 0) al più vecchio
    this.hist = new Float32Array(n*3); this.count = 0; this.first = 0;
    this.last = new Float32Array(3); this.hasLast = false;       // ultima posizione arrivata (anche se non campionata)
    this.dirZ = 0; this.backAcc = 0; this.fresh = 0;
    this.pos = new Float32Array(n*2*3); this.dir = new Float32Array(n*2*3); this.side = new Float32Array(n*2*2);
    const idx = new Uint16Array((n - 1)*6);
    for (let s = 0; s < n - 1; s++){ const a = s*2; idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], s*6); }
    for (let i = 0; i < n; i++){ this.side[i*4] = 1; this.side[i*4 + 2] = -1; }
    withOwnRandom(() => this._mesh(idx));
    scene?.add?.(this.mesh);
  }
  _mesh(idx){
    const G = this.cfg;
    const geo = this.geometry = new THREE.BufferGeometry();
    geo.setAttribute('position', (this.aPos = new THREE.BufferAttribute(this.pos, 3)));
    geo.setAttribute('aDir', (this.aDir = new THREE.BufferAttribute(this.dir, 3)));
    geo.setAttribute('aSide', (this.aSide = new THREE.BufferAttribute(this.side, 2)));
    for (const a of [this.aPos, this.aDir, this.aSide]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uWidth: { value: G.width*G.halo }, uTail: { value: G.tailWidth }, uAlpha: { value: 0 }, uHead: { value: .1 },
        uBand: { value: 1/G.halo }, uHaloAlpha: { value: G.haloAlpha },
        uCore: { value: new THREE.Color(GLOW_COLORS.core) }, uBody: { value: new THREE.Color(GLOW_COLORS.body) }, uHalo: { value: new THREE.Color(GLOW_COLORS.halo) },
      },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'NatpfSciaPalla'; this.mesh.frustumCulled = false; this.mesh.renderOrder = GLOW_ORDER.over; this.mesh.visible = false;
  }
  // opzione: accesa o spenta, subito (spenta: fuori dal disegno e storia vuota)
  setEnabled(on){ this.enabled = !!on; if (!this.enabled) this.clear(); return this.enabled; }
  // storia vuota (servizio, punto nuovo, cambio di scena)
  clear(){
    this.count = 0; this.first = 0; this.hasLast = false; this.dirZ = 0; this.backAcc = 0; this.fresh = 0;
    this.level = 0; this.length = 0; this.segments = 0; this.mesh.visible = false; this.geometry.setDrawRange(0, 0);
  }
  _push(x, y, z){
    const n = this.n; this.first = (this.first + n - 1) % n;
    const o = this.first*3; this.hist[o] = x; this.hist[o + 1] = y; this.hist[o + 2] = z;
    if (this.count < n) this.count++;
  }
  // un passo della palla (posizione disegnata, a ogni passo della fisica): p con x, y, z
  sample(p){
    if (!this.enabled) return;
    const G = this.cfg, L = this.last, x = p.x, y = p.y, z = p.z;
    this.fresh++;
    if (this.hasLast){
      const dx = x - L[0], dy = y - L[1], dz = z - L[2], d = Math.hypot(dx, dy, dz);
      // salto: non è un volo (palla rimessa al servizio, scena nuova) → la storia riparte da qui
      if (d > G.jump){ this.count = 0; this.dirZ = 0; this.backAcc = 0; }
      else if (dz){
        // colpo: la palla torna indietro lungo il campo (un rimbalzo non lo fa) → la scia riparte dalla racchetta
        const s = dz > 0 ? 1 : -1;
        if (!this.dirZ) this.dirZ = s;
        else if (s !== this.dirZ){ this.backAcc += Math.abs(dz); if (this.backAcc > G.back){ this.count = 0; this.dirZ = s; this.backAcc = 0; } }
        else this.backAcc = 0;
      }
    }
    L[0] = x; L[1] = y; L[2] = z; this.hasLast = true;
    if (!this.count) return this._push(x, y, z);
    const o = this.first*3, H = this.hist;
    if (Math.hypot(x - H[o], y - H[o + 1], z - H[o + 2]) >= G.step) this._push(x, y, z);
  }
  // un fotogramma: head = dove si disegna la palla; speed in m/s (null: moviola); dt in s; active: palla in gioco;
  // power: colpo potente, colpo super o scambio caldo (la scia bianca e azzurra di prima resta sopra: si riconosce)
  frame(head, speed, dt = 0, active = true, power = false){
    const order = power ? GLOW_ORDER.under : GLOW_ORDER.over;
    if (this.mesh.renderOrder !== order) this.mesh.renderOrder = order;
    this.power = !!power;
    const fresh = this.fresh; this.fresh = 0;
    if (!this.enabled){ if (this.mesh.visible) this.mesh.visible = false; return; }
    const G = this.cfg;
    if (speed == null){ speed = G.replaySpeed; active = active && (fresh > 0 || !(dt > 0)); }
    const want = active && this.count ? glowLevel(speed, G) : 0;
    if (dt > 0) this.level += (want - this.level)*(1 - Math.exp(-G.follow*dt));
    if (this.level < .02 && !want) this.level = 0;
    if (active) this.length = glowLength(speed, G);
    if (!(this.level > 0) || !this.count || !(this.length > .05)){ if (this.mesh.visible){ this.mesh.visible = false; this.segments = 0; } return; }
    this._build(head.x, head.y, head.z);
  }
  // nastro dalla palla all'indietro lungo la storia, per `length` metri; i vertici in più si chiudono sulla coda
  _build(hx, hy, hz){
    const n = this.n, H = this.hist, P = this.pos, D = this.dir, S = this.side, len = this.length;
    let px = hx, py = hy, pz = hz, acc = 0, v = 0;
    // primo vertice sulla palla; poi i campioni, il primo solo se abbastanza lontano dalla palla
    P[0] = P[3] = px; P[1] = P[4] = py; P[2] = P[5] = pz; S[1] = S[3] = 0; v = 1;
    for (let k = 0; k < this.count && v < n; k++){
      const o = ((this.first + k) % n)*3, x = H[o], y = H[o + 1], z = H[o + 2];
      let dx = px - x, dy = py - y, dz = pz - z, d = Math.hypot(dx, dy, dz);
      if (d < 1e-3) continue;
      dx /= d; dy /= d; dz /= d;
      let qx = x, qy = y, qz = z, end = false;
      if (acc + d >= len){ const u = (len - acc)/d; qx = px - dx*d*u; qy = py - dy*d*u; qz = pz - dz*d*u; acc = len; end = true; } else acc += d;
      const a = v*6, b = v*4;
      P[a] = P[a + 3] = qx; P[a + 1] = P[a + 4] = qy; P[a + 2] = P[a + 5] = qz;
      D[a] = D[a + 3] = dx; D[a + 1] = D[a + 4] = dy; D[a + 2] = D[a + 5] = dz;
      S[b + 1] = S[b + 3] = acc/len;
      if (v === 1){ D[0] = D[3] = dx; D[1] = D[4] = dy; D[2] = D[5] = dz; }
      px = qx; py = qy; pz = qz; v++;
      if (end) break;
    }
    if (v < 2){ this.mesh.visible = false; this.segments = 0; return; }
    // storia più corta della scia: la coda sfuma comunque fino in fondo
    if (acc < len){ const b = (v - 1)*4; S[b + 1] = S[b + 3] = 1; for (let i = 1; i < v - 1; i++){ const c = i*4; S[c + 1] = S[c + 3] = S[c + 1]*len/acc; } }
    this.segments = v - 1;
    const U = this.material.uniforms;
    U.uAlpha.value = this.level*this.cfg.alpha*(this.power ? this.cfg.powerAlpha : 1);
    U.uHead.value = Math.min(.6, this.cfg.head/Math.max(acc, .05));
    this.geometry.setDrawRange(0, this.segments*6);
    this.aPos.needsUpdate = this.aDir.needsUpdate = this.aSide.needsUpdate = true;
    this.mesh.visible = true;
  }
}
