// NATPF B46 «dritto e rovescio al sicuro» (14/11/2026) · prova nel browser: gioco vero (vite) e due pagine vere del
// telefono (racchetta.html) con eventi devicemotion sintetici, segnalazione PeerJS locale, «Calibrazione: Giocando» (la
// base del gioco). Segnalazione dell'utente sulla 2026-11-14.1 (stesso schermo, Telefono 1 = Player 1, Android): «se
// provavo a fare un rovescio mi veniva fuori un dritto lungolinea, se facevo un dritto veniva fuori un rovescio incrociato».
//   1. pagina del telefono, «Sinistra» toccato UNA volta: il pulsante chiede «Mancino? Tocca di nuovo», la mano resta destra
//      sul telefono e sul computer; dopo 4 s la domanda sparisce;
//   2. «Sinistra» toccato DUE volte: mancino sul telefono e sul computer, avviso grande «Telefono 1: mano sinistra
//      (mancino)» per 3 s;
//   3. sensori attivi, tutorial chiusi: scambi di prova con «Mancino» nella riga dei puntini di Giulia, poi in partita
//      «Mancino» nella targhetta della sua metà;
//   4. tocchi sullo schermo per il lancio al servizio con il telefono a testa in giù: il segno dei sensori non cambia (il
//      computer non riceve un «dev» con un segno diverso); gli stessi tocchi al menu lo cambiano e il computer rimette a +1
//      il verso imparato;
//   5. chiosco: tutti e due di nuovo destri.
//   6. pagina «Pronto per la partita» contro la CPU con la mano sinistra: «Mancino» accanto al titolo.
// Schermate in $OUT/mano-sicura (con AREA=720 in $OUT/mano-sicura-720, gioco in un'area di ledwall 720×720): la domanda
// sul telefono, l'avviso, la riga dei puntini, la targhetta in partita, la pagina «Pronto per la partita».
//   cd tools/e2e && CHROMIUM_PATH=… GAME_PORT=… PEER_PORT=… [AREA=720] node natpf-mano-sicura.mjs
// Eventi sintetici sulla stessa macchina: non sostituiscono due telefoni veri (Android, iPhone) né il programma Windows.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9146), GAME_PORT = +(process.env.GAME_PORT || 3146);
// AREA=720: tutto il gioco in un'area di ledwall 720×720 in alto a sinistra della finestra (natpf_screen.js)
const AREA = +process.env.AREA || 0, W = AREA || 1280, H = AREA || 720;
const OUT = path.join(SP, AREA ? `mano-sicura-${AREA}` : 'mano-sicura'); mkdirSync(OUT, { recursive: true });
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

// telefono in verticale con i sensori continui; window.__upside: telefono a testa in giù (gravità sull'asse y al contrario)
const PHONE_INIT = () => {
  const G = 9.81;
  window.__upside = false;
  window.__up = { emit(rot){ const g = window.__upside ? -G : G; window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: 0, y: 0, z: 0 }, accelerationIncludingGravity: { x: 0.3, y: g, z: 0.8 }, interval: 16 })); } };
  window.__hold = setInterval(() => window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]), 16);
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { async request(){ const l = { released: false, addEventListener(){}, async release(){ l.released = true; } }; return l; } } });
};
const until = (p, fn, arg, ms = 20000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }).then(() => true, () => false);
const handBtn = (ph, h) => ph.evaluate(h => { const b = document.querySelector(`#profileOptions [data-hand="${h}"]`); return { text: b?.textContent || '', ask: !!b?.classList.contains('ask'), on: !!b?.classList.contains('on'), hand: document.getElementById('hand').value }; }, h);
const game = g => g.evaluate(() => { const E = __natpfTennis, ui = E.natpfUi, n = document.getElementById('natpf-hand-notice');
  return { p1: ui.hand.hand, p2: E.natpfPhone2?.hand || null, notice: n && !n.classList.contains('hidden') ? n.querySelector('b')?.textContent : null, acc1: E.natpfPhone.accSign, sign1: E.natpfPhone.learner.sign, phase: E.phase, trial: !!ui.trial.active, split: !!E.natpfSplit?.active }; });

const B = await launch();
try {
  const { p: g, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  // il disegno con la grafica software rallenta i fotogrammi: si disegna solo per le schermate
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const shot = async (name, el = g) => { if (el === g) await g.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await el.screenshot({ path: `${OUT}/${name}.png` }); log('schermata ' + name); };
  // (registro dello stand: le righe «tel» con un motivo, lette dalla memoria del registratore e dai blocchi già fatti)
  await g.evaluate(() => { const rec = __natpfTennis.natpfUi.registro?.rec; window.__tel = []; if (rec){ const o = rec._scrivi.bind(rec); rec._scrivi = raw => { if (raw?.k === 'tel' && raw.motivo) window.__tel.push({ ...raw }); return o(raw); }; } });
  if (AREA) await g.evaluate(a => __natpfTennis.natpfUi.screen.restore({ preset: 'full', area: { x: 0, y: 0, w: a, h: a }, margins: {} }), AREA);
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.menu('play'));
  await sleep(300);
  await g.click('[data-mode="split"]');
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'connect', null, { timeout: 8000 });
  await g.fill('[data-split-name="p1"]', 'Giulia'); await g.fill('[data-split-name="p2"]', 'Marco');
  await g.waitForFunction(() => __natpfTennis.natpfPhone.pairingUrl && __natpfTennis.natpfPhone2?.pairingUrl, null, { timeout: 30000 });
  const [u1, u2] = await g.evaluate(() => [__natpfTennis.natpfPhone.pairingUrl, __natpfTennis.natpfPhone2.pairingUrl]);
  const { p: ph1, errs: e1 } = await page(B, u1, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  const { p: ph2, errs: e2 } = await page(B, u2, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  for (const ph of [ph1, ph2]) await ph.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  for (const ph of [ph1, ph2]) await ph.waitForSelector('#profileOptions:not(.hidden)', { timeout: 15000 });

  /* 1: un tocco solo */
  await ph1.click('#profileOptions [data-hand="left"]');
  let b = await handBtn(ph1, 'left'), v = await game(g);
  check('1. un tocco su «Sinistra»: il pulsante chiede «Mancino? Tocca di nuovo», la mano resta destra', b.text === 'Mancino? Tocca di nuovo' && b.ask && !b.on && b.hand === 'right', JSON.stringify(b));
  await sleep(700); v = await game(g);
  check('   sul computer resta destra, nessun avviso', v.p1 === 'right' && !v.notice, JSON.stringify(v));
  await shot('1-telefono-domanda-mancino', ph1);
  await sleep(4000);
  b = await handBtn(ph1, 'left');
  check('   dopo 4 s la domanda sparisce: torna «Sinistra», mano destra', b.text === 'Sinistra' && !b.ask && b.hand === 'right', JSON.stringify(b));

  /* 2: due tocchi */
  await ph1.click('#profileOptions [data-hand="left"]'); await sleep(400); await ph1.click('#profileOptions [data-hand="left"]');
  b = await handBtn(ph1, 'left');
  check('2. due tocchi: mancino sul telefono', b.on && b.hand === 'left' && b.text === 'Sinistra', JSON.stringify(b));
  const noticed = await until(g, () => { const n = document.getElementById('natpf-hand-notice'); return __natpfTennis.natpfUi.hand.hand === 'left' && n && !n.classList.contains('hidden'); }, null, 8000);
  // (dopo l'entrata di 0,28 s, senza ridisegnare il campo: l'avviso resta 3 s e un fotogramma con la grafica software ne
  // prende uno)
  await sleep(450); await g.screenshot({ path: `${OUT}/2-avviso-mano-telefono-1.png` }); log('schermata 2-avviso-mano-telefono-1');
  v = await game(g);
  check('   sul computer: mano sinistra e avviso grande «Telefono 1: mano sinistra (mancino)»', noticed && v.notice === 'Telefono 1: mano sinistra (mancino)', JSON.stringify(v));
  const box = await g.evaluate(() => { const r = document.getElementById('natpf-hand-notice').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), fs: parseFloat(getComputedStyle(document.querySelector('#natpf-hand-notice b')).fontSize) }; });
  check(`   avviso al centro, grande, dentro lo schermo (${W}×${H})`, box.x > 0 && box.x + box.w < W && box.y > 0 && box.y + box.h < H && box.fs >= 28 && Math.abs(box.x + box.w/2 - W/2) < 4 && Math.abs(box.y + box.h/2 - H/2) < 4, JSON.stringify(box));
  await sleep(3400);
  v = await game(g);
  check('   l\'avviso sparisce dopo 3 s; la mano resta sinistra', !v.notice && v.p1 === 'left', JSON.stringify(v));
  const scheda = await g.evaluate(() => [...document.querySelectorAll('[data-split-hand^="p1:"]')].filter(x => x.classList.contains('selected')).map(x => x.dataset.splitHand));
  check('   pagina dei telefoni: la casella del Player 1 dice «Sinistra»', scheda.includes('p1:left'), JSON.stringify(scheda));

  /* 3: sensori, tutorial, scambi di prova con «Mancino», partita con la targhetta */
  for (const ph of [ph1, ph2]) await ph.click('#enable');
  for (const ph of [ph1, ph2]){ await ph.waitForSelector('#tutOk:not(.hidden)', { timeout: 20000 }); await ph.click('#tutOk'); }
  const inTrial = await until(g, () => __natpfTennis.natpfUi.trial.active, null, 30000);
  await sleep(1200);
  const row = await g.evaluate(() => { const r = id => document.querySelector(`.trial-row[data-trial-player="${id}"]`); const t = id => r(id)?.querySelector('.hand-tag')?.textContent || null; return { p1: t('p1'), p2: t('p2'), p1Hand: r('p1')?.dataset.hand || null }; });
  check('3. scambi di prova: «Mancino» nella riga dei puntini di Giulia, non in quella di Marco', inTrial && row.p1 === 'Mancino' && !row.p2 && row.p1Hand === 'left', JSON.stringify(row));
  await shot('3-scambi-di-prova-mancino');
  await g.evaluate(() => __natpfTennis.natpfUi.trial.skip());
  const inMatch = await until(g, () => !__natpfTennis.natpfUi.trial.active && __natpfTennis.natpfSplit?.active && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY'].includes(__natpfTennis.phase), null, 20000);
  await sleep(800);
  const tags = await g.evaluate(() => ['p1', 'p2'].map(id => { const t = document.querySelector(`#natpf-split-hud [data-split-tag="${id}"] .hand-tag`); return t && !t.classList.contains('hidden') && t.getBoundingClientRect().width > 0; }));
  check('   in partita: «Mancino» nella targhetta della metà di Giulia, non in quella di Marco', inMatch && tags[0] === true && tags[1] === false, JSON.stringify(tags));
  await shot('4-partita-targhetta-mancino');

  /* 4: tocchi per il lancio al servizio con il telefono a testa in giù */
  const before = (await game(g)).acc1;
  await g.evaluate(() => { const E = __natpfTennis; if (E.score) E.score.server = 'player'; E._setupPointServe?.({ showBanner: false }); });
  const serving = await until(ph1, () => window.__racchetta.state.phase === 'serve', null, 10000);
  await ph1.evaluate(() => { window.__upside = true; });
  await sleep(300);
  for (let k = 0; k < 6; k++){ await ph1.evaluate(() => { const s = document.getElementById('stage'), r = s.getBoundingClientRect(); s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 20, clientY: r.top + 20 })); }); await sleep(250); }
  await sleep(800);
  v = await game(g);
  check('4. sei tocchi al servizio con il telefono a testa in giù: il segno dei sensori non cambia', serving && v.acc1 === before && before === 1, JSON.stringify({ before, ...v }));
  // gli stessi tocchi con il computer al menu (pagina «Pronto per la partita», telefono da leggere) cambiano il segno: il
  // computer lo riceve («dev») e rimette a +1 il verso imparato
  await g.evaluate(() => { __natpfTennis.natpfUi.backToMenu?.('menu'); });
  const atMenu = await until(ph1, () => window.__racchetta.state.phase === 'menu', null, 10000);
  for (let k = 0; k < 6; k++){ await ph1.evaluate(() => document.getElementById('bar').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await sleep(200); }
  const flipped = await until(g, () => __natpfTennis.natpfPhone.accSign === -1, null, 8000);
  const tel = await g.evaluate(() => window.__tel.filter(r => r.motivo === 'segno'));
  check('   al menu gli stessi tocchi votano: segno −1 sul computer, riga «tel» del registro con causa «tocchi»', atMenu && flipped && tel.some(r => r.causa === 'tocchi' && r.stato === -1), JSON.stringify(tel));
  await ph1.evaluate(() => { window.__upside = false; });

  /* 5: chiosco */
  await g.evaluate(() => __natpfTennis.natpfUi.kiosk.reset());
  await sleep(500);
  v = await game(g);
  const manoTel = await g.evaluate(() => window.__tel.filter(r => r.motivo === 'mano').map(r => `${r.ruolo}:${r.mano}:${r.causa}`));
  check('5. chiosco: tutti e due destri, con la riga del registro', v.p1 === 'right' && (v.p2 === 'right' || v.p2 == null) && manoTel.includes('p1:left:telefono') && manoTel.includes('p1:right:chiosco'), JSON.stringify({ v, manoTel }));

  /* 6: pagina «Pronto per la partita» contro la CPU */
  await g.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.hand.set('left', 'gioco'); ui.lobby.setMode('cpu'); ui.lobby.go('match'); ui.lobby.paint(); });
  await sleep(500);
  const tag = await g.evaluate(() => { const t = document.getElementById('match-hand'), h = document.getElementById('lobby-t-match'), r = t?.getBoundingClientRect(), hr = h.getBoundingClientRect(); return { on: !!t && !t.classList.contains('hidden') && r.width > 0, text: t?.textContent, title: h?.textContent, row: !!r && r.left >= hr.right - 1 && r.top < hr.bottom && r.bottom > hr.top }; });
  check('6. «Pronto per la partita» contro la CPU: «Mancino» accanto al titolo (stessa riga: la pagina non si allunga)', tag.on && tag.text === 'Mancino' && tag.title === 'Pronto per la partita' && tag.row, JSON.stringify(tag));
  await g.screenshot({ path: `${OUT}/6-pronto-per-la-partita-mancino.png` }); log('schermata 6-pronto-per-la-partita-mancino');
  await g.evaluate(() => { __natpfTennis.natpfUi.hand.set('right', 'gioco'); __natpfTennis.natpfUi.lobby.paint(); });
  const off = await g.evaluate(() => document.getElementById('match-hand').classList.contains('hidden'));
  check('   destra: niente «Mancino»', off);

  const pageErrs = [...errs, ...e1, ...e2].filter(e => !/WebGL|GPU|webgl|AudioContext|autoplay/i.test(e));
  check('nessun errore nelle pagine', !pageErrs.length, pageErrs.slice(0, 4).join(' | '));
} catch (e){ check('prova completata senza eccezioni', false, e.message); }
finally { await B.close(); stop(); summary(); process.exit(process.exitCode || 0); }
