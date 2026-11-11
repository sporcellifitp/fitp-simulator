// Intro con il trailer e il suo ripiego (B21, src/natpf/natpf_intro.js): scelta della sorgente del video (programma Windows: file locale; web: bucket R2),
// ordine dei tentativi, tempi, file nel repository (il trailer fuori dal pacchetto Cloudflare, con il nome che porta
// l'impronta), e la classe dell'intro con una pagina finta e un orologio finto: trailer che parte, errore, tempo
// scaduto, riproduzione rifiutata, salto, seconda volta nella sessione. Nel browser: tools/e2e/natpf-intro-trailer.mjs
// File a sé: sostituisce document, window, location e i timer (test/dom-finto.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { Node, Video, advance, flush, resetClock, block } from './dom-finto.mjs';

const store = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), clear: () => m.clear() }; };
const winLs = {};
globalThis.window = globalThis; globalThis.addEventListener = (t, fn) => { (winLs[t] ||= []).push(fn); }; globalThis.removeEventListener = (t, fn) => { winLs[t] = (winLs[t] || []).filter(f => f !== fn); };
globalThis.sessionStorage = store(); globalThis.location = { search: '' };
let page = null;
// pagina dell'intro: old/trailer = comportamento del video di prima e del trailer
function makePage({ old = 'ok', trailer = 'ok', search = '', desktop = false, seen = false, seenVideo = null } = {}){
  resetClock(); for (const k of Object.keys(winLs)) delete winLs[k];
  sessionStorage.clear(); if (seen) sessionStorage.setItem('natpf-tennis.intro', '1'); if (seenVideo) sessionStorage.setItem('natpf-tennis.intro.video', seenVideo);
  location.search = search; if (desktop) globalThis.natpfDesktop = { shell: 'electron' }; else delete globalThis.natpfDesktop;
  const el = new Node(), still = new Node('img'), v = new Video(old), start = new Node('button'), skip = new Node('button');
  still.cls.add('intro-still'); still.setAttribute('src', './media/intro-fine.webp'); el.appendChild(still); el.appendChild(v);
  const ids = { 'natpf-intro': el, 'intro-video': v, 'intro-start': start, 'intro-skip': skip };
  page = { el, still, old: v, skip, created: [] };
  globalThis.document = { getElementById: id => ids[id] || (id === 'intro-trailer' ? el.children.find(c => c.isTrailer) || null : null),
    createElement: tag => { const n = tag === 'video' ? new Video(trailer) : new Node(tag); if (tag === 'video'){ n.isTrailer = true; page.created.push(n); } return n; } };
  return page;
}
const key = (k = 'Enter') => { for (const fn of [...(winLs.keydown || [])]) fn({ type: 'keydown', key: k, preventDefault(){}, stopImmediatePropagation(){} }); };
const cls = P => [...P.el.cls].sort().join(' ');

const { NatpfIntro, TRAILER, INTRO_MS, INTRO_STILL, INTRO_VIDEO_KEY, introPlan, trailerUrl, introDuration, introStill, trailerStarted, introMode } = await import('../src/natpf/natpf_intro.js');
const repo = rel => fileURLToPath(new URL('../../' + rel, import.meta.url));
const R2 = 'https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev';

test('sorgente del trailer: nel programma Windows il file locale, sul web il bucket R2; poi il video di prima', () => {
  assert.equal(trailerUrl({ desktop: true }), `./media/${TRAILER.file}`);
  assert.equal(trailerUrl({ desktop: false }), `${R2}/media/${TRAILER.file}`);
  assert.equal(trailerUrl(), `${R2}/media/${TRAILER.file}`);
  const web = introPlan({ search: '' }), desk = introPlan({ search: '', desktop: true });
  assert.deepEqual(web.map(s => s.id), ['trailer', 'intro']); assert.deepEqual(desk.map(s => s.id), ['trailer', 'intro']);
  assert.equal(web[0].src, `${R2}/media/${TRAILER.file}`); assert.equal(desk[0].src, `./media/${TRAILER.file}`);
  assert.equal(web[0].waitMs, TRAILER.waitMs); assert.equal(desk[0].waitMs, TRAILER.waitLocalMs); assert.ok(TRAILER.waitLocalMs <= TRAILER.waitMs && TRAILER.waitMs <= 3000, 'un tempo breve');
  assert.deepEqual(web[1], { id: 'intro', src: null, waitMs: 0, shiftMs: 0 }, 'il video di prima: quello già nella pagina, senza limiti e con i tempi di prima');
  assert.deepEqual(introPlan({ search: '?trailer=0' }).map(s => s.id), ['intro']);
  assert.deepEqual(introPlan({ search: '?trailer=0', desktop: true }), [{ id: 'intro', src: null, waitMs: 0, shiftMs: 0 }]);
  assert.deepEqual(introPlan({ search: '?trailer=1&intro=1' }).map(s => s.id), ['trailer', 'intro']);
  // tempi: con il trailer il titolo entra 2,8 s dopo (ultima inquadratura), il resto come prima
  assert.equal(introDuration('full', 0), INTRO_MS.full); assert.equal(introDuration('full', TRAILER.shiftMs), INTRO_MS.full + TRAILER.shiftMs);
  assert.equal(introDuration('short', TRAILER.shiftMs), INTRO_MS.short); assert.equal(INTRO_MS.full, 7800); assert.equal(INTRO_MS.short, 1500);
  assert.equal(introStill('trailer'), TRAILER.still); assert.equal(introStill('intro'), INTRO_STILL); assert.equal(introStill(null), './media/intro-fine.webp');
  assert.equal(trailerStarted(null), false); assert.equal(trailerStarted({ paused: true, readyState: 4 }), false); assert.equal(trailerStarted({ paused: false, readyState: 1, currentTime: 0 }), false);
  assert.equal(trailerStarted({ paused: false, readyState: 3, currentTime: 0 }), true); assert.equal(trailerStarted({ paused: false, readyState: 4, error: { code: 4 } }), false);
  // ?intro=0 e gli altri casi dell'intro non cambiano
  assert.equal(introMode({ search: '?intro=0' }), 'off'); assert.equal(introMode({ search: '' }), 'full'); assert.equal(introMode({ search: '', seen: true }), 'short');
});

test('file: il trailer sta in natpf-desktop/media con il nome della sua impronta, fuori dal pacchetto Cloudflare; clip e immagine in public/media', () => {
  const file = repo(`natpf-desktop/media/${TRAILER.file}`), bytes = fs.readFileSync(file), sha = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha, TRAILER.sha256); assert.equal(bytes.length, TRAILER.bytes); assert.equal(TRAILER.file, `trailer-${sha.slice(0, 12)}.mp4`);
  assert.deepEqual(fs.readdirSync(repo('natpf-desktop/media')).filter(f => f.endsWith('.mp4')), [TRAILER.file], 'un solo trailer');
  // moov prima di mdat: il video parte mentre si scarica (faststart)
  assert.ok(bytes.indexOf(Buffer.from('moov')) < bytes.indexOf(Buffer.from('mdat')), 'faststart');
  // niente trailer in natpf-tennis/public (finirebbe in dist e nello zip Cloudflare: 25 MB)
  const pub = fs.readdirSync(repo('natpf-tennis/public/media'));
  assert.ok(!pub.some(f => /^trailer.*\.mp4$/.test(f)), pub.join(', '));
  assert.equal(JSON.parse(fs.readFileSync(repo('natpf-desktop/aggiornamenti.json'), 'utf8')).base, TRAILER.base, 'stesso bucket degli aggiornamenti');
  // ultima inquadratura del trailer: nel pacchetto, leggera
  const size = f => fs.statSync(repo(`natpf-tennis/public/${f.replace(/^\.\//, '')}`)).size;
  assert.ok(size(TRAILER.still) < 120_000, `${size(TRAILER.still)}`);
  assert.ok(!bytes.includes(Buffer.from('mp4a')), 'trailer senza audio');
  const notes = fs.readFileSync(repo('natpf-tennis/public/media/LEGGIMI.txt'), 'utf8');
  for (const f of ['trailer-fine.webp', TRAILER.file]) assert.ok(notes.includes(f), `${f} non è in LEGGIMI.txt`);
  // la pagina: il video di prima resta com'era (ripiego), le animazioni hanno lo spostamento del trailer
  const html = fs.readFileSync(repo('natpf-tennis/index.html'), 'utf8'), css = fs.readFileSync(repo('natpf-tennis/natpf-ui.css'), 'utf8');
  assert.match(html, /<video class="intro-video" id="intro-video" src="\.\/media\/intro\.mp4" muted playsinline preload="auto"/);
  assert.match(html, /<img class="intro-still" src="\.\/media\/intro-fine\.webp"/);
  assert.equal((css.match(/var\(--intro-shift, 0ms\)/g) || []).length, 5, 'i cinque ritardi dell\'intro completa');
  assert.match(css, /\.natpf-intro\.is-trailer \.intro-video:not\(\.intro-trailer\) \{ display: none; \}/);
  // il programma Windows lo porta dentro, il workflow lo carica sul bucket in media/ senza fermare l'installer
  const prepara = fs.readFileSync(repo('natpf-desktop/scripts/prepara.mjs'), 'utf8'), wf = fs.readFileSync(repo('.github/workflows/natpf-windows.yml'), 'utf8');
  assert.match(prepara, /path\.join\(APP, 'natpf-tennis\/dist\/media', f\)/);
  assert.match(wf, /s3:\/\/\$R2_BUCKET\/media\/\$nome/); assert.match(wf, /if ! carica_trailer; then\n\s+echo "::warning/); assert.match(wf, /--content-type video\/mp4 --cache-control "public, max-age=31536000, immutable"/);
  assert.ok(wf.indexOf('carica_trailer; then') < wf.indexOf('--confronta=remoto.json'), 'prima del controllo «versione già pubblicata»');
  assert.doesNotMatch(wf.slice(wf.indexOf('carica_trailer()'), wf.indexOf('if ! carica_trailer')), /AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID|R2_ACCOUNT_ID/, 'nessun segreto nel blocco del trailer');
});

test('intro: il trailer parte → classe is-trailer, titolo spostato di 2,8 s, «Premi un tasto» a 10,6 s, ultima inquadratura del trailer', async () => {
  const P = makePage(); let done = null; const I = new NatpfIntro({ onDone: r => { done = r; } });
  assert.equal(I.mode, 'full'); assert.equal(P.created.length, 1); const tr = P.created[0];
  assert.equal(tr.src, `${R2}/media/${TRAILER.file}`); assert.ok(tr.muted && tr.playsInline && tr.preload === 'auto'); assert.equal(tr.parentNode, P.el);
  assert.equal(P.el.children.indexOf(tr), P.el.children.indexOf(P.old) + 1, 'sopra il video di prima');
  assert.equal(P.old.plays, 0, 'il video di prima non parte'); assert.ok(!P.el.cls.has('mode-full'), 'le animazioni aspettano il video');
  advance(120); await flush();
  assert.equal(cls(P), 'is-trailer mode-full'); assert.equal(P.el.style.props['--intro-shift'], '2800ms'); assert.equal(I.video, 'trailer');
  assert.equal(P.still.getAttribute('src'), TRAILER.still);
  advance(INTRO_MS.full + TRAILER.shiftMs - 10); assert.equal(I.ready, false);
  advance(20); assert.equal(I.ready, true); assert.ok(P.el.cls.has('is-ready'));
  key(); assert.deepEqual(done, { skipped: false }); assert.equal(sessionStorage.getItem('natpf-tennis.intro'), '1'); assert.equal(sessionStorage.getItem(INTRO_VIDEO_KEY), 'trailer');
  advance(700); assert.ok(P.el.cls.has('hidden')); assert.equal(tr.parentNode, null, 'trailer tolto dalla pagina'); assert.ok(tr.paused);
  // nel programma Windows: file locale, attesa più corta
  const D = makePage({ desktop: true }); new NatpfIntro({});
  assert.equal(D.created[0].src, `./media/${TRAILER.file}`); advance(120); assert.equal(cls(D), 'is-trailer mode-full');
  delete globalThis.natpfDesktop;
});

test('intro: trailer con errore (404, rete assente) o fermo → il video di prima, con i tempi di prima', async () => {
  for (const [trailer, at] of [['error', 80], ['hang', TRAILER.waitMs]]){
    const P = makePage({ trailer }); const I = new NatpfIntro({});
    advance(at - 1); assert.equal(P.old.plays, 0, `${trailer}: ancora in attesa`); assert.ok(!P.el.cls.has('mode-full'));
    advance(1); await flush();
    assert.equal(P.old.plays, 1, `${trailer}: parte il video di prima`); assert.equal(P.created[0].parentNode, null, 'trailer tolto');
    assert.equal(cls(P), 'mode-full'); assert.equal(P.el.style.props['--intro-shift'], '0ms'); assert.equal(I.video, 'intro'); assert.equal(P.still.getAttribute('src'), INTRO_STILL);
    advance(INTRO_MS.full - 10); assert.equal(I.ready, false); advance(20); assert.equal(I.ready, true);
    key(); assert.equal(sessionStorage.getItem(INTRO_VIDEO_KEY), 'intro');
  }
  // pagina occupata all'avvio: un blocco lungo conta come un passo solo, il trailer non è scartato per questo
  const P = makePage({ trailer: 'hang' }); new NatpfIntro({});
  block(5000);                                   // 5 s senza che la pagina possa fare niente (nessun timer è girato)
  advance(TRAILER.tickMs); assert.equal(P.old.plays, 0, 'dopo il blocco il trailer ha ancora il suo tempo');
  P.created[0].paused = false; P.created[0].readyState = 4;          // partito, ma l'evento «playing» non è ancora arrivato
  advance(TRAILER.tickMs); assert.equal(cls(P), 'is-trailer mode-full'); assert.equal(P.old.plays, 0);
});

test('intro: riproduzione rifiutata dal browser → video di prima, e se nemmeno quello parte l\'immagine finale', async () => {
  const P = makePage({ trailer: 'reject', old: 'ok' }); const I = new NatpfIntro({}); await flush();
  assert.equal(P.old.plays, 1); assert.equal(cls(P), 'mode-full'); assert.equal(I.video, 'intro');
  const Q = makePage({ trailer: 'reject', old: 'reject' }); const J = new NatpfIntro({}); await flush();
  assert.equal(cls(Q), 'mode-full no-video'); assert.equal(J.video, null); assert.equal(Q.still.getAttribute('src'), INTRO_STILL);
  advance(INTRO_MS.full); assert.equal(J.ready, true);
  key(); assert.equal(sessionStorage.getItem(INTRO_VIDEO_KEY), null);
  // ?trailer=0: subito il video di prima, nessun video creato
  const R = makePage({ search: '?trailer=0' }); const K = new NatpfIntro({});
  assert.equal(R.created.length, 0); assert.equal(R.old.plays, 1); assert.equal(cls(R), 'mode-full'); assert.equal(K.video, 'intro');
});

test('intro: un tasto mentre il trailer si carica o gira → subito il titolo; seconda volta: solo il titolo; ?intro=0: niente', async () => {
  // in attesa del trailer: titolo sull'immagine finale, il trailer non parte più
  const P = makePage({ trailer: 'hang' }); const I = new NatpfIntro({});
  advance(500); key('a');
  assert.equal(I.ready, true); assert.equal(cls(P), 'is-ready mode-full no-video'); assert.equal(P.created[0].parentNode, null); assert.equal(P.still.getAttribute('src'), INTRO_STILL);
  advance(5000); assert.equal(P.old.plays, 0, 'nessun video parte dopo il salto'); assert.equal(cls(P), 'is-ready mode-full no-video');
  // durante il trailer: titolo subito, il trailer resta sotto
  const Q = makePage(); const J = new NatpfIntro({}); advance(2000); Q.skip.emit('click');
  assert.equal(J.ready, true); assert.equal(cls(Q), 'is-ready is-trailer mode-full'); assert.equal(Q.created[0].parentNode, Q.el);
  // Tab non salta
  const T = makePage(); const K = new NatpfIntro({}); advance(1000); key('Tab'); assert.equal(K.ready, false);
  // seconda volta nella sessione: intro breve sull'ultima inquadratura del video visto
  const S = makePage({ seen: true, seenVideo: 'trailer' }); const L = new NatpfIntro({});
  assert.equal(L.mode, 'short'); assert.equal(S.created.length, 0); assert.equal(cls(S), 'mode-short no-video'); assert.equal(S.still.getAttribute('src'), TRAILER.still);
  advance(INTRO_MS.short); assert.equal(L.ready, true);
  const S2 = makePage({ seen: true, seenVideo: 'intro' }); new NatpfIntro({}); assert.equal(S2.still.getAttribute('src'), INTRO_STILL);
  // ?intro=0
  const O = makePage({ search: '?intro=0' }); let off = null; const M = new NatpfIntro({ onDone: r => { off = r; } }); await flush();
  assert.equal(M.mode, 'off'); assert.ok(O.el.cls.has('hidden')); assert.deepEqual(off, { skipped: true }); assert.equal(O.created.length, 0); assert.equal(O.old.plays, 0);
});

test('intro: trailer fermo a metà (rete caduta) → immagine finale e titolo', async () => {
  const P = makePage(); const I = new NatpfIntro({}); advance(120); await flush();
  const tr = P.created[0]; assert.equal(cls(P), 'is-trailer mode-full');
  advance(3000); tr.emit('waiting'); advance(TRAILER.stallMs - 1); assert.equal(I.ready, false);
  // riparte in tempo: niente
  tr.emit('playing'); advance(3000); assert.equal(cls(P), 'is-trailer mode-full');
  tr.emit('waiting'); advance(TRAILER.stallMs);
  assert.equal(I.ready, true); assert.equal(cls(P), 'is-ready mode-full no-video'); assert.equal(tr.parentNode, null); assert.equal(P.still.getAttribute('src'), INTRO_STILL);
});
