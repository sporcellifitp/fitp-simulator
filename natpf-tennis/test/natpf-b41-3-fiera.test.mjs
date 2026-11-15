// B41.3 · revisione della B41 seconda parte, difetti 2, 3, 5 e 6 (modalità fiera):
//   2. «Scollega» nel foglio «Telefoni dello stand» dal telecomando dello staff con un OK solo: ora due passi, come nel
//      pannello (natpf_fiera_sheet.act);
//   3. pausa → «Torna al menu» (o «Menu» dal telecomando) riportava alla pagina della fiera senza azzerare il visitatore:
//      chi arrivava dopo giocava con il nome di prima e, se destro, con dritto e rovescio scambiati (il caso del B46). Ora
//      in fiera tornare al menu è «Prossimo giocatore» (natpf_ui.backToMenu);
//   5. modalità accesa e poi spenta: «Con cosa giochi» restava «Smartphone» e «Calibrazione» «Giocando». Ora si ricordano
//      all'accensione e si rimettono allo spegnimento (natpf_fiera.FAIR_BEFORE_KEY, natpf_kiosk._fairRestore);
//   6. con la modalità fiera un clic su «Calibrazione» la portava a «Con i gesti». Ora resta «Giocando» e la voce lo dice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, mkEvent } from './ui-world.mjs';
import { playWorld, playTrial, stroke } from './trial-world.mjs';
import { NatpfFiera, FAIR_MODE_KEY, FAIR_BEFORE_KEY, FAIR_CAL_BUTTON, FAIR_CAL_TEXT, readFairBefore, fairBeforeOf, fairPanelToast, visitorName } from '../src/natpf/natpf_fiera.js';
import { CAL_MODE_KEY, readSavedCalMode, forgetCalMode } from '../src/natpf/natpf_trial_learn.js';
import { gameStoreKey } from '@natpf/tennis/stand-pairing.js';

const PAIRED = JSON.stringify({ session: 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', key: 'abcdefghijkmnpqrstuvwxyz23', pairedAt: 1 });
async function fairWorld(){
  const w = await playWorld({ cal: 'play', mode: null }), { ui } = w;
  localStorage.setItem(gameStoreKey('p1'), PAIRED);
  ui.phone.useStand = function(slot){ this.standSlot = slot || null; return Promise.resolve(this); };
  ui.fiera.setOn(true);
  w.advance(300);
  ui.lobby.go('menu'); w.advance(300);
  return w;
}
const toasts = ui => { const out = []; const t = ui.toast.bind(ui); ui.toast = (m, ms) => { out.push(m); return t(m, ms); }; return out; };

/* ---------- difetto 2 ---------- */
test('B41.3 · «Scollega» del foglio: due passi anche dal telecomando (il suo OK è un clic non vero); dal codice subito', async () => {
  const w = await fairWorld(), { ui } = w, S = ui.fieraSheet, F = ui.fiera;
  const calls = []; F.forget = slot => { calls.push(slot); return true; };
  S.open();
  const btn = { textContent: 'Scollega', classList: { add(){}, remove(){} }, querySelector: () => null, setAttribute(){}, removeAttribute(){} };
  // l'OK del telecomando preme il pulsante con el.click(): un evento di clic con isTrusted falso
  const remoteClick = () => mkEvent('click', btn);
  assert.equal(await S.act('forget', 'p1', remoteClick(), btn), false, 'primo OK: arma soltanto');
  assert.equal(btn.textContent, 'Sicuro? Clicca ancora');
  assert.deepEqual(calls, []);
  w.advance(200);
  assert.equal(await S.act('forget', 'p1', remoteClick(), btn), false, 'secondo OK troppo vicino (doppio tocco): ancora armato');
  w.advance(400);
  assert.equal(await S.act('forget', 'p1', remoteClick(), btn), true, 'secondo OK: scollega');
  assert.deepEqual(calls, ['p1']);
  // mouse: come prima, due clic
  assert.equal(await S.act('forget', 'p1', { isTrusted: true }, btn), false);
  w.advance(600);
  assert.equal(await S.act('forget', 'p1', { isTrusted: true }, btn), true);
  // dal codice (senza clic): subito
  assert.equal(await S.act('forget', 'p1'), true);
  assert.deepEqual(calls, ['p1', 'p1', 'p1']);
});

/* ---------- difetto 3 ---------- */
// visitatore A: livello Casual, mano sinistra, numero preso, partita in corso (scambi di prova saltati con il computer)
async function visitorPlaying(w){
  const { E, ui, lobby } = w;
  w.hud._setDifficultySelection = l => { w.hud.selectedDifficulty = l; };
  lobby.setLevel('casual');
  ui.hand.set('left');
  assert.equal(w.pressStart(), false, 'scambi di prova');
  playTrial(w, (id, n, want) => stroke({ dir: want }), { gioca: false });
  w.advance(3500);
  assert.ok(!lobby.visible && E.natpfMatchSeq === 1, 'partita in corso');
  assert.deepEqual([ui.events.nickname, ui.hand.hand, lobby.cpuLevel], ['Visitatore 1', 'left', 'casual']);
}
function assertFreshVisitor(w, what){
  const { ui, lobby, link } = w;
  assert.deepEqual([lobby.visible, lobby.step, $('title-modal').dataset.fair], [true, 'match', '1'], `${what}: pagina della fiera`);
  assert.equal(ui.events.nickname, '', `${what}: niente nome di chi c'era`);
  assert.equal(ui.hand.hand, 'right', `${what}: mano Destra`);
  assert.equal(lobby.cpuLevel, 'evento', `${what}: «Chi gioca» Adulto`);
  assert.equal(ui.fiera.visitor, null, `${what}: numero liberato`);
  assert.equal(ui.fiera.visitorLabel(), 'Visitatore 2', `${what}: chi arriva avrà il numero dopo`);
  assert.ok(link.connected && ui.phone.standSlot === 'p1', `${what}: telefono dello stand collegato`);
  assert.ok(!w.E.natpfPaused && !ui.pause.isOpen, `${what}: niente pausa rimasta`);
}

test('B41.3 · in fiera pausa → «Torna al menu»: pagina della fiera con il visitatore azzerato (nome, mano, livello, telefono da capo); il telefono resta collegato', async () => {
  const w = await fairWorld(), { ui } = w;
  await visitorPlaying(w);
  const resets = []; const r = ui.phone.resetPlayer.bind(ui.phone); ui.phone.resetPlayer = o => { resets.push(o?.causa); return r(o); };
  const forgets = []; ui.phone.forget = () => forgets.push(1);
  ui.pause.open();
  ui.pause.run('menu');
  w.advance(300);
  assertFreshVisitor(w, 'pausa');
  assert.deepEqual(resets, ['fiera'], 'quello che il telefono ha imparato da chi c\'era, da capo');
  assert.deepEqual(forgets, []);
  // il visitatore dopo: «Gioca» → «Visitatore 2», destro
  assert.equal(w.pressStart(), false);
  assert.equal(ui.events.nickname, 'Visitatore 2');
  assert.equal(ui.phone.hand, 'right');
});

test('B41.3 · in fiera «Menu» dal telecomando: in partita e dalla pagina della fiera azzera il visitatore come «Prossimo giocatore»', async () => {
  const w = await fairWorld(), { ui } = w;
  await visitorPlaying(w);
  const out = await new Promise(res => ui.remote._onCmd({ c: 'menu', y: true, reply: res }));
  w.advance(300);
  assertFreshVisitor(w, 'telecomando in partita');
  assert.match(out.msg, /Pagina della fiera/);
  // dalla pagina stessa, con un nome scritto e la mano sinistra
  ui.events.nickname = 'Marco'; ui.hand.set('left');
  await new Promise(res => ui.remote._onCmd({ c: 'menu', y: true, reply: res }));
  w.advance(300);
  assert.deepEqual([ui.events.nickname, ui.hand.hand, ui.lobby.step], ['', 'right', 'match']);
});

test('B41.3 · fuori dalla fiera «Torna al menu» come prima (il menu di sempre, il nome resta: lo azzera «Nuovo giocatore»)', async () => {
  const w = await playWorld({ cal: 'none', mode: 'cpu' }), { ui, lobby } = w;
  ui.events.nickname = 'Anna';
  w.pressStart(); w.advance(3500);
  ui.pause.open(); ui.pause.run('menu'); w.advance(300);
  assert.deepEqual([lobby.visible, lobby.step, ui.events.nickname], [true, 'menu', 'Anna']);
});

/* ---------- difetti 5 e 6 ---------- */
test('B41.3 · funzioni pure: valori di prima ripuliti; avviso dello spegnimento con le scelte rimesse', () => {
  assert.deepEqual(fairBeforeOf({ controller: 'webcam', cal: 'none' }), { controller: 'webcam', cal: 'none' });
  assert.deepEqual(fairBeforeOf({ controller: 'telefono', cal: 'gesti' }), { controller: null, cal: 'gesti' });
  assert.equal(fairBeforeOf({ controller: 'x', cal: 'y' }), null);
  assert.equal(fairBeforeOf(null), null);
  assert.match(fairPanelToast(false, { restored: 'Webcam · Nessuna' }), /«Con cosa giochi» e «Calibrazione» come prima della fiera \(Webcam · Nessuna\)/);
  assert.equal(fairPanelToast(false), 'Modalità fiera spenta: torna il menu di sempre, i telefoni con il QR. Resta salvata');
  assert.equal(FAIR_CAL_BUTTON, 'Giocando (fiera)');
});

test('B41.3 · modalità fiera accesa e poi spenta dal pannello: «Con cosa giochi» e «Calibrazione» tornano come prima', async () => {
  const w = await makeWorld({ controller: 'mouse', cal: 'none' }), { ui } = w, K = ui.kiosk, msgs = toasts(ui);
  assert.deepEqual([ui.controller, readSavedCalMode()], ['mouse', 'none']);
  K.open(); K.run('fiera'); w.advance(300);
  assert.equal(ui.fiera.on, true);
  assert.deepEqual([ui.controller, readSavedCalMode()], ['phone', 'play'], 'in fiera: Smartphone e «Giocando»');
  assert.deepEqual(readFairBefore(), { controller: 'mouse', cal: 'none' }, 'ricordati (salvati)');
  ui.fieraSheet.close();
  K.run('fiera'); w.advance(300);
  assert.equal(ui.fiera.on, false);
  assert.deepEqual([ui.controller, readSavedCalMode()], ['mouse', 'none'], 'come prima della fiera');
  assert.equal(localStorage.getItem(CAL_MODE_KEY), 'none');
  assert.equal(localStorage.getItem(FAIR_BEFORE_KEY), null, 'niente più da rimettere');
  assert.match(msgs.at(-1), /come prima della fiera \(Mouse e tastiera · Nessuna\)/);
  assert.equal(ui.lobby.step, 'menu', 'il menu di sempre');
  // spenta senza valori ricordati (accesa da una versione di prima): resta com'è, l'avviso di sempre
  K.run('fiera'); w.advance(300); ui.fieraSheet.close();
  localStorage.removeItem(FAIR_BEFORE_KEY);
  K.run('fiera'); w.advance(300);
  assert.equal(msgs.at(-1), 'Modalità fiera spenta: torna il menu di sempre, i telefoni con il QR. Resta salvata');
  assert.deepEqual([ui.controller, readSavedCalMode()], ['phone', 'play']);
});

test('B41.3 · con la modalità fiera la calibrazione resta «Giocando»: un clic sulla voce lo dice e non la cambia; spenta, la voce torna a girare', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'gesti' }), { ui } = w, K = ui.kiosk, msgs = toasts(ui);
  localStorage.setItem(gameStoreKey('p1'), PAIRED);
  ui.phone.useStand = function(slot){ this.standSlot = slot || null; return Promise.resolve(this); };
  K.open(); K.run('fiera'); w.advance(300);
  ui.fieraSheet.close();
  assert.equal(readSavedCalMode(), 'play');
  // (nel DOM finto gli attributi non restano: qui sì, per il fumetto della voce, che la riga sotto le voci legge)
  const b = $('natpf-staff').querySelector('[data-staff="cal"]'), attrs = { title: 'Giocando: niente gesti a vuoto…' };
  b.setAttribute = (k, v) => { attrs[k] = String(v); }; b.getAttribute = k => attrs[k] ?? null;
  K.paint();
  const val = () => $('natpf-staff').querySelector('[data-staff="cal"] b').textContent;
  assert.equal(val(), FAIR_CAL_BUTTON, 'la voce dice «Giocando (fiera)»');
  assert.match(b.getAttribute('title'), /resta «Giocando»/, 'la riga sotto le voci dice il perché');
  for (let i = 0; i < 3; i++) K.run('cal');
  assert.equal(readSavedCalMode(), 'play', 'tre clic: sempre «Giocando»');
  assert.equal(msgs.at(-1), FAIR_CAL_TEXT);
  assert.equal(ui.trial.due(), true, 'il telefono dello stand fa gli scambi di prova (niente calibrazione con i gesti)');
  // spenta: «Con i gesti» di prima, e la voce cambia di nuovo con un clic
  K.run('fiera'); w.advance(300);
  assert.equal(readSavedCalMode(), 'gesti');
  K.paint();
  assert.equal(val(), 'Con i gesti');
  assert.ok(!/resta «Giocando»/.test(b.getAttribute('title') || ''), 'il fumetto di sempre');
  K.run('cal');
  assert.equal(readSavedCalMode(), 'none');
});

test('B41.3 · modalità fiera già accesa all\'avvio con un\'altra calibrazione salvata: «Giocando», quella di prima ricordata', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'gesti' }), { E, ui } = w;
  localStorage.setItem(FAIR_MODE_KEY, '1'); localStorage.setItem(CAL_MODE_KEY, 'gesti'); forgetCalMode();
  const F = new NatpfFiera(E, ui);
  assert.equal(F.on, true);
  assert.equal(readSavedCalMode(), 'play');
  assert.deepEqual(readFairBefore(), { controller: 'phone', cal: 'gesti' });
  // con ?cal=… nell'indirizzo (prove) non si tocca
  localStorage.removeItem(FAIR_BEFORE_KEY); localStorage.setItem(CAL_MODE_KEY, 'none'); forgetCalMode();
  globalThis.location = { ...globalThis.location, search: '?intro=0&cal=none' };
  new NatpfFiera(E, ui);
  assert.equal(readSavedCalMode(), 'none');
  assert.equal(readFairBefore(), null);
  globalThis.location = { ...globalThis.location, search: '?intro=0' };
  localStorage.removeItem(FAIR_MODE_KEY);
});
