// B72 (richiesta dell'utente del 19/11): «rendere lampeggiante il box che dice che devi battere (al servizio) + aggiungi un
// alone pulsante attorno allo schermo (in singolo e in doppio nell'area specifica del player che deve servire) se passano 3
// secondi». Quando batte un giocatore umano di questo computer la casella «Al servizio» lampeggia dalla posizione di
// servizio fino al lancio; dopo 3 s fermo senza lanciare, l'alone attorno all'area (nello stesso schermo attorno alla sua
// metà). Mai per la CPU o per il giocatore dell'altro computer, mai nell'allenamento, in pausa, nella moviola.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { serveAlertView, serveAlertKey, SERVE_HALO, SERVE_ALERT_OFF, NatpfServeAlert } from '../src/natpf/natpf_serve_alert.js';
import { NatpfServeCoach, serveCoachStep } from '../src/natpf/natpf_serve_coach.js';

const G = (o = {}) => ({ phase: 'SERVE_STANCE', mine: true, drill: false, split: false, server: 'player', paused: false, replay: false, ...o });
const OFF = { blink: false, halo: false, half: null };

test('B72: chi batte da questo computer, dalla posizione di servizio: la casella lampeggia; dopo 3 s fermo anche l\'alone', () => {
  assert.equal(SERVE_HALO.afterS, 3);
  assert.deepEqual(serveAlertView(G(), 0), { blink: true, halo: false, half: null }, 'subito il lampeggio, l’alone no');
  assert.deepEqual(serveAlertView(G(), 2.99), { blink: true, halo: false, half: null }, 'prima dei 3 s niente alone');
  assert.deepEqual(serveAlertView(G(), 3), { blink: true, halo: true, half: null }, 'a 3 s l’alone attorno a tutta l’area');
  assert.deepEqual(serveAlertView(G(), 40), { blink: true, halo: true, half: null });
  // (il Player 2 della sfida tra due computer, sul suo computer: la fotografia del coach dice mine, server 'opponent')
  assert.deepEqual(serveAlertView(G({ server: 'opponent' }), 3.5), { blink: true, halo: true, half: null }, 'a una vista anche il Player 2 sul suo computer');
});

test('B72: stesso schermo: lampeggia la casella della metà di chi batte e l\'alone è solo attorno alla sua metà', () => {
  assert.deepEqual(serveAlertView(G({ split: true, server: 'player' }), 1), { blink: true, halo: false, half: 'p1' });
  assert.deepEqual(serveAlertView(G({ split: true, server: 'player' }), 3.2), { blink: true, halo: true, half: 'p1' }, 'il Player 1 a sinistra');
  assert.deepEqual(serveAlertView(G({ split: true, server: 'opponent' }), 3.2), { blink: true, halo: true, half: 'p2' }, 'il Player 2 a destra');
});

test('B72: niente lampeggio né alone quando batte la CPU o l\'altro computer, al lancio, a fine punto, in pausa, nella moviola, nell\'allenamento', () => {
  for (const [why, g] of [
    ['batte la CPU / il giocatore dell’altro computer', G({ mine: false })],
    ['durante il lancio (SERVE_TOSS)', G({ phase: 'SERVE_TOSS' })],
    ['scambio', G({ phase: 'RALLY' })],
    ['fine punto', G({ phase: 'POINT_OVER' })],
    ['fine partita', G({ phase: 'MATCH_OVER' })],
    ['menu (inquadratura ferma)', G({ phase: 'TITLE', mine: false })],
    ['pausa', G({ paused: true })],
    ['moviola', G({ replay: true })],
    ['allenamento, esercizio «Servizio»', G({ drill: true })],
    ['stesso schermo, lancio', G({ split: true, phase: 'SERVE_TOSS' })],
  ]) assert.deepEqual(serveAlertView(g, 60), OFF, why);
  assert.deepEqual(serveAlertView(undefined, 60), OFF);
  assert.deepEqual(serveAlertView(null, 60), OFF);
  assert.deepEqual(SERVE_ALERT_OFF, OFF);
  // chiave per il confronto a ogni fotogramma: cambia solo con lo stato
  assert.equal(serveAlertKey(serveAlertView(G(), 1)), serveAlertKey(serveAlertView(G(), 2.5)));
  assert.notEqual(serveAlertKey(serveAlertView(G(), 1)), serveAlertKey(serveAlertView(G(), 3)));
  assert.notEqual(serveAlertKey(serveAlertView(G({ split: true }), 3)), serveAlertKey(serveAlertView(G({ split: true, server: 'opponent' }), 3)));
});

// fotografia del gioco del coach (chi batte, se è umano e di questo computer): le stesse regole dell'icona del lancio (B44)
test('B72: dalla fotografia del gioco: contro la CPU, sfida tra due computer, stesso schermo, doppio, allenamento, minigiochi, menu', () => {
  const E = (o = {}) => ({ phase: 'SERVE_STANCE', score: { server: 'player' }, ball: { pos: { y: 1.1 }, vel: { y: 0 } }, elapsedTime: 0, autoPlayMode: false, ...o });
  const ui = (o = {}) => ({ controller: 'phone', training: { active: false }, events: { active: null }, trial: { active: false }, lobby: { visible: false }, ...o });
  const view = (e, u = ui(), idle = 3.1) => serveAlertView(new NatpfServeCoach(e, u).snapshot(), idle);
  assert.deepEqual(view(E()), { blink: true, halo: true, half: null }, 'contro la CPU batte chi gioca');
  assert.deepEqual(view(E({ score: { server: 'opponent' } })), OFF, 'contro la CPU batte la CPU');
  assert.deepEqual(view(E({ isDoubles: true })), { blink: true, halo: true, half: null }, 'doppio contro la CPU (una vista): batte la squadra di chi gioca');
  assert.deepEqual(view(E({ isDoubles: true, score: { server: 'opponent' } })), OFF, 'doppio: batte la squadra della CPU');
  // sfida tra due computer: sul computer dell'host (Player 1) e su quello del Player 2
  assert.deepEqual(view(E({ isMultiplayer: true, score: { server: 'opponent' } })), OFF, 'host: batte il Player 2 dall’altro computer');
  assert.deepEqual(view(E({ isMultiplayer: true, playerRole: 'p2', score: { server: 'opponent' } })), { blink: true, halo: true, half: null }, 'computer del Player 2: batte lui');
  assert.deepEqual(view(E({ isMultiplayer: true, playerRole: 'p2', score: { server: 'player' } })), OFF, 'computer del Player 2: batte l’host');
  // stesso schermo: tutti e due di questo computer, la metà di chi batte
  assert.deepEqual(view(E({ natpfSplit: { active: true } })), { blink: true, halo: true, half: 'p1' });
  assert.deepEqual(view(E({ natpfSplit: { active: true }, score: { server: 'opponent' } })), { blink: true, halo: true, half: 'p2' });
  // allenamento (anche l'esercizio «Servizio»), minigiochi, scambi di prova, menu, dimostrazione, moviola, pausa
  assert.deepEqual(view(E(), ui({ training: { active: true, cal: false, lesson: null, drill: { id: 'serve' } } })), OFF, 'esercizio «Servizio»: la sua scheda e l’icona, niente alone');
  assert.deepEqual(view(E(), ui({ events: { active: 'targets' } })), OFF, 'minigiochi');
  assert.deepEqual(view(E(), ui({ trial: { active: true } })), OFF, 'scambi di prova');
  assert.deepEqual(view(E(), ui({ lobby: { visible: true } })), OFF, 'menu');
  assert.deepEqual(view(E({ autoPlayMode: true })), OFF, 'dimostrazione');
  assert.deepEqual(view(E({ cameraMode: 'REPLAY_CAM' })), OFF, 'moviola');
  assert.deepEqual(view(E({ natpfPaused: true })), OFF, 'pausa');
});

// il tempo fermo è quello del coach: cresce solo in posizione di servizio di chi batte qui, riparte a ogni nuova fase
test('B72: il tempo fermo al servizio (natpf_serve_coach) arriva a 3 s, riparte con il lancio, il punto dopo e la pausa', () => {
  const M = (o = {}) => ({ phase: 'SERVE_STANCE', mine: true, match: 1, tossMisses: 0, server: 'player', ...o });
  let s = serveCoachStep({ phase: null }, M(), 1/60);
  for (let i = 0; i < 179; i++) s = serveCoachStep(s, M(), 1/60);
  assert.ok(s.idle < SERVE_HALO.afterS, `2,98 s: ${s.idle}`);
  assert.equal(serveAlertView(M(), s.idle).halo, false);
  for (let i = 0; i < 3; i++) s = serveCoachStep(s, M(), 1/60);
  assert.ok(s.idle >= SERVE_HALO.afterS, `3 s: ${s.idle}`);
  assert.equal(serveAlertView(M(), s.idle).halo, true);
  // il lancio: tutto via; lancio a vuoto, di nuovo in posizione: il conto riparte da zero
  s = serveCoachStep(s, M({ phase: 'SERVE_TOSS' }), 1/60); assert.equal(s.idle, 0);
  assert.deepEqual(serveAlertView(M({ phase: 'SERVE_TOSS' }), s.idle), OFF);
  s = serveCoachStep(s, M(), 1/60); assert.equal(s.idle, 0);
  assert.deepEqual(serveAlertView(M(), s.idle), { blink: true, halo: false, half: null }, 'di nuovo in posizione: lampeggio, l’alone dopo altri 3 s');
  // la CPU che batte: il conto non cresce
  s = serveCoachStep(s, M({ mine: false }), 5); assert.equal(s.idle, 0);
  // pausa (natpf_ui._syncPause → hold): il conto riparte da zero anche se il motore non chiama tick durante la pausa
  const c = new NatpfServeCoach({ score: {}, ball: {} }, {});
  c.state = { ...c.state, phase: 'SERVE_STANCE', idle: 7 };
  c.hold();
  assert.equal(c.state.idle, 0);
});

// pagina finta: le caselle «Al servizio» (quella del motore e le due dello stesso schermo) e #hud-root
function page({ split = true } = {}){
  const els = new Map(), writes = [];
  const mk = (id, cls = []) => {
    const set = new Set(cls), data = {};
    const el = { id, children: [], dataset: new Proxy(data, { set(t, k, v){ writes.push(`${id}.data-${String(k)}=${v}`); t[k] = v; return true; }, deleteProperty(t, k){ writes.push(`${id}.data-${String(k)} via`); delete t[k]; return true; } }),
      classList: {
        add: c => { writes.push(`${id}+${c}`); set.add(c); },
        remove: c => { if (set.has(c)) writes.push(`${id}-${c}`); set.delete(c); },
        contains: c => set.has(c),
        toggle: (c, f) => { const on = f === undefined ? !set.has(c) : !!f; writes.push(`${id}${on ? '+' : '-'}${c}`); on ? set.add(c) : set.delete(c); return on; },
      },
      setAttribute(){},
      get className(){ return [...set].join(' '); },
      set className(v){ set.clear(); for (const c of String(v).split(/\s+/).filter(Boolean)) set.add(c); },
      get firstChild(){ return el.children[0] || null; },
      insertBefore(n, ref){ const i = ref ? el.children.indexOf(ref) : -1; i >= 0 ? el.children.splice(i, 0, n) : el.children.push(n); els.set(n.id, n); return n; },
      appendChild(n){ el.children.push(n); els.set(n.id, n); return n; } };
    els.set(id, el); return el;
  };
  const hud = mk('hud-root'); hud.children.push({ id: 'top-hud-bar' });
  mk('server-tag', ['nt-server-tag']);
  if (split){ mk('server-tag-p1', ['nt-server-tag']); mk('server-tag-p2', ['nt-server-tag']); }
  const doc = { body: mk('body'), getElementById: id => els.get(id) || null, createElement: () => mk('nuovo') };
  // (createElement dà un id provvisorio: l'alone si rinomina subito)
  doc.createElement = () => { const el = mk('?'); els.delete('?'); return el; };
  return { doc, els, writes, mk, has: (id, c) => !!els.get(id)?.classList.contains(c) };
}

test('B72: la pagina cambia solo quando cambia lo stato; la casella giusta lampeggia; l\'alone sta in #hud-root, sotto tutto', () => {
  const P = page(), a = new NatpfServeAlert(P.doc);
  // fuori dal servizio: niente da fare
  assert.equal(a.paint(OFF), false); assert.equal(P.writes.length, 0);
  // batte chi gioca (una vista): la casella del motore lampeggia, nessun alone ancora
  assert.equal(a.paint(serveAlertView(G(), 0)), true);
  assert.ok(P.has('server-tag', 'serve-blink')); assert.equal(P.doc.getElementById('natpf-serve-halo'), null, 'l’alone nasce solo quando serve');
  const n = P.writes.length;
  for (let i = 0; i < 100; i++) assert.equal(a.paint(serveAlertView(G(), i*.02)), false, 'stesso stato: nessun lavoro sulla pagina');
  assert.equal(P.writes.length, n);
  // 3 s: l'alone, primo figlio di #hud-root (tabellone e scritte dopo di lui gli stanno sopra)
  a.paint(serveAlertView(G(), 3));
  const h = P.doc.getElementById('natpf-serve-halo');
  assert.ok(h, 'alone creato'); assert.equal(P.els.get('hud-root').children[0], h, 'primo figlio di #hud-root');
  assert.ok(h.classList.contains('natpf-serve-halo')); assert.equal(h.classList.contains('hidden'), false); assert.equal(h.dataset.half, undefined, 'a una vista: tutta l’area');
  // il lancio: tutto via subito
  a.paint(serveAlertView(G({ phase: 'SERVE_TOSS' }), 0));
  assert.equal(P.has('server-tag', 'serve-blink'), false); assert.equal(h.classList.contains('hidden'), true);
  // stesso schermo, batte il Player 2: la sua casella e la sua metà
  a.paint(serveAlertView(G({ split: true, server: 'opponent' }), 3.4));
  assert.ok(P.has('server-tag-p2', 'serve-blink')); assert.equal(P.has('server-tag-p1', 'serve-blink'), false); assert.equal(P.has('server-tag', 'serve-blink'), false);
  assert.equal(h.classList.contains('hidden'), false); assert.equal(h.dataset.half, 'p2');
  assert.equal(P.doc.getElementById('natpf-serve-halo'), h, 'sempre lo stesso alone');
  // poi il Player 1: si sposta
  a.paint(serveAlertView(G({ split: true, server: 'player' }), 3.4));
  assert.ok(P.has('server-tag-p1', 'serve-blink')); assert.equal(P.has('server-tag-p2', 'serve-blink'), false); assert.equal(h.dataset.half, 'p1');
  // pausa (hold del coach): via
  a.paint(SERVE_ALERT_OFF);
  assert.equal(P.has('server-tag-p1', 'serve-blink'), false); assert.equal(h.classList.contains('hidden'), true);
});

test('B72: stesso schermo, le caselle delle due metà nascono al primo disegno diviso: finché mancano si riprova', () => {
  const P = page({ split: false }), a = new NatpfServeAlert(P.doc);
  assert.equal(a.paint(serveAlertView(G({ split: true }), 0)), true);
  assert.equal(a.key, '', 'casella che manca: niente chiave, si riprova');
  P.mk('server-tag-p1', ['nt-server-tag']); P.mk('server-tag-p2', ['nt-server-tag']);
  assert.equal(a.paint(serveAlertView(G({ split: true }), 0)), true);
  assert.ok(P.has('server-tag-p1', 'serve-blink'));
  assert.equal(a.paint(serveAlertView(G({ split: true }), .5)), false, 'trovata: poi niente lavoro');
  // senza pagina (test, motore senza grafica): non fa niente
  assert.equal(new NatpfServeAlert(null).paint(serveAlertView(G(), 5)), false);
});

// motore vero senza grafica: chi gioca al servizio, il coach (con la pagina finta) accende il lampeggio subito e l'alone
// dopo 3 s di gioco; il lancio li spegne; la CPU che batte non li accende mai
test('B72: motore: lampeggio subito, alone dopo 3 s di gioco fermi, via al lancio; la CPU che batte niente', async () => {
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const real = Math.random; Math.random = mulberry32(7);
  try {
    const e = createHeadlessEngine({ difficulty: 'casual' });
    e.startNewMatch({ showStartBanner: false });
    e.score.server = 'player'; e._setupPointServe({ showBanner: false });
    const P = page({ split: false }), coach = new NatpfServeCoach(e, { controller: 'phone', training: { active: false }, events: { active: null }, trial: { active: false }, lobby: { visible: false } });
    coach.paint = () => {}; coach.alert = new NatpfServeAlert(P.doc);
    const halo = () => !!P.doc.getElementById('natpf-serve-halo') && !P.doc.getElementById('natpf-serve-halo').classList.contains('hidden');
    let t = 0;
    const run = (s, until = () => false) => { for (let k = 0; k < s*120; k++){ e.step(1/120); coach.tick(1/120); t += 1/120; if (until()) return true; } return false; };
    run(.1);
    assert.equal(e.phase, 'SERVE_STANCE'); assert.ok(P.has('server-tag', 'serve-blink'), 'subito il lampeggio'); assert.equal(halo(), false);
    t = 0;
    assert.ok(run(5, halo), 'l’alone arriva');
    assert.ok(t >= 2.85 && t <= 3.05, `dopo circa 3 s di gioco fermi: ${t.toFixed(2)} s (idle ${coach.state.idle.toFixed(2)})`);
    assert.ok(coach.state.idle >= SERVE_HALO.afterS);
    // il lancio: subito via
    e._handleUserTossInput({});
    assert.equal(e.phase, 'SERVE_TOSS'); coach.tick(1/120);
    assert.equal(P.has('server-tag', 'serve-blink'), false); assert.equal(halo(), false);
    // batte la CPU: niente, anche ferma a lungo (la CPU lancia da sola dopo 1,25 s: qui ferma)
    e.score.server = 'opponent'; e._setupPointServe({ showBanner: false }); e.persistentStateLock = true;
    run(4);
    assert.equal(e.phase, 'SERVE_STANCE');
    assert.equal(P.has('server-tag', 'serve-blink'), false); assert.equal(halo(), false);
  } finally { Math.random = real; }
});

// le misure seguono l'area del gioco (ledwall): cqw/cqh, niente vw/vh; il movimento ridotto la rallenta, non la spegne
test('B72: stile: alone in cqw/cqh nell\'area del gioco, metà dello stesso schermo, movimento ridotto più lento ma acceso; pausa nel codice', () => {
  const css = readFileSync(new URL('../natpf-servizio.css', import.meta.url), 'utf8');
  const b72 = css.slice(css.indexOf('B72 ·'));
  assert.ok(b72.length > 500);
  assert.doesNotMatch(b72, /\d(vw|vh)\b/, 'niente vw/vh');
  assert.match(b72, /\.nt-server-tag\.serve-blink \{ animation: natpf-serve-blink 1s /, 'lampeggio a 1 Hz');
  assert.match(b72, /\.natpf-serve-halo \{[^}]*pointer-events: none;[^}]*animation: natpf-serve-halo 1s /s, 'alone senza clic, 1 Hz');
  assert.match(b72, /--halo-w: clamp\(4px, min\(0\.8cqw, 1\.2cqh\), 18px\)/);
  assert.match(b72, /\.natpf-serve-halo\[data-half="p1"\] \{ right: 50\.2cqw; \}/);
  assert.match(b72, /\.natpf-serve-halo\[data-half="p2"\] \{ left: 50\.2cqw; \}/);
  const rm = b72.slice(b72.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(rm, /\.nt-server-tag\.serve-blink \{ animation: natpf-serve-blink-soft 2\.4s/);
  assert.match(rm, /\.natpf-serve-halo \{ animation: natpf-serve-halo-soft 2\.4s/);
  assert.doesNotMatch(rm.slice(0, rm.indexOf('}') + 1), /animation: none/);
  // (il fondo della casella non cambia: le prove della casella del B37.1 leggono il giallo)
  assert.doesNotMatch(b72.slice(0, b72.indexOf('.natpf-serve-halo {')), /background/);
  // la pausa spegne lampeggio e alone e rimette a zero il tempo fermo (natpf_ui._syncPause)
  const ui = readFileSync(new URL('../src/natpf/natpf_ui.js', import.meta.url), 'utf8');
  assert.match(ui, /if \(this\.engine\.natpfPaused\)\{ this\.serveCoach\?\.paint\(null\); this\.serveCoach\?\.hold\?\.\(\);/);
});
