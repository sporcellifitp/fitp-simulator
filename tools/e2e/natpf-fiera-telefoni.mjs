// NATPF B41 (13–14/11/2026) · Modalità fiera: telefoni dello stand abbinati una volta e sempre collegati, «Sono pronto» dal
// telefono, e dalla seconda parte (B41.4–B41.5) tutto con il solo mouse dello staff. Gioco vero (vite) e pagina vera del
// telefono (racchetta.html) con eventi devicemotion sintetici, segnalazione PeerJS locale. Richieste dell'utente del 13/11:
// «durante l'evento fiera i telefoni sono sempre gli stessi, quindi è inutile ogni volta collegare il telefono, scansionare
// un QR code e fare la calibrazione: io seleziono solo il livello di difficoltà, i telefoni sono già pronti» e «nella
// schermata "Pronto per la partita" l'utente deve toccare sullo smartphone "Sono pronto" e quando entrambi sono pronti la
// partita parte da sola».
//   0. pannello dello stand con il mouse (marchio tenuto 3 s) → «Modalità fiera: Sì» (salvata) → si apre «Telefoni dello
//      stand»
//   1. Telefono 1: «Abbina» → QR solo nel foglio → numero sul telefono e sul computer → «Conferma» fatta dal codice (non
//      vale) e con un clic vero (vale) → il telefono entra con la prova della chiave → «Attiva i sensori» → pronto
//   2. pagina della fiera al posto del menu (niente QR, «Gioca» acceso); gioco ricaricato: di nuovo la pagina della fiera e
//      il telefono che rientra da solo; pagina del telefono ricaricata: rientra da sola
//   3. chiosco in fiera: «Prossimo giocatore», il telefono dello stand resta collegato
//   4. pagina del telefono: numero del posto, «Dai il telefono al prossimo giocatore», pulsanti dello staff solo dopo la
//      pressione lunga
//   5. contro la CPU: «Bambino» con il mouse, «Sono pronto» sul telefono → scambi di prova del visitatore, «Salta ›» dal
//      telefono → la partita parte (B47: conto alla rovescia grande), il visitatore numerato; a fine partita «Prossimo
//      giocatore ›» (schermate a 1920×1080, 1280×720, 720×720: «Bella sfida, Visitatore 1!» su una riga, niente tagliato)
//   5b. (B41.3, revisione, difetto 1) tre visitatori: doppio tocco su «Sono pronto» a 150 ms, due tocchi a 400 ms, «Gioca ›»
//      dello staff con il tocco del visitatore a 60 ms: gli scambi di prova restano (non saltati), il pulsante del telefono
//      si spegne dopo il tocco
//   6. Telefono 2 abbinato dal foglio, con la batteria al 15 %: avviso sul ledwall; «2 giocatori» con il mouse; il telefono 2
//      con lo schermo spento non conta (B41.3, difetto 4: il perché nella sua scheda, «Telefoni dello stand ›» accanto a
//      «2 giocatori», nessuna riga in più), tornato tocca di nuovo; tutti e due «Sono pronto» → scambi di prova dei due,
//      «Salta ›» → la partita nello stesso schermo
//   cd tools/e2e && CHROMIUM_PATH=… GAME_PORT=… PEER_PORT=… OUT=cartella node natpf-fiera-telefoni.mjs
// e (pagina del telefono con la batteria finta) la batteria al 15 % del Telefono 2
// Calibrazione dello stand «Nessuna» all'avvio (CAL=none, di base qui): accendere la «Modalità fiera» la porta su «Giocando»
// (decisione dell'utente del 14/11: scambi di prova per ogni visitatore). Qui si chiudono con «Salta ›» dal telefono; interi,
// fino allo scadere, in natpf-flusso-tocchi con FLOW=fiera e FLOW=fiera-due, e nei test di unità (natpf-fiera.test.mjs).
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
// (niente ?stand=fiera: la modalità si accende dal pannello, con il mouse, e resta salvata)
const GAME_URL = `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`;

// telefono simulato: sensori (devicemotion), pagina nascosta a comando (__setHidden), schermo acceso finto, gesti (swing)
// e, con window.__battery prima del caricamento, la batteria (Chrome su Android: navigator.getBattery)
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 16 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    swing(sign, { peak = 750, dur = 240 } = {}){ window.__busy = true; return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur).finally(() => { window.__busy = false; }); },
  };
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  let hidden = false;
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
  window.__setHidden = h => { hidden = h; document.dispatchEvent(new Event('visibilitychange')); };
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { async request(){ const l = { released: false, addEventListener(){}, async release(){ l.released = true; } }; return l; } } });
};
// batteria al 15 % e non in carica (Chrome su Android: navigator.getBattery), prima del caricamento della pagina
const BATTERY_LOW = () => { Object.defineProperty(navigator, 'getBattery', { configurable: true, value: async () => ({ level: 0.15, charging: false, addEventListener(){} }) }); };
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
const gameInfo = g => g.evaluate(() => { const E = __natpfTennis, ui = E.natpfUi, P1 = E.natpfPhone, P2 = E.natpfPhone2, rg = document.getElementById('ready-go'), L = ui.lobby, vis = id => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden'); };
  const ph = P => P ? { slot: P.standSlot, connected: P.connected, ready: P.ready, qr: P.pairingUrl, paired: !!P.link?.L?.stand?.paired, state: P.link?.L?.state, joins: P.link?.L?.joins || 0 } : null;
  return { fair: ui.fiera.on, saved: localStorage.getItem('natpf-tennis.fiera'), seq: E.natpfMatchSeq || 0, lobby: L.visible ? L.step : null, fairPage: document.getElementById('title-modal').dataset.fair === '1', mode: L.mode, split: !!E.natpfSplit?.active, p1: ph(P1), p2: ph(P2),
    chips: rg && !rg.classList.contains('hidden') ? [...rg.querySelectorAll('.rg-chip')].map(c => `${c.className.replace('rg-chip ', '')}:${c.textContent}`) : [],
    nick: ui.events.nickname, prematch: !!ui.prematch?.active, start: !document.getElementById('btn-start-match').disabled, phones: document.getElementById('fiera-phones-text')?.textContent || '',
    sheet: vis('natpf-fiera'), panel: vis('natpf-staff'), alert: vis('natpf-fiera-alert') ? document.getElementById('natpf-fiera-alert').textContent : '',
    // QR in vista sul computer (pagina «Collega», pannello del telefono, riquadro della pausa): nessuno in fiera
    qrShown: [...document.querySelectorAll('#connect-qr svg, #natpf-qr svg, .hold-qr svg, [id^="split-qr-"] svg')].some(s => s.getClientRects().length > 0) }; });
async function phoneOpen(url, name, { battery = false } = {}){
  const { p, errs } = await page(B, url, { w: 390, h: 844, mobile: true, init: battery ? `(${PHONE_INIT})();(${BATTERY_LOW})();` : PHONE_INIT });
  p.__name = name; p.__errs = errs;
  return p;
}
// pannello dello stand con il solo mouse: il marchio in alto a sinistra tenuto premuto 3 s (un anello si riempie)
async function openPanel(g){
  // (nel menu principale il titolo grande, altrove il marchio in alto a sinistra: come natpf-solo-mouse)
  const r = await g.evaluate(() => { const menu = __natpfTennis.natpfUi.lobby.step === 'menu'; const b = document.querySelector(menu ? '#title-modal [data-page="menu"] .menu-brand b' : '#title-modal .lobby-brand'); const q = b.getBoundingClientRect(); return { x: q.left + q.width/2, y: q.top + q.height/2 }; });
  await g.mouse.move(r.x, r.y, { steps: 4 }); await g.mouse.down(); await sleep(3400); await g.mouse.up();
  return until(g, () => !document.getElementById('natpf-staff').classList.contains('hidden'), null, 4000);
}
// schermata a un'altra misura: il campo si ridisegna una volta (un fotogramma intero ferma per secondi il Chromium senza
// scheda video e i telefoni simulati possono cadere: come deve), poi si aspetta che i telefoni dello stand siano di nuovo
// collegati e pronti prima della schermata
async function sizedShot(g, w, h, name){
  await g.setViewportSize({ width: w, height: h }); await sleep(500);
  await g.evaluate(() => { try { __natpfTennis.__render?.(); } catch {} });
  await until(g, () => [__natpfTennis.natpfPhone, __natpfTennis.natpfPhone2].every(P => !P?.standSlot || P.ready), null, 20000);
  await sleep(1200);
  await shot(g, `${name}-${w}x${h}`);
}
// fine partita tutta nella scheda (come la verifica A3 di natpf-fine-partita): titolo su una riga, niente tagliato in alto
// (pillola «Fine partita») né in basso (pulsanti). B41.5: «Bella sfida, Visitatore 1!» a 16:9 andava su due righe
const endFit = g => g.evaluate(() => {
  const card = document.querySelector('#victory-modal .natpf-end-card'), r = card.getBoundingClientRect(), ban = document.getElementById('victory-result-banner');
  const lh = parseFloat(getComputedStyle(ban).lineHeight) || parseFloat(getComputedStyle(ban).fontSize);
  const clipped = [...card.querySelectorAll('.skill-card-header, .victory-result-banner, .end-games, .end-sub, .end-tile, .end-pill, .nt-footer-btn:not(.hidden)')].filter(el => { const b = el.getBoundingClientRect(); return b.height > 0 && (b.top < r.top - 1 || b.bottom > r.bottom + 1 || b.left < r.left - 1 || b.right > r.right + 1); }).map(el => `${el.className.split(' ')[0]}:${el.textContent.slice(0, 16)}`);
  return { title: ban.textContent, lines: Math.round(ban.getBoundingClientRect().height / lh), scroll: card.scrollHeight > card.clientHeight + 1, clipped, fit: ban.style.getPropertyValue('--fit') };
});
// avviso della batteria sulla pagina della fiera: dentro lo schermo e senza coprire «Gioca», le spunte di «Sono pronto» e il
// resto della pagina (a 720×720 va accanto a «Gioca ›»: in basso a sinistra copriva «Telefono: tocca «Sono pronto»»)
const alertFree = g => g.evaluate(() => {
  const a = document.getElementById('natpf-fiera-alert'), ar = a.getBoundingClientRect();
  const vis = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && !el.closest('.hidden'); };
  const hits = [...document.querySelectorAll('#title-modal button, #title-modal .rg-chip, #fiera-phones, #title-modal .lobby-title, #title-modal [data-difficulty]')].filter(vis)
    .filter(el => { const b = el.getBoundingClientRect(); return b.left < ar.right - 1 && ar.left < b.right - 1 && b.top < ar.bottom - 1 && ar.top < b.bottom - 1; }).map(el => `${el.id || el.className.split(' ')[0]}:${el.textContent.trim().slice(0, 24)}`);
  return { shown: !a.classList.contains('hidden'), rect: [ar.left, ar.top, ar.right, ar.bottom].map(Math.round), inside: ar.left >= 0 && ar.top >= 0 && ar.right <= innerWidth && ar.bottom <= innerHeight, hits };
});
const staffWord = (g, slot) => g.evaluate(s => document.querySelector(`#natpf-fiera [data-fiera-slot="${s}"] [data-fiera="word"]`)?.textContent || '', slot);
// abbinamento con il foglio «Telefoni dello stand» aperto: «Abbina», QR, numero, «Conferma» con un clic vero
async function pairPhone(g, slot, name, { battery = false } = {}){
  const phoneOf = slot === 'p2' ? 'natpfPhone2' : 'natpfPhone';
  await g.click(`#natpf-fiera [data-fiera-act="pair"][data-slot="${slot}"]`);
  const qrOk = await until(g, ([s, w]) => !!__natpfTennis[w]?.standPairingUrl && !!document.querySelector(`#natpf-fiera [data-fiera-slot="${s}"] [data-fiera="qr"] svg`) && !__natpfTennis[w].pairingUrl, [slot, phoneOf], 15000);
  check(`${name}: «Abbina» → il QR dell'abbinamento compare nel foglio (solo lì: nessun QR pubblico della racchetta)`, qrOk);
  await sleep(300);
  await shot(g, `${slot}-foglio-qr-1920`);
  const url = await g.evaluate(w => __natpfTennis[w].standPairingUrl, phoneOf);
  const p = await phoneOpen(url, name, { battery });
  const asked = await until(g, s => /numero/.test(__natpfTennis.natpfUi.fiera.status(s).word), slot, 20000);
  await sleep(500);
  const num = await g.evaluate(s => document.querySelector(`#natpf-fiera [data-fiera-slot="${s}"] [data-fiera="num"]`)?.textContent, slot);
  const big = await p.evaluate(() => document.getElementById('big').textContent);
  check(`${name}: lo stesso numero sul telefono e nel foglio, con «Rifiuta» e «Conferma»`, asked && !!num && num === big, `foglio ${num}, telefono ${big}`);
  await shot(g, `${slot}-foglio-numero-1920`);
  await shot(p, `${slot}-telefono-numero`);
  // «Conferma» premuta dal codice (come farebbe uno script o il telecomando): non vale
  await g.evaluate(s => document.querySelector(`#natpf-fiera [data-fiera-act="confirm"][data-slot="${s}"]`).click(), slot);
  await sleep(1500);
  const before = await gameInfo(g);
  check(`${name}: «Conferma» fatta dal codice non abbina (serve un clic vero dello staff)`, !before[slot].connected && /numero/.test(await staffWord(g, slot)), JSON.stringify(before[slot]));
  await g.click(`#natpf-fiera [data-fiera-act="confirm"][data-slot="${slot}"]`);
  const t0 = Date.now();
  const inn = await until(g, w => __natpfTennis[w].connected, phoneOf, 20000);
  const pi = await phoneInfo(p);
  check(`${name}: «Conferma» con il clic: il telefono entra all'indirizzo fisso con la prova della chiave (${((Date.now() - t0)/1000).toFixed(1)} s)`, inn && pi.link === 'on' && pi.slot === slot && pi.keySaved && !pi.hash, JSON.stringify(pi));
  await until(p, () => !document.getElementById('enable').classList.contains('hidden'), null, 10000);
  await p.click('#enable');
  check(`${name}: sensori attivi (dello staff), telefono pronto, la scheda lo dice`, await until(g, w => __natpfTennis[w].ready, phoneOf, 20000) && await until(g, s => /pronto ✓/.test(document.querySelector(`#natpf-fiera [data-fiera-slot="${s}"] [data-fiera="word"]`)?.textContent || ''), slot, 8000), await staffWord(g, slot));
  return p;
}

const B = await launch();
const res = {};
try {
  const { p: g, errs: gameErrs } = await page(B, GAME_URL, { w: 1920, h: 1080 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.fiera && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  check('all\'avvio la modalità fiera è spenta (il menu di sempre), calibrazione «Nessuna»', (await gameInfo(g)).fair === false && await g.evaluate(() => __natpfTennis.natpfUi.phone.calMode) === 'none');

  /* ---------- 0. pannello dello stand con il mouse → «Modalità fiera: Sì» ---------- */
  check('pannello dello stand con il mouse (marchio tenuto 3 s)', await openPanel(g));
  await shot(g, 'pannello-modalita-fiera-1920', { render: true });
  await g.click('#natpf-staff [data-staff="fiera"]');
  const on = await until(g, () => __natpfTennis.natpfUi.fiera.on && !document.getElementById('natpf-fiera').classList.contains('hidden'), null, 5000);
  const g0 = await gameInfo(g);
  check('«Modalità fiera: Sì» con un clic: salvata, e si apre «Telefoni dello stand»', on && g0.saved === '1' && g0.sheet && !g0.panel, JSON.stringify({ saved: g0.saved, sheet: g0.sheet }));
  check('   … e la calibrazione dello stand passa a «Giocando» (scambi di prova per ogni visitatore)', await g.evaluate(() => __natpfTennis.natpfUi.phone.calMode) === 'play');
  await shot(g, 'foglio-telefoni-dello-stand-1920');

  /* ---------- 1. abbinamento del Telefono 1 con il foglio ---------- */
  const tel1 = await pairPhone(g, 'p1', 'Telefono 1');
  await shot(g, 'foglio-telefono1-pronto-1920');
  await sleep(1000);
  // (con un foglio dello staff aperto niente «Sono pronto»: il telefono aspetta il prossimo giocatore)
  const idle = await phoneInfo(tel1);
  check('telefono dello stand con lo staff al foglio: «Telefono 1» grande, «Dai il telefono al prossimo giocatore», niente «Sono pronto» né pulsanti dello staff', idle.tag === 'Telefono 1' && /prossimo giocatore/.test(idle.sub) && !idle.tools && !idle.next && /Telefono 1/.test(idle.bar), JSON.stringify(idle));
  await shot(tel1, 'telefono1-tra-un-visitatore-e-l-altro');

  /* ---------- 2. pagina della fiera; gioco ricaricato; pagina del telefono ricaricata ---------- */
  await g.click('#natpf-fiera [data-fiera-act="close"]');
  await sleep(500);
  await g.click('#natpf-staff [data-staff="close"]');
  await sleep(800);
  const f1 = await gameInfo(g);
  check('pagina della fiera al posto del menu: «Chi gioca», nessun QR, «Gioca» acceso, «Telefono 1 pronto ✓»', f1.lobby === 'match' && f1.fairPage && f1.mode === 'cpu' && !f1.qrShown && f1.start && /Telefono 1 pronto ✓/.test(f1.phones), JSON.stringify(f1));
  await shot(g, 'pagina-della-fiera-1920', { render: true });
  const tR = Date.now();
  await g.reload({ waitUntil: 'domcontentloaded' });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.fiera && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const back = await until(g, () => __natpfTennis.natpfPhone.connected && __natpfTennis.natpfPhone.standSlot === 'p1', null, 40000);
  const gi = await gameInfo(g);
  res.gameReloadS = +((Date.now() - tR)/1000).toFixed(1);
  check(`gioco ricaricato: di nuovo la pagina della fiera e il Telefono 1 che rientra da solo, senza QR (${res.gameReloadS} s)`, back && gi.fair && gi.fairPage && gi.p1.qr === null && gi.p1.paired && !gi.qrShown, JSON.stringify(gi));
  check('   … ed è ancora pronto (sensori attivi, nessun tocco sul telefono)', await until(g, () => __natpfTennis.natpfPhone.ready, null, 15000));
  const tP = Date.now();
  await tel1.reload({ waitUntil: 'domcontentloaded' });
  const pin = await until(tel1, () => window.__racchetta?.state.linkState === 'on', null, 30000);
  const pr = await phoneInfo(tel1);
  check(`pagina del telefono ricaricata: si ricollega da sola al suo posto, senza QR (${((Date.now() - tP)/1000).toFixed(1)} s)`, pin && pr.slot === 'p1' && pr.tag === 'Telefono 1', JSON.stringify(pr));
  await until(tel1, () => !document.getElementById('enable').classList.contains('hidden'), null, 10000);
  await tel1.click('#enable');
  check('   «Attiva i sensori» (un tocco dello staff: su iPhone il permesso va chiesto dentro un tocco) e di nuovo pronto', await until(g, () => __natpfTennis.natpfPhone.ready, null, 20000));

  /* ---------- 3. chiosco in fiera: «Prossimo giocatore» ---------- */
  await g.evaluate(() => { __natpfTennis.natpfUi.events.nickname = 'Marco'; __natpfTennis.natpfUi.kiosk.reset(); });
  await sleep(800);
  const k = await gameInfo(g);
  check('chiosco in fiera: «Prossimo giocatore» (nome azzerato, pagina della fiera), il telefono dello stand resta collegato', k.p1.connected && k.p1.paired && k.lobby === 'match' && k.fairPage && k.nick === '', JSON.stringify(k));

  /* ---------- 4. pagina del telefono: pulsanti dello staff solo con la pressione lunga ---------- */
  await tel1.dispatchEvent('#standTag', 'pointerdown');
  await sleep(1500);
  const half = await phoneInfo(tel1);
  await sleep(1900);
  const staff = await phoneInfo(tel1);
  check('pressione lunga dello staff (3 s): solo dopo compaiono Ricalibra, Ricollega e Scollega', !half.tools && staff.tools, JSON.stringify({ dopo1_5s: half.tools, dopo3_4s: staff.tools }));
  await tel1.dispatchEvent('#standTag', 'pointerup');

  /* ---------- 5. contro la CPU: «Bambino» con il mouse e «Sono pronto» dal telefono ---------- */
  await sleep(800);
  await g.click('#difficulty-mode-group [data-difficulty="bambini"]');
  const offered = await until(tel1, () => { const b = document.getElementById('next'); return b && !b.classList.contains('hidden') && b.classList.contains('big') && !b.disabled; }, null, 8000);
  const t1 = await phoneInfo(tel1), g1 = await gameInfo(g);
  check('pagina della fiera: «Sono pronto» grande sul telefono; sul computer «Telefono: tocca «Sono pronto»»', offered && t1.next?.text === 'Sono pronto' && g1.chips.join() === 'is-wait:Telefono: tocca «Sono pronto»', JSON.stringify({ next: t1.next, chips: g1.chips }));
  check('   livello scelto con un clic: Bambino', await g.evaluate(() => __natpfTennis.natpfUi.lobby.cpuLevel) === 'bambini');
  await shot(tel1, 'telefono1-sono-pronto');
  await shot(g, 'pagina-della-fiera-bambino-1920', { render: true });
  await sleep(2000);
  check('   senza tocco la partita non parte', (await gameInfo(g)).seq === 0);
  await tel1.click('#next');
  // (in fiera ogni visitatore fa gli scambi di prova: prima della partita; «Salta ›» dal telefono li chiude)
  const tr1 = await until(g, () => __natpfTennis.natpfUi.trial.active, null, 8000);
  const skip1 = await until(tel1, () => { const b = document.getElementById('next'); return !!b && !b.classList.contains('hidden') && /Salta/.test(b.textContent); }, null, 8000);
  const gt = await gameInfo(g);
  check('tocco su «Sono pronto»: prima gli scambi di prova del visitatore (con «Salta ›» sul telefono), la partita non è ancora partita', tr1 && skip1 && gt.seq === 0 && /^Visitatore \d+$/.test(gt.nick), JSON.stringify({ trial: tr1, skip: skip1, seq: gt.seq, nick: gt.nick }));
  await sleep(1500);
  await tel1.click('#next');
  const started = await until(g, () => (__natpfTennis.natpfMatchSeq || 0) === 1 && !__natpfTennis.natpfUi.lobby.visible && !__natpfTennis.natpfUi.trial.active, null, 10000);
  const g2 = await gameInfo(g);
  check('«Salta ›» dal telefono: la partita parte con il conto alla rovescia grande; il visitatore ha il suo numero', started && g2.prematch && /^Visitatore \d+$/.test(g2.nick), JSON.stringify({ seq: g2.seq, prematch: g2.prematch, nick: g2.nick }));
  res.visitor = g2.nick;
  await sleep(350);
  await shot(g, 'cpu-conto-alla-rovescia-1920');
  await until(g, () => !__natpfTennis.natpfUi.prematch.active, null, 8000);
  // la partita finisce (4 punti alla CPU): fine partita con «Prossimo giocatore ›» e «Rivincita», niente «Menu»
  await g.evaluate(() => { const E = __natpfTennis; E.matchConfig.gamesToWin = 1; for (let i = 0; i < 4; i++) E._awardPoint('opponent', 'Out'); });
  const over = await until(g, () => !document.getElementById('victory-modal').classList.contains('hidden'), null, 10000);
  await sleep(600);
  const end = await g.evaluate(() => { const v = id => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden') && el.getClientRects().length > 0; }; return { next: document.getElementById('btn-new-player').textContent, nextShown: v('btn-new-player'), again: v('btn-play-again'), menu: v('btn-return-title') }; });
  check('fine partita in fiera: «Prossimo giocatore ›» e «Rivincita», niente «Menu»', over && end.next === 'Prossimo giocatore ›' && end.nextShown && end.again && !end.menu, JSON.stringify(end));
  for (const [w, h] of [[1920, 1080], [1280, 720], [720, 720]]){
    await sizedShot(g, w, h, 'fine-partita-prossimo-giocatore');
    const v = await endFit(g);
    check(`   fine partita ${w}×${h}: «${v.title}» su una riga, niente tagliato (pillola in alto, pulsanti in basso)`, v.lines === 1 && !v.scroll && !v.clipped.length, JSON.stringify(v));
  }
  await g.setViewportSize({ width: 1920, height: 1080 }); await sleep(400);
  await g.click('#btn-new-player');
  await sleep(900);
  const nx = await gameInfo(g);
  check('«Prossimo giocatore»: pagina della fiera, nome azzerato, il telefono resta collegato e pronto', nx.lobby === 'match' && nx.fairPage && nx.nick === '' && nx.p1.connected && nx.p1.paired, JSON.stringify(nx));
  check('   … «Chi gioca» di nuovo Adulto', await g.evaluate(() => __natpfTennis.natpfUi.lobby.cpuLevel) === 'evento');

  /* ---------- 5b. B41.3 (revisione, difetto 1): i tocchi di troppo non saltano gli scambi di prova ---------- */
  // Il pulsante del telefono passa da «Sono pronto» a «Salta ›» in pochi millisecondi: due tocchi a 150 o 400 ms, o «Gioca ›»
  // dello staff con il tocco del visitatore a 60 ms, arrivavano a «Salta ›» (sonda del revisore p2-visitatori). Ora ogni
  // offerta ha un numero, il telefono spegne il pulsante dopo il tocco e «Salta ›» appena offerto non vale per 1 s.
  const offer1 = () => until(tel1, () => { const b = document.getElementById('next'); return !!b && !b.classList.contains('hidden') && /Sono pronto/.test(b.textContent) && !b.disabled; }, null, 15000);
  // gli scambi di prova partono e restano accesi per ms (nessuna partita nuova nel frattempo)
  const trialHeld = async (seq, ms = 3000) => {
    const on = await until(g, () => __natpfTennis.natpfUi.trial.active, null, 8000);
    await sleep(ms);
    const r = await g.evaluate(s => ({ active: __natpfTennis.natpfUi.trial.active, seq: __natpfTennis.natpfMatchSeq || 0, nick: __natpfTennis.natpfUi.events.nickname }), seq);
    return { on, held: on && r.active && r.seq === seq, ...r };
  };
  // chiude il visitatore: «Salta ›» dal telefono, partita (4 punti alla CPU), «Prossimo giocatore ›», telefono di nuovo pronto
  const nextVisitor = async seq => {
    await until(tel1, () => { const b = document.getElementById('next'); return !!b && !b.classList.contains('hidden') && /Salta/.test(b.textContent) && !b.disabled; }, null, 8000);
    await tel1.click('#next');
    await until(g, s => (__natpfTennis.natpfMatchSeq || 0) === s + 1 && !__natpfTennis.natpfUi.trial.active, seq, 10000);
    await until(g, () => !__natpfTennis.natpfUi.prematch.active, null, 8000);
    await g.evaluate(() => { const E = __natpfTennis; E.matchConfig.gamesToWin = 1; for (let i = 0; i < 4; i++) E._awardPoint('opponent', 'Out'); });
    await until(g, () => !document.getElementById('victory-modal').classList.contains('hidden'), null, 10000);
    await sleep(600);
    await g.click('#btn-new-player');
    await until(g, () => { const L = __natpfTennis.natpfUi.lobby; return L.visible && L.step === 'match' && document.getElementById('title-modal').dataset.fair === '1'; }, null, 8000);
    await sleep(900);
    return (await gameInfo(g)).seq;
  };
  let seqT = (await gameInfo(g)).seq;
  const seq0 = seqT;
  // C: doppio tocco su «Sono pronto» a 150 ms (il secondo sul pulsante, comunque sia in quel momento)
  check('B41.3 · «Sono pronto» offerto di nuovo al visitatore dopo', await offer1());
  const tapC = await tel1.evaluate(async () => { const b = document.getElementById('next'); b.click(); const off = b.disabled; await new Promise(r => setTimeout(r, 150)); const t2 = b.textContent; b.click(); return { offAfterTap: off, second: t2 }; });
  const trC = await trialHeld(seqT);
  check('B41.3 · doppio tocco su «Sono pronto» (150 ms): gli scambi di prova restano (3 s); il pulsante si spegne dopo il tocco', trC.held && tapC.offAfterTap, JSON.stringify({ trC, tapC }));
  seqT = await nextVisitor(seqT);
  // C2: due tocchi a 400 ms (il secondo solo se il pulsante è acceso: com'è sul telefono vero)
  await offer1();
  const tapC2 = await tel1.evaluate(async () => { const b = document.getElementById('next'); b.click(); await new Promise(r => setTimeout(r, 400)); const st = { text: b.textContent, disabled: b.disabled }; if (!b.classList.contains('hidden') && !b.disabled) b.click(); return st; });
  const trC2 = await trialHeld(seqT);
  check('B41.3 · due tocchi a 400 ms su «Sono pronto» / «Salta ›»: gli scambi di prova restano (3 s)', trC2.held, JSON.stringify({ trC2, tapC2 }));
  seqT = await nextVisitor(seqT);
  // D: «Gioca ›» dello staff e il tocco del visitatore su «Sono pronto» 60 ms dopo
  await offer1();
  await until(g, () => { const b = document.getElementById('btn-start-match'); return !b.disabled && b.getClientRects().length > 0; }, null, 8000);
  // (clic vero del mouse sul punto del pulsante, subito: g.click aspetta che il pulsante sia fermo e, sotto carico, il tocco
  // del telefono 60 ms dopo faceva già partire gli scambi di prova e il pulsante spariva prima del clic)
  const gb = await g.evaluate(() => { const r = document.getElementById('btn-start-match').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; });
  await Promise.all([g.mouse.click(gb.x, gb.y), sleep(60).then(() => tel1.evaluate(() => document.getElementById('next').click()))]);
  const trD = await trialHeld(seqT);
  check('B41.3 · «Gioca ›» e il tocco su «Sono pronto» quasi insieme (60 ms): gli scambi di prova restano (3 s)', trD.held, JSON.stringify(trD));
  seqT = await nextVisitor(seqT);
  check('   … dopo i tre visitatori «Salta ›» dal telefono (dopo 1 s) ha fatto partire ogni partita, e si è tornati alla pagina della fiera', (await gameInfo(g)).lobby === 'match' && seqT === seq0 + 3, `partite ${seqT}`);

  /* ---------- 6. Telefono 2 dal foglio, batteria bassa, due giocatori ---------- */
  check('pannello dello stand con il mouse dalla pagina della fiera', await openPanel(g));
  const panelTxt = await g.evaluate(() => document.querySelector('#natpf-staff [data-staff="phone"]').textContent.replace(/\s+/g, ' ').trim());
  check('nel pannello «Telefoni dello stand» al posto di «Telefono: Scollega», con lo stato dei due posti', /Telefoni dello stand/.test(panelTxt) && /1 ✓/.test(panelTxt) && /2 da abbinare/.test(panelTxt), panelTxt);
  await g.click('#natpf-staff [data-staff="phone"]');
  await until(g, () => !document.getElementById('natpf-fiera').classList.contains('hidden'), null, 4000);
  const tel2 = await pairPhone(g, 'p2', 'Telefono 2', { battery: true });
  await sleep(600);
  const i2 = await phoneInfo(tel2);
  check('Telefono 2: numero del posto in rosa, «Dai il telefono al prossimo giocatore»', i2.tag === 'Telefono 2' && /prossimo giocatore/.test(i2.sub), JSON.stringify(i2));
  const alert = await until(g, () => /Telefono 2: batteria 15%/.test(document.getElementById('natpf-fiera-alert').textContent) && !document.getElementById('natpf-fiera-alert').classList.contains('hidden'), null, 8000);
  check('batteria del Telefono 2 al 15 % e non in carica: avviso sul ledwall e nella scheda', alert && /bassa/.test(await g.evaluate(() => document.querySelector('#natpf-fiera [data-fiera-slot="p2"] [data-fiera="batt"]')?.textContent || '')), (await gameInfo(g)).alert);
  await shot(g, 'foglio-due-telefoni-batteria-1920');
  await g.click('#natpf-fiera [data-fiera-act="close"]'); await sleep(400);
  await g.click('#natpf-staff [data-staff="close"]'); await sleep(700);
  for (const [w, h] of [[1920, 1080], [1280, 720], [720, 720]]){
    await sizedShot(g, w, h, 'avviso-batteria');
    const v = await alertFree(g);
    check(`   avviso della batteria a ${w}×${h}: nello schermo, non copre «Gioca» né «Sono pronto»`, v.shown && v.inside && !v.hits.length, JSON.stringify(v));
  }
  await g.setViewportSize({ width: 1920, height: 1080 }); await sleep(400);
  await g.click('[data-fiera-mode="split"]');
  const both = await until(g, () => { const P1 = __natpfTennis.natpfPhone, P2 = __natpfTennis.natpfPhone2; return __natpfTennis.natpfUi.lobby.mode === 'split' && P1.nextExtra?.rd && P2?.nextExtra?.rd; }, null, 8000);
  const s0 = await gameInfo(g);
  check('«2 giocatori» con un clic: pagina della fiera dello stesso schermo, «Sono pronto» a tutti e due, nessun QR', both && s0.fairPage && s0.mode === 'split' && !s0.qrShown && s0.chips.length === 2 && s0.chips.every(c => c.startsWith('is-wait')), JSON.stringify(s0));
  await g.evaluate(() => { try { __natpfTennis.__render?.(); } catch {} });
  await shot(g, 'pagina-della-fiera-due-1920');
  await tel1.click('#next');
  await until(g, () => __natpfTennis.natpfUi.readyGo.taps.p1, null, 5000);
  // il telefono 2 con lo schermo spento: non può dire «Sono pronto»; tornato, tocca e si parte
  await tel2.evaluate(() => __setHidden(true));
  await sleep(1200);
  const d = await gameInfo(g);
  check('il Telefono 2 con lo schermo spento: il computer lo dice, la partita non parte', d.seq === seqT && d.chips.some(c => /Player 2: schermo del telefono spento/.test(c)), JSON.stringify(d.chips));
  // B41.3 (revisione, difetto 4): il perché nella scheda del Player 2, «Telefoni dello stand ›» nella riga di «2 giocatori»,
  // nessuna riga sotto le schede (a 1920×540 faceva scorrere la pagina: sonda delle sette misure b413/probe/fierapage.mjs)
  const ko2 = await g.evaluate(() => { const vis = el => !!el && !el.classList.contains('hidden') && el.getClientRects().length > 0, st = document.querySelector('#title-modal .lobby-stage');
    return { card: document.querySelector('[data-fiera-player="p2"] [data-fiera-state]')?.textContent || '', ko: !!document.querySelector('[data-fiera-player="p2"]')?.classList.contains('ko'), row: vis(document.getElementById('fiera-phones')), bar: vis(document.querySelector('#fiera-bar [data-fiera-sheet]')), scroll: st ? st.scrollHeight - st.clientHeight : null }; });
  check('   … il perché nella scheda del Player 2, «Telefoni dello stand ›» accanto a «2 giocatori», nessuna riga in più, la pagina non scorre', /Telefono 2: schermo del telefono spento/.test(ko2.card) && ko2.ko && !ko2.row && ko2.bar && ko2.scroll <= 0, JSON.stringify(ko2));
  await tel2.evaluate(() => __setHidden(false));
  await sleep(1500);
  await tel2.click('#next');
  const tr2 = await until(g, () => __natpfTennis.natpfUi.trial.active && !!__natpfTennis.natpfUi.trial.S?.split, null, 10000);
  check('tutti e due «Sono pronto»: prima gli scambi di prova dei due giocatori', tr2 && (await gameInfo(g)).seq === seqT);
  await until(tel2, () => { const b = document.getElementById('next'); return !!b && !b.classList.contains('hidden') && /Salta/.test(b.textContent); }, null, 8000);
  await sleep(1500);
  await tel2.click('#next');
  const go2 = await until(g, s => (__natpfTennis.natpfMatchSeq || 0) === s + 1 && __natpfTennis.natpfSplit?.active && !__natpfTennis.natpfUi.trial.active, seqT, 10000);
  check('«Salta ›»: la partita nello stesso schermo parte (conto alla rovescia grande)', go2 && (await gameInfo(g)).prematch);
  // l'avviso della batteria si vede solo sulla pagina della fiera (tra un visitatore e l'altro): in campo non copre il gioco
  // (sulla fine partita copriva il consiglio del livello)
  const inGame = await gameInfo(g);
  check('   … in campo l\'avviso della batteria del Telefono 2 non c\'è (solo sulla pagina della fiera)', inGame.alert === '' && await g.evaluate(() => !!__natpfTennis.natpfUi.fiera.alertText), JSON.stringify({ alert: inGame.alert }));
  await g.setViewportSize({ width: 1920, height: 1080 });
  check('nessun errore nella pagina del gioco', !gameErrs.length, gameErrs.slice(0, 3).join(' | '));
  check('nessun errore nelle pagine dei telefoni', !tel1.__errs.length && !tel2.__errs.length, [...tel1.__errs, ...tel2.__errs].slice(0, 3).join(' | '));
  res.shots = shots;
  writeFileSync(`${OUT}/fiera-telefoni.json`, JSON.stringify(res, null, 1));
} catch (e){ check('prova senza eccezioni', false, e.stack || String(e)); }
finally { await B.close(); stop(); summary(); process.exit(process.exitCode || 0); }
