// Percorso del Foro: itinerario guidato dal Fan Village a tutte le tappe del torneo.
// Parte da solo al primo ingresso (si compare nel Fan Village), si mette in pausa chiudendo il navigatore
// e riprende dal menu «Vai a…». Strada, linea a terra, manovre e arrivo sono del navigatore (systems/nav.js).
import * as THREE from 'three';
import { $, show, esc, frame } from '../core/util.js';
import { colliders, addRect } from '../world/collision.js';
import { canvasPlane, wrap } from '../world/canvas.js';
import { ROUTE, PHOTO_INFO } from '../content/percorso.js';
import { hud } from '../ui/hud.js';

const NAVY = '#0b2a5b', GOLD = '#f3c623', LOGO = 'assets/brand/fitp-logo-2023.png';

export function createRoute(W){
  const scene = W.engine.scene, S = W.layout.sites, { P, CF, DIM, groundH } = W.world, PR = W.progress, st = PR.st;
  const L = DIM.centrale.l/2 + DIM.centrale.tiers*DIM.centrale.step;
  const esterni = W.pois.POIS.find(p => p.id === 'esterni');

  /* ---------- dove si arriva, tappa per tappa ---------- */
  const where = {
    village: () => W.village && { x: W.village.anchors.plaza[0], z: W.village.anchors.plaza[1], r: 12 },
    fontana: () => S.fontana && { x: S.fontana.x, z: S.fontana.z, r: 16 },
    viale: () => S.viale && { x: S.viale.x, z: S.viale.z, r: 18 },
    obelisco: () => S.obelisco && { x: S.obelisco.x, z: S.obelisco.z, r: 14 },
    marmi: () => P.marmi && (([x, z]) => ({ x, z, r: 14 }))(P.marmi.f.w(0, P.marmi.b + 3)),
    padel: () => W.venues.padel && (([x, z]) => ({ x, z, r: 12 }))(W.venues.padel.exit()),
    pietr: () => P.pietr && (([x, z]) => ({ x, z, r: 14 }))(P.pietr.f.w(0, P.pietr.hl + 3)),
    esterni: () => esterni && { x: esterni.x, z: esterni.z, r: 26 },
    centrale: () => (([x, z]) => ({ x, z, r: 14 }))(CF.w(0, L + 3)),
    st: () => S.supertennis && { x: S.supertennis.x, z: S.supertennis.z, r: 30 },
    tour: () => W.tour && { ...W.tour.entrance, r: 12 },
  };
  const stops = ROUTE.filter(s => where[s.id] && where[s.id]());
  const at = i => where[stops[i].id]();
  const credit = s => s.photo ? PHOTO_INFO[s.photo] : null;
  const photoUrl = s => s.photo && PHOTO_INFO[s.photo] ? 'assets/photos/' + s.photo : null;

  const grid = () => W.nav.grid();

  /* ---------- totem di tappa con la foto reale ---------- */
  const imgs = new Map();
  const img = url => { if (!imgs.has(url)) imgs.set(url, new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; })); return imgs.get(url); };
  const cover = (x, im, dx, dy, dw, dh) => { const r = Math.max(dw/im.width, dh/im.height), sw = dw/r, sh = dh/r; x.drawImage(im, (im.width - sw)/2, (im.height - sh)/2, sw, sh, dx, dy, dw, dh); };
  const contain = (x, im, dx, dy, dw, dh) => { const r = Math.min(dw/im.width, dh/im.height), w = im.width*r, h = im.height*r; x.drawImage(im, dx + (dw - w)/2, dy + (dh - h)/2, w, h); };
  const tric = (x, X, Y, w, h) => { x.fillStyle = '#2f8f57'; x.fillRect(X, Y, w/3, h); x.fillStyle = '#fff'; x.fillRect(X + w/3, Y, w/3, h); x.fillStyle = '#d8342c'; x.fillRect(X + 2*w/3, Y, w/3, h); };
  function totem(s, i){
    if (s.id === 'village' || s.id === 'tour') return;
    const t = at(i), prev = i ? at(i - 1) : t, G_ = grid();
    // accanto alla meta, sul lato da cui si arriva, in un punto libero
    const dx = prev.x - t.x, dz = prev.z - t.z, d = Math.hypot(dx, dz) || 1, ux = dx/d, uz = dz/d;
    let spot = null;
    // punti da lasciare liberi: dove compare la golf car noleggiata e l'ingresso del village
    const A = W.village && W.village.anchors, avoid = A ? [A.carSpawn.pos, A.entrance] : [];
    const clear = (x, z) => avoid.every(([ax, az]) => Math.hypot(x - ax, z - az) > 9) &&
      [0, 1, 2, 3, 4, 5, 6, 7].every(k => G_.free(x + Math.cos(k*Math.PI/4)*2.2, z + Math.sin(k*Math.PI/4)*2.2)) && G_.free(x, z);
    for (const [a, b] of [[t.r*.55, 4.5], [t.r*.55, -4.5], [t.r*.8, 5], [t.r*.8, -5], [t.r*.35, 4], [t.r, 6], [t.r, -6], [t.r*.55, 8], [t.r*.55, -8], [6, 0]]){
      const x = t.x + ux*a - uz*b, z = t.z + uz*a + ux*b;
      if (clear(x, z)){ spot = [x, z]; break; }
    }
    if (!spot) return;
    const rot = Math.atan2(ux, uz), F = frame({ x: spot[0], z: spot[1], rot }), y = groundH(spot[0], spot[1]);
    const g = new THREE.Group(); g.position.set(spot[0], y, spot[1]); g.rotation.y = rot; g.userData.dynamic = true; scene.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, .3, .5), new THREE.MeshLambertMaterial({ color: 0x0b2a5b })); base.position.y = .15; g.add(base);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.04, 3, .12), new THREE.MeshLambertMaterial({ color: 0x0b2a5b })); back.position.y = 1.8; g.add(back);
    const url = photoUrl(s);
    const face = canvasPlane(640, 940, 1.96, 2.88, () => {});
    const draw = (ph, logo) => face.redraw((x, w, h) => {
      x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
      x.fillStyle = NAVY; x.fillRect(0, 0, w, 150); tric(x, 0, 150, w, 10);
      x.fillStyle = GOLD; x.font = 'bold 34px Barlow, Arial, sans-serif'; x.fillText(`PERCORSO DEL FORO · TAPPA ${i + 1} DI ${stops.length}`, 26, 52);
      x.fillStyle = '#fff'; x.font = 'bold 52px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText(s.name, 26, 118);
      if (ph && s.tall){ x.fillStyle = '#e9eef5'; x.fillRect(0, 160, w, 380); contain(x, ph, 0, 164, w, 372); }
      else if (ph) cover(x, ph, 0, 160, w, 380); else if (logo) contain(x, logo, 80, 190, w - 160, 320);
      let yy = 574;
      if (ph && credit(s)){ x.fillStyle = '#5b6678'; x.font = 'italic 19px Barlow, Arial, sans-serif'; x.fillText(credit(s), 22, yy); yy += 40; } else yy += 10;
      x.fillStyle = '#1d2430'; x.font = '27px Barlow, Arial, sans-serif';
      for (const ln of wrap(x, s.text, w - 48).slice(0, 10)){ x.fillText(ln, 24, yy); yy += 35; }
    });
    Promise.all([url ? img(url) : null, img(LOGO)]).then(([ph, logo]) => draw(ph, logo));
    face.position.set(0, 1.8, .07); g.add(face);
    addRect(colliders, spot[0], spot[1], 1.05, .3, rot);
    { const [ci, cj] = G_.cellOf(spot[0], spot[1]); G_.grid[cj*G_.nx + ci] = 1; }
  }

  /* ---------- scheda della tappa (non blocca il gioco) ---------- */
  const card = $('#rcard');
  let cardT = 0;
  function showCard(i){
    const s = stops[i], url = photoUrl(s), next = stops[i + 1];
    card.innerHTML = `
      <div class="rtag">Percorso del Foro · tappa ${i + 1} di ${stops.length}</div>
      <h3>${esc(s.name)}</h3>
      ${url ? `<img src="${url}" alt="${esc(s.name)}"${s.tall ? ' class="tall"' : ''}><small class="credit">${esc(credit(s))} · Wikimedia Commons</small>` : ''}
      <p>${esc(s.text)}</p>
      <div class="rbtn">${s.play ? `<button class="primary" data-play="${s.play}">${esc(s.playLabel)}</button>` : ''}
        <button data-close="1">${i === 0 ? 'Inizia il percorso' : 'Chiudi'}</button></div>`;
    show(card, true); cardT = 0;                           // resta finché non si chiude: si apre solo su richiesta
    card.querySelector('[data-close]').addEventListener('click', () => { show(card, false); });
    const pb = card.querySelector('[data-play]');
    if (pb) pb.addEventListener('click', () => { show(card, false); pause(true); W.activities.go(s.play); });
  }

  /* ---------- stato: tappa corrente, pausa, strada ---------- */
  st.route = st.route || { i: 0, done: {}, on: false };
  const R = st.route;
  const mine = () => W.nav.target && W.nav.target.route;
  function goTo(i){
    R.i = i; PR.save();
    if (i >= stops.length){ finish(); return; }
    const t = at(i);
    W.nav.set({ x: t.x, z: t.z, r: t.r, name: stops[i].name, sub: `Tappa ${i + 1}/${stops.length}`, route: true,
      at: stops[i].id === 'tour' ? () => at(i) : null,        // il Trophy Tour si sposta: il navigatore lo insegue
      onArrive: () => arrive(i), onCancel: () => pause() });
  }
  function arrive(i){
    const s = stops[i];
    const first = !R.done[s.id];
    if (first){ R.done[s.id] = 1; PR.save(); W.economy.earn(5, 'tappa del percorso'); }
    // solo una nota breve: la scheda con foto e testo si apre con «Leggi»
    hud.note({ title: '✓ ' + s.name, sub: `Tappa ${i + 1} di ${stops.length}${first ? ' · +5 gettoni' : ''}${stops[i + 1] ? ' · poi ' + stops[i + 1].name : ''}`,
      action: { label: 'Leggi', fn: () => showCard(i) }, ms: 5500 });
    goTo(i + 1);
  }
  function finish(){
    if (mine()) W.nav.clear(true);
    R.on = false; R.finished = 1; PR.save();
    if (PR.badge('guida')) W.economy.earn(40, 'Percorso del Foro completato');
    hud.note({ title: 'Percorso del Foro completato', sub: 'Hai visto tutto il torneo', kind: 'gold', ms: 4000 });
  }
  function pause(quiet){
    if (!R.on) return;
    R.on = false; PR.save();
    if (mine()) W.nav.clear(true);
    if (!quiet) hud.toast('Percorso in pausa: lo riprendi da «Vai a…», Percorso del Foro');
  }
  const api = {
    stops, get index(){ return R.i; }, get on(){ return R.on; },
    at, where,
    start(from = 0){
      R.on = true; if (R.finished && from === 0) R.done = {};
      show('#rcard', false);
      if (from === 0){ showCard(0); goTo(stops.length > 1 ? 1 : 0); R.done[stops[0].id] = 1; }
      else goTo(from);
    },
    resume(){ if (R.i >= stops.length || R.finished && R.i >= stops.length) api.start(0); else { R.on = true; goTo(Math.max(1, R.i)); } },
    pause,
    arrive: () => arrive(R.i),
    plan: () => W.nav.plan(),
    get path(){ return W.nav.path; },
    get grid(){ return grid(); },
    build(){ stops.forEach((s, i) => totem(s, i)); },
    update(dt){
      if (cardT > 0 && (cardT -= dt) <= 0) show(card, false);
    },
  };
  return api;
}
