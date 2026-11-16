// B53 · «Movimenti come nel video» sugli altri colpi (src/natpf/natpf_strokes_video.js), con gli stessi controlli della
// prova del dritto del B23 (test/natpf-dritto-video.test.mjs): quali colpi, racchetta sulla palla all'impatto identica a
// prima, pose nella direzione giusta, niente scatti, con la prova spenta niente (le impronte di ae68759 sono in
// natpf-dritto-video.test.mjs), uno stato per personaggio creato una volta.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { load, sequenza, impronta, mount, PERSONAGGI, TRATTI, GOLDEN, DT } from '../scripts/audit/b23/ossa.mjs';
import { setForehandVideo } from '../src/natpf/natpf_forehand_video.js';
import { SV_STROKES, SV_KINDS, svKindOf, svTargets, svRest } from '../src/natpf/natpf_strokes_video.js';
import { getRacketRimWorldPoints } from '../src/racket_kinematics.js';

const M = await load();
const G = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
const tratto = name => TRATTI.find(t => t[0].startsWith(name));
const BH = SV_STROKES.backhand;

test('B53: colpi della prova del modulo: rovescio topspin e piatto, schiacciata, volée, servizio (B53.4); non il dritto (B23), il tagliato, il pallonetto', () => {
  const T = o => ({ swingActive: true, isServe: false, swingSide: 'backhand', swingShotType: 'topspin', ...o });
  assert.equal(svKindOf(T()), 'backhand');
  assert.equal(svKindOf(T({ swingShotType: 'flat' })), 'backhand');
  for (const o of [{ swingShotType: 'slice' }, { swingShotType: 'lob' }, { swingSide: 'forehand' }, { swingActive: false }]) assert.equal(svKindOf(T(o)), null, JSON.stringify(o));
  assert.equal(svKindOf(T({ isServe: true, swingSide: 'overhead' })), 'serve', 'B53.4: il servizio');
  assert.equal(svKindOf(null), null);
  assert.deepEqual(SV_KINDS, ['backhand', 'smash', 'volleyF', 'volleyB', 'serve']);
  const O = o => ({ swingActive: true, isServe: false, swingSide: 'overhead', swingShotType: 'smash', ...o });
  assert.equal(svKindOf(O()), 'smash');
  assert.equal(svKindOf(O({ isServe: true })), 'serve', 'il servizio non è la schiacciata');
  // pesi come il dritto: preparazione dalla carica, impatto pieno al contatto, finale che resta e poi si scioglie
  const o = {};
  assert.deepEqual(svTargets(o, BH, 0, null, null), { coil: 0, drive: 0, finish: 0 });
  assert.equal(svTargets(o, BH, 1, null, null).coil, 1);
  assert.ok(Math.abs(svTargets(o, BH, 0, BH.contact, null).drive - 1) < 1e-9);
  assert.equal(svTargets(o, BH, 0, .9, null).finish, 1);
  assert.equal(svTargets(o, BH, 0, null, .05).finish, 1);
  assert.equal(svTargets(o, BH, 0, null, 2).finish, 0);
});

// un rovescio solo, palla dalla parte libera: preparazione (charge) per 50 fotogrammi, poi lo swing
function backhand(on, { timing = 'sweet', human = true, lefty = false, speed = 1.18, shot = 'topspin', frames = 110 } = {}){
  setForehandVideo(on);
  const { actor: a, rk } = mount(M, { sideSign: 1, lefty }), L = lefty ? -1 : 1;
  const ball = { inPlay: true, lastHitter: 'opponent', pos: new THREE.Vector3(), vel: new THREE.Vector3(0, 0, 14), targetLanding: new THREE.Vector3(-1.1*L, 0, 9), shotType: 'TOPSPIN' };
  const ctx = { phase: 'RALLY', score: { server: 'player' }, ball, elapsedTime: 10 }, out = [];
  for (let f = 0; f < frames; f++){
    if (f < 50) ball.pos.set(-1.1*L, 1, a.pos.z - 14*(50 - f)*DT - .4);
    else {
      if (f === 50){
        const st = rk.triggerSwing(a, { shotType: shot, side: 'backhand', speed, timing, dirX: 0, isPracticeSwing: true });
        if (human) st.swingElapsed = Math.max(st.swingElapsed || 0, .24*st.swingDuration);
      }
      ball.lastHitter = 'player'; ball.pos.set(-.6*L, 1.2, a.pos.z - 1 - .35*(f - 50)); ball.vel.set(0, 2, -21);
    }
    ctx.elapsedTime += DT; rk.update(a, DT, ctx); M.body.updatePlayerBodyAnimation(a, DT, ctx);
    const T = a.racketKinematics, c = getRacketRimWorldPoints(a), R = a.rig;
    out.push({ l: T.swingActive ? T.swingProgress : null, side: T.swingSide, prep: T.anticipationSide, centre: c.centerWorld.toArray(), tip: c.tipWorld.toArray(), normal: c.normalWorld.toArray(), y: a.root.position.y,
      hipY: R.hipPivot.rotation.y, hand: R.handLPivot.position.toArray(), racketHand: R.handRPivot.position.toArray(), pivot: a.racketPivot.position.toArray(),
      body: [R.hipPivot.position.x, R.hipPivot.position.y, R.hipPivot.position.z, R.hipPivot.rotation.x, R.hipPivot.rotation.y, R.hipPivot.rotation.z,
        R.footLPivot.position.x, R.footLPivot.position.z, R.footRPivot.position.x, R.footRPivot.position.z, ...R.handLPivot.position.toArray()], state: R.natpfSv });
  }
  setForehandVideo(true);
  return out;
}

test('B53: rovescio, racchetta sulla palla all\'impatto identica a prima (in tempo, in anticipo, in ritardo; chi gioca e CPU; destro e mancino)', () => {
  let checked = 0;
  for (const human of [true, false]) for (const timing of ['sweet', 'early', 'late']) for (const lefty of [false, true]) for (const [speed, shot] of [[1.18, 'topspin'], [1.8, 'flat']]){
    const off = backhand(false, { timing, human, lefty, speed, shot }), on = backhand(true, { timing, human, lefty, speed, shot });
    const tag = `${human ? 'chi gioca' : 'CPU'} ${timing} ${lefty ? 'mancino' : 'destro'} ${shot}`;
    assert.equal(on[60].side, 'backhand', `${tag}: è un rovescio`);
    assert.equal(on[40].prep, 'backhand', `${tag}: preparazione dalla parte del rovescio`);
    let free = 0, moved = 0;
    for (let f = 50; f < 110; f++){
      const l = on[f].l;
      assert.equal(l, off[f].l, `${tag}: stessi tempi dello swing`);
      if (l != null && l >= BH.racketFree[0] && l <= BH.racketFree[1]){
        free++; checked++;
        assert.deepEqual(on[f].centre, off[f].centre, `${tag}: cuore delle corde a ${l.toFixed(3)}`);
        assert.deepEqual(on[f].tip, off[f].tip, `${tag}: punta a ${l.toFixed(3)}`);
        assert.deepEqual(on[f].normal, off[f].normal, `${tag}: piatto a ${l.toFixed(3)}`);
        assert.equal(on[f].y, off[f].y, `${tag}: personaggio a terra come prima`);
      } else if (Math.hypot(...on[f].centre.map((x, i) => x - off[f].centre[i])) > .05) moved++;
    }
    assert.ok(free >= 2, `${tag}: fotogrammi nella zona dell'impatto ${free}`);
    assert.ok(moved >= 5, `${tag}: fuori dalla zona la racchetta fa il finale nuovo (${moved} fotogrammi)`);
  }
  assert.ok(checked > 60, `fotogrammi confrontati nella zona dell'impatto: ${checked}`);
});

test('B53: pose del rovescio come nel trailer: busto girato dalla parte libera, due mani nella preparazione e all\'impatto, finale sopra la spalla della racchetta, saltello', () => {
  for (const lefty of [false, true]){
    const off = backhand(false, { lefty }), on = backhand(true, { lefty });
    // preparazione (palla in arrivo dalla parte del rovescio): il bacino gira di più verso la parte libera (+y nel
    // riferimento del personaggio; il mancino è specchiato dalla radice, le pose sono le stesse)
    assert.ok(on[48].hipY - off[48].hipY > .4, `preparazione girata: ${(on[48].hipY - off[48].hipY).toFixed(3)} rad in più`);
    // due mani nella preparazione e all'impatto; nel finale la mano libera si apre come prima (con le due mani sopra la
    // spalla copriva la faccia delle mascotte)
    const gap = r => Math.hypot(r.hand[0] - r.racketHand[0], r.hand[1] - r.racketHand[1], r.hand[2] - r.racketHand[2]);
    assert.ok(gap(on[48]) < .12, `preparazione a due mani: ${gap(on[48]).toFixed(3)}`);
    const hit = on.findIndex((r, f) => f >= 50 && r.l != null && r.l >= BH.contact);
    // (la mano libera ha un limite di velocità: all'impatto si avvicina alla racchetta, non la raggiunge sempre)
    assert.ok(hit > 0 && gap(on[hit]) < gap(off[hit]) - .05, `impatto: mano libera più vicina alla racchetta, ${gap(on[hit]).toFixed(3)} (prima ${gap(off[hit]).toFixed(3)})`);
    const fin = on.findIndex((r, f) => f > 50 && r.l != null && r.l > .8);
    assert.ok(fin > 0, 'finale');
    // finale: la racchetta va sopra la spalla della racchetta (x < 0, alta)
    assert.ok(on[fin].pivot[1] > 1.2 && on[fin].pivot[0] < -.3, `racchetta del finale: ${on[fin].pivot.map(v => v.toFixed(2))}`);
    // saltello di recupero dopo l'impatto, poi di nuovo a terra
    const top = Math.max(...on.slice(50).map(r => r.y - off[on.indexOf(r)].y));
    assert.ok(top > .03 && top < .06, `saltello ${top.toFixed(3)} m`);
    assert.ok(Math.abs(on.at(-1).y - off.at(-1).y) < 1e-9, 'di nuovo a terra');
  }
});

test('B53: raccordi del rovescio, niente scatti nuovi (quello che la prova aggiunge cambia poco tra un fotogramma e l\'altro)', () => {
  for (const human of [true, false]) for (const lefty of [false, true]){
    const off = backhand(false, { human, lefty, frames: 140 }), on = backhand(true, { human, lefty, frames: 140 });
    let prev = null, maxPos = 0, maxRot = 0;
    for (let f = 0; f < on.length; f++){
      const d = on[f].body.map((x, i) => x - off[f].body[i]);
      if (prev){
        const pos = Math.max(...[0, 1, 2, 6, 7, 8, 9, 10, 11, 12].map(i => Math.abs(d[i] - prev[i]))), rot = Math.max(...[3, 4, 5].map(i => Math.abs(d[i] - prev[i])));
        maxPos = Math.max(maxPos, pos); maxRot = Math.max(maxRot, rot);
      }
      prev = d;
    }
    // soglie del B23 dentro lo swing (170 mm, 0,26 rad); la mano libera ha il suo limite di velocità
    assert.ok(maxPos < .17 && maxRot < .26, `${human ? 'chi gioca' : 'CPU'} ${lefty ? 'mancino' : 'destro'}: ${(maxPos*1000).toFixed(0)} mm, ${maxRot.toFixed(3)} rad`);
    // alla fine le pose in più sono sparite
    assert.ok(on.at(-1).body.every((x, i) => Math.abs(x - off.at(-1).body[i]) < 1e-6), 'tornato quello di sempre');
  }
});

test('B53: nella sequenza registrata cambiano il rovescio e il colpo del servizio (B53.4); attesa, lancio e la fine dell\'esultanza restano di ae68759; spenta resta identica', () => {
  for (const who of Object.keys(PERSONAGGI)){
    setForehandVideo(true);
    const prints = sequenza(M, PERSONAGGI[who]).map(impronta);
    const same = (a, b) => { for (let f = a; f < b; f++) assert.equal(prints[f], G.impronte[who][f], `${who}, fotogramma ${f}`); };
    const changed = (a, b) => { let n = 0; for (let f = a; f < b; f++) if (prints[f] !== G.impronte[who][f]) n++; return n; };
    same(...tratto('attesa').slice(1));
    // (B53.4: il colpo del servizio cambia; l'attesa e il lancio no)
    same(...tratto('servizio: attesa').slice(1));
    assert.ok(changed(...tratto('servizio: colpo').slice(1)) >= 20, `${who}: il colpo del servizio cambia (B53.4)`);
    // l'esultanza qui parte subito dopo il servizio: il suo finale ci finisce dentro e si chiude in circa 0,67 s; poi identica
    same(462, tratto('fine punto')[2]);
    assert.ok(changed(...tratto('palla sul rovescio').slice(1)) >= 25, `${who}: la preparazione del rovescio cambia`);
    assert.ok(changed(...tratto('rovescio intero').slice(1)) >= 30, `${who}: il rovescio cambia`);
  }
});

test('B53: uno stato per personaggio creato una volta, rimesso da capo da svRest', () => {
  const on = backhand(true, { frames: 80 });
  assert.ok(on.every(r => r.state === on[0].state), 'stesso oggetto a ogni fotogramma');
  const S = on[0].state, keys = Object.keys(S.backhand).join();
  backhand(true, { frames: 80 });
  assert.equal(Object.keys(S.backhand).join(), keys, 'nessun campo nuovo');
  const rig = { natpfSv: S };
  svRest(rig);
  assert.equal(S.backhand.coil, 0); assert.equal(S.backhand.after, null); assert.equal(S.hand, false);
});

/* ---------- B53.2 · schiacciata ---------- */
const SM = SV_STROKES.smash;
// una schiacciata sola: palla alta e vicina (preparazione «overhead») per 50 fotogrammi, poi lo swing
function smash(on, { timing = 'sweet', human = true, lefty = false, frames = 120 } = {}){
  setForehandVideo(on);
  const { actor: a, rk } = mount(M, { sideSign: 1, lefty });
  const ball = { inPlay: true, lastHitter: 'opponent', pos: new THREE.Vector3(), vel: new THREE.Vector3(0, -3, 9), targetLanding: new THREE.Vector3(0, 0, 9), shotType: 'TOPSPIN' };
  const ctx = { phase: 'RALLY', score: { server: 'player' }, ball, elapsedTime: 10 }, out = [];
  for (let f = 0; f < frames; f++){
    if (f < 50) ball.pos.set(.2, 2.6 + .02*(50 - f), a.pos.z - 1 - 4*(50 - f)/50);
    else {
      if (f === 50){
        const st = rk.triggerSwing(a, { shotType: 'smash', side: 'overhead', speed: 1.2, timing, dirX: 0 });
        if (human) st.swingElapsed = Math.max(st.swingElapsed || 0, .24*st.swingDuration);
      }
      ball.lastHitter = 'player'; ball.pos.set(.2, 2.2, a.pos.z - 1 - .4*(f - 50)); ball.vel.set(0, -4, -24);
    }
    ctx.elapsedTime += DT; rk.update(a, DT, ctx); M.body.updatePlayerBodyAnimation(a, DT, ctx);
    const T = a.racketKinematics, c = getRacketRimWorldPoints(a), R = a.rig;
    out.push({ l: T.swingActive ? T.swingProgress : null, side: T.swingSide, prep: T.anticipationSide, centre: c.centerWorld.toArray(), tip: c.tipWorld.toArray(), normal: c.normalWorld.toArray(), y: a.root.position.y,
      hipY: R.hipPivot.rotation.y, hipH: R.hipPivot.position.y, hand: R.handLPivot.position.toArray(),
      body: [R.hipPivot.position.x, R.hipPivot.position.y, R.hipPivot.position.z, R.hipPivot.rotation.x, R.hipPivot.rotation.y, R.hipPivot.rotation.z,
        R.footLPivot.position.x, R.footLPivot.position.z, R.footRPivot.position.x, R.footRPivot.position.z, ...R.handLPivot.position.toArray()] });
  }
  setForehandVideo(true);
  return out;
}

test('B53.2: schiacciata, racchetta sulla palla all\'impatto identica a prima e personaggio a terra (in tempo, in anticipo, in ritardo; chi gioca e CPU; destro e mancino)', () => {
  let checked = 0;
  for (const human of [true, false]) for (const timing of ['sweet', 'early', 'late']) for (const lefty of [false, true]){
    const off = smash(false, { timing, human, lefty }), on = smash(true, { timing, human, lefty });
    const tag = `${human ? 'chi gioca' : 'CPU'} ${timing} ${lefty ? 'mancino' : 'destro'}`;
    assert.equal(on[60].side, 'overhead', `${tag}: è una schiacciata`);
    assert.equal(on[45].prep, 'overhead', `${tag}: preparazione della schiacciata`);
    let free = 0;
    for (let f = 50; f < on.length; f++){
      const l = on[f].l;
      assert.equal(l, off[f].l, `${tag}: stessi tempi dello swing`);
      if (l != null && l >= SM.racketFree[0] && l <= SM.racketFree[1]){
        free++; checked++;
        assert.deepEqual(on[f].centre, off[f].centre, `${tag}: cuore delle corde a ${l.toFixed(3)}`);
        assert.deepEqual(on[f].tip, off[f].tip, `${tag}: punta a ${l.toFixed(3)}`);
        assert.deepEqual(on[f].normal, off[f].normal, `${tag}: piatto a ${l.toFixed(3)}`);
        assert.equal(on[f].y, off[f].y, `${tag}: a terra nella zona dell'impatto`);
      }
    }
    assert.ok(free >= 2, `${tag}: fotogrammi nella zona dell'impatto ${free}`);
  }
  assert.ok(checked > 30, `fotogrammi confrontati: ${checked}`);
});

test('B53.2: pose della schiacciata come nel trailer: gambe piegate e di lato nella preparazione, salto dopo l\'impatto, atterraggio con le braccia aperte', () => {
  for (const lefty of [false, true]){
    const off = smash(false, { lefty }), on = smash(true, { lefty });
    assert.ok(off[48].hipH - on[48].hipH > .04, `gambe piegate: bacino più basso di ${(off[48].hipH - on[48].hipH).toFixed(3)}`);
    assert.ok(off[48].hipY - on[48].hipY > .3, `di lato: ${(off[48].hipY - on[48].hipY).toFixed(3)} rad`);
    // salto: comincia dopo la zona libera dell'impatto, alto circa 14 cm, poi di nuovo a terra
    const lift = on.map((r, f) => r.y - off[f].y), top = Math.max(...lift), first = lift.findIndex(v => v > 1e-4);
    assert.ok(top > .12 && top < .15, `salto ${top.toFixed(3)} m`);
    assert.ok(on[first].l == null || on[first].l > SM.racketFree[1], `il salto parte a ${on[first].l} (dopo ${SM.racketFree[1]})`);
    assert.ok(Math.abs(lift.at(-1)) < 1e-9, 'di nuovo a terra');
    // atterraggio: la mano libera verso il punto delle braccia aperte, più che prima
    const fin = on.findIndex((r, f) => f > 50 && r.l != null && r.l > .8), H = SM.hands.finish;
    const d = r => Math.hypot(r.hand[0] - H.x, r.hand[1] - H.y, r.hand[2] - H.z);
    assert.ok(d(on[fin]) < d(off[fin]) - .05, `braccia aperte: ${d(on[fin]).toFixed(3)} (prima ${d(off[fin]).toFixed(3)})`);
  }
});

test('B53.2: raccordi della schiacciata, niente scatti nuovi', () => {
  for (const human of [true, false]) for (const lefty of [false, true]){
    const off = smash(false, { human, lefty, frames: 150 }), on = smash(true, { human, lefty, frames: 150 });
    let prev = null, maxPos = 0, maxRot = 0, maxY = 0;
    for (let f = 0; f < on.length; f++){
      const d = on[f].body.map((x, i) => x - off[f].body[i]);
      if (prev){
        maxPos = Math.max(maxPos, ...[0, 1, 2, 6, 7, 8, 9, 10, 11, 12].map(i => Math.abs(d[i] - prev[i])));
        maxRot = Math.max(maxRot, ...[3, 4, 5].map(i => Math.abs(d[i] - prev[i])));
        maxY = Math.max(maxY, Math.abs((on[f].y - off[f].y) - (on[f - 1].y - off[f - 1].y)));
      }
      prev = d;
    }
    assert.ok(maxPos < .17 && maxRot < .26 && maxY < .02, `${human ? 'chi gioca' : 'CPU'} ${lefty ? 'mancino' : 'destro'}: ${(maxPos*1000).toFixed(0)} mm, ${maxRot.toFixed(3)} rad, salto ${(maxY*1000).toFixed(0)} mm/fotogramma`);
    assert.ok(on.at(-1).body.every((x, i) => Math.abs(x - off.at(-1).body[i]) < 1e-6), 'tornato quello di sempre');
  }
});

/* ---------- B53.3 · volée (a rete) ---------- */
// un colpo a rete (personaggio a 4 m dalla rete): palla dal lato del colpo per 40 fotogrammi, poi lo swing
function atTheNet(on, { side = 'forehand', human = true, lefty = false, timing = 'sweet', frames = 110, z = 4 } = {}){
  setForehandVideo(on);
  const { actor: a, rk } = mount(M, { sideSign: 1, lefty }), L = lefty ? -1 : 1, X = (side === 'forehand' ? 1 : -1)*.9*L;
  a.pos.z = z; a.targetPos.copy(a.pos); a.root.position.copy(a.pos);
  const ball = { inPlay: true, lastHitter: 'opponent', pos: new THREE.Vector3(), vel: new THREE.Vector3(0, 0, 18), targetLanding: new THREE.Vector3(X, 0, z + 2), shotType: 'TOPSPIN' };
  const ctx = { phase: 'RALLY', score: { server: 'player' }, ball, elapsedTime: 10 }, out = [];
  for (let f = 0; f < frames; f++){
    if (f < 40) ball.pos.set(X, 1.1, a.pos.z - 18*(40 - f)*DT - .3);
    else {
      if (f === 40){
        const st = rk.triggerSwing(a, { shotType: 'topspin', side, speed: 1.1, timing, dirX: 0, isPracticeSwing: true });
        if (human) st.swingElapsed = Math.max(st.swingElapsed || 0, .24*st.swingDuration);
      }
      ball.lastHitter = 'player'; ball.pos.set(X*.6, 1.2, a.pos.z - 1 - .35*(f - 40)); ball.vel.set(0, 2, -21);
    }
    ctx.elapsedTime += DT; rk.update(a, DT, ctx); M.body.updatePlayerBodyAnimation(a, DT, ctx);
    const T = a.racketKinematics, c = getRacketRimWorldPoints(a), R = a.rig, S = R.natpfSv, F = R.natpfFv;
    out.push({ l: T.swingActive ? T.swingProgress : null, side: T.swingSide, prep: T.anticipationSide, centre: c.centerWorld.toArray(), tip: c.tipWorld.toArray(), normal: c.normalWorld.toArray(), y: a.root.position.y,
      hipY: R.hipPivot.rotation.y, hipH: R.hipPivot.position.y, fv: F ? F.coil + F.drive + F.finish : 0, sv: S ? Object.fromEntries(SV_KINDS.map(k => [k, S[k].coil + S[k].drive + S[k].finish])) : null,
      body: [R.hipPivot.position.x, R.hipPivot.position.y, R.hipPivot.position.z, R.hipPivot.rotation.x, R.hipPivot.rotation.y, R.hipPivot.rotation.z,
        R.footLPivot.position.x, R.footLPivot.position.z, R.footRPivot.position.x, R.footRPivot.position.z, ...R.handLPivot.position.toArray()] });
  }
  setForehandVideo(true);
  return out;
}

test('B53.3: a rete dritto e rovescio sono volée (pose corte); il dritto del B23 e il rovescio da fondo campo non si applicano', () => {
  const T = o => ({ swingActive: true, isServe: false, swingSide: 'forehand', swingShotType: 'topspin', ...o });
  const net = { pos: { z: 4 } }, base = { pos: { z: 11.4 } }, far = { pos: { z: -5 } };
  assert.equal(svKindOf(T(), net), 'volleyF'); assert.equal(svKindOf(T(), far), 'volleyF', 'anche nell\'altra metà campo');
  assert.equal(svKindOf(T({ swingSide: 'backhand' }), net), 'volleyB');
  assert.equal(svKindOf(T(), base), null, 'da fondo il dritto è quello del B23');
  assert.equal(svKindOf(T({ swingSide: 'backhand' }), base), 'backhand');
  assert.equal(svKindOf(T({ swingSide: 'overhead', swingShotType: 'smash' }), net), 'smash', 'la schiacciata vale ovunque');
  assert.equal(svKindOf(T({ swingShotType: 'slice' }), net), null, 'il tagliato resta quello di sempre');
  for (const side of ['forehand', 'backhand']){
    const on = atTheNet(true, { side }), want = side === 'forehand' ? 'volleyF' : 'volleyB';
    assert.ok(on.every(r => r.fv === 0), `${side}: il dritto del B23 non si applica a rete`);
    assert.ok(on[60].sv[want] > .3 && on.every(r => r.sv.backhand === 0), `${side}: pose della volée, non del rovescio da fondo`);
  }
});

test('B53.3: volée, racchetta sulla palla all\'impatto identica a prima (chi gioca e CPU, destro e mancino, in tempo e in ritardo)', () => {
  let checked = 0;
  for (const side of ['forehand', 'backhand']) for (const human of [true, false]) for (const lefty of [false, true]) for (const timing of ['sweet', 'late']){
    const off = atTheNet(false, { side, human, lefty, timing }), on = atTheNet(true, { side, human, lefty, timing });
    const tag = `${side} ${human ? 'chi gioca' : 'CPU'} ${lefty ? 'mancino' : 'destro'} ${timing}`;
    let free = 0;
    for (let f = 40; f < on.length; f++){
      const l = on[f].l;
      assert.equal(l, off[f].l, `${tag}: stessi tempi`);
      if (l != null && l >= .2 && l <= .46){
        free++; checked++;
        assert.deepEqual(on[f].centre, off[f].centre, `${tag}: corde a ${l.toFixed(3)}`);
        assert.deepEqual(on[f].normal, off[f].normal, `${tag}: piatto a ${l.toFixed(3)}`);
      }
      assert.equal(on[f].y, off[f].y, `${tag}: niente saltello nella volée`);
    }
    assert.ok(free >= 2, `${tag}: ${free} fotogrammi nella zona dell'impatto`);
  }
  assert.ok(checked > 40, `fotogrammi confrontati: ${checked}`);
});

test('B53.3: volée corte (meno rotazione del colpo da fondo, gambe piegate) e niente scatti', () => {
  for (const side of ['forehand', 'backhand']){
    const off = atTheNet(false, { side }), on = atTheNet(true, { side });
    const turn = Math.abs(on[38].hipY - off[38].hipY);
    assert.ok(turn > .1 && turn < .4, `${side}: rotazione della preparazione ${turn.toFixed(3)} rad (da fondo 0,6–0,78)`);
    assert.ok(off[38].hipH - on[38].hipH > .03, `${side}: gambe piegate`);
    for (const human of [true, false]){
      const o0 = atTheNet(false, { side, human, frames: 140 }), o1 = atTheNet(true, { side, human, frames: 140 });
      let prev = null, maxPos = 0, maxRot = 0;
      for (let f = 0; f < o1.length; f++){
        const d = o1[f].body.map((x, i) => x - o0[f].body[i]);
        if (prev){ maxPos = Math.max(maxPos, ...[0, 1, 2, 6, 7, 8, 9, 10, 11, 12].map(i => Math.abs(d[i] - prev[i]))); maxRot = Math.max(maxRot, ...[3, 4, 5].map(i => Math.abs(d[i] - prev[i]))); }
        prev = d;
      }
      assert.ok(maxPos < .17 && maxRot < .26, `${side} ${human ? 'chi gioca' : 'CPU'}: ${(maxPos*1000).toFixed(0)} mm, ${maxRot.toFixed(3)} rad`);
      assert.ok(o1.at(-1).body.every((x, i) => Math.abs(x - o0.at(-1).body[i]) < 1e-6), 'tornato quello di sempre');
    }
  }
});

/* ---------- B53.4 · servizio ---------- */
const SE = SV_STROKES.serve;
// un servizio solo: 30 fotogrammi di attesa con la palla lanciata in alto, poi lo swing del servizio
function serve(on, { timing = 'sweet', human = true, lefty = false, frames = 140 } = {}){
  setForehandVideo(on);
  const { actor: a, rk } = mount(M, { sideSign: 1, lefty });
  const ball = { inPlay: true, lastHitter: null, pos: new THREE.Vector3(), vel: new THREE.Vector3(0, 2, 0), targetLanding: new THREE.Vector3(0, 0, -6), shotType: 'SERVE' };
  const ctx = { phase: 'SERVE', score: { server: 'player' }, ball, elapsedTime: 10 }, out = [];
  for (let f = 0; f < frames; f++){
    if (f < 30) ball.pos.set(.3, 1.6 + .04*f, a.pos.z - .3);
    else {
      if (f === 30){
        const st = rk.triggerSwing(a, { shotType: 'serve', isServe: true, side: 'overhead', speed: 1.2, timing, dirX: 0 });
        if (human) st.swingElapsed = Math.max(st.swingElapsed || 0, .2*st.swingDuration);
      }
      ctx.phase = 'RALLY'; ball.lastHitter = 'player'; ball.pos.set(.3, 2.6, a.pos.z - .3 - .4*(f - 30)); ball.vel.set(0, -2, -30);
    }
    ctx.elapsedTime += DT; rk.update(a, DT, ctx); M.body.updatePlayerBodyAnimation(a, DT, ctx);
    const T = a.racketKinematics, c = getRacketRimWorldPoints(a), R = a.rig;
    out.push({ l: T.swingActive ? T.swingProgress : null, serve: !!(T.swingActive && T.isServe), centre: c.centerWorld.toArray(), tip: c.tipWorld.toArray(), normal: c.normalWorld.toArray(), y: a.root.position.y,
      hipY: R.hipPivot.rotation.y, hipX: R.hipPivot.rotation.x, hipH: R.hipPivot.position.y, hipZ: R.hipPivot.position.z, hand: R.handLPivot.position.toArray(),
      body: [R.hipPivot.position.x, R.hipPivot.position.y, R.hipPivot.position.z, R.hipPivot.rotation.x, R.hipPivot.rotation.y, R.hipPivot.rotation.z,
        R.footLPivot.position.x, R.footLPivot.position.z, R.footRPivot.position.x, R.footRPivot.position.z, ...R.handLPivot.position.toArray()] });
  }
  setForehandVideo(true);
  return out;
}

test('B53.4: servizio, racchetta sulla palla all\'impatto identica a prima e personaggio a terra; attesa e lancio identici (in tempo, anticipo, ritardo; chi gioca e CPU; destro e mancino)', () => {
  let checked = 0;
  for (const human of [true, false]) for (const timing of ['sweet', 'early', 'late']) for (const lefty of [false, true]){
    const off = serve(false, { timing, human, lefty }), on = serve(true, { timing, human, lefty });
    const tag = `${human ? 'chi gioca' : 'CPU'} ${timing} ${lefty ? 'mancino' : 'destro'}`;
    assert.ok(on[40].serve, `${tag}: è un servizio`);
    for (let f = 0; f < 30; f++) assert.deepEqual(on[f].body, off[f].body, `${tag}: attesa e lancio come prima (${f})`);
    let free = 0;
    for (let f = 30; f < on.length; f++){
      const l = on[f].l;
      assert.equal(l, off[f].l, `${tag}: stessi tempi dello swing`);
      if (l != null && l >= SE.racketFree[0] && l <= SE.racketFree[1]){
        free++; checked++;
        assert.deepEqual(on[f].centre, off[f].centre, `${tag}: cuore delle corde a ${l.toFixed(3)}`);
        assert.deepEqual(on[f].tip, off[f].tip, `${tag}: punta a ${l.toFixed(3)}`);
        assert.deepEqual(on[f].normal, off[f].normal, `${tag}: piatto a ${l.toFixed(3)}`);
        assert.equal(on[f].y, off[f].y, `${tag}: a terra nella zona dell'impatto`);
      }
    }
    assert.ok(free >= 2, `${tag}: fotogrammi nella zona dell'impatto ${free}`);
  }
  assert.ok(checked > 30, `fotogrammi confrontati: ${checked}`);
});

test('B53.4: pose del servizio: corpo in avanti all\'impatto, peso che passa nel finale, saltello dopo la zona libera e di nuovo a terra; niente scatti', () => {
  for (const human of [true, false]) for (const lefty of [false, true]){
    const off = serve(false, { human, lefty }), on = serve(true, { human, lefty });
    const tag = `${human ? 'chi gioca' : 'CPU'} ${lefty ? 'mancino' : 'destro'}`;
    const early = on.findIndex(r => r.l != null && r.l > .1), fin = on.findIndex(r => r.l != null && r.l > .75);
    // (lo swing del servizio dura 0,35 s e il motore lo fa partire già verso il 18 %: dentro lo swing non c'è tempo per
    // piegare le gambe, che starebbe nel lancio, lasciato quello di sempre. Si vede all'impatto e dopo)
    const hit = on.findIndex(r => r.l != null && r.l >= SE.contact);
    assert.ok(on[hit].hipX - off[hit].hipX > .04, `${tag}: corpo in avanti all'impatto (${(on[hit].hipX - off[hit].hipX).toFixed(3)} rad)`);
    assert.ok(on[fin].hipZ - off[fin].hipZ > .04 || off[fin].hipZ - on[fin].hipZ > .04, `${tag}: peso che passa nel finale`);
    const lift = on.map((r, f) => r.y - off[f].y), top = Math.max(...lift), first = lift.findIndex(v => v > 1e-4);
    assert.ok(top > .05 && top < .08, `${tag}: saltello ${top.toFixed(3)} m`);
    assert.ok(on[first].l == null || on[first].l > SE.racketFree[1], `${tag}: il saltello parte a ${on[first].l}`);
    assert.ok(Math.abs(lift.at(-1)) < 1e-9, `${tag}: di nuovo a terra`);
    let prev = null, maxPos = 0, maxRot = 0, maxY = 0;
    for (let f = 0; f < on.length; f++){
      const d = on[f].body.map((x, i) => x - off[f].body[i]);
      if (prev){
        maxPos = Math.max(maxPos, ...[0, 1, 2, 6, 7, 8, 9, 10, 11, 12].map(i => Math.abs(d[i] - prev[i])));
        maxRot = Math.max(maxRot, ...[3, 4, 5].map(i => Math.abs(d[i] - prev[i])));
        maxY = Math.max(maxY, Math.abs((on[f].y - off[f].y) - (on[f - 1].y - off[f - 1].y)));
      }
      prev = d;
    }
    assert.ok(maxPos < .17 && maxRot < .26 && maxY < .02, `${tag}: ${(maxPos*1000).toFixed(0)} mm, ${maxRot.toFixed(3)} rad, salto ${(maxY*1000).toFixed(0)} mm/fotogramma`);
    assert.ok(on.at(-1).body.every((x, i) => Math.abs(x - off.at(-1).body[i]) < 1e-6), `${tag}: tornato quello di sempre`);
  }
});
