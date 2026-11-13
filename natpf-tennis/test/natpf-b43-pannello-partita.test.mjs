// B43 punto 2 · pannello dello stand, telecomando dello staff e diagnostica che fermano la partita; conferma in due passi
// con il solo mouse (docs/coda/B43-tabellone-e-pannello.md, docs/b43/tabellone-e-pannello.md; controllo «solo mouse» del
// B39: A1, A2, A3, A5 e voci n. 14 e 15). In un file a sé perché il mondo di prova (ui-world.mjs) sostituisce orologio e
// timer del processo. Qui anche la prova del punto 3 che ha bisogno della pausa vera (scritta del punto che aspetta).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeWorld, $ } from './ui-world.mjs';
import { CONFIRM, confirmStep, TwoStep } from '../src/natpf/natpf_confirm.js';
import { playWorld } from './trial-world.mjs';

const css = f => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
// z-index della regola che comincia con quel selettore (il primo trovato)
const zOf = (text, sel) => { const i = text.indexOf(sel); assert.ok(i >= 0, `regola ${sel}`); const m = text.slice(i, text.indexOf('}', i)).match(/z-index:\s*(\d+)/); assert.ok(m, `z-index di ${sel}`); return +m[1]; };
// pulsante finto come quelli del foglio: <b> per la scritta di destra (voci della griglia) o la scritta intera
const fakeBtn = (cmd, text, { b = true, attr = 'staff' } = {}) => {
  const cls = new Set(), label = b ? { textContent: text } : null;
  const btn = { dataset: { [attr]: cmd }, textContent: b ? '' : text, classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) },
    querySelector: s => (s === 'b' ? label : null), setAttribute(){}, removeAttribute(){} };
  return { btn, text: () => (label ? label.textContent : btn.textContent), armed: () => cls.has('armed') };
};
// partita contro la CPU con la racchetta mouse (modalità prova): in campo, motore che gira
async function inMatch(){
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  w.pressStart(); w.advance(500);
  assert.ok(w.ui.pause.inGame && !w.E.natpfPaused && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(w.E.phase), `in campo: ${w.E.phase}`);
  return w;
}
// il motore gira? fotogrammi aggiornati in ms di tempo
const runs = (w, ms = 1000) => { const u = w.stats.update; w.advance(ms); return w.stats.update - u; };

/* ---------- regola della conferma ---------- */
test('punto 2 · conferma in due passi: il primo clic arma, il doppio clic non basta, il secondo clic dopo 0,45 s esegue; dopo 5 s si riparte', () => {
  assert.deepEqual([CONFIRM.gapMs, CONFIRM.holdMs, CONFIRM.text], [450, 5000, 'Sicuro? Clicca ancora']);
  let s = confirmStep(null, 'menu', 1000);
  assert.deepEqual(s, { go: false, armed: { key: 'menu', at: 1000 } }, 'primo clic: armato');
  const a = s.armed;
  s = confirmStep(a, 'menu', 1200); assert.equal(s.go, false, 'doppio clic (0,2 s): non esegue'); assert.equal(s.armed, a, '… e resta armato dal primo');
  assert.equal(confirmStep(a, 'menu', 1449).go, false, 'sotto 0,45 s ancora no');
  assert.deepEqual(confirmStep(a, 'menu', 1450), { go: true, armed: null }, 'secondo clic dopo 0,45 s: esegue');
  assert.deepEqual(confirmStep(a, 'menu', 6000), { go: true, armed: null }, 'entro 5 s');
  assert.deepEqual(confirmStep(a, 'menu', 6001), { go: false, armed: { key: 'menu', at: 6001 } }, 'dopo 5 s è un primo clic');
  assert.deepEqual(confirmStep(a, 'ranking', 1600), { go: false, armed: { key: 'ranking', at: 1600 } }, 'un altro pulsante: si arma quello');
});

test('punto 2 · TwoStep: scritta «Sicuro? Clicca ancora» e colore rosa sul pulsante armato, poi torna com\'era (tempo scaduto, altro pulsante, disarmo)', () => {
  let t = 0; const timers = [], changes = [];
  const realST = globalThis.setTimeout, realCT = globalThis.clearTimeout;
  globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; }; globalThis.clearTimeout = () => {};
  try {
    const c = new TwoStep({ now: () => t, onChange: on => changes.push(on) });
    const nb = fakeBtn('newplayer', 'Nuovo giocatore', { b: false }), rk = fakeBtn('ranking', 'A schermo intero');
    assert.equal(c.click(nb.btn, 'newplayer'), false);
    assert.equal(nb.text(), 'Sicuro? Clicca ancora'); assert.ok(nb.armed()); assert.ok(c.isArmed('newplayer') && !c.isArmed('ranking'));
    assert.equal(timers.at(-1).ms, 5000, 'si disarma da solo dopo 5 s');
    // clic su un altro pulsante: il primo torna com'era, si arma il secondo (scritta nel <b>)
    t = 600; assert.equal(c.click(rk.btn, 'ranking'), false);
    assert.equal(nb.text(), 'Nuovo giocatore'); assert.ok(!nb.armed()); assert.equal(rk.text(), 'Sicuro? Clicca ancora'); assert.ok(rk.armed());
    t = 800; assert.equal(c.click(rk.btn, 'ranking'), false, 'doppio clic: no');
    t = 1100; assert.equal(c.click(rk.btn, 'ranking'), true, 'secondo clic vero: sì');
    assert.equal(rk.text(), 'A schermo intero'); assert.ok(!rk.armed() && !c.isArmed());
    // tempo scaduto
    t = 2000; c.click(nb.btn, 'newplayer'); timers.at(-1).fn();
    assert.equal(nb.text(), 'Nuovo giocatore'); assert.ok(!c.isArmed());
    assert.deepEqual(changes, [true, false, true, false, true, false]);
  } finally { globalThis.setTimeout = realST; globalThis.clearTimeout = realCT; }
});

/* ---------- la partita si ferma ---------- */
test('punto 2 · pannello dello stand in partita: la partita si ferma (la CPU non gioca dietro il pannello) e riparte alla chiusura', async () => {
  const w = await inMatch(), { E, ui } = w;
  assert.ok(runs(w) > 50, 'prima il motore gira');
  ui.kiosk.open();
  assert.equal(E.natpfPaused, true, 'pannello aperto: partita ferma');
  const sc = JSON.stringify(E.score), t0 = E.elapsedTime;
  assert.equal(runs(w, 12000), 0, '12 s con il pannello aperto: nessun fotogramma di gioco');
  assert.equal(E.elapsedTime, t0); assert.equal(JSON.stringify(E.score), sc, 'nessun punto dietro il pannello');
  ui.kiosk.close();
  assert.equal(E.natpfPaused, false, 'chiuso: si riprende'); assert.ok(runs(w) > 50);
  // aperto sopra la pausa e chiuso: resta la pausa
  ui.pause.open(); ui.kiosk.open(); ui.kiosk.close();
  assert.ok(ui.pause.isOpen && E.natpfPaused, 'pausa ancora aperta, partita ancora ferma');
  ui.pause.close(); assert.equal(E.natpfPaused, false);
  // Ctrl+Maiusc+K (e F9 nel programma Windows, stessa funzione toggle)
  w.key('KeyK', 'K', document.body, { ctrlKey: true, shiftKey: true }); assert.ok(ui.kiosk.isOpen && E.natpfPaused);
  w.key('KeyK', 'K', document.body, { ctrlKey: true, shiftKey: true }); assert.ok(!ui.kiosk.isOpen && !E.natpfPaused);
});

test('punto 2 · Esc con il pannello aperto in campo chiude il pannello (prima apriva la pausa sotto, senza vederla); poi Esc è di nuovo la pausa', async () => {
  const w = await inMatch(), { E, ui } = w;
  ui.kiosk.open();
  w.key('Escape', 'Escape');
  assert.ok(!ui.kiosk.isOpen && !ui.pause.isOpen && !E.natpfPaused, 'pannello chiuso, partita che riparte');
  w.key('Escape', 'Escape'); assert.ok(ui.pause.isOpen && E.natpfPaused, 'Esc in campo: la pausa come sempre');
});

test('punto 2 · anche gli scambi di prova e l\'allenamento si fermano con il pannello aperto', async () => {
  // scambi di prova (B28) contro la CPU, telefono che risponde come la pagina vera
  const p = await playWorld();
  assert.ok(p.ui.trial.active && !p.lobby.visible, 'scambi di prova in corso');
  p.advance(1500); assert.ok(runs(p) > 50);
  p.ui.kiosk.open(); assert.equal(p.E.natpfPaused, true); assert.equal(runs(p, 3000), 0, 'scambi di prova fermi');
  p.ui.kiosk.close(); assert.ok(runs(p) > 50, 'e ripartono');
  // allenamento con la racchetta mouse
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  w.lobby.menu('training'); w.lobby.go('connect'); w.lobby.next(); w.advance(300);
  if (w.ui.training.lesson) w.ui.training.lessonAction('skip');
  w.advance(1500);
  assert.ok(w.ui.training.active && runs(w) > 50, 'allenamento in campo');
  w.ui.kiosk.open(); assert.equal(w.E.natpfPaused, true); assert.equal(runs(w, 3000), 0, 'allenamento fermo');
  w.ui.kiosk.close(); assert.ok(runs(w) > 50);
});

test('punto 2 · telecomando dello staff: partita ferma anche mentre il foglio si apre (librerie) e finché è aperto; si torna al pannello, poi si gioca', async () => {
  const w = await inMatch(), { E, ui } = w, R = ui.remote;
  let go; const libs = new Promise(r => { go = r; });
  R._libs = () => libs; R.link.pairing = () => {};
  ui.kiosk.open();
  const opened = R.open();
  assert.ok(!ui.kiosk.isOpen && R.opening, 'pannello chiuso, foglio del telecomando che si apre');
  assert.equal(E.natpfPaused, true, 'tra il pannello e il foglio la partita non riparte');
  assert.equal(runs(w, 1000), 0);
  go(); await opened;
  assert.ok(R.isOpen && !R.opening && E.natpfPaused, 'foglio aperto, partita ferma'); assert.equal(runs(w, 2000), 0);
  R.close();
  assert.ok(!R.isOpen && ui.kiosk.isOpen && E.natpfPaused, 'chiuso il foglio: di nuovo il pannello, partita ancora ferma');
  ui.kiosk.close(); assert.ok(!E.natpfPaused && runs(w) > 50, 'chiuso il pannello: si gioca');
  // Esc nel foglio del telecomando, in campo: indietro al pannello (come nel menu), non la pausa sotto
  R.open(); await Promise.resolve(); await Promise.resolve(); assert.ok(R.isOpen);
  w.key('Escape', 'Escape'); assert.ok(!R.isOpen && ui.kiosk.isOpen && !ui.pause.isOpen && E.natpfPaused);
  w.key('Escape', 'Escape'); assert.ok(!ui.kiosk.isOpen && !E.natpfPaused);
});

test('punto 2 · diagnostica: ferma la partita; aperta dalla pausa non la fa ripartire e alla chiusura si torna alla pausa', async () => {
  const w = await inMatch(), { E, ui } = w, D = ui.diag;
  // Maiusc+D in campo
  w.key('KeyD', 'D', document.body, { shiftKey: true });
  assert.ok(D.isOpen && E.natpfPaused, 'diagnostica aperta in campo: partita ferma'); assert.equal(runs(w, 3000), 0);
  w.key('KeyD', 'D', document.body, { shiftKey: true });
  assert.ok(!D.isOpen && !ui.pause.isOpen && !E.natpfPaused, 'chiusa: si gioca (non era aperta dalla pausa)');
  // dalla pausa: «Diagnostica» (prima la pausa si chiudeva e la partita ripartiva dietro la diagnostica: 3,9 s in 4 s)
  ui.pause.open(); ui.pause.run('diag');
  assert.ok(D.isOpen && !ui.pause.isOpen && E.natpfPaused, 'diagnostica al posto della pausa, partita ferma');
  const t0 = E.elapsedTime; assert.equal(runs(w, 4000), 0); assert.equal(E.elapsedTime, t0, 'in 4 s nessun tempo di gioco');
  D.close();
  assert.ok(!D.isOpen && ui.pause.isOpen && E.natpfPaused, 'chiusa: di nuovo la pausa, partita ancora ferma');
  // Maiusc+D con la pausa aperta: la diagnostica non copre la pausa («Torna al menu»), la pausa torna dopo
  w.key('KeyD', 'D', document.body, { shiftKey: true });
  assert.ok(D.isOpen && !ui.pause.isOpen && E.natpfPaused);
  w.key('KeyD', 'D', document.body, { shiftKey: true });
  assert.ok(!D.isOpen && ui.pause.isOpen && E.natpfPaused);
  // aprendo la pausa con la diagnostica aperta, la diagnostica si chiude (copriva «Torna al menu»)
  ui.pause.close(); D.open(); ui.pause.open();
  assert.ok(!D.isOpen && ui.pause.isOpen && E.natpfPaused);
  // tornati al menu, la diagnostica aperta dalla pausa non riapre la pausa nella partita dopo
  ui.pause.run('diag'); ui.backToMenu(); w.pressStart(); w.advance(500);
  D.close();
  assert.ok(!ui.pause.isOpen && !E.natpfPaused, 'partita nuova: niente pausa da quella di prima');
});

/* ---------- conferme ---------- */
test('punto 2 · pannello in partita: «Nuovo giocatore», «Classifica a schermo intero» e «Telefono: Scollega» vogliono il secondo clic; fuori dalla partita no', async () => {
  const w = await inMatch(), { E, ui } = w, K = ui.kiosk;
  const did = []; ui.newPlayer = () => { did.push('newplayer'); return 'menu'; };
  K.open();
  const np = fakeBtn('newplayer', 'Nuovo giocatore', { b: false });
  assert.equal(K.press(np.btn), false, 'primo clic: niente'); assert.equal(np.text(), 'Sicuro? Clicca ancora');
  assert.ok(K.isOpen && E.natpfPaused && !did.length, 'pannello aperto, partita ferma, visitatore non toccato');
  w.advance(150); assert.equal(K.press(np.btn), false, 'doppio clic: niente');
  w.advance(400); assert.equal(K.press(np.btn), true, 'secondo clic: «Nuovo giocatore»');
  assert.deepEqual(did, ['newplayer']); assert.ok(!K.isOpen);
  // classifica a schermo intero: chiude la partita, quindi conferma
  const w2 = await inMatch(); w2.ui.kiosk.open();
  const rk = fakeBtn('ranking', 'A schermo intero');
  assert.equal(w2.ui.kiosk.press(rk.btn), false); assert.ok(!w2.ui.lobby.visible && w2.ui.pause.inGame, 'la partita c\'è ancora');
  assert.equal(rk.text(), 'Sicuro? Clicca ancora');
  // il pannello si ridipinge (telecomando, ogni 400 ms) ma la scritta del pulsante armato resta
  w2.ui.kiosk.paint(); w2.advance(600);
  assert.equal(w2.ui.kiosk.press(rk.btn), true);
  assert.ok(w2.ui.lobby.visible && w2.ui.lobby.step === 'ranking' && document.documentElement.classList.contains('ranking-full'), 'classifica a schermo intero');
  // senza secondo clic entro 5 s il pulsante torna com'era
  const w3 = await inMatch(); w3.ui.kiosk.open();
  const ph = fakeBtn('phone', 'Scollega');
  w3.ui.phone.link.connected = true; assert.equal(w3.ui.phone.connected, true);
  let forgot = 0; w3.ui.phone.forget = () => { forgot++; };
  assert.equal(w3.ui.kiosk.press(ph.btn), false); assert.equal(forgot, 0);
  w3.advance(5200); assert.ok(!ph.armed() && !w3.ui.kiosk.confirm.isArmed(), 'disarmato dopo 5 s');
  assert.equal(w3.ui.kiosk.press(ph.btn), false, 'dopo 5 s il clic è di nuovo il primo'); w3.advance(500);
  assert.equal(w3.ui.kiosk.press(ph.btn), true); assert.equal(forgot, 1);
  // un clic su una voce che non chiede conferma disarma quella armata; chiudere il pannello anche
  const w4 = await inMatch(); w4.ui.kiosk.open();
  const nb = fakeBtn('newplayer', 'Nuovo giocatore', { b: false }), mu = fakeBtn('music', 'Sì');
  w4.ui.kiosk.press(nb.btn); w4.ui.kiosk.press(mu.btn);
  assert.ok(!nb.armed() && nb.text() === 'Nuovo giocatore');
  w4.ui.kiosk.press(nb.btn); w4.ui.kiosk.close(); assert.ok(!nb.armed() && !w4.ui.kiosk.confirm.isArmed());
  // fuori dalla partita (menu) le stesse voci partono al primo clic
  const m = await makeWorld({ controller: 'mouse' }); m.advance(300);
  const mdid = []; m.ui.newPlayer = () => { mdid.push(1); return 'menu'; };
  m.ui.kiosk.open(); assert.equal(m.ui.kiosk.needsConfirm('newplayer'), false);
  assert.equal(m.ui.kiosk.press(fakeBtn('newplayer', 'Nuovo giocatore', { b: false }).btn), true); assert.equal(mdid.length, 1);
  // a partita finita neanche (la partita non c'è più)
  const f = await inMatch(); f.E.phase = 'MATCH_OVER';
  assert.equal(f.ui.kiosk.needsConfirm('newplayer'), false); assert.equal(f.ui.kiosk.needsConfirm('ranking'), false);
  // dal codice (telecomando con la sua conferma sul telefono, chiosco) le voci restano immediate
  const r = await inMatch(); const rdid = []; r.ui.newPlayer = () => { rdid.push(1); return 'menu'; };
  r.ui.kiosk.open(); r.ui.kiosk.run('newplayer'); assert.equal(rdid.length, 1);
});

test('punto 2 · pausa: «Torna al menu» vuole il secondo clic (accanto c\'è «Riprendi ›»); «Riprendi» e le altre voci no', async () => {
  const w = await inMatch(), { E, ui } = w;
  ui.pause.open();
  const menu = fakeBtn('menu', 'Torna al menu', { b: false, attr: 'pause' });
  assert.equal(ui.pause.press(menu.btn), false);
  assert.ok(ui.pause.isOpen && !ui.lobby.visible && E.natpfPaused, 'primo clic: si resta in pausa');
  assert.equal(menu.text(), 'Sicuro? Clicca ancora'); assert.ok(menu.armed());
  w.advance(100); assert.equal(ui.pause.press(menu.btn), false, 'doppio clic: niente');
  w.advance(500); assert.equal(ui.pause.press(menu.btn), true);
  assert.ok(ui.lobby.visible && ui.lobby.step === 'menu' && !ui.pause.isOpen, 'secondo clic: menu principale');
  // armato e poi «Riprendi ›»: si riprende e «Torna al menu» torna com'era
  const v = await inMatch(); v.ui.pause.open();
  const m2 = fakeBtn('menu', 'Torna al menu', { b: false, attr: 'pause' });
  v.ui.pause.press(m2.btn);
  assert.equal(v.ui.pause.press(fakeBtn('resume', 'Riprendi ›', { b: false, attr: 'pause' }).btn), true, '«Riprendi» al primo clic');
  assert.ok(!v.ui.pause.isOpen && !v.E.natpfPaused && m2.text() === 'Torna al menu' && !m2.armed());
  // il «Menu» del telecomando (conferma sul telefono) e il chiosco chiamano run: diretti
  v.ui.pause.open(); v.ui.pause.run('menu'); assert.ok(v.ui.lobby.visible && v.ui.lobby.step === 'menu');
});

/* ---------- fogli dello staff sopra la pausa ---------- */
test('punto 2 · fogli dello staff sopra la pausa, la diagnostica, l\'intro, il tutorial e il riquadro del telefono; sotto la calibrazione dello schermo e gli avvisi', () => {
  const ui = css('natpf-ui.css'), base = css('natpf.css'), flow = css('natpf-flow.css');
  const staff = zOf(ui, '#natpf-staff.natpf-sheet-backdrop, #natpf-remote.natpf-sheet-backdrop');
  const sheets = zOf(base, '.nt-modal-backdrop.natpf-sheet-backdrop'), diag = zOf(flow, '.natpf-diag {'), intro = zOf(ui, '.natpf-intro {');
  const tutorial = zOf(ui, '.natpf-tutorial {'), hold = zOf(ui, '.natpf-phone-hold {'), calibra = zOf(ui, '.natpf-calibra {'), toast = zOf(ui, '.natpf-toast {');
  assert.equal(staff, 250);
  for (const [name, z] of Object.entries({ 'pausa e altri fogli': sheets, diagnostica: diag, intro, tutorial, 'telefono in pausa': hold })) assert.ok(staff > z, `pannello (${staff}) sopra ${name} (${z})`);
  assert.ok(calibra > staff && toast > staff, `calibrazione (${calibra}) e avvisi (${toast}) sopra il pannello`);
  // i fogli della pagina vera: pannello e telecomando hanno la classe della regola; la pausa viene dopo nel DOM (con lo
  // stesso z-index ci finiva sopra)
  const html = css('index.html');
  assert.match(html, /id="natpf-staff" class="nt-modal-backdrop natpf-sheet-backdrop hidden"/);
  assert.match(html, /id="natpf-remote" class="nt-modal-backdrop natpf-sheet-backdrop hidden"/);
  assert.ok(html.indexOf('id="natpf-staff"') < html.indexOf('id="natpf-pause"'));
  // colore del pulsante armato: rosa del gioco
  assert.match(ui, /button\.armed[^}]*#ff4d94/i);
});

/* ---------- punto 3 con la pausa vera ---------- */
test('punto 3 · con la partita in pausa la scritta del punto aspetta (tempo del gioco); poi arriva', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const { E, ui } = w, seen = [];
  const sc = E.hud.showCenterBanner.bind(E.hud); E.hud.showCenterBanner = (t, o) => { seen.push(t); return sc(t, o); };
  w.pressStart(); w.advance(300); seen.length = 0;
  E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent'; E._awardPoint('player', 'Out');
  w.advance(200); ui.pause.open(); assert.equal(E.natpfPaused, true);
  w.advance(2000); assert.deepEqual(seen, [], 'in pausa niente scritta');
  ui.pause.close(); w.advance(250); assert.deepEqual(seen, [], 'ripresa: mancano ancora 0,1 s di gioco');
  w.advance(150); assert.deepEqual(seen, ['Punto tuo']);
  // lo stesso con il pannello dello stand aperto (fa parte della pausa del B43)
  seen.length = 0; w.advance(3000);
  E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'opponent'; E._awardPoint('player', 'Out');
  w.advance(100); ui.kiosk.open(); w.advance(3000); assert.deepEqual(seen, [], 'pannello aperto: niente scritta');
  ui.kiosk.close(); w.advance(500); assert.deepEqual(seen, ['Punto tuo']);
  void $;
});
