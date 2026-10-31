// Diagnostica del 30/10 (20261030-142438, C17): «rettangolo chiaro accanto alla racchetta a ogni colpo». Confermato con
// gli screenshot del servizio (Chromium): spegnendo la scia della racchetta (swing_vfx.js) o l'arco del motore base il
// riquadro restava; è il lampo dell'esito (natpf_shot_feedback.js), uno sprite senza texture che three.js disegna come un
// quadrato pieno. Ora il lampo ha una texture rotonda e sfumata: angoli e bordi trasparenti.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { NatpfShotFeedback, flashGlowTexture, FLASH_TEX_SIZE } from '../src/natpf/natpf_shot_feedback.js';

const alphaAt = (tex, x, y) => tex.image.data[(y*tex.image.width + x)*4 + 3];

test('C17: il lampo sulla racchetta è una macchia rotonda e sfumata, non un quadrato', () => {
  const engine = { scene: new THREE.Scene(), hud: null, playerRole: 'p1' };
  const F = new NatpfShotFeedback(engine);
  assert.ok(F.flashes.length > 0);
  for (const f of F.flashes){
    assert.ok(f.s.isSprite);
    assert.ok(f.s.material.map, 'sprite senza texture: three.js lo disegna come un quadrato pieno');
    assert.equal(f.s.material.map, flashGlowTexture(), 'una texture sola per tutti i lampi');
  }
  const T = flashGlowTexture(), N = FLASH_TEX_SIZE, c = N/2;
  assert.ok(alphaAt(T, c, c) > 220, 'pieno al centro');
  // angoli e bordi del quadrato trasparenti: si vede un cerchio
  for (const [x, y] of [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1], [0, c], [N - 1, c], [c, 0], [c, N - 1]]) assert.equal(alphaAt(T, x, y), 0, `${x},${y}`);
  // sfumato: cala dal centro verso il bordo, simmetrico
  let prev = 256;
  for (let x = c; x < N; x++){ const a = alphaAt(T, x, c); assert.ok(a <= prev, `x ${x}`); prev = a; }
  assert.ok(Math.abs(alphaAt(T, c + 10, c) - alphaAt(T, c, c + 10)) <= 1);
});
