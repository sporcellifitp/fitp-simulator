import assert from 'node:assert/strict';
import { test } from 'node:test';
import { touchLockActive, createTouchLockHistory, installStaffTouch, STAFF_TOUCH } from '../../site/js/tennis/phone-touch-lock.js';

test('B51: il blocco segue il gioco, anche se la rete cade; tutorial e tocchi richiesti hanno precedenza', () => {
  const playing = { requested: true, paired: true, sensor: 'ready' };
  assert.equal(touchLockActive(playing), true);
  for (const exception of [
    { requested: false }, { paired: false }, { sensor: 'cal' }, { gate: {} },
    { readyTap: true }, { overridden: true },
  ]) assert.equal(touchLockActive({ ...playing, ...exception }), false);
});

test('B51: Indietro riarma il blocco e torna a funzionare dopo lo sblocco', () => {
  const entries = [null, { pair: 'old-state' }], nav = new EventTarget();
  let pos = 1, active = true;
  const history = {
    get state(){ return entries[pos]; },
    replaceState(state){ entries[pos] = state; },
    pushState(state){ entries.splice(++pos, entries.length, state); },
    back(){ if (!pos) return; nav.dispatchEvent(Object.assign(new Event('popstate'), { state: entries[--pos] })); },
  };
  const lock = createTouchLockHistory(nav, history, () => active);
  lock.arm();
  lock.arm();
  assert.equal(entries.length, 3);
  history.back();
  assert.equal(pos, 2);
  assert.equal(history.state.pair, 'old-state');
  const attempt = new Event('beforeunload', { cancelable: true });
  assert.equal(nav.dispatchEvent(attempt), false);
  active = false;
  history.back();
  assert.equal(pos, 0);
  assert.equal(nav.dispatchEvent(new Event('beforeunload', { cancelable: true })), true);
});

test('B51: lo sblocco locale vuole due dita ferme e un secondo tocco', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const surface = Object.assign(new EventTarget(), { closest: () => null });
  const hidden = new Set(['hidden']);
  const button = Object.assign(new EventTarget(), { classList: {
    add: value => hidden.add(value),
    remove: value => hidden.delete(value),
    contains: value => hidden.has(value),
  } });
  let unlocks = 0;
  const reset = installStaffTouch(surface, button, () => unlocks++);
  const pointer = (type, pointerId, clientX = 0) => surface.dispatchEvent(Object.assign(new Event(type), {
    pointerType: 'touch', pointerId, clientX, clientY: 0,
  }));
  pointer('pointerdown', 1);
  pointer('pointerdown', 2);
  pointer('pointermove', 1, STAFF_TOUCH.maxMove + 1);
  t.mock.timers.tick(STAFF_TOUCH.holdMs);
  pointer('pointerup', 1);
  pointer('pointerup', 2);
  assert.equal(hidden.has('hidden'), true);

  pointer('pointerdown', 1);
  pointer('pointerdown', 2);
  t.mock.timers.tick(STAFF_TOUCH.holdMs);
  pointer('pointerup', 1);
  assert.equal(hidden.has('hidden'), true);
  pointer('pointerup', 2);
  assert.equal(hidden.has('hidden'), false);
  assert.equal(unlocks, 0);
  button.dispatchEvent(new Event('click'));
  assert.equal(unlocks, 1);
  assert.equal(hidden.has('hidden'), true);
  reset();
});
