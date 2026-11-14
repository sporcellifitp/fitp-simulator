// NATPF B28 (12/11/2026) · Calibrazione giocando, nel gioco vero con il telefono simulato (pagina vera del telefono,
// eventi devicemotion sintetici, comandi veri dell'interfaccia). Richiesta dell'utente allo stand: «si parte con qualche
// scambio, il software deve capire bene destra e sinistra, velocità ed i parametri necessari, e poi dopo circa 10-15 secondi
// di scambi, parte il match vero».
//   FLOW=minigioco (B28.1): Minigiochi → minigioco → scambi di prova → minigioco, «Riprova», di nuovo dal menu
//   FLOW=singolo (predefinito)  menu → Gioca → Contro la CPU → Smartphone → telefono («Attiva i sensori», «Tutto chiaro»
//                 dalla PRIMA scheda) → scambi di prova → «Pronto per la partita» → pagina «Pronto per la partita» con
//                 «Chi gioca», «Personaggi» e «Altre impostazioni» (B35, collaudo dell'utente del 13/11: prima la partita
//                 partiva da sola; «Ricalibra» dalla pagina: di nuovo gli scambi di prova da capo e la pagina) → «Gioca» →
//                 partita da 0-0; «Ricalibra» dalla pausa a partita in corso → scambi di prova e punto rigiocato (la
//                 stessa partita); poi menu → «Gioca» → di nuovo gli scambi di prova da capo (molte persone, un
//                 telefono) → pagina → «Gioca» → seconda partita
//   FLOW=stesso   Gioca → Stesso schermo → due telefoni → conto alla rovescia → scambi di prova per tutti e due → partita
//   HAND=left     mancino (la mano si sceglie nel gioco: la prima palla va alla sua sinistra, sul dritto)
//   HITS=all|none|one   chi gioca colpisce tutte le palle, nessuna (la partita parte lo stesso allo scadere), una per lato
//   VIEW=1280x720 (predefinito) | 1024x1024 (il ledwall 2×2 dello stand): misura della pagina del gioco e delle schermate
//   SHOTS=1       schermate anche durante gli scambi di prova (fermano il gioco per circa un secondo ciascuna: i secondi
//                 misurati non valgono, la verifica del tempo si salta); senza, i secondi sono quelli veri
//   cd tools/e2e && CHROMIUM_PATH=… GAME_PORT=… PEER_PORT=… OUT=cartella node natpf-scambi-di-prova.mjs
// Misura i secondi degli scambi di prova (da «Tutto chiaro» alla pagina «Pronto per la partita»; nello stesso schermo dalla
// fine del conto al primo punto vero). Eventi devicemotion sintetici: non sostituiscono un telefono vero né il tempo di
// una persona.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const FLOW = process.env.FLOW || 'singolo', HAND = process.env.HAND === 'left' ? 'left' : 'right', HITS = process.env.HITS || 'all', OUT = SP;
const [VW, VH] = (process.env.VIEW || '1280x720').split('x').map(Number), SHOTS = process.env.SHOTS === '1';
const TAG = `${FLOW}-${HAND === 'left' ? 'sx' : 'dx'}-${HITS}-${VW}x${VH}`;
const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9195), GAME_PORT = +(process.env.GAME_PORT || 3195);
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
const GAME_URL = `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`;

const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); },
    run(fn, ms){ window.__busy = true; return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); window.__busy = false; r(); } }, 10); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    // gesto attorno alla verticale: +1 da destra a sinistra (palla alla destra di chi gioca), −1 il contrario
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  // schermate del telefono viste (calibrazione compresa: nel percorso di base non deve comparire) e scritte grandi
  window.__seen = { screens: new Set(), bigs: new Set() };
  setInterval(() => { const R = window.__racchetta; if (!R) return; window.__seen.screens.add(R.state.screen + (R.state.screen === 'cal' ? ':' + R.state.step : '')); const b = document.getElementById('big')?.textContent; if (b) window.__seen.bigs.add(b); }, 40);
};
const until = (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
const pages = {};
let shotN = 0;
async function shot(who, name){
  const p = pages[who]; if (!p) return;
  if (who === 'pc') await p.evaluate(() => { try { __natpfTennis.__render?.(); } catch {} });
  await p.screenshot({ path: `${OUT}/prova-${TAG}-${String(++shotN).padStart(2, '0')}-${who}-${name}.png` }).catch(e => log('schermata non riuscita ' + e.message));
}
async function phoneFlow(who, url){
  const { p } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  pages[who] = p;
  await p.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await p.waitForSelector('#enable:not(.hidden)', { timeout: 15000 }).catch(() => {});
  await p.click('#enable');
  return p;
}
// stato degli scambi di prova letto dal gioco (una chiamata): fase, palla in arrivo, tempo all'impatto, lato per chi gioca
const trialState = () => pages.pc.evaluate(async () => {
  const E = __natpfTennis, T = E.natpfUi.trial, m = window.__pr ||= await import('/src/natpf/natpf_phone_racket.js');
  const out = { active: T.active, phase: T.S?.phase || null, receiver: T.S?.receiver || null, seq: E.natpfMatchSeq || 0, enginePhase: E.phase, t: T.S?.t ?? null, ball: T.S ? Object.fromEntries(Object.entries(T.S.players).map(([k, v]) => [k, v.balls])) : null };
  for (const id of ['p1', 'p2']){
    const P = id === 'p2' ? E.natpfPlanP2 : E.natpfPlan, mine = id === 'p2' ? 'opponent' : 'player';
    const ph = id === 'p2' ? E.natpfPhone2 : E.natpfPhone;
    out[id] = { left: P && E.ball.inPlay && E.ball.lastHitter !== mine ? +(P.at + P.t - E.elapsedTime).toFixed(3) : null, at: P ? P.at : null, want: m.ballSideNow(E, id, ph?.trial?.at ?? null) };
  }
  return out;
});
// gioca gli scambi di prova con i telefoni simulati: hit(id, n) dice se il giocatore colpisce la sua palla numero n
async function playTrial(phones, hit = () => true, { shots = SHOTS, max = 40000 } = {}){
  const t0 = Date.now(), seen = { p1: null, p2: null }, n = { p1: 0, p2: 0 }, log2 = [];
  let shotIntro = false, shotBall = false, shotGo = false;
  while (Date.now() - t0 < max){
    const s = await trialState();
    if (!s.active) return { seconds: (Date.now() - t0)/1000, log: log2, ended: true };
    if (shots && !shotIntro && s.phase === 'intro'){ shotIntro = true; await shot('pc', 'scambi-di-prova-inizio'); for (const k of Object.keys(phones)) await shot(k, 'scambi-di-prova'); }
    if (shots && !shotGo && s.phase === 'outro'){ shotGo = true; await shot('pc', 'si-comincia'); }
    for (const id of Object.keys(phones).map(k => (k === 'tel2' ? 'p2' : 'p1'))){
      const st = s[id], ph = phones[id === 'p2' ? 'tel2' : 'tel1'];
      if (s.phase !== 'ball' || s.receiver !== id || st.left == null || st.at === seen[id]) continue;
      if (shots && !shotBall && st.left < .7 && (s.ball?.p1 || 0) >= 1){ shotBall = true; await shot('pc', 'scambi-di-prova-palla'); }
      if (st.left < .2){
        seen[id] = st.at; n[id]++;
        if (hit(id, n[id])){ log2.push({ id, want: st.want, at: +((Date.now() - t0)/1000).toFixed(1) }); ph.evaluate(sign => { __up.swing(sign).then(() => __up.still(250)); }, st.want || 1).catch(() => {}); }
      }
    }
    await sleep(25);
  }
  return { seconds: (Date.now() - t0)/1000, log: log2, ended: false };
}
const gameInfo = () => pages.pc.evaluate(() => {
  const E = __natpfTennis, ui = E.natpfUi, info = P => P ? { ready: P.ready, simple: !!P.profile?.simple, level: P.profile?.trialLevel || null, refs: P.profile?.refs || null, sign: P.dirSign, typical: P.typicalModel.value, aim: [P.aimModel.center(1), P.aimModel.center(-1)], hand: P.hand } : null;
  return { seq: E.natpfMatchSeq || 0, phase: E.phase, score: [E.score.playerPoints, E.score.opponentPoints, E.score.playerGames, E.score.opponentGames], lobby: ui.lobby.visible ? ui.lobby.step : null,
    trialHud: !document.getElementById('natpf-trial').classList.contains('hidden'), split: !!E.natpfSplit?.active, p1: info(E.natpfPhone), p2: info(E.natpfPhone2), cal: ui.phone.calMode };
});
const hitOf = (id, k) => (HITS === 'none' ? false : HITS === 'one' ? k <= 2 : true);

const B = await launch();
const res = { flow: FLOW, hand: HAND, hits: HITS, view: `${VW}x${VH}` };
try {
  const { p: pc, errs } = await page(B, GAME_URL, { w: VW, h: VH });
  pages.pc = pc;
  await pc.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await pc.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  check('opzione dello stand di base: «Giocando»', (await gameInfo()).cal === 'play');
  if (FLOW === 'minigioco'){
    // B28.1 · minigioco nella modalità di base: Minigiochi → un minigioco → nome → Smartphone → telefono → tutorial corto →
    // scambi di prova → minigioco; «Riprova» senza rifarli; dal menu un altro minigioco (un'altra persona, per quel che
    // ne sa il gioco) li rifà da un profilo nuovo
    await pc.click('[data-menu="challenges"]');
    await until(pc, () => __natpfTennis.natpfUi.lobby.step === 'challenges' && document.querySelector('[data-challenge="rush"]'), null, 8000);
    await pc.click('[data-challenge="rush"]');
    await until(pc, () => !document.getElementById('natpf-nick').classList.contains('hidden'), null, 5000);
    await pc.fill('#nick-input', 'Marta'); await pc.click('#nick-form button[type="submit"]');
    await until(pc, () => __natpfTennis.natpfUi.lobby.step === 'controller', null, 8000);
    await pc.click('[data-page="controller"] [data-natpf-controller="phone"]');
    await until(pc, () => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, 30000);
    const ph = await phoneFlow('tel1', await pc.evaluate(() => __natpfTennis.natpfPhone.pairingUrl));
    check('minigioco: tutorial corto aperto in campo', await until(pc, () => __natpfTennis.natpfUi.training.tutorialOpen, null, 15000));
    await until(ph, () => { const b = document.getElementById('tutOk'); return b && !b.classList.contains('hidden') && !b.disabled; }, null, 5000);
    const tGo = Date.now();
    await ph.click('#tutOk');
    const cmdsOf = () => pc.evaluate(() => (window.__cmds ||= (() => { const L = __natpfTennis.natpfPhone.link, a = [], c = L.cmd.bind(L); L.cmd = x => { a.push(x); return c(x); }; return a; })()).slice());
    check('dopo «Tutto chiaro»: scambi di prova in campo, il minigioco non è ancora partito', await until(pc, () => __natpfTennis.natpfUi.trial.active && !__natpfTennis.natpfUi.events.active, null, 12000));
    await cmdsOf();
    const r = await playTrial({ tel1: ph }, hitOf);
    const started = await until(pc, () => !!__natpfTennis.natpfUi.events.active && !__natpfTennis.natpfUi.trial.active, null, 8000);
    const secs = (Date.now() - tGo)/1000; res.secondsToFirstPoint = +secs.toFixed(1); res.trial = r;
    const i1 = await gameInfo(), ev1 = await pc.evaluate(() => ({ id: __natpfTennis.natpfUi.events.active?.id, seq: __natpfTennis.natpfUi.activitySeq, score: __natpfTennis.natpfUi.events.active?.score }));
    check(`il minigioco parte da solo dopo gli scambi di prova (${secs.toFixed(1)} s da «Tutto chiaro»), punteggio 0`, started && ev1.id === 'rush' && ev1.score === 0 && ev1.seq === 1, JSON.stringify(ev1));
    check('profilo imparato dagli scambi di prova, scritta tolta', !i1.p1.simple && i1.p1.level === 'full' && !i1.trialHud, JSON.stringify(i1.p1));
    await sleep(500); await shot('pc', 'minigioco');
    // «Riprova» (la stessa persona): il minigioco riparte subito, niente scambi di prova e niente profilo da capo
    await pc.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; __natpfTennis.natpfUi.events.abort(); L._resultAction('again'); });
    const again = await until(pc, () => !!__natpfTennis.natpfUi.events.active && !__natpfTennis.natpfUi.trial.active, null, 5000);
    await sleep(600);
    const i2 = await gameInfo(), c2 = await cmdsOf();
    check('«Riprova»: minigioco subito, senza scambi di prova, con lo stesso profilo', again && !i2.p1.simple && i2.p1.level === 'full' && c2.length === 0, JSON.stringify({ p1: i2.p1, cmds: c2 }));
    // menu → lo stesso minigioco di nuovo: scambi di prova da un profilo nuovo
    await pc.evaluate(() => __natpfTennis.natpfUi.backToMenu());
    await until(pc, () => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, 5000);
    await pc.click('[data-menu="challenges"]');
    await until(pc, () => __natpfTennis.natpfUi.lobby.step === 'challenges', null, 5000);
    await pc.click('[data-challenge="rush"]');
    await until(pc, () => __natpfTennis.natpfUi.lobby.step === 'controller', null, 8000);
    await pc.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.go('connect'); });
    await sleep(400);
    await pc.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; if (L.visible && L.step === 'connect') L.next(); });
    const trial2 = await until(pc, () => __natpfTennis.natpfUi.trial.active && !__natpfTennis.natpfUi.events.active, null, 10000);
    await sleep(400);
    const i3 = await gameInfo(), c3 = await cmdsOf();
    check('dal menu un altro minigioco: scambi di prova di nuovo, da un profilo semplice nuovo', trial2 && c3.join() === 'cal,skip' && i3.p1.simple, JSON.stringify({ cmds: c3, p1: i3.p1 }));
    await pc.evaluate(() => document.getElementById('trial-skip').click());
    check('«Salta ›»: il minigioco parte subito', await until(pc, () => !!__natpfTennis.natpfUi.events.active && !__natpfTennis.natpfUi.trial.active, null, 5000));
  } else {
  await pc.click('[data-menu="play"]');
  if (FLOW === 'singolo'){
    await pc.click('[data-mode="cpu"]');
    await until(pc, () => __natpfTennis.natpfUi.lobby.step === 'controller', null, 8000);
    if (HAND === 'left') await pc.evaluate(() => { __natpfTennis.natpfUi.hand.set('left'); __natpfTennis.natpfUi.paintTiles(); });
    await pc.click('[data-page="controller"] [data-natpf-controller="phone"]');
    await until(pc, () => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, 30000);
    const ph = await phoneFlow('tel1', await pc.evaluate(() => __natpfTennis.natpfPhone.pairingUrl));
    // tutorial corto in campo: «Tutto chiaro» acceso da subito sul telefono, X accesa sul computer
    check('tutorial corto aperto in campo', await until(pc, () => __natpfTennis.natpfUi.training.tutorialOpen, null, 15000));
    const tut = await until(ph, () => { const b = document.getElementById('tutOk'); return b && !b.classList.contains('hidden') && !b.disabled; }, null, 5000);
    const g0 = await ph.evaluate(() => ({ ...window.__racchetta.state.gate }));
    check('telefono: «Tutto chiaro, ho capito» acceso alla prima scheda, senza averne vista nessuna', tut && g0.i === 0 && g0.s <= 1, JSON.stringify(g0));
    const x = await pc.evaluate(() => { const b = document.querySelector('#natpf-tutorial .tut-x'); return { off: b.classList.contains('off'), title: b.title, wait: document.querySelector('#natpf-tutorial .tut-wait').textContent }; });
    check('computer: X accesa da subito, frase breve «quando vuoi»', !x.off && /Chiudi/.test(x.title) && /quando vuoi/.test(x.wait) && x.wait.length < 100, JSON.stringify(x));
    await sleep(300); await shot('pc', 'tutorial'); await shot('tel1', 'tutorial');
    const tTut = Date.now();
    await ph.click('#tutOk');
    // B35: niente calibrazione con i gesti: subito gli scambi di prova in campo, la partita non parte
    check('dopo «Tutto chiaro»: scambi di prova in campo, senza calibrazione, la partita non è partita', await until(pc, () => __natpfTennis.natpfUi.trial.active && !(__natpfTennis.natpfMatchSeq > 0) && __natpfTennis.natpfPhone.soonReady, null, 10000), `${Date.now() - tTut} ms`);
    res.tutorialToTrialMs = Date.now() - tTut;
    const seen0 = await ph.evaluate(() => ({ screens: [...window.__seen.screens], bigs: [...window.__seen.bigs] }));
    check('telefono: nessun gesto di calibrazione chiesto (mai il passo dei gesti)', !seen0.screens.some(s => /^cal:(swings|shots|review|free)/.test(s)) && !seen0.bigs.some(b => /Dritto|Rovescio|Fatto|Da rifare/.test(b)), JSON.stringify(seen0));
    await sleep(250);
    const hud = await pc.evaluate(() => { const el = document.getElementById('natpf-trial'), c = el.querySelector('.trial-card').getBoundingClientRect(), t = el.querySelector('.trial-title'), k = el.querySelector('.trial-kicker'); return { vis: !el.classList.contains('hidden'), kicker: k.textContent, title: t.textContent, sub: el.querySelector('[data-trial="sub"]')?.textContent || '', fs: parseFloat(getComputedStyle(t).fontSize), kfs: parseFloat(getComputedStyle(k).fontSize), box: [c.left, c.top, c.right, c.bottom].map(Math.round), w: innerWidth, h: innerHeight,
      skip: (() => { const b = document.getElementById('trial-skip'), r = b.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return { vis: r.width > 0 && r.right <= innerWidth && r.left >= c.right - 2, overPause: top !== b, text: b.textContent }; })() }; });
    check('scritta grande «Scambi di prova · Colpisci la palla» in alto, dentro lo schermo; sotto «poi scegli la partita»', hud.vis && /Scambi di prova/.test(hud.kicker) && /Colpisci la palla/i.test(hud.title) && /poi scegli la partita/.test(hud.sub) && hud.box[0] >= 0 && hud.box[2] <= hud.w && hud.box[1] >= 0 && hud.box[3] < hud.h*.4 && hud.skip.vis && !hud.skip.overPause, JSON.stringify(hud));
    check(`scritta leggibile da lontano: titolo ${hud.fs.toFixed(0)} px (almeno il 5 % dell’altezza), occhiello ${hud.kfs.toFixed(0)} px`, hud.fs >= hud.h*.05 && hud.kfs >= 15, JSON.stringify(hud));
    const tTrial = Date.now();
    let outroTitle = '';
    // (scritta grande alla fine: data-state «go»; si guarda finché gli scambi sono aperti)
    let trialOn = true;
    const watchOutro = (async () => { while (trialOn && !outroTitle){ outroTitle = await pc.evaluate(() => { const el = document.getElementById('natpf-trial'); return el?.dataset.state === 'go' && !el.classList.contains('hidden') ? el.querySelector('.trial-title').textContent : ''; }).catch(() => ''); await sleep(60); } })();
    const r = await playTrial({ tel1: ph }, hitOf);
    trialOn = false;
    // B35: alla fine la pagina «Pronto per la partita» con «Chi gioca», «Personaggi» e «Altre impostazioni»; la partita
    // parte solo con «Gioca»
    const atPage = await until(pc, () => { const L = __natpfTennis.natpfUi.lobby; return L.visible && L.step === 'match' && !__natpfTennis.natpfUi.trial.active; }, null, 10000);
    const secs = (Date.now() - tTrial)/1000; res.trialSeconds = +secs.toFixed(1); res.trial = r;
    await watchOutro;
    const page = await pc.evaluate(() => { const vis = id => { const n = document.getElementById(id); return !!n && !n.classList.contains('hidden') && n.offsetParent !== null; };
      return { title: document.getElementById('lobby-t-match').textContent, who: vis('difficulty-mode-group') && /Chi gioca/.test(document.getElementById('who-label').textContent), cast: vis('match-cast-row'), more: vis('match-more-btn') && /Altre impostazioni/.test(document.getElementById('match-more-btn').textContent),
        result: vis('lobby-practice-result') ? document.getElementById('lobby-practice-result').textContent : '', note: document.getElementById('lobby-match-note')?.textContent || '', seq: __natpfTennis.natpfMatchSeq || 0, demo: !!__natpfTennis.autoPlayMode }; });
    check('B35: finiti gli scambi di prova, «Pronto per la partita» e la pagina con «Chi gioca», «Personaggi», «Altre impostazioni»', atPage && page.title === 'Pronto per la partita' && page.who && page.cast && page.more, JSON.stringify({ atPage, outroTitle, ...page }));
    check('   scritta grande alla fine «Pronto per la partita» (non «Si comincia!»)', outroTitle === 'Pronto per la partita', outroTitle);
    check('   la partita NON è partita: si aspetta «Gioca» (dietro la partita dimostrativa)', page.seq === 0 && page.demo, JSON.stringify(page));
    check('   riga della pagina: com’è andata e «Scegli la partita e premi «Gioca»», niente riga «con Gioca prima gli scambi»', /Scegli la partita/.test(page.result) && !/scambi? di prova/.test(page.note), JSON.stringify({ result: page.result, note: page.note }));
    // (la prima palla aspetta il profilo da capo del telefono, chiesto alla chiusura del tutorial: qualche secondo in più
    // di quando gli scambi partivano da «Gioca», con il telefono già pronto)
    if (!SHOTS) check(`dalla scritta degli scambi di prova alla pagina «Pronto per la partita»: ${secs.toFixed(1)} s (${HITS === 'all' ? 'circa 10–17' : 'tetto circa 22'})`, HITS === 'all' ? secs >= 6 && secs <= 17.5 : secs <= 23, JSON.stringify(r.log));
    await sleep(500); await shot('pc', 'pronto-dopo-scambi'); await shot('tel1', 'pronto');
    if (HITS === 'all' && !process.env.SHORT){
      // B35: «Ricalibra» dal pannello del telefono sulla pagina: di nuovo gli scambi di prova, poi di nuovo la pagina
      await pc.evaluate(() => __natpfTennis.natpfUi.openPhone());
      await until(pc, () => { const b = document.getElementById('natpf-phone-recal'); return b && !b.classList.contains('hidden') && b.offsetParent !== null; }, null, 5000);
      await pc.click('#natpf-phone-recal');
      const recalOn = await until(pc, () => __natpfTennis.natpfUi.trial.active && !__natpfTennis.natpfUi.lobby.visible && !(__natpfTennis.natpfMatchSeq > 0), null, 5000);
      // (il profilo da capo è una richiesta al telefono: arriva dopo un attimo, prima della prima palla)
      const freshOk = await until(pc, () => { const P = __natpfTennis.natpfPhone; return !!P.profile?.simple && P.typicalModel.value == null && P.typicalModel.seen.length === 0; }, null, 4000);
      const fresh0 = await pc.evaluate(() => { const P = __natpfTennis.natpfPhone, T = __natpfTennis.natpfUi.trial; return { simple: !!P.profile?.simple, typical: P.typicalModel.value, seen: P.typicalModel.seen.length, balls: T.S?.players?.p1?.balls ?? null, panel: !document.getElementById('natpf-phone-modal').classList.contains('hidden') }; });
      check('B35: «Ricalibra» sulla pagina «Pronto per la partita» → di nuovo gli scambi di prova, profilo del telefono da capo, pannello chiuso (la partita non parte)', recalOn && freshOk && !fresh0.panel, JSON.stringify(fresh0));
      const rr = await playTrial({ tel1: ph }, () => true, { shots: false });
      const again0 = await until(pc, () => { const L = __natpfTennis.natpfUi.lobby; return L.visible && L.step === 'match' && !__natpfTennis.natpfUi.trial.active && !(__natpfTennis.natpfMatchSeq > 0); }, null, 10000);
      check('   poi di nuovo la pagina «Pronto per la partita», colpo reimparato', again0 && (await gameInfo()).p1.level === 'full', JSON.stringify(rr.log));
    }
    // «Gioca» → la partita parte subito, senza altri scambi
    const tGo = Date.now();
    await pc.click('#btn-start-match');
    const started = await until(pc, () => __natpfTennis.natpfMatchSeq === 1 && __natpfTennis.phase === 'SERVE_STANCE' && !__natpfTennis.natpfUi.trial.active, null, 8000);
    const goSecs = (Date.now() - tGo)/1000; res.secondsToFirstPoint = +goSecs.toFixed(1);
    check(`«Gioca»: la partita vera parte subito, al servizio, senza rifare gli scambi (${goSecs.toFixed(1)} s)`, started && goSecs < 4 && !(await pc.evaluate(() => __natpfTennis.natpfUi.trial.active)));
    const i1 = await gameInfo();
    check('partita da 0-0, scritta degli scambi di prova tolta', i1.score.join() === '0,0,0,0' && !i1.trialHud, JSON.stringify(i1.score));
    if (HITS === 'all'){
      check('colpite 4 palle, alternate dai due lati (la prima sul dritto)', r.log.length === 4 && r.log.map(x => x.want).join() === (HAND === 'left' ? '-1,1,-1,1' : '1,-1,1,-1'), JSON.stringify(r.log));
      check('profilo imparato: non più semplice, due colpi per lato, forza per verso, centro della mira', !i1.p1.simple && i1.p1.level === 'full' && i1.p1.refs[1] > 300 && i1.p1.refs[-1] > 300 && i1.p1.aim.every(a => a != null) && i1.p1.typical > 300, JSON.stringify(i1.p1));
      check('verso letto giusto (nessuna correzione con il telefono simulato)', i1.p1.sign === 1);
    } else if (HITS === 'none') check('nessun colpo: la partita parte lo stesso, profilo semplice (il gioco impara dai primi colpi veri)', i1.p1.simple && i1.p1.ready, JSON.stringify(i1.p1));
    else check('una palla per lato: profilo «ok» (come i due gesti di prima)', !i1.p1.simple && i1.p1.level === 'ok', JSON.stringify(i1.p1));
    check(`mano del gioco: ${HAND}`, i1.p1.hand === HAND);
    const seen1 = await ph.evaluate(() => ({ screens: [...window.__seen.screens], bigs: [...window.__seen.bigs], big: document.getElementById('big').textContent }));
    check('telefono: «Scambi di prova» durante gli scambi, poi lo schermo di gioco (al servizio)', seen1.bigs.includes('Scambi di prova') && /servizio|Pronto/i.test(seen1.big) && !seen1.screens.some(s => /^cal:(swings|review|free)/.test(s)), JSON.stringify(seen1));
    await sleep(600); await shot('pc', 'partita-0-0'); await shot('tel1', 'al-servizio');

    if (HITS === 'all' && !process.env.SHORT){
      // la diagnostica e i punti: i colpi di prova non hanno toccato il punteggio; «Ricalibra» dalla pausa rifà gli scambi
      await pc.evaluate(() => { const E = __natpfTennis; E.score.playerPoints = 2; E.score.opponentPoints = 1; E._syncScoreboardHUD(); });
      await pc.keyboard.press('Escape');
      await until(pc, () => __natpfTennis.natpfUi.pause.isOpen, null, 5000);
      await pc.click('[data-pause="phone"]');
      await until(pc, () => !document.getElementById('natpf-phone-modal').classList.contains('hidden'), null, 5000);
      await sleep(300); await shot('pc', 'pannello-telefono');
      const btn = await pc.evaluate(() => ['natpf-phone-recal', 'natpf-phone-gesti'].map(id => { const b = document.getElementById(id); return !b.classList.contains('hidden') && b.offsetParent !== null ? b.textContent : null; }));
      check('pannello del telefono: «Ricalibra» e «Calibra con i gesti»', btn[0] === 'Ricalibra' && btn[1] === 'Calibra con i gesti', JSON.stringify(btn));
      await pc.click('#natpf-phone-recal');
      check('«Ricalibra» in partita: di nuovo gli scambi di prova', await until(pc, () => __natpfTennis.natpfUi.trial.active, null, 5000));
      const r2 = await playTrial({ tel1: ph }, () => true, { shots: false });
      await until(pc, () => !__natpfTennis.natpfUi.trial.active && __natpfTennis.phase === 'SERVE_STANCE', null, 8000);
      const i2 = await gameInfo();
      check('dopo «Ricalibra»: stessa partita, punteggio com’era, punto da rigiocare', i2.seq === 1 && i2.score.join() === '2,1,0,0' && i2.phase === 'SERVE_STANCE' && r2.log.length >= 4, JSON.stringify(i2.score));
      // «molte persone, un telefono»: menu → «Gioca» di nuovo → scambi di prova da capo → pagina → «Gioca»
      await pc.evaluate(() => __natpfTennis.natpfUi.backToMenu('match'));
      await until(pc, () => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'match', null, 5000);
      await pc.click('#btn-start-match');
      await until(pc, () => __natpfTennis.natpfUi.trial.active, null, 5000);
      await sleep(700);
      const fresh = await pc.evaluate(() => { const P = __natpfTennis.natpfPhone; return { simple: !!P.profile?.simple, typical: P.typicalModel.value, seen: P.typicalModel.seen.length, aim: [P.aimModel.center(1), P.aimModel.center(-1)], ready: P.ready }; });
      check('partita nuova: il telefono riparte dal profilo semplice, niente di chi c’era prima (colpo tipico, mira)', fresh.simple && fresh.typical == null && fresh.seen === 0 && fresh.aim.every(a => a == null) && fresh.ready, JSON.stringify(fresh));
      const r3 = await playTrial({ tel1: ph }, () => true, { shots: false });
      const back = await until(pc, () => { const L = __natpfTennis.natpfUi.lobby; return L.visible && L.step === 'match' && !__natpfTennis.natpfUi.trial.active && (__natpfTennis.natpfMatchSeq || 0) === 1; }, null, 10000);
      check('B35: «Gioca» senza scambi fatti: li fa e torna alla pagina «Pronto per la partita» (la partita non parte)', back, JSON.stringify(r3.log));
      await pc.click('#btn-start-match');
      const again = await until(pc, () => __natpfTennis.natpfMatchSeq === 2 && __natpfTennis.phase === 'SERVE_STANCE' && !__natpfTennis.natpfUi.trial.active, null, 8000);
      check('seconda partita con «Gioca», di nuovo imparato', again && (await gameInfo()).p1.level === 'full', JSON.stringify(r3.log));
    }
  } else {
    await pc.click('[data-mode="split"]');
    await until(pc, () => __natpfTennis.natpfPhone.pairingUrl && __natpfTennis.natpfPhone2?.pairingUrl, null, 30000);
    const [u1, u2] = await pc.evaluate(() => [__natpfTennis.natpfPhone.pairingUrl, __natpfTennis.natpfPhone2.pairingUrl]);
    const ph1 = await phoneFlow('tel1', u1), ph2 = await phoneFlow('tel2', u2);
    check('tutorial aperto nelle due metà', await until(pc, () => { const S = __natpfTennis.natpfUi.split; return S.tutOpen.p1 && S.tutOpen.p2; }, null, 15000));
    await sleep(400); await shot('pc', 'tutorial-due');
    for (const ph of [ph1, ph2]){ await until(ph, () => { const b = document.getElementById('tutOk'); return b && !b.classList.contains('hidden') && !b.disabled; }, null, 8000); await ph.click('#tutOk'); }
    const tReady = Date.now();
    check('tutti e due pronti senza calibrazione («Si calibra giocando»), conto alla rovescia', await until(pc, () => __natpfTennis.natpfUi.split.bothReady() && __natpfTennis.natpfUi.split.countdownRunning, null, 10000));
    await shot('pc', 'pronti-conto');
    const st = await pc.evaluate(() => ['p1', 'p2'].map(id => __natpfTennis.natpfUi.split.status(id).sub));
    check('schede: «Si calibra giocando»', st.every(s => /Si calibra giocando/.test(s)), JSON.stringify(st));
    check('dopo il conto: sessione dello stesso schermo e scambi di prova', await until(pc, () => !!__natpfTennis.natpfSplit?.active && __natpfTennis.natpfUi.trial.active, null, 10000));
    const tGo = Date.now();
    const r = await playTrial({ tel1: ph1, tel2: ph2 }, hitOf);
    const started = await until(pc, () => __natpfTennis.natpfMatchSeq === 1 && __natpfTennis.phase === 'SERVE_STANCE' && !__natpfTennis.natpfUi.trial.active, null, 8000);
    const secs = (Date.now() - tGo)/1000; res.secondsToFirstPoint = +secs.toFixed(1); res.fromReady = +((Date.now() - tReady)/1000).toFixed(1); res.trial = r;
    check('la partita vera parte da sola nello stesso schermo', started && (await gameInfo()).split);
    if (SHOTS) log(`(con le schermate) dalla fine del conto al primo punto vero ${secs.toFixed(1)} s: non misurato`);
    else check(`dalla fine del conto al primo punto vero: ${secs.toFixed(1)} s (tetto circa 20)`, secs <= 20.5, JSON.stringify(r.log));
    const i1 = await gameInfo();
    check('partita da 0-0', i1.score.join() === '0,0,0,0' && !i1.trialHud);
    if (HITS === 'all'){
      const n1 = r.log.filter(x => x.id === 'p1').length, n2 = r.log.filter(x => x.id === 'p2').length;
      check(`palleggio assistito: ${n1} colpi del Player 1, ${n2} del Player 2`, n1 >= 4 && n2 >= 4, JSON.stringify(r.log));
      check('tutti e due hanno imparato (profilo non semplice)', !i1.p1.simple && !i1.p2.simple && ['full', 'ok'].includes(i1.p1.level) && ['full', 'ok'].includes(i1.p2.level), JSON.stringify([i1.p1, i1.p2]));
    }
    await sleep(600); await shot('pc', 'partita-0-0');
  }
  }
  check('nessun errore nella pagina del gioco', !errs.length, errs.slice(0, 3).join(' | '));
  writeFileSync(`${OUT}/prova-${TAG}.json`, JSON.stringify(res, null, 1));
  console.log(`\n${TAG}: da «Gioca» al primo punto vero ${res.secondsToFirstPoint} s`);
} catch (err){
  check(`flusso ${TAG}`, false, String(err?.stack || err).split('\n').slice(0, 3).join(' '));
} finally {
  await B.close(); stop(); summary(); process.exit(process.exitCode || 0);
}
