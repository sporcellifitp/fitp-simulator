// Intro con il trailer e il suo ripiego (B21, src/natpf/natpf_intro.js): scelta della sorgente del video (programma Windows: file locale; web: bucket R2),
// ordine dei tentativi, tempi, file nel repository (il trailer fuori dal pacchetto Cloudflare, con il nome che porta
// l'impronta), e la classe dell'intro con una pagina finta e un orologio finto: trailer che parte, errore, tempo
// scaduto, riproduzione rifiutata, salto, seconda volta nella sessione; rete lenta (revisione): il trailer parte solo se
// arriva in fondo senza fermarsi, con il conto rifatto sul peso vero del file. Nel browser: tools/e2e/natpf-intro-trailer.mjs
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
    createElement: tag => { const n = tag === 'video' ? new Video(Array.isArray(trailer) ? trailer[Math.min(page.created.length, trailer.length - 1)] : trailer) : new Node(tag); if (tag === 'video'){ n.isTrailer = true; page.created.push(n); } return n; } };
  return page;
}
const key = (k = 'Enter') => { for (const fn of [...(winLs.keydown || [])]) fn({ type: 'keydown', key: k, preventDefault(){}, stopImmediatePropagation(){} }); };
const cls = P => [...P.el.cls].sort().join(' ');

const { NatpfIntro, TRAILER, INTRO_MS, INTRO_STILL, INTRO_VIDEO_KEY, introPlan, trailerUrl, introDuration, introStill, trailerStarted, trailerCanFinish, bufferedEnd, introMode } = await import('../src/natpf/natpf_intro.js');
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
  // dal server del programma, da un altro computer (?lan=1 senza window.natpfDesktop): prima il file dello stesso server, poi il bucket
  const lan = introPlan({ search: '?lan=1' });
  assert.deepEqual(lan.map(s => [s.id, s.src, s.waitMs]), [['trailer', `./media/${TRAILER.file}`, TRAILER.waitLocalMs], ['trailer', `${R2}/media/${TRAILER.file}`, TRAILER.waitMs], ['intro', null, 0]]);
  assert.deepEqual(introPlan({ search: '?lan=1', desktop: true }), desk, 'nel programma: solo il file locale, come senza ?lan=1');
  assert.deepEqual(introPlan({ search: '?lan=1&trailer=0' }).map(s => s.id), ['intro']);
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
  assert.match(css, /\.natpf-intro:not\(\.is-trailer\) \.intro-trailer \{ opacity: 0; \}/, 'il trailer in attesa non si vede');
  // il programma Windows lo porta dentro, il workflow lo carica sul bucket in media/ senza fermare l'installer
  const prepara = fs.readFileSync(repo('natpf-desktop/scripts/prepara.mjs'), 'utf8'), wf = fs.readFileSync(repo('.github/workflows/natpf-windows.yml'), 'utf8');
  assert.match(prepara, /path\.join\(APP, 'natpf-tennis\/dist\/media', f\)/);
  assert.match(wf, /s3:\/\/\$R2_BUCKET\/media\/\$nome/); assert.match(wf, /if ! carica_trailer; then\n\s+echo "::warning/); assert.match(wf, /--content-type video\/mp4 --cache-control "public, max-age=31536000, immutable"/);
  assert.ok(wf.indexOf('carica_trailer; then') < wf.indexOf('--confronta=remoto.json'), 'prima del controllo «versione già pubblicata»');
  // il controllo finale del workflow guarda l'indirizzo che usa il gioco (TRAILER.base, letto da questo file con sed)
  const src = fs.readFileSync(repo('natpf-tennis/src/natpf/natpf_intro.js'), 'utf8');
  assert.equal(/^ *base: '([^']*)'/m.exec(src)?.[1], TRAILER.base, 'la riga che legge il workflow');
  assert.match(wf, /gioco="\$\(sed -n "s\/\^ \*base: '\\\(\[\^'\]\*\\\)'\.\*\/\\1\/p" \.\.\/natpf-tennis\/src\/natpf\/natpf_intro\.js \| head -n 1\)"/);
  assert.match(wf, /curl -fsSI "\$gioco\/media\/\$nome"/); assert.doesNotMatch(wf, /curl -fsSI "\$base\/media/);
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

/* ---------- revisione dell'11/11: rete lenta verso il trailer ---------- */
// Peso del trailer lungo i suoi 10 s: byte del file che servono per arrivare al secondo 0, 1, … 10 (misurato sul file
// con `ffprobe -select_streams v -show_entries packet=pts_time,size,pos -of csv=p=0`: per ogni secondo il massimo di
// pos + size). Il trailer è più leggero all'inizio (100–220 kB al secondo) e più pesante verso la fine (fino a 430).
const PROFILE = [0, 223490, 320263, 441559, 659857, 789014, 1044278, 1370848, 1582940, 2010155, 2258622], DUR = 10.04;
const bytesAt = sec => { const x = Math.min(10, Math.max(0, sec*10/DUR)), i = Math.min(9, Math.floor(x)); return PROFILE[i] + (PROFILE[i + 1] - PROFILE[i])*(x - i); };
const secondsAt = bytes => { if (bytes >= PROFILE[10]) return DUR; let i = 0; while (PROFILE[i + 1] <= bytes) i++; return (i + (bytes - PROFILE[i])/(PROFILE[i + 1] - PROFILE[i]))*DUR/10; };
// video che si scarica a `rate` byte al secondo, dopo `t` secondi. `buffered` com'è nei browser che lo danno in tempo di
// filmato vero, oppure (linear) come lo dà Chromium con un file mp4 normale: in proporzione ai byte scaricati
const loading = (rate, t, linear = false) => ({ readyState: 4, duration: DUR, buffered: { length: 1, end: () => (linear ? DUR*Math.min(1, rate*t/PROFILE[10]) : secondsAt(rate*t)) } });
// primo momento (a passi di 250 ms, entro `within` secondi) in cui il trailer può partire scaricando a `rate` byte al secondo
const firstGo = (rate, linear = false, within = 8) => { for (let t = .25; t <= within; t += .25) if (trailerCanFinish(loading(rate, t, linear), t*1000)) return t; return null; };
// partito a `t0`: di quanti byte lo scaricamento resta avanti alla riproduzione nel punto peggiore (negativo: si ferma)
const slack = (rate, t0) => { let m = Infinity; for (let x = 0; x <= DUR; x += .02) m = Math.min(m, rate*(t0 + x) - bytesAt(x)); return m; };
const stalls = (rate, t0) => slack(rate, t0) < 0;

test('rete lenta: il trailer parte solo se arriva in fondo senza fermarsi (stima del browser + filmato scaricato)', () => {
  assert.equal(TRAILER.sha256.slice(0, 12), 'aad6b9311db4', 'il profilo qui sopra è di questo file: con un trailer nuovo va rifatto con ffprobe');
  assert.equal(PROFILE[10], TRAILER.bytes);
  const v = (o = {}) => ({ readyState: 4, duration: DUR, buffered: { length: 1, end: () => o.end ?? 0 }, ...o });
  // senza la stima del browser (readyState 4) mai, nemmeno con tutto il filmato scaricato; con un errore mai
  assert.equal(trailerCanFinish(null), false); assert.equal(trailerCanFinish(v({ readyState: 3, end: DUR })), false); assert.equal(trailerCanFinish(v({ end: DUR, error: { code: 3 } })), false);
  // tutto scaricato: sì, a qualunque distanza dall'inizio dello scaricamento
  assert.equal(trailerCanFinish(v({ end: DUR }), 60000), true); assert.equal(trailerCanFinish(v({ end: DUR - .2 }), 60000), true);
  // una parte: servono almeno 6 s di filmato, arrivati entro 7 s dalla creazione del video
  assert.equal(trailerCanFinish(v({ end: 5.9 }), 1000), false, 'meno di 6 s di filmato');
  assert.equal(trailerCanFinish(v({ end: 6 }), 1000), true); assert.equal(trailerCanFinish(v({ end: 6.2 }), 7000), true);
  assert.equal(trailerCanFinish(v({ end: 6.2 }), 7100), false, 'troppo lento: 6,2 s di filmato in più di 7 s');
  assert.equal(trailerCanFinish(v({ end: 9.5 }), 9000), false); assert.equal(TRAILER.leadS, 6); assert.equal(TRAILER.leadMaxMs, 7000);
  // il browser non dice quanto ha scaricato (o la durata): vale la sua stima
  assert.equal(trailerCanFinish({ readyState: 4 }), true); assert.equal(trailerCanFinish({ readyState: 4, duration: NaN, buffered: { length: 0 } }), true);
  assert.equal(trailerCanFinish(v({ buffered: { length: 0 } }), 500), false, 'niente scaricato');
  assert.equal(bufferedEnd(null), null); assert.equal(bufferedEnd({ buffered: { length: 0 } }), 0); assert.equal(bufferedEnd({ buffered: { length: 2, end: i => [1, 5][i] } }), 5);
  assert.equal(bufferedEnd({ get buffered(){ throw new Error('x'); } }), null);

  // Il conto con il peso vero del file, a velocità costante da 40 kB/s a 3 MB/s, nei due modi in cui i browser dicono
  // quanto hanno scaricato, guardando ogni 250 ms per 8 s: quando la regola dice «parti» il trailer non si ferma mai
  // e lo scaricamento resta sempre avanti di almeno 250 kB; le reti del difetto trovato dalla revisione (40 e
  // 100 kB/s: il file ne chiede in media 226) non lo fanno mai partire; con 1 MB/s parte entro 1,5 s
  const found = {};
  for (const linear of [false, true]){
    let slowestGo = Infinity, minSlack = Infinity;
    for (let rate = 40e3; rate <= 3e6; rate += 5e3){
      const t = firstGo(rate, linear, 8);
      if (t == null){ assert.ok(rate < 200e3, `${rate/1000} kB/s dovrebbe partire`); continue; }
      slowestGo = Math.min(slowestGo, rate); minSlack = Math.min(minSlack, slack(rate, t));
      assert.ok(!stalls(rate, t), `a ${rate/1000} kB/s parte dopo ${t} s e poi si ferma`);
      if (rate >= 600e3) assert.ok(t <= 2.5, `a ${rate/1000} kB/s parte solo dopo ${t} s`);
      if (rate >= 1e6) assert.ok(t <= 1.5, `a ${rate/1000} kB/s parte solo dopo ${t} s`);
    }
    for (const rate of [40e3, 100e3, 140e3]) assert.equal(firstGo(rate, linear, 8), null, `${rate/1000} kB/s`);
    assert.ok(minSlack >= 250e3, `vantaggio minimo ${Math.round(minSlack/1000)} kB`);
    found[linear ? 'byte' : 'tempo'] = slowestGo/1000;
  }
  // la rete più lenta che può far partire il trailer (se la pagina resta occupata a lungo e l'attesa si allunga fino a
  // 7 s): 150 kB/s dove `buffered` è in tempo di filmato, 195 kB/s in Chromium (in proporzione ai byte)
  assert.deepEqual(found, { tempo: 150, byte: 195 });
  // con l'attesa normale (2,5 s più l'avvio: qui 4 s dall'inizio dello scaricamento) servono 260 e 340 kB/s
  assert.equal(firstGo(255e3, false, 4), null); assert.ok(firstGo(260e3, false, 4) <= 4); assert.equal(firstGo(335e3, true, 4), null); assert.ok(firstGo(340e3, true, 4) <= 4);
  assert.equal(firstGo(180e3, true, 8), null, '180 kB/s in Chromium: mai (finché non è scaricato tutto)');
  // margine: partendo con 6 s di filmato scaricati basterebbero 125 kB/s per non fermarsi, la regola ne chiede almeno 150
  assert.ok(!stalls(125e3, PROFILE[6]/125e3) && stalls(115e3, PROFILE[6]/115e3));
  // La sola stima del browser non basta. Misurato con Chromium: a 200 kB/s dice di sì dopo 1,4 s e il trailer si ferma
  // due volte verso la fine; sulla carta lì lo scaricamento resta avanti di appena 30 kB (al browser serve qualcosa in
  // più del filo). La regola lì dice no, e quando dice sì lascia sempre almeno 200 kB di vantaggio
  assert.ok(slack(200e3, 1.4) > 0 && slack(200e3, 1.4) < 40e3, `${slack(200e3, 1.4)}`);
  assert.equal(trailerCanFinish(loading(200e3, 1.4), 1400), false);
  assert.equal(trailerCanFinish(loading(200e3, 1.4, true), 1400), false);
});

test('intro, rete lenta: il trailer gira con i primi dati ma non arriva in fondo → resta fermo all\'inizio, poi il video di prima', async () => {
  const P = makePage({ trailer: 'slow' }); const I = new NatpfIntro({}); const tr = P.created[0];
  advance(130); await flush();
  assert.equal(tr.plays, 1); assert.ok(tr.paused, 'rimesso in pausa'); assert.equal(tr.currentTime, 0, 'all\'inizio'); assert.equal(tr.parentNode, P.el);
  assert.ok(!P.el.cls.has('mode-full') && !P.el.cls.has('is-trailer'), 'l\'intro non è partita con il trailer'); assert.equal(I.video, null);
  advance(TRAILER.waitMs - 131); assert.equal(P.old.plays, 0, 'ancora in attesa');
  advance(1); await flush();
  assert.equal(P.old.plays, 1, 'parte il video di prima'); assert.equal(tr.parentNode, null); assert.equal(tr.plays, 1, 'il trailer non è ripartito');
  assert.equal(cls(P), 'mode-full'); assert.equal(P.el.style.props['--intro-shift'], '0ms'); assert.equal(I.video, 'intro'); assert.equal(P.still.getAttribute('src'), INTRO_STILL);
  advance(INTRO_MS.full - 10); assert.equal(I.ready, false); advance(20); assert.equal(I.ready, true);

  // la stima arriva in tempo (rete giusta, un po' lenta all'inizio): il trailer riparte dall'inizio e l'intro comincia lì
  const Q = makePage({ trailer: 'slow' }); const J = new NatpfIntro({}); const t2 = Q.created[0];
  advance(130); assert.ok(t2.paused && !Q.el.cls.has('mode-full'));
  // il browser stima di sì ma il filmato scaricato è poco (meno di 6 s): ancora fermo
  t2.readyState = 4; t2.duration = 10.04; t2.buffered = { length: 1, end: () => 2 }; t2.emit('canplaythrough');
  assert.equal(t2.plays, 1); assert.ok(t2.paused);
  t2.buffered = { length: 1, end: () => 6.5 }; t2.emit('progress');
  assert.equal(t2.plays, 2, 'riparte'); assert.ok(!Q.el.cls.has('mode-full'), 'l\'intro aspetta che giri');
  advance(120); await flush();
  assert.equal(cls(Q), 'is-trailer mode-full'); assert.equal(J.video, 'trailer'); assert.equal(Q.old.plays, 0); assert.equal(Q.el.style.props['--intro-shift'], '2800ms');
  advance(INTRO_MS.full + TRAILER.shiftMs - 10); assert.equal(J.ready, false); advance(20); assert.equal(J.ready, true);

  // lo stesso senza eventi (pagina occupata: si guarda a ogni passo); la pausa fa fallire play() con AbortError, che
  // non è un rifiuto del browser: il trailer resta in attesa e poi parte
  const R = makePage({ trailer: 'slow-abort' }); const K = new NatpfIntro({}); const t3 = R.created[0];
  advance(TRAILER.tickMs); await flush();
  assert.ok(t3.paused && t3.parentNode === R.el, 'in pausa, non scartato'); assert.equal(R.old.plays, 0);
  t3.readyState = 4; advance(TRAILER.tickMs); assert.equal(t3.plays, 2); assert.ok(!t3.paused);
  advance(TRAILER.tickMs); assert.equal(cls(R), 'is-trailer mode-full'); assert.equal(K.video, 'trailer');
  // la stima arriva all'ultimo passo del tempo: il trailer ha ancora il tempo di ripartire, non è scartato
  const U = makePage({ trailer: 'slow' }); const M = new NatpfIntro({}); const t4 = U.created[0];
  advance(TRAILER.waitMs - 10); assert.ok(t4.paused); t4.readyState = 4;
  advance(10); assert.equal(t4.plays, 2); assert.equal(U.old.plays, 0, 'non scartato'); assert.equal(t4.parentNode, U.el);
  advance(120); await flush(); assert.equal(cls(U), 'is-trailer mode-full'); assert.equal(M.video, 'trailer'); assert.equal(U.old.plays, 0);
  // …ma se dopo essere ripartito non gira, dopo altri due passi si passa al video di prima
  const W = makePage({ trailer: 'slow' }); new NatpfIntro({}); const t5 = W.created[0];
  advance(TRAILER.waitMs - 10); t5.readyState = 4; t5.behave = 'hang'; advance(10); assert.equal(t5.plays, 2);
  t5.paused = true;                                   // il browser non lo fa girare
  advance(3*TRAILER.tickMs); await flush(); assert.equal(W.old.plays, 1); assert.equal(t5.parentNode, null); assert.equal(cls(W), 'mode-full');
  // 6,5 s di filmato arrivati entro 7 s dalla creazione del video vanno bene; più tardi (pagina occupata a lungo e
  // rete lenta) no, finché non arriva tutto il filmato
  for (const [wait, goes] of [[1500, true], [7500, false]]){
    const X = makePage({ trailer: 'slow' }); new NatpfIntro({}); const t6 = X.created[0];
    advance(130); assert.ok(t6.paused, 'fermo in attesa');
    block(wait - 130); t6.readyState = 4; t6.duration = 10.04; t6.buffered = { length: 1, end: () => 6.5 }; t6.emit('progress');
    assert.equal(t6.plays, goes ? 2 : 1, `6,5 s di filmato dopo ${wait} ms`);
    if (!goes){ t6.buffered = { length: 1, end: () => 10.04 }; t6.emit('progress'); assert.equal(t6.plays, 2, 'tutto scaricato'); }
    advance(120); await flush(); assert.equal(cls(X), 'is-trailer mode-full');
  }
  // un tasto mentre il trailer è fermo in attesa: subito il titolo sull'immagine finale
  const S = makePage({ trailer: 'slow' }); const L = new NatpfIntro({}); advance(600); key('a');
  assert.equal(L.ready, true); assert.equal(cls(S), 'is-ready mode-full no-video'); assert.equal(S.created[0].parentNode, null);
  advance(5000); assert.equal(S.old.plays, 0); assert.equal(S.created[0].plays, 1);
});

test('intro: errore del trailer a metà (file tronco, decodifica) → immagine finale, titolo e subito «Premi un tasto»', async () => {
  const P = makePage(); const I = new NatpfIntro({}); advance(120); await flush();
  const tr = P.created[0]; assert.equal(cls(P), 'is-trailer mode-full');
  advance(5000); assert.equal(I.ready, false);
  tr.error = { code: 3 }; tr.emit('error');
  assert.equal(I.ready, true, 'senza aspettare la fine del tempo dell\'intro'); assert.equal(cls(P), 'is-ready mode-full no-video');
  assert.equal(tr.parentNode, null); assert.equal(P.still.getAttribute('src'), INTRO_STILL); assert.equal(I.video, null);
  key(); assert.equal(sessionStorage.getItem(INTRO_VIDEO_KEY), null);
});

test('intro dal server del programma su un altro computer (?lan=1): prima il trailer dello stesso server, poi il bucket, poi il video di prima', async () => {
  // il file c'è: parte quello, nessuna richiesta al bucket
  const P = makePage({ search: '?lan=1' }); const I = new NatpfIntro({});
  assert.equal(P.created[0].src, `./media/${TRAILER.file}`); advance(120); await flush();
  assert.equal(cls(P), 'is-trailer mode-full'); assert.equal(P.created.length, 1); assert.equal(I.video, 'trailer');
  // il file non c'è (server senza trailer): il bucket
  const Q = makePage({ search: '?lan=1', trailer: ['error', 'ok'] }); const J = new NatpfIntro({});
  advance(80); await flush();
  assert.equal(Q.created.length, 2); assert.equal(Q.created[0].parentNode, null); assert.equal(Q.created[1].src, `${R2}/media/${TRAILER.file}`); assert.equal(Q.old.plays, 0);
  advance(120); await flush(); assert.equal(cls(Q), 'is-trailer mode-full'); assert.equal(J.video, 'trailer');
  // nessuno dei due: il video di prima
  const S = makePage({ search: '?lan=1', trailer: ['error', 'error'] }); const K = new NatpfIntro({});
  advance(80); await flush(); advance(80); await flush();
  assert.equal(S.created.length, 2); assert.equal(S.old.plays, 1); assert.equal(cls(S), 'mode-full'); assert.equal(K.video, 'intro');
});
