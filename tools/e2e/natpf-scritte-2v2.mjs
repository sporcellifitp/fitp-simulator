// NATPF motore base (natpf-tennis/), B10: scritte dell'esito del colpo («Perfetto», nome del colpo, km/h) che non
// coprono il campo. Segnalazione dell'utente del 06/11: «se gioco 2v2, i nomi dei colpi (es. "Perfetto!") ostruiscono la
// visuale del campo». Prima l'esito si apriva sopra la testa di chi colpiva (+2,35 m): nel doppio il colpo del compagno a
// rete metteva la scritta in mezzo al campo, sopra la rete e gli avversari.
// Nel gioco vero (mouse e tastiera in modalità prova, localStorage testInput=1), doppio contro la CPU e singolare, a
// 1280×720, 1920×1080 e 720×720 (ledwall): scambio con la palla verso il compagno a rete (doppio) e verso chi gioca in
// fondo, colpo vero del motore (_handleUserSwingInput, swing che aspetta la palla). Al momento del colpo si misura il
// riquadro della scritta (#timing-popup) contro la proiezione del campo del doppio, della rete, della palla e dei
// giocatori con la camera viva del motore, poi la schermata. Schermate in $OUT (scritte-*.png).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome GAME_PORT=3871 node natpf-scritte-2v2.mjs   (SIZES=720x720 per una sola)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3187);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// Nella pagina: riquadri delle scritte in vista e proiezioni (pixel CSS) di campo, rete, palla e giocatori
const MEASURE = () => {
  const E = window.__natpfTennis, c = E.camera, V = c.position.constructor;
  c.updateMatrixWorld();
  const cv = E.renderer.domElement.getBoundingClientRect();
  const px = p => { const q = new V(...p).project(c); return { x: cv.left + (q.x*.5 + .5)*cv.width, y: cv.top + (-q.y*.5 + .5)*cv.height, front: q.z < 1 }; };
  const box = pts => { const q = pts.map(px).filter(p => p.front); if (!q.length) return null; const xs = q.map(p => p.x), ys = q.map(p => p.y); return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) }; };
  const B = 11.885, W = 5.485;
  const court = [[-W, 0, B], [W, 0, B], [W, 0, -B], [-W, 0, -B]].map(px);
  const net = box([[-6.4, 0, 0], [6.4, 0, 0], [-6.4, 1.07, 0], [6.4, 1.07, 0]]);
  const b = E.ball.pos, ball = box([[b.x - .25, b.y - .25, b.z], [b.x + .25, b.y + .25, b.z], [b.x, b.y, b.z - .25], [b.x, b.y, b.z + .25]]);
  const actors = {};
  for (const k of ['player', 'playerPartner', 'opponent', 'opponentPartner']){
    const a = E[k]; if (!a?.root?.visible && k.endsWith('Partner')) continue;
    const { x, z } = a.pos; actors[k] = box([[x - .55, 0, z], [x + .55, 0, z], [x - .55, 2.1, z], [x + .55, 2.1, z], [x, 0, z - .55], [x, 2.1, z + .55]]);
  }
  const rect = el => { if (!el || el.classList.contains('hidden') || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null; };
  const pop = document.getElementById('timing-popup');
  return {
    vp: [innerWidth, innerHeight], phase: E.phase, last: E.ball.lastHitter, doubles: !!E.isDoubles,
    popup: rect(pop), text: pop?.innerText?.replace(/\s+/g, ' ').trim() || '', cls: pop?.className || '',
    grade: getComputedStyle(document.getElementById('timing-popup-grade')).fontSize,
    court: court.map(p => [+p.x.toFixed(1), +p.y.toFixed(1)]), net, ball, actors,
  };
};
// rettangolo contro poligono convesso (campo proiettato) e contro rettangolo, con un margine di sicurezza in pixel
const inPoly = (poly, [x, y]) => { let s = 0; for (let i = 0; i < poly.length; i++){ const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length], c = (x2 - x1)*(y - y1) - (y2 - y1)*(x - x1); if (c){ if (s && Math.sign(c) !== s) return false; s = Math.sign(c); } } return true; };
const segX = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0])*(r[1] - p[1]) - (q[1] - p[1])*(r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
const rectPts = r => [[r.l, r.t], [r.r, r.t], [r.r, r.b], [r.l, r.b]];
const rectPoly = (r, poly) => { const R = rectPts(r); if (R.some(p => inPoly(poly, p)) || poly.some(([x, y]) => x > r.l && x < r.r && y > r.t && y < r.b)) return true; for (let i = 0; i < 4; i++) for (let j = 0; j < poly.length; j++) if (segX(R[i], R[(i + 1)%4], poly[j], poly[(j + 1)%poly.length])) return true; return false; };
const rectRect = (a, b, m = 0) => !!a && !!b && a.l < b.r + m && a.r > b.l - m && a.t < b.b + m && a.b > b.t - m;
const overlaps = m => {
  const r = m.popup; if (!r) return ['scritta non in vista'];
  const out = [];
  if (rectPoly(r, m.court)) out.push('campo');
  if (rectRect(r, m.net, 4)) out.push('rete');
  if (rectRect(r, m.ball, 6)) out.push('palla');
  for (const [k, a] of Object.entries(m.actors)) if (rectRect(r, a, 4)) out.push(k);
  if (r.l < 0 || r.t < 0 || r.r > m.vp[0] || r.b > m.vp[1]) out.push('fuori dallo schermo');
  return out;
};

// altri elementi dell'interfaccia in basso sopra cui la scritta non deve stare (barre, etichette delle metà, scheda
// dell'Allenamento, che sta sopra il gioco e la coprirebbe)
const UI_OVER = () => {
  const pop = document.getElementById('timing-popup'), r = pop?.getBoundingClientRect();
  if (!r?.width) return [];
  const out = [];
  for (const el of document.querySelectorAll('.natpf-meters:not(.hidden) .meter-group:not(.hidden), .natpf-split-hud:not(.hidden) .split-tag, .natpf-coach:not(.hidden) .coach-main')){
    const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
    if (b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top) out.push(el.className.split(' ')[0] + (el.dataset.meter || el.dataset.splitTag ? ':' + (el.dataset.meter || el.dataset.splitTag) : ''));
  }
  return out;
};
// Stesso schermo con il disegno diviso vero: ogni metà con la sua camera (P1 a sinistra con la camera del motore, P2 a
// destra con natpfSplit.cam2), proiezioni in pixel CSS nella sua metà
const MEASURE_SPLIT = () => {
  const E = window.__natpfTennis, S = E.natpfSplit, cv = E.renderer.domElement.getBoundingClientRect();
  const Wc = cv.width, gap = Math.max(2, Math.round(Wc*.004)), half = Math.floor((Wc - gap)/2);
  const views = { p1: { cam: E.camera, l: cv.left, w: half }, p2: { cam: S.cam2, l: cv.left + Wc - half, w: half } };
  const B = 11.885, W = 5.485, out = {};
  for (const [k, v] of Object.entries(views)){
    const c = v.cam, V = c.position.constructor; c.updateMatrixWorld();
    const px = p => { const q = new V(...p).project(c); return { x: v.l + (q.x*.5 + .5)*v.w, y: cv.top + (-q.y*.5 + .5)*cv.height, front: q.z < 1 }; };
    const box = pts => { const q = pts.map(px).filter(p => p.front); if (!q.length) return null; const xs = q.map(p => p.x), ys = q.map(p => p.y); return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) }; };
    const actors = {};
    for (const n of ['player', 'opponent']){ const { x, z } = E[n].pos; actors[n] = box([[x - .55, 0, z], [x + .55, 0, z], [x - .55, 2.1, z], [x + .55, 2.1, z], [x, 0, z - .55], [x, 2.1, z + .55]]); }
    const b = E.ball.pos;
    out[k] = { clip: { l: v.l, r: v.l + v.w, t: cv.top, b: cv.bottom }, court: [[-W, 0, B], [W, 0, B], [W, 0, -B], [-W, 0, -B]].map(px).map(p => [+p.x.toFixed(1), +p.y.toFixed(1)]),
      net: box([[-6.4, 0, 0], [6.4, 0, 0], [-6.4, 1.07, 0], [6.4, 1.07, 0]]), ball: box([[b.x - .25, b.y - .25, b.z], [b.x + .25, b.y + .25, b.z]]), actors };
  }
  const pop = document.getElementById('timing-popup'), r = pop.getBoundingClientRect(), vis = !pop.classList.contains('hidden') && r.width > 0;
  return { vp: [innerWidth, innerHeight], views: out, popup: vis ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null,
    text: pop.innerText.replace(/\s+/g, ' ').trim(), cls: pop.className, shown: S.shown, phase: E.phase };
};
const splitOverlaps = (m, half) => {
  const r = m.popup; if (!r) return ['scritta non in vista'];
  const v = m.views[half], out = [];
  if (r.l < v.clip.l - .5 || r.r > v.clip.r + .5) out.push('fuori dalla sua metà');
  for (const [k, w] of Object.entries(m.views)){
    const c = { l: Math.max(r.l, w.clip.l), r: Math.min(r.r, w.clip.r), t: r.t, b: r.b }; if (c.r <= c.l) continue;
    if (rectPoly(c, w.court)) out.push(k + ':campo');
    if (rectRect(c, w.net, 4)) out.push(k + ':rete');
    if (rectRect(c, w.ball, 6)) out.push(k + ':palla');
    for (const [n, a] of Object.entries(w.actors)) if (rectRect(c, a, 4)) out.push(k + ':' + n);
  }
  return out;
};
async function openMatch(w, h, format){
  const o = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w, h, init: () => { try { localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.setItem('natpf-tennis.controller', 'mouse'); } catch {} } });
  const { p } = o;
  await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby?.visible && __natpfTennis.natpfBackdrop, null, { timeout: 120000 });
  await p.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  if (!format) return o;
  await p.evaluate(f => { const U = __natpfTennis.natpfUi; U.lobby.setMode('cpu'); U.lobby.setFormat(f); U.lobby.go('match'); }, format);
  await p.waitForTimeout(400);
  await p.click('#btn-start-match');
  await p.waitForFunction(() => __natpfTennis.phase === 'SERVE_STANCE' && !__natpfTennis.natpfBackdrop, null, { timeout: 30000 });
  return o;
}
// Stesso schermo (disegno diviso vero) e servizio del Player 2. Revisione B10: (1) nello stesso schermo la scritta sopra
// le barre toccava il corridoio del campo a 16:9 e copriva il P1 largo dietro la riga di fondo; (2) il servizio del P2
// non aveva «P2» nel grade: la scritta finiva nell'angolo del P1 (stesso schermo a sinistra, sfida grande e senza
// «avversario», «Fuori» anche col servizio dentro)
async function splitAndServe(w, h, tag){
  const { ctx, p, errs } = await openMatch(w, h, 'singles');
  await p.evaluate(() => { const E = __natpfTennis; E.hud.hideCenterBanner(); E.natpfUi.onboarding?.close?.(); E.startSplit(); E.autoPlayMode = false; E.userHasInteracted = true; E.__update = E.update; E.update = () => {}; });
  await p.waitForTimeout(400);   // etichette delle metà (giro ogni 100 ms dell'interfaccia)
  const cases = [
    ['P1 al centro', 'p1', 'PERFECT • FOREHAND TOPSPIN!', [.4, 11.4, -.4, -11.4]],
    ['P2 al centro', 'p2', 'P2 PERFECT • BACKHAND CROSS!', [.4, 11.4, -.4, -11.4]],
    ['P1 largo dietro la riga di fondo', 'p1', 'PERFECT • FOREHAND TOPSPIN!', [-4.6, 12.2, 4.6, -12.2]],
    ['P2 largo dietro la riga di fondo', 'p2', 'P2 PERFECT • FOREHAND TOPSPIN!', [-4.6, 12.2, 4.6, -12.2]],
    ['servizio del P2', 'p2', null, [1.2, 11.9, -1.2, -11.9]],
  ];
  for (const [name, half, grade, pp] of cases){
    // un fotogramma diviso (camere delle metà in posa), poi la scritta come nel gioco, poi il disegno per la schermata
    await p.evaluate(([grade, pp]) => {
      const E = __natpfTennis;
      document.getElementById('timing-popup')?.classList.add('hidden');
      E.phase = grade ? 'RALLY' : 'SERVE_TOSS'; E.natpfUi.power.update(0);
      E.player.pos.set(pp[0], 0, pp[1]); E.opponent.pos.set(pp[2], 0, pp[3]);
      for (const a of [E.player, E.opponent]){ a.targetPos.copy(a.pos); a.root?.position.copy(a.pos); }
      if (grade) E.ball.pos.set(0, 1, 0); else { E.score.server = 'opponent'; E.ball.pos.set(pp[2], 2.6, pp[3] + .3); E.ball.vel.set(0, 0, 0); }
      E.natpfSplit.shown = false; E.__render();
      if (grade) E.hud.showTimingPopup({ grade, detail: '121 KM/H', screenPos: { x: 600, y: 300, visible: true } });
      else E._executeServeHit(E.opponent, { timing: 'PERFECT', speed: 1.4 });
      clearTimeout(E.hud.timingPopupTimer);
      E.__render();
    }, [grade, pp]);
    await p.waitForTimeout(250);   // fine dell'animazione d'entrata (0,16 s, spostata in basso)
    const m = await p.evaluate(MEASURE_SPLIT), ui = await p.evaluate(UI_OVER), bad = [...splitOverlaps(m, half), ...ui];
    const okSide = half === 'p2' ? /side-right/.test(m.cls) : !/side-right/.test(m.cls);
    const file = `scritte-${tag}-split-${name.replace(/\W+/g, '-').toLowerCase()}.png`;
    await p.screenshot({ path: `${SP}/${file}` });
    check(`${tag} stesso schermo (disegno diviso), ${name}: «${m.text}» nella metà del ${half.toUpperCase()}, fuori da campo, rete, palla, giocatori ed etichette`, m.shown && okSide && !/\bother\b/.test(m.cls) && !bad.length && (grade || !/fuori/i.test(m.text)), `diviso ${m.shown}; classi ${m.cls}; sovrapposta a: ${bad.join(', ') || 'niente'}; riquadro ${JSON.stringify(m.popup && [m.popup.l, m.popup.t, m.popup.w, m.popup.h].map(Math.round))}`);
    report.push({ tag, format: 'split', who: name.split(' ').slice(0, 2).join('-'), popup: m.popup, text: m.text, bad, court: m.views[half].court });
  }
  // sfida un amico sul computer del P1: il servizio del P2 è dell'altro giocatore (a destra, piccolo, «avversario»);
  // sul computer del P2 (stesso colpo, ruolo p2): il suo, a sinistra
  await p.evaluate(() => { const E = __natpfTennis; E.endSplit(); E._applyDifficultyTuning('1v1'); E.isMultiplayer = true; E.__render(); });
  for (const role of ['p1', 'p2']){
    await p.evaluate(role => {
      const E = __natpfTennis;
      document.getElementById('timing-popup')?.classList.add('hidden');
      E.playerRole = role; E.phase = 'SERVE_TOSS'; E.score.server = 'opponent';
      E.opponent.pos.set(-1.2, 0, -11.9); E.player.pos.set(1.2, 0, 11.9);
      for (const a of [E.player, E.opponent]){ a.targetPos.copy(a.pos); a.root?.position.copy(a.pos); }
      E.ball.pos.set(-1.2, 2.6, -11.6); E.ball.vel.set(0, 0, 0);
      E._executeServeHit(E.opponent, { timing: 'PERFECT', speed: 1.4 });
      clearTimeout(E.hud.timingPopupTimer);
    }, role);
    const m = await p.evaluate(MEASURE), bad = role === 'p1' ? overlaps(m) : [];
    await p.evaluate(() => { __natpfTennis.playerRole = 'p1'; __natpfTennis.__render(); });
    await p.screenshot({ path: `${SP}/scritte-${tag}-servizio-p2-${role === 'p1' ? 'sfida' : 'computer-p2'}.png` });
    const right = /side-right/.test(m.cls), small = /\bother\b/.test(m.cls);
    if (role === 'p1') check(`${tag} sfida un amico, servizio del P2 sul computer del P1: «${m.text}» a destra, piccolo, «avversario», non «Fuori», fuori dal campo`, right && small && /avversario/i.test(m.text) && !/fuori/i.test(m.text) && !bad.length, `classi ${m.cls}; sovrapposta a: ${bad.join(', ') || 'niente'}`);
    else check(`${tag} sfida un amico, servizio del P2 sul suo computer: «${m.text}» a sinistra, suo (senza «avversario»)`, !right && !small && !/avversario/i.test(m.text), `classi ${m.cls}`);
    report.push({ tag, format: 'servizio', who: role === 'p1' ? 'sfida' : 'pc-p2', popup: m.popup, text: m.text, bad, court: m.court });
  }
  check(`${tag} stesso schermo e servizio: nessun errore nella pagina`, errs.length === 0, errs.slice(0, 3).join(' | '));
  await ctx.close();
}
// Allenamento (riscaldamento): la scheda dell'esercizio in basso a sinistra sta sopra il gioco (z-index 40). Revisione
// B10: la scritta nell'angolo finiva sotto la scheda e chi si allenava non la vedeva più
async function training(w, h, tag){
  const { ctx, p, errs } = await openMatch(w, h, null);
  await p.evaluate(() => { const U = __natpfTennis.natpfUi; U.lobby.hide?.(); U.training.start({}); });
  await p.waitForFunction(() => __natpfTennis.natpfUi.training.active && document.querySelector('.natpf-coach:not(.hidden) .coach-main')?.getBoundingClientRect().height > 0, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    const E = __natpfTennis; E.hud.hideCenterBanner(); E.__update = E.update; E.update = () => {};
    E.phase = 'RALLY'; E.natpfUi.power.update(0);
    E.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '120 KM/H' }); clearTimeout(E.hud.timingPopupTimer);
  });
  await p.waitForTimeout(250);
  const m = await p.evaluate(MEASURE), ui = await p.evaluate(UI_OVER), bad = [...overlaps(m), ...ui];
  // la scritta si vede davvero: nel suo centro l'elemento in cima è la scritta (non la scheda)
  // (la scritta non riceve il mouse: per la prova sì, solo il tempo della domanda)
  const top = await p.evaluate(() => {
    const pop = document.getElementById('timing-popup'), r = pop.getBoundingClientRect();
    pop.style.pointerEvents = 'auto';
    const el = document.elementFromPoint((r.left + r.right)/2, (r.top + r.bottom)/2);
    pop.style.pointerEvents = '';
    return el?.closest?.('#timing-popup') ? 'scritta' : (el?.className?.toString?.() || el?.tagName || '-');
  });
  await p.evaluate(() => __natpfTennis.__render());
  await p.screenshot({ path: `${SP}/scritte-${tag}-allenamento.png` });
  check(`${tag} Allenamento: «${m.text}» in vista, nel tuo angolo sopra la scheda dell'esercizio, fuori da campo, palla e giocatore`, !bad.length && top === 'scritta' && !/side-right/.test(m.cls), `in cima: ${top}; classi ${m.cls}; sovrapposta a: ${bad.join(', ') || 'niente'}; riquadro ${JSON.stringify(m.popup && [m.popup.l, m.popup.t, m.popup.w, m.popup.h].map(Math.round))}`);
  report.push({ tag, format: 'allenam.', who: '-', popup: m.popup, text: m.text, bad, court: m.court });
  check(`${tag} Allenamento: nessun errore nella pagina`, errs.length === 0, errs.slice(0, 3).join(' | '));
  await ctx.close();
}

const SIZES = process.env.SIZES ?process.env.SIZES.split(',').map(t => t.split('x').map(Number)) : [[1280, 720], [1920, 1080], [720, 720]];
const B = await launch();
const report = [];
try {
  for (const [w, h] of SIZES){
    const tag = `${w}x${h}`;
    for (const format of process.env.SOLO ? [] : ['doubles', 'singles']){
      const { ctx, p, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w, h, init: () => { try { localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.setItem('natpf-tennis.controller', 'mouse'); } catch {} } });
      await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby?.visible && __natpfTennis.natpfBackdrop, null, { timeout: 120000 });
      // con la grafica software il disegno è lento: si disegna solo per le schermate (il motore gira lo stesso)
      await p.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
      await p.evaluate(f => { const U = __natpfTennis.natpfUi; U.lobby.setMode('cpu'); U.lobby.setFormat(f); U.lobby.go('match'); }, format);
      await p.waitForTimeout(400);
      await p.click('#btn-start-match');
      await p.waitForFunction(() => __natpfTennis.phase === 'SERVE_STANCE' && !__natpfTennis.natpfBackdrop, null, { timeout: 30000 });
      check(`${tag} ${format}: partita contro la CPU avviata (${format === 'doubles' ? 'quattro' : 'due'} giocatori)`, await p.evaluate(f => __natpfTennis.isDoubles === (f === 'doubles'), format));
      // colpi: verso il compagno a rete (solo doppio) e verso chi gioca in fondo
      // («largo»: chi gioca in fondo e largo a sinistra, nell'angolo della scritta: la scritta passa all'altro angolo)
      const cases = format === 'doubles' ? [['compagno', [-1.6, 0, 6.2]], ['fondo', [3.6, 0, 10.6]]] : [['fondo', [1.2, 0, 9.4]], ];
      for (const [who, target, at = [.6, 11.4]] of cases){
        await p.evaluate(([target, at]) => {
          const E = __natpfTennis; E.hud.hideCenterBanner(); E.natpfUi.onboarding?.close?.(); E.autoPlayMode = false; E.userHasInteracted = true;
          document.getElementById('timing-popup')?.classList.add('hidden');
          E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false;
          E.player.pos.set(at[0], 0, at[1]); E.player.targetPos.copy(E.player.pos);
          // compagno a rete; per il colpo da fondo nel doppio, lontano dalla palla (altrimenti la prende lui)
          if (E.isDoubles){ const away = target[0] > 0; E.__pms ??= E.playerPartner.maxSpeed; E.playerPartner.maxSpeed = away ? 0 : E.__pms; E.playerPartner.pos.set(away ? -4.4 : -2.1, 0, 5.4); E.playerPartner.targetPos.copy(E.playerPartner.pos); }
          Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 2 });
          E.ball.pos.set(.5, 1.1, -10.5); E._launchBallToTarget(E.ball.pos, new E.ball.pos.constructor(...target), 1.15, { topspin: 10 });
          E._natpfPlanPlayer?.();
          if (at[0] !== .6){ E.player.targetPos.copy(E.player.pos); E._natpfPlanPlayer = () => {}; }   // resta largo e in fondo
        }, [target, at]);
        // swing presto: il motore lo tiene finché la palla arriva (colpo assistito); si ripete finché la palla parte
        const hit = await p.evaluate(() => new Promise(done => {
          const E = __natpfTennis, t0 = performance.now();
          const id = setInterval(() => {
            if (E.ball.lastHitter === 'player'){ clearInterval(id); done(true); return; }
            if (E.phase !== 'RALLY' || performance.now() - t0 > 8000){ clearInterval(id); done(false); return; }
            if (!E.pendingUserSwing) E._handleUserSwingInput({ side: 'forehand', speed: 1.25 });
          }, 60);
        }));
        await p.waitForTimeout(120);
        // gioco e scritta fermi per la schermata (con la grafica software il disegno dura più della scritta)
        await p.evaluate(() => { const E = __natpfTennis; clearTimeout(E.hud.timingPopupTimer); E.__update = E.update; E.update = () => {}; });
        const m = await p.evaluate(MEASURE), bad = overlaps(m);
        await p.evaluate(() => __natpfTennis.__render());
        await p.screenshot({ path: `${SP}/scritte-${tag}-${format}-${who}.png` });
        await p.evaluate(() => { const E = __natpfTennis; E.update = E.__update; });
        check(`${tag} ${format}, colpo ${who === 'compagno' ? 'del compagno a rete' : who === 'largo' ? 'largo in fondo' : 'da fondo campo'}: la palla parte`, hit, `fase ${m.phase}, ultimo ${m.last}`);
        if (who === 'compagno') check(`${tag} ${format}: il colpo del compagno dice «compagno» (è il tuo gesto), nel tuo angolo a sinistra`, /compagno/i.test(m.text) && !/side-right/.test(m.cls), m.text);
        if (who === 'fondo' && format === 'doubles') check(`${tag} ${format}: colpo da fondo tuo, senza «compagno»`, !/compagno/i.test(m.text), m.text);
        check(`${tag} ${format}, colpo ${who}: scritta «${m.text}» in vista, fuori da campo, rete, palla e giocatori`, !bad.length, `sovrapposta a: ${bad.join(', ') || 'niente'}; riquadro ${JSON.stringify(m.popup && [m.popup.l, m.popup.t, m.popup.w, m.popup.h].map(v => Math.round(v)))}, carattere ${m.grade}`);
        report.push({ tag, format, who, popup: m.popup, text: m.text, bad, court: m.court });
      }
      // colpo dell'altro giocatore (sfida un amico: «P2 …» sul computer del P1) e stesso schermo (sessione segnata come
      // attiva solo per la scritta e le barre, gioco fermo): angolo, forma e sovrapposizioni con la stessa misura
      if (format === 'singles'){
        // chi gioca fuori dal campo, in fondo a sinistra, proprio dove andrebbe la scritta (punto del suolo sotto l'angolo):
        // la scritta passa all'altro angolo
        const r = await p.evaluate(() => {
          const E = __natpfTennis, c = E.camera, V = c.position.constructor, el = document.getElementById('timing-popup');
          E.__update ||= E.update; E.update = () => {};
          E.hud.showTimingPopup({ grade: 'PERFECT \u2022 FOREHAND TOPSPIN!', detail: '120 KM/H' }); clearTimeout(E.hud.timingPopupTimer);
          const b = el.getBoundingClientRect(), cv = E.renderer.domElement.getBoundingClientRect();
          const nx = ((b.left + b.right)/2 - cv.left)/cv.width*2 - 1, ny = -(((b.top + b.bottom)/2 - cv.top)/cv.height*2 - 1);
          const o = c.position.clone(), d = new V(nx, ny, .5).unproject(c).sub(o).normalize(), t = -o.y/d.y, g = o.add(d.multiplyScalar(t));
          E.player.pos.set(g.x, 0, g.z); E.player.root?.position.copy(E.player.pos);
          E.hud.showTimingPopup({ grade: 'PERFECT \u2022 FOREHAND TOPSPIN!', detail: '120 KM/H' }); clearTimeout(E.hud.timingPopupTimer);
          return [+g.x.toFixed(2), +g.z.toFixed(2)];
        });
        const m = await p.evaluate(MEASURE), bad = overlaps(m);
        check(`${tag} chi gioca fuori dal campo nell'angolo della scritta (x ${r[0]} m, z ${r[1]} m): la scritta passa a destra e non lo copre`, /side-right/.test(m.cls) && !bad.includes('player'), `classi ${m.cls}; sovrapposta a: ${bad.join(', ') || 'niente'}`);
        await p.evaluate(() => __natpfTennis.__render());
        await p.screenshot({ path: `${SP}/scritte-${tag}-angolo-occupato.png` });
        report.push({ tag, format: 'angolo', who: 'occupato', popup: m.popup, text: m.text, bad: bad.filter(k => k !== 'campo'), court: m.court });
        await p.evaluate(() => { const E = __natpfTennis; E.update = E.__update; });
      }
      if (format === 'doubles'){
        // (stesso schermo: pi\u00f9 sotto, con il disegno diviso vero)
        const extra = [
          ['amico', false, 'P2 PERFECT \u2022 FOREHAND TOPSPIN!'],
        ];
        for (const [name, split, grade] of extra){
          await p.evaluate(([split, grade]) => {
            const E = __natpfTennis; E.__update ||= E.update; E.update = () => {};
            if (E.natpfSplit) E.natpfSplit.active = split;
            E.natpfUi.power.update(0);
            E.hud.showTimingPopup({ grade, detail: '121 KM/H', screenPos: E._projectToScreen(E.opponent.pos.clone().setY(2.35)) });
            clearTimeout(E.hud.timingPopupTimer);
          }, [split, grade]);
          const m = await p.evaluate(MEASURE), bad = overlaps(m);
          // schermata con la vista intera (il disegno diviso dello stesso schermo vuole la sessione vera)
          await p.evaluate(() => { const S = __natpfTennis.natpfSplit; if (S) S.active = false; });
          const right = /side-right/.test(m.cls), small = /\bother\b/.test(m.cls);
          const want = name === 'amico' ? right && small && /avversario/i.test(m.text) : name === 'split-p2' ? right && !small : !right && !small;
          check(`${tag} ${name === 'amico' ? 'colpo dell’amico (sfida un amico)' : name === 'split-p1' ? 'stesso schermo, colpo del P1' : 'stesso schermo, colpo del P2'}: «${m.text}» ${name === 'split-p1' ? 'a sinistra' : 'a destra'}${name === 'amico' ? ', piccolo' : ''}, fuori dal campo`, want && !bad.length, `classi ${m.cls}; sovrapposta a: ${bad.join(', ') || 'niente'}; riquadro ${JSON.stringify(m.popup && [m.popup.l, m.popup.t, m.popup.w, m.popup.h].map(v => Math.round(v)))}`);
          await p.evaluate(() => __natpfTennis.__render());
          await p.screenshot({ path: `${SP}/scritte-${tag}-${name}.png` });
          report.push({ tag, format: name, who: '-', popup: m.popup, text: m.text, bad, court: m.court });
        }
        await p.evaluate(() => { const E = __natpfTennis; E.update = E.__update; E.natpfUi.power.update(0); });
      }
      check(`${tag} ${format}: nessun errore nella pagina`, errs.length === 0, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    if (!process.env.SOLO || process.env.SOLO === 'split') await splitAndServe(w, h, tag);
    if (!process.env.SOLO || process.env.SOLO === 'allenamento') await training(w, h, tag);
  }
} finally {
  await B.close();
  stop();
}
console.log('\nmisure:');
for (const r of report) console.log(`${r.tag.padEnd(9)} ${r.format.padEnd(8)} ${r.who.padEnd(9)} «${r.text}» ${r.popup ? [r.popup.l, r.popup.t, r.popup.w, r.popup.h].map(Math.round).join(',') : '-'} → ${r.bad.join(', ') || 'libera'}; campo ${JSON.stringify(r.court)}`);
console.log(`schermate in ${SP}`);
summary();
setTimeout(() => process.exit(), 300);
