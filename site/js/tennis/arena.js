// L'arena di «Racchetta», ricostruita sulle immagini di riferimento: palazzetto al chiuso in luce blu, campo in cemento
// blu scuro dentro un ampio fuori campo azzurro, righe bianche, rete scura con nastro bianco, tabelloni bassi blu con
// scritte bianche, pannelli LED, segnapunti arancioni, raccattapalle, sedia dell'arbitro bianca a «A» con le due panchine,
// operatori TV, scritta grande sul fuori campo, tribune a due anelli divisi da una fascia LED, cubo-maxischermo e
// stendardi appesi al tetto a travature.
// Marchi: al posto dei loghi dei riferimenti (di terzi) ci sono il nome e i colori del gioco, tutti in BRAND. Per usare
// loghi ufficiali, una volta autorizzati, basta indicare in BRAND le immagini (logo, badge): niente da toccare altrove.
import * as THREE from 'three';

export const BRAND = {
  name: 'RACCHETTA', tagline: 'TENNIS ARCADE', court: 'RACCHETTA', slogan: ['OGNI PUNTO', 'CONTA'],
  logo: null, badge: null,              // immagini facoltative (URL) al posto delle scritte
  accent: '#ff3d8b', led: '#1d4fff',
};
const C = {                              // colori presi dalle immagini di riferimento (sotto luce blu)
  court: 0x294a94, runoff: 0x2a80d2, line: 0xf2f7ff, board: 0x0b2468, boardTop: 0x14327f,
  step: 0x131d45, aisle: 0x22346e, wall: 0x0c1636, roof: 0x0a1024, truss: 0x1b2747, net: 0x0d1d4d,
};
const HW = 4.115, DW = 5.485, HL = 11.885, SZ = 6.4;

/* ---------- testi e immagini su tela (CanvasTexture) ---------- */
const FONT = '"Barlow Condensed","Arial Narrow",Arial,sans-serif';
function canvas(w, h, draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function wordmark(x, w, h, { color = '#fff', size = .62, sub = true } = {}){
  x.save(); x.translate(w/2, h/2); x.transform(1, 0, -.18, 1, 0, 0);
  x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `italic 800 ${Math.round(h*size)}px ${FONT}`;
  x.fillText(BRAND.name, 0, sub ? -h*.08 : 0);
  if (sub){ x.font = `italic 600 ${Math.round(h*size*.32)}px ${FONT}`; x.fillStyle = BRAND.accent; x.fillText(BRAND.tagline, 0, h*.32); }
  x.restore();
}
function badge(x, cx, cy, r){
  x.save(); x.translate(cx, cy);
  x.fillStyle = BRAND.accent; x.beginPath(); x.arc(0, 0, r, 0, Math.PI*2); x.fill();
  x.fillStyle = '#e4f54a'; x.beginPath(); x.arc(r*.42, -r*.38, r*.32, 0, Math.PI*2); x.fill();
  x.fillStyle = '#fff'; x.font = `italic 800 ${Math.round(r*1.25)}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(BRAND.name[0], -r*.08, r*.06);
  x.restore();
}
const boardTex = (w, h, kind) => canvas(w, h, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16378f'); g.addColorStop(1, '#0a2163'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  if (kind === 'word') wordmark(x, W, H, { size: .5 });
  if (kind === 'badge'){ badge(x, W*.5, H*.5, H*.36); }
  if (kind === 'led'){ x.fillStyle = BRAND.led; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < W; i += 6) x.fillRect(i, 0, 2, H); wordmark(x, W, H, { size: .38 }); }
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

export function buildArena(scene, { quality = 1 } = {}){
  const group = new THREE.Group(); scene.add(group);
  const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  const add = (geo, mat, x, y, z, { ry = 0, shadow = false, receive = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = shadow; m.receiveShadow = receive; group.add(m); return m; };
  const updaters = [];

  /* fondo: fuori campo azzurro, campo blu scuro (doppio), righe */
  const floor = add(new THREE.PlaneGeometry(26, 44), lam(C.runoff), 0, 0, 0); floor.rotation.x = -Math.PI/2;
  const court = add(new THREE.PlaneGeometry(2*DW, 2*HL), lam(C.court), 0, .003, 0); court.rotation.x = -Math.PI/2;
  const lineMat = lam(C.line);
  const line = (x0, z0, x1, z1) => { const m = add(new THREE.PlaneGeometry(Math.abs(x1 - x0) || .05, Math.abs(z1 - z0) || .05), lineMat, (x0 + x1)/2, .006, (z0 + z1)/2); m.rotation.x = -Math.PI/2; };
  for (const s of [-1, 1]){ line(-DW, s*HL, DW, s*HL); line(s*DW, -HL, s*DW, HL); line(s*HW, -HL, s*HW, HL); line(-HW, s*SZ, HW, s*SZ); line(0, s*HL, 0, s*(HL - .1)); }
  line(0, -SZ, 0, SZ);
  // scritta grande sul fuori campo dietro le linee di fondo, leggibile da chi sta dall'altra parte
  const courtWord = canvas(1024, 160, (x, W, H) => { x.fillStyle = 'rgba(255,255,255,.92)'; x.font = `italic 800 ${H*.8}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(BRAND.court, W/2, H*.55); });
  for (const s of [-1, 1]){ const m = add(new THREE.PlaneGeometry(7, 1.1), new THREE.MeshLambertMaterial({ map: courtWord, transparent: true }), 0, .008, s*(HL + 3.3)); m.rotation.x = -Math.PI/2; m.rotation.z = s > 0 ? 0 : Math.PI; }

  /* rete: profilo vero, maglia scura, nastro e fascia centrale bianchi, scritta vicino ai pali */
  {
    const X = DW + .914, seg = 24, g = new THREE.PlaneGeometry(2*X, 1, seg, 1), P = g.attributes.position;
    for (let i = 0; i < P.count; i++){ const x = P.getX(i), top = P.getY(i) > 0; P.setY(i, top ? .914 + .156*Math.min(1, Math.abs(x)/X)**1.6 : 0); }
    const mesh = canvas(512, 64, (x, W, H) => {
      x.fillStyle = 'rgba(8,20,60,.55)'; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(10,22,60,.95)'; x.lineWidth = 2; for (let i = 0; i <= W; i += 8){ x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j <= H; j += 8){ x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
      for (const cx of [W*.13, W*.87]){ x.save(); x.translate(cx, H*.55); x.transform(1, 0, -.18, 1, 0, 0); x.fillStyle = '#fff'; x.font = `italic 800 ${H*.34}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(BRAND.name, 0, 0); x.restore(); }
    });
    const net = add(g, new THREE.MeshLambertMaterial({ map: mesh, transparent: true, side: THREE.DoubleSide, depthWrite: false }), 0, 0, 0); net.receiveShadow = false;
    const tape = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: seg + 1 }, (_, i) => { const x = -X + i*2*X/seg; return new THREE.Vector3(x, .914 + .156*Math.min(1, Math.abs(x)/X)**1.6 - .03, 0); })), 48, .035, 6), lam(0xffffff));
    tape.castShadow = true; group.add(tape);
    add(new THREE.BoxGeometry(.05, .9, .02), lam(0xffffff), 0, .45, 0);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(.12, 1.07, .12), lam(0x0f2254), s*X, .535, 0, { shadow: true });
  }

  /* tabelloni bassi: blu scuro con scritte, pannelli LED, segnapunti arancioni (vivi: punteggio e velocità) */
  const boards = [];
  const panel = (w, h, tex, x, z, ry, emissive = false) => {
    const m = add(new THREE.BoxGeometry(w, h, .14), new THREE.MeshLambertMaterial({ map: tex, emissive: emissive ? 0xffffff : 0x000000, emissiveMap: emissive ? tex : null, emissiveIntensity: emissive ? .9 : 0 }), x, h/2, z, { ry, shadow: false });
    boards.push(m); return m;
  };
  const word = boardTex(1024, 128, 'word'), bdg = boardTex(256, 128, 'badge'), led = boardTex(512, 192, 'led'), plain = boardTex(64, 64, 'plain');
  for (const s of [-1, 1]){
    const z = s*21, ry = s > 0 ? Math.PI : 0;
    panel(24, 1, plain, 0, z + s*.08, ry);
    panel(8.5, 1, word, 0, z, ry); panel(2.2, 1, bdg, -5.6*s, z, ry); panel(2.2, 1, bdg, 5.6*s, z, ry);
    panel(2.5, 1.05, led, -8.8, z - s*.05, ry, true); panel(2.5, 1.05, led, 8.8, z - s*.05, ry, true);
    const x = s*12.2, ry2 = s > 0 ? -Math.PI/2 : Math.PI/2;
    panel(42, 1, plain, x + s*.08, 0, ry2);
    for (const zz of [-13, 13]) panel(8, 1, word, x, zz, ry2);
    for (const zz of [-6.5, 6.5]) panel(2.2, 1, bdg, x, zz, ry2);
    for (const zz of [-18.4, 18.4]) panel(2.5, 1.05, led, x - s*.05, zz, ry2, true);
  }
  // segnapunti (arancione su nero) sopra il tabellone di fondo: punteggio in game e velocità dell'ultimo servizio
  const seg7 = (txt, w, h) => canvas(w, h, (x, W, H) => { x.fillStyle = '#070707'; x.fillRect(0, 0, W, H); x.strokeStyle = '#3a2a10'; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6); x.fillStyle = '#ff9a1f'; x.font = `700 ${H*.72}px "Courier New",monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, W/2, H*.54); });
  const scoreBox = { mats: [] }, speedBox = { mats: [] };
  for (const s of [-1, 1]){
    const ry = s > 0 ? Math.PI : 0;
    const a = add(new THREE.BoxGeometry(1.25, .62, .12), new THREE.MeshBasicMaterial({ map: seg7('0-0', 256, 128) }), 2.4*s*-1, 1.42, s*21.05, { ry }); scoreBox.mats.push(a.material);
    const b = add(new THREE.BoxGeometry(1.25, .5, .12), new THREE.MeshBasicMaterial({ map: seg7('000', 256, 100) }), -2.4*s*-1, 1.38, s*21.05, { ry }); speedBox.mats.push(b.material);
    for (const xx of [2.4, -2.4]) add(new THREE.BoxGeometry(.06, .5, .06), lam(0x111111), xx, 1.0, s*21.05);
  }
  const setScore = txt => { for (const m of scoreBox.mats){ m.map.dispose(); m.map = seg7(txt, 256, 128); } };
  const setSpeed = kmh => { for (const m of speedBox.mats){ m.map.dispose(); m.map = seg7(String(Math.round(kmh)).padStart(3, '0'), 256, 100); } };

  /* sedia dell'arbitro bianca ad «A», panchine bianche, operatori TV, raccattapalle */
  {
    const white = lam(0xf2f5ff), X = -(DW + 1.9);
    for (const s of [-1, 1]){ const leg = add(new THREE.BoxGeometry(.12, 2.6, .5), white, X, 1.25, s*.45, { shadow: true }); leg.rotation.x = s*.2; }
    add(new THREE.BoxGeometry(.12, .1, 1.1), white, X, .9, 0); add(new THREE.BoxGeometry(.12, .1, .9), white, X, 1.6, 0);
    add(new THREE.BoxGeometry(.8, .12, .8), white, X, 2.45, 0, { shadow: true }); add(new THREE.BoxGeometry(.1, .7, .8), white, X - .35, 2.85, 0);
    const sofa = z => { add(new THREE.BoxGeometry(.9, .45, 2.2), white, X - .9, .25, z, { shadow: true }); add(new THREE.BoxGeometry(.25, .55, 2.2), white, X - 1.25, .7, z); for (const e of [-1, 1]) add(new THREE.BoxGeometry(.9, .3, .2), white, X - .9, .6, z + e*1.05); };
    sofa(-3.2); sofa(3.2);
    // operatori TV con telecamera sul cavalletto, nell'angolo vicino
    for (let i = 0; i < 3; i++){
      const cx = -10 + i*.9, cz = 16.3 + i*1.1;
      for (const a of [0, 2.1, 4.2]){ const l = add(new THREE.CylinderGeometry(.02, .02, 1.3, 4), lam(0x111111), cx + Math.cos(a)*.18, .62, cz + Math.sin(a)*.18); l.rotation.z = Math.cos(a)*.15; l.rotation.x = -Math.sin(a)*.15; }
      add(new THREE.BoxGeometry(.32, .3, .6), lam(0x26272c), cx, 1.38, cz - .05, { ry: -.6, shadow: true });
    }
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
    pts.forEach((p, i) => { if (i) acc += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z); pos.push(p.x, y, p.z, p.x, y + 1.2, p.z); uv.push(acc/14, 0, acc/14, 1); if (i){ const a = (i - 1)*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const tex = canvas(1024, 96, (x, W, H) => { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b2bd6'); gr.addColorStop(.5, '#2a5cff'); gr.addColorStop(1, '#0b2bd6'); x.fillStyle = gr; x.fillRect(0, 0, W, H); wordmark(x, W, H, { size: .6, sub: false }); });
    tex.wrapS = THREE.RepeatWrapping;
    const ribbon = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); group.add(ribbon);
    updaters.push(t => { tex.offset.x = -t*.05; });
  }
  // maxischermo sopra il passaggio di fondo, con la fascia nera in alto
  const screens = [];
  const screenTex = () => canvas(640, 360, (x, W, H) => { const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a1a8a'); g.addColorStop(1, '#2f6bff'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.fillStyle = '#e4f54a'; badge(x, W*.5, H*.3, H*.12); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `500 ${H*.11}px ${FONT}`; x.fillText(BRAND.slogan[0], W/2, H*.55); x.font = `800 ${H*.28}px ${FONT}`; x.fillText(BRAND.slogan[1], W/2, H*.82); });
  for (const s of [-1, 1]){
    const z = s*(22.4 + 3.2), ry = s > 0 ? Math.PI : 0;
    const sc = add(new THREE.PlaneGeometry(5.6, 3.15), new THREE.MeshBasicMaterial({ map: screenTex() }), 0, 4.9, z, { ry });
    const hdr = canvas(512, 48, (x, W, H) => { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); wordmark(x, W, H, { size: .7, sub: false }); });
    add(new THREE.PlaneGeometry(5.6, .55), new THREE.MeshBasicMaterial({ map: hdr }), 0, 6.8, z, { ry });
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
    for (let i = 0; i < 18; i++){ const a = i/18*Math.PI*2; add(new THREE.SphereGeometry(.35, 8, 6), lamp, Math.cos(a)*16, roofY - .5, Math.sin(a)*24); }
    // cubo con quattro schermi e anello LED sotto
    const cube = new THREE.Group(); cube.position.set(0, 20, 0); group.add(cube);
    const cubeTex = canvas(512, 320, (x, W, H) => { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1238ff'); g.addColorStop(1, '#071a8a'); x.fillStyle = g; x.fillRect(0, 0, W, H); wordmark(x, W, H, { size: .36 }); });
    const cubeMat = new THREE.MeshBasicMaterial({ map: cubeTex });
    for (let i = 0; i < 4; i++){ const f = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.4), cubeMat); f.position.set(Math.sin(i*Math.PI/2)*3.5, 0, Math.cos(i*Math.PI/2)*3.5); f.rotation.y = i*Math.PI/2; cube.add(f); }
    const ringTex = canvas(1024, 64, (x, W, H) => { x.fillStyle = '#0d2bd8'; x.fillRect(0, 0, W, H); wordmark(x, W/2, H, { size: .7, sub: false }); x.translate(W/2, 0); wordmark(x, W/2, H, { size: .7, sub: false }); });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, .9, 40, 1, true), new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide }));
    ring.position.y = -2.9; cube.add(ring);
    const top = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 7), lam(0x0b1440)); top.position.y = 2.7; cube.add(top);
    updaters.push(t => { ringTex.offset.x = t*.03; ringTex.wrapS = THREE.RepeatWrapping; });
    // stendardi con coppa e motto
    const bannerTex = canvas(256, 512, (x, W, H) => {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b6bff'); g.addColorStop(1, '#0a1f8f'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = `500 ${W*.11}px ${FONT}`; x.fillText(BRAND.slogan[0], W/2, H*.12); x.font = `800 ${W*.26}px ${FONT}`; x.fillText(BRAND.slogan[1], W/2, H*.27);
      // coppa stilizzata
      x.fillStyle = '#d9dce6'; x.beginPath(); x.moveTo(W*.3, H*.36); x.lineTo(W*.7, H*.36); x.quadraticCurveTo(W*.7, H*.58, W*.54, H*.62); x.lineTo(W*.54, H*.72); x.lineTo(W*.62, H*.78); x.lineTo(W*.38, H*.78); x.lineTo(W*.46, H*.72); x.lineTo(W*.46, H*.62); x.quadraticCurveTo(W*.3, H*.58, W*.3, H*.36); x.fill();
      x.strokeStyle = '#d9dce6'; x.lineWidth = 6; for (const s of [-1, 1]){ x.beginPath(); x.arc(W*.5 + s*W*.22, H*.44, W*.07, 0, Math.PI*2); x.stroke(); }
      badge(x, W*.5, H*.9, W*.08);
    });
    for (const [x, z, ry] of [[-15, -30, .5], [15, -30, -.5], [-24, 0, Math.PI/2], [24, 0, -Math.PI/2]]) add(new THREE.PlaneGeometry(3.2, 6.4), new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide }), x, 22, z, { ry });
  }

  return {
    group, setScore, setSpeed,
    // qualità: meno pubblico sui computer lenti (le persone sono in ordine casuale per anello, ne restano a caso)
    setDensity(k){ if (crowd) crowd.count = Math.round(crowdN*Math.max(.1, Math.min(1, k))); },
    update(t, cheer = 0){ for (const f of updaters) f(t, cheer); },
  };
}
