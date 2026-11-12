// Opzione «Personaggi in campo» nel menu Opzioni (B24, natpf_lobby.setCast): salvata, applicata subito, avviso a
// schermo, pulsanti accesi. Mondo di prova con l'interfaccia vera (ui-world.mjs): file a sé.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { CAST_KEY, getCast, resetCast, readCast, castLooks } from '../src/natpf/natpf_personaggi.js';

test('Opzioni → «Personaggi in campo»: di base «Di sempre»; «Lob & Drop» vale subito e resta salvato', async () => {
  resetCast();
  const w = await makeWorld({ controller: 'mouse' }), L = w.lobby;
  assert.equal(localStorage.getItem(CAST_KEY), null); assert.equal(getCast(), 'sempre', 'di base i personaggi di sempre');
  // pulsanti della pagina: uno acceso alla volta
  const btns = ['sempre', 'lobdrop'].map(v => { const b = { dataset: { natpfCast: v }, on: null, aria: null };
    b.classList = { toggle(c, on){ if (c === 'selected') b.on = on; } }; b.setAttribute = (k, x) => { if (k === 'aria-checked') b.aria = x; }; return b; });
  const qsa = L.el.querySelectorAll.bind(L.el);
  L.el.querySelectorAll = sel => (sel === '[data-natpf-cast]' ? btns : qsa(sel));
  L.go('options');                                              // i pulsanti si dipingono nella pagina delle Opzioni
  assert.deepEqual(btns.map(b => b.on), [true, false]);
  L.setCast('lobdrop');
  assert.equal(localStorage.getItem(CAST_KEY), 'lobdrop'); assert.equal(getCast(), 'lobdrop');
  assert.deepEqual({ ...castLooks(getCast(), false) }, { player: 'drop', opponent: 'lob' });
  assert.match($('natpf-toast').textContent, /Lob & Drop/);
  assert.deepEqual(btns.map(b => [b.dataset.natpfCast, b.on, b.aria]), [['sempre', false, 'false'], ['lobdrop', true, 'true']]);
  L.setCast('sempre');
  assert.equal(localStorage.getItem(CAST_KEY), 'sempre'); assert.equal(getCast(), 'sempre');
  assert.match($('natpf-toast').textContent, /di sempre/);
  assert.deepEqual(btns.map(b => b.on), [true, false]);
  // il clic sul pulsante della pagina passa da qui
  const ev = { target: { closest: sel => (sel === '[data-natpf-cast]' ? { dataset: { natpfCast: 'lobdrop' } } : null) }, stopPropagation(){} };
  for (const l of $('title-modal').ls.click || []) l.fn(ev);
  assert.equal(localStorage.getItem(CAST_KEY), 'lobdrop'); assert.equal(getCast(), 'lobdrop');
  // al prossimo avvio si riparte dal valore salvato; l'indirizzo vince per quell'avvio
  resetCast(); assert.equal(readCast({ search: '' }), 'lobdrop'); assert.equal(readCast({ search: '?personaggi=sempre' }), 'sempre');
  localStorage.removeItem(CAST_KEY); resetCast();
});
