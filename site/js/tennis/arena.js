// L'arena del gioco, ricostruita sulle immagini di riferimento: palazzetto al chiuso in luce blu, campo in cemento
// blu scuro dentro un ampio fuori campo azzurro, righe bianche, rete scura con nastro bianco, tabelloni bassi blu con
// scritte bianche, pannelli LED, segnapunti arancioni, raccattapalle, sedia dell'arbitro bianca a «A» con le due panchine,
// operatori TV, scritta grande sul fuori campo, tribune a due anelli divisi da una fascia LED, cubo-maxischermo e
// stendardi appesi al tetto a travature.
// Branding come nei riferimenti: Nitto ATP Finals, ESPORTS FITP, «It all adds up to THIS», TORINO. Le grafiche stanno in
// site/assets/arena/ (ritagliate dalle immagini di riferimento): per averle più nitide basta sostituire i file con quelli
// ufficiali, con gli stessi nomi.
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
const ART = name => { const t = loader.load(new URL('../../assets/arena/' + name, import.meta.url).href); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
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
    // logo Nitto ATP Finals sulla rete, vicino ai due pali, sulle due facce
    const netLogo = new THREE.MeshBasicMaterial({ map: ART('rete-logo.png'), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.PlaneGeometry(1.45, .9), netLogo, sx*(X - 1.05), .5, sz*.014).renderOrder = 2;   // sopra le maglie della rete da ogni lato
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(.12, 1.07, .12), lam(0x0f2254), s*X, .535, 0, { shadow: true });
  }

  /* tabelloni bassi: blu scuro con scritte, pannelli LED, segnapunti arancioni (vivi: punteggio e velocità) */
  const boards = [];
  const panel = (w, h, tex, x, z, ry, emissive = false) => {
    const m = add(new THREE.BoxGeometry(w, h, .14), new THREE.MeshLambertMaterial({ map: tex, emissive: emissive ? 0xffffff : 0x000000, emissiveMap: emissive ? tex : null, emissiveIntensity: emissive ? .9 : 0 }), x, h/2, z, { ry, shadow: false });
    boards.push(m); return m;
  };
  // come nei riferimenti: dietro le linee di fondo ESPORTS · Nitto ATP FINALS · ESPORTS con un pannello LED per lato;
  // sui lati la scritta Nitto ATP FINALS, i loghi ESPORTS e i pannelli LED verso gli angoli
  const fondo = ART('tabellone-fondo.png'), word = ART('nitto-atp-finals.png'), bdg = ART('esports.png'), led = ART('pannello-led.png'), plain = plainTex();
  for (const s of [-1, 1]){
    const z = s*21, ry = s > 0 ? Math.PI : 0;
    panel(24, 1, plain, 0, z + s*.08, ry);
    panel(13.2, 1, fondo, 0, z, ry);
    panel(2.05, 1.07, led, -7.95, z - s*.05, ry, true); panel(2.05, 1.07, led, 7.95, z - s*.05, ry, true);
    const x = s*12.2, ry2 = s > 0 ? -Math.PI/2 : Math.PI/2;
    panel(42, 1, plain, x + s*.08, 0, ry2);
    for (const zz of [-13.5, 0, 13.5]) panel(7.6, 1, word, x, zz, ry2);
    for (const zz of [-7, 7]) panel(2, 1, bdg, x, zz, ry2);
    for (const zz of [-18.6, 18.6]) panel(2.05, 1.07, led, x - s*.05, zz, ry2, true);
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
    pts.forEach((p, i) => { if (i) acc += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z); pos.push(p.x, y, p.z, p.x, y + 1.2, p.z); uv.push(-acc/9.4, 0, -acc/9.4, 1); if (i){ const a = (i - 1)*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const tex = ART('fascia-led.png');
    tex.wrapS = THREE.RepeatWrapping;
    const ribbon = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); group.add(ribbon);
    updaters.push(t => { tex.offset.x = -t*.05; });
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
    for (let i = 0; i < 18; i++){ const a = i/18*Math.PI*2; add(new THREE.SphereGeometry(.35, 8, 6), lamp, Math.cos(a)*16, roofY - .5, Math.sin(a)*24); }
    // cubo con quattro schermi e anello LED sotto
    const cube = new THREE.Group(); cube.position.set(0, 20, 0); group.add(cube);
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
    update(t, cheer = 0){ for (const f of updaters) f(t, cheer); },
  };
}
