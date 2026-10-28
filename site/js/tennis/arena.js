// L'arena del gioco, ricostruita sulle immagini di riferimento: palazzetto al chiuso in luce blu, campo in cemento
// blu scuro dentro un ampio fuori campo azzurro, righe bianche, rete scura con nastro bianco, tabelloni bassi blu con
// scritte bianche, pannelli LED, segnapunti arancioni, raccattapalle, sedia dell'arbitro bianca a «A» con le due panchine,
// operatori TV, scritta grande sul fuori campo, tribune a due anelli divisi da una fascia LED, cubo-maxischermo e
// stendardi appesi al tetto a travature.
// Composizione come nei riferimenti: muro continuo attorno al fuori campo con i loghi stampati (sui lati lunghi il
// logo Nitto ATP Finals impilato alternato a ESPORTS, sul fondo il logo orizzontale al centro e ESPORTS ai lati, pannelli
// LED negli angoli), linee luminose blu sul bordo del muro e sul parapetto delle tribune, sedia dell'arbitro con le due
// panchine su un lato all'altezza della rete, buca delle telecamere con tre operatori sul lato opposto, raccattapalle sul
// fondo. Le grafiche (site/assets/arena/) sono generate dai loghi ufficiali con natpf-tennis/scripts/brand/brand-assets.py.
import * as THREE from 'three';

const C = {                              // colori presi dalle immagini di riferimento (sotto luce blu)
  court: 0x294a94, runoff: 0x2a80d2, line: 0xf2f7ff, board: 0x0b2468, boardTop: 0x14327f,
  step: 0x131d45, aisle: 0x22346e, nosing: 0x8aa2ee, seat: 0x141b3e, wall: 0x0c1636, roof: 0x0a1024, truss: 0x1b2747, net: 0x0d1d4d,
};
const HW = 4.115, DW = 5.485, HL = 11.885, SZ = 6.4;

/* ---------- testi e immagini su tela (CanvasTexture) ---------- */
function canvas(w, h, draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// grafiche dell'arena (site/assets/arena/)
const loader = new THREE.TextureLoader();
// anisotropia: la massima della scheda video (buildArena la riceve dal renderer); i loghi visti di taglio (rete,
// tabelloni laterali, scritta sul campo) restano nitidi invece di sfocarsi con le mipmap
let ANISO = 8;
const ART = name => { const t = loader.load(new URL('../../assets/arena/' + name, import.meta.url).href); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t; };
// Rotazione (nel piano del campo) delle scritte TORINO per chi guarda dalla metà «viewer» (+1 = P1, dietro z positiva;
// −1 = P2): come nei riferimenti, le due scritte dietro le linee di fondo si leggono dritte dalla camera di chi gioca,
// quella vicina sotto la camera e quella in fondo al campo. Ognuno vede il proprio campo uguale all'altro.
export const courtWordTurn = viewer => (viewer < 0 ? Math.PI : 0);
// sedia dell'arbitro e telecamere come nelle schermate di riferimento (prese dal fondo del P1, z > 0): sedia a destra
// (x > 0) a 10 m dal centro sulla linea della rete, panchine ai lati a z = ±4 m, telecamere nella buca sul lato opposto
export const UMPIRE = Object.freeze({ x: 10, benchZ: [-4, 4], tvSide: -1 });
export const COURT_WORD = Object.freeze({ width: 3.6, back: 2.1 });
// Fronte dell'anello basso delle tribune (rettangolo con gli angoli arrotondati) e pannelli LED vicino agli angoli del
// muro del campo. I pannelli stanno sul tratto dritto, prima della curva della tribuna: con il raggio di 6 m la curva
// entra nell'angolo del muro e nascondeva metà dei pannelli che c'erano (28/10 sera: «monitor tagliati»)
export const STAND_FRONT = Object.freeze({ hx: 12.9, hz: 22.4, R: 6 });
export const CORNER_LED = Object.freeze({ w: 2.05, h: 1.07, d: .14, backX: 8, sideZ: 18 });   // m: larghezza (proporzioni del file 1360 × 385) e distanza dalla riga di fondo
const plainTex = () => canvas(64, 64, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16378f'); g.addColorStop(1, '#0a2163'); x.fillStyle = g; x.fillRect(0, 0, W, H);
});

/* ---------- percorso delle tribune: rettangolo con angoli arrotondati ---------- */
function ringPath(hx, hz, R, step){
  const pts = [], segs = [];
  const sx = hx - R, sz = hz - R;
  // quattro lati e quattro archi, in senso antiorario
  segs.push(['line', [sx, -hz], [-sx, -hz], [0, -1]], ['arc', [-sx, -sz], -Math.PI/2, -Math.PI], ['line', [-hx, -sz], [-hx, sz], [-1, 0]], ['arc', [-sx, sz], Math.PI, Math.PI/2],
            ['line', [-sx, hz], [sx, hz], [0, 1]], ['arc', [sx, sz], Math.PI/2, 0], ['line', [hx, sz], [hx, -sz], [1, 0]], ['arc', [sx, -sz], 0, -Math.PI/2]);
  let carry = 0;
  for (const s of segs){
    const L = s[0] === 'line' ? Math.hypot(s[2][0] - s[1][0], s[2][1] - s[1][1]) : Math.abs(s[3] - s[2])*R;
    let d = carry;
    for (; d < L; d += step){
      const u = d/L;
      if (s[0] === 'line') pts.push({ x: s[1][0] + (s[2][0] - s[1][0])*u, z: s[1][1] + (s[2][1] - s[1][1])*u, nx: s[3][0], nz: s[3][1] });
      else { const a = s[2] + (s[3] - s[2])*u; pts.push({ x: s[1][0] + Math.cos(a)*R, z: s[1][1] + Math.sin(a)*R, nx: Math.cos(a), nz: Math.sin(a) }); }
    }
    carry = d - L;
  }
  return pts;
}

/* ---------- figure: pezzi semplici fusi in una geometria sola ---------- */
// Ogni pezzo porta con sé un colore (persone in piedi, colori nei vertici) oppure un'etichetta «parte, arto» che lo
// shader del pubblico usa per colorarlo (maglia, pelle, capelli…) e per alzare le braccia.
const UP = new THREE.Vector3(0, 1, 0);
function kit(){
  const parts = [];
  const k = {
    add(geo, { color = 0xffffff, part = 0, limb = 0 } = {}){ parts.push({ g: geo.index ? geo.toNonIndexed() : geo, color: new THREE.Color(color), part, limb }); return k; },
    build({ colors = false, tags = false } = {}){
      let n = 0; for (const p of parts) n += p.g.attributes.position.count;
      const pos = new Float32Array(n*3), nor = new Float32Array(n*3), col = colors ? new Float32Array(n*3) : null, tag = tags ? new Float32Array(n*2) : null;
      let o = 0;
      for (const p of parts){
        const c = p.g.attributes.position.count; pos.set(p.g.attributes.position.array, o*3); nor.set(p.g.attributes.normal.array, o*3);
        for (let i = o; i < o + c; i++){ if (col){ col[i*3] = p.color.r; col[i*3 + 1] = p.color.g; col[i*3 + 2] = p.color.b; } if (tag){ tag[i*2] = p.part; tag[i*2 + 1] = p.limb; } }
        o += c; p.g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
      if (tag) out.setAttribute('aTag', new THREE.BufferAttribute(tag, 2));
      return out;
    },
  };
  return k;
}
// cilindro aperto (o capsula) da a a b, raggio r0 in a e r1 in b; «ext» lo allunga ai due capi per chiudere le giunture
function limb(a, b, r0, r1, seg, { capsule = false, ext = 0 } = {}){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length(); d.normalize();
  const g = capsule ? new THREE.CapsuleGeometry((r0 + r1)/2, Math.max(.01, L - r0 - r1 + 2*ext), 2, seg) : new THREE.CylinderGeometry(r1, r0, L + 2*ext, seg, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d)); g.translate((A.x + B.x)/2, (A.y + B.y)/2, (A.z + B.z)/2); return g;
}

/* ---------- pubblico: figura seduta, una geometria per tutti (InstancedMesh) ---------- */
// Misure in metri, origine sul gradino sotto la persona, +z verso il campo. Parti (aTag.x): 0 maglia, 1 pelle,
// 2 capelli, 3 pantaloni, 4 avambraccio (manica lunga o pelle), 5 telefono, 6-8 bandierina verde/bianco/rosso, 9 asta.
// Arti (aTag.y): 1-2 braccio e avambraccio sinistri, 3-4 destri (la mano e gli oggetti seguono l'avambraccio destro).
// Spalla e gomito (CROWD_ARM) sono anche i perni dello shader che alza le braccia.
const CROWD_ARM = { sx: .215, sy: 1.0, sz: 0, ex: .24, ey: .69, ez: -.02 }, CROWD_HAND = [.16, .61, .2];
// livelli di dettaglio: 'fine' (anello basso), 'medio' e 'leggero' (anello alto, secondo la qualità), 'oggetti' (solo
// telefono e bandierina, nella mesh a parte di chi li tiene alzati)
const CROWD_LOD = { fine: { rs: 7, hy: 5, hh: 3, as: 5, hands: true, neck: 5 }, medio: { rs: 6, hy: 4, hh: 2, as: 4, hands: true, neck: 4 }, leggero: { rs: 5, hy: 4, hh: 2, as: 3, hands: false, neck: 0 } };
function crowdGeometry(level){
  const K = kit(), A = CROWD_ARM, H0 = CROWD_HAND;
  if (level === 'oggetti'){
    // nella mano destra, a braccio a riposo (l'avambraccio va verso +z: alzato, l'asse z diventa la verticale)
    const [hx, hy, hz] = H0;
    K.add(new THREE.BoxGeometry(.075, .014, .14).translate(hx, hy + .04, hz + .07), { part: 5, limb: 4 });
    K.add(limb([hx, hy, hz], [hx, hy, hz + .57], .01, .01, 3), { part: 9, limb: 4 });
    for (const [i, x0] of [[6, 0], [7, .1], [8, .2]]) for (const f of [-1, 1]){
      K.add(new THREE.PlaneGeometry(.1, .2).rotateX(-Math.PI/2*f).translate(hx + .05 + x0, hy + f*.003, hz + .46), { part: i, limb: 4 });
    }
    return K.build({ tags: true });
  }
  const L = CROWD_LOD[level];
  // gambe: cosce sul seggiolino, stinchi giù fino al gradino
  K.add(new THREE.BoxGeometry(.36, .15, .46).translate(0, .49, .03), { part: 3 });
  K.add(new THREE.BoxGeometry(.3, .42, .12).translate(0, .21, .28), { part: 3 });
  // busto: più largo alle spalle, schiacciato davanti-dietro; aperto sotto (sta dentro le cosce), chiuso sopra
  K.add(new THREE.CylinderGeometry(.205, .16, .5, L.rs, 1, true).scale(1, 1, .62).translate(0, .81, -.01), { part: 0 });
  K.add(new THREE.CircleGeometry(.205, L.rs).rotateX(-Math.PI/2).rotateY(-Math.PI/2).scale(1, 1, .62).translate(0, 1.06, -.01), { part: 0 });
  if (L.neck) K.add(limb([0, 1.02, 0], [0, 1.11, .005], .045, .045, L.neck), { part: 1 });
  K.add(new THREE.SphereGeometry(.11, L.rs, L.hy).scale(.94, 1.1, 1).translate(0, 1.2, .01), { part: 1 });
  // capelli: calotta spostata all'indietro, il viso resta scoperto
  K.add(new THREE.SphereGeometry(.118, L.rs, L.hh, 0, Math.PI*2, 0, Math.PI*.52).rotateX(-.42).translate(0, 1.215, -.012), { part: 2 });
  // braccia: dalla spalla al gomito lungo il fianco, avambraccio appoggiato sulla coscia
  for (const e of [-1, 1]){
    const S = [e*A.sx, A.sy, A.sz], E = [e*A.ex, A.ey, A.ez], H = [e*H0[0], H0[1], H0[2]], l = e < 0 ? 1 : 3;
    K.add(limb(S, E, .058, .05, L.as, { ext: .03 }), { part: 0, limb: l });
    K.add(limb(E, H, .05, .042, L.as, { ext: .02 }), { part: 4, limb: l + 1 });
    if (L.hands) K.add(new THREE.OctahedronGeometry(.046).translate(H[0], H[1], H[2] + .03), { part: 1, limb: l + 1 });
  }
  return K.build({ tags: true });
}
// materiale del pubblico: colori dei pezzi, braccia alzate e salti, tutto nello shader (nessun costo sulla CPU)
function crowdMaterial(U){
  const m = new THREE.MeshLambertMaterial(), A = CROWD_ARM, f = v => v.toFixed(3);
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `uniform float uTime; uniform float uCheer; uniform vec3 uPantsA, uPantsB, uPhone, uFlagG, uFlagW, uFlagR;
attribute vec2 aTag; attribute vec3 aSkin, aHair; attribute vec4 aMisc; attribute float aSeed;
varying float vGlow;
mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }
// braccio alzato: prima si stende il gomito, poi tutto il braccio ruota sulla spalla verso l'alto e un po' in fuori
vec3 armPose(vec3 p, float r, float side, bool fore, bool dir){
  vec3 S = vec3(side*${f(A.sx)}, ${f(A.sy)}, ${f(A.sz)}), E = vec3(side*${f(A.ex)}, ${f(A.ey)}, ${f(A.ez)});
  float wave = sin(uTime*7. + aSeed*2.3)*.25*uCheer;
  mat3 Ru = rotX(1.15*r), R = rotZ(-side*.32*r)*rotX((-2.65 + wave)*r);
  if (fore) p = dir ? Ru*p : E + Ru*(p - E);
  return dir ? R*p : S + R*(p - S);
}
` + sh.vertexShader
      .replace('#include <color_vertex>', `#include <color_vertex>
 // parte e arto del vertice; quanto è alzato il braccio (chi tifa lo alza un po' dopo gli altri, non tutti insieme)
 int part = int(aTag.x + .5), limb = int(aTag.y + .5);
 float up = aMisc.z > .75 ? 1. : aMisc.z > .25 ? clamp(uCheer*1.8 - fract(aSeed*.618)*.8, 0., 1.) : 0.;
 float side = limb > 2 ? 1. : -1., armR = limb == 0 ? 0. : (side < 0. && aMisc.w > .5) ? 0. : up;
 bool fore = limb == 2 || limb == 4;
 vec3 c = vColor.rgb; vGlow = 0.;
 if (part == 1) c = aSkin;
 else if (part == 2) c = aHair;
 else if (part == 3) c = mix(uPantsA, uPantsB, aMisc.x);
 else if (part == 4) c = mix(aSkin, vColor.rgb, aMisc.y);
 else if (part == 5){ c = uPhone; vGlow = .9; }
 else if (part == 6) c = uFlagG;
 else if (part == 7) c = uFlagW;
 else if (part == 8) c = uFlagR;
 else if (part == 9) c = vec3(.05);
 vColor.rgb = c;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
 if (limb > 0) objectNormal = armPose(objectNormal, armR, side, fore, true);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
 // ogni oggetto solo nella mano di chi lo tiene (gli altri si riducono a un punto)
 bool keep = part < 5 || (part == 5 && aMisc.w > .5 && aMisc.w < 1.5) || (part > 5 && aMisc.w > 1.5);
 if (!keep) transformed = vec3(0.);
 else if (limb > 0) transformed = armPose(transformed, armR, side, fore, false);
 transformed.y += uCheer*.22*abs(sin(uTime*9. + aSeed*1.7));`);
    sh.fragmentShader = 'varying float vGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vGlow*diffuseColor.rgb;');
  };
  return m;
}
// seggiolino: seduta e schienale (sotto la persona, o vuoto dove manca qualcuno)
function seatGeometry(){
  return kit().add(new THREE.BoxGeometry(.44, .06, .4).translate(0, .39, -.01)).add(new THREE.BoxGeometry(.44, .42, .05).rotateX(-.1).translate(0, .62, -.24)).build();
}

/* ---------- persona in piedi (o seduta, per l'arbitro): un'unica mesh con i colori nei vertici ---------- */
// pose: 'dietro' (raccattapalle, mani dietro la schiena), 'camera' (operatori, mani alle maniglie), 'seduto' (arbitro)
function standingGeometry({ shirt, pants, hair, shoes, skin = 0xd9a98a, pose = 'dietro', sleeves = false }){
  const K = kit(), seated = pose === 'seduto', dy = seated ? -.8 : 0;     // seduto: il bacino scende sul piano della sedia
  for (const e of [-1, 1]){
    if (seated){
      K.add(limb([e*.1, .1, 0], [e*.1, .13, .44], .085, .07, 8, { capsule: true }), { color: pants });
      K.add(limb([e*.1, .13, .45], [e*.1, -.36, .48], .065, .055, 8, { capsule: true }), { color: pants });
      K.add(new THREE.BoxGeometry(.11, .08, .26).translate(e*.1, -.4, .55), { color: shoes });
    } else {
      K.add(limb([e*.1, .1, 0], [e*.105, .88, 0], .062, .085, 8, { capsule: true }), { color: pants });
      K.add(new THREE.BoxGeometry(.11, .08, .27).translate(e*.1, .04, .045), { color: shoes });
    }
  }
  K.add(new THREE.CylinderGeometry(.175, .17, .2, 10).scale(1, 1, .66).translate(0, .92 + dy, 0), { color: pants });                // bacino
  K.add(new THREE.CylinderGeometry(.2, .165, .5, 10).scale(1, 1, .6).translate(0, 1.25 + dy, 0), { color: shirt });                // busto
  K.add(new THREE.CapsuleGeometry(.075, .3, 3, 8).rotateZ(Math.PI/2).scale(1, 1, .85).translate(0, 1.44 + dy, 0), { color: shirt }); // spalle
  K.add(limb([0, 1.47 + dy, 0], [0, 1.6 + dy, .01], .052, .048, 8), { color: skin });                                              // collo
  K.add(new THREE.SphereGeometry(.11, 12, 9).scale(.92, 1.08, 1).translate(0, 1.68 + dy, .01), { color: skin });
  K.add(new THREE.SphereGeometry(.117, 12, 5, 0, Math.PI*2, 0, Math.PI*.55).rotateX(-.45).translate(0, 1.695 + dy, -.005), { color: hair });
  K.add(new THREE.BoxGeometry(.03, .045, .04).translate(0, 1.67 + dy, .115), { color: skin });                                     // naso
  for (const e of [-1, 1]){
    const S = [e*.235, 1.43 + dy, 0];
    const [E, H] = pose === 'camera' ? [[e*.27, 1.18, .1], [e*.17, 1.36, .27]]
      : seated ? [[e*.25, 1.17 + dy, .08], [e*.15, 1.1 + dy, .33]]
      : [[e*.25, 1.17, -.06], [e*.07, 1.02, -.15]];
    K.add(limb(S, E, .058, .05, 8, { capsule: true }), { color: shirt });
    K.add(limb(E, H, .05, .042, 8, { capsule: true }), { color: sleeves ? shirt : skin });
    K.add(new THREE.SphereGeometry(.048, 8, 6).scale(.8, 1, 1.15).translate(...H), { color: skin });
  }
  return K.build({ colors: true });
}

export function buildArena(scene, { quality = 1, anisotropy = 8 } = {}){
  ANISO = Math.max(1, Math.min(16, anisotropy || 8));
  const group = new THREE.Group(); scene.add(group);
  const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  const add = (geo, mat, x, y, z, { ry = 0, shadow = false, receive = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = shadow; m.receiveShadow = receive; group.add(m); return m; };
  const updaters = [];

  /* fondo: fuori campo azzurro, campo blu scuro (doppio), righe */
  // fuori campo: più chiaro attorno al campo (dove cadono le luci) e più scuro verso il muro, come nei riferimenti
  const runoffTex = canvas(256, 432, (x, W, H) => { const g = x.createRadialGradient(W/2, H/2, W*.15, W/2, H/2, H*.62); g.addColorStop(0, '#3a9af0'); g.addColorStop(.55, '#2a80d2'); g.addColorStop(1, '#14498f'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
  const floor = add(new THREE.PlaneGeometry(26, 44), new THREE.MeshLambertMaterial({ map: runoffTex }), 0, 0, 0); floor.rotation.x = -Math.PI/2;
  const court = add(new THREE.PlaneGeometry(2*DW, 2*HL), lam(C.court), 0, .003, 0); court.rotation.x = -Math.PI/2;
  const lineMat = lam(C.line);
  const line = (x0, z0, x1, z1) => { const m = add(new THREE.PlaneGeometry(Math.abs(x1 - x0) || .05, Math.abs(z1 - z0) || .05), lineMat, (x0 + x1)/2, .006, (z0 + z1)/2); m.rotation.x = -Math.PI/2; };
  for (const s of [-1, 1]){ line(-DW, s*HL, DW, s*HL); line(s*DW, -HL, s*DW, HL); line(s*HW, -HL, s*HW, HL); line(-HW, s*SZ, HW, s*SZ); line(0, s*HL, 0, s*(HL - .1)); }
  line(0, -SZ, 0, SZ);
  // TORINO sul fuori campo poco dietro le due linee di fondo (come nei riferimenti), girate verso chi gioca: setViewer
  // le gira per il P2. Prima: 6,4 × 1,6 m (lettere allungate), 3,6 m dietro la riga e capovolte per una delle due camere.
  const courtWord = ART('torino.png'), courtWords = [];
  for (const s of [-1, 1]){
    const m = add(new THREE.PlaneGeometry(COURT_WORD.width, COURT_WORD.width*385/1360), new THREE.MeshLambertMaterial({ map: courtWord, transparent: true, depthWrite: false }), 0, .008, s*(HL + COURT_WORD.back));
    m.rotation.x = -Math.PI/2; m.rotation.z = courtWordTurn(1); courtWords.push(m);
  }
  const setViewer = side => { for (const m of courtWords) m.rotation.z = courtWordTurn(side); };

  /* rete: profilo vero, maglia scura, nastro e fascia centrale bianchi, scritta vicino ai pali */
  {
    const X = DW + .914, seg = 24, g = new THREE.PlaneGeometry(2*X, 1, seg, 1), P = g.attributes.position;
    for (let i = 0; i < P.count; i++){ const x = P.getX(i), top = P.getY(i) > 0; P.setY(i, top ? .914 + .156*Math.min(1, Math.abs(x)/X)**1.6 : 0); }
    const mesh = canvas(512, 64, (x, W, H) => {
      x.fillStyle = 'rgba(8,20,60,.55)'; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(10,22,60,.95)'; x.lineWidth = 2; for (let i = 0; i <= W; i += 8){ x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j <= H; j += 8){ x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
    });
    const net = add(g, new THREE.MeshLambertMaterial({ map: mesh, transparent: true, side: THREE.DoubleSide, depthWrite: false }), 0, 0, 0); net.receiveShadow = false;
    const tape = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: seg + 1 }, (_, i) => { const x = -X + i*2*X/seg; return new THREE.Vector3(x, .914 + .156*Math.min(1, Math.abs(x)/X)**1.6 - .03, 0); })), 48, .035, 6), lam(0xffffff));
    tape.castShadow = true; group.add(tape);
    add(new THREE.BoxGeometry(.05, .9, .02), lam(0xffffff), 0, .45, 0);
    // logo Nitto ATP Finals impilato sulla rete, vicino ai due pali (come nei riferimenti): un piano per faccia, ognuno
    // girato verso il proprio lato del campo (con un piano a doppia faccia dall'altra parte si leggeva al contrario).
    // Proporzioni del file (1024 × 820): 0,8 × 0,64 m, nessuna deformazione.
    const netLogo = new THREE.MeshBasicMaterial({ map: ART('rete-logo.png'), transparent: true, depthWrite: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.PlaneGeometry(.8, .8*820/1024), netLogo, sx*(X - .85), .5, sz*.016, { ry: sz > 0 ? 0 : Math.PI }).renderOrder = 2;
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(.12, 1.07, .12), lam(0x0f2254), s*X, .535, 0, { shadow: true });
  }

  /* muro attorno al fuori campo (alto 1 m) con i loghi stampati, pannelli LED negli angoli, bordo luminoso */
  const WX = 12.2, WZ = 21, WH = 1, WT = .3, PIT = 2.7;          // muro interno: ±12,2 × ±21 m; buca telecamere |z| < 2,7
  const TV = UMPIRE.tvSide;                                        // la buca delle telecamere è sul lato opposto all'arbitro
  const wallMat = new THREE.MeshLambertMaterial({ map: plainTex() }), neon = new THREE.MeshBasicMaterial({ color: 0x2f6dff });
  const wall = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1)/2, cz = (z0 + z1)/2, ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI/2;
    add(new THREE.BoxGeometry(L, WH, WT), wallMat, cx, WH/2, cz, { ry });
    add(new THREE.BoxGeometry(L, .05, WT + .04), neon, cx, WH + .025, cz, { ry });
  };
  for (const s of [-1, 1]){ wall(-WX - WT/2, s*(WZ + WT/2), WX + WT/2, s*(WZ + WT/2)); wall(-TV*(WX + WT/2), -WZ, -TV*(WX + WT/2), WZ); }
  wall(TV*(WX + WT/2), -WZ, TV*(WX + WT/2), -PIT); wall(TV*(WX + WT/2), PIT, TV*(WX + WT/2), WZ);
  // varco delle telecamere: il muro si interrompe, i due capi sono rifiniti come le testate del muro
  for (const e of [-1, 1]) add(new THREE.BoxGeometry(WT + .04, WH + .05, .04), neon, TV*(WX + WT/2), WH/2, e*PIT);
  // loghi sul lato interno del muro, con le proporzioni dei file
  const deco = (tex, w, h, x, z, ry, y = WH/2) => add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), x, y, z, { ry });
  const hor = ART('nitto-atp-finals.png'), stack = ART('logo-impilato.png'), esp = ART('esports.png'), led = ART('pannello-led.png');
  const ledPanel = (x, z, ry) => add(new THREE.BoxGeometry(CORNER_LED.w, CORNER_LED.h, CORNER_LED.d), new THREE.MeshBasicMaterial({ map: led }), x, CORNER_LED.h/2, z, { ry });
  for (const s of [-1, 1]){
    // fondo: ESPORTS · Nitto ATP FINALS · ESPORTS, pannelli LED negli angoli
    const z = s*(WZ - .01), ry = s > 0 ? Math.PI : 0;
    deco(hor, 7.2, 7.2*210/2048, 0, z, ry);
    for (const e of [-1, 1]) deco(esp, 1.6, 1.6*530/1024, e*5.4, z, ry);
    for (const e of [-1, 1]) ledPanel(e*CORNER_LED.backX, s*(WZ - .1), ry);
    // lati lunghi: logo impilato e ESPORTS alternati, pannelli LED negli angoli, logo orizzontale grande verso gli angoli
    const x = s*(WX - .01), ry2 = s > 0 ? -Math.PI/2 : Math.PI/2;
    for (const zz of [-16, -7, 7, 16]) deco(stack, 1.1, .88, x, zz, ry2);
    for (const zz of [-11.8, 11.8]) deco(esp, 1.6, 1.6*530/1024, x, zz, ry2);
    for (const e of [-1, 1]) ledPanel(s*(WX - .1), e*CORNER_LED.sideZ, ry2);
  }
  // segnapunti (arancione su nero) sopra il tabellone di fondo: punteggio in game e velocità dell'ultimo servizio
  const seg7 = (txt, w, h) => canvas(w, h, (x, W, H) => { x.fillStyle = '#070707'; x.fillRect(0, 0, W, H); x.strokeStyle = '#3a2a10'; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6); x.fillStyle = '#ff9a1f'; x.font = `700 ${H*.72}px "Courier New",monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, W/2, H*.54); });
  const scoreBox = { mats: [] }, speedBox = { mats: [] };
  for (const s of [-1, 1]){
    const ry = s > 0 ? Math.PI : 0;
    const a = add(new THREE.BoxGeometry(1.25, .62, .12), new THREE.MeshBasicMaterial({ map: seg7('0-0', 256, 128) }), 2.4*s*-1, 1.62, s*21.1, { ry }); scoreBox.mats.push(a.material);
    const b = add(new THREE.BoxGeometry(1.25, .5, .12), new THREE.MeshBasicMaterial({ map: seg7('000', 256, 100) }), -2.4*s*-1, 1.58, s*21.1, { ry }); speedBox.mats.push(b.material);
    for (const xx of [2.4, -2.4]) add(new THREE.BoxGeometry(.06, .5, .06), lam(0x111111), xx, 1.2, s*21.1);
  }
  const setScore = txt => { for (const m of scoreBox.mats){ m.map.dispose(); m.map = seg7(txt, 256, 128); } };
  const setSpeed = kmh => { for (const m of speedBox.mats){ m.map.dispose(); m.map = seg7(String(Math.round(kmh)).padStart(3, '0'), 256, 100); } };

  // persona in piedi (operatori, raccattapalle) o seduta (arbitro): scarpe, gambe, bacino, busto con le spalle, collo,
  // testa con i capelli, braccia piegate; scale < 1 per i ragazzi. Una mesh sola a persona, colori nei vertici e un
  // po' di luce propria nel colore del pezzo: i fari del campo li illuminano di fronte, con la sola luce dall'alto i
  // fianchi prenderebbero il blu dell'ambiente
  const litV = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: .32 });
  litV.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor;'); };
  const person = (x, z, ry, shirt, pants, k = 1, y = 0, look = {}) => {
    const m = new THREE.Mesh(standingGeometry({ shirt, pants, hair: 0x2e2018, shoes: 0x16171c, ...look }), litV);
    m.position.set(x, y, z); m.rotation.y = ry; m.scale.setScalar(k); m.castShadow = true; group.add(m); return m;
  };
  /* sedia dell'arbitro bianca ad «A», panchine bianche, operatori TV, raccattapalle */
  {
    const white = lam(0xf2f5ff), X = UMPIRE.x;
    // sedia ad «A» come nei riferimenti (le quattro schermate dal fondo del P1): a destra di chi guarda dal fondo del P1
    // (x > 0), circa 3,5 m oltre il paletto della rete e 2,2 m davanti al muro laterale, sulla linea della rete. Una
    // grande lettera «A» a blocco (alta 2,95 m, larga 2,3 m alla base, spessa 0,66 m: forma di 2,45 × 1,9 × 0,55 m
    // ingrandita di S), blu scuro lucido con i fianchi chiari, girata verso il campo: si legge dall'altro lato del campo.
    // Pedana e seduta bianche in cima con l'arbitro, scaletta bianca separata sul fianco (verso z negativa).
    // Prima: a sinistra, a 7,4 m dal centro, con l'«A» girata verso il fondo e i gradini dentro l'apertura.
    const S = 1.2, seatY = 2.45*S + .16, top = 2.45*S + .1;
    {
      const A = new THREE.Shape([[-.95, 0], [-.3, 2.45], [.3, 2.45], [.95, 0], [.5, 0], [.36, .55], [-.36, .55], [-.5, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
      A.holes.push(new THREE.Path([[-.21, .95], [.21, .95], [0, 1.72]].map(([x, y]) => new THREE.Vector2(x, y))));
      const geo = new THREE.ExtrudeGeometry(A, { depth: .55, bevelEnabled: true, bevelThickness: .05, bevelSize: .045, bevelSegments: 3, curveSegments: 4 });
      geo.translate(0, 0, -.275);
      const face = new THREE.MeshPhongMaterial({ color: 0x1d3a9a, specular: 0x6f8cff, shininess: 60 }), side = new THREE.MeshPhongMaterial({ color: 0xd9e4ff, specular: 0xffffff, shininess: 40 });
      // piano dell'«A» parallelo al lato lungo, faccia verso il campo (−x), gambe lungo z
      const chair = add(geo, [face, side], X, .05, 0, { ry: -Math.PI/2, shadow: true });
      chair.receiveShadow = true; chair.scale.setScalar(S);
      // pedana e seduta in cima, schienale verso il muro
      add(new THREE.BoxGeometry(.95, .1, .75), white, X, top, 0, { shadow: true });
      add(new THREE.BoxGeometry(.12, .7, .75), white, X + .42, top + .37, 0);
      for (const e of [-1, 1]) add(new THREE.BoxGeometry(.6, .22, .06), white, X + .1, top + .16, e*.36);
    }
    // scaletta bianca accanto alla gamba dell'«A» (lato z negativa): due montanti inclinati e i pioli, fino alla pedana
    {
      const z0 = -1.95, z1 = -.62, len = Math.hypot(top, z1 - z0), tilt = Math.atan2(z1 - z0, top);
      for (const e of [-1, 1]){ const r = add(new THREE.BoxGeometry(.06, len, .08), white, X + e*.24, top/2, (z0 + z1)/2, { shadow: true }); r.rotation.x = tilt; }
      for (let i = 1; i <= 8; i++){ const u = i/9; add(new THREE.BoxGeometry(.48, .04, .12), white, X, u*top, z0 + u*(z1 - z0)); }
    }
    // arbitro seduto sulla pedana, in bianco con i pantaloni scuri, girato verso il campo
    person(X + .02, 0, -Math.PI/2, 0xf2f4fa, 0x1b2140, .95, seatY, { pose: 'seduto', sleeves: true, hair: 0x3a2a20 });
    // panchine bianche sulla stessa linea della sedia, ai due lati, schienale verso il muro
    const sofa = z => { add(new THREE.BoxGeometry(.9, .45, 2.2), white, X + .9, .25, z, { shadow: true }); add(new THREE.BoxGeometry(.25, .55, 2.2), white, X + 1.25, .7, z); for (const e of [-1, 1]) add(new THREE.BoxGeometry(.9, .3, .2), white, X + .9, .6, z + e*1.05); };
    for (const z of UMPIRE.benchZ) sofa(z);
    // operatori TV: tre telecamere sul cavalletto nella buca del lato opposto all'arbitro, all'altezza della rete
    [-1.6, 0, 1.6].forEach((cz, i) => {
      const cx = TV*(WX - .1);
      for (const a of [0, 2.1, 4.2]){ const l = add(new THREE.CylinderGeometry(.02, .02, 1.3, 4), lam(0x111111), cx - TV*.35 + Math.cos(a)*.2, .62, cz + Math.sin(a)*.2); l.rotation.z = Math.cos(a)*.16; l.rotation.x = -Math.sin(a)*.16; }
      add(new THREE.BoxGeometry(.75, .34, .34), lam(0x2a2c33), cx - TV*.45, 1.42, cz, { shadow: true });
      add(new THREE.CylinderGeometry(.11, .13, .22, 10), lam(0x111216), cx - TV*.9, 1.42, cz).rotation.z = Math.PI/2;
      // maglia bianca e pantaloni scuri, mani alle maniglie della telecamera
      person(cx + TV*.15, cz, -TV*Math.PI/2, 0xf2f4fa, 0x15161c, 1, 0, { pose: 'camera', sleeves: i !== 1, hair: [0x1a1412, 0x6e4e33, 0x8a8a8a][i] });
    });
    // raccattapalle in fondo, davanti al muro, ai lati del logo
    // tutti in bianco (scarpe comprese), mani dietro la schiena
    const kidHair = [0x2e2018, 0xa9844f, 0x1a1412, 0x5a3a24];
    for (const s of [-1, 1]) for (const e of [-1, 1]) person(e*4.6, s*(WZ - .6), s > 0 ? Math.PI : 0, 0xf4f6fb, 0xf4f6fb, .82, 0, { shoes: 0xe9edf5, hair: kidHair[(s + 1) + (e + 1)/2] });
  }

  /* tribune: anello basso, fascia LED, anello alto; pubblico seduto; scale e passaggi tra i settori */
  const people = [[], []], seats = [], steps = [], aisles = [], nosing = [];
  let crowd = null;
  const tiers = [
    { ...STAND_FRONT, rows: 12, d: .82, rise: .5, y0: 1.5, gapEnd: 4.2 },
    { hx: STAND_FRONT.hx + 11.2, hz: STAND_FRONT.hz + 11.2, R: STAND_FRONT.R + 11.2, rows: Math.round(14*quality + 4*(1 - quality)), d: .8, rise: .62, y0: 9.4, gapEnd: 0 },
  ];
  const SP = .56, SEC = 14;
  tiers.forEach((T, t) => {
    for (let r = 0; r < T.rows; r++){
      const o = r*T.d, y = T.y0 + r*T.rise, pts = ringPath(T.hx + o, T.hz + o, T.R + o, SP);
      pts.forEach((p, i) => {
        const endCenter = Math.abs(p.nz) > .99 && Math.abs(p.x) < T.gapEnd && r < 9;       // a metà dei lati corti: maxischermo e passaggio
        const aisle = i % SEC === 0 || endCenter;
        const cx = p.x + p.nx*T.d/2, cz = p.z + p.nz*T.d/2, ry = Math.atan2(p.nx, p.nz), h = T.rise + (r === 0 ? T.y0 : 0);
        if (aisle && r > 0 && !endCenter){
          // scala: due alzate per fila (metà davanti più bassa), con il bordo chiaro su ogni gradino
          const q = T.d/4, hr = T.rise/2;
          aisles.push({ x: cx + p.nx*q, y, z: cz + p.nz*q, ry, w: SP, d: T.d/2, h }, { x: cx - p.nx*q, y: y - hr, z: cz - p.nz*q, ry, w: SP, d: T.d/2, h: h - hr });
          for (const [k, yy] of [[0, y - hr], [2*q, y]]) nosing.push({ x: p.x + p.nx*(k + .03), y: yy + .006, z: p.z + p.nz*(k + .03), ry, w: SP*.86, d: .06, h: .03 });
        } else (aisle ? aisles : steps).push({ x: cx, y, z: cz, ry, w: SP, d: T.d, h });
        if (aisle) return;
        const spot = { x: p.x + p.nx*T.d*.45, y, z: p.z + p.nz*T.d*.45, ry: Math.atan2(-p.nx, -p.nz) };
        seats.push(spot);
        if (Math.random() < .9) people[t].push({ ...spot });
      });
    }
  });
  for (const L of people) for (let i = L.length - 1; i > 0; i--){ const j = (Math.random()*(i + 1)) | 0; [L[i], L[j]] = [L[j], L[i]]; }
  const box = new THREE.BoxGeometry(1, 1, 1), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const instanced = (list, mat, size) => {
    const im = new THREE.InstancedMesh(box, mat, list.length);
    list.forEach((s, i) => { Q.setFromAxisAngle(up, s.ry); V.set(s.x, s.y - s.h/2, s.z); S.set(s.w, s.h, s.d); M.compose(V, Q, S); im.setMatrixAt(i, M); });
    im.receiveShadow = false; group.add(im); return im;
  };
  instanced(steps, lam(C.step)); instanced(aisles, lam(C.aisle)); instanced(nosing, lam(C.nosing));
  {
    // seggiolini: uno per posto, anche dove il posto è vuoto (si vedono i buchi nel pubblico, e le tribune a porte chiuse)
    const im = new THREE.InstancedMesh(seatGeometry(), lam(C.seat), seats.length);
    seats.forEach((p, i) => { Q.setFromAxisAngle(up, p.ry); V.set(p.x, p.y, p.z); M.compose(V, Q, S.set(1, 1, 1)); im.setMatrixAt(i, M); });
    group.add(im);
  }
  {
    // Pubblico: una InstancedMesh per anello (in basso la figura più dettagliata, in alto quella leggera) e una
    // piccolissima con telefoni e bandierine di chi li tiene alzati. Colore della maglia in instanceColor; per persona
    // anche pelle, capelli, aSeed (fase dell'animazione) e aMisc = (tono dei pantaloni, manica lunga 0/1,
    // braccia: 0 giù · .5 si alzano col tifo · 1 sempre su, oggetto: 0 niente · 1 telefono · 2 bandierina).
    // Lo shader (crowdMaterial) colora i pezzi secondo aTag, alza le braccia e fa saltare il pubblico.
    const U = { uTime: { value: 0 }, uCheer: { value: 0 }, uPantsA: { value: new THREE.Color(0x1c2233) }, uPantsB: { value: new THREE.Color(0x4a5d84) },
      uPhone: { value: new THREE.Color(0xdfe8ff) }, uFlagG: { value: new THREE.Color(0x1f8a4c) }, uFlagW: { value: new THREE.Color(0xf4f5f0) }, uFlagR: { value: new THREE.Color(0xc8323c) } };
    const mat = crowdMaterial(U);
    // maglie: tanti neutri (bianco, grigi, nero, blu notte) e qualche colore pieno un po' spento, appena spinto verso
    // il blu della sala, così sotto le luci dell'arena resta vario senza stonare; [colore, peso]
    const pick = list => { let t = Math.random()*list.reduce((a, [, w]) => a + w, 0); for (const [c, w] of list){ if ((t -= w) <= 0) return c; } return list[0][0]; };
    const shirts = [[0xe9edf5, 5], [0xb8bfcc, 4], [0x7d8494, 4], [0x3b404c, 5], [0x1d2029, 5], [0x25355f, 5], [0x3f62c9, 3], [0x8fb3ea, 3],
      [0x3f8f9a, 1.5], [0x4f7f5a, 1.5], [0xc9a24a, 1.5], [0xd07a45, 1], [0xb8434a, 2], [0x7a2e3e, 1.5], [0xd98fae, 1.5], [0x6a5aa8, 2], [0xcdb99a, 2]];
    const hairs = [[0x1a1412, 6], [0x2e2018, 6], [0x4a3222, 5], [0x6e4e33, 3], [0xa9844f, 2], [0xd2b47a, 1.5], [0x7a3a22, 1], [0x8a8a8a, 2], [0xc9c9c9, 1.5]];
    const skins = [[0xf1c9a8, 4], [0xe0ac88, 4], [0xc68863, 2], [0x9a6444, 1.2], [0x6b4430, .8]];
    const hall = new THREE.Color(0x5b72c8), col = new THREE.Color(), holders = [];
    const fill = (im, list, own) => {
      const N = list.length, geo = im.geometry, skinA = new Float32Array(N*3), hairA = new Float32Array(N*3), misc = new Float32Array(N*4), seed = new Float32Array(N);
      geo.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skinA, 3)); geo.setAttribute('aHair', new THREE.InstancedBufferAttribute(hairA, 3));
      geo.setAttribute('aMisc', new THREE.InstancedBufferAttribute(misc, 4)); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
      list.forEach((p, i) => {
        M.compose(V.set(p.x, p.y, p.z), Q.setFromAxisAngle(up, p.ry), S.setScalar(p.k)); im.setMatrixAt(i, M);
        im.setColorAt(i, col.set(p.shirt)); col.set(p.skin).toArray(skinA, i*3); col.set(p.hair).toArray(hairA, i*3);
        misc.set(p.misc, i*4); seed[i] = p.seed;
        if (own && p.misc[3]) holders.push(p);
      });
      return im;
    };
    const crowds = people.map((list, t) => {
      list.forEach((p, i) => {
        const u = Math.random(), item = u < .02 ? 1 : u < .035 ? 2 : 0;
        Object.assign(p, {
          tier: t, rank: i, k: .93 + Math.random()*.12, ry: p.ry + (Math.random() - .5)*.25, seed: Math.random()*100,   // un po' più grandi e più piccoli, un po' girati
          shirt: col.set(pick(shirts)).lerp(hall, .12).getHex(), skin: pick(skins), hair: pick(hairs),
          misc: [Math.random(), Math.random() < .4 ? 1 : 0, item || u < .05 ? 1 : u < .3 ? .5 : 0, item],
        });
      });
      // anello alto lontano dalla telecamera: sempre la figura leggera (margine sui PC degli eventi)
      const im = fill(new THREE.InstancedMesh(crowdGeometry(t === 0 ? (quality >= .75 ? 'fine' : 'medio') : 'leggero'), mat, list.length), list, true);
      group.add(im); return im;
    });
    // telefoni e bandierine: stessi attributi della persona che li tiene, così seguono il suo braccio
    const propsIm = fill(new THREE.InstancedMesh(crowdGeometry('oggetti'), mat, holders.length), holders, false);
    const propM = holders.map((_, i) => { const m = new THREE.Matrix4(); propsIm.getMatrixAt(i, m); return m; }), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    group.add(propsIm);
    crowd = {
      set visible(v){ for (const im of [...crowds, propsIm]) im.visible = v; },
      // meno pubblico: le persone sono in ordine casuale per anello, ne restano a caso; gli oggetti seguono chi resta
      density(k){
        const n = crowds.map((im, t) => im.count = Math.round(people[t].length*k));
        holders.forEach((p, i) => propsIm.setMatrixAt(i, p.rank < n[p.tier] ? propM[i] : zero)); propsIm.instanceMatrix.needsUpdate = true;
      },
    };
    updaters.push((t, cheer) => { U.uTime.value = t; U.uCheer.value = cheer; });
  }
  // fascia LED tra i due anelli: scritta che scorre
  {
    const T = tiers[0], o = T.rows*T.d + .25, y = T.y0 + T.rows*T.rise;
    const pts = ringPath(T.hx + o, T.hz + o, T.R + o, .5); pts.push(pts[0]);
    const pos = [], uv = [], idx = []; let acc = 0;
    pts.forEach((p, i) => { if (i) acc += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z); pos.push(p.x, y, p.z, p.x, y + 1.2, p.z); uv.push(-acc/9.4, 0, -acc/9.4, 1); if (i){ const a = (i - 1)*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const tex = ART('fascia-led.png');
    tex.wrapS = THREE.RepeatWrapping;
    const ribbon = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); group.add(ribbon);
    updaters.push(t => { tex.offset.x = -t*.05; });
  }
  // bordo luminoso blu sul parapetto davanti a ciascun anello di tribune (le linee al neon dei riferimenti)
  {
    const glow = new THREE.MeshBasicMaterial({ color: 0x2f6dff, side: THREE.DoubleSide });
    for (const T of tiers){
      const pts = ringPath(T.hx, T.hz, T.R, .5); pts.push(pts[0]);
      const pos = [], idx = [];
      pts.forEach((p, i) => { pos.push(p.x, T.y0 - .02, p.z, p.x, T.y0 + .06, p.z); if (i){ const a = (i - 1)*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      group.add(new THREE.Mesh(g, glow));
    }
  }
  // maxischermo sopra il passaggio di fondo, con la fascia nera in alto
  const screens = [];
  const screenArt = ART('maxischermo.png'), smallBadge = ART('esports-piccolo.png');
  for (const s of [-1, 1]){
    const z = s*(22.4 + 3.2), ry = s > 0 ? Math.PI : 0;
    // maxischermo «It all adds up to THIS» con la fascia nera Nitto ATP FINALS, e il logo ESPORTS sopra
    const sc = add(new THREE.PlaneGeometry(5.8, 3.39), new THREE.MeshBasicMaterial({ map: screenArt }), 0, 5.2, z, { ry });
    add(new THREE.PlaneGeometry(2, .52), new THREE.MeshBasicMaterial({ map: smallBadge, transparent: true }), 0, 7.3, z, { ry });
    add(new THREE.BoxGeometry(6, 4.2, .3), lam(0x05080f), 0, 5.1, z + s*.2);
    screens.push(sc);
  }

  /* tetto a travature con fari, cubo-maxischermo al centro, stendardi appesi */
  {
    const roofY = 31;
    const roof = add(new THREE.PlaneGeometry(90, 110), lam(C.roof, { side: THREE.DoubleSide }), 0, roofY + 1, 0); roof.rotation.x = Math.PI/2;
    const beams = [];
    for (let x = -42; x <= 42; x += 6) beams.push({ x, y: roofY, z: 0, w: .35, h: .9, d: 108, ry: 0 });
    for (let z = -54; z <= 54; z += 6) beams.push({ x: 0, y: roofY, z, w: 90, h: .9, d: .35, ry: 0 });
    for (const b of beams) b.y += b.h/2;
    instanced(beams, lam(C.truss));
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfafcff });
    // fari: punti luminosi con alone, sulle travi attorno al cubo
    const haloTex = canvas(64, 64, (x, W) => { const g = x.createRadialGradient(W/2, W/2, 0, W/2, W/2, W/2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(200,225,255,.8)'); g.addColorStop(1, 'rgba(120,170,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, W); });
    const haloMat = new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const lampAt = (x, z) => { add(new THREE.SphereGeometry(.3, 8, 6), lamp, x, roofY - .4, z); const h = new THREE.Sprite(haloMat); h.position.set(x, roofY - .6, z); h.scale.setScalar(3.2); group.add(h); };
    for (let i = 0; i < 18; i++){ const a = i/18*Math.PI*2; lampAt(Math.cos(a)*16, Math.sin(a)*24); }
    for (const x of [-9, -3, 3, 9]) for (const z of [-12, 12]) lampAt(x, z);
    // cubo con quattro schermi e anello LED sotto
    const cube = new THREE.Group(); cube.position.set(0, 18.5, 0); cube.scale.setScalar(1.3); group.add(cube);   // grande e basso come nei riferimenti
    const cubeTex = ART('pannello-led.png');
    const cubeMat = new THREE.MeshBasicMaterial({ map: cubeTex });
    for (let i = 0; i < 4; i++){ const f = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.7), cubeMat); f.position.set(Math.sin(i*Math.PI/2)*3.5, 0, Math.cos(i*Math.PI/2)*3.5); f.rotation.y = i*Math.PI/2; cube.add(f); }
    const ringTex = ART('fascia-led.png'); ringTex.wrapS = THREE.RepeatWrapping; ringTex.repeat.set(2.2, 1);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, .9, 40, 1, true), new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide }));
    ring.position.y = -2.9; cube.add(ring);
    const top = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 7), lam(0x0b1440)); top.position.y = 2.7; cube.add(top);
    updaters.push(t => { ringTex.offset.x = t*.03; ringTex.wrapS = THREE.RepeatWrapping; });
    // stendardi con coppa e motto
    const bannerTex = ART('stendardo.png');                  // «It all adds up to THIS» con la coppa
    for (const [x, z, ry] of [[-15, -30, .5], [15, -30, -.5], [-24, 0, Math.PI/2], [24, 0, -Math.PI/2]]) add(new THREE.PlaneGeometry(3.4, 5.8), new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide }), x, 22, z, { ry });
  }

  return {
    group, setScore, setSpeed, setViewer,
    // qualità: meno pubblico sui computer lenti (le persone sono in ordine casuale per anello, ne restano a caso)
    setDensity(k){ if (crowd) crowd.density(Math.max(.1, Math.min(1, k))); },
    // tribune vuote (campo d'allenamento)
    setCrowd(visible){ if (crowd) crowd.visible = !!visible; },
    update(t, cheer = 0){ for (const f of updaters) f(t, cheer); },
  };
}
