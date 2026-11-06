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

const SIZES = process.env.SIZES ? process.env.SIZES.split(',').map(t => t.split('x').map(Number)) : [[1280, 720], [1920, 1080], [720, 720]];
const B = await launch();
const report = [];
try {
  for (const [w, h] of SIZES){
    const tag = `${w}x${h}`;
    for (const format of ['doubles', 'singles']){
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
      const cases = format === 'doubles' ? [['compagno', [-1.6, 0, 6.2]], ['fondo', [1.2, 0, 9.4]]] : [['fondo', [1.2, 0, 9.4]]];
      for (const [who, target] of cases){
        await p.evaluate(target => {
          const E = __natpfTennis; E.hud.hideCenterBanner(); E.natpfUi.onboarding?.close?.(); E.autoPlayMode = false; E.userHasInteracted = true;
          document.getElementById('timing-popup')?.classList.add('hidden');
          E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false;
          E.player.pos.set(.6, 0, 11.4); E.player.targetPos.copy(E.player.pos);
          if (E.isDoubles){ E.playerPartner.pos.set(-2.1, 0, 5.4); E.playerPartner.targetPos.copy(E.playerPartner.pos); }
          Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 2 });
          E.ball.pos.set(.5, 1.1, -10.5); E._launchBallToTarget(E.ball.pos, new E.ball.pos.constructor(...target), 1.15, { topspin: 10 });
          E._natpfPlanPlayer?.();
        }, target);
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
        check(`${tag} ${format}, colpo ${who === 'compagno' ? 'del compagno a rete' : 'da fondo campo'}: la palla parte`, hit, `fase ${m.phase}, ultimo ${m.last}`);
        check(`${tag} ${format}, colpo ${who}: scritta «${m.text}» in vista, fuori da campo, rete, palla e giocatori`, !bad.length, `sovrapposta a: ${bad.join(', ') || 'niente'}; riquadro ${JSON.stringify(m.popup && [m.popup.l, m.popup.t, m.popup.w, m.popup.h].map(v => Math.round(v)))}, carattere ${m.grade}`);
        report.push({ tag, format, who, popup: m.popup, text: m.text, bad, court: m.court });
      }
      check(`${tag} ${format}: nessun errore nella pagina`, errs.length === 0, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
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
