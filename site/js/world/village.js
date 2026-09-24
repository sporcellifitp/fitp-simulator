// Fan Village: tutti i giochi in un posto solo, vicino all'ingresso. Non esiste nella realtà: è un allestimento del gioco.
// Coordinate locali del village: x lungo il lato largo (90 m), z lungo il lato corto (64 m), ingresso sul lato +z.
//   sinistra: campo da tennis del village e Negozio del giocatore
//   centro:   postazioni di gioco, maxischermo, piazza con bacheca e tavolini, Store del torneo, Punto ristoro, Info point
//   destra:   campo da padel del village, prima tappa del FITP Trophy Tour (world/tour.js), noleggio golf car
import * as THREE from 'three';
import { frame } from '../core/util.js';
import { addRect, colliders, occupied } from './collision.js';
import { box, flat, mat } from './geom.js';
import { signPlane, canvasPlane, imagePlane } from './canvas.js';

export const BOOTHS = [
  { game: 'serve', title: 'Sfida al servizio', venue: 'village-tennis', color: 0x1f4fa3 },
  { game: 'tennis', title: 'Partita di tennis', venue: 'village-tennis', color: 0xc8643b },
  { game: 'raccattapalle', title: 'Raccattapalle', venue: 'village-tennis', color: 0x5b2a86 },
  { game: 'padel', title: 'Partita di padel', venue: 'village-padel', color: 0x2b7bd6 },
  { game: 'vetro', title: 'Il vetro', venue: 'village-padel', color: 0x2f8f57 },
];

export function buildVillage(W){
  const v = W.layout.village; if (!v) return null;
  const scene = W.engine.scene, F = frame(v), f = { f: F }, w2 = v.w/2, l2 = v.l/2;
  const put = (m, lx, y, lz, ry = 0) => { const [x, z] = F.w(lx, lz); m.position.set(x, y, z); m.rotation.y = F.rot + ry; scene.add(m); return m; };
  const world = (lx, lz) => F.w(lx, lz);

  /* ---------- pavimento e recinto ---------- */
  flat(v.w, v.l, v.x, .06, v.z, new THREE.MeshLambertMaterial({ color: 0xe9dfca }), F.rot);
  flat(v.w - 4, v.l - 4, v.x, .065, v.z, new THREE.MeshLambertMaterial({ color: 0xefe7d6 }), F.rot);
  const hedge = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0); box(Math.abs(x1 - x0) || 1, 1, Math.abs(z1 - z0) || 1, 0x3f6b34, (x0 + x1)/2, 0, (z0 + z1)/2, { ...f, collide: true }); return len; };
  hedge(-w2, -l2, w2, -l2);                          // fondo
  hedge(-w2, l2, -8, l2); hedge(8, l2, w2, l2);       // fronte con l'ingresso
  hedge(-w2, -l2, -w2, 12); hedge(-w2, 22, -w2, l2);  // lato sinistro con un varco
  hedge(w2, -l2, w2, 22); hedge(w2, 31, w2, l2);      // lato destro con il varco della golf car
  addRect(occupied, v.x, v.z, w2 + 2, l2 + 2, F.rot);

  /* ---------- arco d'ingresso ---------- */
  for (const sx of [-6.5, 6.5]) box(1.1, 6.2, 1.1, 0x0b2a5b, sx, 0, l2, { ...f, collide: true });
  box(14.2, 1.6, 1.1, 0x0b2a5b, 0, 5.2, l2, f);
  put(signPlane('FAN VILLAGE', { bg: '#0b2a5b', pw: 12.4, ph: 1.4 }), 0, 6, l2 + .57);
  put(signPlane('FAN VILLAGE', { bg: '#0b2a5b', pw: 12.4, ph: 1.4 }), 0, 6, l2 - .57, Math.PI);
  for (const [sx, c] of [[-3, 0x2f8f57], [0, 0xffffff], [3, 0xd8342c]]) box(3, .35, 1.15, c, sx, 6.8, l2, f);
  // loghi: sempre in negativo su blu FITP (mai il logo a colori su fondi scuri o grigi)
  box(3.3, 1.9, .2, 0x0b2a5b, 0, 7.15, l2, f);
  for (const [side, ry] of [[1, 0], [-1, Math.PI]]){
    put(imagePlane('assets/brand/fitp-logo-2023-negativo.png', 2.9, 1.65), 0, 8.1, l2 + side*.11, ry);
  }

  /* ---------- campi del village ---------- */
  const [tx, tz] = world(-31, -8), [px, pz] = world(31, -16);
  const tennisF = frame({ x: tx, z: tz, rot: F.rot }), padelF = frame({ x: px, z: pz, rot: F.rot });
  W.world.court(tennisF, 18.3, 36.6, 0);
  {
    const ff = { f: tennisF }, h = 2.2, t = .15, seg = (18.3 - 3)/2;
    box(18.3, h, t, 0x2f4a3a, 0, 0, -18.3, { ...ff, collide: true });
    box(seg, h, t, 0x2f4a3a, -9.15 + seg/2, 0, 18.3, { ...ff, collide: true });
    box(seg, h, t, 0x2f4a3a, 9.15 - seg/2, 0, 18.3, { ...ff, collide: true });
    box(t, h, 36.6, 0x2f4a3a, -9.15, 0, 0, { ...ff, collide: true });
    box(t, h, 36.6, 0x2f4a3a, 9.15, 0, 0, { ...ff, collide: true });
  }
  W.world.padelCourt({ x: padelF.x, z: padelF.z, rot: padelF.rot });
  W.venues['village-tennis'] = { F: tennisF, sport: 'tennis', y0: 0, exit: () => tennisF.w(12, 0), label: 'Campo del Fan Village' };
  W.venues['village-padel'] = { F: padelF, sport: 'padel', y0: 0, exit: () => padelF.w(-7.5, 0), label: 'Padel del Fan Village' };

  /* ---------- negozi e chioschi (aperti verso +z) ---------- */
  const shop = (lx, lz, w, d, body, awning, title) => {
    box(w, 3.2, d, body, lx, 0, lz, { ...f, collide: true });
    box(w + .6, .25, 1.8, awning, lx, 3.1, lz + d/2 + .7, f);
    box(w - .8, 1.05, .6, 0xd3c5a8, lx, 0, lz + d/2 + .25, f);
    for (const sx of [-w/2 - .1, w/2 + .1]) box(.12, 3.1, .12, 0xdfe3e6, lx + sx, 0, lz + d/2 + 1.5, f);
    const bg = awning === 0xffffff ? '#0b2a5b' : '#' + awning.toString(16).padStart(6, '0');
    put(signPlane(title, { bg, pw: Math.min(w, 7), ph: .9 }), lx, 3.9, lz + d/2 + .02);
    box(Math.min(w, 7) + .2, 1.05, .12, 0x1d2430, lx, 3.35, lz + d/2 - .05, f);
    return world(lx, lz + d/2 + 2.6);                    // davanti al bancone
  };
  const anchors = {};
  anchors.marta = shop(-31, 22, 14, 7, 0xf6f1e7, 0xc8643b, 'NEGOZIO DEL GIOCATORE');
  anchors.nico = shop(-12, 22, 8, 5, 0xf6f1e7, 0x0b2a5b, 'STORE DEL TORNEO');
  anchors.sara = shop(12, 22, 8, 5, 0xffffff, 0xd8342c, 'PUNTO RISTORO');
  anchors.franco = shop(38, 27.5, 6, 3, 0xf6f1e7, 0x2f8f57, 'GOLF CAR');
  // info point al centro, davanti all'ingresso
  box(3.2, 1.1, 1.2, 0x2f8f57, 0, 0, 15, { ...f, collide: true });
  box(.12, 3.2, .12, 0xdfe3e6, 0, 0, 14.3, f);
  put(signPlane('INFO', { bg: '#2f8f57', pw: 1.2, ph: .45, double: true }), 0, 3.4, 14.3);
  anchors.dario = world(0, 17.6);

  /* ---------- postazioni di gioco ---------- */
  anchors.booths = [];
  BOOTHS.forEach((b, i) => {
    const lx = -12 + i*6, lz = -21;
    box(4.4, 2.4, 2.2, 0xf6f1e7, lx, 0, lz, { ...f, collide: true });
    box(4.8, .3, 2.8, b.color, lx, 2.4, lz + .2, f);
    const hex = '#' + b.color.toString(16).padStart(6, '0');
    put(signPlane(b.title.toUpperCase(), { bg: hex, pw: 4.4, ph: .8 }), lx, 3.1, lz + 1.12);
    box(4.4, .9, .12, 0x1d2430, lx, 2.65, lz + 1.05, f);
    // una palla gigante sul tetto: tennis gialla, padel azzurra
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.55, 16, 10), mat(b.venue === 'village-padel' ? 0x7fc3ff : 0xd9f24a));
    ball.castShadow = true; ball.userData.dynamic = true; put(ball, lx, 3.3, lz);
    const [x, z] = world(lx, lz + 2.6);
    const [bx, bz] = world(lx, lz);
    anchors.booths.push({ ...b, x, z, bx, bz, ball });
    W.interact.add({ id: 'booth:' + b.game, x, z, r: 2.6, label: `Gioca: ${b.title}`, short: 'Gioca', map: '#c8643b',
      act: () => W.games.openHowto(b.game, { venue: b.venue }) });
  });

  /* ---------- maxischermo sul fondo ---------- */
  for (const sx of [-4.6, 4.6]) box(.35, 8.2, .35, 0x3a3f47, sx, 0, -l2 + 2, { ...f, collide: true });
  box(9.6, 5.6, .5, 0x1d2430, 0, 3, -l2 + 2, f);
  const screen = canvasPlane(1024, 576, 8.8, 4.95, () => {});
  put(screen, 0, 5.8, -l2 + 2.27);

  /* ---------- piazza: bacheca, tavolini, bandiere ---------- */
  const [bx, bz] = world(-9, 3);
  const boardSpot = { x: bx, z: bz, rot: F.rot };
  for (const [lx, lz] of [[6, 0], [12, 3], [7, 8], [13, 10]]){
    box(.08, 2.6, .08, 0xdfe3e6, lx, 0, lz, f); box(1.2, .06, 1.2, 0xffffff, lx, .78, lz, f);
    const u = new THREE.Mesh(new THREE.ConeGeometry(1.7, .7, 8), mat(0xc8643b)); u.castShadow = true; put(u, lx, 2.8, lz);
    addRect(colliders, ...world(lx, lz), .5, .5, F.rot);
  }
  const flags = [];
  const flagGeo = new THREE.PlaneGeometry(1.6, 1, 8, 1);
  for (const [lx, lz, c] of [[-15, 29, 0x1f4fa3], [15, 29, 0xd8342c], [-15, -12, 0x2f8f57], [15, -12, 0xf3c623]]){
    box(.12, 6, .12, 0xdfe3e6, lx, 0, lz, f);
    const g = flagGeo.clone(), fl = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
    fl.userData.dynamic = true; put(fl, lx, 5.3, lz);
    flags.push({ g, base: g.attributes.position.array.slice(), ph: Math.random()*6 });
  }

  /* ---------- golf car parcheggiate e punto di partenza del noleggio ---------- */
  anchors.carPark = [world(30, 28.5), world(26, 28.5)];
  anchors.carSpawn = { pos: world(0, l2 + 7), rot: F.rot };
  anchors.entrance = world(0, l2 + 3);
  anchors.plaza = world(0, 6);
  anchors.spawn = world(0, 24);                                        // si compare qui: davanti all'arco, l'info point alle spalle

  const village = {
    F, v, anchors, screen, boardSpot, tennisF, padelF,
    inside(x, z, m = 0){ const [lx, lz] = F.l(x, z); return Math.abs(lx) < w2 + m && Math.abs(lz) < l2 + m; },
    update(dt){
      const t = W.engine.time;
      for (const fl of flags){ const a = fl.g.attributes.position.array, tt = t*4 + fl.ph; for (let i = 0; i < a.length; i += 3){ const u = (fl.base[i] + .8)/1.6; a[i + 2] = Math.sin(tt + u*4)*.18*u; a[i] = fl.base[i] + .8; } fl.g.attributes.position.needsUpdate = true; }
      for (const b of anchors.booths){ b.ball.rotation.y = t*1.5; b.ball.position.y = 3.3 + Math.abs(Math.sin(t*2.2 + b.x))*.35; }
    },
  };
  return village;
}
