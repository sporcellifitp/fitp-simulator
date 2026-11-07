// Aggiornamenti del programma Windows nel gioco (07/11): stati → testi e pulsanti dell'avviso e delle Opzioni, dove
// l'avviso può comparire (mai in campo), e il flusso sull'interfaccia vera (ui-world) con un window.natpfDesktop.updates
// finto come il preload di Electron (ponte versione 2). Nel browser (senza natpfDesktop) niente avviso né sezione.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { UPDATE_STATUSES, NOTICE_STEPS, normalizeState, mb, percent, downloadedText, checkedText, statusText, noticeView, optionsView,
  noticeAllowed, NatpfUpdates } from '../src/natpf/natpf_updates.js';

const S = (status, extra = {}) => ({ status, current: '2026-11-07.3', ...extra });
const acts = v => v.buttons.map(b => b.act + ':' + b.label);

test('numeri in italiano: MB con la virgola, percentuale, scaricato su totale', () => {
  assert.equal(mb(124_880_055), '124,9 MB');
  assert.equal(mb(0), ''); assert.equal(mb(undefined), ''); assert.equal(mb(-3), '');
  assert.equal(percent(0.4234), 42); assert.equal(percent(2), 100); assert.equal(percent(-1), 0); assert.equal(percent(undefined), 0);
  assert.equal(downloadedText({ size: 124_880_055, progress: 0.42 }), '52,4 di 124,9 MB');
  assert.equal(downloadedText({ progress: 0.42 }), '', 'senza dimensione niente MB');
});

test('ultima verifica in parole', () => {
  const now = new Date(2026, 10, 7, 15, 30).getTime();
  assert.equal(checkedText(undefined, now), 'mai');
  assert.equal(checkedText(new Date(2026, 10, 7, 10, 42).getTime(), now), 'oggi alle 10:42');
  assert.equal(checkedText(new Date(2026, 10, 6, 18, 5).getTime(), now), 'ieri alle 18:05');
  assert.equal(checkedText(new Date(2026, 10, 5, 9, 3).getTime(), now), '05/11 alle 09:03');
});

test('stato sconosciuto o mancante vale «non configurati»', () => {
  assert.equal(normalizeState(null).status, 'off');
  assert.equal(normalizeState({ status: 'boh' }).status, 'off');
  for (const s of UPDATE_STATUSES) assert.equal(normalizeState({ status: s }).status, s);
});

test('stato in parole per ogni stato (Opzioni)', () => {
  const size = 124_880_055;
  assert.equal(statusText(S('off')), 'Aggiornamenti non configurati');
  assert.equal(statusText(S('idle')), 'Non ancora cercati');
  assert.equal(statusText(S('checking')), 'Ricerca in corso…');
  assert.equal(statusText(S('none')), 'Sei aggiornato');
  assert.equal(statusText(S('available', { latest: '2026-11-08.1', size })), 'Disponibile: 2026-11-08.1 · 124,9 MB');
  assert.equal(statusText(S('downloading', { latest: '2026-11-08.1', size, progress: 0.42 })), 'Download 42% · 52,4 di 124,9 MB');
  assert.equal(statusText(S('ready', { latest: '2026-11-08.1' })), 'Pronto: 2026-11-08.1');
  assert.equal(statusText(S('installing')), 'Avvio dell’installazione…');
  assert.equal(statusText(S('error', { error: 'rete assente' })), 'Errore: rete assente');
  assert.equal(statusText(S('error')), 'Errore: aggiornamento non riuscito');
});

test('avviso: solo disponibile, in download, pronto e in installazione; pulsanti giusti', () => {
  for (const s of ['off', 'idle', 'checking', 'none', 'error']) assert.equal(noticeView(S(s, { error: 'x' })), null, s);
  const a = noticeView(S('available', { latest: '2026-11-08.1', size: 124_880_055 }));
  assert.equal(a.title, 'Aggiornamento disponibile · 2026-11-08.1');
  assert.deepEqual(acts(a), ['download:Aggiorna', 'later:Più tardi']);
  assert.equal(a.buttons[0].primary, true);
  assert.match(a.sub, /124,9 MB/);
  const d = noticeView(S('downloading', { latest: '2026-11-08.1', size: 124_880_055, progress: 0.42 }));
  assert.equal(d.sub, '42% · 52,4 di 124,9 MB'); assert.equal(d.progress, 0.42);
  assert.deepEqual(acts(d), ['later:Nascondi'], 'il download continua: si può solo nascondere');
  const r = noticeView(S('ready', { latest: '2026-11-08.1' }));
  assert.equal(r.title, 'Aggiornamento pronto · 2026-11-08.1');
  assert.deepEqual(acts(r), ['install:Riavvia e aggiorna', 'later:Più tardi']);
  assert.match(r.sub, /Windows chiederà il consenso/);
  assert.deepEqual(noticeView(S('installing')).buttons, []);
  // un errore compare nell'avviso solo dopo che chi gioca l'ha toccato (non un errore della verifica all'avvio)
  const e = noticeView(S('error', { error: 'download non riuscito' }), { engaged: true });
  assert.equal(e.sub, 'download non riuscito'); assert.deepEqual(acts(e), ['check:Riprova', 'later:Chiudi']);
});

test('Opzioni: versione installata, ultima verifica, pulsanti per stato', () => {
  const now = new Date(2026, 10, 7, 15, 30).getTime(), at = new Date(2026, 10, 7, 10, 42).getTime();
  const none = optionsView(S('none', { checkedAt: at }), now);
  assert.equal(none.meta, 'Versione installata 2026-11-07.3 · ultima verifica oggi alle 10:42');
  assert.deepEqual(acts(none), ['check:Cerca aggiornamenti']);
  assert.equal(optionsView(S('checking'), now).buttons[0].disabled, true, 'durante la ricerca il pulsante è spento');
  assert.deepEqual(acts(optionsView(S('available', { latest: 'x' }), now)), ['download:Aggiorna', 'check:Cerca aggiornamenti']);
  const dl = optionsView(S('downloading', { progress: 0.5 }), now);
  assert.deepEqual(dl.buttons, []); assert.equal(dl.progress, 0.5); assert.equal(dl.state, 'Download 50%');
  const ready = optionsView(S('ready', { latest: 'x', notes: 'Correzioni del tutorial' }), now);
  assert.deepEqual(acts(ready), ['install:Riavvia e aggiorna']);
  assert.match(ready.note, /Correzioni del tutorial · Windows chiederà il consenso/);
  assert.deepEqual(acts(optionsView(S('error', { error: 'x' }), now)), ['check:Cerca aggiornamenti']);
  const off = optionsView(S('off'), now);
  assert.deepEqual(off.buttons, []); assert.equal(off.state, 'Aggiornamenti non configurati'); assert.match(off.note, /installer/);
  assert.equal(optionsView(S('installing'), now).buttons.length, 0);
});

test('l’avviso compare solo nel menu e nelle pagine di scelta, mai in campo', () => {
  for (const step of NOTICE_STEPS) assert.equal(noticeAllowed({ lobbyVisible: true, step }), true, step);
  for (const step of ['options', 'controller', 'connect', 'match', 'warmup']) assert.equal(noticeAllowed({ lobbyVisible: true, step }), false, step);
  assert.equal(noticeAllowed({ lobbyVisible: false, step: 'menu' }), false, 'menu nascosto: partita in corso');
  assert.equal(noticeAllowed({ lobbyVisible: true, step: 'menu', training: true }), false, 'Allenamento in corso');
  assert.equal(noticeAllowed({ lobbyVisible: true, step: 'menu', events: true }), false, 'minigioco in corso');
  assert.equal(noticeAllowed({ lobbyVisible: true, step: 'menu', calibra: true }), false);
  assert.equal(noticeAllowed({ lobbyVisible: true, step: 'menu', intro: true }), false);
  assert.equal(noticeAllowed({ lobbyVisible: true, step: 'menu', guest: true }), false);
});

// ponte finto come il preload (natpf-desktop/src/preload.cjs): stato, chiamate, onChange
function fakeApi(start = S('none')){
  let st = { ...start }; const cbs = [], calls = [];
  const api = {
    calls, cbs,
    async state(){ calls.push('state'); return st; },
    async check(){ calls.push('check'); return st; },
    async download(){ calls.push('download'); st = { ...st, status: 'downloading', progress: 0 }; cbs.forEach(cb => cb(st)); return st; },
    install: async () => { calls.push('install'); return api.installResult; },
    installResult: { ok: true },
    onChange(cb){ cbs.push(cb); return () => {}; },
    emit(s){ st = { ...st, ...s }; cbs.forEach(cb => cb(st)); },
  };
  return api;
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

test('senza natpfDesktop (gioco nel browser): niente avviso e sezione nascosta', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  assert.equal(w.ui.updates.enabled, false);
  assert.equal(w.ui.updates.notice(), null);
  assert.equal($('natpf-update').innerHTML, '', 'nessun avviso');
  assert.equal(w.ui.updates.optEl, undefined, 'la sezione delle Opzioni non viene toccata (resta nascosta come nell’HTML)');
  assert.equal(w.ui.updates.noticeButtons().length, 0);
});

test('azioni: «Aggiorna» solo da disponibile, «Riavvia e aggiorna» solo da pronto; «Più tardi» per quella versione', async () => {
  const api = fakeApi(S('available', { latest: '2026-11-08.1', size: 1e8 }));
  const lobby = { visible: true, step: 'menu', _tiles: () => [] };
  const u = new NatpfUpdates({ lobby, toast(){} }, { api, doc: null });
  await flush();
  assert.deepEqual(api.calls, ['state'], 'stato già verificato: nessuna ricerca in più');
  assert.equal(u.notice().kind, 'available');
  assert.equal(await u.act('install'), null, 'install non parte se non è pronto'); assert.ok(!api.calls.includes('install'));
  await u.act('download');
  assert.equal(u.S.status, 'downloading'); assert.equal(u.notice().kind, 'downloading');
  api.emit({ status: 'ready', progress: 1 });
  assert.equal(u.notice().kind, 'ready');
  await u.act('later');
  assert.equal(u.notice(), null, '«Più tardi» nasconde l’avviso di quella versione');
  api.emit({ status: 'ready', latest: '2026-11-09.1' });
  assert.equal(u.notice()?.kind, 'ready', 'una versione nuova ricompare');
  // install fallito: errore in parole, toast, avviso con «Riprova» (chi gioca l'aveva toccato)
  const toasts = []; u.ui.toast = t => toasts.push(t);
  api.installResult = { ok: false, error: 'installer non trovato' };
  const r = await u.act('install');
  assert.equal(r.ok, false); assert.equal(u.S.status, 'error'); assert.equal(u.S.error, 'installer non trovato');
  assert.deepEqual(toasts, ['Aggiornamento: installer non trovato']);
  assert.deepEqual(acts(u.notice()), ['check:Riprova', 'later:Chiudi']);
});

test('stato «idle» all’avvio: il gioco chiede una ricerca; errore del ponte → stato di errore', async () => {
  const api = fakeApi(S('idle'));
  const u = new NatpfUpdates({ lobby: { visible: true, step: 'menu' } }, { api, doc: null });
  await flush();
  assert.deepEqual(api.calls, ['state', 'check']);
  api.download = async () => { throw new Error('ipc'); };
  u.apply(S('available', { latest: 'x' }));
  await u.act('download', { from: 'options' });
  assert.equal(u.S.status, 'error'); assert.equal(u.S.error, 'download non riuscito');
  assert.equal(u.notice(), null, 'errore dalle Opzioni: l’avviso del menu non compare');
});

test('flusso vero: avviso nel menu, mai in Allenamento o in partita; arriva al ritorno al menu; Opzioni', async () => {
  const api = fakeApi(S('available', { latest: '2026-11-08.1', size: 124_880_055, checkedAt: Date.now() }));
  let fs = true;
  globalThis.natpfDesktop = { shell: 'electron', version: 2, isFullScreen: async () => fs, setFullScreen: async v => (fs = !!v), toggleFullScreen: async () => (fs = !fs), onFullScreenChange(){}, updates: api };
  try {
    const w = await makeWorld({ controller: 'mouse' }); await w.flush(); w.advance(400);
    const { ui, lobby } = w, el = $('natpf-update');
    assert.equal(ui.updates.enabled, true);
    assert.equal($('natpf-updates-opt').classList.contains('hidden'), false, 'sezione in Opzioni accesa nel programma');
    assert.equal(lobby.step, 'menu');
    assert.equal(el.classList.contains('hidden'), false, 'avviso nel menu');
    assert.match(el.innerHTML, /Aggiornamento disponibile · 2026-11-08\.1/);
    assert.match(el.innerHTML, /data-update-act="download"[^>]*>Aggiorna</);
    assert.match(el.innerHTML, /data-update-act="later"[^>]*>Più tardi</);
    // Opzioni: l'avviso lascia il posto alla sezione
    lobby.go('options'); w.advance(400);
    assert.equal(el.classList.contains('hidden'), true, 'in Opzioni niente avviso: c’è la sezione');
    const opt = $('natpf-updates-opt');
    assert.equal(opt.querySelector('[data-upd-state]').textContent, 'Disponibile: 2026-11-08.1 · 124,9 MB');
    assert.match(opt.querySelector('[data-upd-meta]').textContent, /^Versione installata 2026-11-07\.3 · ultima verifica oggi alle \d\d:\d\d$/);
    assert.match(opt.querySelector('[data-upd-btns]').innerHTML, /Aggiorna.*Cerca aggiornamenti/);
    // Allenamento: avviso nascosto anche quando arriva il download e poi «pronto»
    lobby.go('menu'); lobby.menu('training'); lobby.go('connect'); lobby.next(); w.advance(500);
    assert.ok(ui.training.active && !lobby.visible, 'Allenamento in campo');
    api.emit({ status: 'downloading', progress: 0.3 }); w.advance(400);
    assert.equal(el.classList.contains('hidden'), true, 'niente avviso in Allenamento');
    api.emit({ status: 'ready', progress: 1 }); w.advance(400);
    assert.equal(ui.updates.notice(), null); assert.equal(el.classList.contains('hidden'), true);
    // ritorno al menu: l'avviso «pronto» compare
    ui.backToMenu(); w.advance(400);
    assert.equal(lobby.step, 'menu'); assert.equal(el.classList.contains('hidden'), false);
    assert.match(el.innerHTML, /Aggiornamento pronto · 2026-11-08\.1/);
    assert.match(el.innerHTML, /Riavvia e aggiorna/);
    // partita contro la CPU: niente avviso
    lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); w.advance(200);
    assert.equal(el.classList.contains('hidden'), true, 'in «Racchetta» niente avviso (si prepara una partita)');
    lobby.go('connect'); lobby.next(); w.advance(500);
    if (ui.training.active) ui.training.stop({ completed: false, silent: true });
    lobby.go('match'); w.pressStart(); w.advance(1000);
    assert.ok(!lobby.visible, 'partita in corso');
    api.emit({ status: 'ready', latest: '2026-11-08.2' }); w.advance(400);
    assert.equal(ui.updates.notice(), null); assert.equal(el.classList.contains('hidden'), true, 'niente avviso in partita');
  } finally { delete globalThis.natpfDesktop; }
});
