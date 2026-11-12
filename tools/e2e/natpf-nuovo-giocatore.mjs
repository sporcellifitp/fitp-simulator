// NATPF motore base (natpf-tennis/): «Nuovo giocatore» e fine partita (B18, difetti 4 e 5 e punto 18 del B16), con i
// telefoni simulati e i comandi veri:
//   A. contro la CPU: menu → Gioca → Contro la CPU → telefono (QR) → tutorial corto (5 schede) e calibrazione in campo →
//      «Partita» → «Gioca» → partita portata alla fine (punti assegnati dal motore) → schermata finale con il nome, senza
//      rating finto → «Nuovo giocatore»: nome, tutorial e calibrazione azzerati con il telefono ANCORA COLLEGATO (stesso
//      abbinamento, niente QR) → passo del nome con la mano → di nuovo in campo il tutorial corto e la calibrazione →
//      pagina «Partita»;
//   B. stesso schermo: due telefoni, nomi «Giulia» e «Marco», partita vinta dal Player 2: banner, schermata finale e voce
//      con il suo nome → «Nuovo giocatore»: pagina dei due telefoni con i nomi vuoti e il tutorial nelle due metà, telefoni
//      sempre collegati.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-nuovo-giocatore.mjs     (OUT=cartella delle schermate)
// Eventi devicemotion sintetici: non sostituiscono un telefono vero né persone vere.
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP, seeAllCards } from './th.mjs';
import { GESTI, throughTrial } from './prova.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9137), GAME_PORT = +(process.env.GAME_PORT || 3137);
const OUT = path.join(SP, 'nuovo-giocatore'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => console.log(`[${((Date.now() - T0)/1000).toFixed(1).padStart(5)} s] ${m}`);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono in verticale (come natpf-split-ready.mjs)
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
};
// calibrazione che ripete il gesto non riconosciuto (come natpf-split-ready.mjs); plan: gesti in ordine (mano di chi gioca)
const calibrate = async (ph, plan = QUICK_PLAN, ms = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms){
    const s = await ph.evaluate(() => { const R = window.__racchetta, st = R.state; return { sensor: st.sensor, step: st.step, ready: !!R.cal.state.ready, idx: R.cal.state.idx }; });
    if (s.sensor === 'ready') return true;
    if (s.step === 'swings' && s.ready){ const sign = plan[s.idx] === 'R' ? -1 : 1; await ph.evaluate(sg => { window.__busy = true; return __up.swing(sg).then(() => __up.back(sg)).then(() => __up.still(700)).then(() => { window.__busy = false; }); }, sign); }
    else await ph.evaluate(() => __up.still(150));
  }
  return false;
};
const until = async (p, fn, arg, ms = 20000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).then(() => true, () => false);
// stato del giocatore come lo vede il gioco (nome, tutorial visto, calibrazione, colpi imparati, collegamento)
const who = (g, id = 'p1') => g.evaluate(id => {
  const E = __natpfTennis, ui = E.natpfUi, P = id === 'p2' ? E.natpfPhone2 : E.natpfPhone;
  return { nick: ui.events.nickname, hand: id === 'p2' ? P.hand : ui.hand.hand, tutSeen: P.tutorialSeen, ready: P.ready, connected: P.connected, profile: !!P.profile,
    typical: P.typicalModel.value, pairs: P.state.pairs || 0, link: P.state.state, phone: P.state.phone, names: { ...(E.natpfSplitNames || {}) } };
}, id);
const phoneState = ph => ph.evaluate(() => ({ link: __racchetta.state.linkState, sensor: __racchetta.state.sensor, screen: __racchetta.state.screen, big: document.getElementById('big')?.textContent }));
// partita portata alla fine dal motore: winner vince quattro punti di fila (partita da un game)
const finish = (g, winner) => g.evaluate(w => { const E = __natpfTennis; E.matchConfig.gamesToWin = 1; for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++) E._awardPoint(w, 'Out'); return E.phase; }, winner);
const victory = g => g.evaluate(() => {
  const m = document.getElementById('victory-modal'), vis = el => !!el && !el.classList.contains('hidden') && el.getBoundingClientRect().height > 0;
  return { open: vis(m), title: document.getElementById('victory-result-banner')?.textContent, rows: [...m.querySelectorAll('[data-victory-row]')].map(r => `${r.querySelector('span')?.textContent} ${r.querySelector('b')?.textContent}`),
    score: document.getElementById('victory-match-score')?.textContent, newBtn: vis(document.getElementById('btn-new-player')), rating: !!document.getElementById('skill-rating-value') || !!document.getElementById('skill-graph-canvas'),
    lost: m.classList.contains('natpf-lost'), inView: (() => { const r = m.querySelector('.nt-skill-card').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })() };
});

const B = await launch();
try {
  const { p: g, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const shot = async (name, el = g) => { if (el === g) await g.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await el.screenshot({ path: `${OUT}/${name}.png` }); log('schermata ' + name); };
  // voci annunciate (per la voce di fine partita)
  await g.evaluate(() => { const A = __natpfTennis.audioEngine; window.__voices = []; if (A){ const f = A.announceScore.bind(A); A.announceScore = (v, o) => { __voices.push(v); return f(v, o); }; } });
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });

  /* ---------- A. contro la CPU ---------- */
  await g.evaluate(() => { __natpfTennis.natpfUi.events.nickname = 'Marco'; __natpfTennis.natpfUi.hand.set('left'); });
  await g.click('[data-menu="play"]');
  await until(g, () => __natpfTennis.natpfUi.lobby.step === 'mode', null, 5000);
  await g.click('[data-mode="cpu"]');
  await until(g, () => __natpfTennis.natpfUi.lobby.step === 'controller', null, 5000);
  await g.click('[data-page="controller"] [data-natpf-controller="phone"]');
  await until(g, () => __natpfTennis.natpfUi.lobby.step === 'connect' && __natpfTennis.natpfPhone.pairingUrl, null, 30000);
  const url = await g.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: ph } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await ph.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await ph.waitForSelector('#enable:not(.hidden)', { timeout: 15000 }).catch(() => {});
  await ph.click('#enable');
  const tut1 = await until(g, () => __natpfTennis.natpfUi.training.active && __natpfTennis.natpfUi.training.tutorialOpen, null, 15000);
  const cards1 = await g.evaluate(() => document.querySelectorAll('#natpf-tutorial .tut-dot').length);
  check('A1. primo visitatore: in campo il tutorial corto (5 schede)', tut1 && cards1 === 5, `schede ${cards1}`);
  await ph.waitForSelector('#tutOk:not(.hidden)', { timeout: 15000 }); await seeAllCards(ph); await ph.click('#tutOk');
  // mancino (scelto prima): il primo gesto della calibrazione è il dritto del mancino
  const planL = (await import('../../site/js/tennis/calibration.js')).calibrationPlan({ quick: true, hand: 'left' });
  check(GESTI ? '   calibrazione del primo visitatore (mancino) fatta' : '   (calibrazione di base) telefono del primo visitatore pronto senza gesti', await calibrate(ph, planL));
  check('   poi la pagina «Partita»', await until(g, () => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'match', null, 20000));
  const before = await who(g);
  check('   primo visitatore: nome, mano sinistra, tutorial visto, calibrato', before.nick === 'Marco' && before.hand === 'left' && before.tutSeen && before.ready && before.profile, JSON.stringify(before));
  await g.click('#btn-start-match');
  // B28, calibrazione di base («Giocando»): dopo «Gioca» gli scambi di prova (giocati dal telefono simulato), poi la partita
  if (!GESTI){ const tr = await throughTrial(g, { p1: ph }); check('   (calibrazione di base) scambi di prova giocati dal mancino, poi la partita vera', tr.trial && tr.match && ['full', 'ok'].includes(tr.levels[0]), JSON.stringify(tr)); }
  await until(g, () => !__natpfTennis.natpfUi.lobby.visible && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY'].includes(__natpfTennis.phase), null, 15000);
  // qualche colpo vero per insegnare il colpo tipico (poi deve sparire con «Nuovo giocatore»)
  const typical = await g.evaluate(() => { const P = __natpfTennis.natpfPhone; for (const v of [700, 720, 710, 705]) P.typicalModel.learn(v, null); return P.typicalModel.value; });
  check('   colpo tipico imparato giocando', typical > 0, String(typical));
  await sleep(500);
  check('A2. partita portata alla fine (vince Marco)', (await finish(g, 'player')) === 'MATCH_OVER');
  const vOpen = await until(g, () => !document.getElementById('victory-modal').classList.contains('hidden'), null, 6000);
  await sleep(400);
  let vic = await victory(g);
  check('   schermata finale: «Vince Marco!», righe con i nomi e i game, niente rating finto, «Nuovo giocatore» in vista', vOpen && vic.title === 'Vince Marco!' && vic.rows.join('|') === 'Marco 1|CPU 0' && !vic.rating && vic.newBtn && !vic.lost && vic.inView, JSON.stringify(vic));
  const voices = await g.evaluate(() => window.__voices.slice(-3));
  check('   voce di fine partita «Game Set and Match»', voices.includes('Game Set and Match'), JSON.stringify(voices));
  await shot('A2-fine-partita-1280');
  // schermo piccolo dell'evento (1024×600): la schermata finale intera, «Nuovo giocatore» compreso
  await g.setViewportSize({ width: 1024, height: 600 }); await sleep(500);
  vic = await victory(g);
  const btn600 = await g.evaluate(() => { const r = document.getElementById('btn-new-player').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
  check('   1024×600: schermata finale intera e «Nuovo giocatore» in vista', vic.inView && btn600, JSON.stringify({ inView: vic.inView, btn600 }));
  await shot('A2-fine-partita-1024x600');
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(300);
  const pairs0 = before.pairs;
  await g.click('#btn-new-player');
  await sleep(600);
  const after = await who(g), phA = await phoneState(ph);
  check('A3. «Nuovo giocatore»: nome, tutorial visto, calibrazione e colpo tipico azzerati, mano «Destra»', after.nick === '' && !after.tutSeen && !after.ready && !after.profile && after.typical == null && after.hand === 'right', JSON.stringify(after));
  check('   telefono ancora collegato, stesso abbinamento (niente QR da rifare), in attesa del tutorial', after.connected && after.pairs === pairs0 && after.link === 'connected' && phA.link === 'on' && phA.screen === 'tutorial', JSON.stringify({ after, phA }));
  const nickV = await g.evaluate(() => ({ open: !document.getElementById('natpf-nick').classList.contains('hidden'), hand: !document.getElementById('nick-hand').classList.contains('hidden'), title: document.getElementById('nick-title').textContent, skip: document.getElementById('nick-cancel').textContent }));
  check('   passo del nome con la mano («Come ti chiami?», «Salta»)', nickV.open && nickV.hand && nickV.title === 'Come ti chiami?' && nickV.skip === 'Salta', JSON.stringify(nickV));
  await shot('A3-nome-1280');
  await g.setViewportSize({ width: 1024, height: 600 }); await sleep(500);
  const nick600 = await g.evaluate(() => { const r = document.querySelector('#nick-form .sheet-actions').getBoundingClientRect(), h = document.getElementById('nick-hand').getBoundingClientRect(); return { actions: r.bottom <= innerHeight, hand: h.height > 0 && h.bottom <= innerHeight }; });
  check('   1024×600: passo del nome con la mano e i pulsanti in vista', nick600.actions && nick600.hand, JSON.stringify(nick600));
  await shot('A3-nome-1024x600');
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(300);
  await g.fill('#nick-input', 'Bea');
  await g.click('#nick-hand [data-natpf-hand="right"]');
  await g.click('#nick-form button[type="submit"]');
  const tut2 = await until(g, () => __natpfTennis.natpfUi.training.active && __natpfTennis.natpfUi.training.tutorialOpen, null, 15000);
  const cards2 = await g.evaluate(() => document.querySelectorAll('#natpf-tutorial .tut-dot').length);
  check('A4. Bea: in campo di nuovo il tutorial corto (5 schede), il telefono lo aspetta', tut2 && cards2 === 5 && (await phoneState(ph)).screen === 'tutorial', `schede ${cards2}`);
  await shot('A4-tutorial-bea-1280');
  await ph.waitForSelector('#tutOk:not(.hidden)', { timeout: 15000 }); await seeAllCards(ph); await ph.click('#tutOk');
  check(GESTI ? '   la calibrazione di Bea (destra) dal primo gesto' : '   (calibrazione di base) telefono di Bea pronto senza gesti', await calibrate(ph, QUICK_PLAN));
  check('   poi la pagina «Partita»', await until(g, () => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'match', null, 20000));
  const bea = await who(g);
  check('   Bea: nome, mano destra, tutorial visto, calibrata, sempre lo stesso abbinamento', bea.nick === 'Bea' && bea.hand === 'right' && bea.tutSeen && bea.ready && bea.profile && bea.pairs === pairs0, JSON.stringify(bea));
  await ph.close();

  /* ---------- B. stesso schermo, vince il Player 2 ---------- */
  await g.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.backToMenu(); ui.lobby.menu('play'); });
  await sleep(300);
  await g.click('[data-mode="split"]');
  await until(g, () => __natpfTennis.natpfUi.lobby.step === 'connect', null, 8000);
  await g.fill('[data-split-name="p1"]', 'Giulia'); await g.fill('[data-split-name="p2"]', 'Marco');
  await g.waitForFunction(() => __natpfTennis.natpfPhone.pairingUrl && __natpfTennis.natpfPhone2?.pairingUrl, null, { timeout: 30000 });
  const [u1, u2] = await g.evaluate(() => [__natpfTennis.natpfPhone.pairingUrl, __natpfTennis.natpfPhone2.pairingUrl]);
  const { p: ph1 } = await page(B, u1, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  const { p: ph2 } = await page(B, u2, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  for (const p of [ph1, ph2]) await p.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  for (const p of [ph1, ph2]){ await p.waitForSelector('#enable:not(.hidden)', { timeout: 15000 }).catch(() => {}); await p.click('#enable'); }
  await until(g, () => { const S = __natpfTennis.natpfUi.split; return S.tutOpen.p1 && S.tutOpen.p2; });
  for (const p of [ph1, ph2]){ await p.waitForSelector('#tutOk:not(.hidden)', { timeout: 15000 }); await seeAllCards(p); await p.click('#tutOk'); }
  check(GESTI ? 'B1. due telefoni calibrati' : 'B1. (calibrazione di base) due telefoni pronti senza gesti', (await calibrate(ph1)) && (await calibrate(ph2)));
  check('   conto alla rovescia e partita nello stesso schermo', await until(g, () => !!__natpfTennis.natpfSplit?.active && !__natpfTennis.natpfUi.lobby.visible, null, 20000));
  if (!GESTI){ const tr = await throughTrial(g, { p1: ph1, p2: ph2 }); check('   (calibrazione di base) scambi di prova per tutti e due, poi la partita vera', tr.trial && tr.match, JSON.stringify(tr)); }
  const splitPairs = [(await who(g, 'p1')).pairs, (await who(g, 'p2')).pairs];
  const tags = () => g.evaluate(() => ['p1', 'p2'].map(id => document.querySelector(`[data-split-tag="${id}"] b`)?.textContent));
  const tags0 = await tags();
  check('   targhette in campo con i nomi scritti («Giulia», «Marco»)', tags0.join('|') === 'Giulia|Marco', JSON.stringify(tags0));
  await g.evaluate(() => { window.__voices.length = 0; });
  // un punto a testa per vedere il banner: «0» e non «00»
  const banner = await g.evaluate(() => { const E = __natpfTennis; E._awardPoint('opponent', 'Out'); return { text: E.lastBannerBroadcast.text, sub: E.lastBannerBroadcast.subText }; });
  check('B2. banner del punto con i nomi e lo zero «0» (non «00»)', banner.text === 'Punto Marco' && /Giulia 0 · Marco 15$/.test(banner.sub), JSON.stringify(banner));
  check('   partita vinta dal Player 2 (Marco)', (await finish(g, 'opponent')) === 'MATCH_OVER');
  const endBanner = await g.evaluate(() => __natpfTennis.lastBannerBroadcast.text);
  await until(g, () => !document.getElementById('victory-modal').classList.contains('hidden'), null, 6000);
  await sleep(400);
  vic = await victory(g);
  const v2 = await g.evaluate(() => window.__voices.slice());
  check('   banner «Vince Marco!», schermata finale «Vince Marco!» con le due righe, voce «Game Set and Match»', endBanner === 'Vince Marco!' && vic.title === 'Vince Marco!' && vic.rows.join('|') === 'Giulia 0|Marco 1' && !vic.lost && v2.includes('Game Set and Match'), JSON.stringify({ endBanner, vic, v2 }));
  await shot('B2-fine-split-vince-p2-1280');
  await g.click('#btn-new-player');
  const back = await until(g, () => { const L = __natpfTennis.natpfUi.lobby; return L.visible && L.mode === 'split' && L.step === 'connect'; }, null, 8000);
  const reopened = await until(g, () => { const S = __natpfTennis.natpfUi.split; return S.tutOpen.p1 && S.tutOpen.p2; }, null, 10000);
  const s1 = await who(g, 'p1'), s2 = await who(g, 'p2');
  const inputs = await g.evaluate(() => [...document.querySelectorAll('[data-split-name]')].map(i => i.value));
  const tags1 = await tags();
  check('B3. «Nuovo giocatore» nello stesso schermo: pagina dei due telefoni, nomi vuoti, tutorial di nuovo nelle due metà', back && reopened && inputs.join('|') === '|' && s1.names.p1 === 'Player 1' && s1.names.p2 === 'Player 2', JSON.stringify({ inputs, names: s1.names }));
  check('   targhette in campo azzerate («Player 1», «Player 2»: revisione B18)', tags1.join('|') === 'Player 1|Player 2', JSON.stringify(tags1));
  check('   i due telefoni sempre collegati con lo stesso abbinamento, calibrazione da rifare', s1.connected && s2.connected && s1.pairs === splitPairs[0] && s2.pairs === splitPairs[1] && !s1.ready && !s2.ready && !s1.tutSeen && !s2.tutSeen, JSON.stringify({ s1, s2 }));
  await shot('B3-nuovi-giocatori-split-1280');
  check('nessun errore nella pagina del gioco', !errs.length, errs.slice(0, 3).join(' | '));
} catch (e){ check('prova completata senza eccezioni', false, e.stack || String(e)); }
finally {
  await B.close(); stop();
  summary();
  setTimeout(() => process.exit(), 300);
}
