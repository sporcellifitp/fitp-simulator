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
