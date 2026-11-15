// B41.3 · revisione della B41 seconda parte, difetto 4: pagina della fiera «2 giocatori» con un telefono non pronto.
// Prima la riga «Telefono N non pronto · Telefoni dello stand ›» sotto le schede faceva scorrere .lobby-stage di 26 px a
// 1920 × 540 e «Altre impostazioni» restava tagliata sopra «Gioca ›». Ora nello stesso schermo il perché sta nella scheda di
// quel giocatore (natpf_fiera_page.splitCardState) e «Telefoni dello stand ›» nella riga di «2 giocatori» (#fiera-bar):
// nessuna riga in più. Le misure nel browser: sonda scratchpad b413/probe/fierapage.mjs (sette misure, nove stati).
import test from 'node:test';
import assert from 'node:assert/strict';
import { $, visible, El } from './ui-world.mjs';
import { playWorld, secondPhone } from './trial-world.mjs';
import { NatpfPhoneRacket } from '../src/natpf/natpf_phone_racket.js';
import { fairGate, splitCardState } from '../src/natpf/natpf_fiera_page.js';
import { gameStoreKey } from '@natpf/tennis/stand-pairing.js';

const PAIRED = JSON.stringify({ session: 'racchetta-stand-abcdefghijkmnpqrstuvwxyz23', key: 'abcdefghijkmnpqrstuvwxyz23', pairedAt: 1 });
const PAIRED2 = JSON.stringify({ session: 'racchetta-stand-zyxwvutsrqpnmkjihgfedcba32', key: 'zyxwvutsrqpnmkjihgfedcba32', pairedAt: 2 });
async function fairTwo(){
  const w = await playWorld({ cal: 'play', mode: null }), { E, ui } = w;
  localStorage.setItem(gameStoreKey('p1'), PAIRED); localStorage.setItem(gameStoreKey('p2'), PAIRED2);
  const stand = P => { P.useStand = function(slot){ this.standSlot = slot || null; return Promise.resolve(this); }; return P; };
  stand(ui.phone);
  const s = secondPhone(E, NatpfPhoneRacket); stand(s.P2);
  ui.fiera.setOn(true);
  w.advance(300);
  ui.lobby.go('menu'); w.advance(300);
  ui.fieraPage.setPlay('split'); w.advance(300);
  return { ...w, ...s };
}
// (il DOM finto non ha le schede dello stesso schermo né il pulsante nella riga: elementi finti, sempre gli stessi)
const q0 = document.querySelector, qs = new Map();
document.querySelector = sel => (/^(#fiera-bar |\[data-fiera-player=)/.test(String(sel)) ? (qs.has(sel) || qs.set(sel, new El(sel)), qs.get(sel)) : q0(sel));
const card = id => document.querySelector(`[data-fiera-player="${id}"]`);
const barSheet = () => document.querySelector('#fiera-bar [data-fiera-sheet]');
const boxSheet = () => $('fiera-phones').querySelector('[data-fiera-sheet]');

test('B41.3 · funzione pura: lo stato nella scheda dello stesso schermo dice il perché vero (schermo spento, scollegato, sensori)', () => {
  const ok = { label: 'Telefono 2', paired: true, connected: true, ready: true, word: 'Telefono 2 pronto ✓ · batteria 80%' };
  assert.deepEqual(splitCardState(ok), { ok: true, text: 'Telefono 2 pronto ✓ · batteria 80%' });
  assert.deepEqual(splitCardState({ ...ok, hidden: true }), { ok: false, text: 'Telefono 2: schermo del telefono spento, riaccendilo' }, 'prima: «pronto ✓» anche con lo schermo spento');
  assert.match(splitCardState({ ...ok, connected: false }).text, /^Telefono 2 scollegato: si ricollega da solo/);
  assert.match(splitCardState({ ...ok, ready: false }).text, /^Telefono 2: sul telefono «Attiva i sensori»/);
  assert.match(splitCardState({ label: 'Telefono 1' }).text, /^Telefono 1 da abbinare: «Telefoni dello stand ›»/);
  // (lo stesso perché della pagina contro la CPU)
  assert.equal(splitCardState({ ...ok, hidden: true }).text, fairGate({ mode: 'cpu', phones: { p1: { ...ok, hidden: true } } }).why);
});

test('B41.3 · pagina della fiera «2 giocatori» con il Telefono 2 non pronto: niente riga in più, il perché nella sua scheda, «Telefoni dello stand ›» accanto a «2 giocatori»', async () => {
  const w = await fairTwo(), { ui, lobby, l2 } = w;
  assert.equal(lobby.step, 'match'); assert.equal(ui.fieraPage.mode, 'split');
  // Telefono 1 pronto, Telefono 2 collegato con lo schermo spento
  w.link.ready = true; w.link.L = { ...w.link.L, state: 'connected', phone: 'ready' };
  l2.ready = true; l2.L = { ...l2.L, state: 'connected', phone: 'ready', vis: false };
  lobby.paint();
  assert.equal($('btn-start-match').disabled, true, '«Gioca» spento');
  assert.ok(!visible('fiera-phones'), 'nessuna riga sotto le schede');
  assert.equal($('fiera-phones-text').textContent, '');
  assert.ok(!barSheet().classList.contains('hidden'), '«Telefoni dello stand ›» nella riga di «2 giocatori»');
  assert.ok(boxSheet().classList.contains('hidden'));
  const st2 = card('p2').querySelector('[data-fiera-state]').textContent;
  assert.equal(st2, 'Telefono 2: schermo del telefono spento, riaccendilo');
  assert.ok(card('p2').classList.contains('ko') && !card('p1').classList.contains('ko'));
  assert.match(card('p1').querySelector('[data-fiera-state]').textContent, /^Telefono 1 pronto/);
  // il pulsante della riga apre il foglio, come quello di prima
  assert.ok(!ui.fieraSheet.isOpen);
  ui.fieraSheet.open(); assert.ok(ui.fieraSheet.isOpen); ui.fieraSheet.close();
  // Telefono 2 di nuovo pronto: il pulsante della riga sparisce, la riga di come si parte torna
  l2.L = { ...l2.L, vis: true };
  lobby.paint();
  assert.ok(barSheet().classList.contains('hidden'));
  assert.ok(!card('p2').classList.contains('ko'));
  assert.match(card('p2').querySelector('[data-fiera-state]').textContent, /^Telefono 2 pronto/);
  // contro la CPU con il Telefono 1 scollegato: come prima, la riga con il perché e il suo pulsante
  ui.fieraPage.setPlay('cpu'); w.advance(300);
  w.link.connected = false; w.link.ready = false; w.link.L = { state: 'lost', phone: null };
  lobby.paint();
  assert.ok(visible('fiera-phones'));
  assert.match($('fiera-phones-text').textContent, /^Telefono 1 scollegato: si ricollega da solo/);
  assert.ok(!boxSheet().classList.contains('hidden') && barSheet().classList.contains('hidden'));
});
