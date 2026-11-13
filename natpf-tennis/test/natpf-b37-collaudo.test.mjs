// B37 (collaudo dell'utente del 13/11, seconda parte):
//   1) fuori e punto solo quando la palla esce davvero (scritta, anello, telefono e punto all'atterraggio vero);
//   2) chi deve servire con un elemento di gioco (segno sopra il personaggio e riquadro di servizio a terra);
//   3) il segnale del momento giusto spiegato le prime volte («Colpisci quando il cerchio diventa verde»);
//   4) pannello dello stand dal programma Windows (F9 e voce del menu, ponte del preload).
import test from 'node:test';
import assert from 'node:assert/strict';

// ---------- 4 · pannello dello stand dal programma Windows ----------
test('punto 4 · il pannello dello stand si apre e si chiude dal ponte del programma Windows (F9); Ctrl+Maiusc+K resta', async () => {
  const listeners = {}, cls = new Set(['hidden']), poked = [];
  const el = { classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)), contains: c => cls.has(c), add: c => cls.add(c) }, addEventListener(){}, querySelector: () => null, querySelectorAll: () => [] };
  let onToggle = null;
  const saved = {}, keep = k => (saved[k] = Object.getOwnPropertyDescriptor(globalThis, k));
  for (const k of ['window', 'document', 'localStorage', 'setInterval']) keep(k);
  const def = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  def('window', { addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); }, natpfDesktop: { staffPanel: { onToggle: cb => { onToggle = cb; return () => {}; } } } });
  def('document', { getElementById: id => (id === 'natpf-staff' ? el : null), querySelector: () => null, querySelectorAll: () => [] });
  def('localStorage', { getItem: () => null, setItem(){} });
  def('setInterval', () => 0);
  try {
    const { NatpfKiosk } = await import('../src/natpf/natpf_kiosk.js');
    const K = new NatpfKiosk({}, { phone: { onSwing(){} } });
    K.paint = () => {};
    const last0 = K.last;
    assert.equal(typeof onToggle, 'function', 'il pannello ascolta il ponte del programma');
    assert.equal(K.isOpen, false);
    await new Promise(r => setTimeout(r, 5));
    onToggle('toggle'); assert.equal(K.isOpen, true, 'F9: aperto');
    assert.ok(K.last > last0, 'F9 conta come presenza (il chiosco non riparte)');
    onToggle('toggle'); assert.equal(K.isOpen, false, 'F9 di nuovo: chiuso');
    onToggle('open'); onToggle('open'); assert.equal(K.isOpen, true);
    onToggle('close'); assert.equal(K.isOpen, false);
    // Ctrl+Maiusc+K resta com'era
    const key = { ctrlKey: true, shiftKey: true, code: 'KeyK', preventDefault(){ poked.push('pd'); }, stopImmediatePropagation(){} };
    for (const fn of listeners.keydown || []) fn(key);
    assert.equal(K.isOpen, true, 'Ctrl+Maiusc+K apre ancora');
    assert.ok(poked.includes('pd'));
  } finally {
    for (const [k, d] of Object.entries(saved)) if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k];
  }
});

test('punto 4 · senza il programma Windows (browser, zip Cloudflare) il pannello funziona come prima', async () => {
  const saved = {}, keep = k => (saved[k] = Object.getOwnPropertyDescriptor(globalThis, k));
  for (const k of ['window', 'document', 'localStorage', 'setInterval']) keep(k);
  const def = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  const cls = new Set(['hidden']), el = { classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)), contains: c => cls.has(c) }, addEventListener(){} };
  def('window', { addEventListener(){} });
  def('document', { getElementById: id => (id === 'natpf-staff' ? el : null), querySelector: () => null, querySelectorAll: () => [] });
  def('localStorage', { getItem: () => null, setItem(){} });
  def('setInterval', () => 0);
  try {
    const { NatpfKiosk } = await import('../src/natpf/natpf_kiosk.js');
    const K = new NatpfKiosk({}, { phone: { onSwing(){} } });
    K.paint = () => {};
    K.toggle(); assert.equal(K.isOpen, true);
  } finally {
    for (const [k, d] of Object.entries(saved)) if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k];
  }
});
