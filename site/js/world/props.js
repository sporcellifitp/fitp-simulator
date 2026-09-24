// Allestimenti del torneo e elementi animati: fan zone (maxischermo, chioschi, info point, ombrelloni, bandiere),
// seggioloni con arbitro, getti della fontana, gabbiani. Allestimenti stilizzati, non la disposizione reale del 2026.
import * as THREE from 'three';
import { frame, clamp } from '../core/util.js';
import { isFree, addRect, colliders, occupied } from './collision.js';
import { box, mat } from './geom.js';
import { makeAvatar, pose } from '../entities/avatar.js';

function canvasPanel(w, h, pw, ph){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: tex }));
  m.userData.dynamic = true;
  return { c, ctx: c.getContext('2d'), tex, m };
}

export function buildProps(W){
  const { scene } = W.engine, L = W.layout, S = L.sites, { CF, P, DIM, groundH } = W.world;
  const dyn = [];          // aggiornati a ogni fotogramma
  const out = { fanZone: null, boardSpot: null, update(dt){ for (const d of dyn) d(dt); } };

  // la fan zone ora è dentro il Fan Village (world/village.js): qui resta solo il disegno del maxischermo
  const screen = W.village ? W.village.screen : null;
  // maxischermo: punteggio della partita dal vivo sul Centrale (o di quella del giocatore)
  const drawScreen = s => {
    if (!screen) return;
    screen.redraw((x, w, h) => {
      x.fillStyle = '#0b2a5b'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#c8643b'; x.fillRect(0, 0, w, 86);
      x.fillStyle = '#fff'; x.font = 'bold 54px "Barlow Condensed", Arial Narrow, sans-serif';
      x.fillText(s ? 'IN DIRETTA · CAMPO CENTRALE' : 'FORO ITALICO WORLD · FAN VILLAGE', 32, 62);
      if (!s){ x.font = '44px Barlow, Arial, sans-serif'; x.fillText('Tra poco si gioca sul Centrale', 40, 300); return; }
      for (let t = 0; t < 2; t++){
        const y = 200 + t*170;
        x.fillStyle = t === s.server ? '#f3c623' : 'rgba(255,255,255,.25)'; x.beginPath(); x.arc(56, y - 18, 14, 0, Math.PI*2); x.fill();
        x.fillStyle = '#fff'; x.font = 'bold 76px "Barlow Condensed", Arial Narrow, sans-serif'; x.fillText(String(s.names[t]).slice(0, 18), 92, y);
        x.fillStyle = '#f3c623'; x.fillText(String(s.games[t]), 760, y);
        x.fillStyle = '#fff'; x.fillText(String(s.points[t]), 880, y);
      }
      if (s.over){ x.fillStyle = '#f3c623'; x.font = 'bold 44px Barlow, Arial, sans-serif'; x.fillText('Partita finita', 40, 540); }
    });
  };
  // tra un punteggio e l'altro il maxischermo mostra foto vere del Foro, con autore e licenza
  const SLIDES = [
    ['centrale-2015.jpg', 'Il Campo Centrale', 'Stefano Cappa · CC BY 3.0'],
    ['pietrangeli-2012.jpg', 'Lo Stadio Nicola Pietrangeli', 'Itto Ogami · CC BY 3.0'],
    ['davis-2016.jpg', 'La Coppa Davis', 'Carine06 · CC BY-SA 2.0'],
    ['fedcup-2018.jpg', 'La coppa della Fed Cup', 'Peter Menzel · CC BY-SA 2.0'],
    ['fontana-sfera.jpg', 'La Fontana della Sfera', 'Wikimau60 · CC BY-SA 4.0'],
    ['stadio-marmi.jpg', 'Lo Stadio dei Marmi', 'Anthony Majanlahti · CC BY 2.0'],
    ['viale-mosaici.jpg', 'I mosaici del piazzale, 1963', 'Fortepan / Pierre Varga · CC BY-SA 3.0'],
    ['campi-esterni.jpg', 'I campi esterni', 'Itto Ogami · CC BY 3.0'],
  ];
  const slideImgs = SLIDES.map(([f]) => { const i = new Image(); i.src = 'assets/photos/' + f; return i; });
  let lastScore = null, slide = 0, slideT = 0, showing = 'score';
  const drawSlide = k => {
    const im = slideImgs[k], [, title, credit] = SLIDES[k];
    if (!screen || !im.complete || !im.naturalWidth) return false;
    screen.redraw((x, w, h) => {
      const r = Math.max(w/im.naturalWidth, h/im.naturalHeight), sw = w/r, sh = h/r;
      x.drawImage(im, (im.naturalWidth - sw)/2, (im.naturalHeight - sh)/2, sw, sh, 0, 0, w, h);
      x.fillStyle = 'rgba(11,42,91,.86)'; x.fillRect(0, h - 96, w, 96);
      x.fillStyle = '#fff'; x.font = 'bold 50px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText(title, 28, h - 40);
      x.fillStyle = '#f3c623'; x.font = '24px Barlow, Arial, sans-serif'; x.textAlign = 'right'; x.fillText('Foto: ' + credit + ' · Wikimedia Commons', w - 24, h - 42); x.textAlign = 'left';
    });
    return true;
  };
  dyn.push(dt => {
    slideT += dt;
    if (showing === 'score' && slideT > (lastScore ? 16 : 5)){ if (drawSlide(slide)){ showing = 'photo'; slideT = 0; } }
    else if (showing === 'photo' && slideT > 8){ slide = (slide + 1) % SLIDES.length; slideT = 0; if (lastScore){ showing = 'score'; drawScreen(lastScore); } else drawSlide(slide); }
  });
  drawScreen(null);
  W.bus.on('live:score', s => { if (s.venue !== 'centrale') return; lastScore = s; if (showing === 'score') drawScreen(s); });

  /* ---------- seggioloni con arbitro sui campi delle partite dal vivo ---------- */
  const chair = (F, y0, halfW) => {
    const f = { f: F };
    box(.9, 2.1, .9, 0x2f4a3a, halfW + 1.5, y0, 0, { ...f, collide: true });
    box(1, .12, 1, 0x1d2430, halfW + 1.5, y0 + 2.1, 0, f);
    const u = makeAvatar({ shirt: 0x0b2a5b, shorts: 0x5b6678, hasCap: false, hair: 0x3a2a1c, hasRacket: false });
    const [x, z] = F.w(halfW + 1.5, 0); u.g.position.set(x, y0 + 2.2, z); u.g.rotation.y = F.rot - Math.PI/2; scene.add(u.g);
    dyn.push(() => pose(u, { state: 'sit', t: W.engine.time }));
  };
  chair(CF, 0, 5.49);
  if (P.pietr) chair(P.pietr.f, -P.pietr.D, 5.49);
  if (S.supertennis) chair(frame(S.supertennis), 0, 5.49);
  if (S.arena) chair(frame(S.arena), groundH(S.arena.x, S.arena.z), 5.49);

  /* ---------- getti della fontana ---------- */
  if (S.fontana){
    const n = 90, pos = new Float32Array(n*3), seeds = [];
    for (let i = 0; i < n; i++) seeds.push({ a: i/n*Math.PI*2, t: Math.random() });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe9f5, size: .22, transparent: true, opacity: .85, depthWrite: false }));
    pts.userData.dynamic = true; pts.frustumCulled = false; scene.add(pts);
    const f = S.fontana;
    dyn.push(dt => {
      const near = Math.hypot(W.player.pos.x - f.x, W.player.pos.z - f.z) < 150; pts.visible = near; if (!near) return;
      for (let i = 0; i < n; i++){
        const s = seeds[i]; s.t = (s.t + dt*.7) % 1;
        const r = 6.2 - s.t*3.6, y = .7 + Math.sin(s.t*Math.PI)*2.2;
        pos[i*3] = f.x + Math.cos(s.a)*r; pos[i*3 + 1] = y; pos[i*3 + 2] = f.z + Math.sin(s.a)*r;
      }
      g.attributes.position.needsUpdate = true;
    });
  }

  /* ---------- gabbiani sopra il Foro ---------- */
  {
    const hub = S.pietrangeli || S.centrale, birds = [];
    const wingGeo = new THREE.BoxGeometry(.9, .04, .22), bodyGeo = new THREE.BoxGeometry(.18, .14, .5), white = mat(0xf4f4f4), grey = mat(0x9aa3ab);
    for (let i = 0; i < 6; i++){
      const g = new THREE.Group(), wl = new THREE.Mesh(wingGeo, grey), wr = new THREE.Mesh(wingGeo, grey);
      wl.position.x = -.5; wr.position.x = .5; g.add(new THREE.Mesh(bodyGeo, white), wl, wr); g.userData.dynamic = true; scene.add(g);
      birds.push({ g, wl, wr, r: 40 + Math.random()*70, h: 28 + Math.random()*18, sp: .1 + Math.random()*.12, a: Math.random()*6, cx: hub.x + (Math.random() - .5)*120, cz: hub.z + (Math.random() - .5)*120 });
    }
    dyn.push(dt => {
      const t = W.engine.time;
      for (const b of birds){
        b.a += dt*b.sp; const x = b.cx + Math.cos(b.a)*b.r, z = b.cz + Math.sin(b.a)*b.r;
        b.g.position.set(x, b.h + Math.sin(t + b.a)*2, z); b.g.rotation.y = -b.a;
        const fl = Math.sin(t*6 + b.r)*.5; b.wl.rotation.z = fl; b.wr.rotation.z = -fl;
      }
    });
  }
  return out;
}
