// B47 · livello dopo «Rivincita» (richiesta dell'utente del 14/11: «in modalità evento quindi fiera, dopo "rivincita", devo
// poter impostare i livelli di difficoltà (es. adulto bambino ragazzo)»): natpf_rematch.js. «Rivincita» apre la scelta
// del livello già segnata con quello di prima; «Gioca» → conto alla rovescia grande → partita. Gli scambi di prova si
// rifanno come prima della B47 (dal pulsante del computer sì se dovuti, dalla rivincita dei due telefoni no).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeWorld, $, key, visible } from './ui-world.mjs';
import { phoneLike, playWorld, playTrial, stroke, secondPhone } from './trial-world.mjs';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { REMATCH, rematchCpuTiles, rematchSplitRows, rematchAutoLine } from '../src/natpf/natpf_rematch.js';
import { remoteScreen, remoteCommands, navPlan, gameRunning, LAYERS } from '../src/natpf/natpf_remote_map.js';

test('tessere contro la CPU: Bambino · Ragazzo · Adulto, segnata quella di prima; CPU Esperta o Leggenda solo se è il livello di adesso', () => {
  const t = rematchCpuTiles('evento');
  assert.deepEqual(t.map(x => [x.name, x.level, x.selected]), [['Bambino', 'bambini', false], ['Ragazzo', 'casual', false], ['Adulto', 'evento', true]]);
  assert.deepEqual(rematchCpuTiles('bambini').filter(x => x.selected).map(x => x.name), ['Bambino']);
  const pro = rematchCpuTiles('pro');
  assert.equal(pro.length, 4); assert.deepEqual([pro[3].name, pro[3].selected], ['CPU Esperta', true]);
  assert.equal(rematchCpuTiles('leggenda')[3].name, 'CPU Leggenda');
  assert.equal(rematchCpuTiles('boh').find(x => x.selected).name, 'Adulto');
});

test('righe dello stesso schermo: nome e fasce di ciascuno; riga della partenza da sola', () => {
  const r = rematchSplitRows({ p1: 'Giulia', p2: 'Marco' }, { p1: 'bambino', p2: 'adulto' });
  assert.deepEqual(r.map(x => [x.id, x.name, x.bands.find(b => b.selected).label]), [['p1', 'Giulia', 'Bambino'], ['p2', 'Marco', 'Adulto']]);
  assert.deepEqual(r[0].bands.map(b => b.label), ['Bambino', 'Ragazzo', 'Adulto']);
  assert.equal(rematchSplitRows({}, {})[1].name, 'Player 2');
  assert.equal(REMATCH.autoMs, 10000);
  assert.equal(rematchAutoLine(9100), 'Rivincita chiesta dai telefoni: si parte da soli tra 10 s, oppure scegli e premi «Gioca»');
  assert.equal(rematchAutoLine(0), '');
  // (orari con i decimali: 10000,000000002 ms sono «10 s», non «11 s»)
  assert.match(rematchAutoLine(1e6 + 10000.123456789 - (1e6 + .123456789)), /tra 10 s/); assert.match(rematchAutoLine(10000.000000002), /tra 10 s/); assert.match(rematchAutoLine(10001), /tra 11 s/);
});

// partita contro la CPU fino alla schermata finale (cal: opzione «Calibrazione»)
async function cpuMatchOver(cal){
  const w = await playWorld({ cal }), { E, ui } = w;
  // (l'HUD finto del mondo di prova non segna le tessere: come l'HUD vero, la scelta va in selectedDifficulty; e come nel
  // gioco si parte da «Adulto», il livello Evento)
  w.hud._setDifficultySelection = l => { w.hud.selectedDifficulty = l; };
  w.lobby.setLevel('evento');
  if (cal === 'play') playTrial(w, (id, n, want) => stroke({ dir: want }), { gioca: false });
  assert.equal(w.pressStart(), true);
  E.matchConfig.gamesToWin = 1; w.advance(3100);   // (conto alla rovescia grande)
  for (let i = 0; i < 4; i++) E._awardPoint('player', 'Out');
  w.advance(2600);
  assert.ok(visible('victory-modal') && E.phase === 'MATCH_OVER');
  return w;
}

test('contro la CPU: «Rivincita» apre la scelta (segnata con il livello di prima), si cambia con un clic, «Gioca» → conto grande → partita', async () => {
  const w = await cpuMatchOver('none'), { E, ui, lobby } = w;
  assert.equal(lobby.cpuLevel || 'evento', 'evento');
  $('btn-play-again').click();
  assert.ok(ui.rematch.isOpen && visible('natpf-rematch') && !visible('victory-modal'), 'scelta del livello al posto della schermata finale');
  assert.ok(!lobby.visible, 'niente menu');
  const body = $('natpf-rematch').querySelector('[data-rematch="body"]').innerHTML;
  assert.match(body, /data-rematch-level="evento" role="radio" aria-checked="true"/, 'Adulto già segnato');
  assert.match(body, />Bambino</); assert.match(body, />Ragazzo</);
  assert.doesNotMatch(body, /CPU Esperta|CPU Leggenda/);
  assert.equal($('natpf-rematch').querySelector('[data-rematch="title"]').textContent, 'Chi gioca?');
  // «Bambino»: vale subito come nel menu (HUD e livello del motore alla partenza)
  ui.rematch.pickLevel('bambini');
  assert.equal(lobby.cpuLevel, 'bambini'); assert.equal(E.hud.selectedDifficulty, 'bambini');
  assert.match($('natpf-rematch').querySelector('[data-rematch="body"]').innerHTML, /data-rematch-level="bambini" role="radio" aria-checked="true"/);
  const seq = E.natpfMatchSeq;
  ui.rematch.play(); w.advance(100);
  assert.ok(!ui.rematch.isOpen && !visible('natpf-rematch'));
  assert.equal(E.natpfMatchSeq, seq + 1, 'partita nuova');
  assert.equal(E.matchConfig.difficulty, 'bambini', 'con il livello scelto');
  assert.ok(ui.prematch.active && E.natpfPaused, 'conto alla rovescia grande');
  assert.ok(!ui.trial.active, '«Nessuna»: niente scambi di prova');
  w.advance(3100); assert.ok(!ui.prematch.active && !E.natpfPaused);
});

test('contro la CPU con «Giocando»: dopo «Gioca» gli scambi di prova come prima (dal computer), poi conto e partita senza ripassare dal menu', async () => {
  const w = await cpuMatchOver('play'), { E, ui, lobby } = w;
  $('btn-play-again').click();
  assert.ok(ui.rematch.isOpen);
  const seq = E.natpfMatchSeq;
  ui.rematch.play(); w.advance(100);
  assert.ok(ui.trial.active && !ui.trial.S.toPage, 'scambi di prova, che finiscono nella partita');
  playTrial(w, (id, n, want) => stroke({ dir: want }), { gioca: false }); w.advance(100);
  assert.ok(!ui.trial.active && !lobby.visible);
  assert.equal(E.natpfMatchSeq, seq + 1);
  assert.ok(ui.prematch.active, 'conto grande dopo gli scambi di prova');
});

test('«‹ Indietro» (Esc) torna alla schermata finale; Invio gioca con il livello segnato; «Altre impostazioni» è la pagina «Partita» di prima', async () => {
  const w = await cpuMatchOver('none'), { E, ui, lobby } = w;
  $('btn-play-again').click(); assert.ok(ui.rematch.isOpen);
  key('Escape', 'Escape');
  assert.ok(!ui.rematch.isOpen && visible('victory-modal'), 'di nuovo la schermata finale');
  assert.ok(!ui.pause.isOpen, 'Esc non apre la pausa');
  $('btn-play-again').click(); assert.ok(ui.rematch.isOpen);
  const seq = E.natpfMatchSeq;
  key('Enter', 'Enter'); w.advance(100);
  assert.equal(E.natpfMatchSeq, seq + 1, 'Invio: «Gioca»');
  assert.equal(E.matchConfig.difficulty, 'evento');
  w.advance(3100);
  for (let i = 0; i < 4; i++) E._awardPoint('player', 'Out');
  w.advance(2600); assert.ok(visible('victory-modal'));
  $('btn-play-again').click();
  $('natpf-rematch').ls.click?.[0]?.fn({ target: { closest: sel => (sel === '[data-rematch-act]' ? { dataset: { rematchAct: 'more' } } : null) }, stopPropagation(){} });
  assert.ok(!ui.rematch.isOpen && lobby.visible && lobby.step === 'match', '«Altre impostazioni»: pagina «Partita»');
});

test('il menu, il chiosco o «Nuovo giocatore» chiudono la scelta; nella sfida tra due computer la rivincita resta immediata', async () => {
  const w = await cpuMatchOver('none'), { ui, lobby } = w;
  $('btn-play-again').click(); assert.ok(ui.rematch.isOpen);
  ui.backToMenu(); assert.ok(!ui.rematch.isOpen && !visible('natpf-rematch'));
  lobby.mode = 'friend';
  assert.equal(ui.rematch.open(), false, 'sfida tra due computer: niente scelta');
});

// stesso schermo fino alla schermata finale, con i due telefoni
async function splitMatchOver(cal = 'none'){
  const w = await makeWorld({ controller: 'phone', cal }), { E, ui, lobby, link } = w, P1 = ui.phone;
  const { P2, l2 } = secondPhone(E, NatpfPhoneRacket);
  phoneLike(P1, link); P1.markTutorialSeen('short'); P2.markTutorialSeen('short');
  E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint(); w.advance(300);
  link.cmd('skip'); l2.cmd('skip'); w.advance(300);
  lobby.go('match'); w.advance(300);
  if (cal === 'play'){ w.pressStart(); playTrial(w, (id, n, want) => stroke({ dir: want }), { phones: { p1: P1, p2: P2 } }); }
  else assert.equal(w.pressStart(), true);
  E.matchConfig.gamesToWin = 1; w.advance(3100);
  for (let i = 0; i < 4; i++) E._awardPoint('opponent', 'Out');
  w.advance(2600);
  assert.ok(visible('victory-modal') && E.natpfSplit?.active);
  return { ...w, P1, P2, l2 };
}

test('stesso schermo: «Rivincita» dal computer → fasce dei due con i nomi; si cambiano; «Gioca» con «Giocando» rifà gli scambi di prova come prima, poi il conto', async () => {
  const w = await splitMatchOver('play'), { E, ui, P1, P2 } = w;
  $('btn-play-again').click();
  assert.ok(ui.rematch.isOpen && !w.lobby.visible && E.natpfSplit?.active, 'la sessione resta, niente menu');
  const body = () => $('natpf-rematch').querySelector('[data-rematch="body"]').innerHTML;
  assert.match(body(), />Giulia</); assert.match(body(), />Marco</);
  // B64 (17/11, ridondanze): prima le stesse fasce scritte, senza domanda; «Cambia fascia» apre la scelta
  const title = () => $('natpf-rematch').querySelector('[data-rematch="title"]').textContent;
  assert.equal(title(), 'Stessi giocatori, stesse fasce');
  assert.match(body(), /<span class="rematch-band rematch-band-same selected" data-rematch-band="p1:adulto">Adulto<\/span>/);
  assert.doesNotMatch(body(), /role="radio"/, 'nessuna scelta finché non si chiede');
  assert.match(body(), /data-rematch-act="bands">Cambia fascia</);
  assert.equal($('natpf-rematch').querySelector('[data-rematch="sub"]').textContent, 'Premi «Gioca» per la rivincita');
  ui.rematch.showBands();
  assert.equal(title(), 'Chi gioca? Scegli la fascia di ciascuno');
  assert.match(body(), /data-rematch-band="p1:adulto" role="radio" aria-checked="true"/);
  ui.rematch.pickBand('p1', 'bambino');
  assert.deepEqual(E.natpfSplitBands, { p1: 'bambino', p2: 'adulto' });
  assert.match(body(), /data-rematch-band="p1:bambino" role="radio" aria-checked="true"/);
  assert.match($('natpf-rematch').querySelector('[data-rematch="sub"]').textContent, /Aiuto a Giulia \(Bambino\)/);
  const seq = E.natpfMatchSeq;
  ui.rematch.play(); w.advance(100);
  assert.ok(ui.trial.active && ui.trial.S.split, 'scambi di prova come «Rivincita» → «Gioca» prima della B47');
  playTrial(w, (id, n, want) => stroke({ dir: want }), { phones: { p1: P1, p2: P2 } }); w.advance(100);
  assert.equal(E.natpfMatchSeq, seq + 1);
  assert.ok(E.natpfDuo?.help?.p1, 'aiuto al più giovane dalla fascia scelta');
  assert.ok(ui.prematch.active, 'conto grande');
});

test('stesso schermo: rivincita dai due telefoni → la stessa scelta, che parte da sola dopo 10 s senza scambi di prova (come prima); un clic dello staff la ferma', async () => {
  const w = await splitMatchOver('play'), { E, ui, P1, P2 } = w;
  const seq = E.natpfMatchSeq;
  ui.split._onRematch('p1'); ui.split._onRematch('p2');
  assert.ok(ui.rematch.isOpen && ui.rematch.origin === 'phones');
  assert.match($('natpf-rematch').querySelector('[data-rematch="auto"]').textContent, /si parte da soli tra 10 s/);
  assert.equal(ui.split.rematchOffer, false, 'i telefoni non offrono più la rivincita');
  w.advance(5000); assert.ok(ui.rematch.isOpen);
  w.advance(5200);
  assert.ok(!ui.rematch.isOpen && !ui.trial.active, 'partita da sola, niente scambi di prova');
  assert.equal(E.natpfMatchSeq, seq + 1); assert.ok(ui.prematch.active);
  // di nuovo a fine partita: un clic dello staff ferma la partenza da sola
  w.advance(3100); for (let i = 0; i < 4; i++) E._awardPoint('player', 'Out'); w.advance(2600);
  ui.split._onRematch('p1'); ui.split._onRematch('p2');
  assert.ok(ui.rematch.isOpen);
  ui.rematch.pickBand('p2', 'ragazzo');
  assert.ok($('natpf-rematch').querySelector('[data-rematch="auto"]').classList.contains('hidden'));
  w.advance(12000);
  assert.ok(ui.rematch.isOpen, 'aspetta «Gioca»');
  ui.rematch.play(); w.advance(100);
  assert.equal(E.natpfMatchSeq, seq + 2); assert.deepEqual(E.natpfSplitBands, { p1: 'adulto', p2: 'ragazzo' });
});

test('telecomando dello staff: strato «Rivincita: scegli il livello» con frecce, OK, Indietro e «Gioca»', () => {
  assert.ok(LAYERS.indexOf('rematch') >= 0 && LAYERS.indexOf('rematch') < LAYERS.indexOf('victory'));
  const s = { rematch: true, victory: false, inField: true };
  const sc = remoteScreen(s);
  assert.deepEqual([sc.id, sc.label, sc.nav], ['rematch', 'Rivincita: scegli il livello', 'focus']);
  assert.deepEqual(navPlan(sc, 'left'), { kind: 'focus', dir: 'ArrowLeft' });
  assert.deepEqual(navPlan(sc, 'ok'), { kind: 'press' });
  assert.deepEqual(navPlan(sc, 'back'), { kind: 'back' });
  assert.equal(gameRunning(sc), false, 'la partita è finita: Menu senza conferma');
  const c = remoteCommands({ ...s, cpu: 'evento' }, sc);
  assert.equal(c.cmds.play, 1); assert.equal(c.labels.play, 'Gioca!');
  assert.equal(c.cmds.cpu, 1, 'livello della CPU anche da qui');
  assert.equal(typeof remoteCommands({ ...s, split: true }, sc).cmds.cpu, 'string', 'stesso schermo: niente CPU');
  const remote = readFileSync(new URL('../src/natpf/natpf_remote.js', import.meta.url), 'utf8');
  assert.match(remote, /rematch: \(\) => \$\('natpf-rematch'\)/);
  assert.match(remote, /case 'rematch': this\.ui\.rematch\.cancel\(\)/);
  assert.match(remote, /if \(screen\.id === 'rematch'\)\{ this\.ui\.rematch\.play\(\)/);
});

test('pagina e stile: un riquadro sopra la schermata finale, pulsanti grandi, misure con cqw/cqh', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="natpf-rematch" class="natpf-rematch hidden"/);
  for (const a of ['cancel', 'more', 'play']) assert.match(html, new RegExp(`data-rematch-act="${a}"`));
  const css = readFileSync(new URL('../natpf-ui.css', import.meta.url), 'utf8');
  const block = css.slice(css.indexOf('.natpf-rematch {'), css.indexOf('/* «Salta ›» accanto'));
  assert.match(block, /cqh/); assert.match(block, /@container natpf/);
  assert.doesNotMatch(block, /\d(vw|vh)\b/, 'niente vw/vh');
});
