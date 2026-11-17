// B58 · Lob e Drop a fine partita (natpf_mascotte.js): elenco uguale ai file e al manifest, file adattati (WebP animati
// 320×320, 10 fotogrammi, 1,6 s, fondo trasparente), scelta per esito, mai una della partita prima (anche con due card
// nello stesso schermo), prenotazione e prericarica delle prossime due, stato sul computer che può mancare, essere
// rovinato o essere quello della 16.9, piano dalle card (CPU, sconfitta, stesso schermo, pari), animazione nella finestra
// del personaggio della card (16.10, decisione dell'utente) al posto del ritratto, solo nel programma Windows e in
// sviluppo, file che manca (torna il ritratto); niente più posto accanto al titolo; zip Cloudflare senza le mascotte.
// 17/11 (collaudo dell'utente sulla 17.1): Drop per chi gioca e Lob per l'avversario, sempre animate (anche con «riduci
// movimento»), la figura intera che si muove con i piedi.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MASCOTS, MASCOT_DIR, MASCOT_KEY, OUTCOMES, mascotUrl, mascotsOn, pickMascot, mascotPlan, withMascots, readState, MascotRotation, mountMascots, mascotCharacter, mascotCharacterOf, mascotOutcomeOf, mascotMove, CHARACTERS } from '../src/natpf/natpf_mascotte.js';
import { cardHtml, cardsHtml } from '../src/natpf/natpf_end_card.js';
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

test('B58: mai una della partita prima, su 500 partite con esiti a caso; le prenotate sono quelle mostrate', () => {
  const storage = memory(), loaded = [];
  let r = 12345; const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const rot = new MascotRotation({ storage, rnd, preload: f => loaded.push(f) });
  let last = [], shown = new Map();
  for (let i = 0; i < 500; i++){
    const ready = rot.prepare();
    assert.ok(MASCOTS.win.includes(ready.win) && MASCOTS.lose.includes(ready.lose));
    assert.ok(!last.includes(ready.win) && !last.includes(ready.lose));
    assert.deepEqual(loaded.slice(-2), [ready.win, ready.lose], 'prericaricate le due prenotate');
    const o = rnd() < 0.5 ? 'win' : 'lose', [f] = rot.takeFor([o]);
    assert.equal(f, ready[o], 'a fine partita si usa quella prenotata e già caricata');
    assert.ok(MASCOTS[o].includes(f));
    assert.ok(!last.includes(f), `partita ${i}: una della partita prima`);
    shown.set(f, (shown.get(f) || 0) + 1);
    last = [f];
  }
  assert.equal(shown.size, 20, 'col tempo escono tutte e venti');
});

test('B58: stesso schermo, due card per partita (vittoria e sconfitta): mai una della partita prima, mai due uguali', () => {
  let r = 777; const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const rot = new MascotRotation({ storage: memory(), rnd, preload: () => {} });
  let last = [];
  for (let i = 0; i < 300; i++){
    const ready = rot.prepare();
    const outs = i % 3 === 2 ? ['win'] : ['win', 'lose'];   // a volte una partita contro la CPU in mezzo
    const files = rot.takeFor(outs);
    assert.equal(files[0], ready.win);
    if (outs.length === 2) assert.equal(files[1], ready.lose);
    files.forEach((f, k) => assert.ok(MASCOTS[outs[k]].includes(f)));
    assert.equal(new Set(files).size, files.length);
    assert.ok(files.every(f => !last.includes(f)), `partita ${i}: ${files} dopo ${last}`);
    last = files;
  }
  assert.deepEqual(rot.takeFor(['pari', 'win']).map(f => f === null || MASCOTS.win.includes(f)), [true, true]);
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

test('B58: stato sul computer: si rilegge al riavvio, quello della 16.9, valori sconosciuti o rovinati scartati, archivio che non va', () => {
  const storage = memory();
  const a = new MascotRotation({ storage, rnd: () => 0.3, preload: () => {} });
  a.prepare(); const f = a.take('win');
  const saved = JSON.parse(storage.getItem(MASCOT_KEY));
  assert.deepEqual(saved.last, [f]);
  const b = new MascotRotation({ storage, rnd: () => 0.3, preload: () => {} });
  assert.deepEqual(b.state.last, [f], 'al riavvio del programma ricorda quelle della partita prima');
  assert.notEqual(b.take('win'), f);
  assert.deepEqual(readState(memory({ [MASCOT_KEY]: JSON.stringify({ last: MASCOTS.win[3], win: null, lose: null }) })).last, [MASCOTS.win[3]], 'stato della 16.9');
  assert.deepEqual(readState(memory({ [MASCOT_KEY]: '{rotto' })), { last: [], win: null, lose: null });
  assert.deepEqual(readState(memory({ [MASCOT_KEY]: JSON.stringify({ last: ['../x.webp', MASCOTS.lose[2]], win: MASCOTS.lose[0], lose: MASCOTS.lose[1] }) })), { last: [MASCOTS.lose[2]], win: null, lose: MASCOTS.lose[1] });
  const broken = { getItem(){ throw new Error('no'); }, setItem(){ throw new Error('no'); } };
  const c = new MascotRotation({ storage: broken, rnd: () => 0, preload: () => {} });
  const g = c.take('lose'); assert.ok(MASCOTS.lose.includes(g));
  assert.notEqual(c.take('lose'), g, 'senza archivio ricorda in memoria');
  const d = new MascotRotation({ storage: memory(), rnd: () => 0, preload: () => { throw new Error('rete'); } });
  assert.doesNotThrow(() => d.prepare());
});

test('B58: piano dalle card: una per card con il suo esito; stesso schermo solo con un vincitore', () => {
  assert.deepEqual(mascotPlan({ split: false, cards: [{ won: true }] }), [{ index: 0, outcome: 'win', who: null }]);
  assert.deepEqual(mascotPlan({ split: false, cards: [{ won: false }] }), [{ index: 0, outcome: 'lose', who: null }]);
  assert.deepEqual(mascotPlan({ split: true, cards: [{ won: false, side: 'player' }, { won: true, side: 'opponent' }] }), [{ index: 0, outcome: 'lose', who: 'drop' }, { index: 1, outcome: 'win', who: 'lob' }]);
  assert.deepEqual(mascotPlan({ split: true, cards: [{ won: false }, { won: false }] }), []);
  assert.deepEqual(mascotPlan({ split: true, cards: [{ won: true }, { won: true }] }), []);
  assert.deepEqual(mascotPlan(null), []);
  assert.deepEqual(mascotPlan({ cards: [] }), []);
  const model = { split: true, cards: [{ won: false, x: 1, side: 'opponent' }, { won: true, side: 'player' }] }, plan = mascotPlan(model);
  const m2 = withMascots(model, plan, ['lob-lose-02.webp', 'drop-win-04.webp']);
  assert.deepEqual(m2.cards.map(c => c.mascot), ['lob-lose-02.webp', 'drop-win-04.webp']);
  assert.equal(m2.cards[0].x, 1); assert.equal(model.cards[0].mascot, undefined, 'il modello di partenza non cambia');
  assert.equal(withMascots(model, plan, ['drop-win-01.webp', 'x.webp']).cards.some(c => c.mascot), false, 'esito sbagliato o file estraneo: niente');
});

test('B58: solo nel programma Windows (FIERA) e nel server di sviluppo; nel browser no', () => {
  assert.equal(mascotsOn({ desktop: {}, dev: false }), true);
  assert.equal(mascotsOn({ desktop: undefined, dev: true }), true);
  assert.equal(mascotsOn({ desktop: undefined, dev: false }), false);
  assert.equal(mascotsOn({ desktop: null, dev: false }), false);
});

// card minima per cardHtml (come quelle di cardModel)
const card = (o = {}) => ({ side: 'player', name: 'Ada', sub: '', frame: 'evento', art: '#24521c', won: true, badge: 'MVP della partita', crown: false, look: 'p1', trophies: [], record: null, next: null, tiles: null, ...o });
test('B58: nella card la mascotte sta nella finestra del personaggio, dopo il ritratto disegnato; solo file dell\'elenco', () => {
  const h = cardHtml(card({ mascot: 'drop-win-03.webp' }));
  assert.match(h, /^<article class="end-card won"[^>]* data-mascot="1"/);
  const art = h.slice(h.indexOf('<div class="card-art"'), h.indexOf('<div class="card-info">'));
  assert.ok(art.indexOf('class="card-svg"') < art.indexOf('<img class="card-mascot"'), 'il ritratto resta sotto come ripiego');
  assert.ok(art.indexOf('<img class="card-mascot"') < art.indexOf('class="card-badge'), 'il nastro sopra la mascotte');
  assert.match(art, /<img class="card-mascot" src="\.\/media\/mascotte\/drop-win-03\.webp" alt="" decoding="async" draggable="false" data-file="drop-win-03\.webp" data-outcome="win" data-move="c">/);
  for (const bad of [undefined, null, '', 'x.webp', '"><b>.webp', '../lob-win-01.webp', 'lob-win-01.gif']){
    const k = cardHtml(card({ mascot: bad }));
    assert.doesNotMatch(k, /card-mascot|data-mascot/, String(bad));
  }
  const two = cardsHtml({ split: true, cards: [card({ side: 'player', won: false, mascot: 'lob-lose-01.webp' }), card({ side: 'opponent', won: true, mascot: 'drop-win-02.webp' })] });
  assert.equal((two.match(/<img class="card-mascot"/g) || []).length, 2);
  assert.ok(two.indexOf('drop-win-02') < two.indexOf('lob-lose-01'), 'chi vince per primo (B57), con la sua');
});

// finto DOM minimo per mountMascots
function fakeCard({ complete = false, naturalWidth = 0 } = {}){
  const listeners = {}, attrs = { 'data-mascot': '1' };
  const cardEl = { removeAttribute: k => { delete attrs[k]; }, attrs };
  const img = { complete, naturalWidth, naturalHeight: naturalWidth, dataset: { file: 'lob-win-01.webp', outcome: 'win' }, removed: false, replaced: null,
    addEventListener: (t, fn) => { listeners[t] = fn; }, closest: () => cardEl, remove(){ this.removed = true; }, replaceWith(n){ this.replaced = n; },
    ownerDocument: { createElement: () => ({ dataset: {}, getContext: () => ({ drawImage: (src) => { img.drawn = src; } }) }) } };
  const root = { querySelectorAll: () => [img] };
  return { root, img, listeners, attrs };
}
test('B58: file che manca: via l\'immagine e torna il ritratto; sempre animate, anche con «riduci movimento» (17/11)', () => {
  const a = fakeCard(); assert.equal(mountMascots(a.root), 1);
  a.listeners.error(); assert.ok(a.img.removed); assert.equal(a.attrs['data-mascot'], undefined);
  assert.equal(a.listeners.load, undefined, 'nessun lavoro al caricamento: l\'immagine animata resta com\'è');
  const d = fakeCard({ complete: true, naturalWidth: 0 }); mountMascots(d.root); assert.ok(d.img.removed, 'già finita con errore');
  const e = fakeCard({ complete: true, naturalWidth: 320 }); mountMascots(e.root, { reduce: true });
  assert.equal(e.img.replaced, null, 'mai più il primo fotogramma fermo al posto dell\'animazione'); assert.equal(e.img.removed, false);
  assert.equal(mountMascots({ querySelectorAll: () => [] }), 0);
  assert.equal(mountMascots(null), 0);
  const src = fs.readFileSync(path.join(ROOT, 'src/natpf/natpf_mascotte.js'), 'utf8');
  assert.doesNotMatch(src, /prefers-reduced-motion|card-mascot-still|drawImage/);
  const css = fs.readFileSync(path.join(ROOT, 'natpf-hud.css'), 'utf8');
  assert.doesNotMatch(css, /reduce[^{]*\{[^}]*card-mascot/, 'nessuna regola di «riduci movimento» ferma le mascotte');
});

test('B58 (17/11): Drop per chi gioca, Lob per l\'avversario; nello stesso schermo uno per parte, mai due Lob', () => {
  assert.equal(mascotCharacter({ look: 'drop', side: 'player' }), 'drop');
  assert.equal(mascotCharacter({ look: 'lob', side: 'opponent' }), 'lob');
  assert.equal(mascotCharacter({ look: 'p1', side: 'player' }), null, 'personaggi classici, una card: tutti e due');
  assert.equal(mascotCharacter({ look: 'p1', side: 'player' }, { two: true }), 'drop');
  assert.equal(mascotCharacter({ look: 'p2', side: 'opponent' }, { two: true }), 'lob');
  assert.deepEqual(mascotPlan({ split: true, cards: [{ won: true, side: 'opponent', look: 'lob' }, { won: false, side: 'player', look: 'drop' }] }),
    [{ index: 0, outcome: 'win', who: 'lob' }, { index: 1, outcome: 'lose', who: 'drop' }]);
  assert.deepEqual(mascotPlan({ split: false, cards: [{ won: true, side: 'player', look: 'drop' }] }), [{ index: 0, outcome: 'win', who: 'drop' }]);
  assert.equal(mascotCharacterOf('lob-win-03.webp'), 'lob'); assert.equal(mascotCharacterOf('drop-lose-01.webp'), 'drop'); assert.equal(mascotCharacterOf('x.webp'), null);
  for (const o of ['win', 'lose']) for (const who of CHARACTERS) for (let i = 0; i < 50; i++) assert.equal(mascotCharacterOf(pickMascot(o, [], Math.random, who)), who);
  // 400 partite dello stesso schermo, prenotate a caso (anche dell'altro personaggio): sempre quello della card, mai una della partita prima
  let r = 4242; const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  const rot = new MascotRotation({ storage: memory(), rnd, preload: () => {} });
  let last = []; const seen = new Set();
  for (let i = 0; i < 400; i++){
    rot.prepare();
    const p1won = rnd() < .5, model = { split: true, cards: [{ won: p1won, side: 'player', look: 'drop' }, { won: !p1won, side: 'opponent', look: 'lob' }] };
    const plan = mascotPlan(model), files = rot.takeFor(plan), m = withMascots(model, plan, files);
    assert.deepEqual(m.cards.map(c => mascotCharacterOf(c.mascot)), ['drop', 'lob'], `partita ${i}: ${files}`);
    assert.deepEqual(m.cards.map(c => mascotOutcomeOf(c.mascot)), [p1won ? 'win' : 'lose', p1won ? 'lose' : 'win']);
    assert.ok(files.every(f => !last.includes(f))); last = files; files.forEach(f => seen.add(f));
  }
  assert.equal(seen.size, 20, 'col tempo escono tutte e venti');
  // personaggio sbagliato per la card: niente mascotte (resta il ritratto), mai l'altro personaggio
  const plan = [{ index: 0, outcome: 'win', who: 'drop' }];
  assert.equal(withMascots({ cards: [{ won: true }] }, plan, ['lob-win-01.webp']).cards[0].mascot, undefined);
});

test('B58 (17/11): la figura intera si muove (saltelli, passi avanti, indietro, di lato), tre giri per esito', () => {
  assert.deepEqual([...MASCOTS.win, ...MASCOTS.lose].map(mascotMove).reduce((a, m) => ({ ...a, [m]: (a[m] || 0) + 1 }), {}), { a: 8, b: 8, c: 4 });
  assert.equal(mascotMove('lob-win-01.webp'), 'a'); assert.equal(mascotMove('drop-lose-05.webp'), 'b'); assert.equal(mascotMove('lob-lose-03.webp'), 'c');
  assert.equal(mascotMove('x.webp'), null);
  const h = cardHtml(card({ mascot: 'drop-win-03.webp' }));
  assert.match(h, /data-outcome="win" data-move="c">/);
  const css = fs.readFileSync(path.join(ROOT, 'natpf-hud.css'), 'utf8');
  for (const o of ['win', 'lose']) for (const m of ['a', 'b', 'c']){
    const kf = css.match(new RegExp(`@keyframes natpf-mascot-${o}-${m} \\{([\\s\\S]*?)\\n\\}`))?.[1];
    assert.ok(kf, `${o}-${m}`); assert.match(kf, /translate\(/); assert.doesNotMatch(kf, /\b(left|top|width|height|margin)\s*:/, 'solo transform');
  }
  assert.match(css, /\.card-mascot\[data-outcome="win"\] \{ animation: natpf-mascot-win-a [\d.]+s ease-in-out infinite; \}/);
  assert.match(css, /\.card-mascot\[data-outcome="lose"\]\[data-move="c"\] \{ animation-name: natpf-mascot-lose-c; \}/);
  assert.match(css, /\.card-mascot \{[^}]*transform-origin: 50% 100%/);
});

test('B58: hud_ui mette le mascotte nelle card, i ritratti 3D le lasciano stare, niente più posto accanto al titolo; lo zip web non le porta', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /victory-mascot|end-mascot/);
  const hud = fs.readFileSync(path.join(ROOT, 'src/hud_ui.js'), 'utf8');
  assert.match(hud, /mascotRotation\(\)/); assert.match(hud, /withMascots\(cv0, plan, rot\.takeFor\(/); assert.match(hud, /rot\.prepare\(\)/); assert.match(hud, /mountMascots\(cd\)/); assert.match(hud, /rot\.takeFor\(plan\)/);
  assert.doesNotMatch(hud, /has-mascot|victory-mascot/);
  const rit = fs.readFileSync(path.join(ROOT, 'src/natpf/natpf_ritratti.js'), 'utf8');
  assert.match(rit, /dataset\.mascot === '1'\) continue/);
  const css = fs.readFileSync(path.join(ROOT, 'natpf-hud.css'), 'utf8');
  assert.doesNotMatch(css, /end-mascot|has-mascot/);
  const rules = css.slice(css.indexOf('/* B58'), css.indexOf('canvas.card-portrait { display: none; }') + 40);
  assert.match(rules, /\.card-mascot \{[^}]*position: absolute/); assert.match(rules, /\.end-card\[data-mascot="1"\] \.card-svg/);
  assert.doesNotMatch(rules, /\b\d+(\.\d+)?v[wh]\b|@media/);
  assert.deepEqual([...FIERA_ONLY], ['media/mascotte']);
});
