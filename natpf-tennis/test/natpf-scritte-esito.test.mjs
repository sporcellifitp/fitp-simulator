// B10, segnalazione del 06/11: «se gioco 2v2, i nomi dei colpi (es. "Perfetto!") ostruiscono la visuale del campo».
// La scritta dell'esito non si apre più sopra la testa di chi colpisce (nel doppio il compagno a rete la metteva in mezzo
// al campo) ma nell'angolo in basso del proprio lato (natpf_shot_feedback.popupPlace), più breve. Prova nel browser con
// le misure sul campo proiettato: tools/e2e/natpf-scritte-2v2.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { NatpfShotFeedback, popupPlace, POPUP_MS } from '../src/natpf/natpf_shot_feedback.js';

test('posto della scritta: il tuo lato a sinistra, stesso schermo P1 a sinistra e P2 a destra, l’altro giocatore a destra', () => {
  assert.deepEqual(popupPlace({ p2: false, role: 'p1' }), { side: 'left', kind: 'mine' });
  assert.deepEqual(popupPlace({ p2: false, role: 'p1', partner: true }), { side: 'left', kind: 'partner' }, 'il colpo del compagno è il tuo gesto');
  assert.deepEqual(popupPlace({ p2: true, role: 'p1' }), { side: 'right', kind: 'other' }, 'sfida un amico: il suo colpo, piccolo a destra');
  assert.deepEqual(popupPlace({ p2: true, role: 'p2' }), { side: 'left', kind: 'mine' }, 'il P2 sul suo computer: il suo colpo a sinistra');
  assert.deepEqual(popupPlace({ p2: false, role: 'p2' }), { side: 'right', kind: 'other' });
  assert.deepEqual(popupPlace({ p2: false, split: true }), { side: 'left', kind: 'mine' });
  assert.deepEqual(popupPlace({ p2: true, split: true }), { side: 'right', kind: 'mine' });
});

function fakeDom(){
  const els = {}, cls = () => { const s = new Set(); return { add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), toggle: (c, f) => ((f ?? !s.has(c)) ? s.add(c) : s.delete(c)), contains: c => s.has(c) }; };
  const el = id => (els[id] ||= { id, classList: cls(), style: {} });
  return { getElementById: el, querySelectorAll: () => [] };
}
test('scritta del colpo: niente posizione sopra la testa, «compagno» per il colpo del compagno, durata più breve', () => {
  const shown = [], had = globalThis.document;
  globalThis.document = fakeDom();
  try {
    const engine = { scene: { add(){} }, ball: { targetLanding: { x: 0, z: -8 } }, playerRole: 'p1', elapsedTime: 0, hud: { showTimingPopup: o => shown.push(o) } };
    new NatpfShotFeedback(engine);
    const pop = document.getElementById('timing-popup');
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '113 KM/H', screenPos: { x: 600, y: 300, visible: true }, partner: true });
    assert.equal(shown[0].screenPos, null, 'nessuna posizione sul campo');
    assert.equal(shown[0].grade, 'Perfetto'); assert.equal(shown[0].detail, 'compagno · 113 km/h');
    assert.equal(shown[0].durationMs, POPUP_MS.hit);
    assert.ok(pop.classList.contains('anchored') && !pop.classList.contains('side-right'));
    engine.hud.showTimingPopup({ grade: 'P2 PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H', screenPos: { x: 600, y: 120, visible: true } });
    assert.equal(shown[1].detail, 'avversario · 120 km/h');
    assert.ok(pop.classList.contains('side-right') && pop.classList.contains('other'));
    engine.hud.showTimingPopup({ grade: 'TOO LATE! • WHIFF', detail: 'BALL PASSED', durationMs: 750 });
    assert.equal(shown[2].durationMs, POPUP_MS.miss); assert.equal(shown[2].grade, 'Mancata');
    // in prima persona come in terza: nell'angolo (prima al centro dello sguardo, sopra il campo)
    engine._isFirstPersonActive = () => true;
    engine.hud.showTimingPopup({ grade: 'EARLY • FOREHAND CROSS!', detail: '98 KM/H' });
    assert.equal(shown[3].screenPos, null); assert.equal(shown[3].grade, 'Anticipo');
  } finally { if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});

// Revisione B10: il servizio del Player 2 non aveva «P2» nel grade e la scritta finiva nell'angolo del P1 (stesso schermo:
// a sinistra; sfida un amico sul computer del P1: grande, senza «avversario», e «Fuori» anche col servizio dentro).
// Servizio vero del motore (senza browser), scritta con la stessa funzione del gioco
test('servizio del P2: «P2» nel grade, stesso schermo a destra, sfida a destra con «avversario», computer del P2 a sinistra', async () => {
  const { createHeadlessEngine, mulberry32 } = await import('../scripts/audit/headless-engine.mjs');
  const had = globalThis.document, real = Math.random;
  globalThis.document = fakeDom(); Math.random = mulberry32(7);
  try {
    const serve = ({ who = 'opponent', role = 'p1', split = false } = {}) => {
      const e = createHeadlessEngine({ difficulty: 'pro' }), shown = [];
      e.startNewMatch({ showStartBanner: false });
      e.isMultiplayer = true; e.versus = { active: true, closing: false, local: split }; e.playerRole = role;
      e.natpfSplit.active = split;
      e.scene = { add(){} };
      const hud = e.hud; e.hud = new Proxy({}, { get: (t, k) => k in t ? t[k] : k === 'showTimingPopup' ? (o => shown.push(o)) : hud[k] });
      new NatpfShotFeedback(e);
      const pop = document.getElementById('timing-popup');
      for (const c of ['side-right', 'other', 'anchored']) pop.classList.remove(c);
      e.score.server = who; e.score.deuceSide = true; e.phase = 'SERVE_STANCE';
      const a = who === 'opponent' ? e.opponent : e.player;
      e._startServeToss(a);
      for (let i = 0; i < 400 && e.ball.vel.y > 0; i++) e.step(1/120);
      e._executeServeHit(a, { natpf: { intent: { rise: 0, plane: 0, face: 0, power: .5 } }, natpfServeTau: 0, speed: 1.2 });
      const mine = shown.filter(o => /SERVE|Perfetto|Buono|Anticipo|Ritardo|Fuori/.test(o.grade));
      assert.equal(mine.length, 1, 'una scritta del servizio');
      return { o: mine[0], right: pop.classList.contains('side-right'), other: pop.classList.contains('other') };
    };
    const split = serve({ split: true });
    assert.ok(split.right && !split.other, 'stesso schermo: il servizio del P2 nella sua metà, a destra');
    assert.notEqual(split.o.grade, 'Fuori', 'il servizio del P2 che entra non è «Fuori»');
    const amico = serve();
    assert.ok(amico.right && amico.other, 'sfida un amico, computer del P1: a destra e piccolo');
    assert.match(amico.o.detail, /^avversario · \d+ km\/h$/);
    const p2pc = serve({ role: 'p2' });
    assert.ok(!p2pc.right && !p2pc.other, 'computer del P2: il suo servizio nel suo angolo a sinistra');
    assert.doesNotMatch(p2pc.o.detail, /avversario/);
    const p1 = serve({ who: 'player', split: true });
    assert.ok(!p1.right && !p1.other, 'stesso schermo: il servizio del P1 a sinistra');
  } finally { Math.random = real; if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});

// Revisione B10: nell'Allenamento la scheda dell'esercizio (.coach-main, in basso a sinistra, sopra il gioco) copriva del
// tutto la scritta; ora la scritta sta sopra la scheda quando sono dallo stesso lato (in orizzontale)
test('Allenamento: la scritta sta sopra la scheda dell’esercizio e sopra le barre, non sotto', () => {
  const had = globalThis.document;
  const box = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t });
  const dom = fakeDom(), meters = [{ getBoundingClientRect: () => box(26, 651, 230, 698) }];
  let cards = [{ getBoundingClientRect: () => box(24, 597, 484, 696) }];
  dom.querySelectorAll = q => /coach-main/.test(q) ? cards : /meter-group/.test(q) ? meters : [];
  globalThis.document = dom;
  try {
    const engine = { scene: { add(){} }, ball: { targetLanding: { x: 0, z: -8 } }, playerRole: 'p1', elapsedTime: 0, hud: { showTimingPopup(){} } };
    new NatpfShotFeedback(engine);
    const pop = document.getElementById('timing-popup');
    pop.parentElement = { getBoundingClientRect: () => box(0, 0, 1280, 720) };
    pop.getBoundingClientRect = fakePopupRect(pop, box);
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.equal(pop.style.bottom, `${(720 - 597 + 6).toFixed(1)}px`, 'sopra la scheda');
    assert.ok(!pop.classList.contains('side-right'));
    cards = [];
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.equal(pop.style.bottom, `${(720 - 651 + 6).toFixed(1)}px`, 'senza scheda: sopra le barre, come prima');
    // scheda dall'altro lato (non si sovrappone in orizzontale): non conta
    cards = [{ getBoundingClientRect: () => box(800, 500, 1200, 600) }];
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.equal(pop.style.bottom, `${(720 - 651 + 6).toFixed(1)}px`);
  } finally { if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});
// riquadro finto della scritta (39 px di altezza) che segue le classi e lo stile come nella pagina: a sinistra 26–142,
// a destra 1138–1254, oppure da style.left/right; in basso a 22 px o da style.bottom
function fakePopupRect(pop, box){
  return () => {
    const bottom = 720 - (pop.style.bottom ? parseFloat(pop.style.bottom) : 22);
    const l = pop.style.left ? parseFloat(pop.style.left) : pop.style.right ? 1280 - parseFloat(pop.style.right) - 116 : pop.classList.contains('side-right') ? 1138 : 26;
    return box(l, bottom - 39, l + 116, bottom);
  };
}

// Revisione B10, stesso schermo: la camera di ogni metà è più larga e il campo arriva quasi in basso. La scritta prova, nella
// sua metà, l'angolo in basso sotto le barre, poi sopra le barre, poi accanto alle barre; mai sopra l'etichetta della metà
test('stesso schermo: la scritta resta nella sua metà e salta i posti occupati dall’etichetta del giocatore', () => {
  const had = globalThis.document;
  const box = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t });
  const meters = [{ getBoundingClientRect: () => box(26, 600, 230, 648) }, { getBoundingClientRect: () => box(1050, 600, 1254, 648) }];
  let tags = [{ getBoundingClientRect: () => box(200, 665, 438, 697) }];
  const dom = fakeDom();
  dom.querySelectorAll = q => [...(/meter-group/.test(q) ? meters : []), ...(/split-tag/.test(q) ? tags : [])];
  globalThis.document = dom;
  try {
    const engine = { scene: { add(){} }, ball: { targetLanding: { x: 0, z: -8 } }, playerRole: 'p1', elapsedTime: 0, natpfSplit: { active: true }, hud: { showTimingPopup(){} } };
    new NatpfShotFeedback(engine);
    const pop = document.getElementById('timing-popup');
    pop.parentElement = { getBoundingClientRect: () => box(0, 0, 1280, 720) };
    pop.getBoundingClientRect = fakePopupRect(pop, box);
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.ok(!pop.classList.contains('side-right') && !pop.style.bottom && !pop.style.left, 'P1: in basso a sinistra, sotto le barre');
    engine.hud.showTimingPopup({ grade: 'P2 PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.ok(pop.classList.contains('side-right') && !pop.style.bottom, 'P2: in basso a destra, nella sua metà');
    // etichetta della metà larga fino all'angolo: sopra le barre
    tags = [{ getBoundingClientRect: () => box(20, 660, 438, 700) }];
    engine.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' });
    assert.equal(pop.style.bottom, `${(720 - 600 + 6).toFixed(1)}px`, 'sopra le barre');
    assert.ok(!pop.classList.contains('side-right'), 'mai nella metà dell’altro');
  } finally { if (had === undefined) delete globalThis.document; else globalThis.document = had; }
});
