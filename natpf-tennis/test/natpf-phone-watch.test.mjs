// Telefono in partita (natpf_phone_watch.js): pausa appena il telefono non è utilizzabile (scollegato, pagina nascosta,
// sensori fermi a collegamento vivo), ripresa solo dopo un tratto regolare e con il conto alla rovescia, punto rigiocato
// se la pausa è arrivata nello scambio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneHealth, createPhoneWatch, holdText, WATCH } from '../src/natpf/natpf_phone_watch.js';

const ok = { connected: true, phone: 'ready', vis: true, rates: { fo: { ageMs: 16 }, bin: { ageMs: 20 } } };
test('salute del telefono: collegamento, telefono pronto, pagina in primo piano, sensori che arrivano', () => {
  assert.deepEqual(phoneHealth(ok), { ok: true, why: null });
  assert.equal(phoneHealth({ ...ok, connected: false }).why, 'scollegato');
  assert.equal(phoneHealth({ ...ok, phone: 'cal' }).why, 'non pronto');
  assert.equal(phoneHealth({ ...ok, vis: false }).why, 'pagina nascosta');
  // collegato ma muto: nessun dato dei sensori da oltre 0,4 s (basta uno stream vivo)
  assert.equal(phoneHealth({ ...ok, rates: { fo: { ageMs: 900 }, bin: { ageMs: 1200 } } }).why, 'sensori fermi');
  assert.equal(phoneHealth({ ...ok, rates: { fo: { ageMs: 900 }, bin: { ageMs: 30 } } }).ok, true);
  // telefono di prima senza stream: non si giudica; con i tocchi non ci sono sensori da aspettare
  assert.equal(phoneHealth({ ...ok, rates: {} }).ok, true);
  assert.equal(phoneHealth({ ...ok, touch: true, rates: { fo: { ageMs: 9000 } } }).ok, true);
  for (const w of ['scollegato', 'non pronto', 'pagina nascosta', 'sensori fermi']) assert.ok(holdText(w).length > 20);
});

test('pausa subito, ripresa dopo un tratto regolare con il conto alla rovescia 3-2-1, punto rigiocato se era nello scambio', () => {
  const w = createPhoneWatch(), acts = [];
  let now = 0;
  const step = (h, opts = {}, ms = 50, n = 1) => { for (let i = 0; i < n; i++){ const a = w.update(h, { inField: true, now, ...opts }); if (a) acts.push({ ...a, now }); now += ms; } };
  step({ ok: true }, { rally: true }, 50, 10);
  assert.equal(acts.length, 0);
  step({ ok: false, why: 'pagina nascosta' }, { rally: true });
  assert.deepEqual(acts.at(-1), { kind: 'pause', why: 'pagina nascosta', now: 500 }, 'pagina nascosta: pausa subito');
  step({ ok: false, why: 'pagina nascosta' }, {}, 50, 20);                 // nessuna azione ripetuta
  assert.equal(acts.length, 1);
  step({ ok: false, why: 'scollegato' });                                   // il motivo cambia: lo si dice
  assert.equal(acts.at(-1).kind, 'wait'); assert.equal(acts.at(-1).why, 'scollegato');
  // di nuovo regolare: il conto alla rovescia parte solo dopo steadyMs
  const back = now;
  step({ ok: true }, {}, 50, Math.ceil(WATCH.steadyMs/50) - 1);
  assert.equal(acts.at(-1).kind, 'wait');
  step({ ok: true }, {}, 50, 80);
  const cd = acts.filter(a => a.kind === 'countdown');
  assert.deepEqual(cd.map(a => a.left), [3, 2, 1]);
  assert.ok(cd[0].now - back >= WATCH.steadyMs);
  const resume = acts.find(a => a.kind === 'resume');
  assert.ok(resume && resume.replay === true, 'il punto si rigioca');
  assert.ok(resume.now - cd[0].now >= WATCH.countdownMs - 60);
  assert.equal(w.state, 'ok');
});

test('un\'interruzione durante il conto alla rovescia riporta in pausa; fuori dal campo la pausa del telefono finisce', () => {
  const w = createPhoneWatch();
  let now = 0;
  w.update({ ok: false, why: 'sensori fermi' }, { inField: true, now, rally: false });
  now = WATCH.graceMs; w.update({ ok: false, why: 'sensori fermi' }, { inField: true, now });   // oltre la tolleranza: pausa
  assert.equal(w.state, 'paused');
  for (now += 50; now < 1000 + WATCH.graceMs; now += 50) w.update({ ok: true }, { inField: true, now });
  assert.equal(w.state, 'countdown');
  const a = w.update({ ok: false, why: 'sensori fermi' }, { inField: true, now: now + 50 });
  assert.equal(a.kind, 'wait'); assert.equal(w.state, 'paused');
  const out = w.update({ ok: false, why: 'sensori fermi' }, { inField: false, now: now + 100 });
  assert.deepEqual(out, { kind: 'resume', replay: false }); assert.equal(w.state, 'ok');
  // fuori dal campo un telefono che si ferma non mette in pausa
  assert.equal(w.update({ ok: false, why: 'scollegato' }, { inField: false, now: now + 200 }), null);
});

test('ricollegamento lampo: un problema più breve della tolleranza non mette in pausa; oltre sì', () => {
  const w = createPhoneWatch();
  assert.equal(w.update({ ok: false, why: 'scollegato' }, { inField: true, now: 0, rally: true }), null);
  assert.equal(w.update({ ok: false, why: 'scollegato' }, { inField: true, now: WATCH.graceMs - 50, rally: false }), null);
  assert.equal(w.update({ ok: true }, { inField: true, now: WATCH.graceMs - 10 }), null);
  assert.equal(w.state, 'ok');
  w.update({ ok: false, why: 'sensori fermi' }, { inField: true, now: 1000, rally: true });
  const a = w.update({ ok: false, why: 'sensori fermi' }, { inField: true, now: 1000 + WATCH.graceMs, rally: false });
  assert.deepEqual(a, { kind: 'pause', why: 'sensori fermi' });
  assert.equal(w.replay, true, 'lo scambio era in corso quando il problema è iniziato');
});
