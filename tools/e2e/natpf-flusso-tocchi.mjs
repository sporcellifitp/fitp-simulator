// NATPF B16 (decisioni dell'utente dell'08/11 sera: tutorial corto prima della partita, riscaldamento facoltativo): tocchi
// dall'apertura alla prima palla, con il telefono simulato e i comandi veri dell'interfaccia, e schermate del flusso
// (computer 1280×720, telefono 390×844). Il percorso si adatta a quello che il gioco mostra: sfoglia le schede del tutorial
// finché «Tutto chiaro, ho capito» si accende, tocca «Salta ›» solo se dopo la calibrazione parte il riscaldamento, «Gioca»
// solo se c'è la pagina «Partita». Stesso script prima e dopo un cambio del flusso: i tocchi si confrontano.
// Si contano i tocchi e i tasti di chi gioca (computer e telefono); «QR» (inquadrare) e «link» (aprirlo) contano uno
// ciascuno; i gesti con il telefono (calibrazione: fermo e due gesti; servizio) non sono tocchi.
//   FLOW=singolo  Gioca → Contro la CPU → Smartphone → telefono → in campo → prima palla
//   FLOW=stesso   Gioca → Stesso schermo → due telefoni (ognuno il suo tutorial) → conto alla rovescia → prima palla
//   FLOW=1v1      host: Gioca → Sfida un amico → Smartphone → telefono → in campo → «Partita»; Player 2: link d'invito →
//                 «Sono pronto» → telefono → calibrazione; l'host «Gioca» → prima palla
//   cd tools/e2e && GAME_PORT=… PEER_PORT=… FLOW=singolo CHROMIUM_PATH=… node natpf-flusso-tocchi.mjs   (schermate in $OUT)
//   MAX_TAPS=n: verifica che il percorso non superi n tocchi (prova nel browser del flusso).
//   CAL=gesti|play|none (B28, th.mjs): opzione dello stand «Calibrazione»; senza, quella del gioco («Giocando»: niente gesti
//   di calibrazione, il tutorial si chiude dalla prima scheda, dopo «Gioca» gli scambi di prova e poi la partita). Si
//   misurano anche i secondi da «Gioca» (o dalla fine del conto) al primo punto vero, senza colpire nessuna palla (il caso
//   più lento: gli scambi di prova finiscono allo scadere).
// Eventi devicemotion sintetici: non sostituiscono un telefono vero né il tempo di una persona.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';
import { calibrationPlan } from '../../site/js/tennis/calibration.js';

const FLOW = process.env.FLOW || 'singolo', OUT = SP, QUICK_PLAN = calibrationPlan({ quick: true, hand: 'right' });
const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9181), GAME_PORT = +(process.env.GAME_PORT || 3181);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => console.log(`[${((Date.now() - T0)/1000).toFixed(0).padStart(3)} s] ${m}`);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const GAME_URL = (q = '') => `http://127.0.0.1:${GAME_PORT}/?peer=127.0.0.1:${PEER_PORT}${q}`;

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
const until = (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);

// tocchi: chi (pc, pc2, tel1, tel2), che cosa; schermata dopo ogni tocco
const taps = [];
let shotN = 0;
const pages = {};
async function shot(who, name){
  const p = pages[who]; if (!p) return;
  if (who.startsWith('pc')) await p.evaluate(() => { try { __natpfTennis.__render?.(); } catch {} });
  const file = `${FLOW}-${String(++shotN).padStart(2, '0')}-${who}-${name}.png`;
  await p.screenshot({ path: `${OUT}/${file}` }).catch(e => log('schermata non riuscita ' + e.message));
}
async function tap(who, label, fn){
  taps.push({ who, label }); log(`tocco ${taps.length} [${who}] ${label}`);
  if (fn) await fn();
  await sleep(350);
  await shot(who, label.replace(/[^a-z0-9àèéìòù]+/gi, '-').toLowerCase().slice(0, 40));
}
// calibrazione che ripete il gesto non riconosciuto (come natpf-split-ready.mjs)
async function calibrate(ph, ms = 60000){
  const t0 = Date.now();
  while (Date.now() - t0 < ms){
    const s = await ph.evaluate(() => { const R = window.__racchetta, st = R.state; return { sensor: st.sensor, step: st.step, ready: !!R.cal.state.ready, idx: R.cal.state.idx }; });
    if (s.sensor === 'ready') return true;
    if (s.step === 'swings' && s.ready){ const sign = QUICK_PLAN[s.idx] === 'R' ? -1 : 1; await ph.evaluate(sg => __up.swing(sg).then(() => __up.back(sg)).then(() => __up.still(700)), sign); }
    else await ph.evaluate(() => __up.still(150));
  }
  return false;
}
// tutorial sul telefono: «Avanti ›» finché «Tutto chiaro» non si accende (ogni scheda almeno 1 s a schermo), poi il tocco
async function tutorial(who){
  const ph = pages[who];
  const ok = await until(ph, () => { const b = document.getElementById('tutOk'); return b && !b.classList.contains('hidden'); }, null, 30000);
  if (!ok){ log(`${who}: nessun tutorial`); return { cards: 0, next: 0 }; }
  await shot(who, 'tutorial');
  let next = 0, n = 0;
  for (let k = 0; k < 40; k++){
    const st = await ph.evaluate(() => { const b = document.getElementById('tutOk'), g = window.__racchetta?.state?.gate; return { on: !!b && !b.disabled, g }; });
    n = st.g?.n || n;
    if (st.on) break;
    await sleep(1150);
    const g = (await ph.evaluate(() => window.__racchetta?.state?.gate)) || st.g;
    if (!g || !g.n) continue;
    let u = 0; while (u < g.n && (g.m >>> u) & 1) u++;
    if (u >= g.n || u === g.i) continue;
    if (u > g.i){ next++; await tap(who, `Avanti (scheda ${g.i + 2} di ${g.n})`, () => ph.evaluate(() => document.getElementById('tutNext').click())); }
    else await ph.evaluate(() => document.getElementById('tutPrev').click());
  }
  await tap(who, 'Tutto chiaro, ho capito', () => ph.click('#tutOk'));
  return { cards: n, next };
}
async function phoneFlow(who, url){
  await tap(who, 'QR (inquadra)');
  const { p } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  pages[who] = p;
  await p.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  taps.push({ who, label: 'link (apri)' }); log(`tocco ${taps.length} [${who}] link (apri)`);
  await p.waitForSelector('#enable:not(.hidden)', { timeout: 15000 }).catch(() => {});
  await shot(who, 'attiva-i-sensori');
  await tap(who, 'Attiva i sensori', () => p.click('#enable'));
  return p;
}
async function gamePage(who, q){
  const { p, errs } = await page(B, GAME_URL(q), { w: 1280, h: 720 });
  pages[who] = p;
  await p.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await p.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  return { p, errs };
}
// intro: «Premi un tasto» (un tasto a animazione finita)
async function intro(who){
  const p = pages[who];
  const on = await p.evaluate(() => !!__natpfTennis.natpfUi.intro?.active);
  if (!on) return;
  await p.evaluate(() => __natpfTennis.natpfUi.intro.finishAnimation());
  await shot(who, 'intro');
  await tap(who, 'tasto (intro)', () => p.keyboard.press('Enter'));
  await until(p, () => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, 20000);
}
// in campo dopo la calibrazione: riscaldamento (si salta: «Salta ›») o pagina «Partita»; «Gioca»
async function toMatch(who, { warmupShot = true } = {}){
  const p = pages[who];
  const where = async () => p.evaluate(() => { const T = __natpfTennis.natpfUi.training, L = __natpfTennis.natpfUi.lobby; return T.active && !T.cal && !T.tutorialOpen ? 'warmup' : L.visible && L.step === 'match' ? 'match' : null; });
  let w = null; for (let i = 0; i < 260 && !(w = await where()); i++) await sleep(150);
  log(`${who}: dopo la calibrazione → ${w}`);
  if (w === 'warmup'){
    if (warmupShot){ await sleep(1500); await shot(who, 'riscaldamento'); }
    await tap(who, 'Salta (riscaldamento)', () => p.click('#coach-exit'));
    await until(p, () => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'match', null, 15000);
  }
  await sleep(500); await shot(who, 'partita');
  return w;
}

const B = await launch();
const res = { flow: FLOW };
try {
  if (FLOW === 'singolo' || FLOW === '1v1'){
    const { errs } = await gamePage('pc', '');
    await intro('pc');
    await tap('pc', 'Gioca', () => pages.pc.click('[data-menu="play"]'));
    await tap('pc', FLOW === '1v1' ? 'Sfida un amico' : 'Contro la CPU', () => pages.pc.click(`[data-mode="${FLOW === '1v1' ? 'friend' : 'cpu'}"]`));
    await until(pages.pc, () => __natpfTennis.natpfUi.lobby.step === 'controller', null, 8000);
    await tap('pc', 'Smartphone', () => pages.pc.click('[data-page="controller"] [data-natpf-controller="phone"]'));
    await until(pages.pc, () => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, 30000);
    await shot('pc', 'collega');
    const url = await pages.pc.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
    const ph = await phoneFlow('tel1', url);
    await until(pages.pc, () => __natpfTennis.natpfUi.training.tutorialOpen, null, 15000);
    await sleep(1200); await shot('pc', 'tutorial');
    res.tutorial = await tutorial('tel1');
    await sleep(800); await shot('pc', 'calibrazione'); await shot('tel1', 'calibrazione');
    check('telefono calibrato', await calibrate(ph));
    await shot('tel1', 'pronto');
    res.after = await toMatch('pc');
    let invite = null;
    if (FLOW === '1v1'){
      invite = await pages.pc.evaluate(() => document.querySelector('#natpf-invite a')?.href || null);
      check('invito pronto', !!invite, invite || '');
      await gamePage('pc2', '');
      await pages.pc2.goto(invite.replace(/^http:\/\/[^/]+/, `http://127.0.0.1:${GAME_PORT}`), { waitUntil: 'domcontentloaded' });
      await pages.pc2.waitForFunction(() => window.__natpfTennis?.natpfUi?.versus && window.__natpfTennis.player?.model, null, { timeout: 120000 });
      await pages.pc2.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
      taps.push({ who: 'pc2', label: 'link d’invito (apri)' }); log(`tocco ${taps.length} [pc2] link d’invito`);
      await until(pages.pc2, () => !document.getElementById('natpf-guest-modal').classList.contains('hidden'), null, 30000);
      await sleep(800); await shot('pc2', 'stanza');
      await tap('pc2', 'Sono pronto', () => pages.pc2.click('#natpf-guest-go'));
      await until(pages.pc2, () => __natpfTennis.natpfPhone.pairingUrl, null, 30000);
      await shot('pc2', 'qr');
      const url2 = await pages.pc2.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
      const ph2 = await phoneFlow('tel2', url2);
      const tutGuest = await until(pages.pc2, () => __natpfTennis.natpfUi.training.tutorialOpen, null, 6000);
      res.tutorialGuest = tutGuest ? await tutorial('tel2') : { cards: 0, next: 0 };
      await sleep(800); await shot('pc2', 'calibrazione');
      check('telefono del Player 2 calibrato', await calibrate(ph2));
      const ready = await until(pages.pc, () => !document.getElementById('btn-start-match').disabled, null, 45000);
      check('l’host vede il Player 2 pronto', ready);
      await shot('pc2', 'pronto'); await shot('pc', 'partita-p2-pronto');
    }
    await tap('pc', 'Gioca', () => pages.pc.click('#btn-start-match'));
    const tGo = Date.now();
    const first = await until(pages.pc, () => !__natpfTennis.natpfUi.lobby.visible && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY'].includes(__natpfTennis.phase), null, 20000);
    check('prima palla: la partita (o gli scambi di prova) parte', first);
    res.trial = await pages.pc.evaluate(() => !!__natpfTennis.natpfUi.trial?.active);
    if (res.trial){ await sleep(1500); await shot('pc', 'scambi-di-prova'); await shot('tel1', 'scambi-di-prova'); }
    const real = await until(pages.pc, () => __natpfTennis.natpfMatchSeq >= 1 && !__natpfTennis.natpfUi.trial?.active && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY'].includes(__natpfTennis.phase), null, 30000);
    res.secondsToMatch = +((Date.now() - tGo)/1000).toFixed(1);
    check(`primo punto vero ${res.secondsToMatch} s dopo «Gioca»${res.trial ? ' (scambi di prova senza colpire: tetto circa 20 s)' : ''}`, real && res.secondsToMatch <= 22);
    await sleep(1200); await shot('pc', 'prima-palla'); await shot('tel1', 'prima-palla');
    if (FLOW === '1v1') await shot('pc2', 'prima-palla');
    check('nessun errore nella pagina del gioco', !errs.length, errs.slice(0, 3).join(' | '));
  } else if (FLOW === 'stesso'){
    const { errs } = await gamePage('pc', '');
    await intro('pc');
    await tap('pc', 'Gioca', () => pages.pc.click('[data-menu="play"]'));
    await tap('pc', 'Stesso schermo', () => pages.pc.click('[data-mode="split"]'));
    await until(pages.pc, () => __natpfTennis.natpfPhone.pairingUrl && __natpfTennis.natpfPhone2?.pairingUrl, null, 30000);
    await sleep(800); await shot('pc', 'collega-due');
    const [u1, u2] = await pages.pc.evaluate(() => [__natpfTennis.natpfPhone.pairingUrl, __natpfTennis.natpfPhone2.pairingUrl]);
    const ph1 = await phoneFlow('tel1', u1), ph2 = await phoneFlow('tel2', u2);
    await until(pages.pc, () => { const S = __natpfTennis.natpfUi.split; return S.tutOpen.p1 && S.tutOpen.p2; }, null, 15000);
    await sleep(1200); await shot('pc', 'tutorial-due');
    res.tutorial = await tutorial('tel1');
    check('telefono 1 calibrato', await calibrate(ph1));
    await shot('pc', 'p1-pronto');
    res.tutorial2 = await tutorial('tel2');
    check('telefono 2 calibrato', await calibrate(ph2));
    const first = await until(pages.pc, () => !!__natpfTennis.natpfSplit?.active && !__natpfTennis.natpfUi.lobby.visible && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY'].includes(__natpfTennis.phase), null, 20000);
    const tGo = Date.now();
    check('prima palla: conto alla rovescia e partita (o scambi di prova) senza toccare il computer', first);
    res.trial = await pages.pc.evaluate(() => !!__natpfTennis.natpfUi.trial?.active);
    if (res.trial){ await sleep(1500); await shot('pc', 'scambi-di-prova'); }
    const real = await until(pages.pc, () => __natpfTennis.natpfMatchSeq >= 1 && !__natpfTennis.natpfUi.trial?.active && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY'].includes(__natpfTennis.phase), null, 30000);
    res.secondsToMatch = +((Date.now() - tGo)/1000).toFixed(1);
    check(`primo punto vero ${res.secondsToMatch} s dopo la fine del conto${res.trial ? ' (scambi di prova senza colpire: tetto circa 20 s)' : ''}`, real && res.secondsToMatch <= 22);
    await sleep(1200); await shot('pc', 'prima-palla');
    check('nessun errore nella pagina del gioco', !errs.length, errs.slice(0, 3).join(' | '));
  }
  const by = taps.reduce((m, t) => { const k = t.who.startsWith('pc') ? 'computer' : 'telefono'; m[k] = (m[k] || 0) + 1; return m; }, {});
  res.taps = taps.length; res.by = by; res.list = taps;
  console.log(`\n${FLOW}: ${taps.length} tocchi (computer ${by.computer || 0}, telefono ${by.telefono || 0})`);
  console.log(taps.map((t, i) => `  ${i + 1}. [${t.who}] ${t.label}`).join('\n'));
  writeFileSync(`${OUT}/${FLOW}-tocchi.json`, JSON.stringify(res, null, 1));
  if (process.env.MAX_TAPS) check(`al massimo ${process.env.MAX_TAPS} tocchi`, taps.length <= +process.env.MAX_TAPS, String(taps.length));
} catch (err){
  check(`flusso ${FLOW}`, false, String(err?.stack || err).split('\n').slice(0, 3).join(' '));
} finally {
  await B.close(); stop(); summary(); process.exit(process.exitCode || 0);
}
