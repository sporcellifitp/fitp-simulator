// NATPF B37 (collaudo dell'utente del 13/11, punto 1): «quando la palla va fuori, aspetta che la palla vada realmente
// fuori (anche quando finisce la partita)». Partita vera contro la CPU con il telefono simulato (pagina del telefono,
// collegamento e motore veri). La CPU batte, il robot risponde con un gesto del telefono; alcuni colpi sono mandati
// apposta fuori largo o in rete (si cambia solo dove cade la palla di quel colpo, dopo l'esito del motore). Si misurano,
// con l'orologio del computer, i tempi dal colpo: scritta dell'esito nell'angolo, anello rosso a terra, tabellone, scritta
// grande del punto, voce, telefono (scritta e vibrazione dell'errore), e alla fine la schermata di fine partita.
//   Dopo il B37: niente «Fuori», «In rete», anello rosso o vibrazione d'errore prima che la palla tocchi terra fuori o la
//   rete; tutto arriva quando la palla tocca (entro un fotogramma, il telefono entro il giro della rete locale); la
//   schermata di fine partita arriva dopo che l'ultima palla è atterrata, con il tempo di vederla.
//   Dopo il B43 (punto 3): la scritta grande del punto arriva mezzo secondo dopo l'atterraggio (il verdetto no) e la
//   schermata di fine partita 1,8 s dopo quella scritta.
// MISURA=1: stampa solo le misure (per il confronto con il codice di prima, GAME_DIR=… su un'altra copia del gioco).
// JSON_OUT=file.json: le misure in un file (docs/b37/misure/). SHOTS=1: schermate in OUT (o nella cartella temporanea)
// del primo colpo mandato fuori largo, gioco e telefono: «colpo» (subito dopo il colpo) e «terra» (subito dopo che la palla
// ha toccato terra fuori), più «fine» (schermata di fine partita). Per le schermate il gioco si ferma un attimo: i tempi
// di quel punto non valgono come misura (gli altri sì).
// Porte 3157 (gioco) e 9157 (PeerJS), o GAME_PORT e PEER_PORT.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-fuori-vero.mjs
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP, quickCalibrate } from './th.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const GAME = process.env.GAME_DIR ? path.resolve(process.env.GAME_DIR) : path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9157), GAME_PORT = +(process.env.GAME_PORT || 3157), MISURA = process.env.MISURA === '1', SHOTS = process.env.SHOTS === '1';
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`), GAME);

const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 16 })); },
    run(fn, ms){ window.__busy = (window.__busy || 0) + 1; return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); window.__busy--; r(); } }, 16); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  window.__hold = setInterval(() => { if (!window.__busy && window.__moved) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  window.addEventListener('devicemotion', () => { window.__moved = true; }, { once: true });
  // telefono: scritta grande e vibrazioni, con l'ora del computer (stesso orologio della pagina del gioco)
  const now = () => performance.timeOrigin + performance.now(), P = window.__P = [];
  const vib = navigator.vibrate ? navigator.vibrate.bind(navigator) : null;
  navigator.vibrate = p => { P.push({ k: 'vibra', t: now(), p: JSON.stringify(p) }); try { return vib ? vib(p) : true; } catch { return true; } };
  addEventListener('DOMContentLoaded', () => {
    const big = document.getElementById('big'), sub = document.getElementById('sub');
    if (big) new MutationObserver(() => P.push({ k: 'tel', t: now(), txt: `${big.textContent} | ${sub?.textContent || ''}` })).observe(big, { childList: true, characterData: true, subtree: true });
  });
};
const B = await launch();
let result = null;
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  await game.evaluate(() => { __natpfTennis.natpfUi.selectController('phone', { open: false }); return __natpfTennis.natpfPhone.start(); });
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  await phone.waitForFunction(() => __racchetta.state.step === 'still', null, { timeout: 5000 });
  await phone.evaluate(() => __up.still(1200));
  await quickCalibrate(phone, QUICK_PLAN);
  await game.waitForFunction(() => __natpfTennis.natpfPhone.cal.review?.pass, null, { timeout: 8000 }).catch(() => {});
  await game.evaluate(() => __natpfTennis.natpfPhone.confirm());
  check('telefono calibrato', await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 5000 }).then(() => true, () => false));

  // partita vera a 1 game contro la CPU (batte la CPU); colpi di chi gioca: la coda dice quali mandare fuori largo
  // ('largo'), in rete ('rete') o lasciare com'erano (''); l'ultimo 'largo' arriva sul 0-40: è il punto della partita
  const PLAN = ['', 'largo', 'rete', 'largo', 'largo'];
  await game.evaluate(({ plan, shots }) => {
    const E = __natpfTennis, ui = E.natpfUi;
    ui.onboarding?.close?.(); E.hud.hideTitleModal(); ui.lobby && (ui.lobby.visible = false);
    E.autoPlayMode = false; E.userHasInteracted = true; E.isMultiplayer = false;
    E.matchConfig.difficulty = 'casual'; E._applyDifficultyTuning?.('casual');
    E.natpfServeFirst = 'opponent';
    E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 1;
    const now = () => performance.timeOrigin + performance.now();
    const T = window.__T = { ev: [], plan: [...plan], forced: 0 };
    const rec = (k, x = {}) => T.ev.push({ k, t: now(), g: +E.elapsedTime.toFixed(3), ...x });
    window.__rec = rec;
    const rs = E._natpfRacketShot.bind(E);
    E._natpfRacketShot = (...a) => {
      const r = rs(...a);
      if (r && a[1] === E.player && T.plan.length){
        const f = T.plan.shift();
        if (f === 'largo'){ r.E = (r.E >= 0 ? 1 : -1)*5.7; r.N = -8.6; r.O = false; }
        else if (f === 'rete') r.O = true;
        if (f && !T.plan.some(x => x)) { E.score.playerPoints = 0; E.score.opponentPoints = 3; }   // ultimo: punto della partita
        rec('colpo', { f, n: E.ball.rallyStrokeCount + 1 });
      } else if (r) rec('colpo', { f: '', n: E.ball.rallyStrokeCount + 1 });
      return r;
    };
    const aw = E._awardPoint.bind(E);
    E._awardPoint = (w, why = '') => { rec('punto', { w, why, by: E.ball.lastHitter, x: +E.ball.pos.x.toFixed(2), y: +E.ball.pos.y.toFixed(2), z: +E.ball.pos.z.toFixed(2) }); return aw(w, why); };
    const cb = E.hud.showCenterBanner.bind(E.hud);
    E.hud.showCenterBanner = (txt, o = {}) => { rec('banner', { txt: String(txt), sub: String(o.subText || '') }); return cb(txt, o); };
    const vm = E.hud.showVictoryModal.bind(E.hud);
    E.hud.showVictoryModal = o => { rec('fine', { by: E.ball.lastHitter, y: +E.ball.pos.y.toFixed(2) }); return vm(o); };
    const sb = E._syncScoreboardHUD.bind(E);
    E._syncScoreboardHUD = (...a) => { rec('tabellone', { s: `${E.score.playerPoints}-${E.score.opponentPoints} ${E.score.playerGames}-${E.score.opponentGames}` }); return sb(...a); };
    const vc = E.audioEngine?.playVoiceCallout?.bind(E.audioEngine);
    if (vc) E.audioEngine.playVoiceCallout = (n, o) => { rec('voce', { n: String(n) }); return vc(n, o); };
    const S = ui.shot, mk = S._marker.bind(S);
    S._marker = (t, c) => { rec('anello', { c, x: +(t?.x ?? 0).toFixed(2), z: +(t?.z ?? 0).toFixed(2) }); return mk(t, c); };
    const el = document.getElementById('timing-popup-grade');
    new MutationObserver(() => rec('scritta', { txt: el.textContent })).observe(el, { childList: true, characterData: true, subtree: true });
    // SHOTS=1: gioco fermo un attimo per le schermate del primo colpo mandato fuori largo, subito dopo il colpo e subito
    // dopo che la palla ha toccato terra (il gioco non va avanti finché la prova non ha fatto le schermate). Si ferma dopo
    // un giro di update in più: l'anello rosso e il lampo prendono colore e trasparenza nel primo update dopo l'evento
    if (shots){
      const upd = E.update.bind(E);
      E.update = dt => { if (window.__freeze) return; upd(dt); const A = window.__arm; if (A && --A.n <= 0){ window.__freeze = A.k; window.__arm = null; } };
      const rs2 = E._natpfRacketShot.bind(E);
      E._natpfRacketShot = (...a) => { const r = rs2(...a), e = __T.ev.at(-1); if (r && !window.__shotDone && e?.k === 'colpo' && e.f === 'largo'){ window.__arm = { k: 'colpo', n: 2 }; window.__shotDone = 1; } return r; };
      const aw2 = E._awardPoint.bind(E);
      E._awardPoint = (w, why = '') => { const out = aw2(w, why); if (window.__shotDone === 1 && why === 'Out'){ window.__arm = { k: 'terra', n: 2 }; window.__shotDone = 2; } return out; };
    }
  }, { plan: PLAN, shots: SHOTS });
  // SHOTS=1: anche i timer delle due pagine stanno fermi con il gioco (window.__freeze): le scritte del gioco e del
  // telefono si nascondono con setTimeout, e il disegno con la grafica in software del banco può durare secondi
  const HOLD_TIMERS = () => {
    if (window.__holdTimers) return; window.__holdTimers = true;
    const st = window.setTimeout.bind(window), ct = window.clearTimeout.bind(window), cur = new Map();
    window.setTimeout = (fn, ms, ...a) => {
      if (typeof fn !== 'function') return st(fn, ms, ...a);
      let id;
      const run = () => { if (window.__freeze){ cur.set(id, st(run, 40)); return; } cur.delete(id); fn(...a); };
      id = st(run, ms); cur.set(id, id); return id;
    };
    window.clearTimeout = id => { const c = cur.get(id); cur.delete(id); ct(c ?? id); };
  };
  if (SHOTS){ await game.evaluate(HOLD_TIMERS); await phone.evaluate(HOLD_TIMERS); }
  // schermate di un momento fermo: prima il telefono (con la scritta che il gioco gli ha appena mandato: al colpo il
  // nome del colpo, a terra «Punto avversario»), poi il gioco disegnato in quel momento
  const shoot = async fz => {
    const at = await game.evaluate(k => (__T.ev.filter(e => e.k === (k === 'terra' ? 'punto' : 'colpo')).at(-1)?.t ?? 0), fz);
    const want = fz === 'terra' ? '^Punto' : '^(Colpo!|Palla corta!|Lob!|Tagliato!|Smash!)';
    await phone.waitForFunction(({ at, want }) => __P.some(e => e.k === 'tel' && e.t >= at - 5 && new RegExp(want).test(e.txt)), { at, want }, { timeout: 1500 }).catch(() => {});
    await phone.evaluate(() => { window.__freeze = 1; });
    await phone.screenshot({ path: `${SP}/fuori-vero-${fz}-telefono.png` });
    await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/fuori-vero-${fz}.png` });
    await phone.evaluate(() => { window.__freeze = null; }); await game.evaluate(() => { window.__freeze = null; });
  };
  const t0 = Date.now(); let lastPlan = null;
  while (Date.now() - t0 < 150000){
    const s = await game.evaluate(() => { const E = __natpfTennis, P = E.natpfPlan; return { phase: E.phase, last: E.ball.lastHitter, left: P ? P.at + P.t - E.elapsedTime : null, at: P ? P.at : null, side: P ? P.side : 1, plan: __T.plan.length, fine: __T.ev.some(e => e.k === 'fine'), fz: window.__freeze || null }; });
    if (s.phase === 'MATCH_OVER' && s.fine) break;
    if (s.fz){ await shoot(s.fz); continue; }
    if (s.phase === 'RALLY' && s.last === 'opponent' && s.left != null && s.at !== lastPlan && s.left < .16){ lastPlan = s.at; await phone.evaluate(sign => { __up.swing(sign).then(() => __up.still(300)); }, s.side >= 0 ? 1 : -1); }
    await game.waitForTimeout(10);
  }
  await game.waitForTimeout(1500);
  const T = await game.evaluate(() => __T), P = await phone.evaluate(() => __P);
  // un punto per ogni colpo mandato fuori: dal colpo alla fine del punto
  const ev = T.ev, colpi = ev.filter(e => e.k === 'colpo');
  const rows = [];
  for (const c of colpi.filter(c => c.f)){
    const nextHit = ev.find(e => e.t > c.t && e.k === 'colpo'), pt = ev.find(e => e.t > c.t && e.k === 'punto');
    if (!pt || (nextHit && nextHit.t < pt.t)) { rows.push({ f: c.f, ok: false }); continue; }
    const after = k => ev.filter(e => e.k === k && e.t >= c.t - 5);
    const verdict = /^(Fuori|In rete)/;
    const scritta = after('scritta').find(e => verdict.test(e.txt) && e.t < pt.t + 1500);
    const anello = after('anello').find(e => e.c === 'red' && e.t < pt.t + 1500);
    const banner = after('banner').find(e => e.t >= pt.t - 5);
    const tab = after('tabellone').find(e => e.t >= pt.t - 5);
    const voce = after('voce').find(e => /^(Out|Net)$/.test(e.n) && e.t < pt.t + 1500);
    const fine = after('fine').find(e => !nextHit || e.t < nextHit.t);
    const tel = P.filter(e => e.t >= c.t - 5 && e.t < pt.t + 2000);
    const telV = tel.find(e => e.k === 'tel' && /^(Fuori|In rete)/.test(e.txt)), telP = tel.find(e => e.k === 'tel' && /^Punto/.test(e.txt));
    const vibErr = tel.find(e => e.k === 'vibra' && e.p === '[25,60,25]');
    const ms = e => (e ? Math.round(e.t - c.t) : null);
    rows.push({ f: c.f, ok: true, why: pt.why, y: pt.y, volo: ms(pt), scritta: ms(scritta), scrittaTxt: scritta?.txt || null, anello: ms(anello), tabellone: ms(tab), banner: ms(banner), bannerG: banner ? +(banner.g - pt.g).toFixed(3) : null, bannerTxt: banner ? `${banner.txt} · ${banner.sub}` : null, voce: ms(voce), telFuori: ms(telV), telTxt: telV?.txt || null, telPunto: ms(telP), telPuntoTxt: telP?.txt || null, vibraErrore: ms(vibErr), fine: ms(fine) });
  }
  result = rows;
  console.log('colpo → (ms dal colpo) atterraggio | scritta «Fuori» | anello rosso | tabellone | scritta del punto | voce | telefono «Fuori» | vibrazione d\'errore | telefono «Punto» | fine partita');
  for (const r of rows) console.log(r.ok ? `${r.f.padEnd(5)} ${r.why.padEnd(4)} palla a ${r.y} m | ${r.volo} | ${r.scritta} (${r.scrittaTxt}) | ${r.anello} | ${r.tabellone} | ${r.banner} (${r.bannerTxt}) | ${r.voce} | ${r.telFuori} (${r.telTxt}) | ${r.vibraErrore} | ${r.telPunto} (${r.telPuntoTxt}) | ${r.fine}` : `${r.f}: punto non finito da quel colpo (la CPU l'ha ripresa o il gesto non è arrivato)`);
  const unforced = colpi.filter(c => !c.f).map(c => { const s = ev.find(e => e.k === 'scritta' && e.t >= c.t - 5); return s ? Math.round(s.t - c.t) : null; });
  console.log(`colpi lasciati com'erano: scritta dell'esito dopo ${unforced.join(', ')} ms`);
  if (!MISURA){
    const done = rows.filter(r => r.ok);
    check('B37: almeno tre colpi mandati fuori (largo e in rete) hanno chiuso il punto, l\'ultimo la partita', done.length >= 3 && done.some(r => r.f === 'rete') && done.some(r => r.fine != null), JSON.stringify(rows.map(r => [r.f, r.ok, r.why])));
    const tol = 40;   // un fotogramma e mezzo (la scritta e l'anello arrivano nello stesso giro del punto)
    check('B37: la scritta «Fuori» / «In rete» compare solo quando la palla tocca terra fuori o la rete (non al colpo)', done.every(r => r.scritta != null && r.scritta >= r.volo - tol && r.scritta <= r.volo + 250), JSON.stringify(done.map(r => [r.volo, r.scritta])));
    check('B37: anello rosso solo all\'atterraggio fuori (mai al colpo; per la rete nessun anello)', done.every(r => (r.why === 'Net' ? r.anello == null : r.anello != null && r.anello >= r.volo - tol && r.anello <= r.volo + 250)), JSON.stringify(done.map(r => [r.why, r.volo, r.anello])));
    // (sul punto della partita la voce è quella della fine partita, non «Out!», come prima)
    check('B37: tabellone e voce all\'atterraggio, come prima', done.every(r => r.tabellone != null && Math.abs(r.tabellone - r.volo) <= tol && (r.fine != null || (r.voce != null && Math.abs(r.voce - r.volo) <= tol))), JSON.stringify(done.map(r => [r.volo, r.tabellone, r.voce])));
    // B43 punto 3 (decisione dell'utente del 13/11 sera): la scritta grande del punto mezzo secondo DOPO che la palla ha
    // toccato terra o rete: 0,5 s del tempo del gioco, nel primo fotogramma che li raggiunge (un fotogramma del motore dura
    // al più 0,08 s); sull'orologio del computer mai prima di 0,5 s e circa mezzo secondo (fino a 0,75 s). Il verdetto
    // (scritta in basso, anello, tabellone, voce, telefono) resta all'atterraggio (controlli del B37 qui sopra)
    check('B43: scritta grande del punto 0,5 s dopo l\'atterraggio (tempo del gioco, entro un fotogramma; orologio 460–750 ms)', done.every(r => r.banner != null && r.bannerG != null && r.bannerG >= 0.499 && r.bannerG <= 0.581 && r.banner - r.volo >= 500 - tol && r.banner - r.volo <= 750), JSON.stringify(done.map(r => [r.volo, r.banner, r.bannerG, r.bannerTxt])));
    check('B37: telefono: «Fuori» / «In rete» e vibrazione d\'errore solo all\'atterraggio (entro il giro della rete), poi «Punto avversario»', done.every(r => r.telFuori != null && r.telFuori >= r.volo - tol && r.telFuori <= r.volo + 600 && r.vibraErrore != null && r.vibraErrore >= r.volo - tol && r.telPunto != null && r.telPunto >= r.volo - tol), JSON.stringify(done.map(r => [r.volo, r.telFuori, r.vibraErrore, r.telPunto, r.telPuntoTxt])));
    const last = done.find(r => r.fine != null);
    check('B37: fine partita: la schermata arriva dopo che l\'ultima palla è atterrata, con il tempo di vederla (≥ 1,5 s)', !!last && last.y <= 0.1 && last.fine - last.volo >= 1500, JSON.stringify(last));
    check('B43: fine partita mai prima della scritta della partita (1,8 s dopo la scritta)', !!last && last.banner != null && last.fine - last.banner >= 1800 - tol, JSON.stringify(last && { volo: last.volo, banner: last.banner, fine: last.fine }));
    check('B37: i colpi in campo hanno la scritta subito, come prima', unforced.length >= 1 && unforced.every(v => v != null && v < 150), JSON.stringify(unforced));
    check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 500));
  }
  if (SHOTS){ await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/fuori-vero-fine.png` }); }
} finally {
  await B.close(); stop();
}
if (process.env.JSON_OUT) (await import('node:fs')).writeFileSync(process.env.JSON_OUT, JSON.stringify(result, null, 1));
summary();
setTimeout(() => process.exit(), 300);
