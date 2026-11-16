// B54 · nome del giocatore sul telefono prima di «Sono pronto» (richiesta dell'utente del 16/11/2026), lato telefono:
// site/js/tennis/phone-screen.js (nameOnMsg, nameSubmit, phoneView con #nameBox), phone-touch-lock.js (campo toccabile),
// player-name.js (regole), racchetta.html e racchetta.js. Il lato del gioco è in natpf-tennis/test/natpf-b54-nome.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nameOnMsg, nameSubmit, NAME_REARM_MS, NAME_TEXT, phoneView } from '../../site/js/tennis/phone-screen.js';
import { touchLockActive } from '../../site/js/tennis/phone-touch-lock.js';
import { validNickname, NAME_MAX } from '../../site/js/tennis/player-name.js';

const html = readFileSync(new URL('../../site/tennis/racchetta.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../../site/js/tennis/racchetta.js', import.meta.url), 'utf8');

test('richiesta del computer: campi letti con limiti, tolta con on 0', () => {
  assert.deepEqual(nameOnMsg({ t: 'nm', on: 1, v: 'Marco', id: 7 }), { v: 'Marco', er: '', id: 7 });
  assert.deepEqual(nameOnMsg({ t: 'nm', on: 1, v: '', er: 'Scegli un altro nome', id: 8 }), { v: '', er: 'Scegli un altro nome', id: 8 });
  assert.equal(nameOnMsg({ t: 'nm', on: 1, v: 'x'.repeat(60) }).v.length, 24);
  assert.equal(nameOnMsg({ t: 'nm', on: 0 }), null);
  assert.equal(nameOnMsg(null), null);
});

test('«Conferma» e «Salta»: nome controllato subito, risposta con il numero della richiesta, una volta sola', () => {
  const o = { v: '', er: '', id: 7 };
  assert.deepEqual(nameSubmit(o, '  Giulia  '), { msg: { t: 'nm', y: 1, v: 'Giulia', id: 7 }, offer: { ...o, sent: true, v: 'Giulia' } });
  assert.deepEqual(nameSubmit(o, '', { skip: true }), { msg: { t: 'nm', y: 1, skip: 1, id: 7 }, offer: { ...o, sent: true } });
  assert.match(nameSubmit(o, '   ').why, /Salta/, 'campo vuoto: scrivi o salta');
  assert.equal(nameSubmit(o, 'merda').why, 'Scegli un altro nome');
  assert.equal(nameSubmit(o, 'a').why, 'Almeno 2 caratteri');
  assert.equal(nameSubmit({ ...o, sent: true }, 'Luca'), null, 'risposta già partita');
  assert.equal(nameSubmit(null, 'Luca'), null, 'nessuna richiesta');
  assert.ok(NAME_REARM_MS >= 2000 && NAME_REARM_MS <= 6000);
  assert.equal(NAME_TEXT.max, NAME_MAX); assert.equal(NAME_MAX, 14);
  assert.equal(validNickname('Niccolò').ok, true);
});

test('schermata: il campo del nome al posto di «Sono pronto», solo sulla pagina «Pronto per la partita» (fase menu)', () => {
  const base = { linkState: 'on', sensor: 'ready', phase: 'menu', next: { label: 'Sono pronto', ready: true, id: 3 } };
  const off = phoneView(base).show;
  assert.equal(off['#nameBox'], false); assert.equal(off['#next'], true);
  const on = phoneView({ ...base, name: { v: '', er: '', id: 9 } }).show;
  assert.equal(on['#nameBox'], true);
  assert.equal(on['#next'], false, '«Sono pronto» dopo il nome');
  assert.equal(on['#shotPanel'], false); assert.equal(on['#tools'], false);
  // telefono dello stand: i pulsanti dello staff dopo la pressione lunga anche con il nome chiesto (natpf-fiera-telefoni)
  assert.equal(phoneView({ ...base, name: { id: 9 }, stand: true, staff: true }).show['#tools'], true);
  assert.equal(phoneView({ ...base, name: { id: 9 }, stand: true, staff: false }).show['#tools'], false);
  for (const ph of ['serve', 'play', 'over', 'pause']) assert.equal(phoneView({ ...base, phase: ph, name: { id: 1 } }).show['#nameBox'], false, ph);
  assert.equal(phoneView({ ...base, sensor: 'cal', name: { id: 1 } }).show['#nameBox'], false, 'non durante la calibrazione');
  assert.equal(phoneView({ ...base, linkState: 'lost', name: { id: 1 } }).show['#nameBox'], false);
});

test('blocco dei tocchi: con la richiesta del nome campo e tastiera restano toccabili', () => {
  const lock = { requested: true, paired: true, sensor: 'ready', gate: null };
  assert.equal(touchLockActive(lock), true);
  assert.equal(touchLockActive({ ...lock, nameTap: true }), false);
  assert.match(js, /nameTap: phase === 'menu' && !!nameOffer/);
});

test('pagina: «Salta» in alto a destra sopra il campo, campo di 14 caratteri, la pagina dice al computer che sa chiedere il nome', () => {
  const box = html.slice(html.indexOf('<form id="nameBox"'), html.indexOf('</form>', html.indexOf('<form id="nameBox"')));
  assert.ok(box.length > 0, 'c\'è il riquadro del nome');
  assert.ok(box.indexOf('id="nameSkip"') < box.indexOf('id="nameInput"'), '«Salta» prima del campo (in alto)');
  assert.match(box, /id="nameHead"><b id="nameTitle">Come ti chiami\?<\/b><button type="button" id="nameSkip">Salta<\/button>/);
  assert.match(html, /#nameHead\{display:flex;align-items:flex-start;justify-content:space-between/, '«Salta» a destra');
  assert.match(box, /id="nameInput"[^>]*maxlength="14"/);
  assert.match(box, /autocomplete="off"/);
  assert.match(html, /#nameInput\{[^}]*user-select:text/, 'il campo si scrive anche con la pagina non selezionabile');
  assert.match(html, /body\.naming #stage\{display:none\}/);
  assert.match(js, /vr: NATPF_BUILD, as: accSign\.sign, nm: 1/);
  assert.match(js, /case 'nm':/);
});
