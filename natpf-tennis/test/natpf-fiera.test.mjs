// B41.1–B41.2 · Modalità fiera, lato gioco (natpf_fiera.js): opzione salvata e indirizzo di prova, regola «in fiera
// contro la CPU batte sempre il visitatore», stato dei posti, telefoni dello stand in ascolto all'avvio, il chiosco che
// non li scollega, niente QR pubblico, tutorial già visto. Il collegamento vero (prova HMAC, ripresa, riabbinamento) è
// in tools/test/stand-pairing.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { NatpfFiera, fairModeFrom, fairServer, standSlotView, standPaired, FAIR_MODE_KEY, LOW_BATTERY } from '../src/natpf/natpf_fiera.js';
import { gameStoreKey } from '@natpf/tennis/stand-pairing.js';
import { splitPlayerStatus } from '../src/natpf/natpf_split_ui.js';

const PAIRED = JSON.stringify({ session: 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', key: 'abcdefghijkmnpqrstuvwxyz23', pairedAt: 1 });

test('modalità fiera: di base spenta; salvata; l\'indirizzo ?stand=fiera (prove) vince, ?stand=normale la spegne; ?formato=fiera è un\'altra cosa', () => {
  assert.deepEqual(fairModeFrom({}), { on: false, forced: false });
  assert.deepEqual(fairModeFrom({ saved: '1' }), { on: true, forced: false });
  assert.deepEqual(fairModeFrom({ saved: '0' }), { on: false, forced: false });
  assert.deepEqual(fairModeFrom({ search: '?intro=0&stand=fiera', saved: '0' }), { on: true, forced: true });
  assert.deepEqual(fairModeFrom({ search: '?stand=normale', saved: '1' }), { on: false, forced: true });
  assert.deepEqual(fairModeFrom({ search: '?formato=fiera' }), { on: false, forced: false }, 'il formato veloce non accende la modalità fiera');
});

test('in fiera contro la CPU batte sempre il visitatore (in tutti i game); in due e fuori dalla fiera le regole di sempre', () => {
  for (const normal of ['player', 'opponent']){
    assert.equal(fairServer({ fair: true, mode: 'cpu', normal }), 'player');
    assert.equal(fairServer({ fair: false, mode: 'cpu', normal }), normal);
    assert.equal(fairServer({ fair: true, mode: 'split', normal }), normal);
    assert.equal(fairServer({ fair: true, mode: 'friend', normal }), normal);
  }
  // una partita da 3 game: il visitatore batte il primo, il secondo e il terzo
  let normal = 'opponent'; const servers = [];
  for (let g = 0; g < 3; g++){ servers.push(fairServer({ fair: true, mode: 'cpu', normal })); normal = normal === 'player' ? 'opponent' : 'player'; }
  assert.deepEqual(servers, ['player', 'player', 'player']);
});

test('stato di un posto per il foglio dello staff e per il ledwall (batteria bassa sotto il 20 %)', () => {
  assert.equal(standSlotView({ on: false }).state, 'off');
  assert.equal(standSlotView({ on: true }).word, 'Telefono 1 da abbinare');
  assert.equal(standSlotView({ on: true, slot: 'p2', pairing: true }).state, 'pairing');
  assert.equal(standSlotView({ on: true, request: { num: 482 } }).word, 'Un telefono chiede il posto · numero 482');
  assert.match(standSlotView({ on: true, paired: true }).word, /scollegato: si ricollega da solo/);
  assert.equal(standSlotView({ on: true, paired: true, connected: true }).state, 'prep');
  const r = standSlotView({ on: true, slot: 'p2', paired: true, connected: true, ready: true, battery: 15 });
  assert.deepEqual([r.state, r.word, r.low], ['ready', 'Telefono 2 pronto ✓ · batteria 15%', true]);
  assert.equal(standSlotView({ on: true, paired: true, connected: true, ready: true, battery: 15, charging: true }).low, false);
  assert.equal(LOW_BATTERY, 20);
  const m = new Map([[gameStoreKey('p1'), PAIRED], [gameStoreKey('p2'), '{"session":"racchetta-tel-x","key":"k"}']]);
  const st = { getItem: k => m.get(k) ?? null };
  assert.deepEqual([standPaired('p1', st), standPaired('p2', st)], [true, false]);
});

// telefoni finti per il controllore: useStand come NatpfPhoneRacket (posto e collegamento), senza rete
const fakeStand = P => { P.standCalls = []; P.useStand = function(slot){ this.standCalls.push(slot); this.standSlot = slot || null; return Promise.resolve(this); }; return P; };

test('all\'avvio con la modalità accesa i posti abbinati diventano telefoni dello stand (anche il Telefono 2, prima solo con lo stesso schermo); spenta, tornano racchette normali', async () => {
  const w = await makeWorld({ controller: 'phone' }), { E, ui } = w;
  localStorage.setItem(gameStoreKey('p1'), PAIRED); localStorage.setItem(gameStoreKey('p2'), PAIRED);
  fakeStand(ui.phone);
  const real = NatpfPhoneRacket.prototype.useStand;
  NatpfPhoneRacket.prototype.useStand = function(slot){ (this.standCalls ||= []).push(slot); this.standSlot = slot || null; return Promise.resolve(this); };
  try {
    globalThis.location = { ...globalThis.location, search: '?intro=0&stand=fiera' };
    const F = new NatpfFiera(E, ui);
    assert.deepEqual([F.on, F.forced], [true, true]);
    assert.deepEqual(ui.phone.standCalls, ['p1']);
    assert.ok(E.natpfPhone2 && E.natpfPhone2.fixedRole === 'p2', 'Telefono 2 creato all\'avvio');
    assert.deepEqual(E.natpfPhone2.standCalls, ['p2']);
    assert.equal(localStorage.getItem(FAIR_MODE_KEY), null, 'con l\'indirizzo di prova niente salvato');
    // spenta (la scelta salvata, senza indirizzo di prova)
    globalThis.location = { ...globalThis.location, search: '?intro=0' };
    const G = new NatpfFiera(E, ui);
    assert.equal(G.on, false);
    ui.phone.standSlot = 'p1'; G.setOn(true); G.setOn(false);
    assert.equal(localStorage.getItem(FAIR_MODE_KEY), '0');
    assert.equal(ui.phone.standSlot, null, 'di nuovo la racchetta normale');
    // posto non abbinato: resta la racchetta normale anche con la modalità accesa
    localStorage.removeItem(gameStoreKey('p1'));
    ui.phone.standCalls.length = 0; G.setOn(true);
    assert.deepEqual(ui.phone.standCalls, []);
    assert.equal(G.status('p1').state, 'unpaired');
    // la conferma vuole un clic vero dello staff
    ui.phone.standSlot = 'p1'; let confirmed = 0;
    ui.phone.link = { ...ui.phone.link, standConfirm: () => { confirmed++; return true; }, standRefuse: () => true, standPairing: () => true };
    assert.equal(G.confirm('p1', { isTrusted: false }), false);
    assert.equal(G.confirm('p1'), false);
    assert.equal(G.confirm('p1', { isTrusted: true }), true);
    assert.equal(confirmed, 1);
  } finally { NatpfPhoneRacket.prototype.useStand = real; }
});

test('telefono dello stand: niente QR pubblico (nemmeno nel riquadro), tutorial già visto, il chiosco non lo scollega e non lo prende per un visitatore', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, link } = w, P = ui.phone;
  assert.ok(P.pairingUrl, 'racchetta normale: QR');
  P.forgetTutorial(); assert.equal(P.tutorialSeen, false);
  P.standSlot = 'p1';
  assert.equal(P.pairingUrl, null, 'telefono dello stand: nessun QR');
  assert.equal(P.tutorialSeen, true, 'conta come visto: il visitatore riceve il telefono pronto');
  // riquadro del QR con il telefono dello stand scollegato: il posto e «chiama lo staff», nessun QR
  link.connected = false; link.L = { state: 'lost', phone: null };
  const box = $('connect-qr'); ui.renderQr(box, null, null, P);
  assert.match(box.innerHTML, /Telefono 1/); assert.match(box.innerHTML, /chiama lo staff/); assert.doesNotMatch(box.innerHTML, /<svg/);
  // chiosco: azzeramento del visitatore senza scollegare il telefono dello stand
  link.connected = true; link.ready = true; link.L = { state: 'connected', phone: 'ready' };
  ui.kiosk.reset();
  assert.ok(link.connected, 'il telefono dello stand resta collegato');
  // … e al menu con il telefono dello stand collegato il chiosco non riazzera di continuo
  ui.kiosk.enabled = true; ui.kiosk.last = performance.now() - 3600*1000;
  let resets = 0; const r = ui.kiosk.reset.bind(ui.kiosk); ui.kiosk.reset = () => { resets++; r(); };
  ui.lobby.go('menu'); ui.kiosk.check();
  assert.equal(resets, 0);
  // la racchetta normale, come prima: il chiosco la scollega
  P.standSlot = null; ui.kiosk.reset = r; ui.kiosk.reset();
  assert.equal(link.connected, false);
});

test('stesso schermo: un telefono dello stand scollegato non chiede di inquadrare il QR (si ricollega da solo)', () => {
  const p = { link: {}, state: { state: 'waiting' }, connected: false, standSlot: 'p2' };
  const st = splitPlayerStatus(p);
  assert.deepEqual([st.state, st.lost, st.title, st.detail], ['qr', true, 'Telefono 2 scollegato', 'Telefono scollegato']);
  assert.doesNotMatch(st.sub, /QR/);
  assert.equal(splitPlayerStatus({ ...p, standSlot: null }).title, 'Inquadra il QR', 'la racchetta normale come prima');
});

/* ===================================================================================================================
   B41 seconda parte (B41.4–B41.5, docs/b41/modalita-fiera-2.md): interruttore del pannello, foglio «Telefoni dello stand»,
   avviso della batteria, pagina della fiera, «Prossimo giocatore», visitatori numerati, battuta al visitatore
   =================================================================================================================== */
import { fairPanelButton, fairPanelToast, batteryText, batteryAlert, strokeOfDir, nextVisitor, peekVisitor, visitorName, VISITOR_KEY, FAIR_PLAY_KEY } from '../src/natpf/natpf_fiera.js';
import { sheetSlotView, CLOSED_TEXT } from '../src/natpf/natpf_fiera_sheet.js';
import { fairGate, fairNote, visitorLine } from '../src/natpf/natpf_fiera_page.js';
import { standPanelSummary } from '../src/natpf/natpf_kiosk.js';
import { matchServe } from '../src/natpf/natpf_battuta.js';
import { dayKey } from '../src/natpf/natpf_events.js';
import { CAL_MODE_KEY, forgetCalMode } from '../src/natpf/natpf_trial_learn.js';
import { playWorld, playTrial, stroke, secondPhone } from './trial-world.mjs';
import { NO_REMOTE } from '../src/natpf/natpf_remote.js';
import { remoteScreen, remoteCommands, LAYERS } from '../src/natpf/natpf_remote_map.js';
import { mkEvent, visible, key } from './ui-world.mjs';
import { readFileSync } from 'node:fs';

const PAIRED2 = JSON.stringify({ session: 'racchetta-stand-zyxwvutsrqpnmkjihgfedcba32', key: 'zyxwvutsrqpnmkjihgfedcba32', pairedAt: 2 });

test('B41.4 · funzioni pure: voce del pannello, batteria nella scheda, avviso del ledwall, ultimo colpo letto', () => {
  assert.deepEqual([fairPanelButton(false), fairPanelButton(true), fairPanelButton(true, true)], ['No', 'Sì', 'Sì (indirizzo)']);
  assert.match(fairPanelToast(true, { calSet: true }), /pagina della fiera.*«Giocando».*Resta salvata/);
  assert.match(fairPanelToast(false), /menu di sempre/);
  assert.match(fairPanelToast(true, { forced: true }), /solo per questa pagina/);
  const ready = standSlotView({ on: true, paired: true, connected: true, ready: true, battery: 82 });
  assert.deepEqual([ready.battery, ready.charging, batteryText(ready)], [82, false, 'Batteria 82%']);
  const low = standSlotView({ on: true, slot: 'p2', paired: true, connected: true, ready: true, battery: 15 });
  assert.equal(batteryText(low), 'Batteria 15% · bassa: mettilo in carica');
  assert.equal(batteryText(standSlotView({ on: true, paired: true, connected: true, ready: true, battery: 15, charging: true })), 'Batteria 15% · in carica');
  assert.equal(batteryText(standSlotView({ on: true, paired: true, connected: false, battery: 15 })), '', 'scollegato: la batteria di prima non vale');
  assert.equal(batteryText(standSlotView({ on: true, paired: true, connected: true, ready: true })), '', 'iPhone: niente batteria');
  // avviso sul ledwall: solo i telefoni dello stand collegati, sotto il 20 % e non in carica
  assert.equal(batteryAlert([ready, low]), 'Telefono 2: batteria 15% · mettilo in carica');
  const low1 = standSlotView({ on: true, slot: 'p1', paired: true, connected: true, ready: false, battery: 9 });
  assert.equal(batteryAlert([low1, low]), 'Telefono 1: batteria 9% · Telefono 2: batteria 15% · mettili in carica');
  assert.equal(batteryAlert([ready, standSlotView({ on: true, slot: 'p2', paired: true, connected: true, ready: true, battery: 15, charging: true })]), '');
  assert.equal(batteryAlert([standSlotView({ on: false, battery: 5 })]), '', 'modalità spenta: niente');
  // prova dello staff nel foglio: il verso letto, con la mano
  assert.deepEqual([strokeOfDir(1), strokeOfDir(-1), strokeOfDir(1, 'left'), strokeOfDir(-1, 'left'), strokeOfDir(0)], ['dritto', 'rovescio', 'rovescio', 'dritto', '']);
  assert.deepEqual([standPanelSummary(ready, standSlotView({ on: true, slot: 'p2' })), standPanelSummary(standSlotView({ on: true, paired: true }), standSlotView({ on: true, slot: 'p2', request: { num: 4 } }))],
    ['1 ✓ · 2 da abbinare ›', '1 scollegato · 2 da confermare ›']);
});

test('B41.4 · scheda del foglio: QR solo per il posto in abbinamento, numero con «Rifiuta» e «Conferma», «Scollega» per il posto abbinato', () => {
  const S = (v, o) => sheetSlotView(v, o);
  assert.deepEqual(S(standSlotView({ on: true }), {}).actions, ['pair']);
  assert.equal(S(standSlotView({ on: true }), {}).pairLabel, 'Abbina');
  const pairing = { ...standSlotView({ on: true, pairing: true }), url: 'https://x/racchetta.html#sp=racchetta-stand-abbina-1&k=2' };
  assert.deepEqual([S(pairing, { pairing: true }).view, S(pairing, { pairing: true }).qr, S(pairing, { pairing: true }).actions], ['qr', pairing.url, ['cancel']]);
  assert.equal(S(pairing, { pairing: false }).qr, null, 'un QR aperto altrove (o da un altro foglio) non si mostra qui');
  const ask = S(standSlotView({ on: true, request: { num: 482 } }), {});
  assert.deepEqual([ask.view, ask.num, ask.actions], ['ask', '482', ['refuse', 'confirm']]);
  const ok = S({ ...standSlotView({ on: true, paired: true, connected: true, ready: true, battery: 60 }), url: null }, { swing: { dir: -1, at: 1000 }, now: 2000 });
  assert.deepEqual([ok.actions, ok.pairLabel, ok.swing, ok.batt], [['pair', 'forget'], 'Abbina un altro telefono', 'Ultimo colpo letto: rovescio', 'Batteria 60%']);
  assert.match(S(standSlotView({ on: true, paired: true, connected: true, ready: true }), { swing: { dir: 1, at: 0 }, now: 99999 }).swing, /Prova: fai un dritto e un rovescio/);
  assert.equal(S(standSlotView({ on: true }), { closed: 'expired' }).note, CLOSED_TEXT.expired);
  assert.deepEqual(S(standSlotView({ on: false }), {}).actions, [], 'modalità spenta: niente da fare');
});

test('B41.5 · funzioni pure: si parte solo con i telefoni dello stand pronti; riga della pagina; visitatori numerati che ripartono ogni giorno', () => {
  const ok = { paired: true, connected: true, ready: true };
  assert.deepEqual(fairGate({ mode: 'cpu', phones: { p1: ok } }), { ok: true, slot: null, why: '' });
  assert.match(fairGate({ mode: 'cpu', phones: { p1: {} } }).why, /Telefono 1 da abbinare: «Telefoni dello stand ›»/);
  assert.match(fairGate({ mode: 'cpu', phones: { p1: { paired: true } } }).why, /scollegato: si ricollega da solo/);
  assert.match(fairGate({ mode: 'cpu', phones: { p1: { ...ok, hidden: true } } }).why, /schermo del telefono spento/);
  assert.match(fairGate({ mode: 'cpu', phones: { p1: { paired: true, connected: true } } }).why, /«Attiva i sensori»/);
  assert.equal(fairGate({ mode: 'split', phones: { p1: ok, p2: { paired: true } } }).slot, 'p2');
  assert.equal(fairGate({ mode: 'split', phones: { p1: ok, p2: ok } }).ok, true);
  assert.match(fairNote({ mode: 'cpu', trial: true }), /«Sono pronto» sul telefono, oppure «Gioca ›»: qualche scambio di prova, poi il conto alla rovescia e la partita/);
  assert.match(fairNote({ mode: 'split', trial: false }), /tutti e due i telefoni.*: il conto alla rovescia e la partita/);
  assert.deepEqual([visitorLine({ label: 'Visitatore 3' }), visitorLine({ nickname: 'Marco', label: 'Visitatore 3' }), visitorLine({ guest: true })], ['Visitatore 3', 'Marco', 'Ospite · fuori classifica']);
  assert.equal(visitorName(12), 'Visitatore 12');
  assert.deepEqual(nextVisitor(null, '2026-11-14'), { n: 1, saved: { day: '2026-11-14', n: 1 } });
  assert.deepEqual(nextVisitor({ day: '2026-11-14', n: 11 }, '2026-11-14'), { n: 12, saved: { day: '2026-11-14', n: 12 } });
  assert.equal(nextVisitor({ day: '2026-11-13', n: 40 }, '2026-11-14').n, 1, 'giorno nuovo: da capo');
  assert.equal(peekVisitor({ day: '2026-11-14', n: 4 }, '2026-11-14'), 5);
  // in fiera contro la CPU batte sempre il visitatore, anche con «Alternata»; in due resta la regola del pannello
  assert.deepEqual(matchServe({ rule: 'alternata', mode: 'cpu', first: 'opponent', fair: true }), { server: 'player', fixed: true });
  assert.deepEqual(matchServe({ rule: 'alternata', mode: 'split', first: 'opponent', fair: true }), { server: 'opponent', fixed: false });
  assert.deepEqual(matchServe({ rule: 'alternata', mode: 'cpu', first: 'opponent' }), { server: 'opponent', fixed: false }, 'fuori dalla fiera come prima');
});

// mondo della fiera: telefono 1 (e 2) dello stand abbinati, finti (senza rete), che rispondono come la pagina vera
async function fairWorld({ cal = 'play', two = false } = {}){
  const w = await playWorld({ cal, mode: null }), { E, ui } = w;
  localStorage.setItem(gameStoreKey('p1'), PAIRED);
  const stand = P => { P.useStand = function(slot){ this.standSlot = slot || null; return Promise.resolve(this); }; return P; };
  stand(ui.phone);
  let l2 = null;
  if (two){ localStorage.setItem(gameStoreKey('p2'), PAIRED2); const s = secondPhone(E, NatpfPhoneRacket); stand(s.P2); l2 = s.l2; }
  ui.fiera.setOn(true);
  w.advance(300);
  ui.lobby.go('menu'); w.advance(300);
  return { ...w, l2 };
}

test('B41.4 · pannello: «Modalità fiera» accesa e salvata (calibrazione su «Giocando»), si apre «Telefoni dello stand»; «Telefono» apre il foglio e non scollega', async () => {
  const w = await playWorld({ cal: 'gesti', mode: null }), { ui, link } = w, K = ui.kiosk;
  localStorage.setItem(gameStoreKey('p1'), PAIRED);
  ui.phone.useStand = function(slot){ this.standSlot = slot || null; return Promise.resolve(this); };
  K.open(); K.paint();
  assert.equal($('natpf-staff').querySelector('[data-staff="fiera"] b').textContent, 'No');
  K.run('fiera');
  assert.equal(ui.fiera.on, true);
  assert.equal(localStorage.getItem(FAIR_MODE_KEY), '1', 'resta salvata');
  assert.equal(localStorage.getItem(CAL_MODE_KEY), 'play', 'calibrazione «Giocando»: scambi di prova per ogni visitatore');
  assert.ok(ui.fieraSheet.isOpen && !K.isOpen, 'si apre «Telefoni dello stand» al posto del pannello');
  assert.ok(ui.staffOpen(), 'foglio dello staff: la partita resta ferma');
  assert.equal(ui.phone.standSlot, 'p1', 'il posto abbinato diventa il telefono dello stand');
  // Esc torna al pannello; «Telefono» (ora «Telefoni dello stand ›») riapre il foglio, senza scollegare niente
  key('Escape');
  assert.ok(!ui.fieraSheet.isOpen && K.isOpen);
  K.paint();
  assert.match($('natpf-staff').querySelector('[data-staff="phone"] b').textContent, /^1 .* · 2 da abbinare ›$/);
  assert.equal($('natpf-staff').querySelector('[data-staff="fiera"] b').textContent, 'Sì');
  const forgets = []; ui.phone.forget = () => forgets.push(1);
  assert.equal(K.needsConfirm('phone'), false);
  K.press({ dataset: { staff: 'phone' } });
  assert.ok(ui.fieraSheet.isOpen, 'foglio aperto'); assert.equal(forgets.length, 0, 'niente scollegato');
  assert.ok(link.connected);
  ui.fieraSheet.close();
  // spenta: torna il menu di sempre, e «Telefono» scollega come prima
  K.run('fiera');
  assert.equal(ui.fiera.on, false); assert.equal(localStorage.getItem(FAIR_MODE_KEY), '0');
  assert.equal(ui.lobby.step, 'menu');
  K.run('phone'); assert.equal(forgets.length, 1);
  forgetCalMode();
});

test('B41.4 · foglio: «Abbina» apre il QR di un posto alla volta; «Conferma» solo con un clic vero; «Scollega» in due clic; chiuso, il QR non vale più', async () => {
  const w = await fairWorld({ two: true }), { ui } = w, S = ui.fieraSheet, F = ui.fiera;
  const calls = [];
  // (come link.standPairing: il posto dice «in abbinamento» subito)
  const L = slot => F.phone(slot, { make: false }).link.L;
  F.openPairing = async slot => { calls.push(['open', slot]); L(slot).stand = { slot, paired: true, pairing: true, request: null }; return true; };
  F.closePairing = slot => { calls.push(['close', slot]); L(slot).stand = { slot, paired: true, pairing: false, request: null }; return true; };
  F.confirm = (slot, ev) => { calls.push(['confirm', slot, !!ev?.isTrusted]); return ev?.isTrusted === true; };
  F.forget = slot => { calls.push(['forget', slot]); return true; };
  S.open();
  await S.act('pair', 'p1');
  assert.equal(S.pairing, 'p1');
  await S.act('pair', 'p2');
  assert.deepEqual(calls.slice(0, 3), [['open', 'p1'], ['close', 'p1'], ['open', 'p2']], 'un posto alla volta');
  // «Conferma» dal codice (telecomando, script): rifiutata; clic vero: abbinato
  assert.equal(await S.act('confirm', 'p2', { isTrusted: false }), false);
  assert.equal(await S.act('confirm', 'p2', mkEvent('click', null)), false);
  assert.equal(await S.act('confirm', 'p2', { isTrusted: true }), true);
  // «Scollega»: il primo clic vero arma, il secondo (dopo mezzo secondo) scollega; dal codice subito
  const btn = { textContent: 'Scollega', classList: { add(){}, remove(){} }, querySelector: () => null, setAttribute(){}, removeAttribute(){} };
  assert.equal(await S.act('forget', 'p1', { isTrusted: true }, btn), false);
  assert.ok(!calls.some(c => c[0] === 'forget'));
  w.advance(600);
  assert.equal(await S.act('forget', 'p1', { isTrusted: true }, btn), true);
  assert.deepEqual(calls.filter(c => c[0] === 'forget'), [['forget', 'p1']]);
  await S.act('pair', 'p1');
  S.close();
  assert.deepEqual(calls.at(-1), ['close', 'p1'], 'foglio chiuso: il QR non vale più');
  assert.ok(!S.isOpen && ui.kiosk.isOpen, 'si torna al pannello');
  // «Conferma» fuori dalla portata del telecomando: nella pagina ha data-no-remote, che il telecomando salta e non preme
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/data-fiera-act="confirm" data-slot="p[12]" data-no-remote/g) || []).length, 2);
  assert.ok(NO_REMOTE.includes('[data-no-remote]'));
  const sheetHtml = html.slice(html.indexOf('id="natpf-fiera"'), html.indexOf('id="natpf-fiera-alert"'));
  assert.ok(!/<a\b|target="_blank"/.test(sheetHtml), 'nel foglio nessun link');
  // strato del telecomando: fuoco tra i pulsanti, Indietro torna al pannello
  const s = { controller: 'phone', phone: { connected: true }, lobby: { visible: true, step: 'match', mode: 'cpu' }, fiera: true, fair: true };
  const scr = remoteScreen(s);
  assert.deepEqual([scr.id, scr.label, scr.nav], ['fiera', 'Telefoni dello stand', 'focus']);
  assert.ok(LAYERS.indexOf('fiera') > LAYERS.indexOf('staff'));
  ui.fieraSheet.open(); ui.kiosk.close();
  const out = ui.remote._nav({ id: 'fiera', nav: 'focus' }, { kind: 'back' });
  assert.ok(out.ok && !ui.fieraSheet.isOpen && ui.kiosk.isOpen);
});

test('B41.5 · pagina della fiera al posto del menu: contro la CPU, «Gioca» → scambi di prova → conto → partita, il visitatore numerato, batte sempre lui', async () => {
  const w = await fairWorld(), { E, ui, lobby } = w;
  w.hud._setDifficultySelection = l => { w.hud.selectedDifficulty = l; };
  assert.deepEqual([lobby.step, lobby.mode, $('title-modal').dataset.fair], ['match', 'cpu', '1'], 'il menu è la pagina della fiera');
  lobby.paint();
  assert.equal($('lobby-t-match').textContent, 'Chi gioca?');
  assert.ok(!visible('lobby-back') && !visible('lobby-warmup'), 'niente «‹ Indietro» né «Riscaldati prima»');
  assert.equal($('btn-start-match').disabled, false, 'Telefono 1 dello stand pronto: si può giocare');
  lobby.back(); assert.equal(lobby.step, 'match', 'Esc non porta via dalla pagina');
  assert.equal(ui.fiera.visitorLabel(), 'Visitatore 1');
  // «Bambino», poi «Gioca»: gli scambi di prova (non la pagina dopo: si gioca), poi il conto e la partita
  lobby.setLevel('bambini');
  E.natpfServeRule = undefined; localStorage.setItem('natpf-tennis.battuta', 'alternata'); E.natpfServeFirst = 'opponent';
  assert.equal(w.pressStart(), false, 'prima gli scambi di prova');
  assert.ok(ui.trial.active && !ui.trial.S.toPage, 'scambi di prova che portano alla partita');
  assert.equal(ui.events.nickname, 'Visitatore 1', 'numero del visitatore preso con la prima partita');
  playTrial(w, (id, n, want) => stroke({ dir: want }), { gioca: false });
  assert.ok(!ui.trial.active && !lobby.visible && E.natpfMatchSeq === 1, 'partita partita senza ripassare dalla pagina');
  assert.ok(ui.prematch.active, 'conto alla rovescia grande');
  assert.deepEqual([E.score.server, E.score.fixed], ['player', true], 'in fiera batte sempre il visitatore, anche con «Alternata»');
  w.advance(3200);
  E.matchConfig.gamesToWin = 1;
  for (let i = 0; i < 4; i++) E._awardPoint('opponent', 'Out');
  w.advance(2600);
  assert.ok(visible('victory-modal'));
  ui._paintVictory();
  assert.equal($('btn-new-player').textContent, 'Prossimo giocatore ›');
  assert.ok(!visible('btn-return-title'), 'niente «Menu» in fiera');
  // la classifica del giorno ha il visitatore numerato
  assert.equal(ui.events.topMatches(5)[0]?.nick, 'Visitatore 1');
  localStorage.removeItem('natpf-tennis.battuta');
});

test('B41.5 · «Prossimo giocatore»: nome, mano, livello, profilo e numero da capo; i telefoni restano collegati; si torna alla pagina della fiera', async () => {
  const w = await fairWorld({ two: true }), { E, ui, lobby, link, l2 } = w;
  w.hud._setDifficultySelection = l => { w.hud.selectedDifficulty = l; };
  lobby.setLevel('casual');
  ui.events.nickname = visitorName(ui.fiera.claimVisitor());
  ui.hand.set('left'); E.natpfPhone2.setHand('left');
  ui.split.setBand('p2', 'bambino');
  const resets = { p1: 0, p2: 0 };
  for (const [id, P] of [['p1', ui.phone], ['p2', E.natpfPhone2]]){ const r = P.resetPlayer.bind(P); P.resetPlayer = o => { resets[id]++; return r(o); }; }
  const forgets = []; ui.phone.forget = () => forgets.push('p1'); E.natpfPhone2.forget = () => forgets.push('p2');
  lobby.go('connect');
  assert.equal(ui.newPlayer(), 'fiera');
  assert.deepEqual([lobby.visible, lobby.step, $('title-modal').dataset.fair], [true, 'match', '1'], 'pagina della fiera');
  assert.deepEqual([ui.events.nickname, ui.events.guest], ['', false]);
  assert.deepEqual([ui.hand.hand, E.natpfPhone2.hand], ['right', 'right'], 'destri tutti e due (B46, causa «fiera»)');
  assert.equal(lobby.cpuLevel, 'evento', '«Chi gioca» torna Adulto');
  assert.equal(E.natpfSplitBands.p2, 'adulto');
  assert.deepEqual(resets, { p1: 1, p2: 1 }, 'quello che i telefoni hanno imparato, da capo');
  assert.deepEqual(forgets, [], 'nessun telefono scollegato');
  assert.ok(link.connected && l2.connected);
  assert.equal(ui.fiera.visitor, null);
  assert.equal(ui.fiera.visitorLabel(), 'Visitatore 2', 'chi arriva avrà il numero dopo');
  assert.ok(!ui.phone.tutWait, 'nessun tutorial da aspettare');
  // il chiosco in fiera fa lo stesso (niente forget), e alla pagina della fiera senza visitatore non riazzera di continuo
  ui.events.nickname = 'Marco';
  ui.kiosk.reset();
  assert.deepEqual([ui.events.nickname, lobby.step, forgets.length], ['', 'match', 0]);
  ui.kiosk.enabled = true; ui.kiosk.last = performance.now() - 3600*1000;
  let n = 0; const r = ui.kiosk.reset.bind(ui.kiosk); ui.kiosk.reset = () => { n++; r(); };
  ui.kiosk.check(); assert.equal(n, 0, 'a riposo');
  // due giocatori: la scelta resta, la pagina diventa quella dello stesso schermo
  ui.fieraPage.setPlay('split');
  assert.deepEqual([lobby.mode, lobby.step, localStorage.getItem(FAIR_PLAY_KEY)], ['split', 'match', 'split']);
  lobby.paint();
  assert.equal($('lobby-t-match').textContent, 'Chi gioca? Una fascia per ciascuno');
  ui.fieraPage.setPlay('cpu');
  // telecomando: «Prossimo giocatore» al posto di «Nuovo giocatore», la pagina della fiera ha il suo nome
  $('natpf-phone-hold').classList.add('hidden');      // (nel mondo di prova il riquadro esiste già, nella pagina nasce nascosto)
  const snap = { ...ui.remote.snapshot() };
  assert.equal(snap.fair, true);
  const { labels } = remoteCommands(snap, remoteScreen(snap));
  assert.equal(labels.newplayer, 'Prossimo giocatore');
  assert.equal(remoteScreen(snap).label, 'Pagina della fiera');
  const msg = await new Promise(res => ui.remote._onCmd({ c: 'newplayer', y: true, reply: res }));
  assert.match(msg.msg, /Prossimo giocatore: pagina della fiera/);
  // visitatori di oggi salvati: domani si riparte da 1
  const saved = JSON.parse(localStorage.getItem(VISITOR_KEY));
  assert.deepEqual(saved, { day: dayKey(), n: 1 });
});

test('B41.5 · pagina della fiera con il Telefono 1 non pronto: «Gioca» spento con il perché, niente QR, il foglio per sistemarlo', async () => {
  const w = await fairWorld(), { ui, lobby, link } = w;
  link.connected = false; link.ready = false; link.L = { state: 'lost', phone: null };
  lobby.paint();
  assert.equal($('btn-start-match').disabled, true);
  assert.match($('fiera-phones-text').textContent, /Telefono 1 scollegato: si ricollega da solo/);
  assert.equal(ui.phone.pairingUrl, null, 'nessun QR');
  // (il clic arriva lo stesso, per esempio dal codice): il foglio dello staff, mai il pannello del telefono con il QR
  $('btn-start-match').disabled = false;
  w.pressStart();
  assert.ok(ui.fieraSheet.isOpen && !visible('natpf-phone-modal'));
  assert.equal(ui.events.nickname, '', 'nessun numero preso senza partita');
});

test('B41.4 · avviso della batteria sul ledwall: telefono dello stand collegato sotto il 20 % e non in carica', async () => {
  const w = await fairWorld(), { ui, link } = w;
  link.L = { ...link.L, battery: 14, charging: false };
  ui.fiera._alertAt = 0; ui.fiera.tick();
  assert.equal($('natpf-fiera-alert').textContent, 'Telefono 1: batteria 14% · mettilo in carica');
  assert.ok(visible('natpf-fiera-alert'));
  link.L = { ...link.L, charging: true };
  ui.fiera._alertAt = 0; ui.fiera.tick();
  assert.ok(!visible('natpf-fiera-alert'), 'in carica: niente avviso');
  ui.fiera.setOn(false); link.L = { ...link.L, charging: false };
  ui.fiera._alertAt = 0; ui.fiera.tick();
  assert.ok(!visible('natpf-fiera-alert'), 'modalità spenta: niente avviso');
});
