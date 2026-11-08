// B15, secondo giro della verifica dei mancini (08/11/2026): il Player 2 mancino (stesso schermo e 1v1) e il Player 1
// mancino visto dal computer dell'altro, nel mondo di prova (interfaccia vera sul motore senza disegno, ui-world.mjs).
// File a sé: ui-world sostituisce variabili globali (node --test esegue ogni file in un processo a sé).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './ui-world.mjs';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';

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
