// Letture di /api/match/state dal computer (ottimizzazione LAN del 31/10, motion_controls.startPhonePolling):
//   • una lettura che non risponde (socket keep-alive morto dopo un'interruzione breve della Wi-Fi) si annulla dopo
//     PHONE_POLL.abortMs e la successiva parte su una connessione nuova. Prima la lettura bloccata fermava le successive
//     per 5 s, più della finestra di presenza del relay (4 s): l'host vedeva il P2 assente e metteva in pausa;
//   • senza stanza 1v1 (roomId «default»: contro la CPU, stesso schermo, allenamento) una lettura ogni PHONE_POLL.idleMs
//     invece di 20 al secondo; nella stanza 1v1 restano i 50 ms di phonePollIntervalMs.
// node --import ./test/register.mjs --test test/natpf-lan-letture.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { MotionController, PHONE_POLL } from '../src/motion_controls.js';

const tick = ms => new Promise(r => setTimeout(r, ms));
function controller(extra = {}){
  const mc = Object.create(MotionController.prototype);
  Object.assign(mc, { role: 'p2', roomId: 'at-ab12', phonePollIntervalMs: 10, phoneState: { connected: false, orientation: {} }, p2PhoneState: { connected: false }, _listeners: { swing: [] }, ...extra });
  mc._notifyStatus = () => {}; mc._updatePhoneBadgeUI = () => {};
  return mc;
}
async function withFetch(fn, body){
  const real = globalThis.fetch;
  globalThis.fetch = fn;
  try { await body(); } finally { globalThis.fetch = real; }
}

test('costanti delle letture: lettura bloccata liberata prima che il relay dia il P2 assente (4 s)', () => {
  assert.ok(PHONE_POLL.guardMs < 4000, `guardia ${PHONE_POLL.guardMs} ms`);
  assert.ok(PHONE_POLL.abortMs < PHONE_POLL.guardMs);
  assert.ok(PHONE_POLL.idleMs >= 250 && PHONE_POLL.idleMs < 4000, 'senza stanza il P1 resta «online» per il relay');
});

test('lettura che non risponde: annullata, e la successiva parte subito su una richiesta nuova', async () => {
  const calls = [];
  await withFetch((url, init = {}) => {
    calls.push({ at: performance.now(), signal: init.signal || null });
    // non risponde mai: si chiude solo se viene annullata
    return new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('annullata', 'AbortError'))));
  }, async () => {
    const mc = controller({ phonePoll: { guardMs: 250, abortMs: 120, idleMs: 500 } });
    const t0 = performance.now();
    mc.startPhonePolling();
    await tick(400);
    mc.stopPhonePolling(); mc._disposed = true;
    assert.ok(calls.length >= 2, `${calls.length} letture in 400 ms (prima 1 sola per 5 s)`);
    assert.ok(calls[0].signal?.aborted, 'la prima lettura è stata annullata');
    assert.ok(calls[1].at - t0 < 200, `la seconda parte a ${Math.round(calls[1].at - t0)} ms`);
  });
});

test('con le costanti vere: la lettura bloccata si annulla entro abortMs', async () => {
  const calls = [];
  await withFetch((url, init = {}) => {
    calls.push(init.signal || null);
    return new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('annullata', 'AbortError'))));
  }, async () => {
    const mc = controller();
    mc.startPhonePolling();
    await tick(PHONE_POLL.abortMs + 150);
    mc.stopPhonePolling(); mc._disposed = true;
    assert.ok(calls[0]?.aborted, 'annullata');
    assert.equal(calls.length, 2, 'e subito una lettura nuova');
  });
});

test('senza stanza 1v1 una lettura ogni idleMs; nella stanza 1v1 una ogni phonePollIntervalMs', async () => {
  const count = async roomId => {
    let n = 0;
    await withFetch(async () => { n++; return new Response('{}', { status: 500 }); }, async () => {
      const mc = controller({ role: 'p1', roomId });
      mc.startPhonePolling();
      await tick(1100);
      mc.stopPhonePolling(); mc._disposed = true;
    });
    return n;
  };
  const idle = await count('default'), room = await count('at-ab12');
  assert.ok(idle >= 2 && idle <= 3, `stanza default: ${idle} letture in 1,1 s (prima ~110 con 10 ms)`);
  assert.ok(room >= 40, `stanza 1v1: ${room} letture in 1,1 s`);
});

test('stanza creata dopo: la lettura successiva parte subito, senza aspettare idleMs', async () => {
  const urls = [];
  await withFetch(async url => { urls.push({ url: String(url), at: performance.now() }); return new Response('{}', { status: 500 }); }, async () => {
    const mc = controller({ role: 'p1', roomId: 'default' });
    mc.startPhonePolling();
    await tick(60);
    const t = performance.now();
    mc.setRoomConfig({ roomId: 'AT-XY12', role: 'p1' });
    await tick(60);
    mc.stopPhonePolling(); mc._disposed = true;
    const after = urls.filter(u => /room=at-xy12/.test(u.url));
    assert.ok(after.length >= 2, `${after.length} letture nella stanza nuova`);
    assert.ok(after[0].at - t < 30);
  });
});
