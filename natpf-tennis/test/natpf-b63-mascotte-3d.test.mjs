// B63 · mascotte 3D con animazioni nuove nella card (natpf_card_moves.js, natpf_ritratti.js; decisione dell'utente del
// 17/11/2026: «3D con animazioni nuove», anteprima prima di pubblicare): sei movimenti (3 di vittoria, 3 di sconfitta) che
// si ripetono senza salto, abbastanza ampi da vedersi, scelta senza ripetere quello di prima, personaggio rimesso a posto,
// interruttore spento di base (finché l'utente non approva), reazione «sad» che si ripete uguale.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { CARD_LOOP, CARD_K, CARD_MOVES, CARD_MOVES_KEY, CARD_MOVES_LAST, cardMove, cardMovesOn, pickCardMove, applyCardMove } from '../src/natpf/natpf_card_moves.js';
import { CHEER_PERIOD, SAD_W, CHEER_W } from '../src/player_body_animation.js';
import { playFrame } from '../src/natpf/natpf_ritratti.js';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }; };
const ALL = [...CARD_MOVES.win, ...CARD_MOVES.lose];

test('B63: sei movimenti, tre per esito, con la reazione del corpo giusta', () => {
  assert.deepEqual(CARD_MOVES.win.map(m => m.id), ['win-a', 'win-b', 'win-c']);
  assert.deepEqual(CARD_MOVES.lose.map(m => m.id), ['lose-a', 'lose-b', 'lose-c']);
  assert.deepEqual(CARD_MOVES.win.map(m => m.base), ['cheer', 'cheer', 'cheer']);
  assert.deepEqual(CARD_MOVES.lose.map(m => m.base), ['sad', 'sad', 'clap']);
  assert.equal(cardMove('win-b').name, 'Giravolta'); assert.equal(cardMove('x'), null);
  assert.ok(Math.abs(CARD_LOOP - 3*CHEER_PERIOD) < 1e-12, 'il giro è tre salti: si ripete senza salto');
  assert.ok(Math.abs(SAD_W*CARD_LOOP - 2*Math.PI) < 1e-9 && SAD_W === CHEER_W/3, 'la testa bassa ondeggia una volta per giro');
  assert.equal(CARD_K, 24);
});

test('B63: ogni movimento si chiude (fine = inizio) ed è abbastanza ampio da vedersi; i piedi si alzano solo in su', () => {
  for (const m of ALL){
    const a = m.at(0), b = m.at(1 - 1e-9);
    for (const k of ['right', 'fwd', 'up', 'footL', 'footR', 'pitch', 'roll']) assert.ok(Math.abs((a[k] || 0) - (b[k] || 0)) < 1e-6, `${m.id} ${k}`);
    // giravolta: un giro intero (stessa direzione)
    assert.ok(Math.abs(Math.cos(a.yaw) - Math.cos(b.yaw)) < 1e-6 && Math.abs(Math.sin(a.yaw) - Math.sin(b.yaw)) < 1e-6, `${m.id} yaw`);
    let span = 0, turn = 0, lift = 0;
    for (let i = 0; i <= 96; i++){ const o = m.at(i/96); span = Math.max(span, Math.hypot(o.right, o.fwd, o.up)); turn = Math.max(turn, Math.abs(o.yaw)); lift = Math.max(lift, o.footL || 0, o.footR || 0); assert.ok((o.footL || 0) >= 0 && (o.footR || 0) >= 0); }
    assert.ok(span >= 0.1 || turn >= 0.3, `${m.id}: si sposta ${span.toFixed(2)} m o gira ${turn.toFixed(2)} rad`);
  }
  assert.ok(Math.abs(cardMove('win-b').at(0.7).yaw - 2*Math.PI) < 1e-9, 'giravolta: un giro intero');
  for (const id of ['lose-a', 'lose-b']) assert.ok(cardMove(id).at(0.3).pitch > 0.15, `${id}: piegato in avanti (testa bassa che si vede sulla mascotte 3D)`);
});

test('B63: scelta a caso tra i tre dell\'esito, mai quello della partita prima per lo stesso esito', () => {
  const st = memory();
  let lastW = null, lastL = null; const seen = new Set();
  let r = 99; const rnd = () => ((r = (r*1103515245 + 12345) % 2147483648)/2147483648);
  for (let i = 0; i < 300; i++){
    const w = pickCardMove('win', { storage: st, rnd }), l = pickCardMove('lose', { storage: st, rnd });
    assert.ok(CARD_MOVES.win.includes(w) && CARD_MOVES.lose.includes(l));
    assert.notEqual(w.id, lastW); assert.notEqual(l.id, lastL);
    lastW = w.id; lastL = l.id; seen.add(w.id); seen.add(l.id);
  }
  assert.equal(seen.size, 6);
  assert.deepEqual(JSON.parse(st.map.get(CARD_MOVES_LAST)), { win: lastW, lose: lastL });
  assert.ok(CARD_MOVES.lose.includes(pickCardMove('pari', { storage: memory({ [CARD_MOVES_LAST]: '{rotto' }), rnd: () => 0 })), 'stato rovinato: si sceglie lo stesso');
});

test('B63: interruttore spento di base (anteprima all\'utente prima di pubblicare); ?mascotte3d=1 o la chiave lo accendono', () => {
  assert.equal(cardMovesOn({ search: '', storage: memory() }), false);
  assert.equal(cardMovesOn({ search: '?mascotte3d=1', storage: memory() }), true);
  assert.equal(cardMovesOn({ search: '?mascotte3d=0', storage: memory({ [CARD_MOVES_KEY]: '1' }) }), false);
  assert.equal(cardMovesOn({ search: '', storage: memory({ [CARD_MOVES_KEY]: '1' }) }), true);
  assert.equal(cardMovesOn({ search: '', storage: { getItem(){ throw new Error('x'); } } }), false);
});

test('B63: il personaggio si sposta nel riferimento di chi guarda e torna esattamente al suo posto', () => {
  const root = new THREE.Object3D(); root.position.set(1, 0, 11); root.rotation.set(0, Math.PI, 0);
  const rig = { footLPivot: new THREE.Object3D(), footRPivot: new THREE.Object3D(), basePivots: { footL: new THREE.Vector3(.1, .05, 0), footR: new THREE.Vector3(-.1, .05, 0) } };
  const actor = { root, rig }, base = { pos: root.position.clone(), rotY: root.rotation.y, rotX: 0, rotZ: 0 };
  // camera verso −z (chi gioca dalla parte del Player 1): fwd verso −z, destra di chi guarda verso +x... con dir −1 è −x
  const m = cardMove('win-c'), o = applyCardMove(actor, m, CARD_LOOP*0.25, base, -1);
  assert.ok(Math.abs(root.position.z - (11 - o.fwd)) < 1e-9 && o.fwd > 0.4, 'avanti verso chi guarda');
  const s = cardMove('win-a'), o2 = applyCardMove(actor, s, CARD_LOOP*0.25, base, -1);
  assert.ok(Math.abs(root.position.x - (1 - o2.right)) < 1e-9 && o2.right > 0.3, 'a destra di chi guarda');
  assert.ok(rig.footLPivot.position.y >= .05 && rig.footRPivot.position.y >= .05);
  const l = cardMove('lose-a'); applyCardMove(actor, l, CARD_LOOP*0.5, base, -1);
  assert.ok(root.rotation.x < -0.15, 'piegato verso chi guarda (camera a −z)');
  applyCardMove(actor, l, CARD_LOOP*0.5, base, 1); assert.ok(root.rotation.x > 0.15, 'dall\'altra parte');
  assert.equal(applyCardMove(null, l, 0, base), null); assert.equal(applyCardMove(actor, null, 0, base), null);
  // natpf_ritratti rimette posto, direzione e inclinazione al rilascio e tra una fetta e l'altra della fotografia
  const src = fs.readFileSync(new URL('../src/natpf/natpf_ritratti.js', import.meta.url), 'utf8');
  assert.match(src, /r\.position\.copy\(it\.base\.pos\); r\.rotation\.set\(it\.base\.rotX, it\.base\.rotY, it\.base\.rotZ\)/);
  assert.match(src, /cur\.actor\.root\.position\.copy\(cur\.base\.pos\); cur\.actor\.root\.rotation\.set\(cur\.base\.rotX, cur\.base\.rotY, cur\.base\.rotZ\)/);
});

test('B63: il giro della card si riproduce sulla sua durata; con l\'interruttore acceso niente GIF nella card', () => {
  assert.equal(playFrame(0, 24, CARD_LOOP), 0);
  assert.equal(playFrame(CARD_LOOP*1000/24 + 1, 24, CARD_LOOP), 1);
  assert.equal(playFrame(CARD_LOOP*1000 + 1, 24, CARD_LOOP), 0);
  assert.equal(playFrame(CHEER_PERIOD*1000 + 1, 12), 0, 'il ritratto di sempre come prima');
  const hud = fs.readFileSync(new URL('../src/hud_ui.js', import.meta.url), 'utf8');
  assert.match(hud, /rot = cv0 && !cardMovesOn\(\) \? mascotRotation\(\) : null/);
});
