// Tutorial in campo (28/10): lezione iniziale, feedback in tempo reale dal gesto letto dal telefono, volée a rete; modale
// del tutorial con le frecce e il telefono che conferma dopo l'ultima scheda (B9, 05/11).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DRILLS, LESSON, liveFeedback, VOLLEY_Z } from '../src/natpf/natpf_training.js';
import { makeWorld } from './ui-world.mjs';
import { TUTORIAL, TUTORIAL_CARDS, TUTORIAL_SHORT_IDS, tutorialCards, tutorialSetFor, tutorialResumeAfterShort, tutorialStart, tutorialGo, tutorialSeen, tutorialProgress, tutorialWait } from '../src/natpf/natpf_tutorial.js';

const D = id => DRILLS.find(d => d.id === id);

test('feedback in tempo reale: riconosce il gesto giusto e spiega quello sbagliato (anche per il mancino)', () => {
  assert.equal(liveFeedback(D('forehand'), { shot: 'topspin', power: .8 }, { side: 'forehand' }).ok, true);
  const wrong = liveFeedback(D('forehand'), { shot: 'topspin' }, { side: 'backhand' });
  assert.equal(wrong.ok, false); assert.match(wrong.tip, /da destra verso sinistra/);
  assert.match(liveFeedback(D('forehand'), { shot: 'topspin' }, { side: 'backhand', hand: 'left' }).tip, /da sinistra verso destra/);
  assert.match(liveFeedback(D('lob'), { shot: 'topspin' }, { side: 'forehand' }).tip, /dal basso verso l’alto/);
  assert.match(liveFeedback(D('drop'), { shot: 'slice' }, {}).tip, /lento/);
  assert.match(liveFeedback(D('slice'), { shot: 'drop' }, {}).tip, /deciso/);
  assert.equal(liveFeedback(D('smash'), { shot: 'smash' }, {}).ok, true);
  assert.match(liveFeedback(D('flat'), { shot: 'topspin' }, { side: 'forehand' }).tip, /più veloce/i);
  // incrociato: il dritto del destro va a sinistra (mira negativa); per il mancino il contrario
  assert.equal(liveFeedback(D('cross'), { shot: 'topspin', wrist: -.6 }, { side: 'forehand' }).ok, true);
  assert.equal(liveFeedback(D('cross'), { shot: 'topspin', wrist: .6 }, { side: 'forehand' }).ok, false);
  assert.equal(liveFeedback(D('cross'), { shot: 'topspin', wrist: .6 }, { side: 'forehand', hand: 'left' }).ok, true);
  assert.equal(liveFeedback(D('line'), { shot: 'topspin', wrist: .6 }, { side: 'forehand' }).ok, true);
  assert.equal(liveFeedback(D('forehand'), null), null);
});

// Richiesta del 04/11, rifatta in B9 (05/11): con il telefono, prima della calibrazione, una modale compatta con la presa e
// tutti i gesti, sfogliata con le frecce ‹ › (anche dal telefono), niente scorrimento automatico; si chiude dal telefono
// con «Tutto chiaro, ho capito», che il telefono accende solo dopo aver visto tutte le schede (avanzamento «tp»). Una volta
// per abbinamento del telefono: non a ogni ricollegamento
// messaggi del telefono come li consegna il collegamento (link.js → NatpfPhoneRacket._onTut)
const fromPhone = (P, d) => P._onTut({ wait: !!d.w, ok: !!d.ok, v: d.v === 2 ? 2 : 1, nav: d.nav === 1 || d.nav === -1 ? d.nav : 0 });
const lastTp = link => link.sent.filter(m => m.t === 'tp').at(-1);
// tutte le schede, una dopo l'altra, ciascuna a schermo più di TUTORIAL.seenMs (frecce del telefono)
const seeAll = (w, P, T, n = T?.tutorial?.state?.cards || TUTORIAL_CARDS.length) => { for (let i = T?.tutorial?.state?.idx || 0; i < n; i++){ w.advance(TUTORIAL.seenMs + 300); if (i < n - 1) fromPhone(P, { nav: 1 }); } };

test('tutorial prima della calibrazione: modale con presa e gesti, il telefono aspetta «Tutto chiaro, ho capito», poi calibra da solo', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training, P = w.ui.phone;
  let recal = 0; const orig = P.recalibrate.bind(P); P.recalibrate = () => { recal++; return orig(); };
  T.start({ intro: true });
  assert.ok(T.tutorialOpen && T.tutorial.open, 'modale aperta'); assert.equal(T.lesson, null, 'con il telefono la lezione è la modale');
  assert.equal(P.tutWait, true); assert.ok(P.link.sent.some(m => m.t === 'cfg' && m.tut === 1 && m.tv === 2), 'il telefono aspetta il tutorial (versione 2)');
  assert.equal(recal, 0, 'nessuna calibrazione con la modale aperta');
  fromPhone(P, { w: 1, v: 2 }); assert.ok(P.tutSupported && P.tutV2);
  T._onCal({ kind: 'step', step: 'still' }); assert.ok(T.tutorialOpen, 'gli eventi del telefono non chiudono la modale');
  // l'avanzamento va al telefono: scheda 1 di 11, nessuna vista
  assert.deepEqual({ ...lastTp(w.link), nm: undefined }, { t: 'tp', i: 0, n: TUTORIAL_CARDS.length, s: 0, m: 0, all: 0, nm: undefined });
  // niente scorrimento automatico: dopo 20 s la scheda è la stessa (e conta come vista)
  w.advance(20000); assert.equal(T.tutorial.state.idx, 0); assert.equal(lastTp(w.link).s, 1, 'la prima scheda è vista dopo ~1 s');
  // dietro la modale aperta a lungo il giocatore aspetta al centro: niente servizio preparato dal motore, niente
  // «Telefono scollegato» nel pannello (il telefono aspetta il tutorial)
  assert.equal(w.E.phase, 'POINT_OVER', 'nessun servizio dietro la modale'); assert.equal(w.E.player.pos.x, 0, 'giocatore al centro');
  w.link.L.phone = 'tut'; T.paint(); assert.equal(T.coach.querySelector('#coach-text').textContent, 'Come si gioca'); w.link.L.phone = 'cal';
  // «ho capito» toccato prima di aver visto tutto (messaggi incrociati): non chiude, il telefono riceve di nuovo il cancello
  const sentBefore = w.link.sent.length;
  fromPhone(P, { ok: 1 });
  assert.ok(T.tutorialOpen, 'non si chiude prima dell\'ultima scheda');
  assert.ok(w.link.sent.slice(sentBefore).some(m => m.t === 'cfg' && m.tut === 1), 'cancello rimandato'); assert.ok(w.link.sent.slice(sentBefore).some(m => m.t === 'tp'));
  // frecce del telefono: avanti fino all'ultima scheda, ognuna vista
  seeAll(w, P, T);
  assert.equal(T.tutorial.state.idx, TUTORIAL_CARDS.length - 1); assert.equal(lastTp(w.link).all, 1, 'tutte viste'); assert.equal(lastTp(w.link).s, TUTORIAL_CARDS.length);
  fromPhone(P, { nav: 1 }); assert.equal(T.tutorial.state.idx, TUTORIAL_CARDS.length - 1, 'dopo l\'ultima non si torna alla prima');
  fromPhone(P, { ok: 1 });
  assert.ok(!T.tutorialOpen && !T.tutorial.open, 'chiusa dal telefono'); assert.equal(recal, 0, 'la calibrazione la fa partire il telefono (una volta sola)');
  assert.equal(P.tutWait, false); assert.equal(P.link.sent.filter(m => m.t === 'cfg').at(-1).tut, undefined, 'il telefono non aspetta più');
  // in calibrazione niente riquadro «Guarda e ripeti» in alto a destra
  T.paint(); assert.ok(T.coach.querySelector('#coach-demo').classList.contains('hidden'));
  // una volta per abbinamento del telefono
  T.stop({ completed: false, silent: true }); T.start({ intro: true }); assert.ok(!T.tutorialOpen, 'non si ripete con lo stesso telefono');
  T.stop({ completed: false, silent: true });
  // ricollegamento dello stesso telefono (pagina ricaricata, schermo spento, «Ricollega»: chiave di ripresa): niente tutorial
  w.link.L.joins = 5; w.link.L.resumed = true; T.start({ intro: true }); assert.ok(!T.tutorialOpen, 'ricollegamento: niente tutorial');
  T.stop({ completed: false, silent: true });
  // abbinamento nuovo (QR, forse un'altra persona): di nuovo
  w.link.L.pairs = 2; T.start({ intro: true }); assert.ok(T.tutorialOpen, 'abbinamento nuovo: si rivede');
  // «Rivedi i gesti»: la stessa modale, da chiudere sul computer, senza fermare il telefono
  T._tutorialDone('skip'); T.reviewGestures(); assert.ok(T.tutorial.open && !T.tutorialOpen && !P.tutWait); T.tutorial.close('review'); assert.ok(!T.tutorial.open);
  T.stop({ completed: false, silent: true });
});

// B16 (decisione dell'utente dell'08/11 sera, «tutorial corto prima della partita: ok»): prima della partita contro la CPU
// (riscaldamento o sola calibrazione), della sfida tra due computer e dei minigiochi il tutorial ha 5 schede (presa,
// posizione, dritto, rovescio, servizio) e «Tutto chiaro» si accende quando le 5 sono viste; le altre 6 restano
// nell'Allenamento (tutte le 11; dopo il corto, con lo stesso telefono, dalla sesta) e in «Rivedi i gesti» (sempre 11).
// Il protocollo non cambia: n del messaggio tp è il numero delle schede di quel tutorial (un telefono con la pagina di
// prima lo legge uguale)
test('tutorial corto prima della partita (5 schede), completo nell\'Allenamento e in «Rivedi i gesti»', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training, P = w.ui.phone;
  w.lobby.setMode('cpu');
  T.start({ calOnly: true });
  assert.ok(T.tutorialOpen); assert.equal(T.tutorial.set, 'short');
  assert.deepEqual(T.tutorial.cards.map(c => c.id), ['grip', 'ready', 'forehand', 'backhand', 'serve']);
  fromPhone(P, { w: 1, v: 2 });
  assert.deepEqual({ ...lastTp(w.link), nm: undefined }, { t: 'tp', i: 0, n: 5, s: 0, m: 0, all: 0, nm: undefined }, 'il telefono riceve 5 schede');
  // dopo la quarta scheda non è ancora finito; «ho capito» prima della quinta non chiude
  for (let i = 0; i < 4; i++){ w.advance(TUTORIAL.seenMs + 300); fromPhone(P, { nav: 1 }); }
  assert.equal(T.tutorial.state.idx, 4); assert.equal(lastTp(w.link).all, 0); assert.equal(lastTp(w.link).nm, 'Servizio');
  fromPhone(P, { ok: 1 }); assert.ok(T.tutorialOpen, 'prima di aver visto il servizio non si chiude');
  fromPhone(P, { nav: 1 }); assert.equal(T.tutorial.state.idx, 4, 'dopo il servizio non ci sono altre schede');
  w.advance(TUTORIAL.seenMs + 300);
  assert.deepEqual({ ...lastTp(w.link), nm: undefined }, { t: 'tp', i: 4, n: 5, s: 5, m: 31, all: 1, nm: undefined }, 'tutte e 5 viste: «Tutto chiaro» si accende');
  fromPhone(P, { ok: 1 });
  assert.ok(!T.tutorialOpen); assert.ok(P.tutorialSeen && P.tutorialSeenFor('short') && !P.tutorialSeenFor('full'));
  // «Rivedi i gesti»: sempre tutte le schede
  T.reviewGestures(); assert.equal(T.tutorial.set, 'full'); assert.equal(T.tutorial.cards.length, TUTORIAL_CARDS.length); T.tutorial.close('review');
  T.stop({ completed: false, silent: true });
  // stesso telefono, poi la partita di nuovo: il tutorial corto non si ripete
  T.start({ calOnly: true }); assert.ok(!T.tutorialOpen, 'corto già visto'); T.stop({ completed: false, silent: true });
  // stesso telefono nell'Allenamento: il tutorial completo dalla sesta scheda (pallonetto, piatto…), le prime 5 già viste
  w.lobby.setMode('training');
  T.start({ intro: true });
  assert.ok(T.tutorialOpen); assert.equal(T.tutorial.set, 'full'); assert.equal(T.tutorial.state.idx, 5); assert.equal(T.tutorial.state.visited.size, 5);
  assert.equal(T.tutorial.card.id, TUTORIAL_CARDS[5].id);
  fromPhone(P, { w: 1, v: 2 }); assert.equal(lastTp(w.link).n, TUTORIAL_CARDS.length); assert.equal(lastTp(w.link).all, 0, 'il corto visto non accende il completo');
  seeAll(w, P, T); assert.equal(lastTp(w.link).all, 1);
  fromPhone(P, { ok: 1 }); assert.ok(!T.tutorialOpen && P.tutorialSeenFor('full'));
  T.stop({ completed: false, silent: true });
  // visto il completo, il corto non si rivede (prima della partita)
  w.lobby.setMode('cpu'); T.start({ calOnly: true }); assert.ok(!T.tutorialOpen); T.stop({ completed: false, silent: true });
  // abbinamento nuovo nell'Allenamento: tutte le 11 dalla prima
  w.link.L.pairs = 3; w.lobby.setMode('training'); T.start({ intro: true });
  assert.equal(T.tutorial.state.idx, 0); assert.equal(T.tutorial.state.visited.size, 0); assert.equal(T.tutorial.cards.length, TUTORIAL_CARDS.length);
  T.stop({ completed: false, silent: true });
});

test('tutorial corto, stato puro: le 5 schede sono le prime 5 del completo (stessi indici), serie per modalità, ripresa', () => {
  assert.deepEqual(TUTORIAL_SHORT_IDS, ['grip', 'ready', 'forehand', 'backhand', 'serve']);
  assert.deepEqual(tutorialCards('short').map(c => c.id), TUTORIAL_CARDS.slice(0, 5).map(c => c.id), 'prefisso del completo: la maschera m vale per tutte e due');
  assert.equal(tutorialCards('full'), TUTORIAL_CARDS); assert.equal(tutorialCards('qualunque'), TUTORIAL_CARDS);
  assert.deepEqual(['cpu', 'friend', 'challenge', 'split', 'training', undefined].map(tutorialSetFor), ['short', 'short', 'short', 'short', 'full', 'short']);
  // le schede tolte prima della partita: i colpi speciali e la volée
  assert.deepEqual(TUTORIAL_CARDS.slice(5).map(c => c.id).sort(), ['drop', 'flat', 'lob', 'slice', 'smash', 'volley']);
  // corto visto tutto, poi il completo: «all» non passa (n diverso), le schede viste restano
  let s = tutorialStart({ cards: 5 }); for (let i = 0; i < 5; i++){ s = tutorialGo(s, i, { now: i*2000 }); s = tutorialSeen(s, { now: i*2000 + TUTORIAL.seenMs }); }
  assert.ok(s.all);
  const snap = { idx: s.idx, visited: [...s.visited], all: s.all, n: s.cards };
  const f = tutorialStart({ cards: TUTORIAL_CARDS.length, from: snap });
  assert.ok(!f.all); assert.equal(f.visited.size, 5); assert.equal(f.idx, 4);
  assert.ok(tutorialStart({ cards: 5, from: snap }).all, 'stessa serie: tutto visto resta');
  const r = tutorialStart({ cards: TUTORIAL_CARDS.length, from: tutorialResumeAfterShort() });
  assert.equal(r.idx, 5); assert.deepEqual([...r.visited], [0, 1, 2, 3, 4]); assert.ok(!r.all);
  // il completo interrotto e poi il corto: indici oltre il quinto ignorati, scheda raggiunta portata sull'ultima
  const c = tutorialStart({ cards: 5, from: { idx: 8, visited: [0, 1, 2, 3, 4, 5, 6, 7], all: false, n: 11 } });
  assert.equal(c.idx, 4); assert.ok(c.all, 'le 5 già viste nel completo bastano per il corto');
});

// Revisione B9 (06/11), minore f: nell'Allenamento il telefono mostrava per ~0,76 s la calibrazione («Preparati») tra
// «Attiva i sensori» e il tutorial: nella pagina «Collega» il computer non chiedeva ancora di aspettare il tutorial e la
// lobby entrava in campo solo con il telefono in calibrazione. Ora il telefono aspetta il tutorial già lì ('tut' conta
// come sensori attivi); lasciando la pagina senza entrare in campo, o con un percorso senza tutorial, smette di aspettarlo
test('tutorial: nella pagina «Collega» il telefono aspetta già il tutorial (niente calibrazione prima), e smette se non si entra', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, lobby, link } = w, P = ui.phone;
  link.L.phone = 'sensors';
  lobby.go('mode'); lobby.setMode('training'); lobby.go('connect');
  const from = link.sent.length;
  assert.equal(P.tutWait, true, 'aspetta il tutorial già nella pagina «Collega»');
  assert.ok(link.sent.some(m => m.t === 'cfg' && m.tut === 1 && m.tv === 2));
  w.advance(1500); assert.equal(lobby.step, 'connect', 'sensori non ancora attivi: si resta qui');
  // «Attiva i sensori» sul telefono: con il cancello aperto va al tutorial e lo dice ('tut'); la lobby entra in campo
  fromPhone(P, { w: 1, v: 2 }); link.L.phone = 'tut';
  assert.equal(lobby.state().phoneLinked, true, "'tut' = sensori attivi");
  w.advance(1500);
  assert.ok(ui.training.active && ui.training.tutorialOpen, 'in campo con la modale del tutorial');
  assert.equal(lobby.tutPrearm, false, "da qui lo gestisce l'allenamento");
  assert.ok(!link.sent.slice(from).some(m => m.t === 'cfg' && !m.tut), 'mai un cfg senza tutorial: il telefono non calibra prima');
  assert.equal(P.tutWait, true);
  ui.training.stop({ completed: false, silent: true });
  // pagina «Collega» lasciata senza entrare in campo: il telefono non resta ad aspettare
  const w2 = await makeWorld({ controller: 'phone' });
  w2.link.L.phone = 'sensors';
  w2.lobby.go('mode'); w2.lobby.setMode('cpu'); w2.lobby.go('connect'); assert.equal(w2.ui.phone.tutWait, true);
  w2.lobby.go('mode');
  assert.equal(w2.ui.phone.tutWait, false); assert.equal(w2.link.sent.filter(m => m.t === 'cfg').at(-1).tut, undefined);
  // percorso senza tutorial (prova guidata della diagnostica): in campo il telefono smette di aspettarlo e calibra
  const w3 = await makeWorld({ controller: 'phone' });
  w3.lobby.go('mode'); w3.lobby.setMode('training'); w3.lobby.go('connect'); assert.equal(w3.ui.phone.tutWait, true);
  w3.lobby.startDiag([DRILLS[0]], { onFeed(){}, onEnd(){} });
  assert.ok(w3.ui.training.active && !w3.ui.training.tutorialOpen); assert.equal(w3.ui.phone.tutWait, false);
  // telefono che ha già visto il tutorial: niente attesa
  const w4 = await makeWorld({ controller: 'phone' });
  w4.ui.phone.markTutorialSeen(); w4.lobby.go('mode'); w4.lobby.setMode('training'); w4.lobby.go('connect');
  assert.equal(w4.ui.phone.tutWait, false);
  // stesso schermo: lo gestisce la sua pagina (natpf_split_ui), non la lobby
  const w5 = await makeWorld({ controller: 'phone' });
  w5.lobby.go('mode'); w5.lobby.setMode('split'); w5.lobby.go('connect'); assert.equal(w5.lobby.tutPrearm, undefined);
});

test('tutorial: indietro dopo aver visto tutto non spegne «ho capito»; uscita a metà e ripresa dalla scheda raggiunta', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training, P = w.ui.phone;
  T.start({ intro: true }); fromPhone(P, { w: 1, v: 2 });
  for (let i = 0; i < 4; i++){ w.advance(1300); fromPhone(P, { nav: 1 }); }
  assert.equal(T.tutorial.state.idx, 4); assert.equal(lastTp(w.link).s, 4);
  // si esce prima della fine (menu): stesso telefono, la modale riparte dalla scheda raggiunta con le schede già viste
  T.stop({ completed: false, silent: true });
  assert.ok(!P.tutWait && !P.tutorialSeen);
  T.start({ intro: true });
  assert.ok(T.tutorialOpen); assert.equal(T.tutorial.state.idx, 4); assert.equal(T.tutorial.state.visited.size, 4);
  for (let i = 4; i < TUTORIAL_CARDS.length; i++){ w.advance(1300); if (i < TUTORIAL_CARDS.length - 1) fromPhone(P, { nav: 1 }); }
  assert.equal(lastTp(w.link).all, 1);
  // indietro: «tutte viste» resta, il telefono può confermare da qualunque scheda
  for (let i = 0; i < 3; i++) fromPhone(P, { nav: -1 });
  w.advance(300);
  assert.equal(T.tutorial.state.idx, TUTORIAL_CARDS.length - 4); assert.equal(lastTp(w.link).all, 1); assert.equal(lastTp(w.link).i, TUTORIAL_CARDS.length - 4);
  fromPhone(P, { ok: 1 }); assert.ok(!T.tutorialOpen && P.tutorialSeen);
  T.stop({ completed: false, silent: true });
});

test('tutorial: telefono già pronto → dopo «ho capito» si va agli esercizi; ricalibrare non lo riapre', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training, P = w.ui.phone;
  w.link.ready = true; w.link.L.phone = 'ready';
  T.start({ intro: true });
  assert.ok(T.tutorialOpen && !T.cal, 'pronto: niente calibrazione dopo');
  assert.match(T.tutorial.root.querySelector('.tut-wait').textContent, /Sfoglia le schede/);
  fromPhone(P, { w: 1, v: 2 }); seeAll(w, P, T);
  assert.match(T.tutorial.root.querySelector('.tut-wait').textContent, /poi si comincia/, 'il testo dice cosa succede dopo (prima «poi si calibra» anche da pronto)');
  fromPhone(P, { ok: 1 });
  assert.ok(!T.tutorialOpen && T.active && !T.cal);
  // «Ricalibra» (dal computer o dal telefono): la calibrazione, non il tutorial
  P.recalibrate(); w.link.ready = false; w.link.L.phone = 'cal'; w.advance(200);
  assert.ok(!T.tutorialOpen && !P.tutWait);
  T.stop({ completed: false, silent: true });
});

test('tutorial: Esc di chi gestisce la postazione, frecce della tastiera e del computer', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training, P = w.ui.phone;
  T.start({ intro: true });
  w.key('ArrowRight'); w.key('ArrowRight'); assert.equal(T.tutorial.state.idx, 2);
  w.key('ArrowLeft'); assert.equal(T.tutorial.state.idx, 1);
  T.tutorial.step(-1); T.tutorial.step(-1); assert.equal(T.tutorial.state.idx, 0, 'prima della prima non si va');
  T.tutorial.go(99); assert.equal(T.tutorial.state.idx, TUTORIAL_CARDS.length - 1);
  w.key('Escape'); assert.ok(!T.tutorialOpen && P.tutorialSeen, 'Esc chiude e conta come visto');
  T.stop({ completed: false, silent: true });
});

test('tutorial: telefono con la pagina di prima (non lo conosce) — la modale si chiude quando comincia a calibrare da solo', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training;
  T.start({ calOnly: true });
  assert.ok(T.tutorialOpen, 'anche prima di una sfida');
  T._onCal({ kind: 'step', step: 'still' });
  assert.ok(!T.tutorialOpen && w.ui.phone.tutorialSeen);
  T.stop({ completed: false, silent: true });
});

test('tutorial: telefono che risponde senza versione 2 (pagina di prima, pulsante subito acceso) — «ho capito» vale subito', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training, P = w.ui.phone;
  T.start({ intro: true }); fromPhone(P, { w: 1 });
  assert.ok(P.tutSupported && !P.tutV2);
  fromPhone(P, { ok: 1 }); assert.ok(!T.tutorialOpen);
  T.stop({ completed: false, silent: true });
});

test('tutorial, stato puro: frecce senza giro, scheda vista dopo seenMs, «tutte viste» che non torna indietro, ripresa', () => {
  let s = tutorialStart({ now: 0 });
  assert.equal(s.idx, 0); assert.equal(s.visited.size, 0);
  s = tutorialSeen(s, { now: TUTORIAL.seenMs - 1 }); assert.equal(s.visited.size, 0, 'non ancora');
  s = tutorialSeen(s, { now: TUTORIAL.seenMs }); assert.ok(s.visited.has(0));
  s = tutorialGo(s, 1, { now: 2000 }); s = tutorialGo(s, 2, { now: 2100 }); s = tutorialSeen(s, { now: 2200 });
  assert.ok(!s.visited.has(1), 'scheda passata di fila: non vista'); assert.ok(!s.visited.has(2));
  // lasciata dopo seenMs senza che il controllo periodico sia passato (computer sotto carico): conta lo stesso (06/11)
  let q = tutorialStart({ now: 0 }); q = tutorialGo(q, 1, { now: TUTORIAL.seenMs + 50 });
  assert.ok(q.visited.has(0), 'la prima scheda guardata 1 s conta anche senza il controllo periodico'); assert.ok(!q.visited.has(1));
  q = tutorialGo(q, 2, { now: TUTORIAL.seenMs + 400 }); assert.ok(!q.visited.has(1), 'lasciata prima di seenMs: non conta');
  s = tutorialGo(s, -5, { now: 3000 }); assert.equal(s.idx, 0); s = tutorialGo(s, 50, { now: 3100 }); assert.equal(s.idx, TUTORIAL_CARDS.length - 1);
  for (let i = 0; i < TUTORIAL_CARDS.length; i++){ s = tutorialGo(s, i, { now: 10000 + i*2000 }); s = tutorialSeen(s, { now: 10000 + i*2000 + TUTORIAL.seenMs }); }
  assert.ok(s.all); assert.deepEqual(tutorialProgress(s), { i: TUTORIAL_CARDS.length - 1, n: TUTORIAL_CARDS.length, s: TUTORIAL_CARDS.length, m: (1 << TUTORIAL_CARDS.length) - 1, all: true });
  s = tutorialGo(s, 0, { now: 50000 }); assert.ok(s.all, 'indietro dopo aver visto tutto: resta tutto visto');
  const r = tutorialStart({ now: 0, from: { idx: 3, visited: [0, 1, 2, 99], all: false } });
  assert.equal(r.idx, 3); assert.deepEqual([...r.visited], [0, 1, 2]);
  // testi in fondo: prima «sfoglia», poi cosa succede dopo
  assert.match(tutorialWait({ all: false }), /Sfoglia le schede con ‹ ›/); assert.match(tutorialWait({ all: true }), /Tutto chiaro, ho capito.*si calibra/);
  assert.match(tutorialWait({ all: true, after: 'ready', half: true }), /tuo telefono.*sei pronto/); assert.equal(tutorialWait({ mode: 'review' }), '');
  // tutti i gesti del tutorial (presa e posizione comprese) hanno titolo e indicazioni
  for (const c of TUTORIAL_CARDS) assert.ok(c.title && (c.cues.length || c.text), c.id);
  assert.deepEqual(TUTORIAL_CARDS.slice(0, 2).map(c => c.id), ['grip', 'ready']);
});

test('tutorial: l\'animazione riceve mount/setSize/play una volta per scheda (non a ogni scheda vista), stop alla chiusura', async () => {
  const calls = [];
  const demo = { available: true, mount: el => calls.push(['mount']), setSize: (w, h) => calls.push(['size', w, h]), play: (id, o) => calls.push(['play', id, o.hand]), stop: () => calls.push(['stop']) };
  const { NatpfTutorial } = await import('../src/natpf/natpf_tutorial.js');
  const { El } = await import('./ui-world.mjs');
  let now = 0;
  const t = new NatpfTutorial(new El('tut'), { demo: () => demo, clock: () => now });
  t.openFor({ mode: 'review', hand: 'left' });
  assert.deepEqual(calls.filter(c => c[0] === 'play').map(c => c[1]), ['grip']);
  assert.ok(calls.some(c => c[0] === 'size' && c[1] > 0 && c[2] > 0));
  now = 5000; t.tick(); t.tick();
  assert.equal(calls.filter(c => c[0] === 'play').length, 1, 'scheda vista: l\'animazione non riparte');
  t.step(1); assert.deepEqual(calls.filter(c => c[0] === 'play').map(c => [c[1], c[2]]), [['grip', 'left'], ['ready', 'left']]);
  t.close('review'); assert.deepEqual(calls.at(-1), ['stop']);
});

test('webcam: la lezione a passi dell\'Allenamento resta (versione breve, senza il telefono)', async () => {
  const w = await makeWorld({ controller: 'webcam' });
  const T = w.ui.training;
  T.start({ intro: true });
  assert.ok(T.lesson && !T.tutorialOpen);
  T.stop({ completed: false, silent: true });
});

test('volée: il giocatore va a rete e il lanciapalle aspetta che arrivi', async () => {
  const w = await makeWorld({ controller: 'mouse' });
  const T = w.ui.training;
  T.start({ drills: [D('volley')] });
  T._idle(); T.wait = .01;
  T.tick(.02);
  assert.equal(w.E.player.targetPos.z, VOLLEY_Z, 'il giocatore va a rete');
  assert.ok(!T.ballLive(), 'nessuna palla finché non è a rete');
  w.E.player.pos.z = VOLLEY_Z; T.wait = .01; T.tick(.02);
  assert.ok(T.ballLive(), 'giocatore a rete: il lanciapalle lancia');
  assert.equal(w.E.natpfPlan?.kind, 'volley', `piano d'impatto del motore: ${w.E.natpfPlan?.kind}`);
  T.stop({ completed: false, silent: true });
});

// B17.2 (08/11): X in alto a destra della scheda. In 'phone' è spenta («Sfoglia tutte le schede») finché non sono tutte
// viste, poi accesa; cliccata fa la stessa cosa di «Tutto chiaro, ho capito» dal telefono (onDone di chi apre la modale):
// tutorial visto per l'abbinamento, telefono liberato (cfg senza tut: calibra da solo, una volta), modale chiusa. In
// «Rivedi i gesti» chiude sempre
const xOf = t => t.root.querySelector('.tut-x');
test('tutorial, X: spenta finché non sono tutte viste, poi accesa; cliccata nel gioco singolo = «Tutto chiaro» dal telefono', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training, P = w.ui.phone;
  let recal = 0; const orig = P.recalibrate.bind(P); P.recalibrate = () => { recal++; return orig(); };
  T.start({ intro: true }); fromPhone(P, { w: 1, v: 2 });
  const x = xOf(T.tutorial);
  assert.ok(x.classList.contains('off'), 'X spenta all\'inizio'); assert.equal(x.title, 'Sfoglia tutte le schede'); assert.equal(T.tutorial.xEnabled, false);
  // spenta: il clic non fa niente, il telefono continua ad aspettare
  x.click(); assert.ok(T.tutorialOpen && T.tutorial.open && P.tutWait && !P.tutorialSeen, 'X spenta: niente');
  // a metà: ancora spenta
  for (let i = 0; i < 4; i++){ w.advance(1300); fromPhone(P, { nav: 1 }); }
  assert.ok(x.classList.contains('off'), 'a metà ancora spenta');
  seeAll(w, P, T);
  assert.ok(T.tutorial.state.all && !x.classList.contains('off'), 'tutte viste: X accesa'); assert.equal(x.title, 'Chiudi: tutto chiaro, ho capito'); assert.equal(T.tutorial.xEnabled, true);
  // indietro di una scheda: resta accesa («all» non torna indietro)
  fromPhone(P, { nav: -1 }); assert.ok(!x.classList.contains('off'));
  const cfgBefore = w.link.sent.filter(m => m.t === 'cfg').length;
  x.click();
  assert.ok(!T.tutorialOpen && !T.tutorial.open, 'X: modale chiusa'); assert.ok(P.tutorialSeen, 'tutorial visto per questo abbinamento');
  assert.equal(P.tutWait, false); const cfg = w.link.sent.filter(m => m.t === 'cfg'); assert.ok(cfg.length > cfgBefore && cfg.at(-1).tut === undefined, 'il telefono riceve il cfg senza tut: calibra da solo');
  assert.equal(recal, 0, 'il computer non chiede la calibrazione (il telefono che sa del tutorial la fa da solo: una volta)');
  assert.ok(T.active && T.cal, 'si passa alla calibrazione');
  // non si ripete con lo stesso telefono
  T.stop({ completed: false, silent: true }); T.start({ intro: true }); assert.ok(!T.tutorialOpen);
  T.stop({ completed: false, silent: true });
  // telefono con la pagina di prima (non sa del tutorial): dopo la X il computer chiede lui la calibrazione (come con Esc)
  const w2 = await makeWorld({ controller: 'phone' }), T2 = w2.ui.training, P2 = w2.ui.phone;
  let recal2 = 0; const o2 = P2.recalibrate.bind(P2); P2.recalibrate = () => { recal2++; return o2(); };
  T2.start({ intro: true }); seeAll(w2, P2, T2); xOf(T2.tutorial).click();
  assert.ok(!T2.tutorialOpen && P2.tutorialSeen); assert.equal(recal2, 1, 'pagina di prima: calibrazione chiesta dal computer, una volta');
  T2.stop({ completed: false, silent: true });
});

test('tutorial, X: in «Rivedi i gesti» sempre accesa e chiude come «Chiudi»; stesso schermo: chiude solo la propria metà', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training;
  T.reviewGestures();
  const x = xOf(T.tutorial);
  assert.ok(T.tutorial.open && !x.classList.contains('off') && T.tutorial.xEnabled, 'review: accesa subito'); assert.equal(x.title, 'Chiudi');
  x.click(); assert.ok(!T.tutorial.open, 'review: chiusa');
  // modale da sola (DOM finto): onDone chiamata una volta, poi chiusa; senza onDone chiude con onClose('phone')
  const { NatpfTutorial } = await import('../src/natpf/natpf_tutorial.js');
  const { El } = await import('./ui-world.mjs');
  let now = 0, done = 0, closed = [];
  const t = new NatpfTutorial(new El('tut'), { clock: () => now });
  t.openFor({ mode: 'phone', onDone: () => { done++; closed.push('done'); }, onClose: r => closed.push(r) });
  xOf(t).click(); assert.equal(done, 0, 'spenta: onDone non chiamata');
  for (let i = 0; i < TUTORIAL_CARDS.length; i++){ now += 1300; t.step(1); } t.tick();
  assert.ok(t.state.all && t.xEnabled);
  xOf(t).click(); assert.equal(done, 1); assert.deepEqual(closed, ['done', 'phone'], 'onDone, poi chiusa (chi apre di solito la chiude già lui)');
  xOf(t).click(); assert.equal(done, 1, 'chiusa: niente di nuovo');
  const t2 = new NatpfTutorial(new El('tut2'), { clock: () => now }); let r2 = null;
  t2.openFor({ mode: 'phone', from: { idx: 0, visited: [], all: true }, onClose: r => { r2 = r; } });
  assert.ok(t2.xEnabled, 'ripresa con tutte viste: accesa'); xOf(t2).click(); assert.equal(r2, 'phone'); assert.ok(!t2.open);
  // stesso schermo: la X della metà del P1 chiude solo la sua metà e libera solo il suo telefono
  const { NatpfPhoneRacket } = await import('../src/natpf/natpf_phone_racket.js');
  const ws = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = ws;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  const l2 = P2.link = { connected: true, ready: false, L: { state: 'connected', phone: 'cal' }, session: 's2', token: 't2', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } }, forget(){}, motion(){ return null; }, face(){ return null; }, on(){} };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint();
  assert.ok(ui.split.tutOpen.p1 && ui.split.tutOpen.p2);
  const x1 = xOf(ui.split.tut.p1), x2 = xOf(ui.split.tut.p2);
  assert.ok(x1.classList.contains('off') && x2.classList.contains('off'), 'tutte e due spente');
  x1.click(); assert.ok(ui.split.tutOpen.p1, 'spenta: la metà resta aperta');
  for (let i = 0; i < TUTORIAL_CARDS.length; i++){ ws.advance(1300); ui.split.tut.p1.step(1); } ui.split.tut.p1.tick();
  assert.ok(!x1.classList.contains('off') && x2.classList.contains('off'), 'P1 ha visto tutto: solo la sua X è accesa');
  x1.click(); ui.split.paint();
  assert.ok(!ui.split.tutOpen.p1 && ui.split.tutOpen.p2, 'chiusa solo la metà del P1'); assert.ok(E.natpfPhone.tutorialSeen && !P2.tutorialSeen);
  assert.ok(!E.natpfPhone.tutWait && P2.tutWait, 'liberato solo il telefono del P1');
  assert.ok(ws.link.cmds.includes('cal') && !l2.cmds.includes('cal'), 'calibrazione del P1 (telefono di prova senza tutorial), il P2 non è disturbato');
});

// B17.2 bis: Invio e Spazio sulla X (o su una freccia, o su «Chiudi») a fuoco con Tab la attivano come il clic. Prima
// motion_controls._onKeyDown fermava Spazio e Invio (preventDefault: niente clic del pulsante) e tirava un colpo da
// tastiera a modale aperta; adesso l'ascoltatore in cattura dell'allenamento (e la lobby nello stesso schermo) li
// fermano prima del motore
test('tutorial, tastiera: Invio e Spazio sulla X a fuoco = clic (spenta: niente), sulle frecce sfogliano, mai un colpo da tastiera a modale aperta', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training, P = w.ui.phone;
  T.start({ intro: true }); fromPhone(P, { w: 1, v: 2 });
  const x = xOf(T.tutorial), prev = T.tutorial.root.querySelector('.tut-prev'), next = T.tutorial.root.querySelector('.tut-next');
  const press = (code, active) => { document.activeElement = active; try { return w.key(code); } finally { document.activeElement = null; } };
  const blocked = ev => ev.defaultPrevented && ev._stopImm;      // il motore (dopo, in bubbling) non lo vede
  // fuoco altrove: Spazio e Invio fermati (niente colpo), modale com'era
  assert.ok(blocked(press('Space', document.body)) && blocked(press('Enter', document.body)), 'Spazio e Invio fermati prima del motore');
  assert.ok(T.tutorialOpen && T.tutorial.open && T.tutorial.state.idx === 0);
  // X spenta: Invio e Spazio fermati, la modale resta aperta e il telefono aspetta
  assert.equal(T.tutorial.focusedControl(x), '.tut-x'); assert.equal(T.tutorial.focusedControl(next), '.tut-next'); assert.equal(T.tutorial.focusedControl(document.body), null);
  assert.ok(blocked(press('Enter', x)) && blocked(press('Space', x)));
  assert.ok(T.tutorialOpen && T.tutorial.open && P.tutWait && !P.tutorialSeen, 'X spenta: niente');
  // frecce a fuoco: Invio avanti, Spazio indietro; la freccia spenta (prima scheda) non fa niente
  assert.ok(blocked(press('Enter', next))); assert.equal(T.tutorial.state.idx, 1);
  assert.ok(blocked(press('Space', prev))); assert.equal(T.tutorial.state.idx, 0);
  assert.ok(prev.disabled); assert.ok(blocked(press('Enter', prev))); assert.equal(T.tutorial.state.idx, 0, 'freccia spenta: ferma');
  // tutte viste: Invio sulla X chiude come il clic («Tutto chiaro» dal telefono): visto, telefono libero, calibrazione
  seeAll(w, P, T); assert.ok(T.tutorial.xEnabled);
  assert.ok(blocked(press('Enter', x)));
  assert.ok(!T.tutorialOpen && !T.tutorial.open && P.tutorialSeen && !P.tutWait && T.active && T.cal, 'Invio sulla X accesa: chiusa come il clic');
  // modale chiusa: la tastiera torna al motore (l'ascoltatore non ferma più niente)
  assert.ok(!blocked(press('Enter', document.body)) && !blocked(press('Space', x)));
  T.stop({ completed: false, silent: true });
  // «Rivedi i gesti»: Spazio sulla X e Invio su «Chiudi» chiudono
  T.reviewGestures(); assert.ok(blocked(press('Space', xOf(T.tutorial)))); assert.ok(!T.tutorial.open, 'review: Spazio sulla X chiude');
  T.reviewGestures(); assert.ok(blocked(press('Enter', T.tutorial.root.querySelector('.tut-close')))); assert.ok(!T.tutorial.open, 'review: Invio su «Chiudi» chiude');
  // stesso schermo: Invio sulla X della metà del P2 chiude solo quella (la lobby non va alla pagina dopo), spenta ferma
  const { NatpfPhoneRacket } = await import('../src/natpf/natpf_phone_racket.js');
  const ws = await makeWorld({ controller: 'phone' }), { E, ui, lobby } = ws;
  const P2 = E.natpfPhone2 = new NatpfPhoneRacket(E, { role: 'p2' });
  P2.link = { connected: true, ready: false, L: { state: 'connected', phone: 'cal' }, session: 's2', token: 't2', sent: [], cmds: [],
    start(){}, send(m){ this.sent.push(m); }, cmd(c){ this.cmds.push(c); if (c === 'cal'){ this.ready = false; this.L.phone = 'cal'; } }, forget(){}, motion(){ return null; }, face(){ return null; }, on(){} };
  lobby.go('mode'); lobby.setMode('split'); lobby.go('connect'); ui.split.paint();
  assert.ok(ui.split.tutOpen.p1 && ui.split.tutOpen.p2);
  const x2 = xOf(ui.split.tut.p2), press2 = (code, active) => { document.activeElement = active; try { return ws.key(code); } finally { document.activeElement = null; } };
  assert.ok(blocked(press2('Enter', x2))); assert.ok(ui.split.tutOpen.p1 && ui.split.tutOpen.p2 && lobby.step === 'connect', 'X del P2 spenta: niente, si resta in «Collega»');
  ws.advance(1300); assert.ok(blocked(press2('Enter', ui.split.tut.p2.root.querySelector('.tut-next')))); assert.equal(ui.split.tut.p2.state.idx, 1); assert.equal(ui.split.tut.p1.state.idx, 0, 'Invio sulla freccia del P2: solo la sua metà');
  for (let i = 0; i < TUTORIAL_CARDS.length; i++){ ws.advance(1300); ui.split.tut.p2.step(1); } ui.split.tut.p2.tick();
  assert.ok(ui.split.tut.p2.xEnabled && !ui.split.tut.p1.xEnabled);
  assert.ok(blocked(press2('Space', x2))); ui.split.paint();
  assert.ok(!ui.split.tutOpen.p2 && ui.split.tutOpen.p1 && lobby.step === 'connect', 'Spazio sulla X accesa del P2: chiusa solo la sua metà');
  assert.ok(P2.tutorialSeen && !P2.tutWait && !E.natpfPhone.tutorialSeen && E.natpfPhone.tutWait, 'liberato solo il telefono del P2');
});
