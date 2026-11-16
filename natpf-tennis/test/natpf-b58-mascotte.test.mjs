// B58 · Lob e Drop a fine partita (natpf_mascotte.js): elenco uguale ai file e al manifest, file adattati (WebP animati
// 320×320, 10 fotogrammi, 1,6 s, fondo trasparente), scelta per esito, mai la stessa due volte di fila, prenotazione e
// prericarica delle prossime due, stato sul computer che può mancare o essere rovinato, esito dalle card (CPU, sconfitta,
// stesso schermo, pari), solo nel programma Windows e in sviluppo, HTML solo per file dell'elenco, file che manca e
// «riduci movimento»; la schermata (index.html, hud_ui.js, natpf-hud.css) e lo zip Cloudflare senza le mascotte.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASCOTS, MASCOT_DIR, MASCOT_KEY, OUTCOMES, mascotUrl, mascotsOn, pickMascot, mascotOutcome, mascotHtml, readState, MascotRotation, mountMascot } from '../src/natpf/natpf_mascotte.js';
import { FIERA_ONLY } from '../scripts/pacchetto-cloudflare.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'public/media/mascotte');
const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }; };
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('B58: 10 di vittoria e 10 di sconfitta, 5 di Lob e 5 di Drop per esito, uguali ai file e al manifest', () => {
  assert.deepEqual(OUTCOMES, ['win', 'lose']);
  for (const o of OUTCOMES){
    assert.equal(MASCOTS[o].length, 10);
    assert.equal(new Set(MASCOTS[o]).size, 10);
    assert.equal(MASCOTS[o].filter(f => f.startsWith('lob-')).length, 5);
    assert.equal(MASCOTS[o].filter(f => f.startsWith('drop-')).length, 5);
    for (const f of MASCOTS[o]) assert.match(f, new RegExp(`^(lob|drop)-${o}-0[1-5]\\.webp$`));
  }
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.webp')).sort();
  assert.deepEqual(files, [...MASCOTS.win, ...MASCOTS.lose].sort());
  assert.deepEqual(fs.readdirSync(DIR).filter(f => !f.endsWith('.webp')).sort(), ['LEGGIMI.txt', 'manifest.json'], 'niente GIF rimaste: le sostituiscono i WebP');
  const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
  assert.deepEqual(man.asset.map(a => a.file).sort(), files);
  for (const a of man.asset){
    assert.equal(a.esito === 'vittoria' ? 'win' : a.esito === 'sconfitta' ? 'lose' : null, a.file.includes('-win-') ? 'win' : 'lose', a.file);
    assert.equal(a.personaggio.toLowerCase(), a.file.split('-')[0]);
    assert.equal(a.origine, a.file.replace(/\.webp$/, '.gif'));
  }
  assert.equal(MASCOT_DIR, './media/mascotte/');
  assert.equal(mascotUrl('lob-win-01.webp'), './media/mascotte/lob-win-01.webp');
});

// WebP animato: intestazione RIFF, VP8X con le bandiere di animazione e alfa, ANIM con il giro infinito, 10 ANMF da 160 ms
function webpInfo(buf){
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF'); assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  let at = 12, info = { frames: 0, durations: [] };
  while (at + 8 <= buf.length){
    const id = buf.toString('ascii', at, at + 4), size = buf.readUInt32LE(at + 4), body = at + 8;
    if (id === 'VP8X'){ const f = buf[body]; info.anim = !!(f & 0x02); info.alpha = !!(f & 0x10); info.w = 1 + buf.readUIntLE(body + 4, 3); info.h = 1 + buf.readUIntLE(body + 7, 3); }
    if (id === 'ANIM') info.loop = buf.readUInt16LE(body + 4);
    if (id === 'ANMF'){ info.frames++; info.durations.push(buf.readUIntLE(body + 12, 3)); }
    at = body + size + (size & 1);
  }
  return info;
}
test('B58: i file adattati sono WebP animati 320×320 con l\'alfa, 10 fotogrammi da 160 ms in giro infinito, sotto 256 KB', () => {
  let total = 0;
  for (const f of [...MASCOTS.win, ...MASCOTS.lose]){
    const buf = fs.readFileSync(path.join(DIR, f)), w = webpInfo(buf);
    total += buf.length;
    assert.ok(w.anim && w.alpha, `${f}: animato e con l'alfa`);
    assert.deepEqual([w.w, w.h], [320, 320], f);
    assert.equal(w.frames, 10, f);
    assert.deepEqual(w.durations, Array(10).fill(160), f);
    assert.equal(w.loop, 0, `${f}: giro infinito`);
    assert.ok(buf.length < 256 * 1024, `${f}: ${buf.length} byte`);
  }
  assert.ok(total < 4.5e6, `in tutto ${total} byte`);
});

test('B58: scelta a caso per esito, escluse quelle da evitare; se le esclude tutte, fra tutte', () => {
  assert.equal(pickMascot('win', [], () => 0), MASCOTS.win[0]);
  assert.equal(pickMascot('win', [], () => 0.999999), MASCOTS.win[9]);
  assert.equal(pickMascot('lose', [MASCOTS.lose[0]], () => 0), MASCOTS.lose[1]);
  assert.equal(pickMascot('win', MASCOTS.win, () => 0), MASCOTS.win[0]);
  assert.equal(pickMascot('win', [], () => NaN), MASCOTS.win[0]);
  assert.equal(pickMascot('win', [], () => 7), MASCOTS.win[9]);
  assert.equal(pickMascot('pari'), null);
  for (let i = 0; i < 200; i++) assert.ok(MASCOTS.lose.includes(pickMascot('lose')));
});

test('B58: mai la stessa della partita prima, su 500 partite con esiti a caso; le prenotate sono quelle mostrate', () => {
  const storage = memory(), loaded = [];
  let r = 12345; const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const rot = new MascotRotation({ storage, rnd, preload: f => loaded.push(f) });
  let last = null, shown = new Map();
  for (let i = 0; i < 500; i++){
    const ready = rot.prepare();
    assert.ok(MASCOTS.win.includes(ready.win) && MASCOTS.lose.includes(ready.lose));
    assert.notEqual(ready.win, last); assert.notEqual(ready.lose, last);
    assert.deepEqual(loaded.slice(-2), [ready.win, ready.lose], 'prericaricate le due prenotate');
    const o = rnd() < 0.5 ? 'win' : 'lose', f = rot.take(o);
    assert.equal(f, ready[o], 'a fine partita si usa quella prenotata e già caricata');
    assert.ok(MASCOTS[o].includes(f));
    assert.notEqual(f, last, `partita ${i}: stessa di quella prima`);
    shown.set(f, (shown.get(f) || 0) + 1);
    last = f;
  }
  assert.equal(shown.size, 20, 'col tempo escono tutte e venti');
});

test('B58: l\'altra prenotata resta per la volta dopo; take senza prepare sceglie comunque, mai l\'ultima', () => {
  const rot = new MascotRotation({ storage: memory(), rnd: seq(0, 0.5, 0.2), preload: () => {} });
  const r = rot.prepare();
  assert.equal(rot.take('win'), r.win);
  assert.equal(rot.state.lose, r.lose, 'la prenotata di sconfitta non si tocca');
  assert.equal(rot.take('lose'), r.lose);
  const f = rot.take('lose');
  assert.ok(MASCOTS.lose.includes(f)); assert.notEqual(f, r.lose);
  assert.equal(rot.take('pari'), null);
});

test('B58: stato sul computer: si rilegge al riavvio, valori sconosciuti o rovinati scartati, archivio che non va', () => {
  const storage = memory();
  const a = new MascotRotation({ storage, rnd: () => 0.3, preload: () => {} });
  a.prepare(); const f = a.take('win');
  const saved = JSON.parse(storage.getItem(MASCOT_KEY));
  assert.equal(saved.last, f);
  const b = new MascotRotation({ storage, rnd: () => 0.3, preload: () => {} });
  assert.equal(b.state.last, f, 'al riavvio del programma ricorda l\'ultima');
  assert.notEqual(b.take('win'), f);
  assert.deepEqual(readState(memory({ [MASCOT_KEY]: '{rotto' })), { last: null, win: null, lose: null });
  assert.deepEqual(readState(memory({ [MASCOT_KEY]: JSON.stringify({ last: '../x.webp', win: MASCOTS.lose[0], lose: MASCOTS.lose[1] }) })), { last: null, win: null, lose: MASCOTS.lose[1] });
  const broken = { getItem(){ throw new Error('no'); }, setItem(){ throw new Error('no'); } };
  const c = new MascotRotation({ storage: broken, rnd: () => 0, preload: () => {} });
  const g = c.take('lose'); assert.ok(MASCOTS.lose.includes(g));
  assert.notEqual(c.take('lose'), g, 'senza archivio ricorda in memoria');
  const d = new MascotRotation({ storage: memory(), rnd: () => 0, preload: () => { throw new Error('rete'); } });
  assert.doesNotThrow(() => d.prepare());
});

test('B58: esito dalle card: contro la CPU quello di chi guarda, stesso schermo solo con un vincitore', () => {
  assert.equal(mascotOutcome({ split: false, cards: [{ won: true }] }), 'win');
  assert.equal(mascotOutcome({ split: false, cards: [{ won: false }] }), 'lose');
  assert.equal(mascotOutcome({ split: true, cards: [{ won: false }, { won: true }] }), 'win');
  assert.equal(mascotOutcome({ split: true, cards: [{ won: false }, { won: false }] }), null);
  assert.equal(mascotOutcome({ split: true, cards: [{ won: true }, { won: true }] }), null);
  assert.equal(mascotOutcome(null), null);
  assert.equal(mascotOutcome({ cards: [] }), null);
});

test('B58: solo nel programma Windows (FIERA) e nel server di sviluppo; nel browser no', () => {
  assert.equal(mascotsOn({ desktop: {}, dev: false }), true);
  assert.equal(mascotsOn({ desktop: undefined, dev: true }), true);
  assert.equal(mascotsOn({ desktop: undefined, dev: false }), false);
  assert.equal(mascotsOn({ desktop: null, dev: false }), false);
});

test('B58: HTML solo per i file dell\'elenco, con esito; niente per nomi estranei', () => {
  const h = mascotHtml('drop-win-03.webp');
  assert.match(h, /^<img src="\.\/media\/mascotte\/drop-win-03\.webp" alt="" decoding="async" draggable="false" data-file="drop-win-03\.webp" data-outcome="win">$/);
  assert.match(mascotHtml('lob-lose-05.webp'), /data-outcome="lose"/);
  for (const bad of [null, '', 'x.webp', '"><script>.webp', '../lob-win-01.webp', 'lob-win-01.gif']) assert.equal(mascotHtml(bad), '');
});

// finto DOM minimo per mountMascot
function fakeBox({ complete = false, naturalWidth = 0 } = {}){
  const listeners = {}, classes = new Set();
  const img = { complete, naturalWidth, naturalHeight: naturalWidth, dataset: { file: 'lob-win-01.webp' }, addEventListener: (t, fn) => { listeners[t] = fn; }, replaced: null,
    replaceWith(n){ this.replaced = n; }, ownerDocument: { createElement: () => ({ dataset: {}, getContext: () => ({ drawImage: (src) => { img.drawn = src; } }) }) } };
  const box = { classList: { add: c => classes.add(c), has: c => classes.has(c) }, querySelector: () => img };
  return { box, img, listeners, classes };
}
test('B58: file che manca: il riquadro sparisce; «riduci movimento»: primo fotogramma fermo; senza immagine niente', () => {
  const a = fakeBox(); assert.equal(mountMascot(a.box), true);
  a.listeners.error(); assert.ok(a.classes.has('hidden'));
  const b = fakeBox(); mountMascot(b.box, { reduce: true });
  b.img.naturalWidth = 320; b.img.naturalHeight = 320; b.listeners.load();
  assert.ok(b.img.replaced, 'canvas al posto dell\'immagine animata'); assert.equal(b.img.drawn, b.img); assert.equal(b.img.replaced.width, 320);
  assert.equal(b.img.replaced.dataset.file, 'lob-win-01.webp');
  const c = fakeBox(); mountMascot(c.box, { reduce: false }); c.listeners.load(); assert.equal(c.img.replaced, null, 'senza «riduci movimento» resta animata');
  const d = fakeBox({ complete: true, naturalWidth: 0 }); mountMascot(d.box); assert.ok(d.classes.has('hidden'), 'già finita con errore');
  const e = fakeBox({ complete: true, naturalWidth: 320 }); mountMascot(e.box, { reduce: true }); assert.ok(e.img.replaced, 'già caricata');
  assert.equal(mountMascot({ querySelector: () => null }), false);
  assert.equal(mountMascot(null), false);
});

test('B58: la schermata ha il posto accanto al titolo, hud_ui lo riempie, lo stile non usa vw/vh; lo zip web non le porta', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const head = html.slice(html.indexOf('<div class="end-head">'), html.indexOf('id="victory-rows"'));
  assert.ok(head.indexOf('id="victory-mascot"') > head.indexOf('id="victory-result-banner"') && head.indexOf('id="victory-mascot"') < head.indexOf('id="victory-games"'), 'fra il titolo e la pillola dei game');
  assert.match(head, /<div id="victory-mascot" class="end-mascot hidden" aria-hidden="true"><\/div>/);
  const hud = fs.readFileSync(path.join(ROOT, 'src/hud_ui.js'), 'utf8');
  assert.match(hud, /mascotRotation\(\)/); assert.match(hud, /rot\.take\(mo\)/); assert.match(hud, /rot\.prepare\(\)/); assert.match(hud, /mountMascot\(mb, \{ reduce: reduceMotion\(\) \}\)/);
  const css = fs.readFileSync(path.join(ROOT, 'natpf-hud.css'), 'utf8');
  const rules = css.slice(css.indexOf('/* B58'), css.indexOf('}', css.lastIndexOf('.end-mascot canvas')) + 1);
  assert.ok(rules.length > 100); assert.doesNotMatch(rules, /\b\d+(\.\d+)?v[wh]\b|@media/);
  assert.deepEqual([...FIERA_ONLY], ['media/mascotte']);
});
