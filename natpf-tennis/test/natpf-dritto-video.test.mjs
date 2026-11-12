// B23 · PROVA «Dritto come nel video» (src/natpf/natpf_forehand_video.js): interruttore, pose chiave, raccordi, destro e
// mancino, racchetta sulla palla all'impatto (in tempo, in anticipo, in ritardo; chi gioca e CPU), e soprattutto: con la
// prova spenta le ossa sono quelle di 9b8f9cb fotogramma per fotogramma (scripts/audit/b23/ossa.mjs e il suo file di
// impronte fatto sui sorgenti di quel commit).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { load, sequenza, impronta, mount, bones, BONE_NAMES, PERSONAGGI, TRATTI, FRAMES, GOLDEN, DT } from '../scripts/audit/b23/ossa.mjs';
import * as FVM from '../src/natpf/natpf_forehand_video.js';
import { getRacketRimWorldPoints } from '../src/racket_kinematics.js';

const { FV, FV_POSE, FV_RACKET, FV_KEY, fvTargets, fvRacketFinish, fvRacketPrep, fvHop, fvIsForehand, setForehandVideo, forehandVideoEnabled, readForehandVideo, writeForehandVideo, forehandVideoParam } = FVM;
const M = await load();
const G = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
const tratto = name => TRATTI.find(t => t[0].startsWith(name));
const idx = n => BONE_NAMES.indexOf(n)*10;
// sequenza con la prova accesa o spenta; per ogni fotogramma anche lo stato dello swing e il cuore delle corde
function run(on, who = 'destro'){
  setForehandVideo(on);
  const extra = [];
  const rec = sequenza(M, { ...PERSONAGGI[who], onFrame: (f, a) => {
    const T = a.racketKinematics, c = getRacketRimWorldPoints(a), S = a.rig.natpfFv;
    extra.push({ sw: !!T.swingActive, l: T.swingProgress, side: T.swingSide, shot: T.swingShotType, centre: c.centerWorld.toArray(), tip: c.tipWorld.toArray(), fv: S ? { ...S } : null, state: S,
      twist: a.rig.spineTwistY, rootY: a.root.position.y, hop: a.rig.verticalHopOffset });
  } });
  setForehandVideo(true);
  return { rec, extra };
}
const storage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

test('interruttore: di base Sì, salvato con la chiave natpf-tennis.drittoVideo, ?dritto=video|prima vale più della scelta salvata', () => {
  assert.equal(FV_KEY, 'natpf-tennis.drittoVideo');
  const st = storage();
  assert.equal(readForehandVideo({ storage: st, search: '' }), true, 'niente di salvato: accesa');
  assert.equal(writeForehandVideo(false, { storage: st }), false); assert.equal(st.getItem(FV_KEY), '0');
  assert.equal(readForehandVideo({ storage: st, search: '' }), false);
  assert.equal(readForehandVideo({ storage: st, search: '?intro=0&dritto=video' }), true, 'il parametro vince');
  assert.equal(st.getItem(FV_KEY), '0', 'e non cambia la scelta salvata');
  writeForehandVideo(true, { storage: st }); assert.equal(st.getItem(FV_KEY), '1');
  assert.equal(readForehandVideo({ storage: st, search: '?dritto=prima' }), false);
  assert.equal(forehandVideoParam('?dritto=altro'), null); assert.equal(forehandVideoParam(''), null); assert.equal(forehandVideoParam(undefined), null);
  assert.equal(readForehandVideo({ storage: { getItem(){ throw new Error('bloccato'); } }, search: '' }), true, 'archivio bloccato: accesa');
  assert.equal(readForehandVideo({ storage: null, search: null }), true);
  assert.equal(setForehandVideo(false), false); assert.equal(forehandVideoEnabled(), false);
  assert.equal(setForehandVideo(1), true); assert.equal(forehandVideoEnabled(), true);
  assert.match(FVM.forehandVideoToast(true), /acceso/); assert.match(FVM.forehandVideoToast(false), /quello di prima/);
});

test('spenta: le ossa sono quelle di 9b8f9cb, fotogramma per fotogramma, per destro, mancino e avversario', () => {
  assert.equal(G.commit, '9b8f9cb'); assert.equal(G.fotogrammi, FRAMES);
  for (const who of Object.keys(PERSONAGGI)){
    const prints = run(false, who).rec.map(impronta);
    assert.equal(prints.length, FRAMES);
    const diff = prints.map((h, i) => (h === G.impronte[who][i] ? -1 : i)).filter(i => i >= 0);
    assert.deepEqual(diff, [], `${who}: fotogrammi diversi da 9b8f9cb`);
  }
});

test('accesa: cambia solo attorno al dritto (preparazione, colpo, finale); attesa, rovescio, servizio ed esultanza restano di 9b8f9cb', () => {
  for (const who of Object.keys(PERSONAGGI)){
    const prints = run(true, who).rec.map(impronta), same = (a, b) => { for (let f = a; f < b; f++) assert.equal(prints[f], G.impronte[who][f], `${who}, fotogramma ${f}`); };
    const changed = (a, b) => { let n = 0; for (let f = a; f < b; f++) if (prints[f] !== G.impronte[who][f]) n++; return n; };
    same(...tratto('attesa').slice(1));
    same(...tratto('palla sul rovescio').slice(1)); same(...tratto('rovescio intero').slice(1));
    same(...tratto('servizio: attesa').slice(1)); same(...tratto('servizio: colpo').slice(1)); same(...tratto('fine punto').slice(1));
    assert.equal(changed(...tratto('dritto dall').slice(1)), 22, 'il dritto di chi gioca cambia in ogni fotogramma');
    assert.equal(changed(...tratto('dritto piatto').slice(1)), 40, 'anche il dritto piatto intero (come lo fa la CPU)');
    assert.ok(changed(...tratto('palla sul dritto, fermo').slice(1)) >= 25, 'la preparazione cambia');
    // il finale si scioglie: prima che arrivi la palla dopo, il personaggio è tornato quello di sempre
    same(160, 170);
  }
});

test('lo stato dell\'animazione di sempre non viene toccato: spegnere a metà riporta subito alle ossa di 9b8f9cb', () => {
  setForehandVideo(true);
  const prints = sequenza(M, { onFrame: f => { if (f === 95) setForehandVideo(false); if (f === 255) setForehandVideo(true); } }).map(impronta);
  setForehandVideo(true);
  for (let f = 96; f <= 255; f++) assert.equal(prints[f], G.impronte.destro[f], `fotogramma ${f}`);   // dal fotogramma dopo lo spegnimento
  assert.notEqual(prints[94], G.impronte.destro[94]); assert.notEqual(prints[270], G.impronte.destro[270]);
});

test('è un dritto della prova: topspin e piatto dal lato del dritto; non rovescio, tagliato, pallonetto, schiacciata, servizio', () => {
  const T = (o = {}) => ({ swingActive: true, swingSide: 'forehand', swingShotType: 'topspin', isServe: false, ...o });
  assert.ok(fvIsForehand(T())); assert.ok(fvIsForehand(T({ swingShotType: 'flat' })));
  for (const o of [{ swingActive: false }, { swingSide: 'backhand' }, { swingSide: 'overhead' }, { swingShotType: 'slice' }, { swingShotType: 'lob' }, { swingShotType: 'smash' }, { isServe: true }])
    assert.equal(fvIsForehand(T(o)), false, JSON.stringify(o));
  assert.equal(fvIsForehand(null), false);
});

test('pesi delle pose: preparazione dalla carica, impatto a 0,34, finale che resta e poi si scioglie', () => {
  const t = (c, l, a) => fvTargets({}, c, l, a);
  assert.deepEqual(t(0, null, null), { coil: 0, drive: 0, finish: 0 });
  assert.equal(t(1, null, null).coil, 1); assert.ok(t(.25, null, null).coil > .4, 'girati presto, come nel trailer');
  assert.ok(t(.1, null, null).coil < t(.3, null, null).coil);
  // swing intero (CPU, moviola): prima si carica, poi impatto, poi finale
  assert.equal(t(0, 0, null).coil, 1); assert.equal(t(0, 0, null).drive, 0); assert.equal(t(0, 0, null).finish, 0);
  const hit = t(0, FV.contact, null);
  assert.equal(hit.coil, 0); assert.equal(hit.drive, 1); assert.equal(hit.finish, 0);
  const end = t(0, .8, null);
  assert.equal(end.coil, 0); assert.equal(end.drive, 0); assert.equal(end.finish, 1);
  // dopo lo swing: il finale resta FV.hold secondi, poi si scioglie in FV.release
  assert.equal(t(0, null, 0).finish, 1); assert.equal(t(0, null, FV.hold).finish, 1);
  assert.ok(t(0, null, FV.hold + FV.release/2).finish > .4 && t(0, null, FV.hold + FV.release/2).finish < .6);
  assert.equal(t(0, null, FV.hold + FV.release).finish, 0);
  // pose chiave lette dal trailer: busto girato verso la racchetta e peso dietro, poi avanti, poi busto passato e in punta di piedi
  assert.ok(FV_POSE.coil.tw < -.4 && FV_POSE.coil.hy < 0 && FV_POSE.coil.hz < 0 && FV_POSE.coil.bz < -.1 && FV_POSE.coil.lx < 0, 'preparazione');
  assert.ok(FV_POSE.drive.hz > .05 && FV_POSE.drive.brx > .4 && FV_POSE.drive.by > 0, 'impatto: peso avanti, tallone dietro alzato');
  assert.ok(FV_POSE.finish.tw > .25 && FV_POSE.finish.hy > 0 && FV_POSE.finish.lx > .4 && FV_POSE.finish.lz < 0 && FV_RACKET.fin.x > .3 && FV_RACKET.fin.y > 1.3, 'finale');
});

test('racchetta: nella zona dell\'impatto il modulo non la tocca mai; preparazione e finale stanno fuori', () => {
  const [a, b] = FV.racketFree;
  assert.ok(a <= .24 && a < FV.contact && FV.contact < b, 'la zona libera contiene la partenza di chi gioca (0,24) e l\'impatto (0,34)');
  for (let l = a; l <= b + 1e-9; l += .01){ assert.equal(fvRacketPrep(l, 1), 0, `preparazione a ${l}`); assert.equal(fvRacketFinish(l, null), 0, `finale a ${l}`); }
  assert.equal(fvRacketPrep(0, .8), .8); assert.ok(fvRacketPrep(.1, 1) > 0 && fvRacketPrep(.1, 1) < 1);
  assert.equal(fvRacketFinish(.74, null), 1); assert.equal(fvRacketFinish(1, null), 1);
  // raccordo alla fine dello swing: stesso peso un istante prima e un istante dopo, poi a zero
  assert.equal(fvRacketFinish(null, 0), 1); assert.equal(fvRacketFinish(null, FV.hold + FV.release), 0); assert.equal(fvRacketFinish(null, null), 0);
  // saltello: parte e arriva a zero, punto più alto a metà
  assert.equal(fvHop(0), 0); assert.equal(fvHop(FV.hop.from), 0); assert.equal(fvHop(FV.hop.from + FV.hop.len), 0);
  assert.ok(Math.abs(fvHop(FV.hop.from + FV.hop.len/2) - FV.hop.up) < 1e-12);
  assert.ok(FV.hop.from/.22 + FV.contact > b, 'anche con lo swing più lungo (0,44 s) il saltello parte dopo la zona libera… ');
  assert.ok(FV.contact + FV.hop.from/.44 > b, '…e con il più lungo');
});

test('racchetta sulla palla all\'impatto: identica a prima per il colpo in tempo, in anticipo e in ritardo, per chi gioca e per la CPU, destro e mancino', () => {
  // un colpo solo: preparazione (charge) fotogrammi, poi lo swing; chi gioca parte dall'impatto (swingFromContact)
  const stroke = (on, { timing, human, lefty, speed = 1.18, shot = 'topspin' }) => {
    setForehandVideo(on);
    const { actor: a, rk } = mount(M, { sideSign: 1, lefty }), L = lefty ? -1 : 1;
    const ball = { inPlay: true, lastHitter: 'opponent', pos: new THREE.Vector3(), vel: new THREE.Vector3(0, 0, 14), targetLanding: new THREE.Vector3(1.1*L, 0, 9), shotType: 'TOPSPIN' };
    const ctx = { phase: 'RALLY', score: { server: 'player' }, ball, elapsedTime: 10 }, out = [];
    for (let f = 0; f < 110; f++){
      if (f < 50){ ball.pos.set(1.1*L, 1, a.pos.z - 14*(50 - f)*DT - .4); }
      else {
        if (f === 50){
          const st = rk.triggerSwing(a, { shotType: shot, side: 'forehand', speed, timing, dirX: 0 });
          if (human) st.swingElapsed = Math.max(st.swingElapsed || 0, .24*st.swingDuration);
        }
        ball.lastHitter = 'player'; ball.pos.set(.6*L, 1.2, a.pos.z - 1 - .35*(f - 50)); ball.vel.set(0, 2, -21);
      }
      ctx.elapsedTime += DT; rk.update(a, DT, ctx); M.body.updatePlayerBodyAnimation(a, DT, ctx);
      const T = a.racketKinematics, c = getRacketRimWorldPoints(a);
      out.push({ l: T.swingActive ? T.swingProgress : null, centre: c.centerWorld.toArray(), tip: c.tipWorld.toArray(), normal: c.normalWorld.toArray(), y: a.root.position.y });
    }
    setForehandVideo(true);
    return out;
  };
  let checked = 0;
  for (const human of [true, false]) for (const timing of ['sweet', 'early', 'late']) for (const lefty of [false, true]) for (const [speed, shot] of [[1.18, 'topspin'], [1.8, 'flat'], [.8, 'topspin']]){
    const off = stroke(false, { timing, human, lefty, speed, shot }), on = stroke(true, { timing, human, lefty, speed, shot });
    const tag = `${human ? 'chi gioca' : 'CPU'} ${timing} ${lefty ? 'mancino' : 'destro'} ${shot} ${speed}`;
    // primo fotogramma dello swing di chi gioca: già nella zona libera
    if (human) assert.ok(on[50].l >= FV.racketFree[0] && on[50].l < FV.contact, `${tag}: parte a ${on[50].l}`);
    let free = 0, moved = 0;
    for (let f = 50; f < 110; f++){
      const l = on[f].l;
      assert.equal(l, off[f].l, `${tag}: stessi tempi dello swing`);
      if (l != null && l >= FV.racketFree[0] && l <= FV.racketFree[1]){
        free++; checked++;
        assert.deepEqual(on[f].centre, off[f].centre, `${tag}: cuore delle corde a ${l.toFixed(3)}`);
        assert.deepEqual(on[f].tip, off[f].tip, `${tag}: punta a ${l.toFixed(3)}`);
        assert.deepEqual(on[f].normal, off[f].normal, `${tag}: piatto a ${l.toFixed(3)}`);
        assert.equal(on[f].y, off[f].y, `${tag}: personaggio a terra come prima`);
      } else if (Math.hypot(...on[f].centre.map((x, i) => x - off[f].centre[i])) > .05) moved++;
    }
    assert.ok(free >= 2, `${tag}: fotogrammi nella zona dell'impatto ${free}`);   // lo swing più corto dura 13 fotogrammi
    assert.ok(moved >= 5, `${tag}: fuori dalla zona la racchetta fa il finale nuovo (${moved} fotogrammi)`);
    // prima dello swing la racchetta è più alta (preparazione del trailer)
    assert.ok(on[49].centre[1] > off[49].centre[1] + .15, `${tag}: preparazione alta`);
  }
  assert.ok(checked > 100, `fotogrammi confrontati nella zona dell'impatto: ${checked}`);
});

test('uno swing di un altro colpo dopo la preparazione del dritto ritrova subito la racchetta di sempre (rovescio, tagliato, schiacciata)', () => {
  const stroke = (on, opts) => {
    setForehandVideo(on);
    const { actor: a, rk } = mount(M, {});
    const ball = { inPlay: true, lastHitter: 'opponent', pos: new THREE.Vector3(), vel: new THREE.Vector3(0, 0, 14), targetLanding: new THREE.Vector3(1.1, 0, 9), shotType: 'TOPSPIN' };
    const ctx = { phase: 'RALLY', score: { server: 'player' }, ball, elapsedTime: 10 }, out = [];
    for (let f = 0; f < 80; f++){
      if (f < 50) ball.pos.set(1.1, 1, a.pos.z - 14*(50 - f)*DT - .4);
      else { if (f === 50){ const st = rk.triggerSwing(a, opts); st.swingElapsed = Math.max(st.swingElapsed || 0, .24*st.swingDuration); } ball.lastHitter = 'player'; ball.pos.set(.6, 1.2, a.pos.z - 2 - .35*(f - 50)); ball.vel.set(0, 2, -21); }
      ctx.elapsedTime += DT; rk.update(a, DT, ctx); M.body.updatePlayerBodyAnimation(a, DT, ctx);
      out.push([...a.racketPivot.position.toArray(), a.racketPivot.rotation.x, a.racketPivot.rotation.y, a.racketPivot.rotation.z, a.root.position.y]);
    }
    setForehandVideo(true);
    return out;
  };
  // (isPracticeSwing: il lato resta quello chiesto; in partita con la palla sul dritto il motore lo riporterebbe a dritto)
  for (const opts of [{ shotType: 'topspin', side: 'backhand', isPracticeSwing: true }, { shotType: 'slice', side: 'forehand' }, { shotType: 'lob', side: 'forehand' }, { shotType: 'smash', side: 'overhead' }]){
    const off = stroke(false, opts), on = stroke(true, opts);
    assert.notDeepEqual(on[49], off[49], 'la preparazione del dritto c\'era');
    for (let f = 50; f < 80; f++) assert.deepEqual(on[f], off[f], `${opts.shotType} ${opts.side}: fotogramma ${f}`);
  }
});

test('pose in campo: preparazione girata con il peso dietro e la testa sulla palla, finale sopra la spalla opposta, saltello di recupero', () => {
  const off = run(false), on = run(true), d = (R, f, bone, k) => R.rec[f][idx(bone) + k];
  const yaw = (R, f, bone) => { const o = idx(bone); return new THREE.Euler().setFromQuaternion(new THREE.Quaternion(R.rec[f][o + 3], R.rec[f][o + 4], R.rec[f][o + 5], R.rec[f][o + 6]), 'YXZ').y; };
  // caricamento: ultimo fotogramma prima del colpo
  const f = 89;
  assert.ok(on.extra[f].fv.coil > .95, `preparazione piena (${on.extra[f].fv.coil})`);
  assert.ok(yaw(on, f, 'bacino') < yaw(off, f, 'bacino') - .5, 'busto più girato verso la racchetta');
  assert.ok(yaw(on, f, 'bacino') < -.85, `rotazione del busto ${yaw(on, f, 'bacino').toFixed(2)} rad`);
  assert.ok(d(on, f, 'bacino', 1) < d(off, f, 'bacino', 1) - .04 && d(on, f, 'bacino', 2) < d(off, f, 'bacino', 2) - .03, 'bacino più basso e indietro: peso sulla gamba dietro');
  assert.ok(d(on, f, 'piedeDietro', 2) < d(off, f, 'piedeDietro', 2) - .1 && d(on, f, 'piedeDavanti', 2) > d(off, f, 'piedeDavanti', 2) + .08, 'appoggio largo: piede dietro indietro, piede davanti avanti');
  assert.ok(d(on, f, 'manoLibera', 0) < d(off, f, 'manoLibera', 0) - .15, 'mano libera verso la racchetta');
  assert.ok(d(on, f, 'racchetta', 1) > d(off, f, 'racchetta', 1) + .25, 'racchetta alta');
  // la testa resta sulla palla: lo sguardo (bacino + collo) cambia poco anche se il busto gira di più
  const look = R => yaw(R, f, 'bacino') + yaw(R, f, 'collo');
  assert.ok(Math.abs(look(on) - look(off)) < .2, `sguardo ${look(on).toFixed(2)} contro ${look(off).toFixed(2)} rad`);
  // finale: a swing finito la racchetta è alla spalla opposta, il braccio libero aperto dietro, il busto passato
  const end = on.extra.findIndex((e, i) => i > 90 && !e.sw), g = end + 2;
  assert.ok(end > 100 && end < 115, `fine dello swing al fotogramma ${end}`);
  assert.ok(Math.abs(d(on, g, 'racchetta', 0) - FV_RACKET.fin.x) < .03 && Math.abs(d(on, g, 'racchetta', 1) - FV_RACKET.fin.y) < .05, 'racchetta ferma sopra la spalla opposta');
  assert.ok(d(off, g, 'racchetta', 0) < 0, 'prima a questo punto era già tornata davanti');
  assert.ok(d(on, g, 'manoLibera', 0) > d(off, g, 'manoLibera', 0) + .1 && d(on, g, 'manoLibera', 2) < d(off, g, 'manoLibera', 2) - .1, 'braccio libero aperto all\'indietro');
  assert.ok(yaw(on, g, 'bacino') > yaw(off, g, 'bacino') + .2, 'busto passato');
  // saltello di recupero: il personaggio si stacca da terra e torna giù (con la corsa i piedi restano quelli della corsa)
  const still = (() => { setForehandVideo(true); const { actor: a, rk } = mount(M, {}); const ctx = { phase: 'RALLY', score: { server: 'player' }, ball: null, elapsedTime: 5 }; const ys = [];
    for (let i = 0; i < 70; i++){ if (i === 5) rk.triggerSwing(a, { shotType: 'topspin', side: 'forehand', speed: 1.18 }); ctx.elapsedTime += DT; rk.update(a, DT, ctx); M.body.updatePlayerBodyAnimation(a, DT, ctx); ys.push(a.rig.natpfFv.hop); }
    return ys; })();
  const top = Math.max(...still);
  assert.ok(top > .04 && top <= FV.hop.up + 1e-9, `saltello di ${(top*100).toFixed(1)} cm`);
  assert.ok(still.at(-1) < 1e-3 && still[10] === 0, 'parte da terra e torna a terra');
});

test('raccordi: le pose in più entrano ed escono piano (attesa, corsa), il colpo resta entro i limiti; niente scatti nuovi', () => {
  for (const who of Object.keys(PERSONAGGI)){
    const off = run(false, who), on = run(true, who);
    // quello che la prova aggiunge = differenza tra acceso e spento (lo stato di base è lo stesso): la sua variazione tra
    // due fotogrammi, per posizione (unità del modello) e per rotazione (rad)
    const step = (bone, f) => {
      const o = idx(bone), D = g => on.rec[g].slice(o, o + 7).map((x, i) => x - off.rec[g][o + i]), a = D(f - 1), b = D(f);
      return { pos: Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), rot: 2*Math.hypot(b[3] - a[3], b[4] - a[4], b[5] - a[5], b[6] - a[6]) };
    };
    const max = (bone, a, b) => { let pos = 0, rot = 0; for (let f = Math.max(1, a); f < b; f++){ const s = step(bone, f); pos = Math.max(pos, s.pos); rot = Math.max(rot, s.rot); } return { pos, rot }; };
    const BODY = ['bacino', 'collo', 'piedeDietro', 'piedeDavanti', 'manoLibera'];
    // limiti per fotogramma (posizione in unità del modello, rotazione in rad) di quello che la prova aggiunge:
    // entrata = la palla arriva (dall'attesa e dalla corsa alla preparazione, anche con il gesto in anticipo che carica
    // subito), colpo = dall'impatto alla fine dello swing, uscita = il finale si scioglie mentre si torna al centro
    const LIMITI = { entrata: [30, 90, .05, .08], colpo: [90, 112, .17, .26], uscita: [112, 170, .05, .06] };
    for (const bone of BODY) for (const [name, [f0, f1, pos, rot]] of Object.entries(LIMITI)){
      const m = max(bone, f0, f1);
      if (process.env.B23_MISURE) console.log(who, bone, name, m.pos.toFixed(4), m.rot.toFixed(3));
      assert.ok(m.pos < pos && m.rot < rot, `${who} ${bone}: ${name} ${m.pos.toFixed(4)} / ${m.rot.toFixed(3)} per fotogramma (limiti ${pos} / ${rot})`);
    }
    // il saltello: mai più di 1,2 cm tra due fotogrammi
    for (let f = 1; f < FRAMES; f++) assert.ok(Math.abs((on.extra[f].rootY - off.extra[f].rootY) - (on.extra[f - 1].rootY - off.extra[f - 1].rootY)) < .012, `${who}: saltello al fotogramma ${f}`);
    // racchetta (il suo movimento vero, non la differenza: nel finale tenuto è la racchetta di prima che si muove sotto):
    // nella preparazione e dal fotogramma dopo l'impatto in poi non fa passi molto più lunghi di prima
    const real = (R, a, b) => {
      let pos = 0, rot = 0; const o = idx('racchetta');
      for (let f = a; f < b; f++){
        const A = R.rec[f - 1], B = R.rec[f];
        pos = Math.max(pos, Math.hypot(B[o] - A[o], B[o + 1] - A[o + 1], B[o + 2] - A[o + 2]));
        rot = Math.max(rot, 2*Math.acos(Math.min(1, Math.abs(A[o + 3]*B[o + 3] + A[o + 4]*B[o + 4] + A[o + 5]*B[o + 5] + A[o + 6]*B[o + 6]))));
      }
      return { pos, rot };
    };
    const p0 = real(off, 31, 90), p1 = real(on, 31, 90), s0 = real(off, 91, 170), s1 = real(on, 91, 170);
    if (process.env.B23_MISURE) console.log(who, 'racchetta: preparazione', JSON.stringify([p0, p1]), 'dopo l\'impatto', JSON.stringify([s0, s1]));
    assert.ok(p1.pos < p0.pos + .04 && p1.rot < p0.rot + .08, `${who} racchetta: preparazione ${p1.pos.toFixed(4)} / ${p1.rot.toFixed(3)} (prima ${p0.pos.toFixed(4)} / ${p0.rot.toFixed(3)})`);
    assert.ok(s1.pos < s0.pos + .03 && s1.rot < s0.rot + .08, `${who} racchetta: dopo l'impatto ${s1.pos.toFixed(4)} / ${s1.rot.toFixed(3)} (prima ${s0.pos.toFixed(4)} / ${s0.rot.toFixed(3)})`);
    // lo scatto più grande della racchetta resta quello di prima (la partenza dello swing dall'impatto), non uno nuovo
    const jump = R => { let m = 0; const o = idx('racchetta'); for (let f = 1; f < FRAMES; f++) m = Math.max(m, Math.hypot(R.rec[f][o] - R.rec[f - 1][o], R.rec[f][o + 1] - R.rec[f - 1][o + 1], R.rec[f][o + 2] - R.rec[f - 1][o + 2])); return m; };
    assert.ok(jump(on) <= jump(off) + .02, `${who}: scatto massimo della racchetta ${jump(on).toFixed(3)} contro ${jump(off).toFixed(3)} di prima`);
  }
});

test('destro e mancino: stesse pose nel riferimento del personaggio (il mancino è lo specchio); l\'avversario come chi gioca', () => {
  const r = run(true, 'destro'), l = run(true, 'mancino'), o = run(true, 'avversario');
  const root = idx('radice');
  for (let f = 0; f < FRAMES; f++) for (let k = 0; k < r.rec[f].length; k++){
    if (k >= root) continue;                       // la radice sta in campo: posizione specchiata, scala x = -1
    assert.ok(Math.abs(r.rec[f][k] - l.rec[f][k]) < 1e-9, `mancino: fotogramma ${f}, valore ${k}: ${r.rec[f][k]} contro ${l.rec[f][k]}`);
  }
  for (let f = 0; f < FRAMES; f++){ assert.ok(Math.abs(r.rec[f][root] + l.rec[f][root]) < 1e-9, 'in campo il mancino sta dalla parte opposta'); assert.equal(l.rec[f][root + 7], -1); }
  // avversario: stessi pesi delle pose negli stessi fotogrammi
  for (let f = 0; f < FRAMES; f++) for (const k of ['coil', 'drive', 'finish', 'hop', 'rPrep', 'rFin']) assert.ok(Math.abs((r.extra[f].fv?.[k] || 0) - (o.extra[f].fv?.[k] || 0)) < 1e-9, `avversario: ${k} al fotogramma ${f}`);
  assert.ok(Math.max(...o.extra.map(e => e.fv?.coil || 0)) > .95 && Math.max(...o.extra.map(e => e.fv?.finish || 0)) > .95);
});

test('prestazioni: uno stato per personaggio creato una volta, nessun campo nuovo a ogni fotogramma', () => {
  setForehandVideo(true);
  const seen = new Set(); let keys = null;
  sequenza(M, { onFrame: (f, a) => { const S = a.rig.natpfFv; if (!S) return; seen.add(S); const k = Object.keys(S).join(); keys ??= k; assert.equal(k, keys); } });
  assert.equal(seen.size, 1);
  // spenta dall'inizio: nemmeno lo stato viene creato
  setForehandVideo(false);
  let any = false; sequenza(M, { onFrame: (f, a) => { any ||= !!a.rig.natpfFv; } });
  setForehandVideo(true);
  assert.equal(any, false);
});
