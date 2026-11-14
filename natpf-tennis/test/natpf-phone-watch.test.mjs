// Telefono in partita (natpf_phone_watch.js): pausa appena il telefono non è utilizzabile (scollegato, pagina nascosta,
// sensori fermi a collegamento vivo), ripresa solo dopo un tratto regolare e con il conto alla rovescia, punto rigiocato
// se la pausa è arrivata nello scambio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneHealth, createPhoneWatch, holdText, phoneHoldText, phoneHoldView, holdHead, telLabel, PANEL_AFTER_MS, WATCH } from '../src/natpf/natpf_phone_watch.js';

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

// B9 (05/11): schermo del telefono spento. La pausa dice da quanto (aggiornata ogni secondo dal computer) e che si riprende
// da solo; se il collegamento cade con lo schermo spento non si chiede il QR (il telefono si ricollega da solo)
test('pausa per lo schermo spento: da quanto, e cosa fare; collegamento caduto con lo schermo spento', () => {
  assert.match(holdText('pagina nascosta'), /^Schermo del telefono spento[^:]*: riaccendi/);
  assert.doesNotMatch(holdText('pagina nascosta', { hiddenMs: 400 }), / da \d+ s/, 'meno di un secondo: niente durata');
  assert.match(holdText('pagina nascosta', { hiddenMs: 12400 }), / da 12 s: /);
  assert.match(holdText('scollegato', { wasHidden: true, hiddenMs: 7000 }), /schermo spento da 7 s: riaccendilo.*si ricollega da solo/);
  // (B45.1: scollegato a schermo acceso: si ricollega da solo con la sua chiave, il QR solo se la pagina è chiusa)
  assert.match(holdText('scollegato'), /^Il telefono si ricollega da solo appena torna la rete/);
  const p = { state: { vis: false, hiddenAt: 1000 } };
  assert.match(phoneHoldText(p, 'pagina nascosta', 31000), / da 30 s/);
  assert.doesNotMatch(phoneHoldText({ state: { vis: true } }, 'scollegato', 5000), /schermo spento/);
});

// B45.1 «telefono che non si scollega» (urgenza della fiera del 14/11: «la ledwall si disconnette e dice "scollegato"»): con
// il telefono che tace (buco della Wi-Fi tra la folla) il riquadro della pausa dice «segnale debole, aspetto che torni…»
// finché il controllo di vita non chiude (10 s), poi «scollegato · si ricollega da solo» con da quanto tace; niente «Riattiva
// i sensori» (non sono i sensori) e il pannello con il QR solo dopo PANEL_AFTER_MS
test('B45.1 · telefono che tace: «segnale debole, aspetto che torni…», poi «scollegato · si ricollega da solo» con il tempo', () => {
  const stale = { fo: { ageMs: 3000 }, bin: { ageMs: 3100 } };
  const silent = phoneHealth({ connected: true, phone: 'ready', vis: true, rates: stale, sensorAge: 30, beatAgeMs: WATCH.beatMs + 300, rtt: 9 });
  assert.deepEqual([silent.ok, silent.why, silent.silent, silent.answers], [false, 'segnale debole', true, false]);
  // sensori fermi sul telefono (segnale recente, campioni vecchi): resta «sensori fermi» con «Riattiva i sensori»
  assert.equal(phoneHealth({ connected: true, phone: 'ready', vis: true, rates: stale, sensorAge: 5000, beatAgeMs: 300 }).why, 'sensori fermi');
  assert.match(holdText('sensori fermi'), /Riattiva i sensori/);
  assert.doesNotMatch(holdText('segnale debole'), /Riattiva|QR|scollegat/i);
  // titoli: «Telefono 1» fuori dallo stesso schermo, il nome dentro
  assert.equal(holdHead('segnale debole'), 'Telefono 1: segnale debole, aspetto che torni…');
  assert.equal(holdHead('segnale debole', { name: 'Giulia', slot: 'p2' }), 'Telefono di Giulia: segnale debole, aspetto che torni…');
  assert.equal(holdHead('scollegato'), 'Telefono 1 scollegato · si ricollega da solo');
  assert.equal(holdHead('scollegato', { wasHidden: true }), 'Telefono in pausa', 'schermo spento: il testo di sempre');
  assert.equal(holdHead('pagina nascosta'), 'Telefono in pausa');
  assert.equal(telLabel('', 'p2'), 'Telefono 2'); assert.equal(telLabel('Player 2', 'p2'), 'Telefono del Player 2');
  // da quanto tace (dal suo ultimo segnale), aggiornato a ogni lettura
  const p = { state: { vis: true, beatAt: 1000 } };
  const v = phoneHoldView(p, 'scollegato', { now: 13400 });
  assert.equal(v.title, 'Telefono 1 scollegato · si ricollega da solo');
  assert.match(v.text, /^Senza segnale da 12 s: si ricollega da solo/);
  assert.equal(v.line, 'Telefono 1 scollegato · si ricollega da solo (da 12 s)');
  assert.match(phoneHoldView(p, 'scollegato', { now: 21400 }).text, /da 20 s/);
  assert.equal(phoneHoldView(p, 'segnale debole', { now: 4000 }).line, 'Telefono 1: segnale debole, aspetto che torni…');
  assert.equal(phoneHoldView(p, 'pagina nascosta', { now: 4000 }).line, null, 'altri motivi: la riga di sempre');
  assert.ok(PANEL_AFTER_MS >= 15000, 'il pannello con il QR non subito');
});
