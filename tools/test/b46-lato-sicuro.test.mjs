// B46 «dritto e rovescio al sicuro» (14/11/2026) · pagina del telefono (site/js/tennis/racchetta.js, phone-screen.js) e
// collegamento (link.js). Segnalazione dell'utente sulla 2026-11-14.1 (stesso schermo, Player 1, Android, «Giocando»):
// «se provavo a fare un rovescio mi veniva fuori un dritto lungolinea, se facevo un dritto veniva fuori un rovescio
// incrociato». Qui le parti del telefono:
//   - la mano si cambia con DUE tocchi (il primo chiede «Mancino? Tocca di nuovo» per 4 s): un tocco solo non cambia niente;
//   - i tocchi votano il segno dei sensori solo nelle pagine in cui il telefono si tiene per leggere, mai in gioco;
//   - il cambio del segno deciso dal rilevatore arriva subito al computer (messaggio «sgn»).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tapVotesSign, handTap, handLabel, HAND_CONFIRM, HAND_ASK, HAND_LABEL, phoneView } from '../../site/js/tennis/phone-screen.js';
import { createAccSign, SIGN } from '../../site/js/tennis/motion-sign.js';

const JS = readFileSync(new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../../site/tennis/racchetta.html', import.meta.url), 'utf8');

/* ---------- mano con la conferma ---------- */
test('B46 mano dal telefono: un tocco su «Sinistra» chiede conferma e non cambia niente; il secondo entro 4 s la cambia', () => {
  assert.equal(HAND_CONFIRM.ms, 4000);
  // primo tocco: domanda aperta, niente da applicare
  let r = handTap(null, { want: 'left', current: 'right', now: 1000 });
  assert.equal(r.commit, null, 'un tocco solo non cambia la mano');
  assert.deepEqual(r.armed, { hand: 'left', until: 5000 });
  assert.equal(handLabel('left', r.armed, 1500), 'Mancino? Tocca di nuovo');
  assert.equal(handLabel('right', r.armed, 1500), 'Destra', 'l\'altro pulsante resta com\'è');
  // secondo tocco entro 4 s: mancino
  const r2 = handTap(r.armed, { want: 'left', current: 'right', now: 4900 });
  assert.equal(r2.commit, 'left'); assert.equal(r2.armed, null);
  // secondo tocco dopo 4 s: è di nuovo un primo tocco (domanda nuova)
  const late = handTap(r.armed, { want: 'left', current: 'right', now: 5200 });
  assert.equal(late.commit, null); assert.deepEqual(late.armed, { hand: 'left', until: 9200 });
  assert.equal(handLabel('left', r.armed, 5200), 'Sinistra', 'domanda scaduta: torna la scritta di prima');
  // lo stesso per tornare destro
  const back = handTap(null, { want: 'right', current: 'left', now: 0 });
  assert.equal(back.commit, null); assert.equal(handLabel('right', back.armed, 10), 'Destro? Tocca di nuovo');
  assert.equal(handTap(back.armed, { want: 'right', current: 'left', now: 3000 }).commit, 'right');
  // tocco sulla mano già scelta: chiude la domanda, non cambia niente
  assert.deepEqual(handTap(r.armed, { want: 'right', current: 'right', now: 2000 }), { armed: null, commit: null });
  // tocchi su «Sinistra» e poi su «Destra» (indecisi): nessun cambio, la domanda passa all'ultimo pulsante toccato
  const a = handTap(null, { want: 'left', current: 'right', now: 0 }), b = handTap(a.armed, { want: 'right', current: 'right', now: 500 });
  assert.equal(b.commit, null); assert.equal(b.armed, null);
  // tocchi strani: niente
  assert.deepEqual(handTap(null, { want: 'x', current: 'right', now: 0 }), { armed: null, commit: null });
  assert.equal(HAND_ASK.left, 'Mancino? Tocca di nuovo'); assert.equal(HAND_LABEL.left, 'Sinistra'); assert.equal(HAND_LABEL.right, 'Destra');
});

test('B46 pagina del telefono: il clic sulla mano passa da handTap e cambia il select solo con la conferma', () => {
  const i = JS.indexOf("$('#profileOptions').addEventListener('click'"), block = JS.slice(i, JS.indexOf('\n});', i));
  assert.ok(i > 0, 'ascoltatore dei pulsanti della mano');
  assert.match(block, /handTap\(handArm, \{ want: b\.dataset\.hand, current: \$\('#hand'\)\.value, now: performance\.now\(\) \}\)/);
  assert.match(block, /if \(r\.commit\)\{ \$\('#hand'\)\.value = r\.commit; \$\('#hand'\)\.dispatchEvent\(new Event\('change'\)\); \}/, 'il select cambia solo con il secondo tocco');
  assert.doesNotMatch(block, /\$\('#hand'\)\.value = b\.dataset\.hand/, 'niente più cambio al primo tocco');
  // scritte dei pulsanti dalla domanda aperta, e la mano decisa dal computer chiude la domanda
  assert.match(JS, /const on = b\.dataset\.hand === hand, ask = !!handArm && handArm\.hand === b\.dataset\.hand, t = handLabel\(b\.dataset\.hand, handArm, now\);/);
  assert.match(JS, /function applyHand\(h\)\{\n  const hand = h === 'left' \? 'left' : 'right';\n[^\n]*\n  handArm = null; clearTimeout\(handArmT\);/);
  // la riga della mano: Destra / Sinistra, stile della domanda, il select nascosto resta
  assert.match(HTML, /data-hand="right"[^>]*>Destra</); assert.match(HTML, /data-hand="left"[^>]*>Sinistra</);
  assert.match(HTML, /#profileOptions \[data-hand\]\.ask\{/);
});

/* ---------- segno dei sensori: tocchi solo nelle pagine da leggere ---------- */
test('B46 segno dei sensori: i tocchi votano solo con il telefono da leggere, mai al servizio, nello scambio o negli scambi di prova', () => {
  // pagine da leggere
  for (const screen of ['enable', 'tutorial', 'cal']) assert.equal(tapVotesSign({ screen, phase: 'menu' }), true, screen);
  assert.equal(tapVotesSign({ screen: 'ready', phase: 'menu' }), true, '«Pronto» con il computer al menu («Sono pronto»)');
  // fasi di gioco: mai, qualunque sia la schermata
  for (const phase of ['serve', 'toss', 'play']) for (const screen of ['ready', 'cal', 'tutorial', 'enable']) assert.equal(tapVotesSign({ screen, phase }), false, `${screen} in ${phase}`);
  assert.equal(tapVotesSign({ screen: 'ready', phase: 'menu', trial: true }), false, 'scambi di prova');
  // altre fasi di «Pronto»: pausa e partita finita no (si tiene il telefono come in partita o lo si passa)
  assert.equal(tapVotesSign({ screen: 'ready', phase: 'pause' }), false); assert.equal(tapVotesSign({ screen: 'ready', phase: 'over' }), false);
  assert.equal(tapVotesSign({ screen: 'link', phase: 'menu' }), false, 'senza collegamento');
  assert.equal(tapVotesSign({ screen: 'cal', phase: 'pause' }), true, 'calibrazione con la partita in pausa: si legge');
  // il caso del 14/11: un tocco per lanciare al servizio con il telefono tenuto come una racchetta, a testa in giù
  const acc = createAccSign({ prior: 1 }), down = [0.3, -9.6, 1.2];
  for (let k = 0; k < 6; k++) if (tapVotesSign({ screen: 'ready', phase: 'serve' })) acc.vote(down);
  assert.equal(acc.sign, 1, 'al servizio i tocchi non votano: il segno resta');
  for (let k = 0; k < SIGN.votes; k++) if (tapVotesSign({ screen: 'ready', phase: 'menu' })) acc.vote(down);
  assert.equal(acc.sign, -1, 'al menu sì (il voto resta quello di prima: SIGN.votes tocchi concordi)');
});

test('B46 pagina del telefono: il voto ai tocchi passa da tapVotesSign con la schermata e la fase di adesso', () => {
  const i = JS.indexOf('conferma del segno dei sensori (motion-sign.js)'), block = JS.slice(i, JS.indexOf('}, { passive: true });', i));
  assert.ok(i > 0);
  assert.match(block, /if \(!lastRawG \|\| !tapVotesSign\(\{ screen, phase, trial \}\) \|\| \(pair\?\.stand && stand && !standSignStep/, 'prima di accSign.vote');
  assert.ok(block.indexOf('tapVotesSign') < block.indexOf('accSign.vote(lastRawG)'));
  // la schermata è quella della pagina (phoneView), la fase quella del computer (ph), tr 1 = scambi di prova
  assert.match(JS, /if \(v\.screen !== screen\)\{ screen = v\.screen;/);
  assert.match(JS, /case 'ph': phase = d\.ph; phaseNote = pauseNote\(d\); trial = trialOnMsg\(d\);/);
  // la schermata «Pronto» con la fase «serve» è quella del lancio con un tocco: lì non si vota
  assert.equal(phoneView({ linkState: 'on', sensor: 'ready', phase: 'serve' }).screen, 'ready');
});

/* ---------- segno del rilevatore: al computer subito ---------- */
test('B46 pagina del telefono: il rilevatore che gira il segno lo dice subito al computer (sgn)', () => {
  assert.match(JS, /det\.on\('status', s => \{ if \(s\.s === 'still-ok'\) face\.setRest\(s\.gravity, det\.profile\.bias\); if \(s\.s === 'sign'\) send\(\{ t: 'sgn', d: s\.sign === -1 \? -1 : 1 \}\); \}\);/);
  const det = readFileSync(new URL('../../site/js/tennis/swing-detect.js', import.meta.url), 'utf8');
  assert.match(det, /absSign = -absSign; sw\.dir = -sw\.dir;[\s\S]{0,200}emit\('status', \{ s: 'sign', sign: absSign \}\);/, 'il rilevatore annuncia il suo voto (com\'era)');
});

class Emitter { constructor(){ this.h = {}; } on(k, f){ (this.h[k] ||= []).push(f); return this; } emit(k, v){ for (const f of this.h[k] || []) f(v); } }
class FakeConn extends Emitter { constructor(peer){ super(); this.peer = peer; this.open = true; this.sent = []; } send(m){ this.sent.push(m); } close(){ this.open = false; this.emit('close'); } }
class FakePeer extends Emitter { constructor(){ super(); this.destroyed = false; FakePeer.last = this; setTimeout(() => this.emit('open'), 0); } destroy(){ this.destroyed = true; } }

test('B46 collegamento: «sgn» diventa l\'evento sign del computer; «dev» porta il segno dei sensori; messaggi strani ignorati', async () => {
  globalThis.window = { Peer: FakePeer };
  globalThis.location = { search: '', href: 'http://127.0.0.1/' };
  const { createPhoneLink } = await import('../../site/js/tennis/link.js');
  const link = createPhoneLink(), signs = [], devs = [];
  link.on('sign', e => signs.push(e)); link.on('device', d => devs.push(d.accSign));
  await link.start();
  try {
    const c = new FakeConn('phone-1');
    FakePeer.last.emit('connection', c);
    c.emit('data', { t: 'hello', v: 2, k: link.token });
    assert.equal(c.sent[0]?.t, 'welcome');
    c.emit('data', { t: 'sgn', d: -1 }); c.emit('data', { t: 'sgn', d: 1 }); c.emit('data', { t: 'sgn', d: 7 }); c.emit('data', { t: 'sgn' });
    assert.deepEqual(signs, [{ detector: -1 }, { detector: 1 }]);
    c.emit('data', { t: 'dev', ua: 'x', as: -1 }); c.emit('data', { t: 'dev', ua: 'x', as: 1 }); c.emit('data', { t: 'dev', ua: 'x' });
    assert.deepEqual(devs, [-1, 1, null]);
  } finally { link.stop(); }
});
