// NATPF B32 (movimento con accelerazione e colpi in corsa, docs/b32/movimento.md; regole in
// natpf-tennis/src/natpf/natpf_movement.js): tre scene nel gioco vero (pagina, motore e grafica veri) a livello Pro, messe in
// campo a mano e giocate con gli ingressi del motore, con le schermate da guardare:
//   1) partenza: chi gioca è fermo in fondo, la CPU tira larga. Verifica: split-step (fermo per il primo passo), poi la
//      velocità cresce un poco alla volta (mai più di accel × passo), niente partenza a tutta;
//   2) cambio di direzione: chi gioca corre verso destra, la CPU tira a sinistra. Verifica: prima frena (la velocità verso
//      destra scende un poco alla volta), poi riparte verso sinistra; il cambio richiede tempo;
//   3) colpo in corsa: palla larga e veloce senza il tempo di fermarsi. Verifica: piano «in corsa» (natpfRunThrough), al
//      contatto chi gioca corre ancora (oltre metà della velocità massima), la scritta dell'esito dice «in corsa» e i piedi
//      continuano a correre durante il colpo (la fase del passo avanza).
// Le scene si giocano due volte: personaggi «Classici» con il dritto dal video acceso (?dritto=video) e «Lob & Drop» con i
// modelli 3D (?personaggi=lobdrop&mascotte=3d). Schermate in OUT (movimento-<aspetto>-<scena>.png).
//   cd tools/e2e && CHROMIUM_PATH=/opt/pw-browsers/chromium node natpf-movimento.mjs     (porta: GAME_PORT, di base 3172)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3172);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'ignore' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// nella pagina: partita a Pro e funzioni delle scene. Il tempo avanza a passi fissi di 1/60 s
const setup = () => {
  const E = __natpfTennis, V = E.ball.pos.constructor;
  E.__render = E.render.bind(E); E.render = () => {};
  E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal?.();
  E.natpfUi.testInput = true; E.natpfUi.selectController('mouse', { open: false });
  E.autoPlayMode = false; E.userHasInteracted = true;
  E._applyDifficultyTuning('pro'); E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 99;
  E.update = () => {};
  const tick = (n = 1) => { for (let i = 0; i < n; i++) E.__upd(1/60); };
  const sp = () => Math.hypot(E.player.vel.x, E.player.vel.z);
  const swing = (power = .62) => ({ source: 'audit', side: 'forehand', shotType: 'topspin', speed: .8 + power*.85, dirX: 0,
    natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', power, depth: +(power*.91).toFixed(3), rise: .3, face: .2 }, power, peak: 1100, latency: 0, hand: 'right', prepCapable: true, prep: null } });
  const rally = () => { E.phase = 'RALLY'; E.phaseTimer = 0; E.ball.inPlay = true; E.ball.bounceCountOnCurrentSide = 0; E.ball.rallyStrokeCount = 5; E.natpfCpuNet = E.natpfCpuOver = E.natpfCpuShot = null; if (E.natpfSkill) E.natpfSkill.cpuPlan = null; NS_reset(); };
  const NS_reset = () => { E.natpfFatigue?.clear?.(); };
  // la CPU tira dal fondo verso (x, z) con il volo «flight»; il piano di chi gioca parte come al colpo vero della CPU
  const cpuShot = (x, z, flight) => {
    E.opponent.pos.set(-.4, 0, -11.4); E.opponent.targetPos.copy(E.opponent.pos);
    E.ball.pos.set(-.2, 1.2, -10.4); E.ball.lastHitter = 'opponent'; E.ball.shotType = 'TOPSPIN';
    E._launchBallToTarget(E.ball.pos.clone(), new V(x, 0, z), flight, { topspin: 14 });
    E._natpfPlanPlayer();
  };
  const W = window.__m = { out: {} };
  // 1) partenza da fermo
  W.start = () => {
    rally(); E.player.pos.set(0, 0, 11.6); E.player.targetPos.copy(E.player.pos); E.player.vel.set(0, 0, 0);
    cpuShot(3.4, 9.6, 1.05);
    const hold = E.player.natpfRunHold - E.elapsedTime, v = [];
    for (let i = 0; i < 24; i++){ tick(); v.push(+sp().toFixed(2)); if (i === 14) W.snapStart = { v: v.at(-1), x: +E.player.pos.x.toFixed(2) }; }
    let jump = 0; for (let i = 1; i < v.length; i++) jump = Math.max(jump, v[i] - v[i - 1]);
    return (W.out.start = { hold: +hold.toFixed(3), v, jump: +jump.toFixed(2), plan: E.natpfPlan?.kind });
  };
  // 2) cambio di direzione: corre verso destra, la palla va a sinistra
  W.turn = () => {
    rally(); E.player.pos.set(.5, 0, 11.6); E.player.vel.set(7, 0, 0); E.player.targetPos.set(3.5, 0, 11.6);
    cpuShot(-3.2, 9.6, 1.1);
    const vx = []; let flip = -1;
    for (let i = 0; i < 40; i++){ tick(); vx.push(+E.player.vel.x.toFixed(2)); if (flip < 0 && E.player.vel.x < 0) flip = i; if (i === 12) W.snapTurn = { vx: vx.at(-1) }; }
    return (W.out.turn = { vx, flip, flipS: +(flip/60).toFixed(3), plan: E.natpfPlan?.kind, tx: +E.player.targetPos.x.toFixed(2) });
  };
  // 3) colpo in corsa: si cerca la palla larga e veloce che il piano dichiara «in corsa»
  // (B34: tutte le palle così, dalla più veloce: la scritta «in corsa» c'è solo con la corsa forte, da 0,8 della massima)
  W.findRuns = () => {
    const out = [];
    for (const fl of [1, .95, .9, .85, .8, .75, .7]) for (const x of [3.9, 3.7, 3.5]) for (const px of [-.6, -1]){
      rally(); E.player.pos.set(px, 0, 11.6); E.player.targetPos.copy(E.player.pos); E.player.vel.set(0, 0, 0);
      cpuShot(x, 9.8, fl);
      if (E.player.natpfRunThrough === 1 && E.natpfPlan?.kind !== 'stretch') out.push({ x, fl, px });
    }
    return out;
  };
  W.run = (pick) => {
    rally(); E.player.pos.set(pick.px, 0, 11.6); E.player.targetPos.copy(E.player.pos); E.player.vel.set(0, 0, 0);
    cpuShot(pick.x, 9.8, pick.fl);
    const through = E.player.natpfRunThrough, plan = E.natpfPlan?.kind;
    let sent = false, hitAt = -1, runAt = 0, stride0 = 0, stride1 = 0, popup = '';
    for (let i = 0; i < 200; i++){
      const b = E.ball, r = b.pos.z - E.player.pos.z, tti = (-.45 - r)/Math.max(.5, b.vel.z - E.player.vel.z);
      if (!sent && b.lastHitter === 'opponent' && b.vel.z > .5 && tti <= 0){ sent = true; E._handleUserSwingInput(swing()); stride0 = E.player.stridePhase; }
      tick();
      if (hitAt < 0 && E.ball.lastHitter === 'player'){ hitAt = i; runAt = sp(); popup = document.getElementById('timing-popup')?.textContent || ''; W.snapRun = { v: +runAt.toFixed(2) }; break; }
    }
    stride1 = E.player.stridePhase; W.stride = stride1;
    const L = E.natpfLastRacket || {};
    return (W.out.run = { through, plan, hit: hitAt >= 0, run: +runAt.toFixed(2), vmax: E.player.maxSpeed, move: L.move || null, say: L.say ?? null, q: L.out?.q, sit: L.sit?.reach, stride: +(stride1 - stride0).toFixed(2), popup: popup.replace(/\s+/g, ' ').trim() });
  };
  // dopo il colpo in corsa: n passi ancora (il colpo continua), quanto avanza il passo e quanto si corre
  W.after = (n = 8) => { const s0 = E.player.stridePhase, h0 = E.player.rig?.hopPhase ?? null; tick(n);
    return { stride: +(E.player.stridePhase - s0).toFixed(2), hop: h0 == null ? null : +(E.player.rig.hopPhase - h0).toFixed(2), v: +sp().toFixed(2), swing: !!(E.player.racketKinematics?.swingActive || E.player.racketKinematics?.isSwinging || E.player.swingTimer > 0) }; };
};

const B = await launch();
let n = 0;
try {
  for (const [look, query] of [['classici', '?intro=0&dritto=video'], ['lobdrop', '?intro=0&dritto=video&personaggi=lobdrop&mascotte=3d']]){
    const { p: game, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/${query}`, { w: 1280, h: 720 });
    await game.waitForFunction(() => window.__natpfTennis?.natpfUi && window.__natpfTennis.player?.model && window.__natpfTennis.opponent?.model, null, { timeout: 120000 });
    await game.evaluate(() => { const E = __natpfTennis; E.__upd = E.update.bind(E); });
    await game.evaluate(setup);
    const shot = async name => { await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/movimento-${look}-${String(++n).padStart(2, '0')}-${name}.png` }); };
    // vista vicina di chi gioca (solo per guardare la posa), poi la telecamera torna dov'era
    const close = async name => {
      await game.evaluate(() => { const E = __natpfTennis, a = E.player, c = E.camera; E.__cam = { p: c.position.clone(), q: c.quaternion.clone() };
        c.position.set(a.pos.x - 3.2, 2.0, a.pos.z + 3.4); c.lookAt(a.pos.x, 1.1, a.pos.z); c.updateMatrixWorld(); E.__render(); });
      await game.screenshot({ path: `${SP}/movimento-${look}-${String(++n).padStart(2, '0')}-${name}-vicino.png` });
      await game.evaluate(() => { const E = __natpfTennis, c = E.camera; c.position.copy(E.__cam.p); c.quaternion.copy(E.__cam.q); c.updateMatrixWorld(); });
    };
    const s = await game.evaluate(() => __m.start()); await shot('partenza'); await close('partenza');
    check(`${look}: partenza con split-step e accelerazione (niente partenza a tutta)`, s.hold > 0 && s.v[0] === 0 && s.jump <= 24/60 + .01 && s.v.at(-1) > 3, JSON.stringify(s));
    const t = await game.evaluate(() => __m.turn()); await shot('cambio-direzione'); await close('cambio-direzione');
    check(`${look}: cambio di direzione, prima frena e poi riparte (almeno 0,2 s per invertire)`, t.tx < 0 && t.flip >= 12 && t.vx.at(-1) < -2 && t.vx.slice(0, 24).every((v, i) => i === 0 || v <= t.vx[i - 1] + 1e-6), JSON.stringify(t));
    const picks = await game.evaluate(() => __m.findRuns()), pick = picks[0];
    check(`${look}: c'è una palla larga e veloce da prendere in corsa`, !!pick, JSON.stringify(picks.slice(0, 3)));
    if (pick){
      // B34: si prova una palla dopo l'altra fino al colpo con la corsa forte; quelli con la corsa media sono colpi in corsa
      // per la regola (move) ma senza la scritta
      let r = null, media = null;
      for (const p of picks.slice(0, 8)){
        r = await game.evaluate(q => __m.run(q), p);
        if (r.hit && r.move === 'corsa' && r.say !== 'corsa' && !media) media = r;
        if (r.say === 'corsa') break;
      }
      await shot('colpo-in-corsa'); await close('colpo-in-corsa');
      check(`${look}: colpo in corsa forte: al contatto corre ancora (da 0,8 della massima) e la scritta dell'esito lo dice`, r.through === 1 && r.hit && r.run > .75*r.vmax && r.move === 'corsa' && r.say === 'corsa' && /in corsa/i.test(r.popup), JSON.stringify(r));
      if (media) check(`${look}: colpo in corsa media: colpo in corsa per la regola, nessuna scritta «in corsa» (B34)`, media.run > .5*media.vmax && !/in corsa/i.test(media.popup), JSON.stringify(media));
      const a = await game.evaluate(() => __m.after(8)); await shot('colpo-in-corsa-dopo'); await close('colpo-in-corsa-dopo');
      check(`${look}: durante il colpo i piedi non si fermano (il passo avanza, si corre ancora)`, a.stride > .5 && a.v > 2 && (a.hop == null || a.hop > .5), JSON.stringify(a));
    }
    check(`${look}: nessun errore in pagina`, errs.length === 0, errs.slice(0, 3).join(' | '));
    await game.close();
  }
} finally { await B.close(); stop(); }
console.log(`schermate in ${SP}`);
summary();
