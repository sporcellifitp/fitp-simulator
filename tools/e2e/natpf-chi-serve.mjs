// NATPF B37 (collaudo dell'utente del 13/11, punto 2): «quando uno deve battere, non basta mettergli "alza la mano"
// come testo. Evidenzialo con un selettore … o una zona colorata». B37.1 (13/11 sera, l'utente: «il triangolino in alto
// è orribile, meglio la casella tonda che usavi prima "al servizio"»): la gemma 3D sopra la testa non c'è più, torna la
// casella gialla tonda «Al servizio» del B35b. Partita vera (ciclo del gioco acceso), al servizio:
//   • la casella «Al servizio» (fondo giallo, scritta blu scura in corsivo maiuscolo, bordo scuro, angoli tondi) appena
//     sopra la testa di chi batte (sopra la sagoma vera del personaggio, non lontana), centrata su di lui, dentro lo schermo
//     (o la sua metà) e lontana dal tabellone: nella vista di gioco e, nello stesso schermo, in tutte e due le metà; con
//     «Classici» e con «Lob & Drop» (modelli 3D come nel programma), batte chi gioca o la CPU / il Player 1 o il Player 2;
//     anche vista dal computer del Player 2 della sfida tra due computer (stesso motore con il ruolo del Player 2, senza
//     rete) e, in prima persona, niente casella sopra di sé (come nel B35b);
//   • nessuna gemma nella scena (niente coni gialli o blu scuri);
//   • misura: 14 px a 1280×720 come nel B35b e nell'area stretta, più grande a 1920×1080 (ledwall);
//   • il riquadro di servizio a terra: nella metà di chi riceve, in diagonale rispetto a chi batte, in vista;
//   • quando la palla parte, casella e riquadro spariscono;
//   • costo del disegno con il riquadro acceso e spento (grafica in software del banco: il caso peggiore).
// Schermate in SP/chi-serve: 1920×1080, 1280×720 e un'area stretta (?area=0,0,720,720 in una finestra 1920×1080).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-chi-serve.mjs        (porta 3159)
//   COSTO=1: solo il costo del disegno (Lob & Drop contro la CPU)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3159), OUT = path.join(SP, 'chi-serve'); mkdirSync(OUT, { recursive: true });
const KEY = 'natpf-tennis.personaggi';
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const B = await launch();

async function game({ cast, w = 1920, h = 1080, query = 'intro=0' }){
  const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.addInitScript(({ KEY, cast }) => {
    try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.setItem(KEY, cast); } catch {}
  }, { KEY, cast });
  // (a macchina carica il caricamento può non arrivare: si riprova fino a tre volte, come natpf-lob-drop)
  for (let k = 0; ; k++){
    const ok = await p.goto(`http://127.0.0.1:${GAME_PORT}/?${query}${cast === 'lobdrop' ? '&mascotte=3d' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 }).then(() => true, () => false)
      && await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.serveMark, null, { timeout: 120000 }).then(() => true, () => false);
    if (ok) break;
    if (k >= 2) throw new Error('gioco non avviato');
    errs.length = 0;
  }
  if (cast === 'lobdrop') await p.waitForFunction(() => __natpfTennis.player.natpfMascot3dOn && __natpfTennis.opponent.natpfMascot3dOn, null, { timeout: 90000 }).catch(() => errs.push('modelli 3D non montati'));
  await p.waitForTimeout(800);
  return { ctx, p, errs };
}
// al servizio: partita vera, poi ciclo fermo, 80 passi del gioco a mano (1,33 s: la cima di chi batte si affina per 1,2 s)
// con le matrici aggiornate come farebbe il disegno, e un solo disegno vero (con la grafica in software lo stesso schermo con
// i modelli 3D a 1920×1080 può durare secondi a fotogramma); misure a schermo della casella, della testa (anche la sagoma
// vera: tutti i vertici visibili proiettati), del tabellone e del riquadro. mode: 'cpu' (contro la CPU), 'schermo' (stesso
// schermo), 'p2' (computer del Player 2 della sfida tra due computer: stesso motore con il ruolo del Player 2, la camera dal
// suo lato; senza rete). view: 'first' per la prima persona (poi firstOff la toglie)
const atServe = (p, mode, server, view = null) => p.evaluate(async ({ mode, server, view }) => {
  const E = __natpfTennis, ui = E.natpfUi;
  ui.lobby.visible = false; E.hud.hideTitleModal?.(); ui.onboarding?.close?.();
  E.autoPlayMode = false; E.userHasInteracted = true;
  if (view){ E.__view0 ??= E.viewMode; E.setViewMode(view); }
  if (mode === 'schermo'){ E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; if (!E.natpfSplit.active) E.startSplit(); }
  E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = false;
  // (computer del Player 2: è il motore a seguire il ruolo; isMultiplayer ferma la CPU e il punteggio arriva dall'host)
  if (mode === 'p2'){ E.playerRole = 'p2'; E.isMultiplayer = true; }
  E.score.server = server; E._setupPointServe?.({ showBanner: false }); ui.onScore(E.score, E.matchConfig.gamesToWin);
  // (sul computer del Player 2 la camera sta già dal suo lato: qui ci va subito, senza l'inseguimento morbido dall'altro
  // fondo, che in 80 passi non arriva del tutto e lascerebbe la scritta, proiettata con la camera del passo prima, qualche
  // pixel più in là)
  if (mode === 'p2') E._snapCameraImmediate?.();
  // (la CPU batterebbe da sola dopo 1,25 s: con la grafica in software i fotogrammi sono lenti; qui si aspetta ferma)
  E.persistentStateLock = true;
  if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  for (let i = 0; i < 80; i++){ E.update(1/60); E.scene.updateMatrixWorld(); }
  E.render();
  const M = ui.serveMark, who = server === 'opponent' ? E.opponent : E.player, top = M.top(who), tagH = M.tagHeight(who), pt = M.tagPoint(who);
  const { viewport } = await import('/src/natpf/natpf_screen.js'), { splitViewports } = await import('/src/natpf/natpf_split.js');
  const V = viewport(), S = E.natpfSplit, halves = mode === 'schermo' ? splitViewports(S.size.x, S.size.y) : null;
  const views = mode === 'schermo' ? [[E.camera, halves.p1], [S.cam2, halves.p2]] : [[E.camera, { x: 0, y: 0, w: V.w, h: V.h }]];
  const proj = (cam, vp, x, y, z) => { const v = new E.player.pos.constructor(x, y, z).project(cam); return { x: Math.round(vp.x + (v.x*.5 + .5)*vp.w), y: Math.round(vp.y + (-v.y*.5 + .5)*vp.h), on: v.z >= -1 && v.z <= 1 }; };
  const r = M.state.rect;
  // sagoma vera di chi batte a schermo: il vertice visibile più in alto (anche quelli dei modelli con la pelle), in px
  const silhouette = (cam, vp) => {
    let top = Infinity; const v = new E.player.pos.constructor();
    who.root.traverseVisible(o => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      for (let k = 0, n = o.geometry.attributes.position.count; k < n; k++){ o.getVertexPosition(k, v); v.applyMatrix4(o.matrixWorld).project(cam); const y = vp.y + (-v.y*.5 + .5)*vp.h; if (y < top) top = y; }
    });
    return Math.round(top);
  };
  // gemma del B37: coni gialli (#E8FF3A) o blu scuri (#071233) nella scena; con il B37.1 nessuno
  let cones = 0;
  E.scene.traverse(o => { if (o.isMesh && o.geometry?.type === 'ConeGeometry' && [0xe8ff3a, 0x071233].includes(o.material?.color?.getHex?.())) cones++; });
  const out = { phase: E.phase, role: E.playerRole, fp: E._isFirstPersonActive(), state: { box: M.box.visible, server: M.state.server, gem: 'gem' in M, cones }, rect: r, top: +top.toFixed(2), tagH: +tagH.toFixed(2), looks: [E.player.natpfLook, E.opponent.natpfLook], V,
    views: views.map(([cam, vp]) => ({ vp, head: proj(cam, vp, pt.x, pt.y - (tagH - top), pt.z), anchor: proj(cam, vp, pt.x, pt.y, pt.z), feet: proj(cam, vp, who.pos.x, 0, who.pos.z), sil: silhouette(cam, vp),
      box: r ? [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]].map(([x, z]) => proj(cam, vp, x, 0, z)) : null })),
    serverPos: [+who.pos.x.toFixed(2), +who.pos.z.toFixed(2)] };
  // casella: riquadro a schermo e aspetto (colori, carattere, angoli, bordo)
  const tag = el => {
    if (!el || el.classList.contains('hidden') || getComputedStyle(el).display === 'none') return null;
    const b = el.getBoundingClientRect(); if (!(b.width > 0)) return null;
    const cs = getComputedStyle(el), ts = getComputedStyle(el.querySelector('.server-tag-text') || el);
    return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), x: Math.round(b.left + b.width/2), w: Math.round(b.width), h: Math.round(b.height), text: el.textContent.trim(),
      bg: cs.backgroundColor, color: ts.color, fs: parseFloat(ts.fontSize), italic: ts.fontStyle, upper: ts.textTransform, radius: parseFloat(cs.borderTopLeftRadius), shadow: cs.boxShadow };
  };
  out.tags = mode === 'schermo' ? ['p1', 'p2'].map(id => tag(document.getElementById(`server-tag-${id}`))) : [tag(document.getElementById('server-tag'))];
  out.engineTag = mode === 'schermo' ? tag(document.getElementById('server-tag')) : null;
  // tabellone (e la sua copia nella metà del Player 2): il riquadro con tutto quello che contiene (anche il sottotitolo)
  const rect = el => {
    if (!el || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return null;
    let l = Infinity, t = Infinity, rr = -Infinity, bb = -Infinity;
    for (const e of [el, ...el.querySelectorAll('*')]){ const q = e.getBoundingClientRect(); if (q.width > 0 && q.height > 0){ l = Math.min(l, q.left); t = Math.min(t, q.top); rr = Math.max(rr, q.right); bb = Math.max(bb, q.bottom); } }
    return Number.isFinite(l) ? { l: Math.round(l), t: Math.round(t), r: Math.round(rr), b: Math.round(bb) } : null;
  };
  out.boards = ['natpf-scoreboard', 'natpf-scoreboard-p2'].map(id => rect(document.getElementById(id))).filter(Boolean);
  E.__render?.(); E.render();
  return out;
}, { mode, server, view });
const firstOff = p => p.evaluate(() => { const E = __natpfTennis; if (E.__view0){ E.setViewMode(E.__view0); delete E.__view0; } });
// la palla parte: casella e riquadro spariscono (dopo qualche passo e un disegno, come nel gioco)
const afterServe = p => p.evaluate(async () => {
  const E = __natpfTennis, M = E.natpfUi.serveMark;
  E.persistentStateLock = false;
  const who = E.score.server === 'opponent' ? E.opponent : E.player;
  E.phase = 'SERVE_TOSS'; E.ball.pos.set(who.pos.x, 2.6, who.pos.z); E.ball.vel.set(0, 0, 0);
  E._executeServeHit(who, { speed: 1.2 });
  for (let i = 0; i < 6; i++) E.update(1/60);
  E.render();
  const on = id => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none'; };
  return { phase: E.phase, box: M.box.visible, tags: ['server-tag', 'server-tag-p1', 'server-tag-p2'].filter(on) };
});
// fine del caso: ruolo e partita come prima (il computer del Player 2 è solo per la vista)
const reset = p => p.evaluate(() => { const E = __natpfTennis; E.playerRole = 'p1'; E.isMultiplayer = false; });
// costo del disegno (ms per disegno): riquadro spento e acceso; 10 giri alternati di 10 disegni ciascuno, mediana dei
// giri (la macchina può essere carica: la mediana regge meglio della media)
const cost = p => p.evaluate(() => {
  const E = __natpfTennis, M = E.natpfUi.serveMark, CONF = { off: false, box: true };
  const run = b => { M.box.visible = b; const t0 = performance.now(); for (let i = 0; i < 10; i++) E.render(); return (performance.now() - t0)/10; };
  if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  for (const c of Object.values(CONF)) run(c);
  const T = Object.fromEntries(Object.keys(CONF).map(k => [k, []]));
  for (let r = 0; r < 10; r++) for (const [k, c] of Object.entries(CONF)) T[k].push(run(c));
  const med = a => { const s = [...a].sort((x, y) => x - y); return +((s[4] + s[5])/2).toFixed(2); };
  return Object.fromEntries(Object.entries(T).map(([k, a]) => [k, med(a)]));
});

// aspetto del B35b: fondo giallo accento, scritta blu scura in corsivo maiuscolo, angoli tondi (pillola), bordo scuro
const YELLOW = 'rgb(232, 255, 58)', NAVY = 'rgb(7, 18, 51)';
const looksB35 = t => !!t && /Al servizio/.test(t.text) && t.bg === YELLOW && t.color === NAVY && t.italic === 'italic' && t.upper === 'uppercase' && t.radius >= t.h/2 - 1 && /rgba\(5, 10, 28, 0\.9\)/.test(t.shadow);
// appena sopra la testa: il fondo della casella sopra la cima del personaggio (1 px di tolleranza), non più lontano della
// sua altezza (né sotto la testa né lontana), centrata su chi batte (3 px); il fondo è il punto proiettato (tagHeight)
const overHead = (t, v) => !!t && v.head.on && t.b <= v.head.y + 1 && v.head.y - t.b <= Math.max(16, t.h) && Math.abs(t.x - v.head.x) <= 3 && Math.abs(t.b - v.anchor.y) <= 2
  // e con la sagoma vera: il fondo della casella non scende sotto il punto più alto del personaggio (2 px di tolleranza: il
  // bordo scuro) e non sta più su di una volta e mezza la sua altezza
  && t.b <= v.sil + 2 && v.sil - t.b <= Math.max(20, 1.5*t.h);
// dentro lo schermo o la sua metà (con il bordo scuro di 2–3 px), lontana dal tabellone (riquadri che non si toccano)
const inside = (t, vp) => !!t && t.l - 3 >= vp.x && t.r + 3 <= vp.x + vp.w && t.t - 3 >= vp.y && t.b + 3 <= vp.y + vp.h;
const apart = (t, boards) => !!t && boards.every(s => t.r + 3 <= s.l || t.l - 3 >= s.r || t.b + 3 <= s.t || t.t - 3 >= s.b);
const label = (cast, mode, server) => `${cast === 'lobdrop' ? 'Lob & Drop' : 'Classici'}, ${{ cpu: 'contro la CPU', schermo: 'stesso schermo', p2: 'sfida tra due computer, computer del Player 2' }[mode]}, batte ${server === 'player' ? (mode === 'cpu' ? 'chi gioca' : 'il Player 1') : (mode === 'cpu' ? 'la CPU' : 'il Player 2')}`;

const rows = [], COSTO = process.env.COSTO === '1';
// un caso al servizio: misure, schermata, controlli; size: carattere atteso ([min, max] px)
async function serveCase(g, { cast, mode, server, size, file, tag = 'B37.1', narrow = false }){
  const r = await atServe(g.p, mode, server), name = label(cast, mode, server) + (narrow ? ` (area stretta ${r.V.w}×${r.V.h})` : '');
  await g.p.screenshot({ path: path.join(OUT, file), ...(narrow ? { clip: { x: 0, y: 0, width: r.V.w, height: r.V.h } } : {}) });
  const looksOk = cast === 'lobdrop' ? r.looks.join() === 'drop,lob' : !r.looks.includes('drop');
  const recv = server === 'player' ? -1 : 1, sx = Math.sign(r.serverPos[0]);
  // riquadro: nella metà di chi riceve (z), dall'altra parte del centro rispetto a chi batte (x)
  const rectOk = !!r.rect && Math.sign(r.rect.z0 + r.rect.z1) === recv && Math.sign(r.rect.x0 + r.rect.x1) === -sx;
  const tagsOk = r.tags.length === r.views.length && r.tags.every((t, i) => looksB35(t) && overHead(t, r.views[i]) && inside(t, r.views[i].vp) && apart(t, r.boards) && t.fs >= size[0] - .01 && t.fs <= size[1] + .01);
  const boxOn = r.views.every(v => !!v.box && v.box.some(c => c.on && c.x >= v.vp.x && c.x <= v.vp.x + v.vp.w && c.y >= 0 && c.y <= v.vp.y + v.vp.h));
  check(`${tag} ${name}: casella gialla tonda «Al servizio» appena sopra la testa di chi batte${mode === 'schermo' ? ' in tutte e due le metà' : ''}, dentro ${mode === 'schermo' ? 'la sua metà' : 'lo schermo'}, lontana dal tabellone, ${size[0] === size[1] ? `${size[0]} px` : `${size[0]}–${size[1]} px`}; niente gemma`,
    ['SERVE_STANCE', 'SERVE_TOSS'].includes(r.phase) && looksOk && r.state.server === server && !r.state.gem && r.state.cones === 0 && tagsOk && (mode !== 'schermo' || !r.engineTag) && (mode !== 'p2' || r.role === 'p2'),
    JSON.stringify({ phase: r.phase, role: r.role, state: r.state, top: r.top, tagH: r.tagH, views: r.views.map(v => ({ vp: v.vp, head: v.head, anchor: v.anchor, sil: v.sil })), tags: r.tags, boards: r.boards, engineTag: r.engineTag }));
  check(`${tag} ${name}: riquadro di servizio a terra nella metà di chi riceve, in diagonale, in vista`, r.state.box && rectOk && boxOn, JSON.stringify({ rect: r.rect, server: r.serverPos, box: r.views.map(v => v.box) }));
  rows.push({ name, file, top: r.top, tagH: r.tagH, fs: r.tags.map(t => t?.fs), gapPx: r.tags.map((t, i) => t ? r.views[i].head.y - t.b : null), silPx: r.tags.map((t, i) => t ? r.views[i].sil - t.b : null), tag: r.tags.map(t => t && { w: t.w, h: t.h }) });
  return r;
}
async function serveAndGo(g, o){
  await serveCase(g, o);
  const a = await afterServe(g.p);
  check(`${o.tag || 'B37.1'} ${label(o.cast, o.mode, o.server)}: la palla parte, casella e riquadro spariscono`, a.phase === 'RALLY' && !a.box && !a.tags.length, JSON.stringify(a));
}

// 1920×1080: una pagina per personaggi (contro la CPU, poi il computer del Player 2, poi lo stesso schermo nella stessa
// pagina); con i Classici anche 1280×720 (la misura del B35b)
const BIG = [18, 24], NORMAL = [14, 14];
for (const cast of COSTO ? ['lobdrop'] : ['sempre', 'lobdrop']){
  const g = await game({ cast });
  for (const mode of COSTO ? ['cpu'] : ['cpu', 'p2', 'schermo']){
    if (!COSTO) for (const server of ['player', 'opponent']){
      await serveAndGo(g, { cast, mode, server, size: BIG, file: `chi-serve-${cast}-${mode}-${server}.png` });
      if (mode === 'p2') await reset(g.p);
    }
    if (cast === 'lobdrop' && mode === 'cpu'){
      const c = await cost(g.p);
      console.log(`costo del disegno (Lob & Drop, 1920×1080, grafica in software, mediana di 10 giri): riquadro spento ${c.off} ms, acceso ${c.box} ms (${(100*(c.box - c.off)/c.off).toFixed(1)} %)`);
      rows.push({ cost: c });
      // (solo nella fase del servizio; grafica in software: il caso peggiore. Soglia: al massimo 1 ms in più per disegno)
      check('B37.1 costo del disegno con il riquadro (solo al servizio): al massimo 1 ms in più per disegno con la grafica in software', c.box - c.off <= 1, JSON.stringify(c));
    }
    // 1280×720 (Classici, contro la CPU): la casella alla misura del B35b, 14 px
    if (cast === 'sempre' && mode === 'cpu'){
      await g.p.setViewportSize({ width: 1280, height: 720 });
      for (const server of ['player', 'opponent']) await serveCase(g, { cast, mode, server, size: NORMAL, file: `chi-serve-1280-${cast}-${mode}-${server}.png` });
      await g.p.setViewportSize({ width: 1920, height: 1080 });
      // prima persona (come nel B35b): niente casella sopra di sé (la camera è nella testa); quella della CPU sì
      for (const server of ['player', 'opponent']){
        const r = await atServe(g.p, 'cpu', server, 'first'), t = r.tags[0];
        await g.p.screenshot({ path: path.join(OUT, `chi-serve-prima-persona-${cast}-${server}.png`) });
        check(`B37.1 ${label(cast, 'cpu', server)}, prima persona: ${server === 'player' ? 'niente casella sopra di sé (come nel B35b); riquadro a terra sì' : 'casella sopra la CPU, come in terza persona'}`,
          r.fp && r.state.box && r.state.cones === 0 && (server === 'player' ? !t : looksB35(t) && overHead(t, r.views[0]) && inside(t, r.views[0].vp) && apart(t, r.boards)), JSON.stringify({ fp: r.fp, state: r.state, tags: r.tags, views: r.views.map(v => ({ head: v.head, anchor: v.anchor })) }));
      }
      await firstOff(g.p);
    }
    check(`B37.1 chi serve, ${cast} ${mode}: nessun errore`, !g.errs.length, g.errs.join(' | ').slice(0, 300));
  }
  await g.ctx.close();
}
// area stretta 720×720 (?area=…, un riquadro del ledwall): contro la CPU con Lob & Drop e stesso schermo con i Classici
for (const [cast, mode] of COSTO ? [] : [['lobdrop', 'cpu'], ['sempre', 'schermo']]){
  const g = await game({ cast, query: 'intro=0&area=0,0,720,720' });
  for (const server of ['player', 'opponent']){
    const r = await serveCase(g, { cast, mode, server, size: NORMAL, file: `chi-serve-stretta-${cast}-${mode}-${server}.png`, narrow: true });
    check(`B37.1 area stretta, ${label(cast, mode, server)}: il gioco sta nel riquadro 720×720`, r.V.w === 720 && r.V.h === 720, JSON.stringify(r.V));
  }
  check(`B37.1 area stretta ${cast} ${mode}: nessun errore`, !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
console.log(JSON.stringify(rows));
await B.close(); stop();
summary();
setTimeout(() => process.exit(), 300);
