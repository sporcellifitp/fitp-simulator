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
  step: 0x131d45, aisle: 0x22346e, wall: 0x0c1636, roof: 0x0a1024, truss: 0x1b2747, net: 0x0d1d4d,
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

/* ---------- pubblico: figure sedute, una geometria per tutti (InstancedMesh) ---------- */
function personGeometry(){
  const parts = [];
  const body = new THREE.CapsuleGeometry(.19, .28, 2, 6); body.translate(0, .42, 0); parts.push(body);
  const head = new THREE.SphereGeometry(.12, 6, 5); head.translate(0, .86, .02); parts.push(head);
  const lap = new THREE.BoxGeometry(.34, .12, .36); lap.translate(0, .12, .18); parts.push(lap);
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
}
function mergeGeometries(list){
  let n = 0; for (const g of list){ if (g.index) { const ng = g.toNonIndexed(); list[list.indexOf(g)] = ng; } }
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n*3), nor = new Float32Array(n*3); let o = 0;
  for (const g of list){ pos.set(g.attributes.position.array, o*3); nor.set(g.attributes.normal.array, o*3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
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
  // scritta grande sul fuori campo dietro le linee di fondo, leggibile da chi sta dall'altra parte
  // TORINO sul fuori campo dietro le linee di fondo, leggibile da chi sta dall'altra parte (come nei riferimenti)
  const courtWord = ART('torino.png');
  for (const s of [-1, 1]){ const m = add(new THREE.PlaneGeometry(6.4, 1.6), new THREE.MeshLambertMaterial({ map: courtWord, transparent: true, depthWrite: false }), 0, .008, s*(HL + 3.6)); m.rotation.x = -Math.PI/2; m.rotation.z = s > 0 ? 0 : Math.PI; }

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
  const wallMat = new THREE.MeshLambertMaterial({ map: plainTex() }), neon = new THREE.MeshBasicMaterial({ color: 0x2f6dff });
  const wall = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1)/2, cz = (z0 + z1)/2, ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI/2;
    add(new THREE.BoxGeometry(L, WH, WT), wallMat, cx, WH/2, cz, { ry });
    add(new THREE.BoxGeometry(L, .05, WT + .04), neon, cx, WH + .025, cz, { ry });
  };
  for (const s of [-1, 1]){ wall(-WX - WT/2, s*(WZ + WT/2), WX + WT/2, s*(WZ + WT/2)); wall(-(WX + WT/2), -WZ, -(WX + WT/2), WZ); }
  wall(WX + WT/2, -WZ, WX + WT/2, -PIT); wall(WX + WT/2, PIT, WX + WT/2, WZ);
  // varco delle telecamere: il muro si interrompe, i due capi sono rifiniti come le testate del muro
  for (const e of [-1, 1]) add(new THREE.BoxGeometry(WT + .04, WH + .05, .04), neon, WX + WT/2, WH/2, e*PIT);
  // loghi sul lato interno del muro, con le proporzioni dei file
  const deco = (tex, w, h, x, z, ry, y = WH/2) => add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }), x, y, z, { ry });
  const hor = ART('nitto-atp-finals.png'), stack = ART('logo-impilato.png'), esp = ART('esports.png'), led = ART('pannello-led.png');
  const ledPanel = (x, z, ry) => add(new THREE.BoxGeometry(2.05, 1.07, .14), new THREE.MeshBasicMaterial({ map: led }), x, .54, z, { ry });
  for (const s of [-1, 1]){
    // fondo: ESPORTS · Nitto ATP FINALS · ESPORTS, pannelli LED negli angoli
    const z = s*(WZ - .01), ry = s > 0 ? Math.PI : 0;
    deco(hor, 7.2, 7.2*210/2048, 0, z, ry);
    for (const e of [-1, 1]) deco(esp, 1.6, 1.6*530/1024, e*5.4, z, ry);
    for (const e of [-1, 1]) ledPanel(e*(WX - 1.25), s*(WZ - .1), ry);
    // lati lunghi: logo impilato e ESPORTS alternati, pannelli LED negli angoli, logo orizzontale grande verso gli angoli
    const x = s*(WX - .01), ry2 = s > 0 ? -Math.PI/2 : Math.PI/2;
    for (const zz of [-16, -7, 7, 16]) deco(stack, 1.1, .88, x, zz, ry2);
    for (const zz of [-11.8, 11.8]) deco(esp, 1.6, 1.6*530/1024, x, zz, ry2);
    for (const e of [-1, 1]) ledPanel(s*(WX - .1), e*(WZ - 1.25), ry2);
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

  // persona in piedi (operatori, raccattapalle): gambe, busto, testa; scale < 1 per i ragazzi. Un po' di luce propria:
  // i fari del campo li illuminano di fronte, con la sola luce dall'alto i fianchi prenderebbero il blu dell'ambiente
  const lit = c => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: .32 });
  const skin = lit(0xd9a98a);
  const person = (x, z, ry, shirt, pants, k = 1, y = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(k); group.add(g);
    const part = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = true; g.add(o); };
    for (const e of [-1, 1]) part(new THREE.CapsuleGeometry(.075, .7, 2, 6), lit(pants), e*.1, .45, 0);
    part(new THREE.CapsuleGeometry(.17, .42, 2, 8), lit(shirt), 0, 1.15, 0);
    for (const e of [-1, 1]) part(new THREE.CapsuleGeometry(.055, .5, 2, 6), lit(shirt), e*.24, 1.12, .04);
    part(new THREE.SphereGeometry(.12, 10, 8), skin, 0, 1.58, 0);
  };
  /* sedia dell'arbitro bianca ad «A», panchine bianche, operatori TV, raccattapalle */
  {
    const white = lam(0xf2f5ff), X = -(DW + 1.9);
    // sedia ad «A»: le due gambe si aprono verso il campo e verso il muro (la «A» si legge guardando dal fondo), con
    // scaletta, pedana, schienale e l'arbitro seduto in cima
    for (const s of [-1, 1]){ const leg = add(new THREE.BoxGeometry(.13, 2.55, .55), white, X + s*.34, 1.22, 0, { shadow: true }); leg.rotation.z = -s*.28; }
    for (const [y, w] of [[.55, 1.15], [1.05, .85], [1.55, .55]]) add(new THREE.BoxGeometry(w, .09, .5), white, X, y, 0);
    add(new THREE.BoxGeometry(.8, .12, .8), white, X, 2.45, 0, { shadow: true }); add(new THREE.BoxGeometry(.1, .75, .8), white, X - .38, 2.85, 0);
    person(X - .08, 0, Math.PI/2, 0x1b2140, 0x1b2140, .78, 1.75);
    const sofa = z => { add(new THREE.BoxGeometry(.9, .45, 2.2), white, X - .9, .25, z, { shadow: true }); add(new THREE.BoxGeometry(.25, .55, 2.2), white, X - 1.25, .7, z); for (const e of [-1, 1]) add(new THREE.BoxGeometry(.9, .3, .2), white, X - .9, .6, z + e*1.05); };
    sofa(-3.2); sofa(3.2);
    // operatori TV: tre telecamere sul cavalletto nella buca del lato opposto all'arbitro, all'altezza della rete
    for (const cz of [-1.6, 0, 1.6]){
      const cx = WX - .1;
      for (const a of [0, 2.1, 4.2]){ const l = add(new THREE.CylinderGeometry(.02, .02, 1.3, 4), lam(0x111111), cx - .35 + Math.cos(a)*.2, .62, cz + Math.sin(a)*.2); l.rotation.z = Math.cos(a)*.16; l.rotation.x = -Math.sin(a)*.16; }
      add(new THREE.BoxGeometry(.75, .34, .34), lam(0x2a2c33), cx - .45, 1.42, cz, { shadow: true });
      add(new THREE.CylinderGeometry(.11, .13, .22, 10), lam(0x111216), cx - .9, 1.42, cz).rotation.z = Math.PI/2;
      person(cx + .15, cz, -Math.PI/2, 0xf2f4fa, 0x15161c);
    }
    // raccattapalle in fondo, davanti al muro, ai lati del logo
    for (const s of [-1, 1]) for (const e of [-1, 1]) person(e*4.6, s*(WZ - .6), s > 0 ? Math.PI : 0, 0xf4f6fb, 0xf4f6fb, .82);
  }

  /* tribune: anello basso, fascia LED, anello alto; pubblico seduto; scale e passaggi tra i settori */
  const people = [], steps = [], aisles = [];
  let crowd = null, crowdN = 0;
  const tiers = [
    { hx: 12.9, hz: 22.4, R: 6, rows: 12, d: .82, rise: .5, y0: 1.5, gapEnd: 4.2 },
    { hx: 12.9 + 11.2, hz: 22.4 + 11.2, R: 6 + 11.2, rows: Math.round(14*quality + 4*(1 - quality)), d: .8, rise: .62, y0: 9.4, gapEnd: 0 },
  ];
  const SP = .56, SEC = 14;
  for (const T of tiers){
    for (let r = 0; r < T.rows; r++){
      const o = r*T.d, y = T.y0 + r*T.rise, pts = ringPath(T.hx + o, T.hz + o, T.R + o, SP);
      pts.forEach((p, i) => {
        const endCenter = Math.abs(p.nz) > .99 && Math.abs(p.x) < T.gapEnd && r < 9;       // a metà dei lati corti: maxischermo e passaggio
        const aisle = i % SEC === 0 || endCenter;
        (aisle ? aisles : steps).push({ x: p.x + p.nx*T.d/2, y, z: p.z + p.nz*T.d/2, ry: Math.atan2(p.nx, p.nz), w: SP, d: T.d, h: T.rise + (r === 0 ? T.y0 : 0) });
        if (!aisle && Math.random() < .9) people.push({ x: p.x + p.nx*T.d*.45, y, z: p.z + p.nz*T.d*.45, ry: Math.atan2(-p.nx, -p.nz) });
      });
    }
  }
  for (let i = people.length - 1; i > 0; i--){ const j = (Math.random()*(i + 1)) | 0; [people[i], people[j]] = [people[j], people[i]]; }
  const box = new THREE.BoxGeometry(1, 1, 1), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const instanced = (list, mat, size) => {
    const im = new THREE.InstancedMesh(box, mat, list.length);
    list.forEach((s, i) => { Q.setFromAxisAngle(up, s.ry); V.set(s.x, s.y - s.h/2, s.z); S.set(s.w, s.h, s.d); M.compose(V, Q, S); im.setMatrixAt(i, M); });
    im.receiveShadow = false; group.add(im); return im;
  };
  instanced(steps, lam(C.step)); instanced(aisles, lam(C.aisle));
  {
    const im = new THREE.InstancedMesh(personGeometry(), new THREE.MeshLambertMaterial(), people.length), col = new THREE.Color();
    const palette = [0x9fb4ee, 0x7f97e0, 0xb7c6f4, 0x6278cc, 0xcfd9fb, 0x5468b8, 0x8e86e8, 0x4a5fae];
    people.forEach((p, i) => { Q.setFromAxisAngle(up, p.ry); V.set(p.x, p.y, p.z); S.set(1, 1, 1); M.compose(V, Q, S); im.setMatrixAt(i, M); im.setColorAt(i, col.set(palette[(Math.random()*palette.length) | 0])); });
    // il pubblico salta quando si fa punto (spostamento nello shader, nessun costo sulla CPU)
    const U = { uTime: { value: 0 }, uCheer: { value: 0 } };
    im.material.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'uniform float uTime; uniform float uCheer;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += uCheer*.22*abs(sin(uTime*9. + float(gl_InstanceID)*1.7));');
    };
    group.add(im); crowd = im; crowdN = people.length;
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
    group, setScore, setSpeed,
    // qualità: meno pubblico sui computer lenti (le persone sono in ordine casuale per anello, ne restano a caso)
    setDensity(k){ if (crowd) crowd.count = Math.round(crowdN*Math.max(.1, Math.min(1, k))); },
    // tribune vuote (campo d'allenamento)
    setCrowd(visible){ if (crowd) crowd.visible = !!visible; },
    update(t, cheer = 0){ for (const f of updaters) f(t, cheer); },
  };
}
