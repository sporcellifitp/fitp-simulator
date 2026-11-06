// Telefono acceso e sensori vivi (site/js/tennis/phone-keep.js): blocco dello schermo ripreso dopo un rilascio o un
// rifiuto con la pagina visibile, al ritorno in primo piano e al tocco; sensori fermi riconosciuti solo a pagina visibile
// e dopo il tempo per ripartire. Browser finto: il comportamento vero di Android (quando rilascia o nega il blocco,
// quando sospende i sensori) si prova solo con il telefono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWakeKeeper, createSensorWatch, KEEP } from '../../site/js/tennis/phone-keep.js';

function fakeBrowser({ deny = 0 } = {}){
  const doc = { hidden: false }, timers = [], locks = [];
  let refuse = deny;
  const nav = { wakeLock: { async request(){
    if (refuse > 0){ refuse--; throw new Error('NotAllowedError'); }
    const ls = [], l = { released: false, addEventListener: (e, f) => e === 'release' && ls.push(f), release(){ if (l.released) return; l.released = true; ls.forEach(f => f()); } };
    locks.push(l); return l;
  } } };
  const setTimer = (f, ms) => { const t = { f, ms }; timers.push(t); return t; };
  const clearTimer = t => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); };
  const fire = async () => { const t = timers.shift(); assert.ok(t, 'nessuna attesa in programma'); t.f(); await new Promise(r => setTimeout(r, 0)); return t.ms; };
  return { doc, nav, timers, locks, setTimer, clearTimer, fire };
}
const tick = () => new Promise(r => setTimeout(r, 0));

test('blocco dello schermo: browser che non lo offre (-1), poi tenuto (1) e ripreso dopo un rilascio con la pagina visibile', async () => {
  assert.equal(createWakeKeeper({ nav: {}, doc: { hidden: false } }).state, -1);
  const B = fakeBrowser();
  let changes = 0;
  const w = createWakeKeeper({ nav: B.nav, doc: B.doc, setTimer: B.setTimer, clearTimer: B.clearTimer, onChange: () => changes++ });
  assert.equal(w.state, 0);
  assert.equal(await w.request(), true); assert.equal(w.state, 1);
  // il sistema lo rilascia con la pagina in primo piano (risparmio energetico): prima restava perso
  B.locks[0].release();
  assert.equal(w.state, 0); assert.equal(w.lost, 1); assert.ok(changes >= 2, 'il cambio si dice (al computer e sullo schermo)');
  assert.equal(await B.fire(), KEEP.retryMs[0]);
  assert.equal(w.state, 1, 'ripreso dopo la prima attesa');
  assert.equal(B.locks.length, 2);
});

test('blocco negato: nuove richieste con attese crescenti fino a 8 s; un tocco riprova subito', async () => {
  const B = fakeBrowser({ deny: 6 });
  const w = createWakeKeeper({ nav: B.nav, doc: B.doc, setTimer: B.setTimer, clearTimer: B.clearTimer });
  assert.equal(await w.request(), false); assert.equal(w.denied, true);
  const waits = [];
  for (let i = 0; i < 4; i++) waits.push(await B.fire());
  assert.deepEqual(waits, [1000, 2000, 4000, 8000]);
  // un tocco sullo schermo: subito, senza aspettare l'attesa in corso (ancora negato: si riparte dalle attese brevi)
  assert.equal(await w.tap(), false);
  assert.equal(B.timers.at(-1).ms, 1000);
  assert.equal(await w.tap(), true, 'al settimo tentativo il telefono lo concede');
  assert.equal(w.state, 1); assert.equal(w.denied, false);
  // già tenuto: un tocco non chiede di nuovo
  await w.tap(); assert.equal(B.locks.length, 1);
});

test('pagina nascosta: il rilascio non fa riprovare a vuoto; al ritorno in primo piano si riprende subito', async () => {
  const B = fakeBrowser();
  const w = createWakeKeeper({ nav: B.nav, doc: B.doc, setTimer: B.setTimer, clearTimer: B.clearTimer });
  await w.request();
  B.doc.hidden = true; B.locks[0].release();
  assert.equal(w.state, 0); assert.equal(B.timers.length, 0, 'nessuna richiesta con la pagina nascosta (il browser la negherebbe)');
  assert.equal(await w.request(), false, 'a pagina nascosta non si chiede');
  B.doc.hidden = false;
  assert.equal(await w.visible(), true); assert.equal(w.state, 1);
  // richieste contemporanee (ritorno in primo piano e tocco insieme): una sola al browser
  B.locks[1].release(); B.timers.length = 0;
  const [a, b] = await Promise.all([w.visible(), w.tap()]);
  assert.ok(a && b); assert.equal(B.locks.length, 3);
});

test('sensori fermi: solo con i sensori attesi e la pagina visibile, dopo il primo campione, e con il tempo per ripartire', () => {
  const s = createSensorWatch();
  assert.equal(s.stalled(5000), false, 'prima del primo campione decide la pagina (sensori non disponibili)');
  for (let t = 0; t <= 1000; t += 16) s.feed(t);
  assert.equal(s.stalled(1000 + KEEP.sensorGapMs - 10), false);
  assert.equal(s.stalled(1000 + KEEP.sensorGapMs + 10), true);
  assert.equal(s.stalled(1000 + KEEP.sensorGapMs + 10, { visible: false }), false, 'pagina nascosta: lo dice il computer');
  assert.equal(s.stalled(1000 + KEEP.sensorGapMs + 10, { active: false }), false, 'con i tocchi non servono');
  // ritorno in primo piano a 9 s: fino a sensorBackMs dopo si aspetta, poi se non arrivano sono fermi
  s.restart(9000);
  assert.equal(s.stalled(9000 + KEEP.sensorBackMs - 10), false);
  assert.equal(s.stalled(9000 + KEEP.sensorBackMs + 10), true);
  s.feed(11100);
  assert.equal(s.stalled(11200), false, 'tornati');
});

test('il rilascio di un blocco vecchio non tocca quello nuovo', async () => {
  const B = fakeBrowser();
  const w = createWakeKeeper({ nav: B.nav, doc: B.doc, setTimer: B.setTimer, clearTimer: B.clearTimer });
  await w.request(); B.locks[0].release(); await B.fire();
  assert.equal(w.state, 1);
  B.locks[0].release();                     // evento ripetuto del primo blocco
  assert.equal(w.state, 1); assert.equal(w.lost, 1);
  await tick();
});

// B9 (05/11): schermo riacceso. Dopo VEIL.delayMs, se il blocco dello schermo non è tenuto (iPhone vuole un tocco) o i
// sensori non sono ripartiti, il velo «Tocca lo schermo per riprendere»; una volta per ritorno, entro windowMs
test('velo «Tocca per riprendere»: solo dopo il ritorno, se mancano blocco o sensori, una volta, poi via con il tocco', async () => {
  const { createResumeVeil, VEIL } = await import('../../site/js/tennis/phone-keep.js');
  const v = createResumeVeil();
  assert.equal(v.update(5000, { wake: 0, lastSample: null }), false, 'senza un ritorno in primo piano: niente');
  v.back(10000);
  assert.equal(v.update(10000 + VEIL.delayMs - 1, { wake: 0, lastSample: null }), false, 'prima dell\'attesa: niente');
  assert.equal(v.update(10000 + VEIL.delayMs, { wake: 0, lastSample: 10100 }), true, 'blocco non tenuto: velo');
  assert.equal(v.update(10000 + VEIL.delayMs + 500, { wake: 1, lastSample: 10100 }), true, 'resta finché non si tocca');
  v.dismiss(); assert.equal(v.update(13000, { wake: 0, lastSample: null }), false, 'dopo il tocco non ricompare');
  // sensori non ripartiti (nessun campione dopo il ritorno), blocco tenuto
  v.back(20000); assert.equal(v.update(20000 + VEIL.delayMs, { wake: 1, lastSample: 19000 }), true);
  v.dismiss();
  // tutto a posto: niente velo, e per questo ritorno non si guarda più
  v.back(30000); assert.equal(v.update(30000 + VEIL.delayMs, { wake: 1, lastSample: 30500 }), false);
  assert.equal(v.update(30000 + VEIL.delayMs + 500, { wake: 0, lastSample: 30500 }), false, 'un rilascio dopo lo gestiscono gli avvisi piccoli');
  // il browser non offre il blocco (-1) o lo sta chiedendo: conta solo che i sensori siano ripartiti
  v.back(40000); assert.equal(v.update(40000 + VEIL.delayMs, { wake: -1, lastSample: 40200 }), false);
  v.back(50000); assert.equal(v.update(50000 + VEIL.delayMs, { wake: 0, wakeBusy: true, lastSample: 50200 }), false);
  // sensori non in uso (pagina «Attiva i sensori», tocchi): niente; oltre windowMs: niente
  v.back(60000); assert.equal(v.update(60000 + VEIL.delayMs, { active: false, wake: 0 }), false);
  assert.equal(v.update(60000 + VEIL.windowMs + 1, { wake: 0, lastSample: null }), false);
});
