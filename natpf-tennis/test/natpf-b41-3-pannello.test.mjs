// B41.3 · revisione della B41 seconda parte, difetto 8 (già nella 14.3): la riga sotto le voci del pannello dello stand
// (#staff-note) spiega la voce sotto il puntatore (B39.3) e cambiava altezza da una voce all'altra: il foglio centrato
// tremava sotto il puntatore fermo e a 720 × 720 scorreva. Ora ha l'altezza fissa della scritta più alta (spiegazioni di
// tutte le voci e stato del chiosco acceso e spento), misurata alla larghezza di adesso (natpf_kiosk._fitNote). Qui la
// regola con una riga finta; l'impaginazione vera (nessun tremolio, nessuno scorrimento a 720 × 720, 1024 × 600,
// 1366 × 657, 1920 × 540) è nella sonda del browser e nelle prove natpf-pannello-cadute e natpf-stesso-schermo-b25.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld } from './ui-world.mjs';
import { kioskNote } from '../src/natpf/natpf_kiosk.js';
import { STAFF_HINTS } from '../src/natpf/natpf_stand_mouse.js';
import { readFileSync } from 'node:fs';

test('stato del chiosco nella riga sotto le voci (funzione pura): spento, acceso, acceso in fiera', () => {
  assert.equal(kioskNote({ enabled: false }), 'Chiosco spento: il gioco resta dove l’ha lasciato l’ultimo visitatore.');
  assert.equal(kioskNote({ enabled: true, limit: 45 }), 'Chiosco attivo: dopo 45 s senza nessuno si torna al menu e chi gioca si azzera, il telefono resta collegato (in partita 90 s).');
  assert.equal(kioskNote({ enabled: true, limit: 60, fair: true }), 'Chiosco attivo: dopo 60 s senza nessuno si torna alla pagina della fiera, i telefoni restano collegati (in partita 120 s).');
});

test('altezza fissa della riga: la più alta tra le spiegazioni e lo stato del chiosco; si rimisura solo se cambiano larghezza o scritte', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui } = w, K = ui.kiosk;
  K.open();
  // riga finta: altezza da 20 px per ogni 60 caratteri alla larghezza 600 (il doppio dei caratteri a 1200)
  const note = { textContent: '', clientWidth: 600, scrollHeight: 0, style: {} };
  const old = globalThis.getComputedStyle;
  let measures = 0;
  globalThis.getComputedStyle = el => { measures++; return { height: `${Math.ceil(el.textContent.length/(el.clientWidth/10))*20}px` }; };
  // voci finte del foglio: due con il fumetto (title) e una con la spiegazione di natpf_stand_mouse
  const long = 'x'.repeat(250), short = 'y'.repeat(30);
  K.el.querySelectorAll = () => [
    { dataset: { staff: 'cal' }, getAttribute: k => (k === 'title' ? long : null) },
    { dataset: { staff: 'aim' }, getAttribute: k => (k === 'title' ? short : null) },
    { dataset: { staff: 'reset' }, getAttribute: () => null },
  ];
  try {
    note.textContent = 'stato di adesso';
    assert.equal(K._fitNote(note), true);
    assert.equal(note.style.minHeight, `${Math.ceil(250/60)*20}px`, 'la spiegazione più lunga: 5 righe');
    assert.equal(note.textContent, 'stato di adesso', 'la scritta di adesso torna al suo posto');
    const texts = K._noteTexts();
    assert.ok(texts.includes(long) && texts.includes(short) && texts.includes(STAFF_HINTS.reset), 'tutte le voci');
    assert.ok(texts.includes(kioskNote({ enabled: true, limit: K.limit })) && texts.includes(kioskNote({ enabled: false })), 'chiosco acceso e spento');
    const n = measures;
    assert.equal(K._fitNote(note), false, 'stessa larghezza, stesse scritte: niente da rimisurare');
    assert.equal(measures, n);
    note.clientWidth = 1200;
    assert.equal(K._fitNote(note), true, 'area del gioco più larga: si rimisura');
    assert.equal(note.style.minHeight, `${Math.ceil(250/120)*20}px`);
    // pannello chiuso: niente
    K.close();
    note.clientWidth = 700;
    assert.equal(K._fitNote(note), false);
  } finally { globalThis.getComputedStyle = old; }
});

test('la riga sotto le voci non si stringe (il foglio è una colonna flessibile) e prima di ogni spiegazione si controlla l\'altezza', () => {
  const css = readFileSync(new URL('../natpf-ui.css', import.meta.url), 'utf8');
  assert.match(css, /\.natpf-sheet\.staff-sheet #staff-note \{ flex: none; \}/);
  const js = readFileSync(new URL('../src/natpf/natpf_stand_mouse.js', import.meta.url), 'utf8');
  assert.match(js, /this\.ui\.kiosk\?\._fitNote\?\.\(note\); note\.textContent = t;/);
  // 720 × 720: quattro colonne (16 voci in quattro file)
  assert.match(css, /@container natpf \(min-width: 701px\) and \(max-width: 820px\) and \(max-height: 760px\) \{[^}]*\}\s*[^@]*grid-template-columns: repeat\(4, 1fr\)/);
  // 1280 × 720 con le righe delle cadute (B45.1): file più basse solo con le cadute in vista (prima scorreva di 5 e 21 px)
  const r1280 = css.match(/@container natpf \(min-width: 821px\) and \(min-height: 681px\) and \(max-height: 760px\) \{([\s\S]*?)\n\}/);
  assert.ok(r1280, 'regola di 1280 × 720');
  assert.match(r1280[1], /:has\(\.staff-cadute:not\(\.hidden\)\) \.pause-grid button \{ min-height: 50px;/);
  assert.ok(r1280[1].split('\n').filter(l => l.trim()).every(l => l.includes(':has(.staff-cadute:not(.hidden))')), 'senza cadute il foglio è quello di prima');
});
