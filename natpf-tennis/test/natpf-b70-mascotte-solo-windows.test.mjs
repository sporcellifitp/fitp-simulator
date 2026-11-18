// B70 (decisione dell'utente del 18/11): le mascotte 3D che ballano nella card solo nel programma Windows della fiera
// (e nel server di sviluppo per le prove); nel web spente, salvo ?mascotte3d=1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cardMovesOn, CARD_MOVES_KEY } from '../src/natpf/natpf_card_moves.js';

const memory = (o = {}) => ({ getItem: k => (k in o ? o[k] : null) });

test('B70: programma Windows acceso, web spento', () => {
  assert.equal(cardMovesOn({ search: '', storage: memory(), desktop: true, dev: false }), true);
  assert.equal(cardMovesOn({ search: '', storage: memory(), desktop: undefined, dev: false }), false, 'web (zip Cloudflare): spente');
  assert.equal(cardMovesOn({ search: '', storage: memory(), desktop: undefined, dev: true }), true, 'server di sviluppo: accese per le prove');
  assert.equal(cardMovesOn({ search: '?mascotte3d=1', storage: memory(), desktop: undefined, dev: false }), true, 'nel web solo a richiesta');
  assert.equal(cardMovesOn({ search: '', storage: memory({ [CARD_MOVES_KEY]: '0' }), desktop: true, dev: false }), false, 'spegnibili anche nel programma');
});
