// Opzione «Scia della palla» nel menu Opzioni (B22, natpf_lobby.setBallTrail): salvata, applicata subito alla scia del
// motore, avviso a schermo. Mondo di prova con l'interfaccia vera (ui-world.mjs): file a sé.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { TRAIL_KEY, readBallTrail } from '../src/natpf/natpf_ball_glow.js';

test('Opzioni → «Scia della palla»: No la spegne subito e la salva, Sì la riaccende', async () => {
  const w = await makeWorld({ controller: "mouse" }), E = w.E, L = w.lobby;
  assert.equal(localStorage.getItem(TRAIL_KEY), null); assert.equal(readBallTrail(), false, 'di base spenta (B35)');
  // motore senza grafica: la scia non c'è, l'opzione si salva lo stesso
  L.setBallTrail(true);
  assert.equal(localStorage.getItem(TRAIL_KEY), '1'); assert.equal(readBallTrail(), true);
  L.setBallTrail(false);
  assert.equal(localStorage.getItem(TRAIL_KEY), '0'); assert.equal(readBallTrail(), false);
  // con la scia del motore: spenta e riaccesa subito, senza ricaricare
  const calls = []; E.natpfBallGlow = { enabled: false, setEnabled(on){ this.enabled = !!on; calls.push(!!on); return this.enabled; } };
  L.setBallTrail(true);
  assert.deepEqual(calls, [true]); assert.equal(localStorage.getItem(TRAIL_KEY), '1'); assert.equal(E.natpfBallGlow.enabled, true);
  assert.match($('natpf-toast').textContent, /Scia della palla accesa/);
  L.setBallTrail(false);
  assert.deepEqual(calls, [true, false]); assert.equal(localStorage.getItem(TRAIL_KEY), '0');
  assert.match($('natpf-toast').textContent, /spenta.*come prima/);
  // il clic sul pulsante della pagina passa da qui
  const ev = { target: { closest: sel => (sel === '[data-natpf-trail]' ? { dataset: { natpfTrail: '1' } } : null) }, stopPropagation(){} };
  for (const l of $('title-modal').ls.click || []) l.fn(ev);
  assert.equal(localStorage.getItem(TRAIL_KEY), '1'); assert.equal(E.natpfBallGlow.enabled, true);
});
