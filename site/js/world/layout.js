// Planimetria: data/layout.json (da OpenStreetMap, tools/osm-import.mjs) oppure lo schema interno.
// Coordinate in metri: x = est, z = sud. `rot` è la rotazione attorno all'asse verticale (come rotation.y di Three.js).
// Stadi e campi: il lato lungo del campo è l'asse z locale e l'ingresso sta sul lato +z.
// Ellissi (Olimpico, Marmi) e rettangoli (viale, ponti): il lato lungo è l'asse x locale.
const rect = (x0, x1, z0, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

export const SCHEMATIC = {
  version: 1, source: 'schematic', attribution: null,
  bounds: { x0: -200, x1: 228, z0: -200, z1: 160 },
  start: { x: 146, z: 40, ry: -Math.PI/2 },
  sites: {
    viale:       { x: 69, z: 40, rot: 0, len: 192, wid: 14 },
    fontana:     { x: -45, z: 40 },
    obelisco:    { x: 162, z: 40 },
    olimpico:    { x: -150, z: 112, rot: 0, a: 62, b: 46 },
    marmi:       { x: 92, z: -16, rot: 0, a: 59.2, b: 43.2 },
    arena:       { x: 92, z: -16, rot: Math.PI/2 },
    pietrangeli: { x: 5, z: -62, rot: 0 },
    centrale:    { x: -62, z: -88, rot: 0 },
    supertennis: { x: 10, z: -128, rot: -Math.PI/2 },
    ponte:       { x: 186, z: 40, rot: 0, len: 32, wid: 14 },
    padel:       { x: -125, z: -30, rot: 0 },   // posizione inventata: area padel da verificare
  },
  padel: [{ x: -143, z: -30, rot: 0 }, { x: -107, z: -30, rot: 0 }],
  courts: [55, 80, 105, 130].flatMap(x => [-115, -155].map(z => ({ x, z, rot: 0 }))),
  paved: [
    rect(-65, -25, 23, 57),         // piazzale della Fontana
    rect(-28.5, -21.5, -143, 33),   // asse nord verso i campi
    rect(-62, -25.5, -51, -45),     // verso il Centrale
    rect(-65.5, -58.5, -69.7, -45), // ingresso Centrale
    rect(2, 8, -38.6, 33),          // verso il Pietrangeli
    rect(-21.5, -13, -131, -125),   // ingresso SuperTennis Arena
    rect(-21.5, 164, -94, -88),     // passeggiata verso i campi esterni
    rect(158, 164, -175, 33),       // lungo il fiume
    rect(-150, -21.5, 1, 7),        // verso l'area padel
  ],
  lines: [], bridges: [], buildings: [], trees: [],
  water: [{ pts: [[186, -360], [186, 340]], w: 28 }],
  backdrop: true,
};

export async function loadLayout(){
  const want = new URLSearchParams(location.search).get('layout');
  if (want === 'schematic') return SCHEMATIC;
  const url = want && /^[\w\-./]+\.json$/.test(want) ? want : 'data/layout.json';
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (r.ok){ const d = await r.json(); if (d && d.sites && d.sites.centrale) return d; }
  } catch (e){}
  return SCHEMATIC;
}
