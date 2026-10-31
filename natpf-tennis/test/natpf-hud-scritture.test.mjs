// HUD del motore base: scritture nel DOM solo quando il valore cambia (ottimizzazione del 31/10). updateMultiplayerRoomInfo
// gira a ogni risposta del relay (20 al secondo nella sfida 1v1) e updateTimingGauge due volte per fotogramma (passi di
// fisica a 120 Hz, con la scheda nascosta in NATPF): prima textContent e href si riscrivevano sempre uguali, e ogni
// scrittura sostituisce il nodo di testo e fa ricalcolare lo stile.
// node --import ./test/register.mjs --test test/natpf-hud-scritture.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

const writes = [];
class FakeEl {
  constructor(id){ this.id = id; this._text = ''; this.attrs = {}; this.dataset = {}; this.style = {}; this.classList = { toggle(){}, add(){}, remove(){} }; }
  get textContent(){ return this._text; }
  set textContent(v){ writes.push(`${this.id}.text`); this._text = String(v); }
  getAttribute(k){ return k in this.attrs ? this.attrs[k] : null; }
  setAttribute(k, v){ writes.push(`${this.id}.${k}`); this.attrs[k] = String(v); }
  set href(v){ this.setAttribute('href', v); }
}
const els = new Map(), $ = id => { if (!els.has(id)) els.set(id, new FakeEl(id)); return els.get(id); };
const had = { document: globalThis.document, window: globalThis.window };
globalThis.document = { getElementById: $, querySelector: () => null, querySelectorAll: () => [], activeElement: null };
globalThis.window ??= globalThis;
globalThis.location ??= { origin: 'https://192.168.1.20:8443', href: 'https://192.168.1.20:8443/?lan=1' };
const { HudUI } = await import('../src/hud_ui.js');

function hud(){
  const h = Object.create(HudUI.prototype);
  Object.assign(h, { currentRoomId: 'default', playerRole: 'p1', selectedDifficulty: '1v1', elOpponentPresencePill: new FakeEl('pill'), elOpponentPresenceText: $('presence'),
    elTimingCursor: new FakeEl('cursor'), elGaugeModeTitle: $('gauge-title'), elGaugeSpeedReadout: $('gauge-speed') });
  return h;
}

test('stato della stanza ripetuto uguale (20 letture al secondo): nessuna scrittura dopo la prima', () => {
  const h = hud();
  const state = { roomId: 'AT-AB12', role: 'p1', p1Online: true, p2Online: true, p2Phone: false, p2Ready: false, hostName: 'Anna', guestName: 'Bruno' };
  writes.length = 0;
  h.updateMultiplayerRoomInfo(state);
  const first = writes.length;
  assert.ok(first >= 6, `prima lettura: testi e link scritti (${first})`);
  assert.equal($('mp-p2-status').textContent, 'In campo');
  assert.equal($('court-link-p2').getAttribute('href'), '/?room=at-ab12&role=p2');
  for (let i = 0; i < 20; i++) h.updateMultiplayerRoomInfo(state);
  assert.deepEqual(writes.slice(first), [], 'un secondo di letture uguali: nessuna scrittura (prima 20 × ~10)');
  // cambia qualcosa: si riscrive solo quello
  h.updateMultiplayerRoomInfo({ ...state, p2Ready: true });
  assert.deepEqual(writes.slice(first), ['setup-opponent-label.text']);
  assert.match($('setup-opponent-label').textContent, /Bruno pronto/);
});

test('indicatore del tempo del colpo: stessi valori, nessuna scrittura', () => {
  const h = hud();
  writes.length = 0;
  h.updateTimingGauge({ cursorNormalized: .5, modeTitle: 'SWING TIMING', speedText: 'READY' });
  const first = writes.length;
  assert.equal(first, 2);
  for (let i = 0; i < 240; i++) h.updateTimingGauge({ cursorNormalized: .5, modeTitle: 'SWING TIMING', speedText: 'READY' });
  assert.equal(writes.length, first, 'due passi di fisica per fotogramma per 2 s: niente da scrivere');
  h.updateTimingGauge({ cursorNormalized: .7, modeTitle: 'SWING TIMING', speedText: 'READY' });
  assert.equal(h.elTimingCursor.style.left, '70.0%');
  assert.equal(writes.length, first, 'solo il cursore (stile), testi uguali');
});

test.after(() => { for (const k of ['document']) if (had[k] === undefined) delete globalThis[k]; else globalThis[k] = had[k]; });
