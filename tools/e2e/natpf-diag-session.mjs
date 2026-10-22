// NATPF motore base: modalità diagnostica nel browser (vite 3118, segnalazione 9118), telefono simulato e webcam finta.
//   A. sessione lunga (SECONDS, predefinito 150 s) mentre il lanciapalle dell'allenamento gira e il telefono colpisce:
//      niente stop dopo 30 o 60 s (prima la registrazione si chiudeva a 60 s e teneva tutto in memoria), campioni del
//      telefono continui, un evento delle prestazioni al secondo, video della webcam e del gioco, costo del registratore
//      sul thread del gioco; pacchetto zip valido (CRC), rapporto e metriche;
//   B. sessione interrotta da una ricarica della pagina: al riavvio si recupera e il pacchetto si scarica;
//   C. prova guidata dal menu: richieste del lanciapalle nel registro e metriche con il riferimento;
//   D. registrazione lunga in parti (una parte ogni 6 s invece di 30 min): parti collegate, pacchetti validi con i video,
//      nessun buco al cambio di parte (eventi e campioni del telefono continui);
//   E. spazio su disco quasi finito (stima del browser simulata): video fermati, poi campioni, poi chiusura da sola.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-diag-session.mjs
//   VIDEOS=webcam,gioco (predefinito) | webcam | gioco | nessuno: quali video registrare nella parte A, per misurare
//   quanto costano (consegna dei colpi, fotogrammi) sulla stessa macchina; PARTS=A per la sola sessione lunga (le parti
//   girano nell'ordine A, D, E, B, C).
// Sensori sintetici, webcam finta del browser e grafica software: non sostituiscono una sessione con telefono e webcam veri.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { chromium } from 'playwright-core';
import { check, summary, SP } from './th.mjs';
import { readZip } from '../../natpf-tennis/src/natpf/diag/diag_zip.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9118), GAME_PORT = +(process.env.GAME_PORT || 3118), SECONDS = +(process.env.SECONDS || 150);
const PARTS = process.env.PARTS || 'ABCDE';
const VIDEOS = (process.env.VIDEOS ?? 'webcam,gioco').split(',').filter(v => v === 'webcam' || v === 'gioco');
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'ignore' });
process.on('exit', () => { try { vite.kill(); } catch {} peerServer.close(); });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const PHONE_INIT = () => {
  if (typeof DeviceMotionEvent === 'undefined') return;   // pagina vuota tra due indirizzi
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 16 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; this.emit(fn(Math.min(1, u))); if (u >= 1){ clearInterval(id); r(); } }, 16); }); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => [0, 0, sign*peak*Math.sin(Math.PI*u)**2], dur); },
  };
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  DeviceMotionEvent.requestPermission = async () => 'granted';
};
const B = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const errors = [];
const watch = (p, label) => { p.on('pageerror', e => errors.push(`${label}: ${e.message}`)); p.on('console', m => { if (process.env.VERBOSE) console.log(`[${label}] ${m.type()}: ${m.text()}`.slice(0, 300)); if (m.type() === 'error' && !/404|Failed to load resource|favicon/.test(m.text())) errors.push(`${label}: ${m.text()}`); }); };
const swingLoop = (phone, ms) => phone.evaluate(ms => new Promise(res => { const t0 = performance.now(); let i = 0; const go = () => { if (performance.now() - t0 > ms) return res(i); window.__busy = true; __up.swing(i++ % 2 ? -1 : 1).then(() => { window.__busy = false; setTimeout(go, 950); }); }; go(); }), ms);
// scarica il pacchetto di una sessione dal pannello (stesso codice del pulsante «Scarica»)
const fetchPackage = async (game, id) => {
  const dl = game.waitForEvent('download', { timeout: 120000 });
  await game.evaluate(id => __natpfTennis.natpfUi.diag.save(id), id);
  const d = await dl, file = path.join(SP, `diag-${id}.zip`); await d.saveAs(file);
  return readZip(new Uint8Array(fs.readFileSync(file)));
};
// nel menu il gioco non ridisegna (fotogramma fermo): per le parti D ed E si disegna a ogni fotogramma, come in partita,
// altrimenti il video del gioco non ha fotogrammi
const PAINT = on => { window.__paint = on; const loop = () => { if (!window.__paint) return; __natpfTennis.render(); requestAnimationFrame(loop); }; if (on) loop(); };
const LIGHT_RENDER = () => { let k = 0; __natpfTennis.render = function(){ this.renderer.setClearColor(++k % 2 ? 0x1d3b2a : 0x2a4d38); this.renderer.clear(); }; };
const lines = bytes => new TextDecoder().decode(bytes).trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
try {
  const ctx = await B.newContext({ viewport: { width: 1280, height: 720 }, permissions: ['camera'], acceptDownloads: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  let game = await ctx.newPage(); watch(game, 'gioco');
  const openGame = async () => {
    await game.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi?.diag && window.__natpfTennis.player?.model, null, { timeout: 120000 });
    await game.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
    await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
  };
  await openGame();
  // grafica software lenta (un fotogramma ogni ~1,6 s bloccherebbe i messaggi): al posto della scena si pulisce la tela
  // con un colore alternato, così il video del gioco ha comunque fotogrammi
  await game.evaluate(LIGHT_RENDER);
  const store = await game.evaluate(async () => (await __natpfTennis.natpfUi.diag._store()).kind);
  check('sessioni scritte su disco dal worker (file system privato del browser)', store === 'disk', store);
  // telefono collegato e pronto (profilo semplice), poi allenamento con il lanciapalle
  await game.click('[data-menu="training"]'); await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'controller');
  await game.click('[data-page="controller"] [data-natpf-controller="phone"]');
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const pctx = await B.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await pctx.newPage(); watch(phone, 'telefono');
  await phone.addInitScript(PHONE_INIT);
  await phone.goto(url, { waitUntil: 'domcontentloaded' });
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  await game.waitForFunction(() => __natpfTennis.natpfUi.training.active, null, { timeout: 15000 });
  await game.evaluate(() => __natpfTennis.natpfUi.training.simpleMode());
  await phone.waitForFunction(() => __racchetta.state.sensor === 'ready', null, { timeout: 15000 });

  /* ---------- A. sessione lunga ---------- */
  await game.keyboard.press('Shift+KeyD');
  await game.waitForSelector('.natpf-diag [data-diag="start"]', { timeout: 10000 });
  await game.evaluate(v => { const o = __natpfTennis.natpfUi.diag.opts; o.webcamVideo = v.includes('webcam'); o.gameVideo = v.includes('gioco'); }, VIDEOS);
  await game.click('.natpf-diag [data-diag="start"]');
  await game.waitForFunction(() => __natpfTennis.natpfUi.diag.recorder.active, null, { timeout: 15000 });
  const t0 = Date.now();
  const swings = await swingLoop(phone, SECONDS*1000);
  // pagina del telefono nascosta per 2 s (come uno schermo che si spegne): il computer lo deve sapere e annotare
  const hide = on => phone.evaluate(on => { Object.defineProperty(document, 'hidden', { value: on, configurable: true }); Object.defineProperty(document, 'visibilityState', { value: on ? 'hidden' : 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, on);
  await hide(true); await phone.waitForTimeout(2000); await hide(false); await phone.waitForTimeout(1500);
  const mid = await game.evaluate(() => ({ ...__natpfTennis.natpfUi.diag.recorder.counts }));
  await game.click('.natpf-diag [data-diag="stop"]').catch(async () => { await game.evaluate(() => __natpfTennis.natpfUi.diag.stop()); });
  await game.waitForFunction(() => !__natpfTennis.natpfUi.diag.recorder.active && !__natpfTennis.natpfUi.diag.busy, null, { timeout: 60000 }).catch(async e => {
    console.log('stato al blocco:', JSON.stringify(await game.evaluate(() => { const d = __natpfTennis.natpfUi.diag, R = d.recorder; return { busy: d.busy, active: R.active, videos: (R.videos || []).map(v => v.info), counts: R.counts, backlog: R.store?.backlog }; })));
    throw e;
  });
  const idA = await game.evaluate(() => __natpfTennis.natpfUi.diag.summary?.id);
  check(`registrazione di ${SECONDS} s ancora attiva alla fine (nessuno stop a 30 o 60 s)`, Date.now() - t0 >= SECONDS*1000 && mid.eventi > 0, `${Math.round((Date.now() - t0)/1000)} s · ${mid.eventi} eventi · ${(mid.byte/1048576).toFixed(1)} MB · ${swings} colpi del telefono`);
  const zipA = await fetchPackage(game, idA);
  check(`pacchetto: zip valido (CRC) con rapporto, dati, metriche e i video (${VIDEOS.join(', ') || 'nessuno'})`, ['LEGGIMI.txt', 'rapporto.html', 'sessione.json', 'metriche.json', 'eventi.jsonl', 'telefono-sensori.jsonl'].every(n => zipA.has(n)) && VIDEOS.every(v => [...zipA.keys()].some(n => n.startsWith(`video-${v}.`))), [...zipA.keys()].map(n => `${n} ${(zipA.get(n).length/1024).toFixed(0)} kB`).join(', '));
  const ev = lines(zipA.get('eventi.jsonl')), raw = lines(zipA.get('telefono-sensori.jsonl')), m = JSON.parse(new TextDecoder().decode(zipA.get('metriche.json')));
  const span = ev.at(-1).t - ev[0].t, rawGaps = raw.slice(1).map((k, i) => k.t - raw[i].t).filter(d => d > 1000);
  check('eventi per tutta la sessione (fino alla fine, non 30 o 60 s)', span >= (SECONDS - 5)*1000, `${(span/1000).toFixed(1)} s, ${ev.length} eventi`);
  check('campioni del telefono continui: nessun buco oltre 1 s sull’orologio del computer', raw.length > SECONDS*40 && !rawGaps.length && raw.at(-1).t - raw[0].t >= (SECONDS - 10)*1000, `${raw.length} campioni in ${((raw.at(-1).t - raw[0].t)/1000).toFixed(1)} s · buchi > 1 s: ${rawGaps.length}`);
  const perf = ev.filter(e => e.k === 'prestazioni');
  check('un evento delle prestazioni al secondo', perf.length >= SECONDS - 3, `${perf.length}`);
  // il telefono manda i colpi solo in gioco (alla fine dell'allenamento torna al menu): nel registro ci devono essere
  // tutti quelli arrivati al computer, con la numerazione completa
  const tel = ev.filter(e => e.k === 'tel.colpo'), link = ev.filter(e => e.k === 'tel.link').at(-1)?.copie || {};
  const arrived = (link.fast || 0) + (link.reliable || 0);
  check('colpi del telefono: tutti quelli arrivati sono nel registro, nessuno perso in rete', tel.length > 10 && tel.filter(e => e.n != null).length >= arrived - 1 && m.telefono.colpi.mancantiNellaNumerazione === 0, `${tel.length} nel registro, ${arrived} arrivati (${swings} gesti fatti) · consegna p50 ${m.telefono.tempiMs.consegna.p50} ms p99 ${m.telefono.tempiMs.consegna.p99} ms · sensori ${m.telefono.sensori.hzMediana} Hz`);
  check('orologio del telefono: scambi registrati e deriva stimata', m.telefono.orologio.campioni >= SECONDS - 10 && Number.isFinite(m.telefono.orologio.derivaPpm), JSON.stringify(m.telefono.orologio));
  check('motore: fasi, palla, rimbalzi e colpi nel registro', ['fase', 'palla', 'rimbalzo', 'tentativo'].every(k => ev.some(e => e.k === k)), ['fase', 'palla', 'rimbalzo', 'tentativo', 'colpo.gioco'].map(k => `${k} ${ev.filter(e => e.k === k).length}`).join(', '));
  const hidden = ev.filter(e => e.k === 'tel.stato' && e.visibile === false), warns = ev.filter(e => e.k === 'avviso').map(e => e.codice);
  check('pagina del telefono nascosta: stato e avviso nel registro (causa tipica dei dati che si fermano)', hidden.length >= 1 && warns.includes('telefono-nascosto') && m.telefono.collegamento.paginaNascosta >= 1, `stati nascosti ${hidden.length} · avvisi ${[...new Set(warns)].join(', ')} · blocco dello schermo: ${JSON.stringify(m.telefono.collegamento.bloccoSchermo)}`);
  const vids = ev.filter(e => e.k === 'video' && e.stato === 'fine');
  // la tela del gioco qui ha solo un colore pieno: il video è piccolo, basta che copra la sessione
  check('video registrati per tutta la sessione', vids.length === VIDEOS.length && vids.every(v => v.durataS >= SECONDS - 5 && v.byte > (/webcam/.test(v.file) ? 10000 : 500)), vids.map(v => `${v.file} ${v.durataS} s ${(v.byte/1048576).toFixed(2)} MB`).join(', '));
  if (VIDEOS.includes('webcam')) check('fotogrammi della webcam con l’istante di cattura (allineamento del video)', ev.filter(e => e.k === 'video.frame').length > SECONDS*5, `${ev.filter(e => e.k === 'video.frame').length}`);
  const reg = m.gioco.registratoreMsAlSecondo;
  check('costo del registratore sul thread del gioco sotto i 20 ms al secondo (2%), scrittura più lunga sotto 8 ms', reg.max < 20 && m.gioco.registratoreScritturaMaxMs < 8, `mediana ${reg.p50} ms/s, massimo ${reg.max} ms/s, scrittura max ${m.gioco.registratoreScritturaMaxMs} ms`);
  const html = new TextDecoder().decode(zipA.get('rapporto.html'));
  check('rapporto: pagina autonoma con dati e video collegati', html.includes('id="dati"') && VIDEOS.every(v => html.includes(`video-${v}.`)) && !/<script src=/.test(html));
  console.log('metriche (estratto):', JSON.stringify({ telefono: m.telefono?.tempiMs, gioco: m.gioco, registrazione: m.registrazione }).slice(0, 900));

  if (PARTS.includes('D') || PARTS.includes('E')) await game.evaluate(PAINT, true);
  if (PARTS.includes('D')){
    /* ---------- D. registrazione lunga in parti ---------- */
    await game.evaluate(v => { const d = __natpfTennis.natpfUi.diag; d.opts.webcamVideo = v.includes('webcam'); d.opts.gameVideo = v.includes('gioco'); d.recorder.rotateMs = 6000; return d.start(); }, VIDEOS);
    await game.waitForFunction(() => __natpfTennis.natpfUi.diag.recorder.active, null, { timeout: 15000 });
    await swingLoop(phone, 14000);
    // si ferma solo quando nella terza parte i video sono ripartiti e hanno già scritto qualcosa
    await game.waitForFunction(n => { const R = __natpfTennis.natpfUi.diag.recorder; return R.part >= 3 && R.now() - R.partT0 > 2000 && R.videos.length === n && R.videos.every(v => v.info.byte > 0); }, VIDEOS.length, { timeout: 30000 }).catch(async e => {
      console.log('stato al blocco:', JSON.stringify(await game.evaluate(() => { const R = __natpfTennis.natpfUi.diag.recorder; return { part: R.part, inParte: Math.round(R.now() - R.partT0), rotazione: !!R._rotation, videoOff: R.videoOff, videos: R.videos.map(v => ({ kind: v.kind, byte: v.info.byte, stopped: !!v.stopped })) }; })));
      throw e;
    });
    await game.evaluate(() => __natpfTennis.natpfUi.diag.stop());
    await game.waitForFunction(() => !__natpfTennis.natpfUi.diag.recorder.active && !__natpfTennis.natpfUi.diag.busy, null, { timeout: 60000 });
    const parts = await game.evaluate(async () => {
      const d = __natpfTennis.natpfUi.diag, g = d.recorder.meta.gruppo; d.recorder.rotateMs = 30*60*1000;
      return (await d.store.list()).filter(s => s.gruppo === g).sort((a, b) => a.parte - b.parte).map(s => ({ id: s.id, parte: s.parte, ended: s.ended, precedente: s.precedente || null, prossima: s.prossima || null }));
    });
    check('registrazione lunga: parti nuove da sole, collegate tra loro', parts.length >= 3 && parts.every((p, i) => p.ended && p.parte === i + 1 && (!i || p.precedente === parts[i - 1].id) && (i === parts.length - 1 || p.prossima === parts[i + 1].id)), `${parts.length} parti`);
    const zips = []; for (const p of parts) zips.push(await fetchPackage(game, p.id));
    // intestazione di un video completo: webm (EBML) o mp4 (ftyp)
    const head = b => !!b && b.length > 16 && ((b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) || new TextDecoder().decode(b.slice(4, 8)) === 'ftyp');
    check('ogni parte: pacchetto valido (CRC) con i video, ognuno con la sua intestazione', zips.every(z => VIDEOS.every(v => { const n = [...z.keys()].find(k => k.startsWith(`video-${v}.`)); return n && head(z.get(n)); })),
      zips.map(z => [...z.keys()].filter(k => k.startsWith('video')).map(k => `${k} ${(z.get(k).length/1024).toFixed(0)} kB`).join(' + ')).join(' | '));
    const evs = zips.map(z => lines(z.get('eventi.jsonl'))), raws = zips.map(z => (z.has('telefono-sensori.jsonl') ? lines(z.get('telefono-sensori.jsonl')) : []));
    const jumps = evs.slice(1).map((e, i) => e[0].t - evs[i].at(-1).t);
    const qs = raws.flat().map(k => k.q).filter(Number.isInteger), qMin = Math.min(...qs), qMax = Math.max(...qs), missing = qMax - qMin + 1 - new Set(qs).size;
    // al confine tra due parti nessun numero saltato (i campioni viaggiano senza ordine: si guardano massimo e minimo)
    const edges = raws.slice(1).map((rw, i) => { const a = raws[i].map(k => k.q), b = rw.map(k => k.q); return a.length && b.length ? Math.min(...b) - Math.max(...a) : null; });
    check('cambio di parte senza buchi: stesso orologio, eventi e campioni del telefono continui', jumps.every(j => j >= 0 && j < 1000) && edges.every(e => e != null && e <= 1) && missing <= Math.ceil(qs.length*.005) && qs.length > 300,
      `salto tra le parti ${jumps.map(j => j.toFixed(0)).join(', ')} ms · campioni ${qs.length}, mancanti ${missing} · confini ${edges.join(', ')}`);
  }
  if (PARTS.includes('E')){
    /* ---------- E. spazio su disco quasi finito ---------- */
    await game.evaluate(v => {
      const d = __natpfTennis.natpfUi.diag; d.opts.webcamVideo = v.includes('webcam'); d.opts.gameVideo = v.includes('gioco'); d.recorder.spaceEveryMs = 1000;
      window.__free = 5e9; navigator.storage.estimate = async () => ({ quota: 1e11, usage: 1e11 - window.__free });
      return d.start();
    }, VIDEOS);
    await game.waitForFunction(() => __natpfTennis.natpfUi.diag.recorder.active, null, { timeout: 15000 });
    const idE = await game.evaluate(() => __natpfTennis.natpfUi.diag.recorder.id);
    await swingLoop(phone, 4000);
    await game.evaluate(() => { window.__free = 150*1024*1024; });
    if (VIDEOS.length) await game.waitForFunction(() => __natpfTennis.natpfUi.diag.recorder.videoOff === 'spazio', null, { timeout: 10000 });
    await swingLoop(phone, 4000);
    await game.evaluate(() => { window.__free = 40*1024*1024; });
    await game.waitForFunction(() => !__natpfTennis.natpfUi.diag.recorder.phoneSamples, null, { timeout: 10000 });
    await swingLoop(phone, 3000);
    await game.evaluate(() => { window.__free = 10*1024*1024; });
    await game.waitForFunction(() => !__natpfTennis.natpfUi.diag.recorder.active && !__natpfTennis.natpfUi.diag.busy, null, { timeout: 30000 });
    const toast = await game.evaluate(() => { delete navigator.storage.estimate; __natpfTennis.natpfUi.diag.recorder.spaceEveryMs = 10000; return document.getElementById('natpf-toast')?.textContent || ''; });
    const evE = lines((await fetchPackage(game, idE)).get('eventi.jsonl'));
    const at = c => evE.find(e => e.k === 'avviso' && e.codice === c)?.t;
    const vEnd = evE.filter(e => e.k === 'video' && e.stato === 'fine');
    const perfAfter = evE.filter(e => e.k === 'prestazioni' && e.t > (at('spazio-video') ?? at('spazio-campioni'))).length;
    check('spazio quasi finito: video fermati (il registro continua), poi campioni, poi chiusura da sola, con avviso a chi gioca',
      (!VIDEOS.length || (at('spazio-video') != null && vEnd.length === VIDEOS.length)) && at('spazio-campioni') != null && at('spazio') != null && perfAfter >= 3 && evE.at(-1).k === 'sessione.fine' && /spazio/.test(toast),
      `avvisi ${evE.filter(e => e.k === 'avviso').map(e => `${e.codice}@${(e.t/1000).toFixed(1)}s`).join(', ')} · prestazioni dopo il primo avviso ${perfAfter} · «${toast}»`);
  }
  await game.evaluate(PAINT, false);
  if (PARTS.includes('B')){
    /* ---------- B. sessione interrotta da una ricarica ---------- */
    await game.evaluate(() => __natpfTennis.natpfUi.diag.start());
    await game.waitForFunction(() => __natpfTennis.natpfUi.diag.recorder.active, null, { timeout: 15000 });
    const idB = await game.evaluate(() => __natpfTennis.natpfUi.diag.recorder.id);
    await swingLoop(phone, 12000);
    await game.reload({ waitUntil: 'domcontentloaded' });
    await game.waitForFunction(() => window.__natpfTennis?.natpfUi?.diag, null, { timeout: 120000 });
    await game.evaluate(LIGHT_RENDER);
    const lost = await game.evaluate(async () => (await (await __natpfTennis.natpfUi.diag._store()).list()).map(s => ({ id: s.id, ended: s.ended, live: s.live })));
    check('dopo la ricarica la sessione risulta interrotta e recuperabile', lost.some(s => s.id === idB && !s.ended && !s.live), JSON.stringify(lost));
    await game.evaluate(id => __natpfTennis.natpfUi.diag.recover(id), idB);
    const zipB = await fetchPackage(game, idB);
    const evB = lines(zipB.get('eventi.jsonl')), metaB = JSON.parse(new TextDecoder().decode(zipB.get('sessione.json')));
    check('sessione recuperata: dati fino alla ricarica e pacchetto valido', metaB.recovered && evB.length > 100 && evB.at(-1).t > 8000 && zipB.has('telefono-sensori.jsonl'), `${evB.length} eventi, ultimo a ${(evB.at(-1).t/1000).toFixed(1)} s`);
  }
  if (PARTS.includes('C')){
    /* ---------- C. prova guidata ---------- */
    await game.waitForFunction(() => __natpfTennis.player?.model, null, { timeout: 120000 });
    await game.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
    await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible, null, { timeout: 20000 });
    // il telefono si ricollega alla pagina ricaricata da solo (chiave di ripresa) o con un QR nuovo
    await game.evaluate(() => { __natpfTennis.natpfUi.selectController('phone', { open: false }); });
    await game.waitForFunction(() => __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
    const url2 = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
    await phone.goto('about:blank'); await phone.goto(url2, { waitUntil: 'domcontentloaded' });   // stesso indirizzo, cambia solo il «#»
    await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
    await phone.click('#enable');
    await game.evaluate(() => __natpfTennis.natpfPhone.skipCalibration());
    await phone.waitForFunction(() => __racchetta.state.sensor === 'ready', null, { timeout: 15000 });
    await game.waitForFunction(() => __natpfTennis.natpfPhone.ready, null, { timeout: 15000 });
    await game.evaluate(() => { const d = __natpfTennis.natpfUi.diag; d.opts.webcamVideo = false; d.opts.gameVideo = false; return d.startProtocol(); });
    await game.waitForFunction(() => __natpfTennis.natpfUi.diag.recorder.active && __natpfTennis.natpfUi.training.active, null, { timeout: 20000 });
    await swingLoop(phone, 25000);
    await game.evaluate(() => __natpfTennis.natpfUi.training.skip());
    await game.waitForFunction(() => !__natpfTennis.natpfUi.diag.recorder.active && !__natpfTennis.natpfUi.diag.busy, null, { timeout: 60000 });
    const mC = await game.evaluate(() => __natpfTennis.natpfUi.diag.summary?.metrics);
    check('prova guidata: richieste del lanciapalle nel registro e metriche con il riferimento (non senza)', mC?.riferimento?.richieste >= 5 && mC.riferimento.gestiConRiferimento > 0, JSON.stringify(mC?.riferimento || null).slice(0, 300));
    // racchetta virtuale (22/10): forma e intenzione di ogni colpo del telefono, esito della racchetta legato al colpo
    check('prova guidata: forma e intenzione dei colpi del telefono ed esito della racchetta nelle metriche', mC?.telefono?.forma?.colpi > 0 && Object.keys(mC.telefono.intenzione || {}).length > 0 && mC?.racchetta?.colpi > 0, JSON.stringify({ forma: mC?.telefono?.forma, intenzione: mC?.telefono?.intenzione, racchetta: mC?.racchetta, ripetibilita: mC?.ripetibilita }).slice(0, 400));
  }
  check('nessun errore nelle pagine', !errors.length, errors.slice(0, 5).join(' | '));
} finally { await B.close(); }
summary();
process.exit(process.exitCode || 0);
