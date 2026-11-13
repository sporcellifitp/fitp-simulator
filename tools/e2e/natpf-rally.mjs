// NATPF motore base: scambio vero contro la CPU con il telefono simulato (pagina del telefono, collegamento e motore
// veri). Il robot fa partire il gesto quando la palla sta per arrivare al punto d'impatto (dal piano d'intercetto),
// dritto o rovescio dal lato del piano. Prova insieme le parti del colpo (fase C e D del 22/10 notte):
//   • ogni gesto colpisce la palla, il lato del colpo è quello del gesto;
//   • dopo ogni colpo dal fondo si torna in fondo (niente corsa a rete); dopo un attacco riuscito da dentro il campo o una
//     volée si sale o si resta a rete (B31, gioco a rete);
//   • l'esito è nel campo aperto (cadute in punti diversi) e la diagnostica lo vede (mira, punto neutro);
//   • B18.2 (D11): nella pausa tra i punti i personaggi sono fermi (prima la CPU «correva sul posto»).
// SHOTS=1 salva i fotogrammi all'impatto e 0,7 s dopo (recupero). Porte 3151 (gioco) e 9151 (PeerJS).
// DIFF=casual|pro|leggenda: livello della CPU (B16: con le regole del livello, velocità della CPU compresa; prima cambiava
// solo il nome del livello). CPU_SHOTS=n salva i primi n fotogrammi all'impatto della CPU (gioco fermo per lo scatto).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-rally.mjs
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP, quickCalibrate } from './th.mjs';
import { GESTI, defaultPrep } from './prova.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9151), GAME_PORT = +(process.env.GAME_PORT || 3151), DIFF = process.env.DIFF || 'pro';
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 16 })); },
    run(fn, ms){ window.__busy = (window.__busy || 0) + 1; return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); window.__busy--; r(); } }, 16); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  // come un telefono vero: i sensori arrivano di continuo (fermo tra un gesto e l'altro), dal primo campione in poi.
  // Senza, il computer vedrebbe «sensori fermi» e metterebbe in pausa (natpf_phone_watch.js)
  window.__hold = setInterval(() => { if (!window.__busy && window.__moved) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  window.addEventListener('devicemotion', () => { window.__moved = true; }, { once: true });
};
const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  // si disegna solo per i fotogrammi: con la grafica software la partita andrebbe al rallentatore
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  await game.evaluate(() => { __natpfTennis.natpfUi.selectController('phone', { open: false }); return __natpfTennis.natpfPhone.start(); });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  if (GESTI){
    await phone.waitForFunction(() => __racchetta.state.step === 'still', null, { timeout: 5000 });
    await phone.evaluate(() => __up.still(1200));
    await quickCalibrate(phone, QUICK_PLAN);   // aspetta da sé la fine del «fermo» e il «pronto» di ogni gesto
    await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
    await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
    check('telefono calibrato', await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 }).then(() => true, () => false));
  } else {
    // B28, calibrazione di base («Giocando»): niente gesti, il telefono è pronto da solo; poi gli scambi di prova
    const d = await defaultPrep(game, phone);
    check('telefono pronto senza gesti e scambi di prova giocati (calibrazione di base)', d.ready && d.trial.ended && ['full', 'ok'].includes(d.level), JSON.stringify(d));
  }
  // scambio vero: una palla della CPU verso chi gioca, poi il motore va avanti da solo (CPU compresa). Dal 23/10 la CPU non
  // riprende tutto (corsa con accelerazione e frenata, natpf_skill.js): a fine punto se ne gioca un altro dallo stesso
  // inizio, e contano i colpi del telefono su tutti i punti
  await game.evaluate(diff => {
    const E = __natpfTennis; E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
    if (E.matchConfig){ E.matchConfig.difficulty = diff; E._applyDifficultyTuning?.(diff); }
    window.__log = []; window.__contact = 0;
    // colpi della CPU: distanza laterale palla–corpo all'impatto, velocità, schema (Leggenda); velocità massima della CPU
    window.__cpu = []; window.__cpuVmax = 0; window.__freeze = false;
    const exec = E._executeOpponentReturn.bind(E);
    E._executeOpponentReturn = a => {
      const o = a || E.opponent, gap = Math.abs(E.ball.pos.x - o.pos.x), v = o.vel.length();
      exec(a);
      __cpu.push({ gap: +gap.toFixed(2), v: +v.toFixed(2), kmh: Math.round(E.ball.vel.length()*3.6), kind: E.natpfLegend?.lastPick?.kind || null });
      if (__cpu.length <= (window.__cpuShots || 0)) window.__freeze = true;    // fermo immagine all'impatto della CPU
    };
    const upd = E.update.bind(E);
    E.update = dt => (window.__freeze ? undefined : upd(dt));
    const step = E._stepPhysics.bind(E);
    E._stepPhysics = dt => { step(dt); window.__cpuVmax = Math.max(window.__cpuVmax, E.opponent.vel.length()); };
    const strike = E._attemptPlayerRallyStrike.bind(E);
    E._attemptPlayerRallyStrike = (e, t) => {
      const r = strike(e, t);
      if (r && !t){ window.__contact++; const L = E.natpfLastRacket; __log.push({ pz: +E.player.pos.z.toFixed(2), gesto: e.side, lato: L?.contact ?? null, mano: L?.intent ? 'ok' : null, x: L?.out?.x, depth: L?.out?.depth, mira: L?.out?.aim, neutro: L?.out?.x0, target: +E.player.targetPos.z.toFixed(2), volee: !!L?.volley }); }
      return r;
    };
    window.__rally = () => {
      E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false; E.player.pos.set(0, 0, 11.4); E.player.targetPos.copy(E.player.pos);
      Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1 });
      E.ball.pos.set(-.5, 1, -11); E._launchBallToTarget(E.ball.pos, new E.ball.pos.constructor(1.4, 0, 8.6), 1.05, { topspin: 14 }); E._natpfPlanPlayer();
      E.natpfPhone.lastPhase = 'play'; E.natpfPhone.link.send({ t: 'ph', ph: 'play' });
    };
    const award = E._awardPoint.bind(E); window.__ends = []; window.__endV = [];
    // B18.2 (D11): velocità della CPU nell'istante in cui il punto finisce (prima restava quella per tutta la pausa)
    E._awardPoint = (who, why) => { __ends.push(`${who}:${why}`); __endV.push(+E.opponent.vel.length().toFixed(2)); return award(who, why); };
    __rally();
  }, DIFF);
  await game.evaluate(n => { window.__cpuShots = n; }, +(process.env.CPU_SHOTS || 0));
  await phone.waitForFunction(() => __racchetta.state.phase === 'play', null, { timeout: 5000 }).catch(() => {});
  const t0 = Date.now(); let lastPlan = null, shots = 0, after = [], gestures = 0, rallies = 1; const pauses = [];
  while (Date.now() - t0 < 60000){
    const s = await game.evaluate(() => { const E = __natpfTennis, P = E.natpfPlan; return { phase: E.phase, last: E.ball.lastHitter, left: P ? P.at + P.t - E.elapsedTime : null, at: P ? P.at : null, side: P ? P.side : 1, contact: window.__contact }; });
    // punto finito: se ne gioca un altro (al massimo 8), dopo che il gesto in corso è finito
    if (s.phase !== 'RALLY'){
      if (rallies >= 8) break;
      await game.waitForTimeout(600);
      // B18.2 (D11): nella pausa tra i punti i quattro personaggi sono fermi e l'animazione non fa il passo di corsa
      pauses.push(await game.evaluate(() => { const E = __natpfTennis, A = [E.player, E.playerPartner, E.opponent, E.opponentPartner]; return { phase: E.phase, v: A.map(a => +a.vel.length().toFixed(2)), corre: A.map(a => !!a.rig?.wasMoving) }; }));
      await game.evaluate(() => __rally()); rallies++; lastPlan = null; continue;
    }
    // gesto circa 0,12 s prima del punto d'impatto (picco a metà dei 240 ms); il lato dal piano: + destra = dritto
    if (s.last === 'opponent' && s.left != null && s.at !== lastPlan && s.left < .16){ lastPlan = s.at; gestures++; await phone.evaluate(sign => { __up.swing(sign).then(() => __up.still(300)); }, s.side >= 0 ? 1 : -1); }
    if (await game.evaluate(() => window.__freeze)){ const n = await game.evaluate(() => __cpu.length); await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/rally-cpu-${DIFF}-${n}.png` }); await game.evaluate(() => { window.__freeze = false; }); }
    if (s.contact > shots){ shots = s.contact; if (process.env.SHOTS === '1' && shots <= 4){ await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/rally-impatto-${shots}.png` }); after.push({ n: shots, at: Date.now() + 700 }); } }
    for (const a of after.filter(a => Date.now() >= a.at)){ await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/rally-recupero-${a.n}.png` }); after = after.filter(x => x !== a); }
    if (shots >= 10) break;
    await game.waitForTimeout(10);
  }
  const log = await game.evaluate(() => __log), ends = await game.evaluate(() => __ends);
  if (process.env.DEBUG) console.log(JSON.stringify(log));
  // ogni gesto colpisce, tranne quelli per una palla della CPU che esce (chi gioca la lascia andare): punto vinto
  const outs = ends.filter(k => /^player:(Out|Net)/.test(k)).length;
  check('scambio vero contro la CPU: almeno 6 colpi del telefono, ogni gesto colpisce (tranne le palle fuori della CPU)', log.length >= 6 && gestures - log.length <= outs, `${log.length} colpi su ${gestures} gesti in ${rallies} punti; fine dei punti: ${ends.join(', ')}`);
  check('il lato del colpo è quello del gesto (dritto o rovescio), con l’intenzione dalla forma', log.every(l => l.gesto === (l.lato > 0 ? 'forehand' : 'backhand') && l.mano === 'ok'), JSON.stringify(log.map(l => [l.gesto, l.lato])));
  // a rete si resta solo se una palla corta ha portato vicino alla rete (colpo da meno di 6 m) e non c'è il tempo di tornare
  // B31 (gioco a rete, natpf_net_play.approachOf): dopo un attacco riuscito da dentro il campo si sale a rete (fino a
  // 5,2 m) e dopo la volée si resta lì; dal fondo (oltre la riga di fondo) mai, e mai a metà campo
  check('dopo ogni colpo si torna in fondo o, dopo un attacco da dentro il campo o una volée, si sale a rete (mai dal fondo né a metà campo)', log.every(l => l.target > 11 || (l.target <= 5.25 && l.pz < 11)) && log.filter(l => l.pz > 11.5).every(l => l.target > 11), JSON.stringify(log.map(l => [l.pz, l.target])));
  const xs = log.map(l => Math.round(l.x)), depths = log.map(l => l.depth);
  check('campo aperto: cadute in punti diversi, mira e punto neutro dal modello', new Set(xs).size >= 3 && log.every(l => Number.isFinite(l.mira) && Number.isFinite(l.neutro)) && Math.max(...depths) - Math.min(...depths) > .3, JSON.stringify(log.map(l => [l.x, l.depth])));
  const cpu = await game.evaluate(() => ({ shots: __cpu, vmax: __cpuVmax, speed: __natpfTennis.opponent.maxSpeed, level: __natpfTennis.matchConfig.difficulty }));
  console.log(`CPU (${cpu.level}, velocità massima ${cpu.speed} m/s): ${cpu.shots.length} colpi, distanza palla–corpo ${cpu.shots.map(c => c.gap).join(' ')} m, schemi ${cpu.shots.map(c => c.kind).join(' ')}, velocità ${cpu.shots.map(c => c.kmh).join(' ')} km/h, corsa massima ${cpu.vmax.toFixed(2)} m/s`);
  // la CPU del livello scelto: velocità del livello, colpi solo entro la sua portata, mai più veloce di chi gioca
  check(`CPU del livello ${DIFF}: colpi entro la portata, corsa sotto la velocità di chi gioca`, cpu.level === DIFF && cpu.shots.length >= 3 && cpu.shots.every(c => c.gap <= 2.35) && cpu.vmax <= 8.8 + 1e-6 && (DIFF !== 'leggenda' || cpu.shots.every(c => c.kind)), JSON.stringify({ level: cpu.level, n: cpu.shots.length, vmax: +cpu.vmax.toFixed(2), gap: Math.max(...cpu.shots.map(c => c.gap)) }));
  // se i dieci colpi sono arrivati senza che un punto finisse: si lascia finire quello in corso (chi gioca non colpisce più)
  if (!pauses.length && await game.waitForFunction(() => __natpfTennis.phase !== 'RALLY', null, { timeout: 30000 }).then(() => true, () => false)){
    await game.waitForTimeout(600);
    pauses.push(await game.evaluate(() => { const E = __natpfTennis, A = [E.player, E.playerPartner, E.opponent, E.opponentPartner]; return { phase: E.phase, v: A.map(a => +a.vel.length().toFixed(2)), corre: A.map(a => !!a.rig?.wasMoving) }; }));
  }
  const endV = await game.evaluate(() => __endV);
  // (che la CPU corresse a fine punto dipende dallo scambio: lo provano il test natpf-b18-t2-servizio e natpf-servizio-peso)
  check('B18.2: nella pausa tra i punti nessuno corre sul posto (velocità 0, animazione ferma)',
    pauses.length >= 1 && pauses.every(p => p.phase !== 'RALLY' && p.v.every(v => v === 0) && p.corre.every(c => !c)),
    `${pauses.length} pause, velocità ${JSON.stringify(pauses.map(p => p.v))}, in corsa ${pauses.filter(p => p.corre.some(Boolean)).length}; CPU nell'istante di fine punto ${endV.join(' ')} m/s`);
  // B42: lo «scambio che si scalda» vale anche contro la CPU ed è acceso di base: dal 20° colpo la scritta piccola
  // «Scambio caldo · colpo N», sotto il tabellone, senza coprirlo (lo scambio portato al 22° colpo a mano)
  const hot = await game.evaluate(async () => {
    const E = __natpfTennis, on = E.natpfHot;
    E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.lastHitter = 'player'; E.ball.rallyStrokeCount = 22; E.ball.pos.set(0, 1.4, 0); E.ball.vel.set(0, 3, -4);
    await new Promise(r => setTimeout(r, 150));
    const el = document.getElementById('natpf-hot-rally'), b = el.getBoundingClientRect(), s = document.querySelector('#natpf-scoreboard .sb-box')?.getBoundingClientRect();
    const box = [b.left, b.top, b.right, b.bottom].map(Math.round), sb = s ? [s.left, s.top, s.right, s.bottom].map(Math.round) : null;
    return { on, shown: !el.classList.contains('hidden'), text: el.textContent, box, h: Math.round(b.height), sb, covers: !!sb && box[0] < sb[2] && box[2] > sb[0] && box[1] < sb[3] && box[3] > sb[1] };
  });
  await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/rally-scambio-caldo-cpu-${DIFF}.png` });
  check('B42: contro la CPU lo scambio caldo è acceso di base; al 22° colpo la scritta piccola «Scambio caldo · colpo 22», senza coprire il tabellone',
    hot.on === true && hot.shown && hot.text === 'Scambio caldocolpo 22' && hot.h <= 30 && !hot.covers, JSON.stringify(hot));
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
