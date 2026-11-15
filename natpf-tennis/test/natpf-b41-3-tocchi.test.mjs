// B41.3 · revisione della B41 seconda parte, difetto 1: un visitatore saltava per sbaglio i suoi scambi di prova. Il
// pulsante del telefono è uno solo (#next) e passa da «Sono pronto» a «Salta ›» in pochi millisecondi: due tocchi su «Sono
// pronto» a 150 o 400 ms, oppure «Gioca ›» dello staff e il tocco del visitatore a 60 ms, arrivavano a «Salta ›».
// Correzione (natpf_phone_racket.js): ogni offerta ha un numero che il telefono rimanda con il tocco (un tocco per
// un'offerta vecchia non vale), il telefono spegne il pulsante dopo il tocco (site/js/tennis/racchetta.js, prove in
// tools/test/b41-3-tocchi.test.mjs) e «Salta ›» appena offerto non vale per un secondo, anche dalle pagine del telefono di
// prima. Qui i tre casi del revisore, con la pagina del telefono nuova (con il numero) e con quella di prima (senza).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './ui-world.mjs';
import { playWorld, playTrial, stroke } from './trial-world.mjs';
import { nextTapVerdict, NEXT_TAP } from '../src/natpf/natpf_phone_racket.js';
import { drillsFor } from '../src/natpf/natpf_training.js';
import { gameStoreKey } from '@natpf/tennis/stand-pairing.js';

const PAIRED = JSON.stringify({ session: 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', key: 'abcdefghijkmnpqrstuvwxyz23', pairedAt: 1 });
const nx = link => link.sent.filter(m => m.t === 'nx').at(-1);

test('funzione pura: vale solo il tocco per l\'offerta di adesso, e non appena offerta se l\'offerta lo chiede', () => {
  const offer = { id: 7, at: 1000, graceMs: 1000 };
  assert.deepEqual(nextTapVerdict({ offer: null, tapId: 7, now: 5000 }), { ok: false, why: 'nessuna offerta' });
  assert.deepEqual(nextTapVerdict({ offer, tapId: 6, now: 5000 }), { ok: false, why: 'offerta vecchia' });
  assert.deepEqual(nextTapVerdict({ offer, tapId: 7, now: 1500 }), { ok: false, why: 'troppo presto' });
  assert.deepEqual(nextTapVerdict({ offer, tapId: null, now: 1999 }), { ok: false, why: 'troppo presto' }, 'pagina di prima, senza numero: conta il tempo');
  assert.deepEqual(nextTapVerdict({ offer, tapId: 7, now: 2000 }), { ok: true, why: '' });
  assert.deepEqual(nextTapVerdict({ offer, tapId: null, now: 2600 }), { ok: true, why: '' });
  assert.deepEqual(nextTapVerdict({ offer: { id: 3, at: 1000 }, tapId: 3, now: 1001 }), { ok: true, why: '' }, 'senza graceMs: subito');
  assert.equal(NEXT_TAP.graceMs, 1000);
});

test('ogni offerta ha il suo numero (la stessa ripetuta no); un tocco con il numero di prima non vale; dopo il tocco l\'offerta rimasta riparte con un numero nuovo', async () => {
  const w = await makeWorld({ controller: 'phone' }), { link, ui } = w, P = ui.phone;
  link.ready = true; link.L.phone = 'ready';
  const taps = []; P.onNext(() => taps.push(P.nextOffer));
  P.offerNext('Avanti ›');
  const a = nx(link);
  assert.ok(Number.isInteger(a.id) && a.lb === 'Avanti ›');
  P.offerNext('Avanti ›'); assert.equal(nx(link), a, 'la stessa offerta ripetuta: niente messaggio nuovo, stesso numero');
  P.offerNext('Salta ›'); const b = nx(link);
  assert.ok(b.id !== a.id && b.lb === 'Salta ›', 'offerta nuova, numero nuovo');
  assert.equal(P._onNext({ id: a.id }), false, 'tocco per «Avanti ›», che non c\'è più');
  assert.deepEqual(taps, []);
  assert.equal(P._onNext({ id: b.id }), true);
  assert.deepEqual(taps, ['Salta ›']);
  // l'offerta è rimasta la stessa (come «Avanti ›» degli esercizi): riparte con un numero nuovo, il telefono riaccende il
  // pulsante; il numero di prima non vale più
  const c = nx(link);
  assert.ok(c.id !== b.id && c.lb === 'Salta ›', JSON.stringify(c));
  assert.equal(P._onNext({ id: b.id }), false, 'un secondo tocco con lo stesso numero non vale');
  assert.equal(P._onNext({}), true, 'pagina di prima (senza numero): vale, come prima');
  P.offerNext(null);
  assert.deepEqual(nx(link), { t: 'nx', on: 0 });
  assert.equal(P._onNext({}), false, 'senza offerta niente');
  assert.equal(taps.length, 2);
});

test('graceMs: per il primo secondo nessun tocco vale (nemmeno dalle pagine di prima); il pulsante torna acceso subito', async () => {
  const w = await makeWorld({ controller: 'phone' }), { link, ui } = w, P = ui.phone;
  link.ready = true; link.L.phone = 'ready';
  const taps = []; P.onNext(() => taps.push(1));
  P.offerNext('Salta ›', null, { graceMs: NEXT_TAP.graceMs });
  const a = nx(link);
  w.advance(300);
  assert.equal(P._onNext({ id: a.id }), false, 'troppo presto');
  const b = nx(link);
  assert.ok(b.id !== a.id && b.lb === 'Salta ›', 'la stessa offerta con un numero nuovo: il telefono riaccende il pulsante');
  w.advance(400);
  assert.equal(P._onNext({}), false, 'pagina di prima: troppo presto anche lei');
  w.advance(400);
  assert.equal(P._onNext({ id: nx(link).id }), true, 'dopo un secondo dall\'offerta vale');
  assert.equal(taps.length, 1);
});

// mondo della fiera: Telefono 1 dello stand abbinato (finto, senza rete) che risponde come la pagina vera, pagina della fiera
async function fairWorld(){
  const w = await playWorld({ cal: 'play', mode: null }), { ui } = w;
  localStorage.setItem(gameStoreKey('p1'), PAIRED);
  ui.phone.useStand = function(slot){ this.standSlot = slot || null; return Promise.resolve(this); };
  ui.fiera.setOn(true);
  w.advance(300);
  ui.lobby.go('menu'); w.advance(300);
  return w;
}
// gli scambi di prova restano accesi (non saltati) per ms
function holds(w, ms = 4000){
  const T = w.ui.trial;
  for (let t = 0; t < ms; t += 100){ w.advance(100); if (!T.active || T.S?.phase === 'outro') return false; }
  return true;
}

for (const page of ['nuova', 'di prima']){
  // pagina nuova: il tocco porta il numero dell'offerta che il telefono ha in quel momento (dopo il primo tocco il pulsante
  // si riaccende con l'offerta dopo, «Salta ›»); pagina di prima: nessun numero
  const tapOn = (P, link) => P._onNext(page === 'nuova' ? { id: nx(link).id } : {});
  for (const gap of [150, 400]){
    test(`B41.3 · due tocchi su «Sono pronto» a ${gap} ms (pagina del telefono ${page}): gli scambi di prova partono e non si saltano`, async () => {
      const w = await fairWorld(), { E, ui, link } = w, P = ui.phone;
      w.advance(300);
      assert.equal(nx(link).lb, 'Sono pronto');
      assert.equal(tapOn(P, link), true, 'primo tocco: «Sono pronto»');
      w.advance(gap);
      assert.ok(ui.trial.active, 'scambi di prova partiti');
      assert.equal(nx(link).lb, 'Salta ›', 'sul telefono c\'è già «Salta ›»');
      assert.equal(tapOn(P, link), false, 'secondo tocco: «Salta ›» appena offerto non vale');
      assert.ok(holds(w, 4000), 'gli scambi di prova restano');
      assert.equal(E.natpfMatchSeq || 0, 0, 'la partita non è partita');
      // «Salta ›» toccato apposta (più di un secondo dopo): vale, la partita parte
      assert.equal(tapOn(P, link), true);
      w.advance(1000);
      assert.ok(!ui.trial.active && E.natpfMatchSeq === 1, 'partita');
    });
  }
  test(`B41.3 · «Gioca ›» dello staff e il tocco del visitatore su «Sono pronto» a 60 ms (pagina del telefono ${page}): gli scambi di prova non si saltano`, async () => {
    const w = await fairWorld(), { E, ui, link } = w, P = ui.phone;
    w.advance(300);
    const ready = nx(link);
    assert.equal(ready.lb, 'Sono pronto');
    assert.equal(w.pressStart(), false, '«Gioca ›»: prima gli scambi di prova');
    assert.ok(ui.trial.active);
    w.advance(60);
    // il visitatore tocca «Sono pronto»: il telefono non ha ancora «Salta ›» (con il numero di «Sono pronto») o ce l'ha appena
    const r = P._onNext(page === 'nuova' ? { id: ready.id } : {});
    assert.equal(r, false, 'il tocco per «Sono pronto» non salta gli scambi di prova');
    assert.ok(holds(w, 4000), 'gli scambi di prova restano');
    assert.equal(E.natpfMatchSeq || 0, 0);
  });
}

test('B41.3 · un tocco solo su «Sono pronto» e «Gioca ›» da solo: come prima (scambi di prova, poi la partita)', async () => {
  let w = await fairWorld(), { E, ui, link } = w;
  w.advance(300);
  assert.equal(ui.phone._onNext({ id: nx(link).id }), true);
  w.advance(100);
  assert.ok(ui.trial.active && holds(w, 3000));
  assert.equal(ui.events.nickname, 'Visitatore 1');
  playTrial(w, (id, n, want) => stroke({ dir: want }), { gioca: false });
  assert.ok(!ui.trial.active && E.natpfMatchSeq === 1, 'partita dopo gli scambi di prova');
  w = await fairWorld(); ({ E, ui, link } = w);
  w.advance(300);
  assert.equal(w.pressStart(), false);
  assert.ok(ui.trial.active && holds(w, 3000));
  playTrial(w, (id, n, want) => stroke({ dir: want }), { gioca: false });
  assert.ok(!ui.trial.active && E.natpfMatchSeq === 1);
});

test('B41.3 · «Salta ›» toccato: sparisce subito dal telefono (non resta acceso durante la scritta finale)', async () => {
  const w = await fairWorld(), { ui, link } = w, P = ui.phone;
  w.advance(300);
  w.pressStart(); w.advance(1200);
  const s = nx(link);
  assert.equal(s.lb, 'Salta ›');
  assert.equal(P._onNext({ id: s.id }), true);
  assert.equal(ui.trial.S?.phase, 'outro');
  assert.deepEqual(nx(link), { t: 'nx', on: 0 }, 'offerta tolta subito');
});

test('B41.3 · esercizi dell\'Allenamento: «Avanti ›» dal telefono passa un esercizio per tocco e torna acceso con un numero nuovo', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, link } = w, T = ui.training, P = ui.phone;
  link.ready = true; link.L.phone = 'ready'; P.markTutorialSeen('full');
  T.start({ drills: drillsFor('phone') }); w.advance(300);
  const a = nx(link);
  assert.equal(a.lb, 'Avanti ›');
  const first = T.drill.id;
  assert.equal(P._onNext({ id: a.id }), true);
  assert.notEqual(T.drill.id, first, 'esercizio dopo');
  const b = nx(link);
  assert.ok(b.lb === 'Avanti ›' && b.id !== a.id, 'stessa scritta, offerta nuova (il telefono riaccende il pulsante)');
  const second = T.drill.id;
  assert.equal(P._onNext({ id: a.id }), false, 'il tocco ripetuto con il numero di prima non salta un altro esercizio');
  assert.equal(T.drill.id, second);
  w.advance(800);
  assert.equal(P._onNext({ id: nx(link).id }), true);
  assert.notEqual(T.drill.id, second);
});
