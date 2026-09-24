// node --test tools/test
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout, minAreaRect, joinLines } from '../osm-import.mjs';
import { makeFixture, BBOX } from './fixture.mjs';

const TURN = 12*Math.PI/180;
const angle = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));  // differenza tra angoli, 0..π
const axis = (a, b) => Math.min(angle(a, b), Math.PI - angle(a, b));              // differenza tra direzioni, 0..π/2
const near = (s, x, z, tol = 1.5) => {
  const c = Math.cos(TURN), sn = Math.sin(TURN), ex = x*c + z*sn, ez = -x*sn + z*c;
  assert.ok(Math.hypot(s.x - ex, s.z - ez) < tol, `atteso (${ex.toFixed(1)}, ${ez.toFixed(1)}), trovato (${s.x}, ${s.z})`);
};

test('rettangolo di area minima', () => {
  const r = minAreaRect([[0,0],[10,0],[10,4],[0,4],[5,2]]);
  assert.ok(Math.abs(r.len - 10) < 1e-6 && Math.abs(r.wid - 4) < 1e-6);
  assert.ok(Math.abs(r.cx - 5) < 1e-6 && Math.abs(r.cz - 2) < 1e-6);
});

test('unione di spezzate', () => {
  const [l] = joinLines([[[0,0],[1,0]], [[2,0],[1,0]], [[2,0],[3,0]]]);
  assert.equal(l.length, 4);
});

test('impianti riconosciuti e orientati', () => {
  const { layout, report } = buildLayout(makeFixture(TURN), { bbox: BBOX });
  const S = layout.sites;
  assert.deepEqual(report.missing, []);
  near(S.centrale, -62, -88); near(S.pietrangeli, 5, -62); near(S.supertennis, 10, -128);
  near(S.marmi, 92, -16); near(S.olimpico, -150, 112, 2); near(S.viale, 69, 40); near(S.ponte, 186, 40);
  near(S.fontana, -45, 40); near(S.obelisco, 162, 40);
  // ingressi del Centrale e del Pietrangeli verso il viale (a sud nello schema)
  assert.ok(angle(S.centrale.rot, TURN) < .02, `rot Centrale ${S.centrale.rot}`);
  assert.ok(angle(S.pietrangeli.rot, TURN) < .02);
  assert.ok(axis(S.supertennis.rot, TURN + Math.PI/2) < .02);
  assert.ok(axis(S.viale.rot, TURN) < .02 && Math.abs(S.viale.len - 192) < 1 && Math.abs(S.viale.wid - 14) < 1);
  assert.ok(Math.abs(S.marmi.a - 59) < 1 && Math.abs(S.marmi.b - 43) < 1.5 && axis(S.marmi.rot, TURN) < .05);
  assert.equal(report.sites.arena, 'dedotta dallo Stadio dei Marmi');
  assert.ok(axis(S.arena.rot, TURN + Math.PI/2) < .05);
});

test('campi, fiume, ponti, edifici, alberi', () => {
  const { layout } = buildLayout(makeFixture(TURN), { bbox: BBOX });
  assert.equal(layout.courts.length, 8);          // il campo dentro il Centrale non conta
  assert.equal(layout.padel.length, 0);           // l'unico campo da padel diventa quello del minigioco
  assert.ok(layout.sites.padel);
  assert.equal(layout.water.length, 1);           // i due tratti del Tevere uniti
  assert.equal(layout.buildings.length, 1);       // la struttura dello stadio è esclusa
  assert.equal(layout.bridges.length, 0);         // il Ponte Duca d'Aosta è un impianto, non un doppione
  assert.ok(layout.trees.length >= 10);
  assert.equal(layout.attribution, '© OpenStreetMap contributors, ODbL');
  const b = layout.bounds;
  assert.ok(b.x1 - b.x0 > 1700 && b.z1 - b.z0 > 1500);
  // si parte dal capo del viale verso il ponte
  assert.ok(Math.hypot(layout.start.x - layout.sites.ponte.x, layout.start.z - layout.sites.ponte.z) < 50);
});

test('correzioni da overrides.json', () => {
  const { layout, report } = buildLayout(makeFixture(0), { bbox: BBOX, overrides: {
    sites: { supertennis: { bearing: 270 }, centrale: { bearing: 0 } }, exclude: [],
  } });
  assert.ok(angle(layout.sites.supertennis.rot, -Math.PI/2) < 1e-3);  // ingresso a ovest
  assert.ok(angle(layout.sites.centrale.rot, Math.PI) < 1e-3);        // ingresso a nord
  assert.match(report.sites.supertennis, /overrides/);
});
