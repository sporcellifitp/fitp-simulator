// Luoghi del Foro: etichette 3D, schede descrittive, minimappa, menu «Vai a…» con teletrasporto.
// Nomi e testi verificati a settembre 2026, fonti in docs/v0.2-planimetria.md.
import * as THREE from 'three';
import { $, show, clamp, frame, esc } from '../core/util.js';
import { isFree, bridgeFrames } from '../world/collision.js';

export function createPois(W){
  const { layout: LAYOUT, world } = W, S = LAYOUT.sites, { P, DIM, arena, groundH, rivers } = world, BOUNDS = LAYOUT.bounds;
  const POIS = [];
  const add = (site, o) => { if (site) POIS.push({ x: site.x, z: site.z, ...o }); };
  add(S.centrale, { id: 'centrale', name: 'Campo Centrale', r: 34, lh: 14,
    text: "Il campo principale degli Internazionali BNL d'Italia, dove si giocano le finali. Da giugno 2026 è in corso il rifacimento: copertura mobile e 12.500 posti, con la fine dei lavori prevista per il 2028." });
  add(S.supertennis, { id: 'st', name: 'SuperTennis Arena', r: 27, lh: 8,
    text: "Lo stadio da 3.000 posti che porta il nome del canale televisivo della Federazione. Dal 2026 si trova di fronte al Campo Centrale, accanto all'ex Ostello della Gioventù." });
  add(S.pietrangeli, { id: 'pietr', name: 'Stadio Nicola Pietrangeli', r: 30, lh: 6, y: 2,
    text: "Il più antico stadio del tennis al Foro, un tempo chiamato Pallacorda: il campo è sotto il livello del viale, tra gradoni e statue di marmo. Dal 2006 porta il nome di Nicola Pietrangeli." });
  add(S.arena, { id: 'arena', name: 'BNP Paribas Arena', r: 34, lh: (arena ? arena.top - groundH(S.arena.x, S.arena.z) : 7) + 3, prio: true,
    text: "Il secondo stadio del torneo: oltre 7.000 posti, costruito nel 2026 al centro della pista dello Stadio dei Marmi. Prende il posto della Grand Stand Arena." });
  if (P.marmi){ const [ax, az] = P.marmi.f.w(0, P.marmi.b - 2);
    add(S.marmi, { id: 'marmi', name: 'Stadio dei Marmi «Pietro Mennea»', r: Math.max(P.marmi.a, P.marmi.b) + 4, lh: 7, ax, az,
      text: "La pista di atletica circondata da circa sessanta statue di atleti in marmo di Carrara, donate dalle province italiane. Dal 2013 porta anche il nome di Pietro Mennea." }); }
  // solo i campi del torneo: quelli entro 300 m dal Pietrangeli (OSM include anche i circoli oltre il Tevere)
  const hub = S.pietrangeli || S.centrale, cs = (LAYOUT.courts || []).filter(c => Math.hypot(c.x - hub.x, c.z - hub.z) < 300);
  if (cs.length){
    const cx = cs.reduce((s, c) => s + c.x, 0)/cs.length, cz = cs.reduce((s, c) => s + c.z, 0)/cs.length;
    const r = Math.max(30, ...cs.map(c => Math.hypot(c.x - cx, c.z - cz) + 14));
    const nearCourt = (x, z) => cs.some(c => { const [lx, lz] = frame(c).l(x, z); return Math.abs(lx) < 12 && Math.abs(lz) < 21; });
    POIS.push({ id: 'esterni', name: 'Campi esterni', x: cx, z: cz, r, lh: 5, inside: LAYOUT.source === 'schematic' ? null : nearCourt, courts: cs,
      text: "I campi in terra rossa di qualificazioni e allenamenti. Nel 2026 il torneo contava 21 campi: 19 al Foro Italico e 2 sul Lungotevere." });
  }
  if (S.viale){ const f = frame(S.viale);
    add(S.viale, { id: 'viale', name: 'Viale del Foro Italico', r: 0, lh: 4, inside: (x, z) => { const [lx, lz] = f.l(x, z); return Math.abs(lx) < S.viale.len/2 && Math.abs(lz) < S.viale.wid/2 + 2; },
      text: "Un tempo Piazzale dell'Impero: circa 7.000 metri quadrati di mosaici in bianco e nero. Collega il lungotevere al piazzale della Fontana della Sfera." }); }
  add(S.fontana, { id: 'fontana', name: 'Fontana della Sfera', r: 18, lh: 8.5,
    text: "Realizzata tra il 1933 e il 1935 su progetto di Mario Paniconi e Giulio Pediconi. La sfera è un unico blocco di marmo di Carrara, la vasca è decorata con mosaici a soggetto marino." });
  add(S.olimpico, { id: 'olimpico', name: 'Stadio Olimpico', r: (S.olimpico ? Math.max(S.olimpico.a, S.olimpico.b) : 0) + 20, lh: 28,
    text: "Lo stadio del calcio e dell'atletica, vicino di casa del torneo." });
  add(S.padel, { id: 'padel', name: 'Campo da padel', r: 24, lh: 6,
    text: "Un campo da 10 metri per 20, chiuso da pareti di vetro e rete metallica. Il Foro ospita anche il BNL Italy Major Premier Padel, uno dei quattro Major del circuito: nel 2026 si è giocato dal 31 maggio al 7 giugno." });
  add(S.ponte, { id: 'ponte', name: "Ponte Duca d'Aosta", r: 20, lh: 4,
    text: "Il ponte che collega il quartiere Flaminio al Foro. All'uscita c'è piazza Lauro de Bosis, con l'obelisco all'inizio del viale." });

  const labelsEl = $('#labels');
  for (const p of POIS){
    p.el = document.createElement('div'); p.el.className = 'label'; p.el.textContent = p.name; labelsEl.appendChild(p.el);
    p.ax = p.ax ?? p.x; p.az = p.az ?? p.z; p.y = p.y ?? Math.max(groundH(p.ax, p.az), -1);
    p.el.style.opacity = 0;
  }

  /* ---------- minimappa ---------- */
  const mm = $('#minimap'), mctx = mm.getContext('2d');
  const MMB = { x0: BOUNDS.x0 - 5, x1: BOUNDS.x1 + 5, z0: BOUNDS.z0 - 5, z1: BOUNDS.z1 + 5 };
  // scala minima di circa 460 m per riquadro: sulle mappe grandi la minimappa scorre attorno al giocatore
  const mmK = Math.max(Math.min(mm.width/(MMB.x1 - MMB.x0), mm.height/(MMB.z1 - MMB.z0)), mm.width/460);
  const mmStatic = document.createElement('canvas');
  mmStatic.width = Math.ceil((MMB.x1 - MMB.x0)*mmK); mmStatic.height = Math.ceil((MMB.z1 - MMB.z0)*mmK);
  const mmX = x => (x - MMB.x0)*mmK, mmZ = z => (z - MMB.z0)*mmK;
  const mmOff = (v, size, view) => size <= view ? (size - view)/2 : clamp(v - view/2, 0, size - view);
  {
    const x = mmStatic.getContext('2d'), k = mmK;
    x.fillStyle = '#7da25a'; x.fillRect(0, 0, mmStatic.width, mmStatic.height);
    const poly = (pts, c) => { x.fillStyle = c; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(mmX(a), mmZ(b)) : x.moveTo(mmX(a), mmZ(b))); x.closePath(); x.fill(); };
    const line = (pts, w, c) => { x.strokeStyle = c; x.lineWidth = Math.max(1, w*k); x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(mmX(a), mmZ(b)) : x.moveTo(mmX(a), mmZ(b))); x.stroke(); };
    const inFrame = (o, draw) => { x.save(); x.translate(mmX(o.x), mmZ(o.z)); x.rotate(-(o.rot || 0)); x.scale(k, k); draw(); x.restore(); };
    const r = (w, d, c) => { x.fillStyle = c; x.fillRect(-w/2, -d/2, w, d); };
    const e = (a, b, c) => { x.fillStyle = c; x.beginPath(); x.ellipse(0, 0, a, b, 0, 0, Math.PI*2); x.fill(); };
    for (const rv of rivers) poly(rv.poly, '#4f7f86');
    for (const f of bridgeFrames) inFrame(f, () => r(f.len, f.wid, '#e4d8c0'));
    for (const ln of LAYOUT.lines || []) line(ln.pts, ln.w, ln.kind === 'road' ? '#9a9c9f' : '#e4d8c0');
    for (const pts of LAYOUT.paved || []) poly(pts, '#e4d8c0');
    if (S.viale) inFrame(S.viale, () => r(S.viale.len, S.viale.wid, '#f1ece1'));
    for (const b of LAYOUT.buildings || []) poly(b.pts, '#d6cdb9');
    if (P.olimpico){ const o = P.olimpico; inFrame(o, () => { e(o.a, o.b, '#d9d4ca'); e(o.a0, o.b0, '#6f9a4a'); }); }
    if (P.marmi){ const m = P.marmi; inFrame(m, () => { e(m.a, m.b, '#efe9dd'); e(m.a0, m.b0, '#b5533a'); e(m.a0 - 7, m.b0 - 7, '#6b9449'); }); }
    if (S.fontana) inFrame(S.fontana, () => e(7, 7, '#cfe6ee'));
    const stad = (s, d, c) => { if (s) inFrame(s, () => { r(d.w + 2*d.tiers*d.step, d.l + 2*d.tiers*d.step, c); r(d.w, d.l, '#c4623a'); }); };
    stad(S.centrale, DIM.centrale, '#1f4fa3'); stad(S.arena, DIM.arena, '#13795b'); stad(S.supertennis, DIM.supertennis, '#cfc8b8');
    if (P.pietr){ const p = P.pietr; inFrame(p, () => { r(2*p.hw, 2*p.hl, '#e4d8c0'); r(p.w, p.l, '#c4623a'); }); }
    for (const c of LAYOUT.courts || []) inFrame(c, () => r(18.3, 36.6, '#c4623a'));
    for (const c of (S.padel ? [S.padel] : []).concat(LAYOUT.padel || [])) inFrame(c, () => r(10, 20, '#1f5fae'));
  }
  function drawMinimap(){
    const hp = W.player.pos, a = W.hero.g.rotation.y;
    const ox = mmOff(mmX(hp.x), mmStatic.width, mm.width), oz = mmOff(mmZ(hp.z), mmStatic.height, mm.height);
    mctx.fillStyle = '#7da25a'; mctx.fillRect(0, 0, mm.width, mm.height);
    mctx.drawImage(mmStatic, -ox, -oz);
    // attività e personaggi con una missione
    const t = performance.now()/400;
    for (const it of W.interact.items.values()){
      if (!it.map) continue;
      const x = typeof it.x === 'function' ? it.x() : it.x, z = typeof it.z === 'function' ? it.z() : it.z;
      mctx.fillStyle = it.map; mctx.strokeStyle = '#0b2a5b'; mctx.lineWidth = 2;
      mctx.beginPath(); mctx.arc(mmX(x) - ox, mmZ(z) - oz, 6 + Math.sin(t)*1.2, 0, Math.PI*2); mctx.fill(); mctx.stroke();
    }
    if (W.nav && W.nav.target){
      const t = W.nav.target, tx = mmX(t.x) - ox, tz = mmZ(t.z) - oz;
      mctx.strokeStyle = 'rgba(243,198,35,.9)'; mctx.setLineDash([6, 5]); mctx.lineWidth = 3; mctx.beginPath(); mctx.moveTo(mmX(hp.x) - ox, mmZ(hp.z) - oz); mctx.lineTo(tx, tz); mctx.stroke(); mctx.setLineDash([]);
      mctx.fillStyle = '#f3c623'; mctx.strokeStyle = '#0b2a5b'; mctx.beginPath(); mctx.arc(tx, tz, 8, 0, Math.PI*2); mctx.fill(); mctx.stroke();
    }
    const px = mmX(hp.x) - ox, pz = mmZ(hp.z) - oz;
    mctx.save(); mctx.translate(px, pz); mctx.rotate(-a);
    mctx.fillStyle = '#fff'; mctx.strokeStyle = '#0b2a5b'; mctx.lineWidth = 3;
    mctx.beginPath(); mctx.moveTo(0, 13); mctx.lineTo(9, -9); mctx.lineTo(0, -4); mctx.lineTo(-9, -9); mctx.closePath(); mctx.fill(); mctx.stroke();
    mctx.restore();
  }

  /* ---------- scheda del luogo più vicino ---------- */
  let curPoi = null;
  function nearestPoi(){
    const p = W.player.pos; let best = null, bs = 1;
    for (const q of POIS){
      const s = q.inside ? (q.inside(p.x, p.z) ? .95 : 9) : Math.hypot(p.x - q.x, p.z - q.z)/q.r;
      if (q.prio && s < 1) return q;
      if (s < bs){ bs = s; best = q; }
    }
    return best;
  }
  const v = new THREE.Vector3();
  function updateLabels(){
    const cam = W.engine.camera, w = innerWidth, h = innerHeight;
    for (const q of POIS){
      v.set(q.ax, q.y + q.lh, q.az);
      const dist = cam.position.distanceTo(v); v.project(cam);
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && dist < (q.id === 'olimpico' ? 420 : 190);
      q.el.style.opacity = vis ? (curPoi === q ? 1 : .82) : 0;
      if (vis) q.el.style.transform = `translate(${(v.x*.5 + .5)*w}px, ${(-v.y*.5 + .5)*h}px) translate(-50%,-100%)`;
    }
  }

  /* ---------- teletrasporto ---------- */
  function safeSpot(x, z, pref){
    if (pref && isFree(pref[0], pref[1], .7)) return pref;
    for (let r = 0; r <= 220; r += r < 20 ? 4 : 10)
      for (let k = 0; k < 16; k++){ const a = k/16*Math.PI*2, px = x + Math.cos(a)*r, pz = z + Math.sin(a)*r; if (isFree(px, pz, .7)) return [px, pz]; }
    return [x, z];
  }
  function goPlace(q){
    let pref = null;
    const st = { st: S.supertennis, arena: S.arena }[q.id];
    if (st){ const f = frame(st), d = q.id === 'arena' ? DIM.arena : DIM.supertennis; pref = f.w(0, d.l/2 + d.tiers*d.step + 4); }
    if (q.id === 'centrale'){ const d = DIM.centrale; pref = world.CF.w(0, d.l/2 + d.tiers*d.step + 4); }
    if (q.id === 'pietr' && P.pietr) pref = P.pietr.f.w(0, P.pietr.hl + 3);
    if (q.id === 'marmi' && P.marmi) pref = P.marmi.f.w(0, P.marmi.b + 4);
    if (q.id === 'viale' && S.viale) pref = frame(S.viale).w(S.viale.len/2 - 20, 0);
    if (q.id === 'padel' && world.PF) pref = world.PF.w(7, 0);
    if (q.id === 'esterni' && q.courts){
      const c = q.courts.slice().sort((a, b) => Math.hypot(a.x - q.x, a.z - q.z) - Math.hypot(b.x - q.x, b.z - q.z))[0];
      const [x, z] = safeSpot(c.x, c.z, frame(c).w(0, 20.5)); W.player.place(x, z, c.x, c.z); return;
    }
    const [x, z] = safeSpot(q.ax ?? q.x, q.az ?? q.z, pref);
    W.player.place(x, z, q.x, q.z);
    curPoi = undefined;
  }
  function openPlaces(){
    const box = $('#places .dest'); box.innerHTML = '';
    const head = t => { const h = document.createElement('div'); h.className = 'sect'; h.textContent = t; box.appendChild(h); };
    // ogni riga: tocco sul nome = teletrasporto; «Guidami» = navigatore (a piedi o in golf car)
    const row = (title, note, cls, go, target) => {
      const r = document.createElement('div'); r.className = 'drow';
      const b = document.createElement('button'); if (cls) b.className = cls;
      b.innerHTML = `<b>${esc(title)}</b>` + (note ? `<small>${esc(note)}</small>` : '');
      b.addEventListener('click', () => { show('#places', false); W.setMode('explore'); go(); });
      r.appendChild(b);
      const t = target && target();
      if (t){
        const g = document.createElement('button'); g.className = 'guide'; g.textContent = 'Guidami';
        g.addEventListener('click', () => { show('#places', false); W.setMode('explore'); W.nav.set({ x: t.x, z: t.z, name: title }); });
        r.appendChild(g);
      }
      box.appendChild(r);
    };
    let group = null;
    for (const a of W.activities.list()){ if (a.group !== group){ group = a.group; head(group); } row(a.title, a.where, 'game', a.go, a.target); }
    head('Luoghi');
    const order = ['centrale', 'padel', 'arena', 'pietr', 'st', 'marmi', 'esterni', 'fontana', 'viale', 'ponte', 'olimpico'];
    for (const id of order){ const q = POIS.find(p => p.id === id); if (q) row(q.name, q.id === 'arena' ? 'Dentro lo Stadio dei Marmi' : '', '', () => goPlace(q), () => ({ x: q.ax ?? q.x, z: q.az ?? q.z })); }
    W.setMode('menu'); show('#places', true);
  }
  $('#goto').addEventListener('click', openPlaces);
  $('#placesClose').addEventListener('click', () => { show('#places', false); W.setMode('explore'); });

  return {
    POIS, openPlaces, goPlace, safeSpot,
    setVisible(on){ for (const p of POIS) p.el.style.display = on ? '' : 'none'; show('#minimap', on); if (!on) show('#poi', false); else curPoi = undefined; },
    update(){
      if (W.mode !== 'explore' && W.mode !== 'drive') return;
      const q = nearestPoi(), card = $('#poi');
      if (q !== curPoi){
        curPoi = q; show(card, !!q); show('#hint', !q && !document.body.classList.contains('touch'));
        if (q){ card.querySelector('h3').textContent = q.name; card.querySelector('p').textContent = q.text; W.bus.emit('poi:visit', q.id); }
      }
      updateLabels(); drawMinimap();
      if (W.input.pressed('places') && W.mode === 'explore') openPlaces();
    },
  };
}
