// NATPF motore base (natpf-tennis/): B25, stesso schermo tra due persone (docs/b25/stesso-schermo-equilibrio.md; decisioni
// dell'utente dell'11/11). Gioco vero con vite e due telefoni simulati. Percorso:
//   1. pannello dello stand (Ctrl+Maiusc+K): «Lancio automatico» e «Stesso schermo: campo aperto» di base «No» (niente di
//      salvato), si accendono e si spengono con un clic e restano salvati; il foglio con i dodici pulsanti sta nello
//      schermo, con «Chiudi» e «Nuovo giocatore» interi, a 1920×540, 1024×600, 1280×720, 1366×657, 720×720 e 1920×1080;
//   2. pagina dei telefoni dello stesso schermo: su ogni scheda la fascia «Bambino · Ragazzo · Adulto», di base Adulto per
//      tutti e due (nessun aiuto); con il Player 2 «Bambino» la barra dell'avvio dichiara l'aiuto; le schede restano nel
//      riquadro e, dove si vedeva già tutta, la barra resta sopra il piè di pagina;
//   3. partita: il bambino parte da 15-0, sotto il suo nome «Aiuto: Bambino», sotto l'altro niente;
//   4. lancio automatico spento: chi batte resta fermo e il gioco aspetta; acceso (dalla partita dopo): il richiamo dice
//      i secondi che mancano, il gioco lancia, la palla ricade; al secondo lancio a vuoto il gioco batte lui;
//   5. campo aperto spento e acceso: il personaggio corre verso la palla a 9,8 m/s oppure a 5,9, e rientra a 2;
//   6. «Nuovo giocatore» dal pannello dello stand: le fasce tornano Adulto.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-stesso-schermo-b25.mjs     (OUT=cartella delle schermate)
// Eventi devicemotion sintetici e due pagine del telefono sulla stessa macchina: non sostituiscono due telefoni veri.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9145), GAME_PORT = +(process.env.GAME_PORT || 3145);
const OUT = path.join(SP, 'stesso-schermo-b25'); mkdirSync(OUT, { recursive: true });
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
  window.__up = { emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: acc[1] - G, z: acc[2] }, interval: 16 })); } };
  window.__hold = setInterval(() => window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]), 16);
};
const until = async (p, fn, arg, ms = 20000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).then(() => true, () => false);

const B = await launch();
try {
  const { p: g, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  // il disegno con la grafica software rallenta i fotogrammi: si disegna solo per le schermate
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const shot = async (name, el = g) => { if (el === g) await g.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await el.screenshot({ path: `${OUT}/${name}.png` }); log('schermata ' + name); };
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
  const openStaff = async () => { await g.keyboard.press('Control+Shift+KeyK'); await g.waitForSelector('#natpf-staff:not(.hidden) [data-staff="close"]', { state: 'visible', timeout: 10000 }); };

  /* 1: pannello dello stand */
  await openStaff();
  const staff = () => g.evaluate(() => { const b = k => document.querySelector(`[data-staff="${k}"]`); return { auto: b('autotoss').querySelector('b').textContent, autoOn: b('autotoss').classList.contains('on'), autoName: b('autotoss').querySelector('span').textContent,
    open: b('open').querySelector('b').textContent, openOn: b('open').classList.contains('on'), openName: b('open').querySelector('span').textContent, savedAuto: localStorage.getItem('natpf-tennis.lancioAuto'), savedOpen: localStorage.getItem('natpf-tennis.campoAperto') }; });
  let st = await staff();
  check('1. pannello dello stand: «Lancio automatico» e «Stesso schermo: campo aperto» di base «No», niente di salvato', st.autoName === 'Lancio automatico' && st.openName === 'Stesso schermo: campo aperto' && st.auto === 'No' && st.open === 'No' && !st.autoOn && !st.openOn && st.savedAuto == null && st.savedOpen == null, fmt(st));
  const sheetAt = () => g.evaluate(() => {
    const s = document.querySelector('#natpf-staff .natpf-sheet'), r = s.getBoundingClientRect(), b = sel => s.querySelector(sel).getBoundingClientRect();
    const c = b('[data-staff="close"]'), n = b('[data-staff="newplayer"]'), btn = [...s.querySelectorAll('.pause-grid > button')], tops = new Set(btn.map(x => Math.round(x.getBoundingClientRect().top)));
    // testo dei pulsanti dentro il pulsante (niente scritte tagliate)
    const cut = btn.filter(x => x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1).map(x => x.dataset.staff);
    return { scroll: s.scrollHeight - s.clientHeight, top: Math.round(r.top), bottom: Math.round(r.bottom), close: [Math.round(c.top), Math.round(c.bottom)], nuovo: [Math.round(n.top), Math.round(n.bottom)], file: tops.size, pulsanti: btn.length, H: innerHeight, margine: Math.round(innerHeight - Math.max(c.bottom, n.bottom)), tagliati: cut };
  });
  for (const [w, h] of [[1920, 540], [1024, 600], [1280, 720], [1366, 657], [720, 720], [1920, 1080]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(450);
    const s = await sheetAt();
    check(`   pannello dello stand a ${w}×${h}: dodici pulsanti, niente scorrimento, «Chiudi» e «Nuovo giocatore» interi nello schermo, nessuna scritta tagliata`, s.pulsanti === 12 && s.scroll <= 0 && s.top >= 0 && s.bottom <= s.H && s.close[0] >= s.top && s.close[1] <= s.bottom && s.nuovo[0] >= s.top && s.nuovo[1] <= s.bottom && !s.tagliati.length, fmt(s));
    await shot(`1-pannello-stand-${w}x${h}`);
  }
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(400);
  for (const [k, on, key, word] of [['autotoss', 'Sì · 30 s', 'savedAuto', /Lancio automatico acceso[^\n]*/], ['open', 'Sì · il piazzamento conta', 'savedOpen', /Campo aperto acceso[^\n]*/]]){
    await g.click(`#natpf-staff [data-staff="${k}"]`); await sleep(150);
    st = await staff();
    const toast = await g.evaluate(re => (document.body.innerText.match(new RegExp(re)) || [''])[0], word.source);
    const v = k === 'autotoss' ? [st.auto, st.autoOn] : [st.open, st.openOn];
    check(`   «${k === 'autotoss' ? 'Lancio automatico' : 'Stesso schermo: campo aperto'}»: un clic lo accende («${on}», salvato), con l'avviso`, v[0] === on && v[1] && st[key] === '1' && /Vale dalla prossima partita/.test(toast), fmt({ v, saved: st[key], toast }));
    if (k === 'open') await shot('1b-pannello-stand-accesi');
    await g.click(`#natpf-staff [data-staff="${k}"]`); await sleep(150);
    st = await staff();
    const w = k === 'autotoss' ? [st.auto, st.autoOn] : [st.open, st.openOn];
    check('   un altro clic lo spegne («No», salvato 0)', w[0] === 'No' && !w[1] && st[key] === '0', fmt({ w, saved: st[key] }));
  }
  // revisione: anche con le opzioni ACCESE (scritte più lunghe) e il chiosco acceso (nota su due righe): a 720×720 il
  // foglio scorreva di 6 px
  for (const k of ['hot', 'kiosk', 'autotoss', 'open']){ await g.click(`#natpf-staff [data-staff="${k}"]`); await sleep(120); }
  for (const [w, h] of [[1920, 540], [1024, 600], [1280, 720], [1366, 657], [720, 720]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(450);
    const s = await sheetAt();
    check(`   pannello dello stand a ${w}×${h} con chiosco, scambio caldo, lancio automatico e campo aperto accesi: niente scorrimento, «Chiudi» e «Nuovo giocatore» interi, nessuna scritta tagliata`, s.pulsanti === 12 && s.scroll <= 0 && s.top >= 0 && s.bottom <= s.H && s.close[0] >= s.top && s.close[1] <= s.bottom && s.nuovo[0] >= s.top && s.nuovo[1] <= s.bottom && !s.tagliati.length, fmt(s));
    if (h === 720 && w === 720 || h === 540) await shot(`1c-pannello-stand-accesi-${w}x${h}`);
  }
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(400);
  for (const k of ['hot', 'kiosk', 'autotoss', 'open']){ await g.click(`#natpf-staff [data-staff="${k}"]`); await sleep(120); }
  st = await staff();
  check('   rispente: tutto come di base', st.auto === 'No' && st.open === 'No' && st.savedAuto === '0' && st.savedOpen === '0' && await g.evaluate(() => !__natpfTennis.natpfUi.kiosk?.enabled), fmt(st));
  await g.click('#natpf-staff [data-staff="close"]');

  /* 2: pagina dei telefoni, fasce */
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.menu('play'));
  await sleep(300);
  await g.click('[data-mode="split"]');
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'connect', null, { timeout: 8000 });
  await g.fill('[data-split-name="p1"]', 'Marco'); await g.fill('[data-split-name="p2"]', 'Giulia');
  await g.waitForFunction(() => __natpfTennis.natpfPhone.pairingUrl && __natpfTennis.natpfPhone2?.pairingUrl, null, { timeout: 30000 });
  const bands = () => g.evaluate(() => { const sel = id => [...document.querySelectorAll(`[data-split-band^="${id}:"]`)].filter(b => b.classList.contains('selected')).map(b => b.textContent), all = id => [...document.querySelectorAll(`[data-split-band^="${id}:"]`)].map(b => b.textContent);
    const barEl = document.getElementById('split-ready-bar'), sub = barEl.querySelector('[data-ready-bar-sub]').textContent, note = (sub.match(/Aiuto a .*$/) || [''])[0];
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; };
    const inCard = id => [...document.querySelectorAll(`[data-split-band^="${id}:"]`)].every(b => b.closest(`[data-split-player="${id}"]`) && vis(b));
    const bar = barEl.getBoundingClientRect(), set = document.querySelector('[data-setup="split"]'), foot = document.getElementById('lobby-back').getBoundingClientRect();
    const cards = ['p1', 'p2'].map(id => { const r = document.querySelector(`[data-split-player="${id}"]`).getBoundingClientRect(), q = set.getBoundingClientRect(); return r.left >= q.left && r.right <= q.right; });
    // revisione: «Aiuto» sulla scheda di chi è aiutato; in vista = intero nello schermo e sopra il piè di pagina
    const badge = id => { const t = document.querySelector(`[data-band-help="${id}"]`), r = t.getBoundingClientRect(); return { on: t.parentElement.classList.contains('helped') && getComputedStyle(t).display !== 'none', text: t.textContent, title: t.title, seen: r.width > 0 && r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= document.getElementById('lobby-back').getBoundingClientRect().top, inCard: !!t.closest(`[data-split-player="${id}"]`) }; };
    return { badge: { p1: badge('p1'), p2: badge('p2') }, engine: __natpfTennis.natpfSplitBands, p1: sel('p1'), p2: sel('p2'), all: all('p1'), note, sub, inCard: [inCard('p1'), inCard('p2')], cards, overflowX: set.scrollWidth - set.clientWidth, bar: [Math.round(bar.top), Math.round(bar.bottom)], foot: Math.round(foot.top), H: innerHeight }; });
  let bd = await bands();
  check('2. pagina dei telefoni: su ogni scheda «Bambino · Ragazzo · Adulto», di base Adulto per tutti e due, nessun aiuto', bd.all.join('|') === 'Bambino|Ragazzo|Adulto' && bd.p1.join() === 'Adulto' && bd.p2.join() === 'Adulto' && bd.engine.p1 === 'adulto' && bd.engine.p2 === 'adulto' && !bd.note && !bd.badge.p1.on && !bd.badge.p2.on && bd.inCard.every(Boolean) && bd.overflowX <= 0, fmt(bd));
  await shot('2-telefoni-fasce-di-base');
  await g.click('[data-split-band="p2:bambino"]'); await sleep(200);
  bd = await bands();
  check('   Giulia «Bambino»: la barra dell\'avvio dichiara l\'aiuto, con il nome e cosa cambia', bd.p2.join() === 'Bambino' && bd.p1.join() === 'Adulto' && bd.engine.p2 === 'bambino' && bd.note === 'Aiuto a Giulia (Bambino): parte da 15-0 e ha più margine sul tempo.', fmt(bd));
  check('   sulla scheda di Giulia compare «Aiuto» (con la frase intera al passaggio del mouse); su quella di Marco niente', bd.badge.p2.on && bd.badge.p2.text === 'Aiuto' && bd.badge.p2.inCard && bd.badge.p2.title === bd.note && !bd.badge.p1.on, fmt(bd.badge));
  for (const [w, h] of [[1280, 720], [1024, 600], [1920, 540], [1366, 657], [720, 720]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(450);
    const s = await bands();
    // (a 720×720 la pagina dei telefoni scorre, come prima del B25: la riga delle fasce è più sotto)
    if (!(w === 720 && h === 720)) check(`   pagina dei telefoni a ${w}×${h}: «Aiuto» sulla scheda di Giulia è in vista senza scorrere${h <= 600 ? ' (qui la barra dell\'avvio è sotto il piè di pagina)' : ''}`, s.badge.p2.on && s.badge.p2.seen && !s.badge.p1.on, fmt({ badge: s.badge.p2, bar: s.bar, foot: s.foot }));
    // le schede restano nel riquadro (niente scorrimento di lato); dove la barra dell'avvio si vedeva già tutta (1280×720 e
    // 1366×657; alle altre misure il riquadro scorre, come prima del B25) resta sopra il piè di pagina
    const full = (w === 1280 && h === 720) || (w === 1366 && h === 657);
    check(`   pagina dei telefoni a ${w}×${h}: le fasce sono sulle schede, le schede nel riquadro${full ? ', la barra dell\'avvio sopra il piè di pagina' : ''}`, s.all.length === 3 && s.cards.every(Boolean) && s.overflowX <= 0 && (!full || (s.inCard.every(Boolean) && s.bar[1] <= s.foot)), fmt({ inCard: s.inCard, cards: s.cards, overflowX: s.overflowX, bar: s.bar, foot: s.foot, H: s.H }));
    await shot(`2b-telefoni-aiuto-${w}x${h}`);
  }
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(400);
  await g.click('[data-split-band="p2:ragazzo"]'); await sleep(150);
  bd = await bands();
  check('   Giulia «Ragazzo»: aiuto più leggero (solo il margine sul tempo)', bd.note === 'Aiuto a Giulia (Ragazzo): ha più margine sul tempo.', fmt(bd));
  await g.click('[data-split-band="p1:ragazzo"]'); await sleep(150);
  bd = await bands();
  check('   tutti e due «Ragazzo»: fasce uguali, nessun aiuto', !bd.note && !bd.badge.p1.on && !bd.badge.p2.on && bd.engine.p1 === 'ragazzo' && bd.engine.p2 === 'ragazzo', fmt(bd));
  await g.click('[data-split-band="p1:adulto"]'); await g.click('[data-split-band="p2:bambino"]'); await sleep(150);

  /* 3: partita con l'aiuto dichiarato */
  const [u1, u2] = await g.evaluate(() => [__natpfTennis.natpfPhone.pairingUrl, __natpfTennis.natpfPhone2.pairingUrl]);
  const { p: ph1 } = await page(B, u1, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  const { p: ph2 } = await page(B, u2, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  for (const ph of [ph1, ph2]) await ph.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  for (const ph of [ph1, ph2]){ await ph.waitForSelector('#enable:not(.hidden)', { timeout: 15000 }).catch(() => {}); await ph.click('#enable'); }
  await until(g, () => { const S = __natpfTennis.natpfUi.split; return S.tutOpen.p1 && S.tutOpen.p2; });
  await g.evaluate(() => { __natpfTennis.natpfRng = () => .9; });   // sorteggio guidato: batte il Player 2
  await g.evaluate(() => { const S = __natpfTennis.natpfUi.split; for (const id of ['p1', 'p2']){ S._tutDone(id); S.phone(id).skipCalibration(); } S.paint(); });
  const started = await until(g, () => !!__natpfTennis.natpfSplit?.active && !__natpfTennis.natpfUi.lobby.visible && ['SERVE_STANCE', 'SERVE_TOSS'].includes(__natpfTennis.phase), null, 30000);
  check('3. i due telefoni pronti: conto alla rovescia e partita', started);
  await sleep(400);
  const match = () => g.evaluate(() => { const E = __natpfTennis, tag = id => { const t = document.querySelector(`[data-split-tag="${id}"]`); return { name: t.querySelector('b').textContent, sub: t.querySelector('span').textContent, helped: t.classList.contains('helped'), shown: !document.getElementById('natpf-split-hud').classList.contains('hidden') }; };
    return { duo: E.natpfDuo, head: E.natpfHead, pts: [E.score.playerPoints, E.score.opponentPoints], server: E.score.server, phase: E.phase, p1: tag('p1'), p2: tag('p2'), board: [...document.querySelectorAll('#natpf-scoreboard .sb-pts, #natpf-scoreboard [data-sb-points]')].map(e => e.textContent) }; });
  let m = await match();
  check('   il bambino parte da 15-0 (punti 0-1 per il Player 2), l\'aiuto è quello della variante in gioco', m.duo?.helped === true && m.duo.help.p1 === null && m.duo.help.p2?.band === 'bambino' && m.duo.help.p2.head === 1 && m.head === 1 && m.pts.join('-') === '0-1', fmt({ help: m.duo?.help, head: m.head, pts: m.pts }));
  check('   in campo, sotto il nome di Giulia «Aiuto: Bambino»; sotto quello di Marco niente', m.p2.shown && m.p2.name === 'Giulia' && m.p2.sub === 'Aiuto: Bambino' && m.p2.helped && m.p1.name === 'Marco' && m.p1.sub === '' && !m.p1.helped, fmt({ p1: m.p1, p2: m.p2 }));
  check('   lancio automatico e campo aperto spenti: questa partita non li usa', m.duo.autoToss === false && m.duo.open === false, fmt({ autoToss: m.duo.autoToss, open: m.duo.open }));
  await g.evaluate(() => __natpfTennis.hud.hideCenterBanner());
  await shot('3-partita-aiuto-1280');
  for (const [w, h] of [[1920, 540], [720, 720]]){ await g.setViewportSize({ width: w, height: h }); await sleep(500); await shot(`3b-partita-aiuto-${w}x${h}`); }
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(400);

  /* 4: lancio automatico spento, poi acceso */
  const coach = () => g.evaluate(() => { const el = document.getElementById('natpf-serve-coach'), E = __natpfTennis; return { shown: !el.classList.contains('hidden'), big: el.querySelector('[data-c="big"]').textContent, sub: el.querySelector('[data-c="sub"]').textContent, call: el.dataset.call || '', phase: E.phase, timer: +E.phaseTimer.toFixed(1), live: E.natpfAutoLive, misses: E.natpfAutoMisses, tossMisses: E.natpfTossMisses || 0 }; });
  // (il tempo fermo al servizio si porta avanti a mano: phaseTimer del motore e il conto delle istruzioni)
  const idle = s => g.evaluate(s => { const E = __natpfTennis; E.phaseTimer = s; E.natpfUi.serveCoach.state.idle = s; }, s);
  await idle(45); await sleep(1500);
  let c = await coach();
  check('4. lancio automatico spento: dopo 45 s chi batte è ancora fermo, il gioco aspetta e lo chiama per nome', c.phase === 'SERVE_STANCE' && c.shown && c.big === 'Giulia, batti tu' && c.sub === 'Alza il telefono: lanci la palla' && c.tossMisses === 0, fmt(c));
  await shot('4-lancio-automatico-spento');
  // lo staff lo accende dal pannello (in partita il pannello si apre lo stesso): vale dalla partita dopo
  await g.evaluate(() => { localStorage.setItem('natpf-tennis.lancioAuto', '1'); });
  m = await match();
  check('   acceso a partita in corso: questa partita resta senza (vale dalla prossima)', m.duo.autoToss === false);
  await g.evaluate(() => { const E = __natpfTennis; E.natpfRng = () => .9; E.startNewMatch({ showStartBanner: false }); E.hud.hideCenterBanner(); });
  await sleep(300);
  m = await match();
  check('   partita dopo: lancio automatico acceso', m.duo.autoToss === true && m.phase === 'SERVE_STANCE' && m.server === 'opponent', fmt({ autoToss: m.duo.autoToss, phase: m.phase }));
  await idle(22.5); await sleep(700);
  c = await coach();
  check('   negli ultimi 10 s il richiamo dice che la palla la lancia il gioco, con i secondi', c.phase === 'SERVE_STANCE' && c.shown && c.big === 'Giulia, batti tu' && /^Alza il telefono: lanci la palla · tra [5-8] s la lancia il gioco$/.test(c.sub) && c.call === '1', fmt(c));
  await shot('4b-lancio-automatico-annuncio');
  await idle(29.6);
  const tossed = await until(g, () => __natpfTennis.phase === 'SERVE_TOSS', null, 5000);
  c = await coach();
  check('   a 30 s il gioco lancia la palla («Lancio automatico»)', tossed && c.live === 'toss' && (c.big === 'Lancio automatico' || c.big === 'Colpisci!'), fmt(c));
  await shot('4c-lancio-automatico-in-aria');
  const fell = await until(g, () => __natpfTennis.phase === 'SERVE_STANCE', null, 6000);
  c = await coach();
  check('   nessuno colpisce: la palla ricade, lancio a vuoto come sempre (nessun punto perso)', fell && c.misses === 1 && c.tossMisses === 1, fmt(c));
  await idle(14.7);
  const tossed2 = await until(g, () => __natpfTennis.phase === 'SERVE_TOSS', null, 5000);
  const fell2 = await until(g, () => __natpfTennis.phase === 'SERVE_STANCE', null, 6000);
  c = await coach();
  check('   dopo altri 15 s secondo lancio automatico, a vuoto anche questo', tossed2 && fell2 && c.misses === 2, fmt(c));
  await sleep(1300);
  c = await coach();
  check('   poi lo schermo annuncia che batte il gioco', c.shown && c.big === 'Giulia, batti tu' && /^Tra [2-5] s batte il gioco$/.test(c.sub), fmt(c));
  await shot('4d-servizio-automatico-annuncio');
  const tossed3 = await until(g, () => __natpfTennis.phase === 'SERVE_TOSS', null, 8000);
  c = await coach();
  check('   il gioco lancia ancora: «Servizio automatico · Il gioco batte per Giulia»', tossed3 && c.live === 'serve' && c.big === 'Servizio automatico' && c.sub === 'Il gioco batte per Giulia', fmt(c));
  await shot('4e-servizio-automatico');
  const served = await until(g, () => __natpfTennis.phase === 'RALLY' && __natpfTennis.ball.inPlay, null, 5000);
  const sv = await g.evaluate(() => { const E = __natpfTennis; return { hitter: E.ball.lastHitter, strokes: E.ball.rallyStrokeCount, speed: +E.ball.vel.length().toFixed(1), to: [+E.ball.targetLanding.x.toFixed(2), +E.ball.targetLanding.z.toFixed(2)] }; });
  check('   e batte: servizio morbido del Player 2 nel quadrato del Player 1, la palla è in gioco', served && sv.hitter === 'opponent' && sv.strokes === 1 && sv.speed < 24 && sv.to[1] > 0 && sv.to[1] < 6.4 && Math.abs(sv.to[0]) < 4.115, fmt(sv));
  await sleep(350); await shot('4f-servizio-automatico-in-gioco');
  await g.evaluate(() => { localStorage.setItem('natpf-tennis.lancioAuto', '0'); });

  /* 5: campo aperto spento e acceso */
  // un passo di corsa di 0,1 s verso un punto lontano 6 m: verso la palla (colpita dall'altro) e al rientro (colpita da lui)
  const run = () => g.evaluate(() => { const E = __natpfTennis, A = E.player, step = hitter => { E.phase = 'RALLY'; E.ball.inPlay = true; E.ball.rallyStrokeCount = 4; E.ball.lastHitter = hitter; E.ball.natpfSuper = null; E.natpfFatigue?.clear?.();
      A.pos.set(-3, 0, 11.8); A.targetPos.set(3, 0, 11.8); A.vel.set(0, 0, 0); E._stepActorFootwork(A, .1); return +((A.pos.x + 3)/.1).toFixed(2); };
    const paused = E.natpfPaused; E.natpfPaused = true;
    const r = { open: !!E.natpfDuo?.open, toBall: step('opponent'), back: step('player') };
    E.natpfPaused = paused; return r; });
  await g.evaluate(() => { const E = __natpfTennis; E.startNewMatch({ showStartBanner: false }); E.hud.hideCenterBanner(); });
  const off = await run();
  check('5. campo aperto spento: il personaggio corre a 9,8 m/s verso la palla e al rientro, come sempre', off.open === false && off.toBall === 9.8 && off.back === 9.8, fmt(off));
  await g.evaluate(() => { localStorage.setItem('natpf-tennis.campoAperto', '1'); const E = __natpfTennis; E.startNewMatch({ showStartBanner: false }); E.hud.hideCenterBanner(); });
  const on = await run();
  check('   acceso (dalla partita dopo): verso la palla 5,88 m/s, al rientro 1,96 m/s', on.open === true && on.toBall === 5.88 && on.back === 1.96, fmt(on));
  // revisione: con il campo aperto acceso il servizio passa ogni due punti anche nel formato classico (chi batte lì è
  // sfavorito); spento, nel classico batte sempre lo stesso
  const serveSeq = () => g.evaluate(() => { const E = __natpfTennis; E.natpfFair = false; E.startNewMatch({ showStartBanner: false });
    const s = [E.score.server]; for (const w of ['player', 'opponent', 'player']){ E._awardPoint(w, 'Out'); s.push(E.score.server); }
    const r = { fair: E.score.fair, open: !!E.natpfDuo?.open, s: s.map(x => (x === s[0] ? 'A' : 'B')).join(' ') }; E.natpfFair = undefined; E.hud.hideCenterBanner(); return r; });
  const altOn = await serveSeq();
  check('   acceso, formato classico: il servizio passa ogni due punti (A, B B, A…)', altOn.open === true && altOn.fair === false && altOn.s === 'A B B A', fmt(altOn));
  await g.evaluate(() => { localStorage.setItem('natpf-tennis.campoAperto', '0'); });
  const altOff = await serveSeq();
  check('   spento, formato classico: batte sempre lo stesso per tutto il game, come sempre', altOff.open === false && altOff.fair === false && altOff.s === 'A A A A', fmt(altOff));
  await g.evaluate(() => { const E = __natpfTennis; E.startNewMatch({ showStartBanner: false }); E.hud.hideCenterBanner(); });
  await sleep(300); await shot('5-partita-1280');

  /* 6: «Nuovo giocatore» */
  await openStaff();
  await shot('6-pannello-stand-in-partita');
  await g.click('#natpf-staff [data-staff="newplayer"]');
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'connect', null, { timeout: 10000 });
  await sleep(400);
  bd = await bands();
  const names = await g.evaluate(() => __natpfTennis.natpfSplitNames);
  check('6. «Nuovo giocatore»: le fasce tornano Adulto per tutti e due (e i nomi Player 1 e Player 2), nessun aiuto', bd.engine.p1 === 'adulto' && bd.engine.p2 === 'adulto' && bd.p1.join() === 'Adulto' && bd.p2.join() === 'Adulto' && !bd.note && names.p1 === 'Player 1' && names.p2 === 'Player 2', fmt({ ...bd, names }));
  await shot('6b-nuovo-giocatore-fasce-adulto');
  const bad = errs.filter(e => !/favicon|ERR_|net::|peerjs|WebSocket|404|Failed to load resource/i.test(e));
  check('nessun errore JavaScript nella pagina del gioco', bad.length === 0, bad.slice(0, 3).join(' | '));
}
finally { await B.close().catch(() => {}); stop(); }
summary();
// (se qualcosa tiene vivo il processo dopo le verifiche, vite o il server dei telefoni, si esce lo stesso)
setTimeout(() => process.exit(process.exitCode || 0), 1500).unref();
