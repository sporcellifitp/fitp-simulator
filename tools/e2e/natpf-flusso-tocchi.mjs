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
//   FLOW=fiera    (B41.5) modalità fiera contro la CPU: lo staff prepara una volta il Telefono 1 dello stand (non contato);
//                 poi VISITORS visitatori di fila (di base 10): «Prossimo giocatore» → «Chi gioca» → «Sono pronto» sul telefono
//                 (o «Gioca») → scambi di prova → conto alla rovescia → partita (chiusa dalla prova) → di nuovo. Per ciascuno
//                 al massimo MAX_CLICKS clic (di base 2) e MAX_PHONE_TAPS tocchi (di base 1), nessun QR, nessuna
//                 calibrazione né tutorial, i telefoni sempre collegati (stesso collegamento). Doppio clic (il secondo clic
//                 110, 250 e 300 ms dopo) su «Prossimo giocatore» e su «Gioca»: non fa niente. Pagina con ?guardia=1 (la
//                 guardia del doppio clic del B39 come nel gioco vero)
//   FLOW=fiera-due  (B41.5) lo stesso in due nello stesso schermo (Telefono 1 e 2), di base 3 coppie, al massimo 3 clic
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
// render: il campo si ridisegna prima della schermata (nel Chromium senza scheda video un fotogramma intero ferma la pagina
// per secondi: nella modalità fiera, con i telefoni dello stand sempre collegati, le schermate sono senza ridisegno)
async function shot(who, name, { render = true } = {}){
  const p = pages[who]; if (!p) return;
  if (who.startsWith('pc') && render) await p.evaluate(() => { try { __natpfTennis.__render?.(); } catch {} });
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

// B41.5 · modalità fiera: lo staff prepara i telefoni dello stand una volta, poi un visitatore dopo l'altro
async function fieraFlow(two){
  const VIS = +(process.env.VISITORS || (two ? 3 : 10));
  // (B54, 16/11/2026: prima di «Sono pronto» il nome sul telefono, «Conferma» o «Salta»: un tocco in più per telefono, voluto
  // dall'utente; le lettere si scrivono con la tastiera del telefono e non contano)
  const MAXC = +(process.env.MAX_CLICKS || (two ? 3 : 2)), MAXT = +(process.env.MAX_PHONE_TAPS || (two ? 4 : 2));
  const { errs } = await gamePage('pc', '&intro=0&guardia=1');
  const pc = pages.pc;
  /* preparazione dello staff (una volta, non contata: è la prova natpf-fiera-telefoni a farla con il mouse) */
  await pc.evaluate(() => __natpfTennis.natpfUi.fiera.setOn(true));
  const slots = two ? [['p1', 'tel1', 'natpfPhone'], ['p2', 'tel2', 'natpfPhone2']] : [['p1', 'tel1', 'natpfPhone']];
  for (const [slot, who, w] of slots){
    await pc.evaluate(s => __natpfTennis.natpfUi.fiera.openPairing(s), slot);
    await until(pc, w => !!__natpfTennis[w]?.standPairingUrl, w, 20000);
    const url = await pc.evaluate(w => __natpfTennis[w].standPairingUrl, w);
    const { p } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
    pages[who] = p;
    await until(pc, s => /numero/.test(__natpfTennis.natpfUi.fiera.status(s).word), slot, 20000);
    await pc.evaluate(s => __natpfTennis.natpfUi.fiera.confirm(s, { isTrusted: true }), slot);
    await until(pc, w => __natpfTennis[w].connected, w, 20000);
    await p.waitForSelector('#enable:not(.hidden)', { timeout: 15000 }).catch(() => {});
    await p.click('#enable');
    check(`preparazione: ${slot === 'p2' ? 'Telefono 2' : 'Telefono 1'} dello stand abbinato e pronto`, await until(pc, w => __natpfTennis[w].ready, w, 20000));
  }
  await pc.evaluate(two => { const F = __natpfTennis.natpfUi.fiera; F.setPlay(two ? 'split' : 'cpu'); __natpfTennis.natpfUi.lobby.go('menu'); }, two);
  check('pagina della fiera', await until(pc, () => document.getElementById('title-modal').dataset.fair === '1' && __natpfTennis.natpfUi.lobby.step === 'match', null, 10000));
  // spie: pagine del menu visitate, allenamento o calibrazione in campo (tutorial, gesti), QR in vista
  await pc.evaluate(() => {
    const ui = __natpfTennis.natpfUi, L = ui.lobby, go = L.go.bind(L), T = ui.training, ts = T.start.bind(T);
    window.__steps = []; window.__train = 0;
    L.go = (...a) => { const r = go(...a); window.__steps.push(L.step); return r; };
    T.start = (...a) => { window.__train++; return ts(...a); };
  });
  const joins0 = await pc.evaluate(() => [__natpfTennis.natpfPhone, __natpfTennis.natpfPhone2].map(P => P?.link?.L?.joins || 0));
  const qrShown = () => pc.evaluate(() => [...document.querySelectorAll('#connect-qr svg, #natpf-qr svg, .hold-qr svg, [id^="split-qr-"] svg')].some(s => s.getClientRects().length > 0) || !!__natpfTennis.natpfPhone.pairingUrl || !!__natpfTennis.natpfPhone2?.pairingUrl);
  const per = [];
  // un clic vero del mouse su un elemento (dopo 0,6 s: una persona non clicca prima, e la guardia scarta i clic arrivati
  // meno di 0,45 s dopo un cambio di schermata); dbl: un secondo clic di doppio clic tanti ms dopo, nello stesso punto
  const click = async (vt, label, sel, { dbl = 0 } = {}) => {
    await sleep(600);
    const r = await pc.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left + q.width/2, y: q.top + q.height/2 }; }, sel);
    if (!r) throw new Error(`non trovato: ${sel}`);
    vt.clicks++; taps.push({ who: 'pc', label }); log(`clic [visitatore ${per.length + 1}] ${label}${dbl ? ` (doppio clic, ${dbl} ms)` : ''}`);
    await pc.mouse.move(r.x, r.y, { steps: 3 }); await pc.mouse.click(r.x, r.y);
    if (dbl){ await sleep(dbl); await pc.mouse.down({ clickCount: 2 }); await pc.mouse.up({ clickCount: 2 }); }
  };
  const phoneTap = async (vt, who, label, sel) => {
    const ph = pages[who];
    const ok = await until(ph, sel => { const b = document.querySelector(sel); return b && !b.classList.contains('hidden') && !b.disabled; }, sel, 15000);
    if (!ok) throw new Error(`${who}: «${label}» non offerto`);
    vt.taps++; taps.push({ who, label }); log(`tocco [visitatore ${per.length + 1}] [${who}] ${label}`);
    await ph.click(sel);
  };
  const dblNext = { 2: 110, 3: 250, 4: 300 }, dblPlay = { 3: 110, 6: 250, 9: 300 };
  for (let v = 1; v <= VIS; v++){
    const vt = { v, clicks: 0, taps: 0 }, seq0 = await pc.evaluate(() => __natpfTennis.natpfMatchSeq || 0);
    if (v > 1){
      await click(vt, 'Prossimo giocatore', '#btn-new-player', { dbl: dblNext[v] || 0 });
      const back = await until(pc, () => { const ui = __natpfTennis.natpfUi; return ui.lobby.visible && ui.lobby.step === 'match' && document.getElementById('title-modal').dataset.fair === '1'; }, null, 10000);
      if (dblNext[v]){
        await sleep(700);
        const st = await pc.evaluate(seq => { const ui = __natpfTennis.natpfUi; return { page: ui.lobby.visible && ui.lobby.step === 'match', more: !!ui.lobby.matchMore, level: ui.lobby.cpuLevel, mode: ui.lobby.mode, seq: __natpfTennis.natpfMatchSeq || 0, trial: !!ui.trial.active, dropped: ui.mouse?.guard?.dropped?.slice(-2) || [] }; }, seq0);
        check(`doppio clic su «Prossimo giocatore» (secondo clic ${dblNext[v]} ms dopo): una volta sola, il secondo clic non tocca la pagina della fiera`, back && st.page && !st.more && st.level === 'evento' && st.seq === seq0 && !st.trial && st.mode === (two ? 'split' : 'cpu'), JSON.stringify(st));
      } else check(`visitatore ${v}: «Prossimo giocatore» → pagina della fiera`, back);
    }
    if (v === 1 || v === 2) await shot('pc', `fiera-visitatore-${v}`, { render: false });
    // la scelta del livello (un clic, non sempre: «Adulto» è già scelto)
    if (!two){ const level = ['evento', 'bambini', 'casual'][v % 3]; if (level !== 'evento') await click(vt, `Chi gioca: ${level === 'bambini' ? 'Bambino' : 'Ragazzo'}`, `#difficulty-mode-group [data-difficulty="${level}"]`); }
    else if (v >= 2) await click(vt, 'Fascia del Player 2: Bambino', '[data-fiera-band="p2:bambino"]');
    // partenza: «Sono pronto» sui telefoni, o «Gioca» dello staff
    const useGioca = two ? v % 2 === 1 : v % 3 === 0;
    if (useGioca){
      await until(pc, () => !document.getElementById('btn-start-match').disabled, null, 10000);
      await click(vt, 'Gioca', '#btn-start-match', { dbl: two ? 0 : dblPlay[v] || 0 });
    } else for (const [, who] of slots){
      // B54: il nome (il primo visitatore lo scrive, gli altri «Salta»), poi «Sono pronto»
      await until(pages[who], () => !document.getElementById('nameBox').classList.contains('hidden'), null, 15000);
      if (v === 1){ await pages[who].click('#nameInput'); await pages[who].keyboard.type(who === slots[0][1] ? 'Giulia' : 'Luca'); await phoneTap(vt, who, 'Conferma (nome)', '#nameOk'); vt.named = true; }
      else await phoneTap(vt, who, 'Salta (nome)', '#nameSkip');
      await phoneTap(vt, who, 'Sono pronto', '#next');
    }
    const tGo = Date.now();
    const trial = await until(pc, () => !!__natpfTennis.natpfUi.trial.active, null, 8000);
    if (v === 1) { await sleep(1500); await shot('pc', 'fiera-scambi-di-prova', { render: false }); }
    const started = await until(pc, seq => (__natpfTennis.natpfMatchSeq || 0) === seq + 1 && !__natpfTennis.natpfUi.trial.active, seq0, 45000);
    vt.seconds = +((Date.now() - tGo)/1000).toFixed(1);
    if (!two && dblPlay[v]){
      const st = await pc.evaluate(seq => ({ seq: (__natpfTennis.natpfMatchSeq || 0) - seq, lobby: __natpfTennis.natpfUi.lobby.visible }), seq0);
      check(`doppio clic su «Gioca» (secondo clic ${dblPlay[v]} ms dopo): una partita sola, dopo gli scambi di prova`, trial && started && st.seq === 1 && !st.lobby, JSON.stringify(st));
    }
    // (senza colpire gli scambi di prova durano fino allo scadere, circa 14 s: anche dopo «Sono pronto», che non li salta)
    check(`visitatore ${v}: scambi di prova interi, poi la partita (${vt.seconds} s, senza colpire: finiscono allo scadere)`, trial && started && vt.seconds >= 8);
    await until(pc, () => !__natpfTennis.natpfUi.prematch.active, null, 10000);
    if (v === 1) await shot('pc', 'fiera-partita', { render: false });
    const nick = await pc.evaluate(() => __natpfTennis.natpfUi.events.nickname);
    vt.nick = nick;
    await pc.evaluate(() => { const E = __natpfTennis; E.matchConfig.gamesToWin = 1; for (let i = 0; i < 4; i++) E._awardPoint('opponent', 'Out'); });
    const over = await until(pc, () => !document.getElementById('victory-modal').classList.contains('hidden'), null, 12000);
    const sp = await pc.evaluate(() => ({ steps: [...new Set(window.__steps)], train: window.__train, conn: [__natpfTennis.natpfPhone, __natpfTennis.natpfPhone2].map(P => P ? P.connected : null), joins: [__natpfTennis.natpfPhone, __natpfTennis.natpfPhone2].map(P => P?.link?.L?.joins || 0) }));
    vt.qr = await qrShown(); vt.steps = sp.steps; vt.train = sp.train; vt.joins = sp.joins;
    check(`visitatore ${v}${two ? '' : ` (${nick})`}: ${vt.clicks} clic e ${vt.taps} tocchi (al massimo ${MAXC} e ${MAXT}), nessun QR, nessuna calibrazione né tutorial, sempre la pagina della fiera, telefoni sempre collegati`,
      over && vt.clicks <= MAXC && vt.taps <= MAXT && !vt.qr && sp.train === 0 && sp.steps.every(s => s === 'match') && sp.conn.filter(c => c !== null).every(Boolean) && sp.joins.every((j, i) => j === joins0[i]),
      JSON.stringify({ ...vt, conn: sp.conn, joins0 }));
    // (B54: il visitatore 1 scrive il suo nome sul telefono quando parte con «Sono pronto»: chi ha un nome non prende un
    // numero, come con «Nome» dal PC; i numeri vanno a chi gioca senza nome, in ordine)
    if (!two){
      const named = v === 1 && vt.named;
      const want = named ? 'Giulia' : `Visitatore ${per.filter(p => !p.named).length + 1}`;
      check(`   … ${named ? 'con il nome scritto sul telefono' : 'con il suo numero'}: ${want}`, nick === want, nick);
    }
    per.push(vt);
  }
  await shot('pc', 'fiera-fine-partita', { render: false });
  res.visitors = per;
  check('nessun errore nella pagina del gioco', !errs.length, errs.slice(0, 3).join(' | '));
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
  } else if (FLOW === 'fiera' || FLOW === 'fiera-due'){
    await fieraFlow(FLOW === 'fiera-due');
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
