// B72 (richiesta dell'utente del 19/11): «selettore lingua IT/EN dall'app del telefono: permette di tradurre anche solo uno
// dei due campi in modalità doppio». Prova nel browser (Chromium, telefoni simulati, gioco vero con vite e un server PeerJS
// locale, come natpf-nuovo-giocatore.mjs):
//   A. pagina del telefono da sola (Peer finto, come natpf-nome-telefono.mjs): selettore IT | EN nella barra in alto e sotto
//      la mano; un tocco su EN cambia subito i testi della pagina e manda { t: 'lang', l: 'en' } al gioco; al collegamento
//      la pagina annuncia la sua lingua (k 1); la lingua resta dopo una ricarica; il gioco la rimette a IT (cfg lg); nel
//      riquadro del telefono bloccato in partita la lingua cambia con due tocchi;
//   B. partita contro l'avversario con il telefono vero collegato al gioco: EN sul telefono → casella «Serving», istruzioni del
//      servizio, scritta del colpo, scritta grande del punto, tabellone e schermata finale in inglese;
//   C. stesso schermo con due telefoni: P2 EN e P1 IT → metà del P2 in inglese (casella, scritta del colpo, tabellone della
//      metà), metà del P1 in italiano, scritte a tutta larghezza in italiano;
//   D. «Nuovo giocatore» → IT per tutti e due, anche sui telefoni.
// Revisione B72 (sistemazione): in A il nome della scheda del tutorial mandato dal computer («Card 1 of 5 · Racket grip»);
// in B anche la scritta del segnale del momento giusto (livello Evento, palla dell'avversario),
// l'etichetta del gesto in basso e un giocatore che si chiama «Vince» (il nome resta nel tabellone e nella card, non diventa
// «Wins»); in D lo stesso schermo scelto dalla lobby (la strada vera di «Nuovo giocatore» per due telefoni).
// Schermate in SP/lingua (deviceScaleFactor 1, 1280×720 per il gioco, 390×844 per il telefono).
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/natpf-lingua.mjs     (porte 3172 e 9172)
// Eventi devicemotion sintetici e Peer finto: non sostituiscono un telefono vero.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9172), GAME_PORT = +(process.env.GAME_PORT || 3172);
const OUT = path.join(SP, 'lingua'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const until = (p, fn, arg, ms = 15000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).then(() => true, () => false);

// telefono tenuto dritto (i sensori vivi: il gioco lo vede pronto e non mette in pausa)
const MOTION = () => { if (typeof DeviceMotionEvent !== 'undefined') setInterval(() => dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: .4 * Math.sin(performance.now()), beta: -.4, gamma: .3 }, accelerationIncludingGravity: { x: 0, y: 9.81, z: 0 }, interval: 16 })), 16); if (screen.orientation) screen.orientation.lock = () => Promise.resolve(); };
// Peer finto (A): il gioco risponde come quello vero ai messaggi del collegamento
const FAKE_PEER = () => {
  window.sent = [];
  class Emitter { constructor(){ this.h = new Map(); } on(t, f){ this.h.set(t, f); } emit(t, d){ this.h.get(t)?.(d); } }
  window.Peer = class extends Emitter {
    constructor(){ super(); setTimeout(() => this.emit('open'), 0); }
    connect(){
      const conn = new Emitter(); conn.open = true;
      window.fromGame = msg => conn.emit('data', msg);
      conn.send = data => { window.sent.push(data); if (data.t === 'hello') setTimeout(() => window.fromGame({ t: 'welcome', r: 'ripresa-prova' }), 0); if (data.t === 'ping') setTimeout(() => window.fromGame({ t: 'pong', c: data.c }), 0); };
      conn.close = () => { conn.open = false; };
      setTimeout(() => conn.emit('open'), 0);
      return conn;
    }
    destroy(){}
  };
};
const phoneCtx = B => B.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
const txt = (p, sel) => p.evaluate(s => document.querySelector(s)?.textContent?.trim() ?? null, sel);
const vis = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.closest('.hidden') && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, sel);

const B = await launch();
try {
  /* ---------- A. pagina del telefono da sola ---------- */
  {
    const ctx = await phoneCtx(B);
    await ctx.addInitScript(FAKE_PEER); await ctx.addInitScript(MOTION);
    await ctx.addInitScript(() => { try { Element.prototype.requestFullscreen = function(){ return Promise.resolve(); }; } catch {} });
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${GAME_PORT}/natpf/tennis/racchetta.html#s=racchetta-tel-prova123456789&k=provalingua12345`);
    await until(p, () => window.__racchetta?.state.linkState === 'on');
    const ann0 = await p.evaluate(() => sent.filter(m => m.t === 'lang'));
    check('A1. al collegamento la pagina annuncia la sua lingua (IT di base, k 1)', ann0.length === 1 && ann0[0].l === 'it' && ann0[0].k === 1, JSON.stringify(ann0));
    const bar = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); const b = r('langBar'), bb = r('bar'); return { b: { w: Math.round(b.width), h: Math.round(b.height), l: Math.round(b.left), r: Math.round(b.right) }, inBar: b.top >= bb.top - 1 && b.bottom <= bb.bottom + 1, vw: innerWidth }; });
    check('   selettore IT | EN nella barra in alto: piccolo, dentro lo schermo', await vis(p, '#langBar') && bar.inBar && bar.b.h >= 34 && bar.b.h <= 44 && bar.b.w <= 110 && bar.b.r <= bar.vw, JSON.stringify(bar));
    check('   riga «Lingua» sotto la mano prima di «Attiva i sensori»', await vis(p, '#langOptions') && await vis(p, '#profileOptions') && (await txt(p, '#langOptions span')) === 'Lingua');
    check('   pagina in italiano: «Collegato al computer», «Attiva i sensori»', (await txt(p, '#barTxt')) === 'Collegato al computer' && (await txt(p, '#enable')) === 'Attiva i sensori');
    await p.screenshot({ path: `${OUT}/A1-telefono-it.png` });
    await p.locator('#langBar [data-lang="en"]').tap();
    await until(p, () => __racchetta.state.lang === 'en');
    const A2 = await p.evaluate(() => ({ bar: document.getElementById('barTxt').textContent, enable: document.getElementById('enable').textContent, touch: document.getElementById('enableTouch').textContent, sub: document.getElementById('sub').textContent, big: document.getElementById('big').textContent, hand: [...document.querySelectorAll('#profileOptions [data-hand]')].map(b => b.textContent), handLbl: document.querySelector('#profileOptions > span').textContent, langLbl: document.querySelector('#langOptions > span').textContent, opts: document.querySelector('#moreOpts summary').textContent, html: document.documentElement.lang, on: document.querySelector('#langBar [data-lang="en"]').classList.contains('on'), saved: localStorage.getItem('natpf-simulator.lingua'), msg: sent.filter(m => m.t === 'lang').at(-1) }));
    check('A2. tocco su EN: la pagina cambia subito (barra, anello, pulsanti, mano, opzioni)', A2.bar === 'Connected to the PC' && A2.enable === 'Turn on the sensors' && A2.touch === 'Play with taps' && A2.big === 'Connected' && /Turn on the sensors/.test(A2.sub)
      && A2.hand.join('|') === 'Right|Left' && A2.handLbl === 'Hand' && A2.langLbl === 'Language' && A2.opts === 'Options' && A2.html === 'en' && A2.on, JSON.stringify(A2));
    check('   … salvata sul telefono e mandata al gioco { t: lang, l: en }', A2.saved === 'en' && A2.msg?.l === 'en' && !A2.msg.k, JSON.stringify(A2.msg));
    await p.screenshot({ path: `${OUT}/A2-telefono-en.png` });
    // la calibrazione e la partita in inglese (comandi del gioco come quelli veri)
    await p.locator('#enable').tap();
    await until(p, () => __racchetta.state.sensor === 'cal');
    await p.evaluate(() => fromGame({ t: 'cmd', c: 'skip' }));
    await until(p, () => __racchetta.state.sensor === 'ready');
    await p.evaluate(() => fromGame({ t: 'ph', ph: 'serve' }));
    await sleep(150);
    const A3 = { big: await txt(p, '#big'), sub: await txt(p, '#sub'), recal: await txt(p, '#recal'), relink: await txt(p, '#relink') };
    check('A3. al servizio: «Serving» e l\'istruzione in inglese; pulsanti «Recalibrate», «Reconnect»', A3.big === 'Serving' && /^Raise the phone/.test(A3.sub) && A3.recal === 'Recalibrate' && A3.relink === 'Reconnect', JSON.stringify(A3));
    await p.evaluate(() => fromGame({ t: 'ev', k: 'contact', label: 'ritardo', out: true, why: 'in ritardo', shot: 'drive' }));
    await sleep(80);
    const A4 = { big: await txt(p, '#big'), sub: await txt(p, '#sub') };
    check('   esito del colpo dal computer («Fuori · In ritardo») in inglese', A4.big === 'Out' && A4.sub === 'Late', JSON.stringify(A4));
    await p.evaluate(() => fromGame({ t: 'ph', ph: 'pause', txt: 'Partita in pausa: aspetto il telefono di Giulia. Si riprende da soli.' }));
    // (finito il lampo dell'esito, 0,9 s: poi la schermata della pausa)
    const paused = await until(p, () => /waiting for Giulia's phone/.test(document.getElementById('sub').textContent), null, 4000);
    check('   pausa per il telefono dell\'altro giocatore in inglese', paused, await txt(p, '#sub'));
    // telefono bloccato in partita: la lingua nel riquadro, con due tocchi
    await p.evaluate(() => { fromGame({ t: 'ph', ph: 'play' }); fromGame({ t: 'tl', on: 1, slot: 'p2' }); });
    await until(p, () => __racchetta.state.touchLocked);
    const L0 = { phase: await txt(p, '#phoneTouchPhase'), slot: await txt(p, '#phoneTouchSlot'), seg: await vis(p, '#langLock') };
    check('A5. telefono bloccato: «Play!», «Phone 2» e il selettore in alto a destra', L0.phase === 'Play!' && L0.slot === 'Phone 2' && L0.seg, JSON.stringify(L0));
    await p.locator('#langLock [data-lang="it"]').tap();
    await sleep(100);
    const L1 = await p.evaluate(() => ({ lang: __racchetta.state.lang, it: document.querySelector('#langLock [data-lang="it"]').textContent, ask: document.querySelector('#langLock [data-lang="it"]').classList.contains('ask'), locked: __racchetta.state.touchLocked }));
    check('   primo tocco su IT: chiede conferma («IT?»), la lingua non cambia, il telefono resta bloccato', L1.lang === 'en' && L1.it === 'IT?' && L1.ask && L1.locked, JSON.stringify(L1));
    await p.screenshot({ path: `${OUT}/A5-bloccato-domanda.png` });
    await p.locator('#langLock [data-lang="it"]').tap();
    await until(p, () => __racchetta.state.lang === 'it', null, 3000);
    check('   secondo tocco: IT, «Gioca!», «Telefono 2»', (await txt(p, '#phoneTouchPhase')) === 'Gioca!' && (await txt(p, '#phoneTouchSlot')) === 'Telefono 2' && (await p.evaluate(() => sent.filter(m => m.t === 'lang').at(-1)?.l)) === 'it');
    await p.evaluate(() => fromGame({ t: 'tl', on: 0 }));
    // di nuovo EN, poi ricarica: la lingua resta e si annuncia al collegamento
    await p.locator('#langBar [data-lang="en"]').tap();
    await until(p, () => __racchetta.state.lang === 'en');
    await p.reload();
    await until(p, () => window.__racchetta?.state.linkState === 'on');
    const A6 = await p.evaluate(() => ({ lang: __racchetta.state.lang, bar: document.getElementById('barTxt').textContent, ann: sent.filter(m => m.t === 'lang') }));
    check('A6. pagina ricaricata: resta EN e lo annuncia al gioco (k 1)', A6.lang === 'en' && A6.bar === 'Connected to the PC' && A6.ann.length === 1 && A6.ann[0].l === 'en' && A6.ann[0].k === 1, JSON.stringify(A6));
    // il gioco la rimette a IT (giocatore nuovo: cfg lg it)
    await p.evaluate(() => fromGame({ t: 'cfg', prep: 1, mo: 1, hand: 'right', lg: 'it' }));
    await until(p, () => __racchetta.state.lang === 'it', null, 3000);
    check('A7. cfg del gioco con lg it: la pagina torna in italiano e lo salva', (await txt(p, '#barTxt')) === 'Collegato al computer' && (await p.evaluate(() => localStorage.getItem('natpf-simulator.lingua'))) === 'it');
    // un cfg partito prima del tocco non lo annulla
    await p.locator('#langBar [data-lang="en"]').tap();
    await p.evaluate(() => fromGame({ t: 'cfg', prep: 1, mo: 1, hand: 'right', lg: 'it' }));
    await sleep(150);
    check('   tocco su EN e subito un cfg con IT (partito prima): resta EN finché il gioco non conferma', (await p.evaluate(() => __racchetta.state.lang)) === 'en');
    // (revisione B72, L4) tutorial prima della partita: il computer manda il nome della scheda, il telefono lo scrive in inglese
    // (dopo la ricarica i sensori sono spenti: la schermata del tutorial c'è con i sensori attivi, come in partita)
    await p.locator('#enable').tap();
    await until(p, () => __racchetta.state.sensor !== 'off');
    await p.evaluate(() => { fromGame({ t: 'cfg', prep: 1, mo: 1, hand: 'right', tut: 1, tv: 2 }); fromGame({ t: 'tp', i: 0, n: 5, s: 1, m: 1, all: 1, nm: 'Presa a racchetta' }); });
    const tut1 = await until(p, () => document.getElementById('tutWhere').textContent === 'Card 1 of 5 · Racket grip', null, 3000);
    await p.evaluate(() => fromGame({ t: 'tp', i: 1, n: 5, s: 2, m: 3, all: 1, nm: 'Posizione di partenza' }));
    const tut2 = await until(p, () => document.getElementById('tutWhere').textContent === 'Card 2 of 5 · Starting position', null, 3000);
    check('A8. tutorial dal computer: «Card 1 of 5 · Racket grip», «Card 2 of 5 · Starting position» (prima i nomi restavano in italiano)', tut1 && tut2, await txt(p, '#tutWhere'));
    await p.screenshot({ path: `${OUT}/A8-telefono-tutorial-en.png` });
    check('   nessun errore nella pagina del telefono', !errs.length, errs.join(' | '));
    await ctx.close();
  }

  /* ---------- B. gioco vero, contro l'avversario, telefono EN ---------- */
  const { p: g, errs: gErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720,
    init: () => { try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); } catch {} } });
  await g.waitForFunction(() => window.__natpfTennis?.natpfPhone && __natpfTennis.natpfUi?.lang && __natpfTennis.player?.model, null, { timeout: 120000 });
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  const shot = async name => { await g.evaluate(() => { try { __natpfTennis.render(); } catch {} }); await g.screenshot({ path: `${OUT}/${name}.png` }); };
  const openPhone = async url => {
    const ctx = await phoneCtx(B);
    await ctx.addInitScript(MOTION); await ctx.addInitScript(() => { try { Element.prototype.requestFullscreen = function(){ return Promise.resolve(); }; } catch {} });
    const ph = await ctx.newPage(); ph.on('pageerror', e => gErrs.push('telefono: ' + e.message));
    await ph.goto(url);
    await until(ph, () => window.__racchetta?.state.linkState === 'on', null, 30000);
    return ph;
  };
  await g.evaluate(() => __natpfTennis.natpfPhone.start());
  await until(g, () => !!__natpfTennis.natpfPhone.pairingUrl, null, 30000);
  const ph1 = await openPhone(await g.evaluate(() => __natpfTennis.natpfPhone.pairingUrl));
  check('B1. telefono collegato al gioco: il gioco ha la sua lingua (IT, annunciata)', await until(g, () => __natpfTennis.natpfPhone.lang === 'it', null, 8000));
  await ph1.locator('#langBar [data-lang="en"]').tap();
  check('   tocco su EN sul telefono → il gioco lo sa (lingua del Player 1: en)', await until(g, () => __natpfTennis.natpfPhone.lang === 'en', null, 8000));
  // la partita: ciclo del gioco fermo, passi a mano (come natpf-chi-serve.mjs)
  const match = (opts = {}) => g.evaluate(async o => {
    const E = __natpfTennis, ui = E.natpfUi;
    ui.lobby.visible = false; E.hud.hideTitleModal?.(); E.autoPlayMode = false; E.userHasInteracted = true;
    if (o.split){ E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; if (!E.natpfSplit.active) E.startSplit(); }
    E.matchConfig.gamesToWin = 1;
    E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = false;
    E.score.server = o.server || 'player'; E._setupPointServe?.({ showBanner: false }); ui.onScore(E.score, E.matchConfig.gamesToWin);
    E.persistentStateLock = true;
    if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
    for (let i = 0; i < 40; i++){ E.update(1/60); E.scene.updateMatrixWorld(); }
    E.render();
    return E.phase;
  }, opts);
  check('B2. partita contro l\'avversario al servizio', ['SERVE_STANCE', 'SERVE_TOSS'].includes(await match({ server: 'player' })));
  const B2 = await g.evaluate(() => ({ tag: document.querySelector('#server-tag .server-tag-text')?.textContent, tagOn: !document.getElementById('server-tag').classList.contains('hidden'),
    names: [...document.querySelectorAll('#natpf-scoreboard .sb-name')].map(b => b.textContent), sbTag: document.querySelector('#natpf-scoreboard .sb-tag')?.textContent }));
  check('   casella «Serving» sopra chi batte, tabellone «YOU» e «OPP» con «1 game»', B2.tag === 'Serving' && B2.tagOn && B2.names.join('|') === 'YOU|OPP' && B2.sbTag === '1 game', JSON.stringify(B2));
  // istruzioni del servizio dopo un lancio a vuoto (come le dà il gioco: serveCoachView con il lancio a vuoto)
  const coach = await g.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.serveCoach.state.missAt = __natpfTennis.elapsedTime; ui.serveCoach.tick(1/60); const el = document.getElementById('natpf-serve-coach'); return { on: !el.classList.contains('hidden'), big: el.querySelector('[data-c="big"]').textContent, sub: el.querySelector('[data-c="sub"]').textContent }; });
  check('   istruzioni del servizio dopo un lancio a vuoto in inglese', coach.on && coach.big === 'Hit when the ball is high' && coach.sub === 'Missed toss: try again', JSON.stringify(coach));
  await shot('B2-contro-avversario-servizio-en');
  // scritta del colpo (giro vero dell'HUD: natpf_shot_feedback → hud.showTimingPopup) e scritta del punto
  const pop = await g.evaluate(() => { const E = __natpfTennis; E.hud.showTimingPopup({ grade: 'PERFECT • FOREHAND TOPSPIN!', detail: '118 KM/H' }); return { grade: document.getElementById('timing-popup-grade').textContent, detail: document.getElementById('timing-popup-detail').textContent }; });
  check('   scritta del colpo: «Perfect»', pop.grade === 'Perfect' && /118 km\/h/i.test(pop.detail), JSON.stringify(pop));
  const banner = await g.evaluate(() => { const E = __natpfTennis; E.persistentStateLock = false; E._awardPoint('opponent', 'Out'); for (let i = 0; i < 45; i++) E.update(1/60); return { text: document.getElementById('center-banner-text').textContent, sub: document.getElementById('center-banner-sub').textContent, on: !document.getElementById('center-banner-layer').classList.contains('hidden') }; });
  check('   scritta grande del punto: «Opponent\'s point» con «Your error: ball out · 0-15»', banner.on && banner.text === "Opponent's point" && banner.sub === 'Your error: ball out · 0-15', JSON.stringify(banner));
  await g.evaluate(() => { const E = __natpfTennis, c = E.lastBannerBroadcast; E.hud.showCenterBanner(c.text, { style: c.style, subText: c.subText, persistent: true }); });
  await shot('B3-punto-en');
  await g.evaluate(() => __natpfTennis.hud.hideCenterBanner());
  const fin = await g.evaluate(async () => { const E = __natpfTennis; for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++) E._awardPoint('player', 'Out'); for (let i = 0; i < 260; i++) E.update(1/60); await new Promise(r => setTimeout(r, 2200)); const m = document.getElementById('victory-modal'); return { phase: E.phase, open: !m.classList.contains('hidden'), title: document.getElementById('victory-result-banner').textContent, kicker: document.getElementById('victory-kicker').textContent, rows: [...m.querySelectorAll('[data-victory-row] span')].map(s => s.textContent), score: document.getElementById('victory-match-score').textContent }; });
  check('   schermata finale: titolo e righe in inglese («You win!», «You», «Opponent»)', fin.phase === 'MATCH_OVER' && fin.open && /^(You win!|Great match!)$/.test(fin.title) && /^Match over/.test(fin.kicker) && fin.rows.join('|') === 'You|Opponent', JSON.stringify(fin));
  await shot('B4-fine-partita-en');
  await g.evaluate(() => __natpfTennis.hud.hideVictoryModal());
  // B5 (revisione B72, L1–L3): «Vince» a livello Evento (segnale del momento giusto acceso di base), batte l'avversario
  const B5 = await g.evaluate(() => {
    const E = __natpfTennis, ui = E.natpfUi;
    ui.events.nickname = 'Vince';
    E.hud.selectedDifficulty = 'evento'; E.matchConfig.difficulty = 'evento';
    ui.lobby.visible = false; E.hud.hideTitleModal?.(); E.autoPlayMode = false;
    E.matchConfig.gamesToWin = 1; E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = false; E.persistentStateLock = false;
    E.score.server = 'opponent'; E._setupPointServe?.({ showBanner: false }); ui.onScore(E.score, E.matchConfig.gamesToWin);
    const h = () => document.getElementById('natpf-cue-hint'), on = () => !!h() && !h().classList.contains('hidden');
    for (let i = 0; i < 60*8 && !on(); i++){ E.update(1/60); }
    E.scene.updateMatrixWorld(); E.render();
    return { on: on(), enabled: ui.cue?.enabled, phase: E.phase, text: h()?.textContent, green: h()?.querySelector('b')?.textContent, lang: h()?.dataset.lang,
      sb: [...document.querySelectorAll('#natpf-scoreboard .sb-name')].map(b => b.textContent), sbTitle: [...document.querySelectorAll('#natpf-scoreboard .sb-row')].map(r => r.title || r.textContent) };
  });
  check('B5. livello Evento, batte l\'avversario: la scritta del segnale in inglese («Hit when the circle turns green», «green» in grassetto)', B5.on && B5.enabled && B5.text === 'Hit when the circle turns green' && B5.green === 'green' && B5.lang === 'en', JSON.stringify(B5));
  check('   tabellone: il nome «Vince» resta (sigla VIN, non WIN)', B5.sb[0] === 'VIN' && B5.sb[1] === 'OPP' && !B5.sbTitle.some(t => /Wins/.test(t)), JSON.stringify(B5));
  await shot('B5-segnale-en');
  const B6 = await g.evaluate(() => { const ui = __natpfTennis.natpfUi, el = document.getElementById('natpf-gesture'); ui.gesture.onGesture({ side: 'backhand', natpf: { shot: 'slice' } }, { dir: 1 });
    __natpfTennis.render(); return { on: !el.classList.contains('hidden'), title: el.querySelector('[data-g="title"]').textContent, sub: el.querySelector('[data-g="sub"]').textContent, shown: el.innerText }; });
  check('B6. etichetta del gesto in basso: «Backhand / Slice» (prima «Rovescio / Tagliato»)', B6.on && B6.title === 'Backhand' && B6.sub === 'Slice', JSON.stringify(B6));
  await g.screenshot({ path: `${OUT}/B6-gesto-en.png` });
  const B7 = await g.evaluate(async () => {
    const E = __natpfTennis;
    for (let i = 0; i < 6 && E.phase !== 'MATCH_OVER'; i++){ E._awardPoint('opponent', 'Out'); for (let k = 0; k < 120; k++) E.update(1/60); }
    for (let i = 0; i < 260; i++) E.update(1/60);
    await new Promise(r => setTimeout(r, 2200));
    const m = document.getElementById('victory-modal');
    return { phase: E.phase, open: !m.classList.contains('hidden'), title: document.getElementById('victory-result-banner').textContent, kicker: document.getElementById('victory-kicker').textContent,
      rows: [...m.querySelectorAll('[data-victory-row] span')].map(s => s.textContent), cards: [...m.querySelectorAll('.card-name')].map(e => [e.textContent, e.title]), badge: m.querySelector('.card-badge')?.textContent };
  });
  check('B7. partita persa da «Vince»: titolo «Great match, Vince!», nome nella card «Vince» (non «WINS»), righe «Vince» e «Opponent», kicker «Match over · 1 game to 0» o del livello',
    B7.phase === 'MATCH_OVER' && B7.open && B7.title === 'Great match, Vince!' && B7.cards.length === 1 && B7.cards[0][0] === 'Vince' && B7.cards[0][1] === 'Vince' && B7.badge === 'Great match'
    && B7.rows.join('|') === 'Vince|Opponent' && /^Match over/.test(B7.kicker), JSON.stringify(B7));
  await shot('B7-fine-persa-vince-en');
  await g.evaluate(() => { __natpfTennis.hud.hideVictoryModal(); __natpfTennis.natpfUi.events.nickname = ''; });

  /* ---------- C. stesso schermo: P2 EN, P1 IT ---------- */
  await g.evaluate(() => __natpfTennis.natpfUi.split.prepare());
  await until(g, () => !!__natpfTennis.natpfPhone2?.pairingUrl, null, 30000);
  const ph2 = await openPhone(await g.evaluate(() => __natpfTennis.natpfPhone2.pairingUrl));
  check('C1. secondo telefono collegato (Player 2), lingua annunciata', await until(g, () => __natpfTennis.natpfPhone2.lang === 'it', null, 8000));
  await ph2.locator('#langBar [data-lang="en"]').tap();
  await ph1.locator('#langBar [data-lang="it"]').tap();
  check('   P2 tocca EN, P1 tocca IT', await until(g, () => __natpfTennis.natpfPhone2.lang === 'en' && __natpfTennis.natpfPhone.lang === 'it', null, 8000));
  // i due telefoni pronti (sensori attivi, profilo semplice chiesto dal gioco: calibrazione «Giocando»), così la partita non va in pausa
  for (const ph of [ph1, ph2]){ await ph.locator('#enable').tap(); }
  check('   i due telefoni pronti', await until(g, () => __natpfTennis.natpfPhone.ready && __natpfTennis.natpfPhone2.ready, null, 20000));
  check('C2. partita nello stesso schermo, batte il Player 2', ['SERVE_STANCE', 'SERVE_TOSS'].includes(await match({ split: true, server: 'opponent' })));
  const C2 = await g.evaluate(() => ({ t1: document.querySelector('#server-tag-p1 .server-tag-text')?.textContent, t2: document.querySelector('#server-tag-p2 .server-tag-text')?.textContent,
    sb1: document.querySelector('#natpf-scoreboard .sb-tag')?.textContent, sb2: document.querySelector('#natpf-scoreboard-p2 .sb-tag')?.textContent,
    sr2: document.querySelector('#natpf-scoreboard-p2 .sb-row.serving .sb-sr')?.textContent, sr1: document.querySelector('#natpf-scoreboard .sb-row.serving .sb-sr')?.textContent }));
  check('   casella della metà del P1 «Al servizio», della metà del P2 «Serving»', C2.t1 === 'Al servizio' && C2.t2 === 'Serving', JSON.stringify(C2));
  check('   tabellone: metà del P1 «1 game» con «(al servizio)», metà del P2 con «(serving)»', C2.sb1 === '1 game' && C2.sb2 === '1 game' && /Marco \(al servizio\)/.test(C2.sr1) && /Marco \(serving\)/.test(C2.sr2), JSON.stringify(C2));
  const pops = await g.evaluate(() => { const E = __natpfTennis, r = []; E.ball.vel.set(0, 0, 0);
    for (const [gr, z] of [['P2 PERFECT • FOREHAND TOPSPIN!', 8], ['EARLY • BACKHAND TOPSPIN!', -8]]){ E.ball.targetLanding = { x: 0, z }; E.ball.natpfNetFault = false; E.hud.showTimingPopup({ grade: gr, detail: '101 KM/H' }); const el = document.getElementById('timing-popup'); r.push({ text: document.getElementById('timing-popup-grade').textContent, right: el.classList.contains('side-right') }); }
    return r; });
  check('   scritta del colpo del P2 nella sua metà in inglese («Perfect»), del P1 nella sua in italiano («Anticipo»)', pops[0].text === 'Perfect' && pops[0].right && pops[1].text === 'Anticipo' && !pops[1].right, JSON.stringify(pops));
  // la scritta del P2 di nuovo, per la schermata con tutte e due le metà
  await g.evaluate(() => { const E = __natpfTennis; E.ball.targetLanding = { x: 0, z: 8 }; E.hud.showTimingPopup({ grade: 'P2 PERFECT • FOREHAND TOPSPIN!', detail: '101 KM/H' }); });
  await shot('C2-stesso-schermo-p1-it-p2-en');
  const C3 = await g.evaluate(() => { const E = __natpfTennis; E.persistentStateLock = false; E._awardPoint('opponent', 'Out'); for (let i = 0; i < 45; i++) E.update(1/60); return { text: document.getElementById('center-banner-text').textContent, sub: document.getElementById('center-banner-sub').textContent }; });
  check('   scritta grande del punto a tutta larghezza in italiano (non tutti e due EN): «Punto Marco»', C3.text === 'Punto Marco' && /^Errore di Giulia: palla fuori/.test(C3.sub), JSON.stringify(C3));
  await g.evaluate(() => { const E = __natpfTennis, c = E.lastBannerBroadcast; E.hud.showCenterBanner(c.text, { style: c.style, subText: c.subText, persistent: true }); });
  await shot('C3-stesso-schermo-punto-centro-it');
  await g.evaluate(() => __natpfTennis.hud.hideCenterBanner());
  // in partita il telefono è bloccato (B51): la lingua si cambia dal suo riquadro, con due tocchi
  check('   telefono del P1 bloccato in partita, selettore nel riquadro', await until(ph1, () => __racchetta.state.touchLocked, null, 8000) && await vis(ph1, '#langLock'));
  // tutti e due EN: anche la scritta grande in inglese
  await ph1.locator('#langLock [data-lang="en"]').tap();
  await sleep(300);
  check('   primo tocco su EN nel riquadro: il gioco resta IT per il P1 (serve la conferma)', (await g.evaluate(() => __natpfTennis.natpfPhone.lang)) === 'it');
  await ph1.locator('#langLock [data-lang="en"]').tap();
  check('   secondo tocco: P1 in inglese anche nel gioco', await until(g, () => __natpfTennis.natpfPhone.lang === 'en', null, 8000));
  const C4 = await g.evaluate(() => { const E = __natpfTennis; E._awardPoint('player', 'Net'); for (let i = 0; i < 45; i++) E.update(1/60); return { text: document.getElementById('center-banner-text').textContent, sub: document.getElementById('center-banner-sub').textContent, t1: document.querySelector('#server-tag-p1 .server-tag-text')?.textContent }; });
  check('   tutti e due EN: scritta grande in inglese («Point Giulia», «Marco\'s error: ball in the net»), casella del P1 «Serving»', C4.text === 'Point Giulia' && /^Marco's error: ball in the net/.test(C4.sub) && C4.t1 === 'Serving', JSON.stringify(C4));
  await g.evaluate(() => { const E = __natpfTennis, c = E.lastBannerBroadcast; E.hud.showCenterBanner(c.text, { style: c.style, subText: c.subText, persistent: true }); });
  await shot('C4-stesso-schermo-tutti-en');
  await g.evaluate(() => __natpfTennis.hud.hideCenterBanner());
  await ph1.screenshot({ path: `${OUT}/C4-telefono-p1-bloccato-en.png` });

  /* ---------- D. «Nuovo giocatore» → IT ---------- */
  // (revisione B72, B72-REG-2: lo stesso schermo scelto dalla lobby, come allo stand: «Nuovo giocatore» prende la strada
  // 'split'. Prima la prova restava con la lobby su «contro l'avversario» e passava dalla strada 'match')
  const D0 = await g.evaluate(() => { const E = __natpfTennis, ui = E.natpfUi; if (E.__frame0){ E._natpfFrame = E.__frame0; delete E.__frame0; } E.persistentStateLock = false;
    ui.lobby.setMode('split'); const langs = [E.natpfPhone.lang, E.natpfPhone2.lang]; return { mode: ui.lobby.mode, langs, route: ui.newPlayer() }; });
  check('D1. lobby su «Stesso schermo», tutti e due EN: «Nuovo giocatore» prende la strada dello stesso schermo', D0.mode === 'split' && D0.route === 'split' && D0.langs.join() === 'en,en', JSON.stringify(D0));
  check('   lingua IT per tutti e due nel gioco', await until(g, () => __natpfTennis.natpfPhone.lang === 'it' && __natpfTennis.natpfPhone2.lang === 'it', null, 8000));
  check('   … e sui due telefoni (pagina in italiano, salvata)', await until(ph1, () => __racchetta.state.lang === 'it' && localStorage.getItem('natpf-simulator.lingua') === 'it', null, 8000) && await until(ph2, () => __racchetta.state.lang === 'it', null, 8000));
  await ph2.screenshot({ path: `${OUT}/D1-telefono-p2-dopo-nuovo-giocatore.png` });
  check('nessun errore nel gioco e nei telefoni', !gErrs.length, gErrs.slice(0, 4).join(' | '));
} catch (e){ check('prova completata senza eccezioni', false, e.stack || String(e)); }
finally {
  await B.close(); stop();
  summary();
  setTimeout(() => process.exit(), 300);
}
