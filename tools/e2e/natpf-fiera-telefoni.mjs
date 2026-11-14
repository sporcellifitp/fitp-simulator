// NATPF B41 prima parte (13/11/2026) · Modalità fiera: telefoni dello stand abbinati una volta e sempre collegati, e
// «Sono pronto» dal telefono. Gioco vero (vite) e pagina vera del telefono (racchetta.html) con eventi devicemotion
// sintetici, segnalazione PeerJS locale. Richieste dell'utente del 13/11: «durante l'evento fiera i telefoni sono sempre
// gli stessi, quindi è inutile ogni volta collegare il telefono, scansionare un QR code e fare la calibrazione» e «nella
// schermata "Pronto per la partita" l'utente deve toccare sullo smartphone "Sono pronto" e quando entrambi sono pronti la
// partita parte da sola».
//   1. modalità fiera (?stand=fiera), Telefono 1: QR dell'abbinamento, numero sul telefono e sul computer, «Conferma»
//      (funzione del gioco: il foglio dello staff arriva con la B41.4), il telefono entra con la prova della chiave
//   2. gioco ricaricato: il telefono rientra da solo, senza QR; pagina del telefono ricaricata: rientra da sola
//   3. chiosco: l'azzeramento non scollega il telefono dello stand
//   4. pagina del telefono: numero del posto, «Dai il telefono al prossimo giocatore», pulsanti dello staff solo dopo la
//      pressione lunga
//   5. contro la CPU: «Sono pronto» grande sul telefono, spunta sul computer, conto di 3 s, partita da sola
//   6. Telefono 2 abbinato; stesso schermo: tutti e due «Sono pronto», conto, «Aspetta» (Esc), il telefono 2 che si spegne
//      durante il conto lo ferma, poi la partita in due da sola. Schermate a 1920×1080 e 720×720
//   cd tools/e2e && CHROMIUM_PATH=… GAME_PORT=… PEER_PORT=… OUT=cartella node natpf-fiera-telefoni.mjs
// Calibrazione dello stand «Nessuna» (CAL=none, di base qui): gli scambi di prova del percorso «Giocando» sono nelle prove
// natpf-scambi-di-prova e nei test di unità (natpf-ready-go.test.mjs: restano prima della pagina «Pronto per la partita»).
process.env.CAL ||= 'none';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const OUT = SP;
const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9171), GAME_PORT = +(process.env.GAME_PORT || 3171);
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
const GAME_URL = `http://127.0.0.1:${GAME_PORT}/?intro=0&stand=fiera&peer=127.0.0.1:${PEER_PORT}`;

// telefono simulato: sensori (devicemotion), pagina nascosta a comando (__setHidden), schermo acceso finto
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = { emit(rot){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: 0, y: 0, z: 0 }, accelerationIncludingGravity: { x: 0, y: G, z: 0 }, interval: 16 })); } };
  window.__hold = setInterval(() => window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]), 16);
  let hidden = false;
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
  window.__setHidden = h => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); };
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { async request(){ const l = { released: false, addEventListener(){}, async release(){ l.released = true; } }; return l; } } });
};
const until = (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
let shotN = 0;
const shots = [];
async function shot(p, name, { render = false } = {}){
  if (render) await p.evaluate(() => { try { __natpfTennis.__render?.(); } catch {} });
  const file = `${OUT}/fiera-${String(++shotN).padStart(2, '0')}-${name}.png`;
  await p.screenshot({ path: file }).then(() => shots.push(file), e => log('schermata non riuscita ' + e.message));
}
const phoneInfo = p => p.evaluate(() => { const R = window.__racchetta, s = R.state, vis = id => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden'); };
  let stand = null; try { stand = JSON.parse(localStorage.getItem('natpf-racchetta-stand') || 'null'); } catch {}
  return { link: s.linkState, sensor: s.screen, big: document.getElementById('big').textContent, sub: document.getElementById('sub').textContent, bar: document.getElementById('barTxt').textContent,
    tag: vis('standTag') ? document.querySelector('#standTag em')?.textContent : null, tools: vis('tools'), next: vis('next') ? { text: document.getElementById('next').textContent, big: document.getElementById('next').classList.contains('big'), disabled: document.getElementById('next').disabled } : null,
    slot: stand?.slot || null, keySaved: !!stand?.key, hash: location.hash }; });
const gameInfo = g => g.evaluate(() => { const E = __natpfTennis, ui = E.natpfUi, P1 = E.natpfPhone, P2 = E.natpfPhone2, rg = document.getElementById('ready-go'), ov = document.getElementById('ready-go-count');
  const ph = P => P ? { slot: P.standSlot, connected: P.connected, ready: P.ready, qr: P.pairingUrl, paired: !!P.link?.L?.stand?.paired, state: P.link?.L?.state, joins: P.link?.L?.joins || 0 } : null;
  return { fair: ui.fiera.on, seq: E.natpfMatchSeq || 0, lobby: ui.lobby.visible ? ui.lobby.step : null, mode: ui.lobby.mode, split: !!E.natpfSplit?.active, p1: ph(P1), p2: ph(P2),
    chips: rg && !rg.classList.contains('hidden') ? [...rg.querySelectorAll('.rg-chip')].map(c => `${c.className.replace('rg-chip ', '')}:${c.textContent}`) : [], why: rg?.querySelector('.rg-why')?.textContent || '',
    count: ov && !ov.classList.contains('hidden') ? ov.querySelector('[data-ready-go-count]')?.textContent : null, running: !!ui.readyGo.cd.running }; });
async function phoneOpen(url, name){
  const { p, errs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  p.__name = name; p.__errs = errs;
  return p;
}
async function pairPhone(g, slot, name){
  const phoneOf = slot === 'p2' ? 'natpfPhone2' : 'natpfPhone';
  await g.evaluate(s => __natpfTennis.natpfUi.fiera.openPairing(s), slot);
  check(`${name}: QR dell'abbinamento solo a foglio aperto (nessun QR pubblico della racchetta)`, await until(g, w => !!__natpfTennis[w]?.standPairingUrl && !__natpfTennis[w].pairingUrl, phoneOf, 15000));
  const url = await g.evaluate(w => __natpfTennis[w].standPairingUrl, phoneOf);
  const p = await phoneOpen(url, name);
  const asked = await until(g, s => !!__natpfTennis.natpfUi.fiera.status(s).word.match(/numero/), slot, 20000);
  const num = await g.evaluate(s => __natpfTennis[s === 'p2' ? 'natpfPhone2' : 'natpfPhone'].link.L.stand.request?.num, slot);
  const big = await p.evaluate(() => document.getElementById('big').textContent);
  check(`${name}: lo stesso numero sul telefono e sul computer, da confermare`, asked && String(num) === big, `computer ${num}, telefono ${big}`);
  await shot(p, `${slot}-numero-da-confermare`);
  const before = await gameInfo(g);
  check(`${name}: prima della conferma il telefono non è il posto`, !before[slot].connected && !before[slot].paired, JSON.stringify(before[slot]));
  check(`${name}: «Conferma» vuole un clic vero (un clic finto dal codice no)`, await g.evaluate(s => __natpfTennis.natpfUi.fiera.confirm(s, { isTrusted: false }), slot) === false);
  await g.evaluate(s => __natpfTennis.natpfUi.fiera.confirm(s, { isTrusted: true }), slot);
  const t0 = Date.now();
  const inn = await until(g, w => __natpfTennis[w].connected, phoneOf, 20000);
  const pi = await phoneInfo(p);
  check(`${name}: confermato, il telefono entra all'indirizzo fisso con la prova della chiave (${((Date.now() - t0)/1000).toFixed(1)} s)`, inn && pi.link === 'on' && pi.slot === slot && pi.keySaved && !pi.hash, JSON.stringify(pi));
  await until(p, () => !document.getElementById('enable').classList.contains('hidden'), null, 10000);
  await p.click('#enable');
  check(`${name}: sensori attivi (dello staff), telefono pronto`, await until(g, w => __natpfTennis[w].ready, phoneOf, 20000));
  return p;
}

// registro di «Sono pronto» nel gioco (annunci ai telefoni, partenza, «Gioca»): nelle righe delle verifiche che falliscono
const RG_LOG = () => { const R = __natpfTennis.natpfUi.readyGo, a = R._announce.bind(R), f = R._fire.bind(R); window.__rg = [];
  R._announce = m => { __rg.push({ t: Math.round(performance.now()), m: JSON.stringify(m), st: JSON.stringify(R.st?.list?.map(p => [p.id, p.why, p.tapped])) }); return a(m); };
  R._fire = () => { __rg.push({ t: Math.round(performance.now()), m: 'fire' }); return f(); };
  // (un tocco che si perde: chi e perché, con lo stato del telefono in quel momento)
  const tk = R.tick.bind(R), lv = R._leave.bind(R);
  R._leave = () => { if (R.taps.p1 || R.taps.p2) __rg.push({ t: Math.round(performance.now()), m: 'leave', ids: R.ids.join(), step: __natpfTennis.natpfUi.lobby.step, vis: __natpfTennis.natpfUi.lobby.visible }); return lv(); };
  R.tick = now => { const before = { ...R.taps }; const out = tk(now); for (const id of ['p1', 'p2']) if (before[id] && !R.taps[id]){ const P = R.phone(id), L = P?.link?.L || {}, st = P?.link?.stats?.();
    __rg.push({ t: Math.round(performance.now()), m: 'tap perso', id, list: JSON.stringify(R.st?.list), L: JSON.stringify({ phone: L.phone, vis: L.vis, sa: L.sensorAge, beat: Math.round(performance.now() - (L.beatAt || 0)), conn: P?.connected, ready: P?.ready }), ages: JSON.stringify(Object.fromEntries(Object.entries(st?.rates || {}).map(([k, v]) => [k, v.ageMs]))) }); }
    return out; };
  document.getElementById('btn-start-match').addEventListener('click', () => __rg.push({ t: Math.round(performance.now()), m: 'click Gioca', lobby: __natpfTennis.natpfUi.lobby.step }), true); };
const rgLog = g => g.evaluate(() => JSON.stringify((window.__rg || []).slice(-16)));
const B = await launch();
const res = {};
try {
  const { p: g, errs: gameErrs } = await page(B, GAME_URL, { w: 1920, h: 1080 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.fiera && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  await g.evaluate(RG_LOG);
  check('modalità fiera accesa dall\'indirizzo di prova (?stand=fiera), calibrazione «Nessuna»', (await gameInfo(g)).fair === true && await g.evaluate(() => __natpfTennis.natpfUi.phone.calMode) === 'none');

  /* ---------- 1. abbinamento del Telefono 1 ---------- */
  const tel1 = await pairPhone(g, 'p1', 'Telefono 1');
  await sleep(600);
  const idle = await phoneInfo(tel1);
  check('telefono dello stand tra una persona e l\'altra: «Telefono 1» grande, «Dai il telefono al prossimo giocatore», niente pulsanti dello staff', idle.tag === 'Telefono 1' && /prossimo giocatore/.test(idle.sub) && !idle.tools && /Telefono 1/.test(idle.bar), JSON.stringify(idle));
  await shot(tel1, 'telefono1-tra-un-visitatore-e-l-altro');
  // pressione lunga dello staff sul numero: 3 s, poi Ricalibra / Ricollega / Scollega
  await tel1.dispatchEvent('#standTag', 'pointerdown');
  await sleep(1500);
  const half = await phoneInfo(tel1);
  await sleep(1900);
  const staff = await phoneInfo(tel1);
  check('pressione lunga dello staff (3 s): solo dopo compaiono Ricalibra, Ricollega e Scollega', !half.tools && staff.tools, JSON.stringify({ dopo1_5s: half.tools, dopo3_4s: staff.tools }));
  await shot(tel1, 'telefono1-staff-pressione-lunga');
  await tel1.dispatchEvent('#standTag', 'pointerup');

  /* ---------- 2. gioco ricaricato, pagina del telefono ricaricata ---------- */
  const j0 = (await gameInfo(g)).p1.joins;
  const tR = Date.now();
  await g.reload({ waitUntil: 'domcontentloaded' });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.fiera && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  await g.evaluate(RG_LOG);
  const back = await until(g, () => __natpfTennis.natpfPhone.connected && __natpfTennis.natpfPhone.standSlot === 'p1', null, 40000);
  const gi = await gameInfo(g);
  res.gameReloadS = +((Date.now() - tR)/1000).toFixed(1);
  check(`gioco ricaricato: il Telefono 1 rientra da solo, senza QR (${res.gameReloadS} s)`, back && gi.p1.qr === null && gi.p1.paired, JSON.stringify(gi.p1));
  check('   … ed è ancora pronto (sensori attivi, nessun tocco sul telefono)', await until(g, () => __natpfTennis.natpfPhone.ready, null, 15000));
  void j0;
  const tP = Date.now();
  await tel1.reload({ waitUntil: 'domcontentloaded' });
  const pin = await until(tel1, () => window.__racchetta?.state.linkState === 'on', null, 30000);
  const pr = await phoneInfo(tel1);
  check(`pagina del telefono ricaricata: si ricollega da sola al suo posto, senza QR (${((Date.now() - tP)/1000).toFixed(1)} s)`, pin && pr.slot === 'p1' && pr.tag === 'Telefono 1', JSON.stringify(pr));
  await until(tel1, () => !document.getElementById('enable').classList.contains('hidden'), null, 10000);
  await tel1.click('#enable');
  check('   «Attiva i sensori» (un tocco dello staff: su iPhone il permesso va chiesto dentro un tocco) e di nuovo pronto', await until(g, () => __natpfTennis.natpfPhone.ready, null, 20000));

  /* ---------- 3. chiosco ---------- */
  await g.evaluate(() => __natpfTennis.natpfUi.kiosk.reset());
  await sleep(800);
  const k = await gameInfo(g);
  check('chiosco: l\'azzeramento del visitatore non scollega il telefono dello stand', k.p1.connected && k.p1.paired && k.lobby === 'menu', JSON.stringify(k.p1));

  /* ---------- 5. «Sono pronto» contro la CPU ---------- */
  await g.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.go('mode'); L.setMode('cpu'); L.go('controller'); L.go('connect'); });
  await sleep(500);
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.next());
  const atPage = await until(g, () => __natpfTennis.natpfUi.lobby.step === 'match', null, 8000);
  const offered = await until(tel1, () => { const b = document.getElementById('next'); return b && !b.classList.contains('hidden') && b.classList.contains('big'); }, null, 8000);
  const t1 = await phoneInfo(tel1), g1 = await gameInfo(g);
  check('pagina «Pronto per la partita»: «Sono pronto» grande sul telefono al posto di «Pronto»', atPage && offered && t1.next?.text === 'Sono pronto' && t1.next.big && !t1.next.disabled && t1.big === 'Partita', JSON.stringify(t1));
  check('   sul computer: «Telefono: tocca «Sono pronto»» accanto a «Gioca», niente conto', g1.chips.join() === 'is-wait:Telefono: tocca «Sono pronto»' && !g1.running, JSON.stringify(g1.chips));
  await shot(tel1, 'telefono1-sono-pronto');
  await shot(g, 'cpu-pronto-per-la-partita-1920', { render: true });
  await sleep(2500);
  check('   senza tocco la partita non parte', (await gameInfo(g)).seq === 0);
  await tel1.click('#next');
  const counting = await until(g, () => __natpfTennis.natpfUi.readyGo.cd.running, null, 5000);
  const g2 = await gameInfo(g);
  await until(tel1, () => document.getElementById('next').disabled, null, 3000);
  const t2 = await phoneInfo(tel1);
  check('tocco su «Sono pronto»: spunta sul computer e conto alla rovescia di 3 s', counting && g2.chips.join() === 'is-ok:Telefono pronto ✓' && g2.count === '3', JSON.stringify(g2));
  check('   sul telefono «Pronto ✓», pulsante spento', t2.next?.disabled && /Pronto ✓/.test(t2.next.text), JSON.stringify(t2));
  await sleep(350);   // (il riquadro entra con un'animazione di 0,2 s)
  await shot(g, 'cpu-conto-alla-rovescia-1920');
  const tS = Date.now();
  const started = await until(g, () => (__natpfTennis.natpfMatchSeq || 0) === 1 && !__natpfTennis.natpfUi.lobby.visible, null, 8000);
  check(`la partita parte da sola alla fine del conto (${((Date.now() - tS)/1000).toFixed(1)} s dopo la spunta)`, started, started ? '' : await rgLog(g));
  await sleep(800);
  await g.evaluate(() => __natpfTennis.natpfUi.backToMenu('menu'));
  await sleep(500);

  /* ---------- 6. Telefono 2 e stesso schermo ---------- */
  const tel2 = await pairPhone(g, 'p2', 'Telefono 2');
  await sleep(600);
  const i2 = await phoneInfo(tel2);
  check('Telefono 2: numero del posto in rosa, «Dai il telefono al prossimo giocatore»', i2.tag === 'Telefono 2' && /prossimo giocatore/.test(i2.sub), JSON.stringify(i2));
  await shot(tel2, 'telefono2-tra-un-visitatore-e-l-altro');
  await g.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.go('mode'); L.setMode('split'); L.go('match'); });
  // (il campo si ridisegna una volta qui, prima dei tocchi: un fotogramma intero a 1920×1080 nel Chromium senza scheda
  // video ferma la pagina per secondi, e un computer fermo più di 5 s fa cadere i telefoni, come deve)
  await g.evaluate(() => { try { __natpfTennis.__render?.(); } catch {} });
  const both = await until(g, () => { const P1 = __natpfTennis.natpfPhone, P2 = __natpfTennis.natpfPhone2; return P1.nextExtra?.rd && P2?.nextExtra?.rd; }, null, 8000);
  const s0 = await gameInfo(g);
  check('stesso schermo, pagina della partita: «Sono pronto» a tutti e due', both && s0.chips.length === 2 && s0.chips.every(c => c.startsWith('is-wait')), JSON.stringify(s0.chips));
  await tel1.click('#next');
  await until(g, () => __natpfTennis.natpfUi.readyGo.taps.p1, null, 5000);
  await sleep(300);
  const s1 = await gameInfo(g), t1b = await phoneInfo(tel1);
  check('   uno solo pronto: spunta del Player 1, il Player 2 da toccare, niente conto; il telefono 1 dice chi manca', s1.chips.join('|') === 'is-ok:Player 1 pronto ✓|is-wait:Player 2: tocca «Sono pronto»' && !s1.running && /Aspetto Player 2/.test(t1b.sub), JSON.stringify({ chips: s1.chips, sub: t1b.sub }));
  await shot(g, 'stesso-schermo-uno-pronto-1920');
  await tel2.click('#next');
  const c2 = await until(g, () => __natpfTennis.natpfUi.readyGo.cd.running, null, 5000);
  check('   tutti e due pronti: conto alla rovescia', c2, c2 ? '' : await rgLog(g));
  // (schermate senza ridisegnare il campo: il conto dura 3 s)
  await sleep(350);
  await shot(g, 'stesso-schermo-conto-1920');
  // «Aspetta» (Esc): il conto si ferma, si ritocca
  await g.keyboard.press('Escape');
  await sleep(400);
  const h = await gameInfo(g);
  check('Esc («Aspetta»): conto fermato, si resta sulla pagina, tutti da ritoccare', !h.running && h.lobby === 'match' && h.chips.every(c => c.startsWith('is-wait')), JSON.stringify(h));
  // area quadrata del ledwall
  await g.setViewportSize({ width: 720, height: 720 });
  await sleep(600);
  await tel1.click('#next'); await sleep(400);
  await shot(g, 'stesso-schermo-uno-pronto-720');
  await tel2.click('#next');
  await until(g, () => __natpfTennis.natpfUi.readyGo.cd.running, null, 5000);
  await sleep(350);
  await shot(g, 'stesso-schermo-conto-720');
  await shot(tel2, 'telefono2-conto');
  // il telefono 2 si spegne durante il conto
  await tel2.evaluate(() => __setHidden(true));
  const stopped = await until(g, () => !__natpfTennis.natpfUi.readyGo.cd.running, null, 4000);
  await sleep(300);
  const d = await gameInfo(g);
  check('il telefono 2 che si spegne durante il conto lo ferma, e il computer dice perché', stopped && d.seq === 1 && /Conto annullato · Player 2: schermo del telefono spento/.test(d.why), JSON.stringify(d));
  await shot(g, 'stesso-schermo-conto-annullato-720');
  await sleep(3500);
  check('   nessuna partita partita', (await gameInfo(g)).seq === 1);
  await tel2.evaluate(() => __setHidden(false));
  await sleep(1500);
  const d2 = await gameInfo(g);
  check('   tornato: deve toccare di nuovo (il suo «Sono pronto» non vale più)', d2.chips.some(c => c === 'is-wait:Player 2: tocca «Sono pronto»') && !d2.running, JSON.stringify(d2.chips));
  await tel2.click('#next');
  const go2 = await until(g, () => (__natpfTennis.natpfMatchSeq || 0) === 2 && __natpfTennis.natpfSplit?.active, null, 10000);
  check('ritoccato: conto e partita nello stesso schermo da sola', go2);
  await g.setViewportSize({ width: 1920, height: 1080 });
  check('nessun errore nella pagina del gioco', !gameErrs.length, gameErrs.slice(0, 3).join(' | '));
  check('nessun errore nelle pagine dei telefoni', !tel1.__errs.length && !tel2.__errs.length, [...tel1.__errs, ...tel2.__errs].slice(0, 3).join(' | '));
  res.shots = shots;
  writeFileSync(`${OUT}/fiera-telefoni.json`, JSON.stringify(res, null, 1));
} catch (e){ check('prova senza eccezioni', false, e.stack || String(e)); }
finally { await B.close(); stop(); summary(); process.exit(process.exitCode || 0); }
