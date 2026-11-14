// B38 · tastiera a schermo (src/natpf/natpf_tastiera.js): regole pure (tasti, maiuscole, accenti, cancella, maxlength,
// regole dei campi, quando si apre e quando sparisce, dove sta) e la tastiera su una pagina finta (eventi verso il campo,
// tasto vero che la chiude, Esc, clic fuori, «Fatto» con lo scarto del doppio clic, opzione Mai/Sempre).
import test from 'node:test';
import assert from 'node:assert/strict';
import { OSK, oskMode, nextOskMode, oskButton, oskToast, readOskMode, writeOskMode, oskOpens, oskHidesOnKey, isTextField, oskField, fieldRules,
  keyChar, autoShift, applyKey, oskLayout, OSK_ROWS, OSK_DIGITS, NatpfTastiera } from '../src/natpf/natpf_tastiera.js';

const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('opzione dello stand: Automatica (di base) · Sempre · Mai, a giro, salvata', () => {
  assert.equal(oskMode(undefined), 'auto'); assert.equal(oskMode('xyz'), 'auto');
  assert.deepEqual(['auto', 'sempre', 'mai'].map(nextOskMode), ['sempre', 'mai', 'auto']);
  assert.deepEqual(['auto', 'sempre', 'mai'].map(oskButton), ['Automatica', 'Sempre', 'Mai']);
  const s = mem();
  assert.equal(readOskMode(s), 'auto', 'di base Automatica');
  assert.equal(writeOskMode('mai', s), 'mai'); assert.equal(readOskMode(s), 'mai');
  assert.equal(s.getItem(OSK.key), 'mai');
  assert.match(oskToast('auto'), /Automatica.*mouse.*tastiera vera.*resta salvata/);
  assert.match(oskToast('mai'), /Mai/); assert.match(oskToast('sempre'), /Sempre/);
  assert.equal(readOskMode({ getItem(){ throw new Error('bloccato'); } }), 'auto', 'archivio bloccato: di base');
});

test('quando si apre: Automatica con il mouse o il tocco sul campo, non dopo un tasto vero; Sempre sempre; Mai mai', () => {
  assert.equal(oskOpens({ mode: 'auto', via: 'pointer', now: 1000 }), true);
  assert.equal(oskOpens({ mode: 'auto', via: 'focus', now: 1000 }), false, 'Tab o fuoco dal codice: niente');
  assert.equal(oskOpens({ mode: 'auto', via: 'pointer', physicalAt: 1000, now: 1000 + OSK.quietMs - 1 }), false, 'ha appena usato una tastiera vera');
  assert.equal(oskOpens({ mode: 'auto', via: 'pointer', physicalAt: 1000, now: 1000 + OSK.quietMs + 1 }), true);
  assert.equal(oskOpens({ mode: 'sempre', via: 'focus', physicalAt: 999, now: 1000 }), true);
  assert.equal(oskOpens({ mode: 'mai', via: 'pointer', now: 1000 }), false);
  assert.equal(oskHidesOnKey({ mode: 'auto' }), true, 'un tasto vero la chiude');
  assert.equal(oskHidesOnKey({ mode: 'sempre' }), false, 'Sempre: resta');
  assert.equal(oskHidesOnKey({ mode: 'auto', trusted: false }), false, 'tasto finto (telecomando): resta');
});

// elemento finto con le parti che usa il modulo
function field({ tag = 'INPUT', type = 'text', id = '', cls = [], maxlength = null, max = null, data = {}, value = '' } = {}){
  const attrs = { type, ...(maxlength != null ? { maxlength: String(maxlength) } : {}), ...(max != null ? { max: String(max) } : {}) };
  for (const [k, v] of Object.entries(data)) attrs[`data-${k}`] = v;
  return { tagName: tag, type, id, value, maxLength: maxlength ?? -1, max: max ?? '', dataset: { ...data }, readOnly: false, disabled: false,
    getAttribute: k => attrs[k] ?? null,
    matches(sel){ return sel.split(',').map(x => x.trim()).some(x => (x.startsWith('#') && x.slice(1) === id) || (x.startsWith('.') && cls.includes(x.slice(1))) || (/^\[data-([a-z-]+)\]$/.test(x) && x.slice(6, -1) in this.dataset)); } };
}

test('campi coperti e regole: nome (14), nomi dello stesso schermo (24), codice, nota e ritardo della diagnostica', () => {
  const nick = field({ id: 'nick-input', maxlength: 14 }), split = field({ cls: ['split-name-input'], maxlength: 24, data: { splitName: 'p2' } });
  const code = field({ id: 'join-code', maxlength: 8 }), note = field({ maxlength: 80, data: { label: '' } }), lag = field({ type: 'number', max: 200, data: { lag: '' } });
  assert.deepEqual(fieldRules(nick), { kind: 'name', max: 14, numeric: false });
  assert.deepEqual(fieldRules(split), { kind: 'name', max: 24, numeric: false });
  assert.deepEqual(fieldRules(code), { kind: 'code', max: 8, numeric: false });
  assert.deepEqual(fieldRules(note), { kind: 'text', max: 80, numeric: false });
  assert.deepEqual(fieldRules(lag), { kind: 'digits', max: 3, numeric: true }, 'ritardo: tastierino, al più tre cifre (max 200)');
  assert.deepEqual(fieldRules(field({})), { kind: 'text', max: Infinity, numeric: false }, 'altri campi di testo: regole dal campo');
  assert.equal(fieldRules(field({ data: { osk: 'code' } })).kind, 'code', 'data-osk sceglie le regole');
  for (const f of [nick, split, code, note, lag]) assert.equal(oskField(f), true);
  assert.equal(oskField(field({ type: 'checkbox' })), false); assert.equal(oskField(field({ type: 'range' })), false);
  assert.equal(oskField(field({ data: { osk: 'no' } })), false, 'data-osk="no": esclusa');
  assert.equal(oskField({ ...field({}), readOnly: true }), false);
  assert.equal(oskField(field({ tag: 'BUTTON' })), false);
  assert.equal(isTextField(field({ tag: 'TEXTAREA' })), true);
  assert.equal(isTextField({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isTextField({ tagName: 'DIV' }), false); assert.equal(isTextField(null), false);
});

test('tasti: lettere, maiuscola una volta (⇧), da sola all\'inizio dei nomi e dopo uno spazio, accenti, punto e trattino', () => {
  const name = { kind: 'name', max: 14 };
  let s = { value: '', start: 0, end: 0, shift: autoShift('', 0, 'name') };
  assert.equal(s.shift, true, 'nome vuoto: la prima è maiuscola');
  const type = (keys, r = name) => { for (const k of keys) s = applyKey(s, k, r); return s; };
  type(['a', 'n', 'n', 'a', ' ', 'm', 'a', 'r', 'i', 'a']);
  assert.equal(s.value, 'Anna Maria'); assert.equal(s.start, 10);
  s = applyKey(s, 'shift', name); assert.equal(s.shift, true); assert.equal(s.changed, false);
  s = applyKey(s, 'à', name); assert.equal(s.value, 'Anna MariaÀ', 'accento maiuscolo con ⇧'); assert.equal(s.shift, false, '⇧ vale una lettera');
  for (const k of ['è', 'é', 'ì', 'ò', 'ù', '.', '-']) s = applyKey(s, k, { kind: 'name', max: 40 });
  assert.equal(s.value, 'Anna MariaÀèéìòù.-');
  assert.equal(applyKey({ value: 'abc', start: 3, end: 3 }, 'd', { kind: 'text' }).shift, false, 'note: maiuscola solo all\'inizio');
  assert.equal(autoShift('Ciao ', 5, 'text'), false); assert.equal(autoShift('Ciao ', 5, 'name'), true);
  // evento come una tastiera vera
  const r = applyKey({ value: 'Bo', start: 2, end: 2 }, 'b', name);
  assert.deepEqual([r.inputType, r.data, r.changed], ['insertText', 'b', true]);
  assert.equal(keyChar('ab'), null); assert.equal(keyChar('x', { shift: true }), 'X');
});

test('cancella, cursore in mezzo, selezione, maxlength e regole del codice e del ritardo', () => {
  const name = { kind: 'name', max: 14 };
  let r = applyKey({ value: 'Marco', start: 5, end: 5 }, 'back', name);
  assert.deepEqual([r.value, r.start, r.inputType, r.data], ['Marc', 4, 'deleteContentBackward', null]);
  r = applyKey({ value: 'Marco', start: 0, end: 0 }, 'back', name); assert.equal(r.changed, false, 'niente prima del cursore');
  r = applyKey({ value: 'Marco', start: 1, end: 4 }, 'back', name); assert.equal(r.value, 'Mo', 'la selezione si cancella tutta');
  r = applyKey({ value: 'Mrco', start: 1, end: 1 }, 'a', name); assert.deepEqual([r.value, r.start], ['Marco', 2], 'scrive al cursore');
  r = applyKey({ value: 'Marco', start: 1, end: 4 }, 'x', name); assert.equal(r.value, 'Mxo', 'sostituisce la selezione');
  // maxlength: il 15° carattere non entra (come una tastiera vera), una selezione si può sostituire
  r = applyKey({ value: 'x'.repeat(14), start: 14, end: 14 }, 'y', name); assert.equal(r.changed, false); assert.equal(r.value.length, 14);
  r = applyKey({ value: 'x'.repeat(14), start: 0, end: 1 }, 'y', name); assert.equal(r.value, 'y' + 'x'.repeat(13));
  // codice della sfida: maiuscole sempre, cifre e trattino; niente accenti né spazi
  const code = { kind: 'code', max: 8 };
  let c = { value: '', start: 0, end: 0 };
  for (const k of ['a', 't', '-', 'k', '3', 'z', 'q', 'è', ' ', '.']) c = applyKey(c, k, code);
  assert.equal(c.value, 'AT-K3ZQ');
  for (const k of ['9', '9']) c = applyKey(c, k, code);
  assert.equal(c.value, 'AT-K3ZQ9', 'al più 8 caratteri');
  // ritardo dello schermo: solo cifre, al più 3
  const lag = { kind: 'digits', max: 3, numeric: true };
  let d = { value: '', start: 0, end: 0 };
  for (const k of ['1', 'a', '2', '.', '5', '0']) d = applyKey(d, k, lag);
  assert.equal(d.value, '125');
});

test('dove sta: in basso e grande a 1920×1080, il campo resta sopra (il foglio sale), metà giusta nello stesso schermo', () => {
  const big = oskLayout({ area: { w: 1920, h: 1080 }, field: { top: 500, bottom: 556 } });
  assert.ok(big.key >= 80 && big.key <= 92, `tasti alti: ${big.key}`);
  assert.equal(big.y + big.h <= 1080, true); assert.ok(big.x >= 0 && big.x + big.w <= 1920);
  assert.equal(big.lift, 0, 'campo già sopra'); assert.equal(big.top, false);
  // campo in basso (codice della sfida in fondo alla pagina): il foglio sale quanto basta, il campo resta in vista
  const low = oskLayout({ area: { w: 1920, h: 1080 }, field: { top: 930, bottom: 986 } });
  assert.ok(low.lift > 0 && 986 - low.lift + OSK.gap <= low.y, JSON.stringify(low));
  assert.ok(930 - low.lift >= 0, 'il campo non va sopra il bordo');
  // area quadrata 720×720 (ledwall 2×2 in scala): tutta la larghezza, tasti di almeno 30 px
  const sq = oskLayout({ area: { w: 720, h: 720 }, field: { top: 330, bottom: 386 } });
  assert.ok(sq.w <= 720 && sq.key >= 30, JSON.stringify(sq)); assert.ok(386 - sq.lift + OSK.gap <= sq.y);
  // stesso schermo a 1920×1080: il Player 2 scrive nella metà destra, il Player 1 nella sinistra
  const p2 = oskLayout({ area: { w: 1920, h: 1080 }, field: { top: 200, bottom: 240 }, half: 'p2' });
  const p1 = oskLayout({ area: { w: 1920, h: 1080 }, field: { top: 200, bottom: 240 }, half: 'p1' });
  assert.ok(p2.x >= 960 && p2.x + p2.w <= 1920 && p2.half === 'p2', JSON.stringify(p2));
  assert.ok(p1.x + p1.w <= 960 && p1.half === 'p1', JSON.stringify(p1));
  // metà troppo stretta (720×720): tutta la larghezza, sotto i due nomi (non li copre)
  const nar = oskLayout({ area: { w: 720, h: 720 }, field: { top: 150, bottom: 190 }, half: 'p2' });
  assert.equal(nar.half, null); assert.ok(nar.y > 190 + OSK.gap);
  // area larga e bassa (1920×540): tasti più bassi, sempre dentro l'area
  const wide = oskLayout({ area: { w: 1920, h: 540 }, field: { top: 250, bottom: 290 } });
  assert.ok(wide.y >= 0 && wide.y + wide.h <= 540 && wide.key >= 30, JSON.stringify(wide));
  // tastierino del ritardo: stretto
  const dg = oskLayout({ area: { w: 1920, h: 1080 }, kind: 'digits' });
  assert.ok(dg.w < 500, JSON.stringify(dg));
  assert.equal(OSK_ROWS.length, 5); assert.equal(OSK_DIGITS.length, 12);
  // ogni riga riempie le 24 colonne
  for (const row of OSK_ROWS) assert.equal(row.reduce((n, k) => n + (typeof k === 'string' ? 2 : k.span || 2), 0), 24, JSON.stringify(row));
});

/* ---------- la tastiera su una pagina finta ---------- */
class Cls { constructor(){ this.s = new Set(); } add(...c){ c.forEach(x => this.s.add(x)); } remove(...c){ c.forEach(x => this.s.delete(x)); } contains(c){ return this.s.has(c); } toggle(c, f){ const on = f === undefined ? !this.s.has(c) : !!f; on ? this.s.add(c) : this.s.delete(c); return on; } }
function page(){
  const winLs = {}, docLs = {};
  const add = ls => (t, fn, cap) => { (ls[t] ||= []).push({ fn, cap: !!(cap === true || cap?.capture) }); };
  const doc = { activeElement: null, body: { appendChild(){} }, addEventListener: add(docLs) };
  const kb = { classList: new Cls(), dataset: {}, style: { props: {}, setProperty(k, v){ this.props[k] = v; } }, offsetWidth: 1, ls: {}, innerHTML: '',
    setAttribute(){}, addEventListener(t, fn){ (this.ls[t] ||= []).push(fn); }, contains: t => !!t?.inKeyboard,
    getBoundingClientRect: () => ({ left: 100, right: 1820, top: 600, bottom: 1060 }) };
  doc.createElement = () => kb;
  const win = { addEventListener: add(winLs) };
  // campo finto: valore, selezione, eventi, fuoco
  const mk = (opts = {}) => {
    const f = field(opts), ev = [];
    Object.assign(f, { selectionStart: f.value.length, selectionEnd: f.value.length, events: ev, isConnected: true, style: {},
      setSelectionRange(a, b){ this.selectionStart = a; this.selectionEnd = b; },
      dispatchEvent(e){ ev.push({ type: e.type, inputType: e.inputType, data: e.data, value: this.value }); return !(e.type === 'beforeinput' && this.refuse); },
      focus(){ doc.activeElement = this; }, getClientRects: () => [1], getBoundingClientRect: () => ({ top: 500, bottom: 556, left: 700, right: 1200 }),
      closest: () => null, removeAttribute(){}, setAttribute(){} });
    return f;
  };
  const fire = (t, e) => { for (const l of [...(winLs[t] || [])].sort((a, b) => b.cap - a.cap)){ l.fn(e); if (e._stop) break; } return e; };
  const evt = (extra = {}) => ({ isTrusted: true, defaultPrevented: false, _stop: false, preventDefault(){ this.defaultPrevented = true; }, stopImmediatePropagation(){ this._stop = true; }, stopPropagation(){}, ...extra });
  return { doc, win, kb, mk, fire, evt, docLs };
}
const tick = () => new Promise(r => setTimeout(r, 5));

test('pagina: clic sul campo → tastiera; i tasti scrivono con gli eventi di una tastiera vera; «Fatto» chiude con change', async () => {
  const P = page(), store = mem();
  const T = new NatpfTastiera({ doc: P.doc, win: P.win, storage: store, area: () => ({ x: 0, y: 0, w: 1920, h: 1080 }) });
  const nick = P.mk({ id: 'nick-input', maxlength: 14 });
  P.fire('pointerdown', P.evt({ target: nick, pointerType: 'mouse' })); nick.focus();
  await tick();
  assert.equal(T.visible, true, 'aperta dal clic del mouse');
  assert.equal(T.field, nick); assert.equal(P.kb.dataset.kind, 'name'); assert.ok(P.kb.classList.contains('shift'), 'prima lettera maiuscola');
  assert.ok(P.kb.style.props['--osk-k'], 'misure dall\'area');
  for (const k of ['b', 'e', 'a']) T.press(k);
  assert.equal(nick.value, 'Bea');
  assert.deepEqual(nick.events.filter(e => e.type === 'input').map(e => [e.inputType, e.data]), [['insertText', 'B'], ['insertText', 'e'], ['insertText', 'a']]);
  assert.equal(nick.events.filter(e => e.type === 'beforeinput').length, 3, 'beforeinput prima di ogni testo');
  T.press('back'); assert.equal(nick.value, 'Be'); assert.equal(nick.events.at(-1).inputType, 'deleteContentBackward');
  T.press('a');
  // un campo che rifiuta (beforeinput annullato) resta com'è
  nick.refuse = true; assert.equal(T.press('x'), false); assert.equal(nick.value, 'Bea'); nick.refuse = false;
  // maxlength
  nick.value = 'x'.repeat(14); nick.setSelectionRange(14, 14); assert.equal(T.press('y'), false); assert.equal(nick.value.length, 14);
  nick.value = 'Bea'; nick.setSelectionRange(3, 3);
  T.press('done');
  assert.equal(T.visible, false, '«Fatto» chiude');
  assert.equal(nick.events.at(-1).type, 'change', 'change come quando un campo scritto perde il fuoco');
  assert.equal(nick.events.filter(e => e.type === 'submit').length, 0, 'niente invio automatico');
  // doppio clic su «Fatto»: il secondo clic dove c'era la tastiera non arriva al pulsante sotto (mezzo secondo)
  const second = P.fire('click', P.evt({ target: {}, clientX: 1700, clientY: 1000 }));
  assert.equal(second._stop && second.defaultPrevented, true, 'clic scartato');
  const elsewhere = P.fire('click', P.evt({ target: {}, clientX: 50, clientY: 50 }));
  assert.equal(elsewhere._stop, false, 'fuori dalla tastiera: passa');
});

test('pagina: un tasto vero la chiude (e per 30 s non torna), Esc la chiude senza arrivare al foglio, il clic fuori la chiude', async () => {
  const P = page();
  const T = new NatpfTastiera({ doc: P.doc, win: P.win, storage: mem(), area: () => ({ x: 0, y: 0, w: 1280, h: 720 }) });
  const f = P.mk({ cls: ['split-name-input'], maxlength: 24, data: { splitName: 'p1' } });
  T.open(f); assert.equal(T.visible, true); assert.equal(T.isOpenOn('.split-name-input'), true);
  // tasto finto (telecomando, codice): resta
  P.fire('keydown', P.evt({ isTrusted: false, key: 'a', code: 'KeyA' })); assert.equal(T.visible, true);
  // tasto vero: sparisce, e la lettera arriva al campo (l'evento non si ferma)
  const k = P.fire('keydown', P.evt({ key: 'G', code: 'KeyG' }));
  assert.equal(T.visible, false); assert.equal(k._stop, false);
  // per 30 s un clic sul campo non la riapre
  P.fire('pointerdown', P.evt({ target: f, pointerType: 'mouse' })); await tick();
  assert.equal(T.visible, false, 'chi ha la tastiera non la vede');
  T.physicalAt -= OSK.quietMs + 1;
  P.fire('pointerdown', P.evt({ target: f, pointerType: 'mouse' })); await tick();
  assert.equal(T.visible, true);
  // Esc: si chiude la tastiera, non il foglio (l'evento si ferma)
  const esc = P.fire('keydown', P.evt({ key: 'Escape', code: 'Escape' }));
  assert.equal(T.visible, false); assert.equal(esc._stop && esc.defaultPrevented, true);
  T.physicalAt = null;
  // clic fuori dal campo e dalla tastiera: si chiude (e il clic passa)
  T.open(f); const out = P.fire('pointerdown', P.evt({ target: { closest: () => null }, pointerType: 'mouse' }));
  assert.equal(T.visible, false); assert.equal(out._stop, false);
  // clic sui tasti: non chiude
  T.open(f); P.fire('pointerdown', P.evt({ target: { inKeyboard: true }, pointerType: 'mouse' })); assert.equal(T.visible, true);
  // il campo non ha più il fuoco (foglio chiuso, telecomando): al controllo dopo si chiude da sola
  P.doc.activeElement = null; T._watch(); assert.equal(T.visible, false);
});

test('pagina: opzione Mai (niente tastiera), Sempre (anche con il fuoco dato dal codice, e resta con i tasti veri)', async () => {
  const P = page(), store = mem();
  writeOskMode('mai', store);
  const T = new NatpfTastiera({ doc: P.doc, win: P.win, storage: store, area: () => ({ x: 0, y: 0, w: 1920, h: 1080 }) });
  const f = P.mk({ id: 'join-code', maxlength: 8 });
  P.fire('pointerdown', P.evt({ target: f, pointerType: 'mouse' })); await tick();
  assert.equal(T.visible, false, 'Mai');
  assert.equal(T.open(f), false);
  T.setMode('sempre'); assert.equal(readOskMode(store), 'sempre');
  // fuoco dato dal codice (o con Tab): in Sempre si apre
  for (const l of P.docLs.focusin) l.fn({ target: f });
  assert.equal(T.visible, true); assert.equal(P.kb.classList.contains('code'), true, 'codice: tasti del codice');
  P.fire('keydown', P.evt({ key: 'a', code: 'KeyA' })); assert.equal(T.visible, true, 'Sempre: resta con un tasto vero');
  T.press('a'); T.press('t'); assert.equal(f.value, 'AT', 'il codice va in maiuscolo');
  T.setMode('mai'); assert.equal(T.visible, false, 'Mai chiude subito');
  // in Automatica il fuoco dal codice non la apre
  T.setMode('auto'); for (const l of P.docLs.focusin) l.fn({ target: f }); assert.equal(T.visible, false);
});

test('pagina: senza DOM (prove del gioco) il modulo non fa niente e non si rompe', () => {
  const T = new NatpfTastiera({ doc: undefined, win: undefined, storage: mem() });
  assert.equal(T.visible, false); assert.equal(T.open({}), false); assert.equal(T.press('a'), false);
  T.hide(); assert.equal(T.isOpenOn('x'), false);
});
