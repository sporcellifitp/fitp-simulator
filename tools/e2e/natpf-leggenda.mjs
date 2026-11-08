// NATPF B16 («Leggenda più dura»): partita breve contro la CPU Leggenda nel gioco vero (pagina, motore e grafica veri),
// guardata a schermo. Chi gioca è il giocatore simulato «preciso» del banco (scripts/audit/rally-balance.mjs: colpisce
// vicino al punto ideale con un errore di tempo di 0,045 s e cerca il campo aperto), con gli ingressi del motore come
// il mouse. Si disegna solo per i fotogrammi (con la grafica software la partita andrebbe al rallentatore).
// Verifica che la CPU sia credibile (la forza si misura sul banco senza grafica, comando audit:legend: pochi punti nel
// browser non bastano, il punteggio qui si stampa soltanto):
//   • la CPU tiene lo scambio con colpi vari (almeno 4 schemi);
//   • colpisce solo entro la sua portata (≤ 2,3 m dal corpo) e non corre mai più veloce di chi gioca (8,8 m/s);
//   • quando allunga (palla oltre 1 m dal corpo) racchetta e corpo vanno verso la palla nel disegno.
// Fotogrammi in OUT: all'impatto della CPU (i primi CPU_SHOTS, 6 di base), i primi tre allunghi (palla oltre 1 m), il
// primo affondo e il punteggio alla fine. Porte: GAME_PORT (di base 3161). POINTS: punti da giocare (di base 6, ~4 min:
// la partita va più o meno al ritmo vero).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-leggenda.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3161), POINTS = +(process.env.POINTS || 6), CPU_SHOTS = +(process.env.CPU_SHOTS ?? 6);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const B = await launch();
try {
  const { p: game, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfUi && window.__natpfTennis.player?.model && window.__natpfTennis.opponent?.model, null, { timeout: 120000 });
  await game.evaluate(shots => {
    const E = __natpfTennis;
    E.__render = E.render.bind(E); E.render = () => {};
    E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal?.();
    E.natpfUi.testInput = true; E.natpfUi.selectController('mouse', { open: false });
    E.autoPlayMode = false; E.userHasInteracted = true;
    E._applyDifficultyTuning('leggenda');
    E.startNewMatch({ showStartBanner: false });
    E.matchConfig.gamesToWin = 99;                       // si gioca a punti, non a game
    // generatore deterministico (come il banco): il colpo di chi gioca e le scelte della CPU
    const rng = (a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; })(7);
    const gauss = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
    E.natpfLegendRng = rng;
    const P = { timingSd: .045, aimOpen: .85, aimDepth: .95, aimSd: .12, speed: 1.45, speedSd: .06 };
    const W = window.__m = { points: [], cpu: [], vmax: 0, lunge: null, freeze: false, shots, stretch: 0 };
    let intent = null, serveAt = null;
    const award = E._awardPoint.bind(E);
    E._awardPoint = (who, why) => { if (E.phase !== 'POINT_OVER' && E.phase !== 'MATCH_OVER') W.points.push(`${who}:${why}`); return award(who, why); };
    const exec = E._executeOpponentReturn.bind(E);
    E._executeOpponentReturn = a => {
      const o = a || E.opponent, gap = Math.abs(E.ball.pos.x - o.pos.x);
      exec(a);
      W.cpu.push({ gap: +gap.toFixed(2), kind: E.natpfLegend?.lastPick?.kind || null, err: E.natpfLegend?.lastPick?.err || null, kmh: Math.round(E.ball.vel.length()*3.6), reach: +(o.natpfReach?.hold?.x || 0).toFixed(2) });
      if (W.cpu.length <= W.shots) W.freeze = 'impatto';
      else if (gap > 1 && W.stretch < 3){ W.stretch++; W.freeze = 'allungo'; }
    };
    const step = E._stepPhysics.bind(E);
    E._stepPhysics = dt => {
      // chi gioca: servizio e colpi come il profilo «preciso» del banco (scripts/audit/rally-balance.mjs)
      if (E.phase === 'SERVE_STANCE'){ intent = null; if (E.score.server === 'player' && E.phaseTimer > .6){ E._handleUserTossInput({}); serveAt = E.elapsedTime + .55 + gauss()*P.timingSd*.6; } }
      if (E.phase === 'SERVE_TOSS' && E.score.server === 'player' && serveAt != null && E.elapsedTime >= serveAt){ serveAt = null; E._handleUserSwingInput({ source: 'audit', speed: P.speed + gauss()*P.speedSd, dirX: gauss()*.3 }); }
      if (E.phase === 'RALLY' && E.ball.inPlay){
        if (E.ball.lastHitter === 'player') intent = null;
        else if (E.ball.vel.z > .5 && E.ball.pos.z > -6){
          if (!intent) intent = { error: gauss()*P.timingSd, sent: false };
          const r = E.ball.pos.z - E.player.pos.z, tti = (-.45 - r)/Math.max(.5, E.ball.vel.z - E.player.vel.z);
          if (!intent.sent && tti <= -intent.error){
            intent.sent = true;
            const open = E.opponent.pos.x >= 0 ? -1 : 1;
            const aim = Math.max(-1, Math.min(1, (rng() < P.aimOpen ? open*P.aimDepth : (rng() - .5)*1.2) + gauss()*P.aimSd));
            E._handleUserSwingInput({ source: 'audit', shotType: 'topspin', speed: P.speed + gauss()*P.speedSd, dirX: aim });
          }
        }
      }
      step(dt);
      W.vmax = Math.max(W.vmax, E.opponent.vel.length());
      if (!W.lunge && E.natpfLegend?.lunging){ W.lunge = E.elapsedTime; W.freeze = 'affondo'; }
    };
    const upd = E.update.bind(E);
    E.update = dt => (W.freeze ? undefined : upd(dt));
  }, CPU_SHOTS);

  const t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < 420000){
    const s = await game.evaluate(() => ({ freeze: __m.freeze, pts: __m.points.length, cpu: __m.cpu.length }));
    if (s.freeze){
      n++;
      await game.evaluate(() => __natpfTennis.__render());
      await game.screenshot({ path: `${SP}/leggenda-${String(n).padStart(2, '0')}-${s.freeze}-${s.cpu}.png` });
      await game.evaluate(() => { __m.freeze = false; });
    }
    if (s.pts >= POINTS) break;
    await game.waitForTimeout(15);
  }
  await game.evaluate(() => { __m.freeze = true; __natpfTennis.__render(); });
  await game.screenshot({ path: `${SP}/leggenda-fine.png` });
  const m = await game.evaluate(() => ({ ...__m, speed: __natpfTennis.opponent.maxSpeed, level: __natpfTennis.matchConfig.difficulty, legend: !!__natpfTennis.natpfLegend }));
  const won = m.points.filter(p => p.startsWith('player:')).length, lost = m.points.length - won;
  const kinds = new Set(m.cpu.map(c => c.kind).filter(Boolean)), cpuErr = m.points.filter(p => /^player:(Out|Net)/.test(p)).length;
  console.log(`Leggenda (${m.level}, velocità ${m.speed} m/s): punti chi gioca ${won} – CPU ${lost}; fine dei punti ${m.points.join(', ')}`);
  console.log(`colpi della CPU ${m.cpu.length}: schemi ${[...kinds].join(' ')}; distanza palla–corpo ${m.cpu.map(c => c.gap).join(' ')} m; allungo ${m.cpu.map(c => c.reach).join(' ')} m; corsa massima ${m.vmax.toFixed(2)} m/s; primo affondo a ${m.lunge ? m.lunge.toFixed(2) + ' s' : '—'}`);
  check(`partita contro la Leggenda: ${POINTS} punti giocati`, m.level === 'leggenda' && m.legend && m.points.length >= POINTS, `${m.points.length} punti`);
  check('la CPU tiene lo scambio con colpi vari', m.cpu.length >= 3*POINTS && kinds.size >= 4, `${m.cpu.length} colpi della CPU, ${kinds.size} schemi; punti CPU ${lost} – ${won} chi gioca, ${cpuErr} errori della CPU`);
  check('la CPU colpisce solo entro la sua portata e non corre più veloce di chi gioca', m.cpu.every(c => c.gap <= 2.35) && m.vmax <= 8.8 + 1e-6, `distanza massima ${Math.max(...m.cpu.map(c => c.gap))} m, corsa massima ${m.vmax.toFixed(2)} m/s`);
  check('nell\'allungo racchetta e corpo vanno verso la palla (palla oltre 1 m dal corpo)', m.cpu.filter(c => c.gap > 1).every(c => Math.abs(c.reach) > 0), JSON.stringify(m.cpu.filter(c => c.gap > 1).map(c => [c.gap, c.reach])));
  check('nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
