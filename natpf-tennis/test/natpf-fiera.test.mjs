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
