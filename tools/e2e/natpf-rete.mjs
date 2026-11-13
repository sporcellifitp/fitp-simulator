// NATPF B31 (gioco a rete, docs/b31/gioco-a-rete.md; regole in natpf-tennis/src/natpf/natpf_net_play.js): tre scene nel
// gioco vero (pagina, motore e grafica veri), messe in campo a mano e giocate con gli ingressi del motore, con le
// schermate da guardare:
//   1) volée di chi gioca: chi gioca a rete (5,2 m), la CPU tira dal fondo; il colpo parte quando la palla arriva al punto
//      d'impatto, come nel banco (rally-balance.mjs). Verifica: colpo al volo (volley), palla dentro di lato;
//   2) schiacciata della CPU: la CPU a rete (5,6 m), chi gioca alza una palla che passa sopra 2,05 m sulla sua linea.
//      Verifica: piano della CPU «smash», colpo della CPU «smash» con la posa da sopra la testa (swingType 'smash');
//   3) tagliato di chi gioca dal fondo: verifica colpo SLICE, effetto all'indietro (≤ −6) e rimbalzo basso (il primo
//      rimbalzo risale meno di quello del top spin della stessa scena);
//   4) (revisione finale) palla corta della CPU: la scritta dice «Palla corta della CPU», neutra, nell'angolo della CPU
//      (prima l'involucro dell'esito la trattava come un colpo di chi gioca: «Fuori · Palla corta» in rosso).
// Le tre scene si giocano due volte: personaggi «Classici» con il dritto dal video acceso (?dritto=video) e «Lob & Drop»
// con i modelli 3D (?personaggi=lobdrop&mascotte=3d): le pose nuove (volée, schiacciata della CPU) devono funzionare
// anche lì, senza errori in pagina. Schermate in OUT (rete-<aspetto>-<scena>.png).
//   cd tools/e2e && CHROMIUM_PATH=/opt/pw-browsers/chromium node natpf-rete.mjs        (porta: GAME_PORT, di base 3171)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3171);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'ignore' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// nella pagina: prepara la partita (livello Pro, a punti) e le funzioni delle scene
const setup = () => {
  const E = __natpfTennis, V = E.ball.pos.constructor;
  E.__render = E.render.bind(E); E.render = () => {};
  E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal?.();
  E.natpfUi.testInput = true; E.natpfUi.selectController('mouse', { open: false });
  E.autoPlayMode = false; E.userHasInteracted = true;
  E._applyDifficultyTuning('pro'); E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 99;
  E.update = () => {};                                   // il tempo lo fa avanzare la scena, a passi fissi
  const tick = (n = 1) => { for (let i = 0; i < n; i++) E.__upd(1/60); };
  const swing = (shot = 'topspin', power = .62) => ({ source: 'audit', side: 'forehand', shotType: shot, speed: .8 + power*.85, dirX: 0,
    natpf: { aim: 'swing', shot, intent: { shot, power, depth: +(power*.91).toFixed(3), rise: shot === 'slice' ? -.4 : .3, face: .2 }, power, peak: 1100, latency: 0, hand: 'right', prepCapable: true, prep: null } });
  const rally = () => { E.phase = 'RALLY'; E.phaseTimer = 0; E.ball.inPlay = true; E.ball.bounceCountOnCurrentSide = 0; E.ball.rallyStrokeCount = 5; E.natpfCpuNet = E.natpfCpuOver = E.natpfCpuShot = null; if (E.natpfSkill) E.natpfSkill.cpuPlan = null; };
  // la CPU tira verso chi gioca; chi gioca colpisce quando la palla arriva al punto d'impatto (tti come nel banco)
  const playerHits = (shot, maxS = 3) => {
    let sent = false, bounceY = 0, bounced = false;
    for (let i = 0; i < maxS*60; i++){
      const b = E.ball, r = b.pos.z - E.player.pos.z, tti = (-.45 - r)/Math.max(.5, b.vel.z - E.player.vel.z);
      if (!sent && b.lastHitter === 'opponent' && b.vel.z > .5 && tti <= 0){ sent = true; E._handleUserSwingInput(swing(shot)); }
      tick();
      if (E.natpfLastRacket?.seqB31 !== W.seq && E.ball.lastHitter === 'player'){ E.natpfLastRacket.seqB31 = W.seq; return { hit: true, i }; }
    }
    void bounceY; void bounced;
    return { hit: false };
  };
  const W = window.__r = { seq: 0, out: {} };
  W.volley = () => {
    rally(); W.seq++;
    E.player.pos.set(.2, 0, 5.2); E.player.targetPos.copy(E.player.pos); E.player.vel.set(0, 0, 0);
    E.opponent.pos.set(-.4, 0, -11.4); E.opponent.targetPos.copy(E.opponent.pos);
    E.ball.pos.set(-.2, 1.2, -10.4); E.ball.lastHitter = 'opponent'; E.ball.shotType = 'TOPSPIN';
    E._launchBallToTarget(E.ball.pos.clone(), new V(.9, 0, 9.5), 1.05, { topspin: 14 });
    E._natpfPlanPlayer();
    const plan = E.natpfPlan?.kind, h = playerHits('topspin');
    const L = E.natpfLastRacket || {};
    tick(5);
    return (W.out.volley = { plan, hit: h.hit, volley: !!L.volley, shot: L.out?.shot, x: L.out?.x, depth: L.out?.depth, grade: L.out?.grade, pz: +E.player.pos.z.toFixed(2) });
  };
  W.smash = () => {
    rally(); W.seq++;
    E.player.pos.set(.3, 0, 11.4); E.player.targetPos.copy(E.player.pos);
    E.opponent.pos.set(0, 0, -5.6); E.opponent.targetPos.copy(E.opponent.pos); E.opponent.vel.set(0, 0, 0); E.natpfCpuNet = { at: E.elapsedTime };
    let plan = null, flight = 0;
    // palla alta di chi gioca: si cerca la velocità di partenza che passa la linea della CPU tra 2,05 e 3,05 m (zona
    // della schiacciata). La palla parte da chi gioca come dopo il suo colpo (lastHitter 'player')
    for (const vy of [7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11]) for (const vz of [-13, -14.5, -16]){
      if (plan) break;
      E.ball.pos.set(.3, 1.1, 10.6); E.ball.vel.set(-.02, vy, vz); E.ball.spin.set(14, 0, 0);
      E.ball.lastHitter = 'player'; E.ball.shotType = 'TOPSPIN'; E.ball.bounceCountOnCurrentSide = 0; E.ball.inPlay = true;
      E.natpfCpuNet = { at: E.elapsedTime }; E._natpfPlanOpponent(E.opponent);
      if (E.natpfCpuOver?.kind === 'smash'){ plan = E.natpfCpuOver; flight = [vy, vz]; }
    }
    let hit = false, pose = null;
    for (let i = 0; i < 240 && plan; i++){ tick(); if (E.natpfCpuShot?.kind === 'smash'){ hit = true; break; } }
    if (hit){ tick(7); pose = E.opponent.swingType; }
    return (W.out.smash = { plan: plan?.kind || null, planY: plan?.y ?? null, flight, hit, kind: E.natpfCpuShot?.kind || null, swing: pose, kmh: Math.round(E.ball.vel.length()*3.6), cpuZ: +E.opponent.pos.z.toFixed(2) });
  };
  W.slice = (shot = 'slice') => {
    rally(); W.seq++;
    E.player.pos.set(.6, 0, 11.6); E.player.targetPos.copy(E.player.pos); E.player.vel.set(0, 0, 0);
    E.opponent.pos.set(-.4, 0, -11.4); E.opponent.targetPos.copy(E.opponent.pos);
    E.ball.pos.set(-.2, 1.2, -10.4); E.ball.lastHitter = 'opponent'; E.ball.shotType = 'TOPSPIN';
    E._launchBallToTarget(E.ball.pos.clone(), new V(.8, 0, 8.2), 1.0, { topspin: 14 });
    E._natpfPlanPlayer();
    const h = playerHits(shot), L = E.natpfLastRacket || {}, spin = E.ball.spin?.x;
    tick(6);
    const snap = { hit: h.hit, shot: L.out?.shot, spin: +(+spin).toFixed(2), depth: L.out?.depth };
    // primo rimbalzo nella metà della CPU: quanto risale la palla (m) prima del colpo della CPU
    E.opponent.pos.x = 9; E.opponent.targetPos.x = 9;   // la CPU lontana: si guarda solo la palla
    let bounced = false, up = 0;
    for (let i = 0; i < 300; i++){ const was = E.ball.bounceCountOnCurrentSide; tick(); if (E.ball.lastHitter !== 'player') break; if (!bounced && E.ball.bounceCountOnCurrentSide > was) bounced = true; if (bounced) up = Math.max(up, E.ball.pos.y); if (bounced && E.ball.vel.y < 0 && up > .2) break; }
    return (W.out[shot] = { ...snap, bounceUp: +up.toFixed(2) });
  };
  // revisione finale: palla corta della CPU, chiamata vera del motore (_executeOpponentReturn) con il generatore delle
  // scelte a rete fissato perché scatti; la scritta deve dire «Palla corta della CPU» (prima: «Fuori · Palla corta» in rosso)
  W.cpuDrop = () => {
    rally(); W.seq++; E.natpfCpuDrops = null;
    E.player.pos.set(.3, 0, 12.4); E.player.targetPos.copy(E.player.pos); E.player.vel.set(0, 0, 0);
    E.opponent.pos.set(.4, 0, -9.2); E.opponent.targetPos.copy(E.opponent.pos);
    Object.assign(E.ball, { lastHitter: 'player', bounceCountOnCurrentSide: 1, rallyStrokeCount: 5, shotType: 'TOPSPIN', isPowerShot: false });
    E.ball.pos.set(.6, 1.0, -8.9); E.ball.vel.set(0, -1, -6);
    const seq = [.01, .5, .9, .5]; let k = 0, rng = E.natpfNetRng; E.natpfNetRng = () => (k < seq.length ? seq[k++] : .99);
    const mr = Math.random; Math.random = () => .97;
    try { E._executeOpponentReturn(E.opponent); } finally { Math.random = mr; E.natpfNetRng = rng; }
    const el = id => document.getElementById(id), pop = el('timing-popup');
    return (W.out.cpuDrop = { kind: E.natpfCpuShot?.kind || null, net: E.natpfCpuShot?.net ?? null, landingZ: +E.ball.targetLanding.z.toFixed(2),
      grade: el('timing-popup-grade')?.textContent || '', detail: el('timing-popup-detail')?.textContent || '', gradeCls: el('timing-popup-grade')?.className || '',
      hidden: pop?.classList.contains('hidden'), right: pop?.classList.contains('side-right'), other: pop?.classList.contains('other') });
  };
};

const B = await launch();
let n = 0;
try {
  for (const [look, query] of [['classici', '?intro=0&dritto=video'], ['lobdrop', '?intro=0&dritto=video&personaggi=lobdrop&mascotte=3d']]){
    const { p: game, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/${query}`, { w: 1280, h: 720 });
    await game.waitForFunction(() => window.__natpfTennis?.natpfUi && window.__natpfTennis.player?.model && window.__natpfTennis.opponent?.model, null, { timeout: 120000 });
    await game.evaluate(() => { const E = __natpfTennis; E.__upd = E.update.bind(E); });
    await game.evaluate(setup);
    const shot = async name => { await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/rete-${look}-${String(++n).padStart(2, '0')}-${name}.png` }); };
    // vista vicina di un personaggio (solo per guardare la posa), poi la telecamera torna dov'era
    const close = async (name, who) => {
      await game.evaluate(w => { const E = __natpfTennis, a = E[w], c = E.camera; E.__cam = { p: c.position.clone(), q: c.quaternion.clone() };
        const s = Math.sign(a.pos.z) || 1; c.position.set(a.pos.x + 2.6, 2.1, a.pos.z + s*3.6); c.lookAt(a.pos.x, 1.4, a.pos.z); c.updateMatrixWorld(); E.__render(); }, who);
      await game.screenshot({ path: `${SP}/rete-${look}-${String(++n).padStart(2, '0')}-${name}-vicino.png` });
      await game.evaluate(() => { const E = __natpfTennis, c = E.camera; c.position.copy(E.__cam.p); c.quaternion.copy(E.__cam.q); c.updateMatrixWorld(); });
    };
    const v = await game.evaluate(() => __r.volley()); await shot('volee'); await close('volee', 'player');
    check(`${look}: volée di chi gioca a rete`, v.hit && v.volley && Math.abs(v.x) <= 4.115, JSON.stringify(v));
    const s = await game.evaluate(() => __r.smash()); await shot('schiacciata-cpu'); await close('schiacciata-cpu', 'opponent');
    check(`${look}: schiacciata della CPU a rete, posa da sopra la testa`, s.plan === 'smash' && s.hit && s.kind === 'smash' && s.swing === 'smash', JSON.stringify(s));
    const sl = await game.evaluate(() => __r.slice('slice')); await shot('tagliato');
    const top = await game.evaluate(() => __r.slice('topspin'));
    check(`${look}: tagliato di chi gioca, effetto all'indietro e rimbalzo più basso del top spin`, sl.hit && sl.shot === 'SLICE' && sl.spin <= -6 && sl.bounceUp > 0 && sl.bounceUp < top.bounceUp, `${JSON.stringify(sl)} · top spin ${JSON.stringify(top)}`);
    const d = await game.evaluate(() => __r.cpuDrop()); await shot('palla-corta-cpu');
    check(`${look}: palla corta della CPU scritta «Palla corta della CPU», neutra, nell'angolo della CPU (mai «Fuori»)`, d.kind === 'drop' && !d.net && d.landingZ > 0 && !d.hidden && /palla corta della cpu/i.test(d.grade) && !/fuori|rete/i.test(d.grade + ' ' + d.detail) && /q-cpu/.test(d.gradeCls) && !/q-red/.test(d.gradeCls) && d.right && d.other, JSON.stringify(d));
    check(`${look}: nessun errore in pagina`, errs.length === 0, errs.slice(0, 3).join(' | '));
    await game.close();
  }
} finally { await B.close(); stop(); }
console.log(`schermate in ${SP}`);
summary();
