// B62 · salvaschermo con la partita dimostrativa (natpf_screensaver.js; richiesta dell'utente del 17/11/2026: «dopo un
// periodo di inattività sul ledwall vorrei mettere un finto gameplay in loop. Inattività di almeno 1 minuto che si sblocca
// come screensaver»): impostazione e valori di base, quando parte e quando si chiude, cosa non copre, risveglio senza
// premere il pulsante sotto, ritorno allo sfondo fermo del menu, voce del pannello dello stand.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SAVER_KEY, SAVER_STEPS, SAVER_TEXT, SAVER_SWALLOW_MS, readSaver, writeSaver, nextSaver, saverButton, saverToast, saverDefault, saverAction, saverBusy, NatpfScreensaver } from '../src/natpf/natpf_screensaver.js';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }; };

test('B62: «Dopo 1 min» di base nel programma Windows e in sviluppo, «No» nel browser; valore salvato, valori strani scartati', () => {
  assert.deepEqual([...SAVER_STEPS], [60, 120, 300, 0]);
  assert.equal(saverDefault({ desktop: {}, dev: false }), 60);
  assert.equal(saverDefault({ desktop: undefined, dev: true }), 60);
  assert.equal(saverDefault({ desktop: undefined, dev: false }), 0);
  assert.equal(readSaver({ storage: memory(), desktop: {} }), 60);
  assert.equal(readSaver({ storage: memory(), desktop: undefined, dev: false }), 0);
  assert.equal(readSaver({ storage: memory({ [SAVER_KEY]: '300' }), desktop: undefined }), 300);
  assert.equal(readSaver({ storage: memory({ [SAVER_KEY]: '0' }), desktop: {} }), 0, 'spento resta spento anche nel programma Windows');
  for (const bad of ['', 'x', '45', '-60', '1e9']) assert.equal(readSaver({ storage: memory({ [SAVER_KEY]: bad }), desktop: {} }), 60, bad);
  assert.equal(readSaver({ storage: { getItem(){ throw new Error('no'); } }, desktop: {} }), 60);
  const s = memory(); assert.equal(writeSaver(120, s), 120); assert.equal(s.map.get(SAVER_KEY), '120'); assert.equal(writeSaver(7, s), 0);
});

test('B62: voce del pannello: Dopo 1 min → 2 → 5 → No → 1; scritte', () => {
  assert.deepEqual([60, 120, 300, 0].map(nextSaver), [120, 300, 0, 60]);
  assert.equal(nextSaver(7), 120);
  assert.deepEqual([60, 120, 300, 0].map(saverButton), ['Dopo 1 min', 'Dopo 2 min', 'Dopo 5 min', 'No']);
  assert.equal(saverButton(3), 'Dopo 3 s');
  assert.match(saverToast(60), /dopo 1 min senza nessuno.*partita dimostrativa.*mouse, un tasto o un telefono/);
  assert.equal(saverToast(0), 'Salvaschermo spento');
  assert.deepEqual({ ...SAVER_TEXT }, { tag: 'Dimostrazione', title: 'Gioca a tennis con il telefono', sub: 'Chiedi allo staff: si comincia in un attimo' });
});

test('B62: parte dopo il tempo senza nessuno, solo nel menu e senza fogli aperti; si chiude con l\'attività, fuori dal menu o spento', () => {
  const A = o => saverAction({ secs: 60, idle: 0, here: true, busy: false, on: false, woke: false, ...o });
  assert.equal(A({ idle: 59.9 }), null);
  assert.equal(A({ idle: 60 }), 'start');
  assert.equal(A({ idle: 600, here: false }), null, 'in partita o fuori dal menu: mai');
  assert.equal(A({ idle: 600, busy: true }), null, 'foglio aperto: mai');
  assert.equal(A({ idle: 600, secs: 0 }), null, 'spento');
  assert.equal(A({ on: true, idle: 100 }), null, 'acceso e nessuno: resta');
  assert.equal(A({ on: true, woke: true }), 'stop');
  assert.equal(A({ on: true, here: false }), 'stop', 'il gioco esce dal menu (per esempio «Sono pronto»)');
  assert.equal(A({ on: true, busy: true }), 'stop');
  assert.equal(A({ on: true, secs: 0 }), 'stop');
});

test('B62: cosa il salvaschermo non copre', () => {
  assert.equal(saverBusy({}, null), false);
  const cls = on => ({ documentElement: { classList: { contains: c => on && c === 'ranking-full' } } });
  for (const [k, ui] of Object.entries({
    pannello: { kiosk: { isOpen: true } }, telecomando: { remote: { isOpen: true } }, abbinamento: { remote: { opening: true } }, telefoni: { fieraSheet: { isOpen: true } },
    diagnostica: { diag: { isOpen: true } }, calibrazione: { calibra: { isOpen: true } }, tastiera: { tastiera: { visible: true } }, tutorial: { training: { tutorial: { open: true } } },
    tutorialSplit: { split: { tut: { p1: { open: false }, p2: { open: true } } } }, nickname: { events: { nickname: true } }, allenamento: { training: { active: true } },
    minigioco: { events: { active: {} } }, prova: { trial: { active: true } }, conto: { prematch: { active: true } }, sfida: { engine: { versus: { active: true }, roomId: 'ABCD' } },
  })) assert.equal(saverBusy(ui, cls(false)), true, k);
  assert.equal(saverBusy({}, cls(true)), true, 'classifica a schermo intero (è per chi è in fila)');
  assert.equal(saverBusy({ engine: { versus: { active: true }, roomId: 'default' } }, cls(false)), false);
});

// finti: finestra con gli ascoltatori, documento con la radice e un elemento, motore e interfaccia
function world({ auto = false } = {}){
  const L = {}, win = { addEventListener: (t, fn, o) => (L[t] ||= []).push({ fn, o }) };
  const classes = new Set(), els = {};
  const mk = () => { const c = new Set(); return { id: '', className: '', innerHTML: '', classList: { toggle: (k, v) => (v ? c.add(k) : c.delete(k)), contains: k => c.has(k) }, setAttribute(){}, _c: c }; };
  const doc = { documentElement: { classList: { add: k => classes.add(k), remove: k => classes.delete(k), contains: k => classes.has(k) } }, getElementById: id => els[id] || null,
    createElement: () => mk(), body: { appendChild: el => { els[el.id] = el; } } };
  let t = 1000; const now = () => t;
  const E = { autoPlayMode: auto, playerRole: 'p1', shows: 0, _setupMidRallyShowcase(){ this.shows++; }, _snapCameraImmediate(){}, natpfBackdropDirty: false };
  const logs = [], ui = { engine: E, lobby: { visible: true, step: 'menu' }, kiosk: { last: 0, poke(){ this.last = t; } }, diag: { recorder: { log: (k, o) => logs.push([k, o]) } } };
  const S = new NatpfScreensaver(E, ui, { win, doc, now }); S.secs = 60;
  const fire = (type, ev = {}) => { const e = { type, prevented: false, stopped: false, preventDefault(){ this.prevented = true; }, stopImmediatePropagation(){ this.stopped = true; }, ...ev }; for (const { fn } of L[type] || []) fn(e); return e; };
  return { S, E, ui, doc, els, classes, L, fire, logs, at: v => { t = v; }, get t(){ return t; } };
}

test('B62: dopo un minuto senza nessuno al menu parte la partita dimostrativa del motore; il menu resta aperto sotto', () => {
  const w = world();
  w.at(50000); w.S.tick(); assert.equal(w.S.on, false, '50 s');
  w.at(61000); w.S.tick();
  assert.equal(w.S.on, true); assert.equal(w.E.autoPlayMode, true); assert.equal(w.E.shows, 1, 'scambio dimostrativo da capo');
  assert.ok(w.classes.has('natpf-salvaschermo')); assert.ok(w.els['natpf-salvaschermo']._c.has('on'));
  assert.match(w.els['natpf-salvaschermo'].innerHTML, /Dimostrazione.*Gioca a tennis con il telefono.*Chiedi allo staff/);
  assert.equal(w.ui.lobby.visible, true, 'il menu non si chiude: al risveglio si torna alla stessa pagina');
  w.at(200000); w.S.tick(); assert.equal(w.S.on, true, 'resta finché non arriva nessuno');
  assert.deepEqual(w.logs[0], ['salvaschermo', { acceso: true, dopo: 60 }]);
});

test('B62: il tocco, il clic o il tasto che sveglia non arriva alla pagina; poi lo sfondo fermo del menu torna com\'era', () => {
  for (const type of ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'wheel']){
    const w = world(); w.at(70000); w.S.tick(); assert.ok(w.S.on);
    const e = w.fire(type);
    assert.ok(e.prevented && e.stopped, `${type}: fermato prima della pagina`);
    assert.equal(w.S.on, false); assert.ok(!w.classes.has('natpf-salvaschermo')); assert.ok(!w.els['natpf-salvaschermo']._c.has('on'));
    assert.equal(w.E.autoPlayMode, false, 'come prima del salvaschermo'); assert.equal(w.E.natpfBackdropDirty, true, 'lo sfondo fermo si ridisegna');
    assert.equal(w.ui.kiosk.last, w.t, 'conta come attività (il chiosco riparte da qui)');
    // il clic che segue lo stesso tocco: niente pulsante premuto
    for (const rest of ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'click', 'touchend', 'keyup']){ const c = w.fire(rest); assert.ok(c.prevented && c.stopped, `${type} poi ${rest}`); }
    assert.equal(w.S.on, false);
    w.at(w.t + SAVER_SWALLOW_MS + 1); const c2 = w.fire('click'); assert.ok(!c2.prevented && !c2.stopped, 'dopo mezzo secondo i clic tornano normali');
    // spento: gli ascoltatori non toccano niente
    const k = w.fire('keydown'); assert.ok(!k.prevented && !k.stopped);
  }
  const w = world({ auto: true }); w.at(70000); w.S.tick(); w.fire('keydown'); assert.equal(w.E.autoPlayMode, true, 'la dimostrazione di prima resta com\'era');
});

test('B62: mouse mosso davvero sveglia, il tremolio no; telefoni e telecomando (attività del chiosco) svegliano; fuori dal menu si chiude', () => {
  const w = world(); w.at(70000); w.S.tick();
  w.fire('pointermove', { movementX: 1, movementY: 1 }); assert.ok(w.S.on, 'tremolio');
  w.fire('pointermove', { movementX: 4, movementY: 0 }); assert.ok(!w.S.on);
  const p = world(); p.at(70000); p.S.tick(); p.at(80000); p.ui.kiosk.poke(); p.S.tick();
  assert.ok(!p.S.on, 'gesto o tocco su un telefono'); assert.equal(p.logs.at(-1)[1].perche, 'attività'); assert.equal(p.logs.at(-1)[1].durataS, 10);
  const m = world(); m.at(70000); m.S.tick(); m.ui.lobby.visible = false; m.S.tick();
  assert.ok(!m.S.on); assert.equal(m.logs.at(-1)[1].perche, 'fuori dal menu');
  const b = world(); b.at(70000); b.ui.kiosk.isOpen = true; b.S.tick(); assert.ok(!b.S.on, 'pannello aperto');
  const r = world(); r.E.playerRole = 'p2'; r.at(70000); r.S.tick(); assert.ok(!r.S.on, 'mai sul computer del Player 2 della sfida');
  const z = world(); z.at(70000); z.S.tick(); assert.equal(z.S.setSecs(0), 0); assert.ok(!z.S.on, 'spento dal pannello: si chiude subito');
});

test('B62: collegato all\'interfaccia, al menu e al pannello dello stand', () => {
  const ui = fs.readFileSync(new URL('../src/natpf/natpf_ui.js', import.meta.url), 'utf8');
  assert.ok(ui.indexOf('new NatpfScreensaver(engine, this)') > 0 && ui.indexOf('new NatpfScreensaver(engine, this)') < ui.indexOf('new NatpfLobby('), 'creato prima del menu (il tocco che sveglia non gli arriva)');
  assert.match(ui, /menuBackdrop\(\)\{[^\n]*&& !this\.screensaver\?\.on; \}/);
  assert.match(ui, /this\.screensaver\?\.tick\(\);/);
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /data-staff="saver"[^>]*><span>Salvaschermo<\/span><b>Dopo 1 min<\/b>/);
  const k = fs.readFileSync(new URL('../src/natpf/natpf_kiosk.js', import.meta.url), 'utf8');
  assert.match(k, /if \(cmd === 'saver'\)\{/); assert.match(k, /set\('saver', saverButton\(sv\), sv > 0\)/);
  const css = fs.readFileSync(new URL('../natpf-ui.css', import.meta.url), 'utf8');
  const part = css.slice(css.indexOf('B62 · salvaschermo'));
  assert.match(part, /\.natpf-salvaschermo #title-modal/); assert.doesNotMatch(part, /\b\d+(\.\d+)?v[wh]\b|@media/, 'misure dello schermo del gioco (cqw/cqh)');
});
