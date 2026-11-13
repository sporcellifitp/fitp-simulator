// NATPF motore base (natpf-tennis/): B20, 1v1 tra due persone nello stesso schermo (docs/b20/tappa-a.md; decisioni
// dell'utente del 10/11 sull'audit B19). Gioco vero con vite e due telefoni simulati. Percorso:
//   1. pannello dello stand (Ctrl+Maiusc+K): «Formato in fiera» di base «Solo stesso schermo» (tre valori), «Scambio che
//      si scalda» di base «Sì · dal 20° colpo» (B42; si spegne e si riaccende, resta salvato); il foglio con i pulsanti (dodici dal B25) sta nello schermo a
//      1280×720, 1920×540, 1024×600, 1366×657, 1920×1080 e 720×720;
//   2. menu → Gioca → Stesso schermo: «Batte per primo» di base «Sorteggio»; i due telefoni si collegano, conto, partita;
//      il banner d'inizio dice chi batte («Sorteggio: batte …», sorteggio guidato), formato in fiera acceso senza toccare
//      niente, sottotitolo del tabellone «1 game · punto decisivo sul 40-40», «Palla match <nome>»;
//   3. istruzioni del servizio a 1920×1080, 1280×720, 1920×540 e 720×720, per chi batte a sinistra e a destra, e il
//      richiamo per nome: mai sopra i due tabelloni, larghe uguali nelle due metà;
//   4. fine partita: «Rivincita» sui due telefoni; uno la chiede (si vede sul grande schermo e sull'altro telefono), poi
//      l'altro: partita nuova senza toccare il computer;
//   5. «Scambio che si scalda»: spenta dal pannello (prima partita) nessuna scritta; accesa (dalla partita dopo) la scritta
//      piccola «Scambio caldo · colpo N» dal 20° colpo (B42), sotto i tabelloni;
//   6. telefono del Player 2 chiuso in partita: riquadro della pausa con il nome e il QR non coperto (si legge e porta
//      al collegamento giusto), avviso sul telefono dell'altro.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-stesso-schermo-b20.mjs     (OUT=cartella delle schermate)
// Eventi devicemotion sintetici e due pagine del telefono sulla stessa macchina: non sostituiscono due telefoni veri.
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP, JSQR } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9137), GAME_PORT = +(process.env.GAME_PORT || 3137);
const OUT = path.join(SP, 'stesso-schermo-b20'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => console.log(`[${((Date.now() - T0)/1000).toFixed(1).padStart(5)} s] ${m}`);
const fmt = o => JSON.stringify(o);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono in verticale fermo (come natpf-split-ready.mjs): bastano i sensori vivi, i colpi qui non servono
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = { emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); } };
  window.__hold = setInterval(() => window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]), 16);
};
const until = async (p, fn, arg, ms = 20000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).then(() => true, () => false);
const phoneView = p => p.evaluate(() => { const rb = document.getElementById('rematch'); return { big: document.getElementById('big')?.textContent, sub: document.getElementById('sub')?.textContent, rematch: !!rb && !rb.classList.contains('hidden'), label: rb?.textContent, disabled: !!rb?.disabled }; });
const banner = g => g.evaluate(() => { const L = document.getElementById('center-banner-layer'), s = document.getElementById('center-banner-sub'); return { shown: !L.classList.contains('hidden'), text: document.getElementById('center-banner-text').textContent, sub: s.classList.contains('hidden') ? '' : s.textContent }; });
// riquadri: istruzioni del servizio (o un altro elemento) contro i due tabelloni (riquadro e sottotitolo)
const rects = (g, id) => g.evaluate(id => {
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 ? { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) } : null; };
  const el = document.getElementById(id), boards = [];
  for (const sb of ['natpf-scoreboard', 'natpf-scoreboard-p2']) for (const part of ['.sb-box', '.sb-foot']) boards.push({ id: `${sb} ${part}`, ...r(document.querySelector(`#${sb} ${part}`)) });
  return { box: el && !el.classList.contains('hidden') ? r(el) : null, text: el?.textContent || '', side: el?.dataset.side, call: el?.dataset.call || '', lines: el ? Math.round(el.querySelector('b').getBoundingClientRect().height/parseFloat(getComputedStyle(el.querySelector('b')).lineHeight)) : 0, boards, W: innerWidth, H: innerHeight };
}, id);
const overlap = (a, b) => (a && b && b.w ? Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l))*Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t)) : 0);
const covered = v => v.boards.map(b => ({ id: b.id, px: overlap(v.box, b) })).filter(o => o.px > 0);

const B = await launch();
try {
  const { p: g, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  // il disegno con la grafica software rallenta i fotogrammi: si disegna solo per le schermate
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const shot = async (name, el = g) => { if (el === g) await g.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await el.screenshot({ path: `${OUT}/${name}.png` }); log('schermata ' + name); };
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });

  /* 1: pannello dello stand */
  await g.keyboard.press('Control+Shift+KeyK');
  await g.waitForSelector('#natpf-staff:not(.hidden) [data-staff="fair"]', { state: 'visible', timeout: 10000 });
  const staff = () => g.evaluate(() => ({ fair: document.querySelector('[data-staff="fair"] b').textContent, hot: document.querySelector('[data-staff="hot"] b').textContent, hotOn: document.querySelector('[data-staff="hot"]').classList.contains('on'),
    savedFair: localStorage.getItem('natpf-tennis.formatoFiera'), savedHot: localStorage.getItem('natpf-tennis.scambioCaldo') }));
  let st = await staff();
  check('1. pannello dello stand: «Formato in fiera» di base «Solo stesso schermo», «Scambio che si scalda» di base «Sì · dal 20° colpo» (B42; niente di salvato)', st.fair === 'Solo stesso schermo' && st.hot === 'Sì · dal 20° colpo' && st.hotOn && st.savedFair == null && st.savedHot == null, fmt(st));
  // revisione: con il decimo pulsante a 1920×540 «Chiudi» e «Nuovo giocatore» finivano fuori vista (quarta fila), e a
  // 1024×600 restavano 23 px. Il foglio non scorre e i due pulsanti in fondo si vedono interi, a ogni misura
  const sheetAt = () => g.evaluate(() => {
    const s = document.querySelector('#natpf-staff .natpf-sheet'), r = s.getBoundingClientRect(), b = sel => s.querySelector(sel).getBoundingClientRect();
    const c = b('[data-staff="close"]'), n = b('[data-staff="newplayer"]'), tops = new Set([...s.querySelectorAll('.pause-grid > button')].map(x => Math.round(x.getBoundingClientRect().top)));
    return { scroll: s.scrollHeight - s.clientHeight, top: Math.round(r.top), bottom: Math.round(r.bottom), close: [Math.round(c.top), Math.round(c.bottom)], nuovo: [Math.round(n.top), Math.round(n.bottom)], file: tops.size, pulsanti: s.querySelectorAll('.pause-grid > button').length, H: innerHeight, margine: Math.round(innerHeight - r.bottom) };
  });
  for (const [w, h] of [[1280, 720], [1920, 540], [1024, 600], [1366, 657], [1920, 1080], [720, 720]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(450);
    const s = await sheetAt();
    check(`   pannello dello stand a ${w}×${h}: tredici pulsanti (dodici dal B25, dal B28 anche «Calibrazione»), niente scorrimento, «Chiudi» e «Nuovo giocatore» interi nello schermo`, s.pulsanti === 13 && s.scroll <= 0 && s.top >= 0 && s.bottom <= s.H && s.close[0] >= s.top && s.close[1] <= s.bottom && s.nuovo[0] >= s.top && s.nuovo[1] <= s.bottom, fmt(s));
    if (w === 1920 && h === 540 || w === 1024) await shot(`1-pannello-stand-${w}x${h}`);
  }
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(400);
  await shot('1-pannello-stand');
  const fairSeq = [];
  for (let i = 0; i < 3; i++){ await g.click('#natpf-staff [data-staff="fair"]'); await sleep(120); const s = await staff(); fairSeq.push(`${s.fair}=${s.savedFair}`); }
  check('   «Formato in fiera» ha tre valori: Sì · punto decisivo → No → Solo stesso schermo (salvati 1, no, split)', fairSeq.join(' | ') === 'Sì · punto decisivo=1 | No=no | Solo stesso schermo=split', fairSeq.join(' | '));
  await g.click('#natpf-staff [data-staff="hot"]'); await sleep(150);
  st = await staff();
  const toastOff = await g.evaluate(() => (document.body.innerText.match(/Scambio che si scalda spento[^\n]*/) || [''])[0]);
  check('   «Scambio che si scalda»: un clic lo spegne («No», salvato), con l\'avviso', st.hot === 'No' && !st.hotOn && st.savedHot === '0' && /scambi come sempre/.test(toastOff), fmt({ ...st, toastOff }));
  await g.click('#natpf-staff [data-staff="hot"]'); await sleep(150);
  st = await staff();
  const toast = await g.evaluate(() => (document.body.innerText.match(/Scambio che si scalda acceso[^\n]*/) || [''])[0]);
  check('   un altro clic lo riaccende («Sì · dal 20° colpo», salvato), con l\'avviso', st.hot === 'Sì · dal 20° colpo' && st.hotOn && st.savedHot === '1' && /dal 20° colpo/.test(toast), fmt({ ...st, toast }));
  await g.click('#natpf-staff [data-staff="hot"]'); await sleep(150);
  st = await staff();
  check('   e un altro lo spegne di nuovo (per la prima partita qui sotto)', st.hot === 'No' && !st.hotOn && st.savedHot === '0', fmt(st));
  await g.click('#natpf-staff [data-staff="close"]');

  /* 2: stesso schermo, sorteggio e formato in fiera di base */
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.menu('play'));
  await sleep(300);
  await g.click('[data-mode="split"]');
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'connect', null, { timeout: 8000 });
  await g.fill('[data-split-name="p1"]', 'Marco'); await g.fill('[data-split-name="p2"]', 'Giulia');
  // (i nomi sui pulsanti li scrive la pagina «Partita» quando si apre: qui la si ridisegna senza lasciare la pagina dei telefoni)
  const serve = await g.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L._paintServe(); const sel = document.querySelector('[data-natpf-serve].selected'); return { serve: L.serve, engine: __natpfTennis.natpfServeFirst, selected: sel?.textContent, all: [...document.querySelectorAll('[data-natpf-serve]')].map(b => b.textContent), saved: localStorage.getItem('natpf-tennis.serve.split') }; });
  check('2. «Batte per primo» nello stesso schermo: di base «Sorteggio» (Marco · Giulia · Sorteggio), senza niente di salvato', serve.serve === 'random' && serve.engine === 'random' && serve.selected === 'Sorteggio' && serve.all.join('|') === 'Marco|Giulia|Sorteggio' && serve.saved == null, fmt(serve));
  await g.waitForFunction(() => __natpfTennis.natpfPhone.pairingUrl && __natpfTennis.natpfPhone2?.pairingUrl, null, { timeout: 30000 });
  const [u1, u2] = await g.evaluate(() => [__natpfTennis.natpfPhone.pairingUrl, __natpfTennis.natpfPhone2.pairingUrl]);
  const { p: ph1 } = await page(B, u1, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  const { ctx: c2, p: ph2 } = await page(B, u2, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  for (const ph of [ph1, ph2]) await ph.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  for (const ph of [ph1, ph2]){ await ph.waitForSelector('#enable:not(.hidden)', { timeout: 15000 }).catch(() => {}); await ph.click('#enable'); }
  await until(g, () => { const S = __natpfTennis.natpfUi.split; return S.tutOpen.p1 && S.tutOpen.p2; });
  // sorteggio guidato (rng iniettabile): esce il Player 2
  await g.evaluate(() => { __natpfTennis.natpfRng = () => .9; });
  // tutorial e calibrazione li prova natpf-split-ready.mjs: qui «Gioca senza calibrare» per tutti e due (come il pulsante)
  await g.evaluate(() => { const S = __natpfTennis.natpfUi.split; for (const id of ['p1', 'p2']){ S._tutDone(id); S.phone(id).skipCalibration(); } S.paint(); });
  const started = await until(g, () => !!__natpfTennis.natpfSplit?.active && !__natpfTennis.natpfUi.lobby.visible && ['SERVE_STANCE', 'SERVE_TOSS'].includes(__natpfTennis.phase), null, 30000);
  check('   i due telefoni pronti: conto alla rovescia e partita, senza toccare il computer', started);
  await sleep(250);
  let bn = await banner(g);
  const m1 = await g.evaluate(() => { const E = __natpfTennis; return { fair: E.score.fair, server: E.score.server, hot: E.natpfHot, foot: [...document.querySelectorAll('[data-sb-format]')].map(e => e.textContent), serving: [...document.querySelectorAll('.sb-row.serving')].map(r => r.getAttribute('title')) }; });
  // (B35b, 13/11: con il servizio che cambia ogni 2 punti il banner d'inizio aggiunge la riga del formato veloce)
  const FAST = 'Formato veloce: il servizio cambia ogni 2 punti';
  check('   il sorteggio si vede: banner «Si gioca» con «Sorteggio: batte Giulia · Formato veloce…», e batte lei', bn.shown && bn.text === 'Si gioca' && bn.sub === `Sorteggio: batte Giulia · ${FAST}` && m1.server === 'opponent' && m1.serving.every(n => n === 'Giulia'), fmt({ bn, m1 }));
  check('   formato in fiera acceso di base nello stesso schermo; sottotitolo dei due tabelloni «1 game · punto decisivo sul 40-40»', m1.fair === true && m1.foot.length === 2 && m1.foot.every(t => t === '1 game · punto decisivo sul 40-40'), fmt(m1));
  check('   «Scambio che si scalda» spento dal pannello: questa partita non lo usa', m1.hot === false, String(m1.hot));
  await shot('2-inizio-sorteggio-1280');
  // «Palla match <nome>»: 40-15 per Marco (partita a 1 game)
  await g.evaluate(() => { const E = __natpfTennis; E.score.playerPoints = 3; E.score.opponentPoints = 1; E._syncScoreboardHUD(); E._setupPointServe({ showBanner: true }); });
  await sleep(200);
  bn = await banner(g);
  check('   «Palla match Marco» (prima «Palla match», senza dire di chi)', bn.shown && bn.text === 'Palla match Marco', fmt(bn));
  await shot('2b-palla-match-1280');
  await g.evaluate(() => { const E = __natpfTennis; E.score.playerPoints = 0; E.score.opponentPoints = 0; E._syncScoreboardHUD(); E.hud.hideCenterBanner(); });

  /* 3: istruzioni del servizio e tabellone, alle quattro misure */
  const SIZES = [[1920, 1080], [1280, 720], [1920, 540], [720, 720]];
  const serveBy = async who => { await g.evaluate(who => { const E = __natpfTennis; E.score.server = who; E.score.gameServer = who; E._setupPointServe({ showBanner: false }); E.hud.hideCenterBanner(); E.natpfUi.serveCoach.state.idle = 0; }, who); await until(g, who => { const el = document.getElementById('natpf-serve-coach'); return !el.classList.contains('hidden') && el.dataset.side === (who === 'opponent' ? 'right' : 'left') && !el.dataset.call; }, who, 5000); await sleep(150); };
  for (const [w, h] of SIZES){
    await g.setViewportSize({ width: w, height: h }); await sleep(500);
    const res = {};
    for (const who of ['player', 'opponent']){ await serveBy(who); res[who] = await rects(g, 'natpf-serve-coach'); }
    check(`   ${w}×${h}: (controllo della prova) misurate le istruzioni normali, non il richiamo`, !res.player.call && !res.opponent.call && res.player.side === 'left' && res.opponent.side === 'right', fmt({ sinistra: [res.player.side, res.player.call], destra: [res.opponent.side, res.opponent.call] }));
    const L = res.player, R = res.opponent, half = w/2;
    const inHalf = L.box && R.box && L.box.l >= 0 && L.box.r <= half && R.box.l >= half && R.box.r <= w && L.box.b < h*.6 && R.box.b < h*.6;
    check(`3. ${w}×${h}: le istruzioni del servizio non coprono nessun tabellone (chi batte a sinistra e a destra)`, !!L.box && !!R.box && !covered(L).length && !covered(R).length && /Alza il telefono: lanci la palla/.test(L.text), fmt({ sinistra: L.box, destra: R.box, coperti: [...covered(L), ...covered(R)], tabelloni: L.boards.map(b => `${b.t}-${b.b}`) }));
    check(`   ${w}×${h}: ognuna nella sua metà, larghe uguali e sullo stesso numero di righe (prima a destra più stretta, su 2–3 righe)`, inHalf && Math.abs(L.box.w - R.box.w) <= 2 && L.lines === R.lines && L.lines === 1, fmt({ wL: L.box?.w, wR: R.box?.w, righe: [L.lines, R.lines] }));
    await shot(`3-istruzioni-${w}x${h}-destra`);
    // richiamo per nome: chi batte (Giulia) resta ferma oltre 9 s
    await g.evaluate(() => { __natpfTennis.natpfUi.serveCoach.state.idle = 9.2; });
    const called = await until(g, () => document.getElementById('natpf-serve-coach').dataset.call === '1', null, 5000);
    await sleep(120);
    const C = await rects(g, 'natpf-serve-coach');
    check(`   ${w}×${h}: richiamo per nome «Giulia, batti tu» a tutta larghezza, sotto i due tabelloni`, called && /^Giulia, batti tu/.test(C.text) && !!C.box && !covered(C).length && C.box.l >= 0 && C.box.r <= w && Math.abs((C.box.l + C.box.r)/2 - half) <= 3, fmt({ box: C.box, testo: C.text, coperti: covered(C) }));
    await shot(`3b-richiamo-${w}x${h}`);
  }
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(400);

  /* 4: fine partita e rivincita dai telefoni */
  await g.evaluate(() => { const E = __natpfTennis; E.score.server = 'player'; E._setupPointServe({ showBanner: false }); for (let i = 0; i < 4; i++) E._awardPoint('opponent', 'Out'); });
  const over = await until(g, () => __natpfTennis.phase === 'MATCH_OVER' && !document.getElementById('victory-modal').classList.contains('hidden'), null, 10000);
  await until(ph1, () => !document.getElementById('rematch').classList.contains('hidden'), null, 8000);
  await until(ph2, () => !document.getElementById('rematch').classList.contains('hidden'), null, 8000);
  await sleep(900);   // (l'avviso del punto sul telefono dura 1,3 s: poi torna la schermata)
  let v1 = await phoneView(ph1), v2 = await phoneView(ph2);
  let line = await g.evaluate(() => { const el = document.getElementById('victory-rematch'); return { shown: !el.classList.contains('hidden') && el.getBoundingClientRect().height > 0, text: el.textContent, title: document.getElementById('victory-result-banner').textContent }; });
  check('4. fine partita («Vince Giulia!»): i due telefoni mostrano «Rivincita», il grande schermo dice come si fa', over && line.title === 'Vince Giulia!' && v1.rematch && v2.rematch && v1.label === 'Rivincita' && !v1.disabled && line.shown && /toccate «Rivincita» tutti e due/.test(line.text), fmt({ v1, v2, line }));
  await shot('4-fine-partita-1280'); await shot('4-telefono-marco-rivincita', ph1);
  await ph2.click('#rematch');
  await until(g, () => /vuole la rivincita/.test(document.getElementById('victory-rematch').textContent), null, 5000);
  await until(ph1, () => /vuole la rivincita/.test(document.getElementById('sub').textContent), null, 5000);
  v1 = await phoneView(ph1); v2 = await phoneView(ph2);
  line = await g.evaluate(() => ({ text: document.getElementById('victory-rematch').textContent, phase: __natpfTennis.phase }));
  check('   Giulia la chiede: sul grande schermo «Giulia vuole la rivincita · manca Marco», la partita non parte ancora', line.text === 'Giulia vuole la rivincita · manca Marco' && line.phase === 'MATCH_OVER', fmt(line));
  check('   il telefono di Giulia: pulsante spento «Rivincita chiesta ✓»; quello di Marco: «Giulia vuole la rivincita: tocca «Rivincita».»', v2.disabled && v2.label === 'Rivincita chiesta ✓' && /Aspetto Marco/.test(v2.sub) && v1.rematch && !v1.disabled && v1.sub === 'Giulia vuole la rivincita: tocca «Rivincita».', fmt({ v1, v2 }));
  await shot('4b-giulia-vuole-la-rivincita-1280'); await shot('4b-telefono-giulia-chiesta', ph2);
  // dalla partita dopo: «Scambio che si scalda» acceso (come dal pannello dello stand), sorteggio guidato: esce il Player 1
  await g.evaluate(() => { localStorage.setItem('natpf-tennis.scambioCaldo', '1'); __natpfTennis.natpfRng = () => .1; });
  const seq0 = await g.evaluate(() => __natpfTennis.natpfMatchSeq);
  await ph1.click('#rematch');
  const again = await until(g, s => __natpfTennis.natpfMatchSeq === s + 1 && ['SERVE_STANCE', 'SERVE_TOSS'].includes(__natpfTennis.phase), seq0, 8000);
  await sleep(300);
  bn = await banner(g);
  const m2 = await g.evaluate(() => { const E = __natpfTennis; return { split: !!E.natpfSplit?.active, server: E.score.server, fair: E.score.fair, hot: E.natpfHot, pts: [E.score.playerPoints, E.score.opponentPoints, E.score.playerGames, E.score.opponentGames], modal: !document.getElementById('victory-modal').classList.contains('hidden'), lobby: __natpfTennis.natpfUi.lobby.visible }; });
  check('   la chiede anche Marco: partita nuova senza toccare il computer (0-0, stesso schermo, scheda finale chiusa)', again && m2.split && !m2.modal && !m2.lobby && m2.pts.join('') === '0000' && m2.fair === true, fmt(m2));
  check('   nuovo sorteggio, scritto nel banner: «Sorteggio: batte Marco · Formato veloce…»', bn.sub === `Sorteggio: batte Marco · ${FAST}` && m2.server === 'player', fmt(bn));
  await until(ph1, () => document.getElementById('rematch').classList.contains('hidden'), null, 5000);
  v1 = await phoneView(ph1); v2 = await phoneView(ph2);
  check('   i telefoni tolgono «Rivincita» e tornano alla partita («Al servizio» per chi batte)', !v1.rematch && !v2.rematch && v1.big === 'Al servizio', fmt({ v1, v2 }));
  await shot('4c-rivincita-partita-1280');

  /* 5: scambio che si scalda, acceso dalla partita dopo */
  check('5. «Scambio che si scalda» acceso dal pannello: vale dalla partita dopo (questa lo usa)', m2.hot === true, String(m2.hot));
  const hotAt = async n => { await g.evaluate(n => { const E = __natpfTennis; E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.rallyStrokeCount = n; E.ball.lastHitter = 'player'; E.ball.pos.set(0, 1.4, 0); E.ball.vel.set(0, 3, -4); }, n); await sleep(140); return rects(g, 'natpf-hot-rally'); };
  const h19 = await hotAt(19), h22 = await hotAt(22);
  const lvl = await g.evaluate(() => document.getElementById('natpf-hot-rally').dataset.level);
  check('   fino al 19° colpo nessuna scritta; dal 20° «Scambio caldo · colpo N», piccola (B42)', !h19.box && !!h22.box && /^Scambio caldocolpo 22$/.test(h22.text) && h22.box.h <= 30, fmt({ h19: h19.box, h22: h22.box, testo: h22.text, grado: lvl }));
  check('   la scritta sta sotto i tabelloni, al centro, e non li copre', !!h22.box && !covered(h22).length && Math.abs((h22.box.l + h22.box.r)/2 - 640) <= 3, fmt({ box: h22.box, coperti: covered(h22) }));
  await shot('5-scambio-caldo-1280');
  const h30 = await hotAt(30), lvl3 = await g.evaluate(() => document.getElementById('natpf-hot-rally').dataset.level);
  check('   più avanti nello scambio la scritta cambia grado (colore)', !!h30.box && lvl === '1' && lvl3 === '3', fmt({ lvl, lvl3 }));
  await shot('5b-scambio-caldo-grado-3-1280');
  await g.evaluate(() => { const E = __natpfTennis; E._setupPointServe({ showBanner: false }); });
  await sleep(200);
  const hOff = await rects(g, 'natpf-hot-rally');
  check('   a punto finito (di nuovo al servizio) la scritta sparisce', !hOff.box);

  /* 6: telefono del Player 2 chiuso in partita */
  await c2.close();
  const held = await until(g, () => { const el = document.getElementById('natpf-phone-hold'); return !!el && !el.classList.contains('hidden') && !!el.querySelector('[data-hold-qr="p2"]:not(.hidden) svg'); }, null, 25000);
  await sleep(300);
  await g.addScriptTag({ content: readFileSync(JSQR, 'utf8') });
  const hold = await g.evaluate(async () => {
    const el = document.getElementById('natpf-phone-hold'), fig = el.querySelector('[data-hold-qr="p2"]'), box = fig.querySelector('.hold-qr'), b = box.getBoundingClientRect();
    // nessun punto del QR è coperto da altro (griglia 5×5)
    let free = 0; for (let i = 1; i <= 5; i++) for (let j = 1; j <= 5; j++){ const t = document.elementFromPoint(b.left + b.width*i/6, b.top + b.height*j/6); if (t && box.contains(t)) free++; }
    const xml = new XMLSerializer().serializeToString(box.querySelector('svg'));
    const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(xml); await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 400); x.drawImage(img, 20, 20, 360, 360);
    const r = jsQR(x.getImageData(0, 0, 400, 400).data, 400, 400);
    return { title: el.querySelector('b').textContent, text: el.querySelector('p').textContent, cap: fig.querySelector('figcaption').textContent, p1qr: !el.querySelector('[data-hold-qr="p1"]').classList.contains('hidden'), free, size: Math.round(b.width), inView: b.top >= 0 && b.bottom <= innerHeight && el.getBoundingClientRect().bottom <= innerHeight,
      decoded: r && r.data, url: __natpfTennis.natpfPhone2.pairingUrl, modal: !document.getElementById('natpf-phone-modal')?.classList.contains('hidden') && !!document.getElementById('natpf-phone-modal'), paused: __natpfTennis.natpfPaused };
  });
  check('6. telefono di Giulia chiuso in partita: pausa «Telefono di Giulia in pausa» con il suo QR dentro il riquadro', held && hold.title === 'Telefono di Giulia in pausa' && hold.cap === 'Telefono di Giulia: inquadra questo QR' && !hold.p1qr && hold.paused, fmt({ title: hold.title, cap: hold.cap, text: hold.text }));
  check('   il QR non è coperto (25 punti su 25), sta nello schermo, si legge e porta al collegamento del Player 2', hold.free === 25 && hold.inView && hold.size >= 150 && !!hold.decoded && hold.decoded === hold.url, fmt({ liberi: hold.free, lato: hold.size, letto: hold.decoded === hold.url }));
  // revisione: a partita ferma le istruzioni del servizio non restano sotto il riquadro della pausa
  const coachHidden = await g.evaluate(() => document.getElementById('natpf-serve-coach').classList.contains('hidden'));
  check('   in pausa le istruzioni del servizio spariscono', coachHidden);
  const hb = await rects(g, 'natpf-phone-hold');
  check('   il riquadro della pausa non copre i tabelloni', !!hb.box && !covered(hb).length, fmt({ box: hb.box, coperti: covered(hb) }));
  const p1note = await until(ph1, () => /aspetto il telefono di Giulia/.test(document.getElementById('sub').textContent), null, 8000);
  v1 = await phoneView(ph1);
  check('   il telefono di Marco lo sa: «Pausa · Partita in pausa: aspetto il telefono di Giulia…»', p1note && v1.big === 'Pausa', fmt(v1));
  await shot('6-telefono-caduto-1280'); await shot('6-telefono-marco-pausa', ph1);
  // il QR resta leggibile e nello schermo anche nelle aree basse e quadrate
  for (const [w, h] of [[1920, 540], [720, 720]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(400);
    const q = await g.evaluate(() => { const el = document.getElementById('natpf-phone-hold'), b = el.querySelector('[data-hold-qr="p2"] .hold-qr').getBoundingClientRect(), e = el.getBoundingClientRect(); return { lato: Math.round(b.width), top: Math.round(e.top), bottom: Math.round(e.bottom), H: innerHeight, W: innerWidth, right: Math.round(e.right), left: Math.round(e.left) }; });
    const hb2 = await rects(g, 'natpf-phone-hold');
    check(`   ${w}×${h}: riquadro della pausa con il QR tutto nello schermo, senza coprire i tabelloni`, q.top >= 0 && q.bottom <= q.H && q.left >= 0 && q.right <= q.W && q.lato >= 150 && !covered(hb2).length, fmt({ ...q, coperti: covered(hb2) }));
    await shot(`6b-telefono-caduto-${w}x${h}`);
  }
  check('nessun errore nella pagina del gioco', errs.length === 0, errs.slice(0, 3).join(' | '));
} catch (e){ check('prova completata senza eccezioni', false, String(e?.stack || e).slice(0, 600)); }
finally { await B.close().catch(() => {}); stop(); }
summary();
setTimeout(() => process.exit(), 300);
