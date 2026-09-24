// FITP Trophy Tour: il museo itinerante della Federazione. Un camion-vetrina che si apre in uno spazio espositivo
// (tettoia, pedana, tappeto rosso, vetrine, totem con foto reali, set per la foto ricordo) e ogni TOUR_STAY minuti
// richiude tutto e si sposta alla tappa successiva. L'orario dipende dall'ora esatta: è lo stesso per tutti i giocatori.
//
// Sistema locale (come gli stadi): il camion corre lungo x con la motrice verso +x, i visitatori arrivano da +z.
// Tutto sta in un gruppo che si sposta insieme: niente fusione statica, collisioni aggiunte e tolte a ogni tappa.
// Regola sui loghi: sempre su fondo bianco (logo originale) o su blu FITP (logo in negativo), mai su grigio.
import * as THREE from 'three';
import { frame, esc, clamp } from '../core/util.js';
import { box, mat } from './geom.js';
import { canvasPlane, wrap, fontsReady } from './canvas.js';
import { colliders, occupied } from './collision.js';
import { rasterize } from './grid.js';
import { EXHIBITS, TROPHIES, TOUR_STOPS, TOUR_STAY, PHOTO_CREDITS } from '../content/museum.js';
import { hud } from '../ui/hud.js';
import { pose } from '../entities/avatar.js';

const NAVY = '#0b2a5b', GOLD = '#f3c623', RED = '#d8342c', GREEN = '#2f8f57';
const LOGO = 'assets/brand/fitp-logo-2023.png', LOGO_NEG = 'assets/brand/fitp-logo-2023-negativo.png';
const BOX_X = [-9.8, 8.8], BOX_Z = [-6.4, 16.5];        // ingombro della tappa (con il viale d'ingresso)

/* ---------- immagini caricate una volta sola ---------- */
const imgs = new Map();
function img(url){
  if (!imgs.has(url)){
    const im = new Image(); const p = new Promise(res => { im.onload = () => res(im); im.onerror = () => res(null); }); im.src = url;
    imgs.set(url, p);
  }
  return imgs.get(url);
}
// disegna un'immagine che riempie il riquadro (ritaglio al centro)
function cover(x, im, dx, dy, dw, dh){
  const r = Math.max(dw/im.width, dh/im.height), sw = dw/r, sh = dh/r;
  x.drawImage(im, (im.width - sw)/2, (im.height - sh)/2, sw, sh, dx, dy, dw, dh);
}
function contain(x, im, dx, dy, dw, dh){
  const r = Math.min(dw/im.width, dh/im.height), w = im.width*r, h = im.height*r;
  x.drawImage(im, dx + (dw - w)/2, dy + (dh - h)/2, w, h);
}
// piano da canvas che si ridisegna quando le immagini sono pronte
function drawnPlane(w, h, pw, ph, urls, draw, opts){
  const m = canvasPlane(w, h, pw, ph, (x, W_, H_) => draw(x, W_, H_, {}), opts);
  Promise.all([...urls.map(img), fontsReady]).then(list => { const o = {}; urls.forEach((u, i) => { o[u] = list[i]; }); m.redraw((x, W_, H_) => draw(x, W_, H_, o)); });
  return m;
}
const tricolore = (x, X, Y, w, h) => { x.fillStyle = GREEN; x.fillRect(X, Y, w/3, h); x.fillStyle = '#fff'; x.fillRect(X + w/3, Y, w/3, h); x.fillStyle = RED; x.fillRect(X + 2*w/3, Y, w/3, h); };

/* ---------- riflessi per l'argento: una stanza luminosa disegnata su canvas ---------- */
function envMap(){
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#fdfdfd'); g.addColorStop(.45, '#9aa6b8'); g.addColorStop(.55, '#39455a'); g.addColorStop(1, '#1b2230');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  x.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) x.fillRect(20 + i*85, 40, 40, 70);          // luci da studio
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- trofei (forme dal vero, su foto di Wikimedia Commons) ---------- */
function lathe(pts, m, seg = 40){ const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); const o = new THREE.Mesh(g, m); o.castShadow = true; return o; }
function davisCup(silver, wood){
  // la «insalatiera»: vaso largo e basso su un piede corto, sopra una base di legno a piani con le targhe d'argento
  const g = new THREE.Group();
  const tiers = [[1.3, .26], [1.12, .26], [.94, .26]];
  let y = 0;
  for (const [w, h] of tiers){
    const t = new THREE.Mesh(new THREE.CylinderGeometry(w/2, w/2 + .03, h, 8), wood); t.position.y = y + h/2; t.rotation.y = Math.PI/8; t.castShadow = true; g.add(t);
    for (let i = 0; i < 8; i++){                      // targhe dei vincitori
      const a = i/8*Math.PI*2, r = w/2*Math.cos(Math.PI/8) + .012;
      const p = new THREE.Mesh(new THREE.BoxGeometry(w*.3, h*.55, .02), silver); p.position.set(Math.sin(a)*r, y + h/2, Math.cos(a)*r); p.rotation.y = a; g.add(p);
    }
    y += h;
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.47, .025, 8, 40), silver); rim.rotation.x = Math.PI/2; rim.position.y = y; g.add(rim);
  const bowl = new THREE.Group(); bowl.position.y = y; bowl.scale.setScalar(1.3); g.add(bowl); y = 0;
  const cup = lathe([[0, 0], [.2, 0], [.22, .03], [.13, .08], [.1, .2], [.16, .25], [.3, .3], [.46, .38], [.56, .5], [.6, .62], [.62, .7], [.58, .7], [.54, .6], [.44, .44], [.2, .34], [0, .33]], silver);
  cup.position.y = y; bowl.add(cup);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.61, .035, 8, 48), silver); lip.rotation.x = Math.PI/2; lip.position.y = y + .7; bowl.add(lip);
  for (let i = 0; i < 14; i++){                        // decori a rilievo sul bordo
    const a = i/14*Math.PI*2, b = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), silver);
    b.position.set(Math.sin(a)*.61, y + .72 + (i % 2)*.03, Math.cos(a)*.61); bowl.add(b);
  }
  for (let i = 0; i < 10; i++){                        // fiori sbalzati sul corpo
    const a = i/10*Math.PI*2, b = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), silver);
    b.scale.set(1, .6, .5); b.position.set(Math.sin(a)*.49, y + .42, Math.cos(a)*.49); b.rotation.y = a; bowl.add(b);
  }
  return g;
}
function bjkCup(silver, wood){
  // la coppa della Fed Cup / Billie Jean King Cup: coppa larga con due manici a voluta, piede traforato,
  // due basi cilindriche d'argento e uno zoccolo nero (dalla foto di P. Menzel, CC BY-SA 2.0)
  const g = new THREE.Group(), black = mat(0x111318);
  const cyl = (r0, r1, h, y, m) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 40), m); o.position.y = y + h/2; o.castShadow = true; g.add(o); };
  cyl(.52, .55, .12, 0, black);
  cyl(.47, .47, .3, .12, silver);
  cyl(.4, .4, .26, .42, silver);
  cyl(.4, .41, .04, .68, black);
  const cup = lathe([[0, 0], [.32, 0], [.33, .03], [.24, .08], [.2, .12], [.2, .26], [.24, .3], [.3, .34], [.46, .44], [.56, .58], [.6, .7], [.62, .74], [.58, .74], [.55, .66], [.44, .48], [.26, .38], [0, .36]], silver);
  cup.position.y = .72; g.add(cup);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.205, .205, .12, 24), mat(0xb8bec8)); band.position.y = .72 + .19; g.add(band);
  for (const s of [-1, 1]){                            // manici a voluta sopra il bordo
    const h = new THREE.Mesh(new THREE.TorusGeometry(.13, .022, 8, 20, Math.PI*1.4), silver);
    h.position.set(s*.66, .72 + .78, 0); h.rotation.z = s > 0 ? -.5 : Math.PI + .5 - Math.PI*.4; g.add(h);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .22, 8), silver); stem.position.set(s*.6, .72 + .64, 0); stem.rotation.z = -s*.5; g.add(stem);
  }
  return g;
}

/* ---------- ricerca delle tappe: uno spazio libero e piano vicino a ogni punto di riferimento ---------- */
function findSpot(W, ax, az, prefer){
  // griglia di occupazione a maglie di 1 m attorno al punto di riferimento (world/grid.js), calcolata una volta:
  // le prove di posizionamento (decine di migliaia) diventano semplici letture
  const R = 90 + 26, B = W.layout.bounds;
  const G = rasterize([...colliders, ...occupied], { x0: ax - R, z0: az - R, nx: 2*R, nz: 2*R, cell: 1, margin: .6, bounds: B });
  const free = G.free;
  const rots = prefer != null ? [prefer, prefer + Math.PI/2, prefer - Math.PI/2, prefer + Math.PI] : [0, 1, 2, 3, 4, 5, 6, 7].map(k => k*Math.PI/4);
  for (let r = 0; r <= 90; r += 4){
    const n = r ? Math.max(8, Math.round(r*Math.PI*2/8)) : 1;
    for (let i = 0; i < n; i++){
      const a = i/n*Math.PI*2, x = ax + Math.cos(a)*r, z = az + Math.sin(a)*r;
      if (!free(x, z)) continue;
      for (const rot of rots){
        const F = frame({ x, z, rot }); let ok = true;
        for (let lx = BOX_X[0]; lx <= BOX_X[1] && ok; lx += 1){
          for (let lz = BOX_Z[0]; lz <= BOX_Z[1]; lz += 1){ const [wx, wz] = F.w(lx, lz); if (!free(wx, wz)){ ok = false; break; } }
        }
        if (!ok) continue;
        const h0 = W.world.groundH(x, z);                   // terreno in piano (niente gradoni o scarpate)
        for (let lx = BOX_X[0]; lx <= BOX_X[1] && ok; lx += 3) for (let lz = BOX_Z[0]; lz <= BOX_Z[1]; lz += 3){ const [wx, wz] = F.w(lx, lz); if (Math.abs(W.world.groundH(wx, wz) - h0) > .35){ ok = false; break; } }
        if (ok) return { x, z, rot };
      }
    }
  }
  return null;
}

export function buildTour(W){
  const scene = W.engine.scene, S = W.layout.sites, { P, CF, DIM } = W.world;
  const env = envMap();
  const silver = new THREE.MeshStandardMaterial({ color: 0xe6e9ee, metalness: 1, roughness: .16, envMap: env, envMapIntensity: 1.25 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2214, metalness: .1, roughness: .45, envMap: env, envMapIntensity: .4 });
  const glassMat = new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: .1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xeaf4ff });

  /* ---------- tappe ---------- */
  const stops = [];
  for (const s of TOUR_STOPS){
    let spot = null;
    if (s.id === 'village' && W.village){
      const [x, z] = W.village.F.w(37.2, 9.5); spot = { x, z, rot: W.village.F.rot - Math.PI/2 };   // accanto al padel, ingresso verso la piazza
    } else {
      const L = DIM.centrale.l/2 + DIM.centrale.tiers*DIM.centrale.step;
      const at = s.id === 'obelisco' ? (S.obelisco && [S.obelisco.x, S.obelisco.z])
        : s.id === 'marmi' ? (P.marmi && P.marmi.f.w(0, P.marmi.b + 16))
        : s.id === 'centrale' ? (P.pietr ? [(P.pietr.f.x + CF.x)/2, (P.pietr.f.z + CF.z)/2] : CF.w(0, L + 14)) : null;
      if (at) spot = findSpot(W, at[0], at[1], null);
    }
    if (spot) stops.push({ ...s, ...spot, F: frame(spot), y: W.world.groundH(spot.x, spot.z) });
  }
  if (!stops.length) return null;

  /* ---------- il gruppo che viaggia ---------- */
  const root = new THREE.Group(); root.userData.dynamic = true; scene.add(root);
  const add = (o, x, y, z, ry = 0, parent = root) => { o.position.set(x, y, z); o.rotation.y = ry; parent.add(o); return o; };

  // --- camion: rimorchio + motrice (si muove da solo quando arriva e riparte)
  const truck = new THREE.Group(); root.add(truck);
  const T = { parent: truck };
  // rimorchio cavo: pavimento, tetto, parete di fondo e testate (il lato +z è la parete che si apre)
  box(14, .12, 2.6, 0x0b2a5b, -1.5, 1.0, -4.7, T);
  box(14, .12, 2.6, 0x0b2a5b, -1.5, 3.88, -4.7, T);
  box(14, 2.9, .1, 0x0b2a5b, -1.5, 1.1, -5.95, T);
  for (const ex of [-8.45, 5.45]) box(.1, 2.9, 2.6, 0x0b2a5b, ex, 1.1, -4.7, T);
  box(14.1, .12, 2.7, 0xdfe3e6, -1.5, 4.0, -4.7, T);                 // profilo del tetto
  box(13.6, .5, 2.2, 0x1d2430, -1.5, .6, -4.7, T);                    // telaio
  box(2.7, 2.6, 2.6, 0xf4f4f4, 7.2, .7, -4.7, T);                     // motrice
  box(2.75, .5, 2.65, 0x0b2a5b, 7.2, .7, -4.7, T);
  box(.08, 1.1, 2.2, 0x22364f, 8.56, 2.0, -4.7, T);                   // parabrezza
  box(1.2, 1.3, .05, 0x22364f, 7.6, 2.0, -3.38, T); box(1.2, 1.3, .05, 0x22364f, 7.6, 2.0, -6.02, T);
  for (const [sx, c] of [[6.35, 0x2f8f57], [7.2, 0xffffff], [8.05, 0xd8342c]]) box(.85, .18, 2.66, c, sx, 3.12, -4.7, T);
  const wheelGeo = new THREE.CylinderGeometry(.5, .5, .4, 16); wheelGeo.rotateX(Math.PI/2);
  for (const wx of [-6.8, -5.6, 3.6, 6.3, 7.9]) for (const wz of [-3.55, -5.85]){ const wh = new THREE.Mesh(wheelGeo, mat(0x15181d)); wh.position.set(wx, .5, wz); wh.castShadow = true; truck.add(wh); }
  // grafica sul lato posteriore (verso -z) e sul muso
  const sideArt = (flip) => drawnPlane(2048, 424, 14, 2.9, [LOGO_NEG], (x, w, h, im) => {
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#0b2a5b'); g.addColorStop(1, '#123a7a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    if (im[LOGO_NEG]) contain(x, im[LOGO_NEG], 40, 40, 560, 320);
    x.fillStyle = '#fff'; x.font = 'italic bold 180px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText('TROPHY TOUR', 650, 245);
    x.fillStyle = GOLD; x.font = 'bold 54px Barlow, Arial, sans-serif'; x.fillText('LA STORIA AZZURRA IN VIAGGIO', 668, 340);
    x.save(); x.translate(w - 250, 0); x.transform(1, 0, -.35, 1, 0, 0); tricolore(x, 0, 0, 240, h); x.restore();
  });
  add(sideArt(), -1.5, 2.55, -6.02, Math.PI, truck);

  // --- parete laterale che si alza e diventa tettoia (cerniera sul bordo alto, lato +z)
  const hinge = add(new THREE.Group(), -1.5, 4.0, -3.4, 0, truck);
  const flap = new THREE.Group(); hinge.add(flap);
  box(14, 2.9, .1, 0x0b2a5b, 0, -2.9, 0, { parent: flap });
  const out = sideArt(); out.position.set(0, -1.45, .06); flap.add(out);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 2.8), new THREE.MeshBasicMaterial({ color: 0xf6f7fa })); inner.position.set(0, -1.45, -.06); inner.rotation.y = Math.PI; flap.add(inner);
  const spots = [];
  for (const sx of [-5.5, 0, 5.5]){                                    // fari sotto la tettoia
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.14, .2, .3, 10), mat(0x1d2430)); lamp.position.set(sx, -2.75, -.25); lamp.rotation.x = Math.PI/2; flap.add(lamp);
    const led = new THREE.Mesh(new THREE.CircleGeometry(.13, 12), ledMat); led.position.set(sx, -2.75, -.41); led.rotation.y = Math.PI; flap.add(led);
  }
  const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(13.6, .06, .06), ledMat); ledStrip.position.set(0, -2.86, -.08); flap.add(ledStrip);

  // --- interno del rimorchio (visibile ad aperto): parete di fondo bianca con il logo, luci, vetrina con la Coppa Davis
  const back = drawnPlane(2048, 420, 13.8, 2.83, [LOGO], (x, w, h, im) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    tricolore(x, 0, h - 22, w, 22);
    if (im[LOGO]) { contain(x, im[LOGO], 70, 50, 520, 300); contain(x, im[LOGO], w - 590, 50, 520, 300); }
    x.fillStyle = NAVY; x.textAlign = 'center'; x.font = 'bold 64px "Barlow Condensed", "Arial Narrow", Arial, sans-serif';
    x.fillText('COPPA DAVIS', w/2, 90); x.font = '44px Barlow, Arial, sans-serif'; x.fillStyle = '#34404f'; x.fillText('1976 · 2023 · 2024 · 2025', w/2, 150);
  });
  add(back, -1.5, 2.56, -5.87, 0, truck);
  box(13.8, .06, 2.4, 0x1d2430, -1.5, 1.1, -4.7, T);                  // pavimento interno
  const inLed = new THREE.Mesh(new THREE.BoxGeometry(13.6, .05, .05), ledMat); inLed.position.set(-1.5, 3.93, -5.8); truck.add(inLed);
  const pedestal = box(1.7, .5, 1.5, 0xffffff, -1.5, 1.1, -4.75, { parent: truck, material: new THREE.MeshBasicMaterial({ color: 0xffffff }) });
  const turn = add(new THREE.Group(), -1.5, 1.6, -4.75, 0, truck);
  const heroCup = davisCup(silver, wood); heroCup.scale.setScalar(.95); turn.add(heroCup);
  const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 2.8), glassMat); glassFront.position.set(-1.5, 2.55, -3.42); truck.add(glassFront);
  const heroBeam = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.3, 24, 1, true), beamMat); heroBeam.position.set(-1.5, 2.8, -4.75); truck.add(heroBeam);
  truck.traverse(o => { if (o.isMesh) o.userData.dynamic = true; });

  // --- esposizione a terra (compare quando il camion si apre)
  const expo = new THREE.Group(); root.add(expo);
  const E_ = { parent: expo };
  const deck = new THREE.Group(); expo.add(deck);
  box(17.4, .12, 7.2, 0x1d2430, -1.2, 0, 0, { parent: deck });          // pedana (si srotola dal camion)
  box(17.6, .1, .25, 0xf3c623, -1.2, 0, 3.55, { parent: deck });
  deck.position.z = -3.4; deck.children.forEach(c => { c.position.z += 3.6; });
  const carpet = box(2.4, .02, 20, 0xb3202a, -1.5, .12, 6.5, E_);
  // cordoni lungo il tappeto
  for (const sx of [-3.1, .1]) for (let z = 4.6; z <= 15.5; z += 2.2){
    box(.12, .95, .12, 0xd4a017, sx, 0, z, E_);
    if (z + 2.2 <= 15.6){ const r = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 2.2, 6), mat(0x8e1620)); r.rotation.x = Math.PI/2; r.position.set(sx, .82, z + 1.1); expo.add(r); }
  }
  // stendardi d'ingresso con il logo in negativo
  const banner = () => drawnPlane(360, 1200, 1.3, 4.3, [LOGO_NEG], (x, w, h, im) => {
    x.fillStyle = NAVY; x.fillRect(0, 0, w, h); tricolore(x, 0, 0, w, 26);
    if (im[LOGO_NEG]) contain(x, im[LOGO_NEG], 24, 70, w - 48, 180);
    x.save(); x.translate(w/2 + 40, h - 60); x.rotate(-Math.PI/2); x.fillStyle = '#fff'; x.font = 'italic bold 118px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText('TROPHY TOUR', 0, 0); x.restore();
  }, { double: true });
  for (const sx of [-5.6, 1.9]){ box(.1, 5.6, .1, 0xdfe3e6, sx, 0, 16, E_); add(banner(), sx + (sx < 0 ? .72 : -.72), 3.4, 16, 0, expo); }

  // vetrina della Billie Jean King Cup
  box(1.6, .95, 1.6, 0xffffff, -6.6, .12, .6, { parent: expo, material: new THREE.MeshBasicMaterial({ color: 0xffffff }) });
  box(1.66, .08, 1.66, 0x0b2a5b, -6.6, 1.05, .6, E_);
  const bjk = bjkCup(silver, wood); bjk.scale.setScalar(.82); add(bjk, -6.6, 1.13, .6, 0, expo);
  const vit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 1.5), glassMat); vit.position.set(-6.6, 1.98, .6); expo.add(vit);
  const vitTop = box(1.56, .06, 1.56, 0xdfe3e6, -6.6, 2.83, .6, E_);
  const bjkBeam = new THREE.Mesh(new THREE.ConeGeometry(.9, 3, 20, 1, true), beamMat); bjkBeam.position.set(-6.6, 2.4, .6); expo.add(bjkBeam);
  const plate = (t, w = 1.6) => canvasPlane(512, 150, w, w*150/512, (x, W_, H_) => { x.fillStyle = NAVY; x.fillRect(0, 0, W_, H_); tricolore(x, 0, H_ - 10, W_, 10); x.fillStyle = '#fff'; x.font = 'bold 44px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText(t.title, 18, 58); x.fillStyle = GOLD; x.font = '26px Barlow, Arial, sans-serif'; for (const [i, ln] of wrap(x, t.years, W_ - 36).slice(0, 2).entries()) x.fillText(ln, 18, 98 + i*30); });
  const bjkPlate = plate(TROPHIES[1]); bjkPlate.rotation.x = -.5; add(bjkPlate, -6.6, .95, 1.43, 0, expo); bjkPlate.rotation.x = -.5;
  const davisPlate = plate(TROPHIES[0], 1.9); add(davisPlate, -1.5, .82, -3.2, 0, expo); davisPlate.rotation.x = -.35;
  box(2.1, .7, .3, 0x0b2a5b, -1.5, .12, -3.3, E_);

  // set per la foto ricordo: parete «step and repeat» con i loghi su bianco e la riproduzione della Coppa
  const wall = drawnPlane(1400, 840, 4.6, 2.76, [LOGO], (x, w, h, im) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++){
      const ox = c*350 + (r % 2 ? 175 : 0) - 60, oy = r*170 + 10;
      if (r % 2 === c % 2){ if (im[LOGO]) contain(x, im[LOGO], ox, oy, 250, 140); }
      else { x.fillStyle = NAVY; x.font = 'italic bold 46px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText('TROPHY TOUR', ox + 10, oy + 88); }
    }
    tricolore(x, 0, h - 18, w, 18);
  }, { basic: true });
  box(4.8, 3.05, .2, 0x0b2a5b, 4.9, .12, -1.35, { parent: expo });
  add(wall, 4.9, 1.66, -1.23, 0, expo);
  const photoSpot = [4.3, .3];
  box(.8, .9, .8, 0xffffff, 5.9, .12, -.35, { parent: expo, material: new THREE.MeshBasicMaterial({ color: 0xffffff }) });
  const replica = davisCup(silver, wood); replica.scale.setScalar(.42); add(replica, 5.9, 1.02, -.35, 0, expo);
  const mark = new THREE.Mesh(new THREE.RingGeometry(.5, .62, 32), new THREE.MeshBasicMaterial({ color: 0xf3c623 })); mark.rotation.x = -Math.PI/2; mark.position.set(photoSpot[0], .14, photoSpot[1]); expo.add(mark);

  // totem della galleria: due file ai lati del tappeto, due facce per totem
  const totemFace = (e) => drawnPlane(768, 1088, 2.3, 3.26, [e.photo ? 'assets/photos/' + e.photo : LOGO, LOGO], (x, w, h, im) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    x.fillStyle = NAVY; x.fillRect(0, 0, w, 176); tricolore(x, 0, 176, w, 10);
    x.fillStyle = GOLD; x.font = 'bold 112px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText(e.year, 30, 118);
    x.fillStyle = '#fff'; x.font = 'bold 44px "Barlow Condensed", "Arial Narrow", Arial, sans-serif';
    wrap(x, e.title, w - 300).slice(0, 2).forEach((ln, i) => x.fillText(ln, 290, 78 + i*48));
    const ph = im[e.photo ? 'assets/photos/' + e.photo : LOGO];
    if (e.photo){ if (ph) cover(x, ph, 0, 186, w, 450); else { x.fillStyle = '#dfe3e6'; x.fillRect(0, 186, w, 450); } }
    else if (ph) contain(x, ph, 90, 230, w - 180, 360);
    let y = 660;
    if (e.credit){ x.fillStyle = '#5b6678'; x.font = 'italic 21px Barlow, Arial, sans-serif'; x.fillText(e.credit, 28, y); y += 44; } else y += 20;
    x.fillStyle = '#1d2430'; x.font = '31px Barlow, Arial, sans-serif';
    for (const ln of wrap(x, e.text, w - 56).slice(0, 7)){ x.fillText(ln, 28, y); y += 41; }
    if (im[LOGO]) contain(x, im[LOGO], w - 170, h - 104, 140, 80);
  });
  const readSpots = [];
  const totems = [];
  const slots = [[-5.6, 7.5, 1], [2.6, 7.5, -1], [-5.6, 12, 1], [2.6, 12, -1]];
  slots.forEach(([tx, tz, side], i) => {
    const g = new THREE.Group(); g.position.set(tx, 0, tz); g.rotation.y = side*.5; expo.add(g);
    box(2.5, .3, .6, 0x0b2a5b, 0, 0, 0, { parent: g });
    box(2.44, 3.4, .16, 0x0b2a5b, 0, .3, 0, { parent: g });
    const pair = [EXHIBITS[i*2], EXHIBITS[i*2 + 1]];
    pair.forEach((e, k) => {
      if (!e) return;
      const face = totemFace(e); face.position.set(0, 2.0, k ? -.09 : .09); face.rotation.y = k ? Math.PI : 0; g.add(face);
      readSpots.push({ e, g, k });
    });
    totems.push(g);
  });
  expo.traverse(o => { if (o.isMesh) o.userData.dynamic = true; });

  /* ---------- posizionamento, collisioni, interazioni ---------- */
  let cur = null, F = null, phase = 'open', pt = 0, pending = null, myColl = [];
  const setColl = on => {
    for (const c of myColl){ const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
    myColl = [];
    if (!on || !F) return;
    const rect = (lx, lz, hw, hd, rot = 0) => {
      const [cx, cz] = F.w(lx, lz), r = F.rot + rot, c = Math.cos(r), s = Math.sin(r), ex = hw*Math.abs(c) + hd*Math.abs(s), ez = hw*Math.abs(s) + hd*Math.abs(c);
      const o = { t: 'o', cx, cz, hw, hd, c, s, bb: [cx - ex, cx + ex, cz - ez, cz + ez] }; colliders.push(o); myColl.push(o);
    };
    rect(-.3, -4.7, 8.8, 1.35);                  // camion
    rect(-6.6, .6, .85, .85);                   // vetrina
    rect(4.9, -1.35, 2.45, .2);                 // parete della foto
    rect(5.9, -.35, .45, .45);                  // riproduzione della coppa
    rect(-1.5, -3.3, 1.05, .2);                 // targa della Davis
    for (const [tx, tz, side] of slots) rect(tx, tz, 1.25, .35, side*.5);
  };
  const world = (lx, lz) => F.w(lx, lz);
  const place = (s) => {
    cur = s; F = s.F; root.position.set(s.x, s.y, s.z); root.rotation.y = s.rot;
    W.bus.emit('tour:moved', s);
    const g = W.npcs && W.npcs.byId && W.npcs.byId('beatrice');
    if (g){ const [x, z] = world(-3.6, 3.2); g.x = g.home.x = x; g.z = g.home.z = z; g.av.g.position.set(x, s.y, z); g.av.g.rotation.y = s.rot + .4; }
  };

  // interazioni: posizioni calcolate sulla tappa corrente
  const I = (id, lx, lz, r, label, short, act) => W.interact.add({ id, x: () => world(lx, lz)[0], z: () => world(lx, lz)[1], r, label, short, map: '#0b2a5b',
    when: () => phase === 'open', act });
  const read = (id, title, body, credit) => {
    W.setMode('menu');
    hud.panel({ tag: 'FITP Trophy Tour', title, html: `<p>${esc(body)}</p>${credit ? `<p class="fine">Foto: ${esc(credit)}. Da Wikimedia Commons.</p>` : ''}<p class="fine">Testi da Wikipedia (settembre 2026), da validare con l'ufficio stampa FITP.</p>`,
      buttons: [{ label: 'Chiudi', primary: true }], onClose: () => W.setMode('explore') });
    if (!W.progress.st.museum[id]){
      W.progress.st.museum[id] = 1; W.progress.save();
      const all = [...EXHIBITS.map(e => e.id), ...TROPHIES.map(t => t.id)], n = all.filter(k => W.progress.st.museum[k]).length;
      if (n >= all.length) W.progress.badge('museo'); else hud.toast(`Trophy Tour: ${n} di ${all.length}`);
    }
  };
  for (const { e, g, k } of readSpots){
    const off = k ? -1.7 : 1.7;
    const lx = g.position.x + Math.sin(g.rotation.y)*off, lz = g.position.z + Math.cos(g.rotation.y)*off;
    I('tour:' + e.id, lx, lz, 1.6, `Leggi: ${e.title}`, 'Leggi', () => read(e.id, e.title, e.long, e.credit));
  }
  I('tour:trofeo-davis', -1.5, -2.2, 1.8, 'Guarda: Coppa Davis', 'Guarda', () => read(TROPHIES[0].id, TROPHIES[0].title, TROPHIES[0].text + ' Anni: ' + TROPHIES[0].years + '.'));
  I('tour:trofeo-bjk', -6.6, 2.2, 1.8, 'Guarda: Billie Jean King Cup', 'Guarda', () => read(TROPHIES[1].id, TROPHIES[1].title, TROPHIES[1].text + ' Anni: ' + TROPHIES[1].years + '.'));
  I('tour:foto', photoSpot[0], photoSpot[1] + .3, 1.5, 'Scatta la foto con la Coppa', 'Foto', () => takePhoto());

  /* ---------- foto ricordo ---------- */
  async function takePhoto(){
    const E = W.engine, cam = E.camera, [px, pz] = world(photoSpot[0], photoSpot[1]);
    W.player.place(px, pz); W.hero.g.rotation.y = F.rot;
    const saved = { p: cam.position.clone(), q: cam.quaternion.clone() };
    const y = W.player.pos.y;
    pose(W.hero, { state: 'cheer', t: E.time });
    const [cx, cz] = world(photoSpot[0] + .5, photoSpot[1] + 4.6); cam.position.set(cx, y + 1.8, cz);
    const [lx, lz] = world(photoSpot[0] + .6, photoSpot[1] - .4); cam.lookAt(lx, y + 1.25, lz);
    E.renderer.render(scene, cam);
    const shot = E.renderer.domElement.toDataURL('image/jpeg', .92);
    cam.position.copy(saved.p); cam.quaternion.copy(saved.q);
    const [s, logo] = await Promise.all([new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = shot; }), img(LOGO_NEG), fontsReady]);
    const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const x = c.getContext('2d');
    cover(x, s, 0, 0, 1200, 740);
    x.fillStyle = NAVY; x.fillRect(0, 740, 1200, 160); tricolore(x, 0, 740, 1200, 12);
    if (logo) contain(x, logo, 30, 768, 190, 110);
    const nick = W.ugc.profile.get().nick;
    x.fillStyle = '#fff'; x.font = 'italic bold 64px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText('FITP TROPHY TOUR', 250, 830);
    x.fillStyle = GOLD; x.font = '32px Barlow, Arial, sans-serif'; x.fillText(`${nick} · ${cur.name}, Foro Italico · ${new Date().toLocaleDateString('it-IT')}`, 252, 875);
    const url = c.toDataURL('image/jpeg', .9);
    W.setMode('menu');
    hud.panel({ tag: 'FITP Trophy Tour', title: 'La tua foto con la Coppa Davis',
      html: `<img class="photo" src="${url}" alt="Foto ricordo al Trophy Tour"><p><a class="dl" href="${url}" download="foro-italico-trophy-tour.jpg">Scarica la foto</a></p><p class="fine">La foto resta sul tuo dispositivo: non viene caricata da nessuna parte.</p>`,
      buttons: [{ label: 'Chiudi', primary: true }], onClose: () => W.setMode('explore') });
    W.progress.badge('fototour');
    W.bus.emit('tour:photo');
  }

  /* ---------- orario e spostamenti ---------- */
  const STAY = TOUR_STAY*60e3;
  const slotNow = () => Math.floor(Date.now()/STAY);
  const stopAt = k => stops[((k % stops.length) + stops.length) % stops.length];
  let forced = null;
  const target = () => forced || stopAt(slotNow());
  place(target()); setColl(true);

  const OPEN_T = 2.6, DRIVE_T = 4.5, DRIVE_D = 18;
  function setOpen(k){                                   // k: 0 chiuso … 1 aperto
    const e = k*k*(3 - 2*k);
    hinge.rotation.x = -e*(Math.PI/2 + .1);
    deck.scale.z = Math.max(.001, e);
    expo.visible = k > .02;
    const u = clamp((k - .35)/.65, 0, 1);
    for (const t of totems) t.scale.y = Math.max(.001, u);
    for (const o of [carpet, bjk, vit, vitTop, bjkBeam, replica, wall, mark, bjkPlate, davisPlate, heroBeam]) o.visible = u > .05;
    glassFront.visible = k > .5;
  }
  setOpen(1);
  function stamp(){
    const i = TOUR_STOPS.findIndex(s => s.id === cur.id);
    if (W.progress.st.tour[cur.id]) return;
    W.progress.st.tour[cur.id] = 1; W.progress.save();
    const n = stops.filter(s => W.progress.st.tour[s.id]).length;
    hud.toast(`Timbro del Trophy Tour: ${cur.name} (${n} di ${stops.length})`, 'gold');
    if (n >= stops.length) W.progress.badge('passaporto');
    return i;
  }

  /* ---------- tabellone nel Fan Village: dov'è il tour adesso e quando riparte ---------- */
  let board = null;
  if (W.village){
    const VF = W.village.F, vf = { f: VF };
    box(.14, 3.6, .14, 0xdfe3e6, 4.6, 0, 17, { ...vf, collide: true }); box(.14, 3.6, .14, 0xdfe3e6, 7.4, 0, 17, vf);
    box(3.2, 2.05, .16, 0x0b2a5b, 6, 1.5, 17, vf);
    board = canvasPlane(900, 560, 3, 1.87, () => {});
    const [bx, bz] = VF.w(6, 17.09); board.position.set(bx, 2.52, bz); board.rotation.y = VF.rot; scene.add(board);
  }
  let boardKey = '';
  const drawBoard = (logo) => {
    if (!board || !cur) return;
    const n = forced ? null : Math.ceil((STAY - (Date.now() % STAY))/1000), key = cur.id + phase + (n == null ? '' : Math.floor(n/10)) + !!logo;
    if (key === boardKey) return; boardKey = key;
    board.redraw((x, w, h) => {
      x.fillStyle = NAVY; x.fillRect(0, 0, w, h); tricolore(x, 0, 0, w, 14);
      if (logo) contain(x, logo, 26, 36, 200, 114);
      x.fillStyle = '#fff'; x.font = 'italic bold 78px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText('TROPHY TOUR', 250, 118);
      x.fillStyle = GOLD; x.font = 'bold 34px Barlow, Arial, sans-serif'; x.fillText(phase === 'open' ? 'ADESSO È' : 'IN VIAGGIO VERSO', 34, 212);
      x.fillStyle = '#fff'; x.font = 'bold 64px "Barlow Condensed", "Arial Narrow", Arial, sans-serif'; x.fillText((phase === 'closing' || phase === 'leaving') && pending ? pending.name : cur.name, 34, 284);
      x.font = '30px Barlow, Arial, sans-serif'; x.fillStyle = '#dfe6f2';
      if (n != null) x.fillText(`Riparte tra circa ${Math.max(1, Math.round(n/60))} minut${Math.round(n/60) === 1 ? 'o' : 'i'} · poi: ${api.next().name}`, 34, 344);
      x.fillText('Tappe: ' + stops.map(s => s.name).join(' · '), 34, 404);
      x.fillStyle = GOLD; x.font = 'bold 30px Barlow, Arial, sans-serif'; x.fillText('Premi T e scegli «FITP Trophy Tour» per andarci', 34, 500);
    });
  };
  let boardLogo = null; img(LOGO_NEG).then(l => { boardLogo = l; boardKey = ''; });

  const api = {
    stops, root,
    get F(){ return F; }, get stop(){ return cur; }, get phase(){ return phase; },
    get entrance(){ const [x, z] = world(-1.5, 18); return { x, z }; },
    get curator(){ const [x, z] = world(-3.6, 3.2); return { x, z }; },
    get spots(){ return [...readSpots, ...TROPHIES]; },
    total: EXHIBITS.length + TROPHIES.length,
    nextIn(){ return forced ? null : Math.ceil((STAY - (Date.now() % STAY))/1000); },
    next(){ return stopAt(stops.indexOf(cur) + 1); },
    // per le prove e per il debug: forza una tappa (null torna all'orario)
    goTo(i, instant = false){ forced = i == null ? null : stopAt(i); if (instant){ phase = 'open'; setColl(false); place(target()); setColl(true); truck.position.x = 0; setOpen(1); } },
    takePhoto, sources: PHOTO_CREDITS,
    update(dt){
      const t = W.engine.time;
      turn.rotation.y = t*.35; bjk.rotation.y = -t*.25; drawBoard(boardLogo);
      const want = target();
      if (phase === 'open'){
        if (want !== cur){ phase = 'closing'; pt = 0; pending = want; setColl(false); }
        else if (W.mode === 'explore' || W.mode === 'drive'){
          const p = W.player.pos, [lx, lz] = F.l(p.x, p.z);
          if (lx > -11 && lx < 10 && lz > -7 && lz < 18) stamp();
        }
      } else if (phase === 'closing'){
        pt += dt/OPEN_T; setOpen(1 - clamp(pt, 0, 1)); if (pt >= 1){ phase = 'leaving'; pt = 0; }
      } else if (phase === 'leaving'){
        pt += dt/DRIVE_T; const e = pt*pt; truck.position.x = e*DRIVE_D; truck.visible = pt < 1;
        if (pt >= 1){ place(pending); phase = 'arriving'; pt = 0; truck.visible = true; hud.toast(`Il Trophy Tour si è spostato: ora è ${pending.hint}`); }
      } else if (phase === 'arriving'){
        pt += dt/DRIVE_T; const e = 1 - (1 - clamp(pt, 0, 1))**2; truck.position.x = -DRIVE_D*(1 - e);
        if (pt >= 1){ truck.position.x = 0; phase = 'opening'; pt = 0; setColl(true); }
      } else if (phase === 'opening'){
        pt += dt/OPEN_T; setOpen(clamp(pt, 0, 1)); if (pt >= 1) phase = 'open';
      }
    },
  };
  return api;
}
