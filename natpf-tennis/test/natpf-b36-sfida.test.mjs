// B36.1 «La cima comanda (interna)» (docs/b73/direzione-b36-1.md), con l'interfaccia vera sul motore senza disegno
// (ui-world.mjs: sostituisce variabili globali, per questo è un file a sé):
//   - sfida tra due computer: l'host manda la direzione dei colpi nello snapshot (campo dir) e il computer del P2 la usa per
//     la previsione locale del suo colpo; un host di prima (senza il campo) lascia «Classica», la regola di oggi;
//   - pannello dello stand: la voce «Direzione dei colpi» passa da «Classica» a «Nuova · in lavorazione» e ritorno, resta
//     salvata e non la toccano il chiosco né «Nuovo giocatore».
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, fetches, $ } from './ui-world.mjs';
import { DIR_KEY } from '../src/natpf/natpf_direction.js';
import { faceAimFromDev } from '../src/natpf/natpf_stroke_intent.js';
import { RegistroStand } from '../src/natpf/registro/registro_registratore.js';
import { codaMemoria } from '../src/natpf/registro/registro_coda.js';
import { DiagRecorder } from '../src/natpf/diag/diag_recorder.js';
import { memoryStore } from '../src/natpf/diag/diag_store.js';
import { Riassunto } from '../scripts/registro/riassunto.mjs';

const snapshots = since => fetches.slice(since).filter(f => String(f.url).includes('/api/match/sync')).map(f => JSON.parse(f.body).snapshot);

// host della sfida: stanza creata, P2 pronto, partita avviata; saved: direzione salvata dallo staff (null: niente di salvato)
async function hostMatch(saved){
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  if (saved != null) localStorage.setItem(DIR_KEY, saved);
  const { E, lobby, hud } = w;
  lobby.menu('play'); hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('match'); w.advance(300);
  E._handleRoomStateUpdate({ p2Online: true, p2Ready: true }); w.advance(200);
  w.pressStart(); w.advance(300); if (w.ui.training?.active) w.ui.training.skip(); w.advance(300);
  assert.ok(E._versusInMatch(), `fase ${E.phase}`);
  const since = fetches.length; w.advance(600);
  return { E, match: snapshots(since).filter(s => !s.lobby && !s.paused && s.phase) };
}

test('B36.1, sfida tra due computer: l’host manda la direzione dei colpi nello snapshot della partita', async () => {
  for (const [saved, dir] of [[null, 'classica'], ['nuova', 'nuova'], ['classica', 'classica']]){
    const { E, match } = await hostMatch(saved);
    assert.equal(E.natpfDirModel, dir, `salvata ${saved}: direzione dell'host`);
    assert.ok(match.length && match.every(s => s.dir === dir), `salvata ${saved}: ${JSON.stringify(match.map(s => s.dir))}`);
  }
});

// colpo del telefono con la forma, scarto della cima dev (gradi)
const colpoTel = dev => ({ source: 'natpf-phone', side: 'forehand', shotType: 'topspin', speed: 1.2, dirX: 0, timing: null, role: 'p2',
  natpf: { aim: 'swing', shot: 'topspin', power: .5, latency: 0, hand: 'right', aimDev: dev, peak: 800, typical: 780, aimFull: 17,
    intent: { shot: 'topspin', power: .5, typePower: .5, depth: .5, rise: .3, face: faceAimFromDev(dev), conf: 1 } } });

test('B36.1, computer del P2: vale la direzione dell’host (anche con «Nuova» salvata qui), e la previsione del colpo del P2 la usa', async () => {
  const w = await makeWorld({ controller: 'mouse', role: 'p2' }); w.advance(300);
  const { E } = w;
  localStorage.setItem(DIR_KEY, 'nuova');                         // sul computer del P2 lo staff aveva scelto «Nuova»
  E.startNewMatch({ showStartBanner: false });
  assert.equal(E.natpfDirModel, 'classica', 'fino allo snapshot dell’host vale «Classica», la regola di un host di prima');
  let seq = 0;
  const snap = (extra = {}) => { E._handleRoomStateUpdate({ p1Online: true, hostName: 'Ada', epoch: 'x', snapshotSeq: ++seq,
    snapshot: { phase: 'RALLY', phaseTimer: 1, score: { ...E.score }, ball: { px: 0, py: 1.4, pz: 0, vx: 0, vy: 3, vz: -4, inPlay: true, lastHitter: 'player', shotType: 'TOPSPIN', rallyStrokeCount: 3 }, ...extra } }); w.advance(50); };
  E.autoPlayMode = false;
  snap({ dir: 'nuova' });
  assert.equal(E.natpfDirModel, 'nuova', 'la decide l’host');
  snap();                                                         // host di prima: nessun campo, resta com'era
  assert.equal(E.natpfDirModel, 'nuova');
  snap({ dir: 'boh' });                                           // valore sconosciuto: non cambia niente
  assert.equal(E.natpfDirModel, 'nuova');
  // previsione locale del colpo del P2 (stesso esito dell'host, specchiato): con la regola nuova
  const prova = () => {
    const p = E.opponent, real = Math.random; Math.random = () => .5;
    try {
      E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'player'; E.ball.bounceCountOnCurrentSide = 1; E.ball.rallyStrokeCount = 3;
      p.pos.set(0, 0, -11.4); p.vel.set(0, 0, 0); E.ball.pos.set(-.6, 1, -10.9); E.ball.vel.set(0, 0, -18);
      return E._natpfRacketShot({ ...colpoTel(10), natpfTau: .03, natpfLateSpan: .075 }, p, { lateral: .6 });
    } finally { Math.random = real; }
  };
  const nuova = prova();
  assert.equal(nuova.out.rule, 'nuova', 'previsione del P2 con la regola nuova dell’host');
  snap({ dir: 'classica' });
  assert.equal(E.natpfDirModel, 'classica');
  const classica = prova();
  assert.equal(classica.out.rule, undefined, 'con l’host su «Classica» la regola di oggi');
  assert.notEqual(classica.E, nuova.E, 'la palla prevista cambia con la regola dell’host');
});

test('B36.1, pannello dello stand: «Direzione dei colpi» Classica ↔ Nuova, salvata; il chiosco e «Nuovo giocatore» non la toccano', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const K = w.ui.kiosk, voce = () => $('natpf-staff').querySelector('[data-staff="dir"] b');
  K.open();
  assert.equal(voce().textContent, 'Classica', 'di base «Classica»');
  assert.equal(voce().parentElement.classList.contains('on'), false);
  K.run('dir');
  assert.equal(localStorage.getItem(DIR_KEY), 'nuova');
  assert.equal(voce().textContent, 'Nuova · in lavorazione');
  assert.equal(voce().parentElement.classList.contains('on'), true, '«Nuova» si vede accesa');
  assert.match($('natpf-toast').textContent, /Nuova \(in lavorazione, non da provare\).*Vale dalla prossima partita o minigioco; resta salvata/);
  // il chiosco azzera chi gioca, non lo stand
  K.reset();
  assert.equal(localStorage.getItem(DIR_KEY), 'nuova', 'dopo il chiosco resta «Nuova»');
  w.ui.newPlayer(); w.advance(200);
  assert.equal(localStorage.getItem(DIR_KEY), 'nuova', 'dopo «Nuovo giocatore» resta «Nuova»');
  // la partita dopo la legge
  w.E.startNewMatch({ showStartBanner: false });
  assert.equal(w.E.natpfDirModel, 'nuova');
  K.open(); K.run('dir');
  assert.equal(localStorage.getItem(DIR_KEY), 'classica');
  assert.equal(voce().textContent, 'Classica');
  assert.match($('natpf-toast').textContent, /Classica, come sempre/);
});

// Revisione del B73 (docs/b73/unione.md, «Revisione e sistemazione», rilievo «p2-registro-dir»): sul computer del P2 la riga
// «partita» del registro si scriveva subito dopo startNewMatch, quando la direzione vale ancora «Classica» (DIR_DEFAULT),
// e i colpi del P2, giocati con la regola dell'host («Nuova»), finivano nel gruppo «classica · due-computer» del riassunto.
// Ora sul P2 la riga «partita» aspetta il primo snapshot della partita dell'host (dir dell'host; un host di prima non lo
// manda: «classica», la sua regola). In più il riassunto non conta nei gruppi della direzione le partite del P2: i colpi del
// P2 li ha già il registro dell'host (chi 'a', con la direzione giusta), sarebbero contati due volte.
const storageFinto = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };
const snapPartita = (E, seq, extra = {}) => E._handleRoomStateUpdate({ p1Online: true, hostName: 'Ada', epoch: 'x', snapshotSeq: seq,
  snapshot: { phase: 'RALLY', phaseTimer: 1, score: { ...E.score }, ball: { px: 0, py: 1.4, pz: 0, vx: 0, vy: 3, vz: -4, inPlay: true, lastHitter: 'player', shotType: 'TOPSPIN', rallyStrokeCount: 3 }, ...extra } });
// un colpo del P2 (sull'host: il colpo vero; sul P2: la previsione locale), poi la palla vola
function colpoP2(w){
  const E = w.E, p = E.opponent, real = Math.random; Math.random = () => .5;
  try {
    E.autoPlayMode = false; E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'player'; E.ball.bounceCountOnCurrentSide = 1; E.ball.rallyStrokeCount = 3;
    p.pos.set(0, 0, -11.4); p.vel.set(0, 0, 0); E.ball.pos.set(-.6, 1, -10.9); E.ball.vel.set(0, 0, -18);
    return E._natpfRacketShot({ ...colpoTel(10), natpfTau: .03, natpfLateSpan: .075 }, p, { lateral: .6 });
  } finally { Math.random = real; }
}
const righeDi = async (coda, R) => { await R.blocco(); const rows = []; for (const b of await coda.elenco()) for (const l of (await coda.leggi(b.id)).trim().split('\n')) if (l) rows.push(JSON.parse(l)); return rows; };
// un computer della sfida con il suo registro: role 'p1' (host su «hostDir») o 'p2' (snap: campi dello snapshot dell'host;
// null: nessuno snapshot della partita)
async function computerSfida(role, { hostDir = 'nuova', snap = { dir: 'nuova' } } = {}){
  const w = await makeWorld({ controller: 'mouse', role }); w.advance(300);
  const { E } = w, coda = codaMemoria();
  if (role === 'p1'){ E.isMultiplayer = true; E.natpfDirRule = hostDir; E.autoPlayMode = false; }
  const R = new RegistroStand({ engine: E, ui: {}, coda, storage: storageFinto(), now: () => E.elapsedTime*1000, wallNow: () => Date.UTC(2026, 10, 20, 10), win: null, raf: () => {}, timers: false });
  E.startNewMatch({ showStartBanner: false });
  return { w, E, R, coda };
}

test('B36.1 (revisione B73), computer del P2: la riga «partita» del registro ha la direzione dell’host, non «Classica» indovinata', async () => {
  // host su «Nuova»: snapshot con dir 'nuova'
  {
    const { w, E, R, coda } = await computerSfida('p2');
    snapPartita(E, 1, { dir: 'nuova' }); w.advance(50);
    assert.equal(E.natpfDirModel, 'nuova');
    assert.equal(colpoP2(w)?.out?.rule, 'nuova');
    for (let i = 0; i < 240 && E.ball.inPlay; i++) E.step(1/120);
    const rows = await righeDi(coda, R), part = rows.filter(r => r.k === 'partita');
    assert.equal(part.length, 1, 'una riga «partita»');
    assert.deepEqual({ modo: part[0].modo, ruolo: part[0].ruolo, dir: part[0].dir }, { modo: 'due-computer', ruolo: 'p2', dir: 'nuova' });
    assert.ok(!rows.some(r => r.k === 'partita' && r.dir === 'classica'), 'nessuna riga del P2 dice «classica» per questa partita');
    assert.deepEqual(rows.filter(r => r.k === 'colpo').map(c => ({ nr: c.nr, chi: c.chi })), [{ nr: 1, chi: 'a' }]);
    assert.ok(rows.findIndex(r => r.k === 'partita') < rows.findIndex(r => r.k === 'colpo'), 'la riga «partita» viene prima dei suoi colpi');
    // il riassunto del solo registro del P2: nessun colpo in «classica», nessun falso allarme «senza campi»
    const S = new Riassunto(); for (const r of rows) S.aggiungi(r, { giorno: '2026-11-20', postazione: 'bbbbbbbb' }); S.fine();
    assert.equal(S.dir.partite.senzaCampi, 0);
    assert.ok(!Object.keys(S.dir.gruppi).some(k => k.startsWith('classica')), JSON.stringify(Object.keys(S.dir.gruppi)));
  }
  // host di prima (snapshot senza dir): «classica», la sua regola
  {
    const { w, E, R, coda } = await computerSfida('p2');
    snapPartita(E, 1); w.advance(50);
    const rows = await righeDi(coda, R);
    assert.equal(rows.find(r => r.k === 'partita')?.dir, 'classica');
  }
  // partita chiusa prima di uno snapshot della partita (solo la lobby dell'host): la riga si scrive alla chiusura, prima
  // della sua fine, con il numero giusto
  {
    const { w, E, R, coda } = await computerSfida('p2');
    E._handleRoomStateUpdate({ p1Online: true, epoch: 'x', snapshotSeq: 1, snapshot: { lobby: true, fmt: E.matchFormat.id } }); w.advance(50);
    E.startNewMatch({ showStartBanner: false });                  // la partita dopo
    snapPartita(E, 2, { dir: 'nuova' }); w.advance(50);
    const rows = await righeDi(coda, R), ks = rows.filter(r => r.k.startsWith('partita')).map(r => [r.k, r.n, r.dir]);
    assert.deepEqual(ks.map(([k, n]) => [k, n]), [['partita', 1], ['partita.fine', 1], ['partita', 2]], JSON.stringify(ks));
    assert.equal(ks[2][2], 'nuova');
  }
});

test('B36.1 (revisione B73), host e P2 della stessa sfida al riassunto: il colpo del P2 una volta sola, nel gruppo della regola dell’host', async () => {
  const host = await computerSfida('p1', { hostDir: 'nuova' });
  assert.equal(colpoP2(host.w)?.out?.rule, 'nuova', 'sull’host il colpo vero del P2 con la regola nuova');
  for (let i = 0; i < 240 && host.E.ball.inPlay; i++) host.E.step(1/120);
  const hostRows = await righeDi(host.coda, host.R);
  const p2 = await computerSfida('p2');
  snapPartita(p2.E, 1, { dir: 'nuova' }); p2.w.advance(50);
  colpoP2(p2.w); for (let i = 0; i < 240 && p2.E.ball.inPlay; i++) p2.E.step(1/120);
  const p2Rows = await righeDi(p2.coda, p2.R);
  assert.equal(hostRows.filter(r => r.k === 'colpo').length, 1); assert.equal(p2Rows.filter(r => r.k === 'colpo').length, 1);
  const S = new Riassunto();
  for (const r of hostRows) S.aggiungi(r, { giorno: '2026-11-20', postazione: 'aaaaaaaa' });
  for (const r of p2Rows) S.aggiungi(r, { giorno: '2026-11-20', postazione: 'bbbbbbbb' });
  S.fine();
  const gruppi = Object.fromEntries(Object.values(S.dir.gruppi).filter(g => g.colpi || g.partite).map(g => [`${g.modello} · ${g.chiave}`, { colpi: g.colpi, partite: g.partite }]));
  assert.deepEqual(gruppi, { 'nuova · due-computer': { colpi: 1, partite: 1 } }, JSON.stringify(gruppi));
  assert.equal(S.dir.partite.senzaCampi, 0);
});

test('B36.1 (revisione B73), diagnostica sul computer del P2: la direzione della partita segue lo snapshot dell’host', async () => {
  const w = await makeWorld({ controller: 'mouse', role: 'p2' }); w.advance(300);
  const { E } = w, store = memoryStore();
  const R = new DiagRecorder({ engine: E, ui: w.ui, store });
  const id = await R.start({ webcamVideo: false, gameVideo: false, phoneSamples: false });
  try {
    E.startNewMatch({ showStartBanner: false });
    snapPartita(E, 1, { dir: 'nuova' }); w.advance(50);
    snapPartita(E, 2, { dir: 'nuova' }); w.advance(50);                // stessa direzione: niente di nuovo
    assert.equal(R.lastMatch?.direzione, 'nuova', 'la partita in corso (anche la copia per le parti dopo) dice «nuova»');
    await R.flush();
  } finally { R.stop(); }
  const ev = (await (await store.file(id, 'eventi.jsonl')).text()).trim().split('\n').map(l => JSON.parse(l));
  const cambi = ev.filter(e => e.k === 'partita.direzione');
  assert.equal(cambi.length, 1, JSON.stringify(cambi));
  assert.deepEqual({ n: cambi[0].n, direzione: cambi[0].direzione, da: cambi[0].da }, { n: 1, direzione: 'nuova', da: 'host' });
});
