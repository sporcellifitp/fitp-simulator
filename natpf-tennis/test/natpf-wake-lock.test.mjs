import test from 'node:test';
import assert from 'node:assert/strict';
import { keepScreenAwake } from '../src/natpf/natpf_wake_lock.js';
const tick = () => new Promise(r => setImmediate(r));
test('wake lock recovers on visibility and releases on disposal', async () => {
  const doc = new EventTarget(); doc.visibilityState = 'visible';
  let requests = 0, releases = 0, lock;
  const nav = { wakeLock: { request: async () => { requests++; lock = new EventTarget(); lock.release = async () => { releases++; lock.dispatchEvent(new Event('release')); }; return lock; } } };
  const dispose = keepScreenAwake(doc, nav); await tick();
  doc.dispatchEvent(new Event('pointerdown')); await tick(); assert.equal(requests, 1);
  await lock.release(); doc.visibilityState = 'hidden'; doc.dispatchEvent(new Event('visibilitychange')); await tick(); assert.equal(requests, 1);
  doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange')); await tick(); assert.equal(requests, 2);
  dispose(); await tick(); assert.equal(releases, 2);
  doc.dispatchEvent(new Event('pointerdown')); await tick(); assert.equal(requests, 2);
});
test('permission failure is harmless and a later gesture can retry', async () => {
  const doc = new EventTarget(); doc.visibilityState = 'visible'; let requests = 0;
  const dispose = keepScreenAwake(doc, { wakeLock: { request: async () => { requests++; throw Error('denied'); } } });
  await tick(); doc.dispatchEvent(new Event('pointerdown')); await tick(); assert.equal(requests, 2); dispose();
  assert.doesNotThrow(() => keepScreenAwake(doc, {})());
});
