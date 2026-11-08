// NATPF B16 («Leggenda più dura»): partita breve contro la CPU Leggenda nel gioco vero (pagina, motore e grafica veri),
// guardata a schermo. Chi gioca è il giocatore simulato «preciso» del banco (scripts/audit/rally-balance.mjs: colpisce
// vicino al punto ideale con un errore di tempo di 0,045 s e cerca il campo aperto), con gli ingressi del motore come
// il mouse. Si disegna solo per i fotogrammi (con la grafica software la partita andrebbe al rallentatore).
// Verifica che la CPU sia credibile (la forza si misura sul banco senza grafica, comando audit:legend: pochi punti nel
// browser non bastano, il punteggio qui si stampa soltanto):
//   • la CPU tiene lo scambio con colpi vari (almeno 4 schemi);
//   • colpisce solo entro la sua portata (≤ 2,3 m dal corpo) e non corre mai più veloce di chi gioca (8,8 m/s);
//   • allungo (palla oltre 1 m dal corpo), misurato sul disegno vero: all'impatto, posizioni nel mondo 3D del centro del
//     piatto della racchetta (mesh NatpfPiatto), della mano destra (Hand_R) e della testa (Head) del modello della CPU,
//     di lato rispetto al corpo e verso la palla. Il riferimento sono gli impatti normali della stessa prova (palla tra
//     0,3 e 0,8 m dal corpo): oltre il suo posto normale la mano deve andare verso la palla di almeno 0,4 volte l'allungo
//     previsto dal disegno (palla − 0,9 m, al massimo 0,45 m: LEGEND.reachFrom e reachMax), la testa (corpo inclinato) di
//     almeno 0,3 volte e il centro del piatto di almeno 5 cm. Con la CPU ferma piatto e mano vanno fuori di tutto
//     l'allungo; con la CPU che corre o fa l'affondo verso la palla il piatto molto meno (+0,08–0,23 m nelle prove
//     dell'08/11, probabilmente perché la racchetta del motore base ruota e oscilla con la velocità laterale,
//     racket_kinematics), la mano un po' meno (+0,21–0,32), la testa no. Nella partita le palle oltre 1 m sono poche (a
//     volte nessuna), quindi dopo i punti c'è una fase di allunghi forzati: la CPU resta ferma (niente corsa, affondo né
//     palle lasciate passare) e a ogni colpo di chi gioca viene messa a ALLUNGHI_GAP m dal punto in cui passerà la palla,
//     alternando i lati. Se nessuna palla passa oltre 1 m la verifica stampa «NON ESERCITATA» e conta come non superata.
//     ALLUNGO_SPENTO=1 spegne l'allungo del disegno (racchetta e inclinazione): la verifica deve fallire.
// Fotogrammi in OUT: all'impatto della CPU (i primi CPU_SHOTS, 6 di base), i primi tre allunghi della partita, il primo
// affondo, gli allunghi forzati e il punteggio alla fine. Porte: GAME_PORT (di base 3161). POINTS: punti da giocare (di
// base 6, ~4 min: la partita va più o meno al ritmo vero). ALLUNGHI: allunghi forzati (di base 4; 0 per saltarli).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-leggenda.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, results, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3161), POINTS = +(process.env.POINTS || 6), CPU_SHOTS = +(process.env.CPU_SHOTS ?? 6);
const ALLUNGHI = +(process.env.ALLUNGHI ?? 4), GAPS = (process.env.ALLUNGHI_GAP || '1.2,1.5,1.8,2.1').split(',').map(Number);
const SPENTO = process.env.ALLUNGO_SPENTO === '1';
let unexercised = 0;
const REACH = { from: .9, max: .45 };                    // LEGEND.reachFrom e reachMax (natpf_legend.js): allungo previsto
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const B = await launch();
try {
  const { p: game, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfUi && window.__natpfTennis.player?.model && window.__natpfTennis.opponent?.model, null, { timeout: 120000 });
  await game.evaluate(({ shots, spento }) => {
    const E = __natpfTennis;
    E.__render = E.render.bind(E); E.render = () => {};
    E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal?.();
    E.natpfUi.testInput = true; E.natpfUi.selectController('mouse', { open: false });
    E.autoPlayMode = false; E.userHasInteracted = true;
    E._applyDifficultyTuning('leggenda');
    E.startNewMatch({ showStartBanner: false });
    E.matchConfig.gamesToWin = 99;                       // si gioca a punti, non a game
    // solo per provare che la verifica dell'allungo fallisce: racchetta e corpo restano al loro posto (reachMax 0 no:
    // l'inclinazione divide per reachMax e il modello finirebbe in NaN)
    if (spento) E.natpfLegendCfg = { reachMax: 1e-6, reachLean: 0 };
    // generatore deterministico (come il banco): il colpo di chi gioca e le scelte della CPU
    const rng = (a => () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; })(7);
    const gauss = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
    E.natpfLegendRng = rng;
    const P = { timingSd: .045, aimOpen: .85, aimDepth: .95, aimSd: .12, speed: 1.45, speedSd: .06 };
    const o = E.opponent, V = o.root.position.constructor;
    const W = window.__m = { points: [], cpu: [], vmax: 0, lunge: null, freeze: false, shots, stretch: 0, force: null, forced: 0, speed: o.maxSpeed };
    // posa vera nel mondo 3D (quella dell'ultimo fotogramma: il motore aggiorna i modelli dopo i passi della fisica), di
    // lato rispetto al corpo e con il segno della palla (positivo = verso la palla): centro del piatto, mano destra, testa
    let piatto = null; o.racketMesh.traverse(c => { if (c.name === 'NatpfPiatto') piatto = c; });
    piatto.geometry.computeBoundingBox();
    const pc = piatto.geometry.boundingBox.getCenter(new V());
    const pose = s => {
      piatto.updateWorldMatrix(true, false);
      const Pw = pc.clone().applyMatrix4(piatto.matrixWorld), H = o.parts.handR.getWorldPosition(new V()), T = o.parts.head.getWorldPosition(new V());
      return { piatto: +((Pw.x - o.pos.x)*s).toFixed(3), mano: +((H.x - o.pos.x)*s).toFixed(3), testa: +((T.x - o.pos.x)*s).toFixed(3) };
    };
    let intent = null, serveAt = null;
    const award = E._awardPoint.bind(E);
    E._awardPoint = (who, why) => { if (E.phase !== 'POINT_OVER' && E.phase !== 'MATCH_OVER') W.points.push(`${who}:${why}`); return award(who, why); };
    const exec = E._executeOpponentReturn.bind(E);
    E._executeOpponentReturn = a => {
      const gap = Math.abs(E.ball.pos.x - o.pos.x), s = Math.sign(E.ball.pos.x - o.pos.x) || 1;
      const c = { gap: +gap.toFixed(2), forced: !!W.force, ...pose(s) };
      exec(a);
      Object.assign(c, { kind: E.natpfLegend?.lastPick?.kind || null, err: E.natpfLegend?.lastPick?.err || null, kmh: Math.round(E.ball.vel.length()*3.6) });
      W.cpu.push(c);
      if (W.force){ W.forced++; W.force.n++; W.freeze = 'allungo-forzato'; }
      else if (W.cpu.length <= W.shots) W.freeze = 'impatto';
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
      // allunghi forzati: la CPU, ferma, sta a gap m dal punto in cui passerà la palla quando colpisce (la palla a 1,32 m
      // davanti al corpo: stima lineare rifatta a ogni passo, esatta all'impatto), una volta da una parte e una dall'altra
      if (W.force && E.phase === 'RALLY' && E.ball.inPlay && E.ball.lastHitter === 'player' && E.ball.vel.z < -1){
        const f = W.force, t = Math.max(0, (E.ball.pos.z - o.pos.z - 1.32)/(-E.ball.vel.z)), s = f.n % 2 ? -1 : 1;
        o.pos.x = Math.max(-6, Math.min(6, E.ball.pos.x + E.ball.vel.x*t - s*f.gaps[f.n % f.gaps.length]));
        o.vel.set(0, 0, 0); o.targetPos.x = o.pos.x;
      }
      step(dt);
      if (!W.force) W.vmax = Math.max(W.vmax, o.vel.length());
      if (!W.lunge && E.natpfLegend?.lunging){ W.lunge = E.elapsedTime; W.freeze = 'affondo'; }
    };
    const upd = E.update.bind(E);
    E.update = dt => (W.freeze ? undefined : upd(dt));
    // fase finale: allunghi forzati (velocità quasi nulla, niente affondo, niente palle lasciate passare)
    W.startForce = (n, gaps) => { W.force = { n: 0, gaps }; E.natpfLegendCfg = { ...(E.natpfLegendCfg || {}), vmax: .01, lungeFrom: 99, noLetGo: true }; };
  }, { shots: CPU_SHOTS, spento: SPENTO });

  let n = 0;
  const shoot = async s => {
    await game.evaluate(() => __natpfTennis.__render());
    await game.screenshot({ path: `${SP}/leggenda-${String(++n).padStart(2, '0')}-${s.freeze}-${s.cpu}.png` });
    await game.evaluate(() => { __m.freeze = false; });
  };
  const state = () => game.evaluate(() => ({ freeze: __m.freeze, pts: __m.points.length, cpu: __m.cpu.length, forced: __m.forced }));
  const t0 = Date.now();
  while (Date.now() - t0 < 420000){
    const s = await state();
    if (s.freeze) await shoot(s);
    if (s.pts >= POINTS) break;
    await game.waitForTimeout(15);
  }
  const natural = await game.evaluate(() => __m.cpu.length);
  if (ALLUNGHI > 0){
    await game.evaluate(({ n, gaps }) => __m.startForce(n, gaps), { n: ALLUNGHI, gaps: GAPS });
    const t1 = Date.now();
    while (Date.now() - t1 < 180000){
      const s = await state();
      if (s.freeze) await shoot(s);
      if (s.forced >= ALLUNGHI) break;
      await game.waitForTimeout(15);
    }
  }
  await game.evaluate(() => { __m.freeze = true; __natpfTennis.__render(); });
  await game.screenshot({ path: `${SP}/leggenda-fine.png` });
  const m = await game.evaluate(() => ({ ...__m, level: __natpfTennis.matchConfig.difficulty, legend: !!__natpfTennis.natpfLegend }));
  const play = m.cpu.slice(0, natural), forced = m.cpu.filter(c => c.forced);
  const won = m.points.filter(p => p.startsWith('player:')).length, lost = m.points.length - won;
  const kinds = new Set(play.map(c => c.kind).filter(Boolean)), cpuErr = m.points.filter(p => /^player:(Out|Net)/.test(p)).length;
  console.log(`Leggenda (${m.level}, velocità ${m.speed} m/s): punti chi gioca ${won} – CPU ${lost}; fine dei punti ${m.points.join(', ')}`);
  console.log(`colpi della CPU nella partita ${play.length}: schemi ${[...kinds].join(' ')}; distanza palla–corpo ${play.map(c => c.gap).join(' ')} m; corsa massima ${m.vmax.toFixed(2)} m/s; primo affondo a ${m.lunge ? m.lunge.toFixed(2) + ' s' : '—'}`);
  // riferimento: impatti normali (palla tra 0,3 e 0,8 m dal corpo, il lato del colpo è quello della palla)
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length/2)] : NaN; };
  const norm = m.cpu.filter(c => c.gap >= .3 && c.gap <= .8), ref = { piatto: med(norm.map(c => c.piatto)), mano: med(norm.map(c => c.mano)), testa: med(norm.map(c => c.testa)) };
  const f2 = v => (Number.isFinite(v) ? v.toFixed(2) : '—'), sg = v => (v >= 0 ? '+' : '') + f2(v);
  console.log(`posa all'impatto nel mondo 3D, di lato verso la palla (mediane dei ${norm.length} impatti normali, palla a 0,3–0,8 m): piatto ${f2(ref.piatto)} m, mano ${f2(ref.mano)} m, testa ${f2(ref.testa)} m dal corpo`);
  const far = m.cpu.filter(c => c.gap > 1);
  const judge = c => {
    const r = Math.min(REACH.max, Math.max(0, c.gap - REACH.from)), d = { piatto: c.piatto - ref.piatto, mano: c.mano - ref.mano, testa: c.testa - ref.testa };
    return { ...d, r, ok: d.mano >= .4*r && d.testa >= .3*r && d.piatto >= .05, resto: c.gap - c.piatto };
  };
  for (const c of far){ const j = judge(c); console.log(`  allungo ${c.forced ? 'forzato' : 'in partita'}: palla a ${c.gap} m dal corpo, allungo previsto ${f2(j.r)} m; oltre il posto normale piatto ${sg(j.piatto)}, mano ${sg(j.mano)}, testa ${sg(j.testa)} m; palla a ${f2(j.resto)} m di lato dal centro del piatto${j.ok ? '' : '  ← fuori soglia'}`); }
  check(`partita contro la Leggenda: ${POINTS} punti giocati`, m.level === 'leggenda' && m.legend && m.points.length >= POINTS, `${m.points.length} punti`);
  check('la CPU tiene lo scambio con colpi vari', play.length >= 3*POINTS && kinds.size >= 4, `${play.length} colpi della CPU, ${kinds.size} schemi; punti CPU ${lost} – ${won} chi gioca, ${cpuErr} errori della CPU`);
  check('la CPU colpisce solo entro la sua portata e non corre più veloce di chi gioca', m.cpu.every(c => c.gap <= 2.35) && m.vmax <= 8.8 + 1e-6, `distanza massima ${Math.max(...m.cpu.map(c => c.gap))} m, corsa massima ${m.vmax.toFixed(2)} m/s`);
  if (ALLUNGHI > 0) check(`allunghi forzati: ${ALLUNGHI} impatti con la palla a ${GAPS.join('/')} m dal corpo`, forced.length >= ALLUNGHI && forced.every(c => c.gap > 1), forced.map(c => c.gap).join(' '));
  const name = 'nell\'allungo (palla oltre 1 m dal corpo) piatto, mano e testa vanno verso la palla (posizioni 3D del disegno all\'impatto)';
  if (!far.length || norm.length < 3){
    results.push(false); unexercised++;
    console.log(`NON ESERCITATA  ${name} — ${far.length} palle oltre 1 m dal corpo (partita ${play.length} colpi, allunghi forzati ${forced.length}), ${norm.length} impatti normali di riferimento`);
  } else {
    const bad = far.filter(c => !judge(c).ok);
    check(name, !bad.length, `${far.length} allunghi (${far.filter(c => !c.forced).length} in partita, ${far.filter(c => c.forced).length} forzati)${bad.length ? `, ${bad.length} fuori soglia (palla a ${bad.map(c => c.gap).join(', ')} m)` : ''}`);
  }
  check('nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
if (unexercised) console.log(`\n${unexercised} verifica NON ESERCITATA (conta come non superata)`);
summary();
