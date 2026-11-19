// NATPF B72 (richiesta dell'utente del 19/11): «rendere lampeggiante il box che dice che devi battere (al servizio) +
// aggiungi un alone pulsante attorno allo schermo (in singolo e in doppio nell'area specifica del player che deve servire)
// se passano 3 secondi». Gioco vero (vite), personaggi Classici, chi gioca con il mouse. Prova:
//   • contro la CPU, batte chi gioca: la casella «Al servizio» lampeggia (classe serve-blink, animazione natpf-serve-blink da
//     1 s in corso) subito; alone assente a 2 s, presente a 3,2 s di gioco fermi, attorno a tutta l'area, primo figlio di
//     #hud-root (sotto tabellone e scritte), senza clic, animato (natpf-serve-halo, 1 s); al lancio tutto via;
//   • batte la CPU: casella ferma (nessuna animazione), niente alone anche dopo 4 s;
//   • pausa (menu della pausa): via subito; alla ripresa il lampeggio torna e l'alone di nuovo solo dopo 3 s;
//   • menu (inquadratura ferma): via;
//   • doppio contro la CPU (una vista): come il singolo;
//   • computer del Player 2 della sfida tra due computer (stesso motore con il ruolo del Player 2, senza rete): batte lui →
//     lampeggio e alone; batte l'host → niente;
//   • stesso schermo: lampeggia solo la casella della metà di chi batte, l'alone solo attorno alla sua metà (P1 sinistra, P2
//     destra), per il P1 e per il P2;
//   • area di un ledwall (?area=0,0,720,720 in una finestra 1920×1080): l'alone sta nell'area, non nella finestra;
//   • movimento ridotto (impostazione del sistema): lampeggio e alone più lenti (2,4 s), non spenti;
//   • con il ciclo vero del gioco (1280×720, senza il disegno 3D): l'alone arriva da solo quando il tempo fermo passa 3 s,
//     mai prima, dopo almeno 3 s veri.
// Schermate in SP/servizio-alone (deviceScaleFactor 1); per le schermate l'animazione si ferma al lampo (casella) e al
// massimo (alone), così si vede com'è al suo punto più visibile.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-servizio-alone.mjs        (porta GAME_PORT, di base 3174)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3174), OUT = path.join(SP, 'servizio-alone'); mkdirSync(OUT, { recursive: true });
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const B = await launch();
const fmt = o => JSON.stringify(o);

async function game({ w = 1920, h = 1080, query = 'intro=0', reducedMotion = 'no-preference' } = {}){
  const ctx = await B.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.addInitScript(() => {
    try {
      localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.setItem('natpf-tennis.personaggi', 'sempre');
      if (localStorage.getItem('natpf-tennis.salvaschermo') == null) localStorage.setItem('natpf-tennis.salvaschermo', '0');
      if (localStorage.getItem('natpf-tennis.classificaFine') == null) localStorage.setItem('natpf-tennis.classificaFine', '0');
    } catch {}
  });
  // (a macchina carica il caricamento può non arrivare: si riprova fino a tre volte, come natpf-chi-serve)
  for (let k = 0; ; k++){
    const ok = await p.goto(`http://127.0.0.1:${GAME_PORT}/?${query}`, { waitUntil: 'domcontentloaded', timeout: 120000 }).then(() => true, () => false)
      && await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.serveCoach, null, { timeout: 120000 }).then(() => true, () => false);
    if (ok) break;
    if (k >= 2) throw new Error('gioco non avviato');
    errs.length = 0;
  }
  await p.waitForTimeout(600);
  return { ctx, p, errs };
}

// in campo al servizio (come dopo «Gioca» nel menu, senza il menu). mode: 'cpu' | 'doppio' | 'schermo' | 'p2'. Ciclo del
// gioco fermo (passi a mano: tempi esatti) salvo live
const atServe = (p, { mode = 'cpu', server = 'player', live = false } = {}) => p.evaluate(({ mode, server, live }) => {
  const E = __natpfTennis, ui = E.natpfUi;
  ui.onboarding?.close?.(); E.hud.hideTitleModal(); ui.lobby.el.classList.add('hidden');
  if (ui.pause?.isOpen) ui.pause.close();
  E.playerRole = 'p1'; E.isMultiplayer = false;
  E.autoPlayMode = false; E.userHasInteracted = true;
  if (mode === 'schermo'){ E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; if (!E.natpfSplit.active) E.startSplit(); }
  else if (E.natpfSplit.active) E.endSplit();
  E.setMatchFormat(mode === 'doppio' ? 'doubles' : 'singles');
  E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = false;
  // (computer del Player 2: il motore segue il ruolo; isMultiplayer ferma la CPU e il punteggio arriva dall'host)
  if (mode === 'p2'){ E.playerRole = 'p2'; E.isMultiplayer = true; }
  // (stesso schermo: le regole del 1v1, come startSplit; il Player 2 non batte da solo come la CPU)
  if (mode === 'schermo') E.isMultiplayer = true;
  E.score.server = server; E._setupPointServe?.({ showBanner: false }); E.hud.hideCenterBanner?.(); ui.onScore(E.score, E.matchConfig.gamesToWin);
  if (mode === 'p2') E._snapCameraImmediate?.();
  // (la CPU batterebbe da sola dopo 1,25 s: qui resta ferma, come in natpf-chi-serve)
  E.persistentStateLock = server === 'opponent' && mode !== 'schermo' && mode !== 'p2';
  E.natpfPaused = false;
  if (!live && !E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  if (live && E.__frame0){ E._natpfFrame = E.__frame0; delete E.__frame0; }
  // il coach riparte da zero (tempo fermo)
  ui.serveCoach.state = { ...ui.serveCoach.state, idle: 0, phase: null };
  if (!live){ E.update(1/60); E.render(); E.update(1/60); }
  return { phase: E.phase, server: E.score.server, role: E.playerRole, split: !!E.natpfSplit.active, doubles: !!E.isDoubles };
}, { mode, server, live });
// passi del gioco a mano (s di gioco), poi un disegno (le caselle dello stesso schermo le mette a posto il disegno)
const advance = (p, s) => p.evaluate(s => { const E = __natpfTennis; for (let i = 0; i < Math.round(s*60); i++) E.update(1/60); E.render(); E.update(1/60); return { phase: E.phase, idle: +E.natpfUi.serveCoach.state.idle.toFixed(3) }; }, s);
// stato sulla pagina: caselle che lampeggiano (e animazione in corso), alone (dove, animazione, posto nell'HUD)
const look = p => p.evaluate(() => {
  const E = __natpfTennis, r = el => { const b = el.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) }; };
  const tags = {};
  for (const id of ['server-tag', 'server-tag-p1', 'server-tag-p2']){
    const el = document.getElementById(id); if (!el) continue;
    const cs = getComputedStyle(el), an = el.getAnimations().find(a => a.animationName === 'natpf-serve-blink' || a.animationName === 'natpf-serve-blink-soft');
    tags[id] = { shown: !el.classList.contains('hidden') && cs.display !== 'none', blink: el.classList.contains('serve-blink'), anim: cs.animationName, dur: cs.animationDuration, running: an?.playState === 'running', bg: cs.backgroundColor };
  }
  const h = document.getElementById('natpf-serve-halo'), root = document.getElementById('hud-root');
  let halo = null;
  if (h){
    const cs = getComputedStyle(h), an = h.getAnimations()[0];
    halo = { shown: !h.classList.contains('hidden') && cs.display !== 'none', rect: r(h), half: h.dataset.half || null, anim: cs.animationName, dur: cs.animationDuration, running: an?.playState === 'running',
      first: root?.firstElementChild === h, pe: cs.pointerEvents, z: cs.zIndex, vis: getComputedStyle(root).visibility, shadow: cs.boxShadow };
  }
  return { phase: E.phase, idle: +E.natpfUi.serveCoach.state.idle.toFixed(3), paused: !!E.natpfPaused, tags, halo, W: document.body.clientWidth, H: document.body.clientHeight };
});
const blinking = (L, id) => !!L.tags[id]?.blink && /natpf-serve-blink/.test(L.tags[id].anim) && L.tags[id].running;
const blinkIds = L => Object.keys(L.tags).filter(id => L.tags[id].blink);
const still = L => Object.values(L.tags).every(t => !t.blink && t.anim === 'none');
const haloOn = L => !!L.halo?.shown && /natpf-serve-halo/.test(L.halo.anim) && L.halo.running && L.halo.first && L.halo.pe === 'none' && L.halo.vis === 'visible';
const haloOff = L => !L.halo || !L.halo.shown;
// per le schermate: animazioni ferme al punto più visibile (lampo della casella a 140 ms, alone al massimo a 500 ms)
const freeze = p => p.evaluate(() => {
  for (const el of [...document.querySelectorAll('.serve-blink'), document.getElementById('natpf-serve-halo')].filter(Boolean))
    for (const a of el.getAnimations()){ a.pause(); a.currentTime = /halo/.test(a.animationName) ? 500 : 140; }
});
const thaw = p => p.evaluate(() => { for (const el of [...document.querySelectorAll('.serve-blink'), document.getElementById('natpf-serve-halo')].filter(Boolean)) for (const a of el.getAnimations()) a.play(); });
const shot = async (p, file, clip) => { await freeze(p); await p.screenshot({ path: path.join(OUT, file), ...(clip ? { clip } : {}) }); await thaw(p); };

/* ---------- 1920×1080: contro la CPU, pausa, menu, doppio, computer del Player 2, stesso schermo ---------- */
{
  const g = await game();
  const { p } = g;
  // contro la CPU, batte chi gioca
  let s = await atServe(p, { mode: 'cpu', server: 'player' });
  let L = await look(p);
  check('contro la CPU, batte chi gioca: la casella «Al servizio» lampeggia subito (1 s), fondo giallo com\'era; niente alone', s.phase === 'SERVE_STANCE' && blinking(L, 'server-tag') && L.tags['server-tag'].shown && L.tags['server-tag'].dur === '1s' && L.tags['server-tag'].bg === 'rgb(232, 255, 58)' && haloOff(L), fmt({ s, L }));
  await shot(p, 'alone-1-singolo-subito-1920.png');
  let a = await advance(p, 2); L = await look(p);
  check('   a 2 s fermo al servizio: ancora niente alone', a.phase === 'SERVE_STANCE' && a.idle >= 1.9 && a.idle < 3 && haloOff(L) && blinking(L, 'server-tag'), fmt({ a, halo: L.halo }));
  a = await advance(p, 1.2); L = await look(p);
  check('   a 3,2 s: l\'alone giallo che pulsa (1 s) attorno a tutta l\'area, primo figlio di #hud-root, senza clic', a.idle >= 3 && haloOn(L) && L.halo.half === null && L.halo.dur === '1s' && L.halo.rect.l === 0 && L.halo.rect.t === 0 && L.halo.rect.r === L.W && L.halo.rect.b === L.H && blinking(L, 'server-tag'), fmt({ a, halo: L.halo, W: L.W, H: L.H }));
  // sotto tabellone e scritte: l'ordine nella pagina (stesso contesto: #hud-root) e nessuno z-index sopra di loro
  const order = await p.evaluate(() => {
    const h = document.getElementById('natpf-serve-halo'), F = Node.DOCUMENT_POSITION_FOLLOWING;
    return ['top-hud-bar', 'natpf-scoreboard', 'natpf-scoreboard-p2', 'world-labels-layer', 'natpf-serve-coach', 'center-banner-layer'].map(id => { const el = document.getElementById(id); return { id, after: !!el && !!(h.compareDocumentPosition(el) & F) }; });
  });
  check('   l\'alone sta sotto tabellone, caselle e scritte (prima di loro in #hud-root, z-index auto)', order.every(o => o.after) && L.halo.z === 'auto', fmt({ order, z: L.halo.z }));
  await shot(p, 'alone-2-singolo-3s-1920.png');
  // lancio: tutto via
  const tossed = await p.evaluate(() => { const E = __natpfTennis; E._handleUserTossInput({}); E.update(1/60); return E.phase; });
  L = await look(p);
  check('   al lancio (SERVE_TOSS): casella ferma, alone via subito', tossed === 'SERVE_TOSS' && still(L) && haloOff(L), fmt({ tossed, L }));

  // pausa: via subito; alla ripresa il lampeggio torna e l'alone solo dopo altri 3 s
  await atServe(p, { mode: 'cpu', server: 'player' }); await advance(p, 3.3);
  L = await look(p);
  const before = haloOn(L);
  await p.evaluate(() => __natpfTennis.natpfUi.pause.open());
  L = await look(p);
  check('pausa: con l\'alone acceso, il menu della pausa lo toglie subito e la casella smette di lampeggiare; tempo fermo a zero', before && L.paused && haloOff(L) && still(L) && L.idle === 0, fmt({ before, L }));
  await p.screenshot({ path: path.join(OUT, 'alone-3-pausa-1920.png') });
  await p.evaluate(() => __natpfTennis.natpfUi.pause.close());
  a = await advance(p, .5); L = await look(p);
  check('   ripresa: la casella lampeggia di nuovo, l\'alone non torna subito', !L.paused && blinking(L, 'server-tag') && haloOff(L) && a.idle < 1, fmt({ a, L }));
  a = await advance(p, 2.8); L = await look(p);
  check('   ripresa: l\'alone torna dopo 3 s fermi', haloOn(L) && a.idle >= 3, fmt({ a, halo: L.halo }));

  // menu («Torna al menu» della pausa, come chi gioca): via
  const menu = await p.evaluate(() => { const E = __natpfTennis, ui = E.natpfUi; ui.backToMenu(); ui.tick(1/60); return { lobby: ui.lobby.visible, phase: E.phase }; });
  L = await look(p);
  check('menu aperto («Torna al menu»): niente lampeggio, niente alone', menu.lobby && still(L) && haloOff(L), fmt({ menu, L }));

  // batte la CPU: niente, anche dopo 4 s
  s = await atServe(p, { mode: 'cpu', server: 'opponent' }); a = await advance(p, 4); L = await look(p);
  check('contro la CPU, batte la CPU (ferma 4 s): casella «Al servizio» ferma, niente alone', s.server === 'opponent' && a.phase === 'SERVE_STANCE' && L.tags['server-tag'].shown && still(L) && haloOff(L), fmt({ s, a, L }));
  await shot(p, 'alone-4-batte-la-cpu-1920.png');

  // doppio contro la CPU (una vista)
  s = await atServe(p, { mode: 'doppio', server: 'player' }); a = await advance(p, 3.2); L = await look(p);
  check('doppio contro la CPU, batte chi gioca: casella che lampeggia e, dopo 3 s, alone attorno a tutta l\'area', s.doubles && blinking(L, 'server-tag') && haloOn(L) && L.halo.half === null && L.halo.rect.r === L.W, fmt({ s, a, L }));
  await shot(p, 'alone-5-doppio-1920.png');
  s = await atServe(p, { mode: 'doppio', server: 'opponent' }); a = await advance(p, 3.5); L = await look(p);
  check('   doppio, batte la squadra della CPU: niente', s.doubles && still(L) && haloOff(L), fmt({ s, a, L }));
  await p.evaluate(() => __natpfTennis.setMatchFormat('singles'));

  // computer del Player 2 della sfida tra due computer
  s = await atServe(p, { mode: 'p2', server: 'opponent' }); a = await advance(p, 3.2); L = await look(p);
  check('sfida tra due computer, computer del Player 2: batte lui → casella che lampeggia e alone dopo 3 s', s.role === 'p2' && blinking(L, 'server-tag') && haloOn(L) && L.halo.half === null, fmt({ s, a, L }));
  await shot(p, 'alone-6-computer-p2-batte-lui-1920.png');
  s = await atServe(p, { mode: 'p2', server: 'player' }); a = await advance(p, 3.5); L = await look(p);
  check('   computer del Player 2, batte l\'host: casella ferma, niente alone', s.role === 'p2' && still(L) && haloOff(L), fmt({ s, a, L }));
  await p.evaluate(() => { const E = __natpfTennis; E.playerRole = 'p1'; E.isMultiplayer = false; });

  // stesso schermo: la metà di chi batte
  for (const [server, half, other] of [['player', 'p1', 'p2'], ['opponent', 'p2', 'p1']]){
    s = await atServe(p, { mode: 'schermo', server });
    a = await advance(p, 1); L = await look(p);
    const name = server === 'player' ? 'il Player 1 (Giulia, sinistra)' : 'il Player 2 (Marco, destra)';
    check(`stesso schermo, batte ${name}: lampeggia solo la casella della sua metà, l'altra è ferma; niente alone a 1 s`, s.split && blinkIds(L).join() === `server-tag-${half}` && blinking(L, `server-tag-${half}`) && L.tags[`server-tag-${other}`]?.shown && L.tags[`server-tag-${other}`].anim === 'none' && haloOff(L), fmt({ s, a, L }));
    a = await advance(p, 2.2); L = await look(p);
    const mid = L.W/2, R = L.halo?.rect;
    const inHalf = !!R && R.t === 0 && R.b === L.H && (half === 'p1' ? R.l === 0 && Math.abs(R.r - L.W*.498) <= 2 && R.r < mid : Math.abs(R.l - L.W*.502) <= 2 && R.r === L.W && R.l > mid);
    check(`   a 3,2 s: l'alone solo attorno alla metà di ${name}`, haloOn(L) && L.halo.half === half && inHalf, fmt({ a, halo: L.halo, W: L.W }));
    await shot(p, `alone-7-stesso-schermo-${half}-1920.png`);
  }
  // casella da vicino al lampo (per guardarla): la metà del P2
  const tagBox = await p.evaluate(() => { const b = document.getElementById('server-tag-p2').getBoundingClientRect(); return { x: Math.max(0, Math.round(b.left - 60)), y: Math.max(0, Math.round(b.top - 50)), width: Math.round(b.width + 220), height: Math.round(b.height + 100) }; });
  await shot(p, 'alone-8-casella-lampo-vicino.png', tagBox);
  await p.evaluate(() => { for (const a of document.getElementById('server-tag-p2').getAnimations()){ a.pause(); a.currentTime = 0; } });
  await p.screenshot({ path: path.join(OUT, 'alone-8-casella-ferma-vicino.png'), clip: tagBox });
  await thaw(p);
  check('1920×1080: nessun errore nella pagina', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}

/* ---------- area di un ledwall: ?area=0,0,720,720 in una finestra 1920×1080 ---------- */
{
  const g = await game({ query: 'intro=0&area=0,0,720,720' });
  const { p } = g;
  for (const mode of ['cpu', 'schermo']){
    await atServe(p, { mode, server: 'player' }); await advance(p, 3.2);
    const L = await look(p), R = L.halo?.rect;
    const ok = mode === 'cpu' ? !!R && R.l === 0 && R.t === 0 && R.r === 720 && R.b === 720 : !!R && R.l === 0 && R.t === 0 && Math.abs(R.r - 720*.498) <= 2 && R.b === 720;
    check(`area 720×720 del ledwall (${mode === 'cpu' ? 'contro la CPU' : 'stesso schermo, batte il P1'}): l'alone sta nell'area, non nella finestra 1920×1080`, L.W === 720 && L.H === 720 && haloOn(L) && ok, fmt({ W: L.W, H: L.H, halo: L.halo }));
    await shot(p, `alone-9-area-720-${mode}.png`, { x: 0, y: 0, width: 720, height: 720 });
  }
  check('area 720×720: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}

/* ---------- movimento ridotto: più lento, non spento ---------- */
{
  const g = await game({ w: 1280, h: 720, reducedMotion: 'reduce' });
  const { p } = g;
  await atServe(p, { mode: 'cpu', server: 'player' }); await advance(p, 3.2);
  const L = await look(p);
  check('movimento ridotto: casella e alone pulsano più lenti (2,4 s), non spenti', L.tags['server-tag'].blink && L.tags['server-tag'].anim === 'natpf-serve-blink-soft' && L.tags['server-tag'].dur === '2.4s' && L.tags['server-tag'].running && L.halo?.shown && L.halo.anim === 'natpf-serve-halo-soft' && L.halo.dur === '2.4s' && L.halo.running, fmt(L));
  await shot(p, 'alone-10-movimento-ridotto-1280.png');
  check('movimento ridotto: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}

/* ---------- ciclo vero del gioco (1280×720): l'alone arriva da solo dopo i 3 s ---------- */
// (il ciclo del gioco vero, rAF → _natpfFrame → update → coach; senza il disegno 3D, che con la grafica in software del banco
// costa secondi a fotogramma e farebbe avanzare il tempo di gioco di pochi decimi al secondo; si disegna per la schermata)
{
  const g = await game({ w: 1280, h: 720 });
  const { p } = g;
  await p.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  await atServe(p, { mode: 'cpu', server: 'player', live: true });
  await p.evaluate(() => {
    window.__aloneLog = [];
    const t0 = performance.now(), E = __natpfTennis;
    const id = setInterval(() => {
      const h = document.getElementById('natpf-serve-halo'), t = document.getElementById('server-tag');
      __aloneLog.push({ ms: Math.round(performance.now() - t0), idle: +E.natpfUi.serveCoach.state.idle.toFixed(3), halo: !!h && !h.classList.contains('hidden'), blink: !!t?.classList.contains('serve-blink'), phase: E.phase });
      if (__aloneLog.at(-1).halo) clearInterval(id);
    }, 50);
  });
  const came = await p.waitForFunction(() => !!window.__aloneLog?.at(-1)?.halo, null, { timeout: 90000, polling: 200 }).then(() => true, () => false);
  const log = await p.evaluate(() => __aloneLog), first = log.find(x => x.halo), early = log.filter(x => x.halo && x.idle < 3);
  const before = log.filter(x => !x.halo), blinkAll = before.every(x => x.blink && x.phase === 'SERVE_STANCE');
  check('ciclo vero: la casella lampeggia da subito, l\'alone arriva da solo quando il tempo fermo passa 3 s (mai prima), dopo almeno 3 s veri',
    came && !!first && !early.length && blinkAll && before.length > 0 && first.idle >= 3 && first.idle < 3.5 && first.ms >= 2900 && first.blink,
    fmt({ campioni: log.length, primo: log[0], ultimoSenza: before.at(-1), primoCon: first, prima: early.length }));
  await p.evaluate(() => __natpfTennis.__render());
  await shot(p, 'alone-11-ciclo-vero-1280.png');
  check('ciclo vero: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}

await B.close(); stop();
summary();
setTimeout(() => process.exit(), 300);
