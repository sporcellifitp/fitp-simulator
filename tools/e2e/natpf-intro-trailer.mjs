// NATPF motore base (natpf-tennis/): intro con il trailer e il suo ripiego (B21, src/natpf/natpf_intro.js).
// Il trailer sul web sta sul bucket R2 (qui le richieste al bucket sono intercettate: il file vero di
// natpf-desktop/media, un 404, la rete bloccata, una risposta che non arriva mai); nel programma Windows è un file locale.
//   A) trailer che parte: video del trailer in riproduzione, titolo solo sull'ultima inquadratura, «Premi un tasto»,
//      un tasto porta al menu; seconda volta nella sessione: solo il titolo sull'ultima inquadratura del trailer;
//   B) trailer 404 · C) rete bloccata · D) risposta che non arriva: parte il video di prima, con i tempi di prima;
//   E) un tasto durante il trailer: subito il titolo; un altro: il menu;
//   F) ?intro=0: niente intro e nessuna richiesta del trailer · G) ?trailer=0: il video di prima, nessuna richiesta;
//   H) programma Windows (window.natpfDesktop): il trailer è il file locale ./media/…, nessuna richiesta al bucket;
//   I) riproduzione rifiutata dal browser: resta l'immagine finale con il titolo, come prima;
//   J) rete lenta (revisione dell'11/11; un server locale che manda il trailer a velocità fissa, da un altro computer
//      che apre il gioco dal server del programma, ?lan=1: lì vale la regola del web; fino al B26 la prova usava il
//      programma Windows finto, che ora non ha più la regola della rete lenta): a 100 kB/s il trailer non arriverebbe
//      in fondo → resta fermo e nascosto, parte il video di prima; a 1,5 MB/s parte e non si ferma mai; a 800 kB/s (al
//      limite del tempo concesso) parte senza fermate oppure lascia il posto al video di prima;
//   K) trailer tronco (errore a metà): immagine finale, titolo e subito «Premi un tasto»;
//   L) gioco aperto da un altro computer dal server del programma (?lan=1): trailer dello stesso server, e se manca il bucket;
//   M) programma Windows con avvio lento (B26, collaudo dell'utente dell'11/11: «è partito il video di prima»): con la
//      CPU rallentata 6 volte parte il trailer; con il primo dato del file che arriva dopo 14 passi della pagina (3,5 s
//      di pagina libera: con l'attesa di prima, 1,5 s, partiva il video di prima) parte il trailer; con il file che
//      non risponde mai il video di prima parte solo dopo 8 s; sul web con la CPU rallentata e il bucket veloce parte
//      il trailer.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-intro-trailer.mjs     (GAME_PORT 3163, +1 per il server lento; SHOTS=cartella; ONLY=AE)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(here, '../..'), GAME = path.join(REPO, 'natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3163);
const SHOTS = process.env.SHOTS || path.join(tmpdir(), 'natpf-intro-trailer'); mkdirSync(SHOTS, { recursive: true });
const MEDIA = path.join(REPO, 'natpf-desktop/media'), FILE = readdirSync(MEDIA).find(f => /^trailer-[0-9a-f]{12}\.mp4$/.test(f));
const TRAILER = readFileSync(path.join(MEDIA, FILE));
const R2 = 'https://pub-96b3cd8975b6434aaeac3ecfcca14a19.r2.dev';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// ONLY=AE…: solo quelle parti
const want = k => !process.env.ONLY || process.env.ONLY.includes(k);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
check(`trailer nel repository: natpf-desktop/media/${FILE} (${TRAILER.length} byte)`, !!FILE && TRAILER.length > 1e6);
// server lento per J: manda il trailer a RATE byte al secondo (a pezzi ogni 50 ms), con le richieste a intervalli
let RATE = 100e3;
const slow = http.createServer(async (req, res) => {
  let start = 0, end = TRAILER.length - 1; const m = /bytes=(\d+)-(\d*)/.exec(req.headers.range || '');
  if (m){ start = +m[1]; if (m[2]) end = Math.min(end, +m[2]); }
  res.writeHead(m ? 206 : 200, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'Content-Length': end - start + 1, ...(m ? { 'Content-Range': `bytes ${start}-${end}/${TRAILER.length}` } : {}) });
  let pos = start, closed = false; req.on('close', () => { closed = true; });
  while (pos <= end && !closed){ const n = Math.min(Math.ceil(RATE/20), end + 1 - pos); res.write(TRAILER.subarray(pos, pos + n)); pos += n; await sleep(50); }
  res.end();
}).listen(GAME_PORT + 1, '127.0.0.1');
const B = await launch();

// Linea del tempo dell'intro, un campione ogni 100 ms da quando l'intro esiste: classi, video in riproduzione, titolo
const TIMELINE = () => {
  window.__tl = []; let t0 = null;
  // eventi dei video creati dalla pagina (il trailer): [ms, evento, secondo del filmato, readyState]
  window.__ev = []; const ce = document.createElement.bind(document);
  document.createElement = (...a) => { const el = ce(...a); if (String(a[0]).toLowerCase() === 'video') for (const n of ['waiting', 'playing', 'pause', 'error', 'ended', 'canplaythrough']) el.addEventListener(n, () => __ev.push([Math.round(performance.now() - (t0 ?? performance.now())), n, +el.currentTime.toFixed(2), el.readyState])); return el; };
  setInterval(() => {
    const el = document.getElementById('natpf-intro'), I = window.__natpfTennis?.natpfUi?.intro; if (!el || !I) return;
    if (t0 == null) t0 = performance.now();
    const tr = document.getElementById('intro-trailer'), old = document.getElementById('intro-video'), title = el.querySelector('.intro-title');
    __tl.push({ t: Math.round(performance.now() - t0), cls: el.className.replace('natpf-intro', '').trim(), ready: I.ready, active: I.active, video: I.video,
      tr: tr ? +tr.currentTime.toFixed(2) : null, trPlaying: !!tr && !tr.paused && tr.readyState > 2, trOp: tr ? +getComputedStyle(tr).opacity : null, old: old ? +old.currentTime.toFixed(2) : null, oldPlaying: !!old && !old.paused && old.readyState > 2,
      title: title ? +(+getComputedStyle(title).opacity).toFixed(2) : null, shift: el.style.getPropertyValue('--intro-shift'), still: el.querySelector('.intro-still')?.getAttribute('src') });
  }, 100);
};
// r2: 'ok' | '404' | 'abort' | 'hang' | 'trunc' — cosa risponde il bucket; local: come risponde ./media/trailer-… dello
// stesso server ('ok', '404', 'slow': dal server lento, 'late:N': risponde dopo N passi da 250 ms della pagina, contati
// come li conta l'intro (un blocco della pagina vale un passo), 'hang': non risponde mai); cpu: CPU rallentata N volte
async function open({ query = '', r2 = 'ok', local = null, init = null, ctx = null, cpu = 0 } = {}){
  const c = ctx || await B.newContext({ viewport: { width: 1280, height: 720 } }), p = await c.newPage(), errs = [], reqs = { r2: 0, local: 0 };
  if (cpu > 1){ const cdp = await c.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.route(u => u.href.startsWith(R2), r => {
    reqs.r2++;
    if (r2 === 'ok') return r.fulfill({ status: 200, body: TRAILER, contentType: 'video/mp4', headers: { 'accept-ranges': 'none', 'cache-control': 'no-store' } });
    if (r2 === '404') return r.fulfill({ status: 404, body: 'Not Found', contentType: 'text/plain' });
    if (r2 === 'trunc') return r.fulfill({ status: 200, body: TRAILER.subarray(0, 700000), contentType: 'video/mp4', headers: { 'accept-ranges': 'none', 'cache-control': 'no-store' } });
    if (r2 === 'abort') return r.abort('internetdisconnected');
    return undefined;                                       // 'hang': la risposta non arriva mai
  });
  await p.route(u => u.host === `127.0.0.1:${GAME_PORT}` && /\/media\/trailer-[0-9a-f]{12}\.mp4$/.test(u.pathname), r => {
    reqs.local++;
    if (local === 'slow') return r.continue({ url: `http://127.0.0.1:${GAME_PORT + 1}/${FILE}` });
    if (local === 'hang') return undefined;
    if (/^late:/.test(local || '')) return p.evaluate(n => new Promise(res => { let k = 0; const t = () => (++k >= n ? res() : setTimeout(t, 250)); setTimeout(t, 250); }), +local.slice(5))
      .then(() => r.fulfill({ status: 200, body: TRAILER, contentType: 'video/mp4' })).catch(() => {});
    return local === 'ok' ? r.fulfill({ status: 200, body: TRAILER, contentType: 'video/mp4' }) : r.fulfill({ status: 404, body: 'Not Found', contentType: 'text/plain' });
  });
  await p.addInitScript(() => { try { localStorage.setItem('natpf-tennis.controller', 'mouse'); } catch {} });
  await p.addInitScript(TIMELINE);
  if (init) await p.addInitScript(init);
  for (let k = 0; ; k++){
    await p.goto(`http://127.0.0.1:${GAME_PORT}/${query}`, { waitUntil: 'domcontentloaded' });
    const ok = await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.intro, null, { timeout: 60000 }).then(() => true, () => false);
    if (ok) break;
    if (k >= 3) throw new Error('gioco non avviato');
    errs.length = 0; reqs.r2 = reqs.local = 0;
  }
  return { ctx: c, p, errs, reqs };
}
const tl = p => p.evaluate(() => __tl);
const until = (p, fn, timeout = 30000) => p.waitForFunction(fn, null, { timeout }).then(() => true, () => false);
const first = (T, f) => T.find(f)?.t ?? null;
const lobby = p => p.evaluate(() => ({ intro: !document.getElementById('natpf-intro').classList.contains('hidden') && !document.getElementById('natpf-intro').classList.contains('leaving'), menu: __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step, seen: sessionStorage.getItem('natpf-tennis.intro'), video: sessionStorage.getItem('natpf-tennis.intro.video') }));

/* ---------- A) trailer che parte ---------- */
if (want('A')){
  const g = await open({ r2: 'ok' }), p = g.p;
  check('A: il trailer parte', await until(p, () => { const v = document.getElementById('intro-trailer'); return v && !v.paused && v.currentTime > .5; }, 20000));
  const s0 = await p.evaluate(() => { const el = document.getElementById('natpf-intro'), v = document.getElementById('intro-trailer'), old = document.getElementById('intro-video');
    return { cls: el.className, src: v.currentSrc, muted: v.muted, inline: v.playsInline, w: v.videoWidth, h: v.videoHeight, dur: +v.duration.toFixed(2), oldShown: getComputedStyle(old).display, oldPaused: old.paused, shift: el.style.getPropertyValue('--intro-shift'), skip: getComputedStyle(document.getElementById('intro-skip')).display }; });
  check('A: trailer dal bucket R2, muto, 1280×720, 10 s; il video di prima è fermo e non si disegna', s0.src.startsWith(R2 + '/media/trailer-') && s0.src.endsWith(FILE) && s0.muted && s0.inline && s0.w === 1280 && s0.h === 720 && Math.abs(s0.dur - 10.04) < .1 && s0.oldShown === 'none' && s0.oldPaused && /is-trailer/.test(s0.cls) && /mode-full/.test(s0.cls) && s0.shift === '2800ms' && s0.skip !== 'none', JSON.stringify(s0));
  await p.waitForFunction(() => document.getElementById('intro-trailer')?.currentTime > 3.2, null, { timeout: 20000 }).catch(() => {});
  await p.screenshot({ path: path.join(SHOTS, 'intro-trailer-3s.png') });
  await p.waitForFunction(() => document.getElementById('intro-trailer')?.currentTime > 9.4, null, { timeout: 20000 }).catch(() => {});
  await p.screenshot({ path: path.join(SHOTS, 'intro-trailer-titolo.png') });
  check('A: fine dell\'animazione: «Premi un tasto per iniziare»', await until(p, () => __natpfTennis.natpfUi.intro.ready, 20000));
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(SHOTS, 'intro-trailer-pronto.png') });
  const T = await tl(p), play0 = first(T, x => x.trPlaying), title0 = first(T, x => x.title > .5 && /mode-full/.test(x.cls)), ready0 = first(T, x => x.ready);
  const atTitle = T.find(x => x.t === title0), early = T.filter(x => x.tr != null && x.tr < 7.8 && x.tr > 0);
  check('A: il titolo entra sull\'ultima inquadratura (dopo 8 s di trailer), non prima', title0 != null && atTitle.tr >= 8.2 && atTitle.tr <= 9.6 && early.every(x => x.title < .05), `titolo a ${atTitle?.tr} s del trailer (${title0 - play0} ms dopo la partenza); prima di 7,8 s opacità massima ${Math.max(0, ...early.map(x => x.title))}`);
  check('A: «Premi un tasto» 10,6 s dopo la partenza del trailer', ready0 != null && Math.abs((ready0 - play0) - 10600) < 900, `${ready0 - play0} ms`);
  const end = T.at(-1);
  check('A: sotto il titolo l\'ultima inquadratura del trailer', end.still === './media/trailer-fine.webp' && end.video === 'trailer' && end.tr > 9.9, JSON.stringify({ still: end.still, video: end.video, tr: end.tr }));
  check('A: una sola richiesta al bucket, nessuna al file locale', g.reqs.r2 >= 1 && g.reqs.local === 0, JSON.stringify(g.reqs));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1200);
  const l = await lobby(p);
  check('A: un tasto → menu principale, intro via, sessione segnata', !l.intro && l.menu === 'menu' && l.seen === '1' && l.video === 'trailer', JSON.stringify(l));
  check('A: a intro chiusa il video del trailer non c\'è più', await p.evaluate(() => !document.getElementById('intro-trailer')));
  // seconda volta nella stessa sessione: intro breve, solo il titolo sull'ultima inquadratura del trailer
  const before = g.reqs.r2;
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.intro, null, { timeout: 60000 });
  check('A2: seconda volta: intro breve pronta in circa 1,5 s', await until(p, () => __natpfTennis.natpfUi.intro.ready, 15000));
  const s2 = await p.evaluate(() => { const el = document.getElementById('natpf-intro'), img = el.querySelector('.intro-still'); return { cls: el.className, still: img.getAttribute('src'), stillOk: img.complete && img.naturalWidth, opacity: getComputedStyle(img).opacity, trailer: !!document.getElementById('intro-trailer'), title: getComputedStyle(el.querySelector('.intro-title')).opacity }; });
  const T2 = await tl(p), r2t = first(T2, x => x.ready);
  check('A2: titolo sull\'ultima inquadratura del trailer, nessun video, nessuna richiesta al bucket', /mode-short/.test(s2.cls) && /no-video/.test(s2.cls) && s2.still === './media/trailer-fine.webp' && s2.stillOk === 1280 && s2.opacity === '1' && !s2.trailer && s2.title === '1' && g.reqs.r2 === before && r2t < 2600, `${JSON.stringify(s2)}, pronta dopo ${r2t} ms`);
  await p.screenshot({ path: path.join(SHOTS, 'intro-breve.png') });
  check('A: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}

/* ---------- B, C, D) il trailer non arriva: parte il video di prima ---------- */
// (i tempi «dall'inizio dell'intro» comprendono l'avvio del gioco, che tiene occupata la pagina: qui, senza GPU, circa
// 1,3 s anche per il video di prima da solo, vedi G; con il bucket che non risponde si aggiungono i 2,5 s di attesa)
for (const [name, r2, maxWait] of [['B: trailer 404', '404', 2500], ['C: rete bloccata', 'abort', 2500], ['D: il bucket non risponde', 'hang', 5000]].filter(x => want(x[0][0]))){
  const g = await open({ r2 }), p = g.p;
  check(`${name}: parte il video di prima`, await until(p, () => { const v = document.getElementById('intro-video'); return v && !v.paused && v.currentTime > .5; }, 20000));
  const s = await p.evaluate(() => { const el = document.getElementById('natpf-intro'), old = document.getElementById('intro-video'); return { cls: el.className, trailer: !!document.getElementById('intro-trailer'), src: old.currentSrc.replace(location.origin, ''), shown: getComputedStyle(old).display, shift: el.style.getPropertyValue('--intro-shift'), still: el.querySelector('.intro-still').getAttribute('src') }; });
  check(`${name}: come prima del B21 (intro.mp4, niente trailer nella pagina, tempi di prima)`, /mode-full/.test(s.cls) && !/is-trailer|no-video/.test(s.cls) && !s.trailer && s.src === '/media/intro.mp4' && s.shown !== 'none' && s.shift === '0ms' && s.still === './media/intro-fine.webp', JSON.stringify(s));
  if (r2 === '404'){ await p.waitForFunction(() => document.getElementById('intro-video').currentTime > 3, null, { timeout: 15000 }).catch(() => {}); await p.screenshot({ path: path.join(SHOTS, 'intro-ripiego-3s.png') }); }
  check(`${name}: «Premi un tasto»`, await until(p, () => __natpfTennis.natpfUi.intro.ready, 20000));
  await p.waitForTimeout(400);
  const T = await tl(p), play0 = first(T, x => x.oldPlaying), title0 = first(T, x => x.title > .5), ready0 = first(T, x => x.ready), atTitle = T.find(x => x.t === title0);
  check(`${name}: il video di prima parte entro ${maxWait} ms dall'inizio dell'intro`, play0 != null && play0 <= maxWait, `${play0} ms`);
  check(`${name}: titolo a circa 5,7–6,4 s del video e «Premi un tasto» a 7,8 s, come prima`, atTitle && atTitle.old >= 5.4 && atTitle.old <= 6.8 && Math.abs((ready0 - play0) - 7800) < 900, `titolo a ${atTitle?.old} s del video, pronto ${ready0 - play0} ms dopo la partenza`);
  if (r2 === '404'){ await p.waitForTimeout(600); await p.screenshot({ path: path.join(SHOTS, 'intro-ripiego-pronto.png') }); }
  await p.keyboard.press('Space'); await p.waitForTimeout(1200);
  const l = await lobby(p);
  check(`${name}: un tasto → menu principale`, !l.intro && l.menu === 'menu' && l.seen === '1' && l.video === 'intro', JSON.stringify(l));
  check(`${name}: nessun errore`, !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}

/* ---------- E) un tasto durante il trailer ---------- */
if (want('E')){
  const g = await open({ r2: 'ok' }), p = g.p;
  await until(p, () => { const v = document.getElementById('intro-trailer'); return v && !v.paused && v.currentTime > 1.5; }, 20000);
  await p.keyboard.press('KeyA');
  await p.waitForTimeout(500);
  const s = await p.evaluate(() => { const el = document.getElementById('natpf-intro'), I = __natpfTennis.natpfUi.intro, v = document.getElementById('intro-trailer'); return { ready: I.ready, active: I.active, cls: el.className, title: getComputedStyle(el.querySelector('.intro-title')).opacity, start: getComputedStyle(document.getElementById('intro-start')).opacity, skip: getComputedStyle(document.getElementById('intro-skip')).display, tr: v ? +v.currentTime.toFixed(1) : null, lobbyStep: __natpfTennis.natpfUi.lobby.step }; });
  check('E: un tasto durante il trailer → subito il titolo e «Premi un tasto» (il menu non parte ancora)', s.ready && s.active && /is-ready/.test(s.cls) && s.title === '1' && +s.start > .5 && s.skip === 'none' && s.tr < 4, JSON.stringify(s));
  await p.screenshot({ path: path.join(SHOTS, 'intro-trailer-saltato.png') });
  await p.mouse.click(640, 360); await p.waitForTimeout(1200);
  const l = await lobby(p);
  check('E: un clic → menu principale; il trailer è tolto', !l.intro && l.menu === 'menu' && await p.evaluate(() => !document.getElementById('intro-trailer')), JSON.stringify(l));
  // «Rivedi l'intro» dalle Opzioni: di nuovo il trailer; «Salta ›» porta al titolo
  await p.evaluate(() => __natpfTennis.natpfUi.lobby.option('intro'));
  check('E: «Rivedi l\'intro» → di nuovo il trailer', await until(p, () => { const v = document.getElementById('intro-trailer'); return v && !v.paused && v.currentTime > .4 && /is-trailer/.test(document.getElementById('natpf-intro').className); }, 15000));
  await p.click('#intro-skip'); await p.waitForTimeout(300);
  check('E: «Salta ›» → titolo', await p.evaluate(() => __natpfTennis.natpfUi.intro.ready && /is-ready/.test(document.getElementById('natpf-intro').className)));
  await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  check('E: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}

/* ---------- F) ?intro=0 · G) ?trailer=0 ---------- */
if (want('F')){
  const g = await open({ query: '?intro=0', r2: 'ok' }), p = g.p;
  await p.waitForFunction(() => __natpfTennis.natpfUi?.lobby?.visible, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const s = await p.evaluate(() => ({ hidden: document.getElementById('natpf-intro').classList.contains('hidden'), mode: __natpfTennis.natpfUi.intro.mode, trailer: !!document.getElementById('intro-trailer'), old: document.getElementById('intro-video').paused, step: __natpfTennis.natpfUi.lobby.step }));
  check('F: ?intro=0 → niente intro, menu subito, nessuna richiesta del trailer', s.hidden && s.mode === 'off' && !s.trailer && s.old && s.step === 'menu' && g.reqs.r2 === 0 && g.reqs.local === 0, `${JSON.stringify(s)} ${JSON.stringify(g.reqs)}`);
  check('F: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
  const h = await open({ query: '?trailer=0', r2: 'ok' });
  check('G: ?trailer=0 → il video di prima', await until(h.p, () => { const v = document.getElementById('intro-video'); return v && !v.paused && v.currentTime > .5; }, 20000));
  const T = await tl(h.p);
  check('G: nessuna richiesta del trailer, video di prima partito subito', h.reqs.r2 === 0 && h.reqs.local === 0 && !await h.p.evaluate(() => !!document.getElementById('intro-trailer')) && first(T, x => x.oldPlaying) < 2500, `${JSON.stringify(h.reqs)}, partito dopo ${first(T, x => x.oldPlaying)} ms dall'inizio dell'intro`);
  await h.ctx.close();
}

/* ---------- H) programma Windows: trailer dal file locale ---------- */
if (want('H')){
  const DESKTOP = () => { window.natpfDesktop = { shell: 'electron', version: 2, isFullScreen: async () => false, setFullScreen: async () => false, toggleFullScreen: async () => false, onFullScreenChange: () => () => {} }; };
  const g = await open({ r2: 'abort', local: 'ok', init: DESKTOP }), p = g.p;
  check('H: nel programma Windows il trailer parte dal file locale (rete assente)', await until(p, () => { const v = document.getElementById('intro-trailer'); return v && !v.paused && v.currentTime > .5; }, 20000));
  const s = await p.evaluate(() => ({ src: document.getElementById('intro-trailer')?.currentSrc.replace(location.origin, ''), cls: document.getElementById('natpf-intro').className }));
  check('H: indirizzo ./media/trailer-<impronta>.mp4 dello stesso server, nessuna richiesta al bucket', s.src === `/media/${FILE}` && /is-trailer/.test(s.cls) && g.reqs.r2 === 0 && g.reqs.local >= 1, `${JSON.stringify(s)} ${JSON.stringify(g.reqs)}`);
  await g.ctx.close();
  // programma senza il file (installer vecchio): ripiego sul video di prima
  const h = await open({ r2: 'abort', local: '404', init: DESKTOP });
  check('H2: programma senza il file del trailer → video di prima', await until(h.p, () => { const v = document.getElementById('intro-video'); return v && !v.paused && v.currentTime > .5 && !document.getElementById('intro-trailer'); }, 20000) && h.reqs.r2 === 0, JSON.stringify(h.reqs));
  await h.ctx.close();
}

/* ---------- I) riproduzione rifiutata dal browser: resta l'immagine finale ---------- */
if (want('I')){
  const g = await open({ r2: 'ok', init: () => { HTMLMediaElement.prototype.play = function(){ return Promise.reject(new DOMException('play() rifiutato', 'NotAllowedError')); }; } }), p = g.p;
  check('I: riproduzione rifiutata → immagine finale con il titolo (classe no-video)', await until(p, () => /no-video/.test(document.getElementById('natpf-intro').className) && +getComputedStyle(document.querySelector('.intro-title')).opacity > .9, 15000));
  const s = await p.evaluate(() => { const el = document.getElementById('natpf-intro'), img = el.querySelector('.intro-still'); return { cls: el.className, still: img.getAttribute('src'), opacity: getComputedStyle(img).opacity, trailer: !!document.getElementById('intro-trailer'), old: getComputedStyle(document.getElementById('intro-video')).display }; });
  check('I: immagine finale di prima, nessun video in vista', s.still === './media/intro-fine.webp' && s.opacity === '1' && !s.trailer && s.old === 'none' && !/is-trailer/.test(s.cls), JSON.stringify(s));
  await p.screenshot({ path: path.join(SHOTS, 'intro-senza-video.png') });
  check('I: «Premi un tasto» e poi il menu', await until(p, () => __natpfTennis.natpfUi.intro.ready, 15000));
  await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  const l = await lobby(p);
  check('I: un tasto → menu principale', !l.intro && l.menu === 'menu' && l.video == null, JSON.stringify(l));
  check('I: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}

/* ---------- J) rete lenta verso il trailer (revisione): parte solo se arriva in fondo senza fermarsi ---------- */
if (want('J')){
  // da un altro computer (?lan=1 senza il programma): il file dello stesso server con la regola del web, poi il bucket
  // (qui la rete è bloccata: errore subito), poi il video di prima
  const run = async (kbps, shot = null) => {
    RATE = kbps*1000;
    const g = await open({ query: '?lan=1', r2: 'abort', local: 'slow' }), p = g.p;
    // schermata mentre il trailer è fermo in attesa (si vede il primo fotogramma del video di prima)
    if (shot && await until(p, () => { const v = document.getElementById('intro-trailer'); return v && v.paused && v.readyState >= 2; }, 8000)) await p.screenshot({ path: path.join(SHOTS, shot) });
    await until(p, () => __natpfTennis.natpfUi.intro.ready, 30000); await p.waitForTimeout(400);
    const T = await tl(p), ev = await p.evaluate(() => __ev), go = first(T, x => /is-trailer/.test(x.cls)), end = T.at(-1);
    const before = T.filter(x => x.tr != null && (go == null || x.t < go));              // il trailer nella pagina prima di partire (o sempre, se non parte)
    return { g, p, T, ev, go, end, old: first(T, x => x.oldPlaying), title: first(T, x => x.title > .5), ready: first(T, x => x.ready), before,
      stops: go == null ? null : ev.filter(e => e[1] === 'waiting' && e[0] > go + 150).length, held: ev.some(e => e[1] === 'pause' && e[2] < .2 && (go == null || e[0] < go)) };
  };
  // 100 kB/s: il trailer ne chiede in media 226 → non parte
  const a = await run(100, 'intro-rete-lenta-attesa.png');
  check('J: a 100 kB/s il trailer non parte: parte il video di prima', a.go == null && a.old != null && a.end.video === 'intro' && !/is-trailer|no-video/.test(a.end.cls), JSON.stringify({ go: a.go, old: a.old, end: a.end.cls, video: a.end.video }));
  check('J: a 100 kB/s il trailer ha cominciato a girare con i primi dati, è stato rimesso fermo all\'inizio e non si è mai visto', a.held && a.before.length > 3 && a.before.every(x => x.tr <= .15 && x.trOp === 0), `eventi ${JSON.stringify(a.ev.slice(0, 8))}; massimo ${Math.max(0, ...a.before.map(x => x.tr))} s, opacità massima ${Math.max(0, ...a.before.map(x => x.trOp))}`);
  // 2,5 s di pagina libera: il tempo in cui il gioco che si avvia tiene occupata la pagina non conta (su una macchina
  // carica l'avvio dura anche 3 s), quindi il tempo si misura da quando il trailer è stato rimesso fermo (pagina libera)
  const heldAt = a.ev.find(e => e[1] === 'pause')?.[0] ?? 0;
  check('J: a 100 kB/s il video di prima parte entro 3,3 s da quando il trailer è fermo in attesa (2,5 s di pagina libera) e 8 s dall\'inizio, con i tempi di prima', a.old - heldAt <= 3300 && a.old <= 8000 && Math.abs((a.ready - a.old) - 7800) < 900 && a.end.still === './media/intro-fine.webp' && a.end.shift === '0ms', `video di prima a ${a.old} ms (${a.old - heldAt} ms dopo che il trailer è stato fermato), «Premi un tasto» ${a.ready - a.old} ms dopo`);
  await a.p.keyboard.press('Enter'); await a.p.waitForTimeout(1200);
  const la = await lobby(a.p);
  check('J: a 100 kB/s un tasto → menu principale', !la.intro && la.menu === 'menu' && la.video === 'intro', JSON.stringify(la));
  check('J: a 100 kB/s nessun errore', !a.g.errs.length, a.g.errs.join(' | ').slice(0, 300));
  await a.g.ctx.close();
  // 1,5 MB/s: più lento di una rete normale ma abbastanza → parte e non si ferma mai
  const b = await run(1500);
  check('J: a 1,5 MB/s il trailer parte e arriva in fondo senza fermarsi', b.go != null && b.stops === 0 && b.end.video === 'trailer' && b.end.tr > 9.9 && b.old == null, JSON.stringify({ go: b.go, stops: b.stops, tr: b.end.tr, ev: b.ev.filter(e => e[1] !== 'canplaythrough').slice(0, 10) }));
  const atTitle = b.T.find(x => x.t === b.title);
  check('J: a 1,5 MB/s il titolo entra sull\'ultima inquadratura e «Premi un tasto» 10,6 s dopo la partenza', atTitle && atTitle.tr >= 8.2 && atTitle.tr <= 9.6 && Math.abs((b.ready - b.go) - 10600) < 900 && b.before.every(x => x.trOp === 0), `titolo a ${atTitle?.tr} s del trailer, pronto ${b.ready - b.go} ms dopo la partenza`);
  await b.g.ctx.close();
  // 800 kB/s: vicino al limite del tempo concesso (2,5 s: servono 6 s di filmato scaricati, 1,35 MB): parte dopo
  // un'attesa oppure lascia il posto al video di prima; in tutti e due i casi nessuna fermata
  const c = await run(800);
  check('J: a 800 kB/s il trailer parte senza fermate, oppure parte il video di prima', c.go != null ? (c.stops === 0 && c.end.video === 'trailer' && c.end.tr > 9.9) : (c.old != null && c.end.video === 'intro'), c.go != null ? `trailer partito a ${c.go} ms (rimesso fermo prima: ${c.held}), fermate ${c.stops}` : `video di prima a ${c.old} ms`);
  check('J: nessun errore', !b.g.errs.length && !c.g.errs.length, [...b.g.errs, ...c.g.errs].join(' | ').slice(0, 300));
  await c.g.ctx.close();
}

/* ---------- K) trailer tronco: errore a metà → immagine finale, titolo e subito «Premi un tasto» ---------- */
if (want('K')){
  const g = await open({ r2: 'trunc' }), p = g.p;
  check('K: il trailer tronco parte', await until(p, () => /is-trailer/.test(document.getElementById('natpf-intro').className), 20000));
  check('K: all\'errore resta l\'immagine finale con il titolo', await until(p, () => /no-video/.test(document.getElementById('natpf-intro').className), 20000));
  await p.waitForTimeout(700);
  const T = await tl(p), err = first(T, x => /no-video/.test(x.cls)), ready = first(T, x => x.ready), go = first(T, x => /is-trailer/.test(x.cls)), end = T.at(-1);
  check('K: «Premi un tasto» subito dopo l\'errore, senza aspettare la fine del tempo dell\'intro', err != null && ready != null && ready - err <= 300 && ready - go < 9000 && end.still === './media/intro-fine.webp' && end.video == null && end.tr == null, `errore ${err - go} ms dopo la partenza, «Premi un tasto» ${ready - err} ms dopo l'errore`);
  await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  const l = await lobby(p);
  check('K: un tasto → menu principale', !l.intro && l.menu === 'menu' && l.video == null, JSON.stringify(l));
  check('K: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}

/* ---------- L) ?lan=1 da un altro computer: il trailer dello stesso server, poi il bucket ---------- */
if (want('L')){
  const g = await open({ query: '?lan=1', r2: 'abort', local: 'ok' }), p = g.p;
  check('L: ?lan=1 senza il programma: il trailer parte dal file dello stesso server', await until(p, () => { const v = document.getElementById('intro-trailer'); return v && !v.paused && v.currentTime > .5 && /is-trailer/.test(document.getElementById('natpf-intro').className); }, 20000));
  const s = await p.evaluate(() => document.getElementById('intro-trailer')?.currentSrc.replace(location.origin, ''));
  check('L: indirizzo ./media/trailer-<impronta>.mp4, nessuna richiesta al bucket', s === `/media/${FILE}` && g.reqs.r2 === 0 && g.reqs.local >= 1, `${s} ${JSON.stringify(g.reqs)}`);
  await g.ctx.close();
  const h = await open({ query: '?lan=1', r2: 'ok', local: '404' });
  check('L2: il server non ha il trailer → dal bucket', await until(h.p, () => { const v = document.getElementById('intro-trailer'); return v && !v.paused && v.currentTime > .5 && v.currentSrc.startsWith('https://pub-') && /is-trailer/.test(document.getElementById('natpf-intro').className); }, 20000) && h.reqs.local >= 1 && h.reqs.r2 >= 1, JSON.stringify(h.reqs));
  check('L2: nessun errore', !h.errs.length, h.errs.join(' | ').slice(0, 300));
  await h.ctx.close();
  const k = await open({ query: '?lan=1', r2: 'abort', local: '404' });
  check('L3: né il server né il bucket → video di prima', await until(k.p, () => { const v = document.getElementById('intro-video'); return v && !v.paused && v.currentTime > .5 && !document.getElementById('intro-trailer'); }, 20000), JSON.stringify(k.reqs));
  await k.ctx.close();
}
/* ---------- M) programma Windows con avvio lento (B26): parte il trailer ---------- */
if (want('M')){
  const DESKTOP = () => { window.natpfDesktop = { shell: 'electron', version: 2, isFullScreen: async () => false, setFullScreen: async () => false, toggleFullScreen: async () => false, onFullScreenChange: () => () => {} }; };
  const run = async (o, wait = 60000) => {
    const g = await open(o), p = g.p;
    await until(p, () => /mode-full/.test(document.getElementById('natpf-intro').className), wait); await p.waitForTimeout(1200);
    const T = await tl(p), trace = await p.evaluate(() => __natpfTennis.natpfUi.intro.trace);
    return { g, p, T, trace, go: first(T, x => /is-trailer/.test(x.cls)), old: first(T, x => x.oldPlaying), end: T.at(-1), asked: trace.find(r => r[1] === 'trailer richiesto'), started: trace.find(r => r[1] === 'trailer partito'), dropped: trace.find(r => /^trailer scartato/.test(r[1])) };
  };
  // CPU rallentata 6 volte (il gioco che si avvia blocca la pagina per secondi), file locale pronto
  const a = await run({ r2: 'abort', local: 'ok', init: DESKTOP, cpu: 6 });
  check('M: programma Windows, CPU rallentata 6 volte → parte il trailer, il video di prima non parte mai', a.go != null && a.old == null && a.end.video === 'trailer' && a.started && !a.dropped && a.g.reqs.r2 === 0, JSON.stringify({ go: a.go, old: a.old, cronaca: a.trace.map(r => [r[0], r[1]]) }));
  check('M: nel programma l\'attesa è di 8 s e il file è «locale» (parte appena può partire)', a.asked?.[2]?.attesa === 8000 && a.asked[2].locale === true && a.asked[2].src === `./media/${FILE}`, JSON.stringify(a.asked));
  await a.g.ctx.close();
  // il primo dato del file arriva dopo 14 passi della pagina (3,5 s liberi: scheda grafica occupata, disco lento): con
  // l'attesa di prima (1,5 s, 6 passi) partiva il video di prima
  const b = await run({ r2: 'abort', local: 'late:14', init: DESKTOP, cpu: 4 });
  check('M: programma Windows, primo fotogramma in ritardo di 3,5 s di pagina libera → parte lo stesso il trailer', b.go != null && b.old == null && b.end.video === 'trailer' && b.started && !b.dropped && b.started[0] >= 3400, JSON.stringify({ go: b.go, old: b.old, cronaca: b.trace.map(r => [r[0], r[1]]) }));
  check('M: trailer in riproduzione, titolo spostato sull\'ultima inquadratura', await b.p.evaluate(() => { const v = document.getElementById('intro-trailer'); return !!v && !v.paused && v.currentTime > .3 && document.getElementById('natpf-intro').style.getPropertyValue('--intro-shift') === '2800ms'; }));
  check('M: nessun errore', !a.g.errs.length && !b.g.errs.length, [...a.g.errs, ...b.g.errs].join(' | ').slice(0, 300));
  await b.g.ctx.close();
  // il file non risponde mai: il video di prima parte lo stesso, ma solo dopo 8 s di pagina libera
  const c = await run({ r2: 'abort', local: 'hang', init: DESKTOP }, 40000);
  check('M: programma Windows, file che non risponde mai → video di prima solo dopo 8 s', c.go == null && c.old != null && c.end.video === 'intro' && c.dropped && /tempo scaduto/.test(c.dropped[1]) && c.dropped[0] >= 8000 && c.dropped[0] < 20000, JSON.stringify({ old: c.old, cronaca: c.trace.map(r => [r[0], r[1]]) }));
  await c.g.ctx.close();
  // sul web: CPU rallentata 6 volte, bucket veloce → il blocco della pagina all'avvio non consuma l'attesa
  const d = await run({ r2: 'ok', cpu: 6 });
  check('M: web, CPU rallentata 6 volte e bucket veloce → parte il trailer', d.go != null && d.old == null && d.end.video === 'trailer' && d.asked?.[2]?.attesa === 2500 && d.asked[2].locale === false && !d.dropped, JSON.stringify({ go: d.go, old: d.old, cronaca: d.trace.map(r => [r[0], r[1]]) }));
  await d.g.ctx.close();
}
await B.close(); slow.close();
summary();
process.exit(process.exitCode || 0);
