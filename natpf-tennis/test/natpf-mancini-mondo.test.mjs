// B15, secondo giro della verifica dei mancini (08/11/2026): il Player 2 mancino (stesso schermo e 1v1) e il Player 1
// mancino visto dal computer dell'altro, nel mondo di prova (interfaccia vera sul motore senza disegno, ui-world.mjs).
// File a sé: ui-world sostituisce variabili globali (node --test esegue ogni file in un processo a sé).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, fetches } from './ui-world.mjs';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { createMatchRelay } from '../scripts/match-relay.mjs';
import { createLocalRelay } from '../src/natpf/natpf_p2p.js';

function fakeLink(){
  return { connected: true, ready: true, L: { state: 'connected', phone: 'ready' }, session: 's2', token: 't2', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); }, forget(){}, motion(){ return null; }, face(){ return null; }, on(){} };
}
// stesso schermo con il secondo telefono (come natpf-split.test.mjs), mani scelte nel pannello
async function splitWorld({ p1 = 'right', p2 = 'right' } = {}){
  const w = await makeWorld({ controller: 'phone' });
  w.link.cmd('skip');
  const P2 = new NatpfPhoneRacket(w.E, { role: 'p2' });
  P2.link = fakeLink(); w.E.natpfPhone2 = P2;
  w.ui.hand.set(p1);
  assert.equal(w.E.startSplit(), true);
  w.ui.split.setHand('p2', p2);
  w.E.autoPlayMode = false; w.E.startNewMatch({ showStartBanner: false });
  return { ...w, P2 };
}
// palla rispetto a chi batte, nel suo riferimento: < 0 alla sua sinistra (il P2 guarda verso +z: la sua sinistra è +x)
const ballSide = (E, actor) => (E.ball.pos.x - actor.pos.x)*(actor.sideSign > 0 ? 1 : -1);

// Punto 2: NatpfHand metteva la palla del servizio nella mano libera solo per il personaggio locale; il P2 mancino dello
// stesso schermo (e del 1v1 sul computer dell'host) la teneva e la lanciava con la mano della racchetta
test('servizio: la palla sta nella mano libera di chi batte, anche per il Player 2 mancino (stesso schermo)', async () => {
  for (const p1 of ['right', 'left']) for (const p2 of ['right', 'left']){
    const { E, P2 } = await splitWorld({ p1, p2 });
    const want = h => (h === 'left' ? 1 : -1);            // palla a sinistra per il destro, a destra per il mancino
    for (const [server, actor, hand] of [['player', E.player, p1], ['opponent', E.opponent, p2]]){
      E.score.server = server; E._setupPointServe({ showBanner: false });
      assert.equal(Math.sign(ballSide(E, actor)), want(hand), `${p1}/${p2}, ${server} in attesa: palla nella mano libera (${ballSide(E, actor).toFixed(2)})`);
      E._startServeToss(actor);
      assert.equal(Math.sign(ballSide(E, actor)), want(hand), `${p1}/${p2}, ${server} lancio: palla nella mano libera (${ballSide(E, actor).toFixed(2)})`);
    }
    // il lancio dal telefono del P2 passa dallo stesso punto
    E.score.server = 'opponent'; E._setupPointServe({ showBanner: false }); E.phase = 'SERVE_STANCE';
    P2._onToss();
    assert.equal(E.phase, 'SERVE_TOSS');
    assert.equal(Math.sign(ballSide(E, E.opponent)), want(p2), `${p1}/${p2}: lancio del telefono del P2`);
  }
});

// Punto 3 (e D del primo giro): 1v1 tra due computer. La mano del P2 arrivava all'host solo con il suo primo colpo
// (piano d'intercetto e personaggio da destro fino ad allora) e quella dell'host non arrivava mai al computer del P2
// (l'host mancino lì giocava da destro, non specchiato). Ora viaggiano appena sono note: il P2 la mette nella lettura
// dello stato (hand=, come ready= e hold=), il relay la rimanda all'host (p2Hand); l'host la mette nello snapshot
// (p1Hand, lobby e partita). Campi nuovi: un computer o un relay di prima li ignorano, e chi non li riceve resta com'è
test('1v1, relay: la mano del P2 dalla lettura dello stato arriva all’host (p2Hand); un P2 di prima non la manda', async () => {
  const { handle } = createLocalRelay({ relay: createMatchRelay({ publicUrl: '' }) });
  const json = r => JSON.parse(r.text);
  const c = json(await handle({ method: 'POST', url: '/api/match/create', body: {} }));
  const host = async () => json(await handle({ url: `/api/match/state?room=${c.roomId}&role=p1&touch=p1` }));
  await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=p2` });
  assert.equal((await host()).p2Hand, null, 'P2 di prima: nessuna mano');
  await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=p2&ready=1&hand=left` });
  assert.equal((await host()).p2Hand, 'left');
  await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=p2` });
  assert.equal((await host()).p2Hand, 'left', 'una lettura senza mano non la cancella');
  await handle({ url: `/api/match/state?room=${c.roomId}&role=p2&touch=p2&hand=xx` });
  assert.equal((await host()).p2Hand, 'right', 'valore strano: destro');
  // l'host non può cambiare la mano del P2
  await handle({ url: `/api/match/state?room=${c.roomId}&role=p1&touch=p1&hand=left` });
  assert.equal((await host()).p2Hand, 'right');
});

// host nella lobby della sfida (stanza creata, «Sfida un amico»)
async function hostLobby(hand = 'right'){
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { E, lobby, hud } = w;
  w.ui.hand.set(hand);
  lobby.menu('play'); hud.selectedDifficulty = '1v1'; E._applyDifficultyTuning('1v1'); await E.createMultiplayerRoom(); await w.flush();
  lobby.setMode('friend'); lobby.go('match'); w.advance(300);
  return w;
}
const snapshots = since => fetches.slice(since).filter(f => String(f.url).includes('/api/match/sync')).map(f => JSON.parse(f.body).snapshot);

test('1v1, host: la mano del P2 dal relay (prima del primo colpo) → piano d’intercetto e personaggio; la propria nello snapshot', async () => {
  for (const hand of ['right', 'left']){
    const w = await hostLobby(hand), { E } = w;
    assert.ok(E.versus?.active && !E.versus.local, 'sessione 1v1 in rete');
    // P2 mancino collegato, nessun colpo ancora
    E._handleRoomStateUpdate({ p2Online: true, p2Ready: true, p2Hand: 'left' }); w.advance(200);
    assert.equal(E.natpfP2Hand, 'left', `${hand}: mano del P2 nota dalla lobby`);
    assert.equal(E.opponent.natpfHand, 'left'); assert.ok(E.opponent.root.scale.x < 0, 'P2 mancino specchiato');
    assert.ok(E.player.root.scale.x*(hand === 'left' ? -1 : 1) > 0, 'l’host resta com’è');
    // un relay o un P2 di prima: nessuna p2Hand, non cambia niente
    E._handleRoomStateUpdate({ p2Online: true, p2Ready: true }); assert.equal(E.natpfP2Hand, 'left');
    // la mano dell'host nello snapshot della lobby e in quello della partita
    let since = fetches.length; w.advance(1200);
    const lob = snapshots(since).filter(s => s.lobby);
    assert.ok(lob.length && lob.every(s => s.p1Hand === hand), `${hand}: lobby ${JSON.stringify(lob.at(-1))}`);
    w.pressStart(); w.advance(300); if (w.ui.training?.active) w.ui.training.skip(); w.advance(300);
    assert.ok(E._versusInMatch(), `fase ${E.phase}`);
    since = fetches.length; w.advance(600);
    const match = snapshots(since).filter(s => !s.lobby && !s.paused && s.phase);
    assert.ok(match.length && match.every(s => s.p1Hand === hand), `${hand}: partita`);
    // il P2 mancino al servizio sull'host: palla nella sua mano libera (punto 2) già prima di colpire
    E.score.server = 'opponent'; E._setupPointServe({ showBanner: false });
    assert.ok((E.ball.pos.x - E.opponent.pos.x)*-1 > 0, 'palla alla destra del P2 mancino');
  }
  // contro la CPU (nessuna sessione 1v1) una p2Hand rimasta nel relay non tocca l'avversario
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  w.E._handleRoomStateUpdate({ p2Online: true, p2Hand: 'left' });
  assert.notEqual(w.E.natpfP2Hand, 'left'); assert.ok(w.E.opponent.root.scale.x > 0);
});

test('1v1, computer del P2: l’host mancino è specchiato e ha la sua mano (snapshot della lobby e della partita); host di prima: com’è', async () => {
  const w = await makeWorld({ controller: 'mouse', role: 'p2' }); w.advance(300);
  const { E } = w;
  let seq = 0;
  const snap = snapshot => E._handleRoomStateUpdate({ p1Online: true, hostName: 'Ada', epoch: 'x', snapshotSeq: ++seq, snapshot });
  snap({ lobby: true, host: { ready: true, detail: 'racchetta pronta' } }); w.advance(100);
  assert.ok(E.player.root.scale.x > 0 && E.player.natpfHand !== 'left', 'host di prima: destro');
  snap({ lobby: true, host: { ready: true, detail: 'racchetta pronta' }, p1Hand: 'left' }); w.advance(100);
  assert.equal(E.player.natpfHand, 'left'); assert.ok(E.player.root.scale.x < 0, 'host mancino specchiato dalla lobby');
  assert.ok(E.opponent.root.scale.x > 0, 'il P2 (destro) resta com’è');
  snap({ phase: 'RALLY', phaseTimer: 1, score: { ...E.score }, ball: { px: 0, py: 1, pz: 0, vx: 0, vy: 0, vz: 0, inPlay: true }, p1Hand: 'right' }); w.advance(100);
  assert.equal(E.player.natpfHand, 'right'); assert.ok(E.player.root.scale.x > 0, 'snapshot della partita');
  snap({ phase: 'RALLY', phaseTimer: 1, score: { ...E.score }, ball: { px: 0, py: 1, pz: 0, vx: 0, vy: 0, vz: 0, inPlay: true }, p1Hand: 'left' }); w.advance(100);
  assert.ok(E.player.root.scale.x < 0);
});
