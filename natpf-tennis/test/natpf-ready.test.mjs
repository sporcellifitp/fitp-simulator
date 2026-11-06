// Stato «pronto» dei giocatori nel 1v1 (B9, punto 4; natpf_ready.js): quattro stati con parola e dettaglio, schede dello
// stesso schermo dallo stato del telefono (compreso il tutorial aperto), chi manca, conto alla rovescia che parte, scatta
// una volta sola, si annulla e riparte da capo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { READY_STATES, READY_BADGE, READY_COUNTDOWN_MS, slotView, splitSlot, startGate, waitingText, bothNames, cancelText, createCountdown, paintSlot, paintBoard } from '../src/natpf/natpf_ready.js';
import { splitPlayerStatus, splitCamStatus } from '../src/natpf/natpf_split_ui.js';

test('scheda: quattro stati con parola, nome o Player 1/2, «tu», stato sconosciuto = in attesa', () => {
  assert.deepEqual(READY_STATES, ['off', 'prep', 'ready', 'ko']);
  assert.deepEqual(Object.values(READY_BADGE), ['In attesa', 'Si prepara', 'Pronto', 'Problema']);
  assert.equal(READY_COUNTDOWN_MS, 3000);
  const v = slotView({ id: 'p2', name: '  ', state: 'ready', detail: 'Calibrato' });
  assert.equal(v.name, 'Player 2'); assert.equal(v.badge, 'Pronto'); assert.equal(v.cls, 'is-ready'); assert.equal(v.detail, 'Calibrato');
  assert.equal(v.aria, 'Player 2: Pronto, Calibrato');
  const me = slotView({ id: 'p2', name: 'Bea', you: true, state: 'prep', detail: 'Calibrazione' });
  assert.equal(me.aria, 'Bea (tu): Si prepara, Calibrazione');
  assert.equal(slotView({ state: 'boh' }).state, 'off'); assert.equal(slotView({}).name, 'Player 1');
  assert.equal(slotView({ state: 'ko', badge: 'Scollegato' }).badge, 'Scollegato', 'parola del problema');
});

test('stesso schermo: dallo stato del telefono alla scheda (QR, tutorial, sensori, calibrazione, pronto, perso, errori)', () => {
  const p = { link: {}, state: { state: 'waiting' }, connected: false, ready: false, calView: { stage: 'off' } };
  assert.deepEqual(splitSlot(splitPlayerStatus(p)), { state: 'off', detail: 'Inquadra il QR' });
  assert.deepEqual(splitSlot(splitPlayerStatus({ link: null })), { state: 'off', detail: 'Preparo il QR' });
  // collegato, tutorial aperto nella sua metà: «si prepara · Tutorial 4/11» (prima: «Tocca «Attiva i sensori»» con i
  // sensori già attivi)
  Object.assign(p, { connected: true, state: { state: 'connected', phone: 'cal' } });
  const tut = splitPlayerStatus(p, 'right', { tut: { i: 4, n: 11 } });
  assert.equal(tut.state, 'tut'); assert.match(tut.title, /tutorial/i); assert.match(tut.sub, /Scheda 4 di 11.*ho capito/);
  assert.deepEqual(splitSlot(tut), { state: 'prep', detail: 'Tutorial 4/11' });
  assert.equal(splitPlayerStatus(p, 'right', { tut: { i: 40, n: 11 } }).detail, 'Tutorial 11/11', 'scheda entro il numero di schede');
  // telefono pronto ma con il tutorial aperto (abbinamento nuovo di un telefono già calibrato): non ancora pronto
  assert.equal(splitSlot(splitPlayerStatus({ ...p, ready: true, state: { state: 'connected', phone: 'ready' } }, 'right', { tut: { i: 1, n: 11 } })).state, 'prep');
  // calibrazione
  p.calView = { stage: 'gesture', want: 'L', ready: true, idx: 0, total: 2 };
  assert.deepEqual(splitSlot(splitPlayerStatus(p)), { state: 'prep', detail: 'Calibrazione' });
  p.state = { state: 'connected', phone: 'sensors' };
  assert.deepEqual(splitSlot(splitPlayerStatus(p)), { state: 'prep', detail: 'Attiva i sensori' });
  // pronto: calibrato o senza calibrazione
  Object.assign(p, { ready: true, state: { state: 'connected', phone: 'ready' } });
  assert.deepEqual(splitSlot(splitPlayerStatus(p)), { state: 'ready', detail: 'Calibrato' });
  p.simple = true; assert.equal(splitSlot(splitPlayerStatus(p)).detail, 'Senza calibrazione');
  // sensori negati, collegamento non disponibile, telefono perso: problema
  assert.deepEqual(splitSlot(splitPlayerStatus({ ...p, ready: false, state: { state: 'connected', phone: 'denied' } })), { state: 'ko', detail: 'Sensori non disponibili' });
  assert.equal(splitSlot(splitPlayerStatus({ link: {}, state: { state: 'error', error: 'rete' } })).state, 'ko');
  const lost = splitPlayerStatus({ link: {}, connected: false, state: { state: 'lost', phone: null } });
  assert.equal(lost.state, 'qr', 'la metà mostra di nuovo il QR'); assert.equal(lost.lost, true);
  assert.deepEqual(splitSlot(lost), { state: 'ko', detail: 'Telefono scollegato', badge: 'Scollegato' });
});

test('stesso schermo con una webcam per due: webcam spenta, mano cercata, mano vista, errore', () => {
  assert.deepEqual(splitSlot(splitCamStatus({})), { state: 'off', detail: 'Webcam spenta' });
  assert.deepEqual(splitSlot(splitCamStatus({ active: true })), { state: 'prep', detail: 'Alza la mano' });
  assert.deepEqual(splitSlot(splitCamStatus({ active: true, seen: true })), { state: 'ready', detail: 'Mano vista' });
  assert.deepEqual(splitSlot(splitCamStatus({ error: { badge: 'Webcam negata', text: '…' } })), { state: 'ko', detail: 'Webcam negata' });
});

test('si parte? tutti pronti; chi manca e perché il conto si è fermato, senza aggettivi da accordare con il nome', () => {
  const g = slotView({ id: 'p1', name: 'Giulia', state: 'prep', detail: 'Tutorial 3/11' });
  const m = slotView({ id: 'p2', name: 'Marco', state: 'off', detail: 'Inquadra il QR' });
  const ok = id => slotView({ id, name: id === 'p1' ? 'Giulia' : 'Marco', state: 'ready', detail: 'Calibrato' });
  assert.equal(startGate([ok('p1'), ok('p2')]).both, true);
  assert.equal(startGate([]).both, false, 'nessuno non è «tutti pronti»');
  const gate = startGate([g, m]);
  assert.equal(gate.both, false); assert.deepEqual(gate.waiting.map(w => w.name), ['Giulia', 'Marco']);
  assert.equal(waitingText(gate.waiting), 'Aspetto Giulia (tutorial 3/11) e Marco (inquadra il QR)', 'QR resta maiuscolo');
  assert.equal(waitingText(startGate([ok('p1'), m]).waiting), 'Aspetto Marco (inquadra il QR)');
  assert.equal(waitingText([]), '');
  assert.equal(bothNames([g, m]), 'Giulia e Marco');
  const lost = slotView({ id: 'p2', name: 'Marco', state: 'ko', badge: 'Scollegato', detail: 'Telefono scollegato' });
  assert.equal(cancelText([ok('p1'), lost]), 'Conto annullato · Marco: telefono scollegato');
  assert.equal(cancelText([ok('p1'), slotView({ id: 'p2', name: 'Marco', state: 'prep', detail: 'Tutorial 1/11' })]), 'Conto annullato · Marco: tutorial 1/11');
  assert.equal(cancelText([ok('p1'), ok('p2')]), 'Conto fermato');
});

test('conto alla rovescia: 3, 2, 1, scatta una volta sola; annullato se uno non è più pronto, poi riparte da capo', () => {
  const c = createCountdown();
  assert.deepEqual(c.update(false, 0), { left: 0, fire: false, running: false, cancelled: false }, 'fermo: niente da annullare');
  assert.deepEqual(c.update(true, 1000), { left: 3, fire: false, running: true, cancelled: false });
  assert.equal(c.running, true);
  assert.equal(c.update(true, 2100).left, 2); assert.equal(c.update(true, 3050).left, 1);
  assert.equal(c.update(true, 3999).left, 1);
  const r = c.update(true, 4000);
  assert.equal(r.fire, true); assert.equal(c.running, false);
  for (const t of [4100, 6000, 9000]) assert.equal(c.update(true, t).fire, false, 'una volta sola');
  // uno non è più pronto a conto in corso: annullato (una volta), poi riparte da 3
  c.update(false, 9100);
  assert.equal(c.update(true, 10000).left, 3);
  c.update(true, 11500);
  const x = c.update(false, 11600);
  assert.equal(x.cancelled, true); assert.equal(x.running, false);
  assert.equal(c.update(false, 11700).cancelled, false, 'annullato una volta sola');
  assert.equal(c.update(true, 20000).left, 3, 'da capo, non da dove era');
  assert.equal(c.update(true, 22999).fire, false); assert.equal(c.update(true, 23000).fire, true);
  // reset («Aspetta»): niente annullamento, si riparte da capo
  c.update(true, 30000); c.update(true, 30500); c.reset();
  assert.equal(c.update(true, 31000).left, 3);
  assert.equal(createCountdown({ ms: 5000 }).update(true, 0).left, 5, 'durata a scelta');
});

test('disegno della scheda: classi e testi cambiano solo quando lo stato cambia (l\'animazione di «Pronto» parte una volta)', () => {
  const kids = {};
  const cls = new Set(), toggles = [];
  const el = { dataset: {}, title: '', classList: { toggle(c, on){ toggles.push(c); on ? cls.add(c) : cls.delete(c); } }, querySelector: s => (kids[s] ||= { textContent: '', classList: { toggle(){}, } }) };
  paintSlot(el, slotView({ id: 'p1', name: 'Giulia', state: 'ready', detail: 'Calibrato' }));
  assert.deepEqual([...cls], ['is-ready']); assert.equal(el.dataset.ready, 'ready');
  assert.equal(kids['[data-ready-name]'].textContent, 'Giulia'); assert.equal(kids['[data-ready-word]'].textContent, 'Pronto');
  assert.equal(kids['[data-ready-detail]'].textContent, 'Calibrato'); assert.equal(el.title, 'Giulia: Pronto, Calibrato');
  const n = toggles.length;
  paintSlot(el, slotView({ id: 'p1', name: 'Giulia', state: 'ready', detail: 'Calibrato' }));
  assert.equal(toggles.length, n, 'stesso stato: classi non toccate');
  paintSlot(el, slotView({ id: 'p1', name: 'Giulia', state: 'ko', detail: 'Telefono scollegato' }));
  assert.deepEqual([...cls], ['is-ko']);
  paintSlot(null, null); // niente elemento: niente errori
  // tabellone: struttura scritta una volta, poi solo le schede
  const board = { dataset: {}, innerHTML: '', querySelector: () => null };
  paintBoard(board, [slotView({ id: 'p1' }), slotView({ id: 'p2' })]);
  assert.match(board.innerHTML, /data-ready-slot="p1"[\s\S]*data-ready-slot="p2"/); assert.match(board.innerHTML, /data-p="p2"/);
  board.innerHTML = 'segno'; paintBoard(board, [slotView({ id: 'p1' }), slotView({ id: 'p2' })]);
  assert.equal(board.innerHTML, 'segno', 'stesse schede: niente da riscrivere');
});
