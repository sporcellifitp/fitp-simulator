// NATPF B66 (docs/b66/registro-sensori.md): le misure di sensori, calibrazione, collegamento, rete e blocco del telefono
// nel registro dello stand, con il gioco vero (vite), la pagina vera del telefono (eventi devicemotion sintetici) con un
// ponte finto dell'app NATPF Racchetta, e lo spazio Cloudflare finto in locale (il Worker vero con R2 in memoria, come
// natpf-registro.mjs). Percorso:
//   1. Gioca → Contro la CPU → telefono (QR) → tutorial → telefono pronto (calibrazione di base) → scambi di prova
//      giocati dal telefono simulato → «Gioca»;
//   2. in partita il telefono colpisce le palle in arrivo; un buio della rete di 3 s (pausa «segnale debole»); tocchi sul
//      telefono bloccato e sblocco dal PC; la partita va alla fine;
//   3. nello spazio: riga «partita» con la versione dell'app, righe «colpo» con confidenza, margine e ritardo, riga
//      «partita.fine» con tq, lat, wifi, blocco, cal e pause; tutte le righe pulite (controllaRiga) e senza nomi;
//   4. il riassunto delle righe arrivate ha le sei sezioni nuove con i numeri di questa partita; peso della partita con e
//      senza le misure del B66.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-registro-sensori.mjs   (OUT=cartella delle schermate)
// Telefono, app, Wi-Fi e Worker sono finti: non sostituiscono la prova con un telefono vero e l'app vera allo stand.
process.env.CAL ||= 'base';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, seeAllCards, SP } from './th.mjs';
import { throughTrial, phoneReadyNoGestures } from './prova.mjs';
import worker from '../../natpf-tennis/cloudflare/registro-worker.js';
import { r2Finto } from '../../natpf-tennis/scripts/registro/r2-finto.mjs';
import { controllaRiga, CAMPI_B66 } from '../../natpf-tennis/src/natpf/registro/registro_formato.js';
import { riassumi } from '../../natpf-tennis/scripts/registro/riassunto.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 4510), PEER_PORT = +(process.env.PEER_PORT || 4511), SPAZIO_PORT = +(process.env.SPAZIO_PORT || 4512);
const OUT = path.join(SP, 'registro-sensori'); mkdirSync(OUT, { recursive: true });
const ORIGINE = `http://127.0.0.1:${GAME_PORT}`, SPAZIO = `http://127.0.0.1:${SPAZIO_PORT}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => console.log(`[${((Date.now() - T0)/1000).toFixed(1).padStart(5)} s] ${m}`);
const fmt = v => JSON.stringify(v);

/* ---------- spazio Cloudflare finto: il Worker vero con R2 finto ---------- */
const env = { REGISTRO: r2Finto(), CHIAVE_LETTURA: 'chiave-solo-di-questa-prova', ALLOWED_ORIGINS: ORIGINE };
const spazio = http.createServer((req, res) => {
  const parti = [];
  req.on('data', c => parti.push(c)).on('end', async () => {
    try {
      const headers = {}; for (const k of ['origin', 'content-type', 'authorization', 'accept']) if (req.headers[k]) headers[k] = req.headers[k];
      const r = await worker.fetch(new Request(`http://127.0.0.1:${SPAZIO_PORT}${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(parti) }), env);
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e){ res.writeHead(500); res.end(String(e)); }
  });
});
await new Promise(r => spazio.listen(SPAZIO_PORT, '127.0.0.1', r));
const nelloSpazio = () => [...env.REGISTRO.oggetti.keys()].filter(k => k.startsWith('registro/')).sort().flatMap(k => env.REGISTRO.oggetti.get(k).testo.trim().split('\n').map(l => JSON.parse(l))).filter(r => r.k !== 'blocco');

const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} try { spazio.close(); } catch {} try { peerServer.close(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`${ORIGINE}/`));

// telefono in verticale (come natpf-nuovo-giocatore.mjs), con il ponte finto dell'app NATPF Racchetta (Bridge.stato, 1.0.4):
// segnale che scende durante la partita, batteria che cala, «Fissa app» attiva, uno schermo spento
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 16 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    still(ms){ return this.run(() => [0.4*Math.sin(performance.now()), -0.4, 0.3], ms); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
  };
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
  const t0 = Date.now();
  window.__app = { chiamate: 0 };
  window.NATPFApp = {
    lock(){}, version(){ return '1.0.4'; },
    stato(){ window.__app.chiamate++; const s = (Date.now() - t0)/1000; return JSON.stringify({ rssi: Math.round(-55 - Math.min(20, s/6)), ghz: 5, mbps: Math.max(72, 433 - Math.round(s*2)), batt: Math.max(5, 88 - Math.floor(s/30)), carica: 0, temp: 300 + Math.round(s/2), fissa: 1, spenti: s > 40 ? 1 : 0 }); },
  };
};
// rete del telefono che si ferma (come natpf-phone-blackout.mjs, parte D): trattiene i messaggi e li consegna al ritorno
const HOLD = () => {
  const send = RTCDataChannel.prototype.send, held = [];
  window.__netHold = false;
  RTCDataChannel.prototype.send = function(d){ if (window.__netHold && this.ordered !== false){ held.push([this, d]); return; } if (window.__netHold) return; return send.call(this, d); };
  window.__netRelease = () => { window.__netHold = false; for (const [o, d] of held.splice(0)){ if (o.readyState !== 'open') continue; try { send.call(o, d); } catch {} } };
};
const until = async (p, fn, arg, ms = 20000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).then(() => true, () => false);

const B = await launch();
try {
  const ctx = await B.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route('**/natpf/registro.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: SPAZIO }) }));
  const { p: g, errs } = await page(B, `${ORIGINE}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { context: ctx });
  await g.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await g.evaluate(() => { const E = __natpfTennis; E.render = () => {}; });   // grafica software lenta: niente disegno
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu' && __natpfTennis.natpfUi.registro && !__natpfTennis.natpfUi.registro.cerca, null, { timeout: 20000 });
  check('registro acceso con l\'indirizzo dello spazio di prova', await g.evaluate(u => __natpfTennis.natpfUi.registro.acceso && __natpfTennis.natpfUi.registro.url === u, SPAZIO));

  /* ---------- 1. telefono collegato e pronto, scambi di prova ---------- */
  await g.evaluate(() => { __natpfTennis.natpfUi.events.nickname = 'Mario Rossi'; });
  await g.click('[data-menu="play"]');
  await until(g, () => __natpfTennis.natpfUi.lobby.step === 'mode', null, 5000);
  await g.click('[data-mode="cpu"]');
  await until(g, () => __natpfTennis.natpfUi.lobby.step === 'controller', null, 5000);
  await g.click('[data-page="controller"] [data-natpf-controller="phone"]');
  await until(g, () => __natpfTennis.natpfUi.lobby.step === 'connect' && __natpfTennis.natpfPhone.pairingUrl, null, 30000);
  const url = await g.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: ph, errs: phErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await ph.evaluate(HOLD); await g.evaluate(HOLD);
  await ph.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await ph.waitForSelector('#enable:not(.hidden)', { timeout: 15000 }).catch(() => {});
  await ph.click('#enable');
  if (await until(g, () => __natpfTennis.natpfUi.training.active && __natpfTennis.natpfUi.training.tutorialOpen, null, 15000)){
    await ph.waitForSelector('#tutOk:not(.hidden)', { timeout: 15000 }); await seeAllCards(ph); await ph.click('#tutOk');
  }
  check('telefono pronto (calibrazione di base, profilo semplice)', await phoneReadyNoGestures(g, { ms: 30000 }));
  const tr = await throughTrial(g, { p1: ph });
  log(`scambi di prova: ${fmt(tr)}`);
  check('pagina «Partita» dopo gli scambi di prova', await until(g, () => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'match', null, 40000));
  await g.evaluate(() => document.querySelector('#match-length-group [data-games="1"]')?.click());
  await g.click('#btn-start-match');
  const FIELD = ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'];
  check('partita contro la CPU con il telefono', await until(g, f => !__natpfTennis.natpfUi.lobby.visible && !__natpfTennis.natpfUi.trial.active && f.includes(__natpfTennis.phase) && !!__natpfTennis.natpfUi.registro.rec.partita, FIELD, 20000));
  const dev = await g.evaluate(() => ({ app: __natpfTennis.natpfPhone.device?.app, version: __natpfTennis.natpfPhone.device?.version }));
  check('il telefono ha detto la versione dell\'app (messaggio «dev»)', dev.app === '1.0.4', fmt(dev));

  /* ---------- 2. partita: colpi del telefono, buio della rete, blocco dei tocchi ---------- */
  // il telefono colpisce le palle in arrivo (come gli scambi di prova: al tempo dell'impatto dal piano della CPU)
  const colpisci = async ms => {
    const t0 = Date.now(); let fatti = 0, seen = null;
    while (Date.now() - t0 < ms){
      const s = await g.evaluate(() => { const E = __natpfTennis, P = E.natpfPlan; return { phase: E.phase, over: E.phase === 'MATCH_OVER', left: P && E.ball.inPlay && E.ball.lastHitter !== 'player' ? +(P.at + P.t - E.elapsedTime).toFixed(3) : null, at: P?.at ?? null, side: P ? Math.sign(P.side || 1) : 1, paused: !!E.natpfPaused }; });
      if (s.over) break;
      if (s.left != null && s.left < .2 && s.at !== seen && !s.paused){ seen = s.at; fatti++; ph.evaluate(sg => { window.__busy = true; return __up.swing(sg).then(() => __up.still(200)).then(() => { window.__busy = false; }); }, s.side || 1).catch(() => {}); }
      // servizio di chi gioca: il lancio come dal tocco del telefono, poi il gesto del telefono vicino al punto più alto
      if (s.phase === 'SERVE_STANCE' && await g.evaluate(() => __natpfTennis.score.server === 'player' && !__natpfTennis.natpfPaused)){
        await g.evaluate(() => __natpfTennis.natpfPhone._onToss());
        if (await until(g, () => __natpfTennis.phase === 'SERVE_TOSS' && __natpfTennis.ball.vel.y < 1.2, null, 4000)){ fatti++; await ph.evaluate(() => { window.__busy = true; return __up.swing(1).then(() => __up.still(200)).then(() => { window.__busy = false; }); }); }
        await sleep(600);
      }
      await sleep(25);
    }
    return fatti;
  };
  let swings = await colpisci(20000);
  // tocchi sul telefono bloccato (B51) e sblocco dal PC
  const lock = await until(ph, () => __racchetta.state.touchLocked, null, 15000);
  if (lock) for (let i = 0; i < 3; i++){ await ph.mouse.click(195, 300).catch(() => {}); await sleep(150); }
  // buio della rete di 3 s: pausa «segnale debole», poi la partita riprende da sola
  await Promise.all([g, ph].map(p => p.evaluate(() => { window.__netHold = true; })));
  await sleep(3500);
  await Promise.all([g, ph].map(p => p.evaluate(() => window.__netRelease())));
  await until(g, f => !__natpfTennis.natpfPaused && f.includes(__natpfTennis.phase), FIELD, 20000);
  const sblocco = await g.evaluate(() => __natpfTennis.natpfPhone.unlockTouch());
  log(`blocco dei tocchi: ${lock}, sblocco dal PC: ${sblocco}`);
  swings += await colpisci(25000);
  log(`colpi tentati dal telefono: ${swings}`);
  // la partita va alla fine (punti dal motore)
  await g.evaluate(() => { const E = __natpfTennis; E.matchConfig.gamesToWin = 1; for (let i = 0; i < 40 && E.phase !== 'MATCH_OVER'; i++) E._awardPoint(i < 2 ? 'opponent' : 'player', 'Out'); });
  check('partita finita', await until(g, () => __natpfTennis.phase === 'MATCH_OVER', null, 10000));
  await sleep(2500);
  const s = await g.evaluate(async () => { const R = __natpfTennis.natpfUi.registro; R.rec.secondo(); let s = null; for (let i = 0; i < 4; i++){ await R.rec.blocco(); await new Promise(r => setTimeout(r, 300)); await R.invio.invia({ forza: true }); s = await R.stato(); if (!s.coda.blocchi && !s.inMemoria) break; } return s; });
  check('registro inviato allo spazio, niente in coda', !s.coda.blocchi && !s.inMemoria, fmt(s.coda));

  /* ---------- 3. le righe nello spazio ---------- */
  const rows = nelloSpazio(), partita = rows.find(r => r.k === 'partita'), fine = rows.find(r => r.k === 'partita.fine'), colpi = rows.filter(r => r.k === 'colpo' && r.n === partita?.n), avvio = rows.find(r => r.k === 'avvio');
  writeFileSync(path.join(OUT, 'registro.jsonl'), rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  log(`righe nello spazio: ${rows.length}; colpi della partita: ${colpi.length}; prova: ${rows.filter(r => r.k === 'colpo' && r.amb === 'prova').length}`);
  check('riga «avvio» con il formato 4', avvio?.v === 4, fmt(avvio));
  check('riga «partita»: telefono con la versione dell\'app (e la pagina uguale a quella del PC: niente pv)', partita?.tel?.app === '1.0.4' && partita.tel.pv === undefined, fmt(partita?.tel));
  const conMisure = colpi.filter(c => Number.isFinite(c.cf) && Number.isFinite(c.mg) && Array.isArray(c.rit));
  check('righe «colpo» del telefono con confidenza, margine e ritardo [arrivo, risposta]', colpi.length >= 1 && conMisure.length >= 1 && conMisure.every(c => c.rit[0] >= 0 && c.rit[1] >= c.rit[0]), fmt(colpi.map(c => [c.gesto, c.cf, c.mg, c.rit, c.gb])));
  const prova = rows.filter(r => r.k === 'colpo' && r.amb === 'prova');
  check('anche i colpi degli scambi di prova hanno le misure del gesto', prova.length === 0 || prova.some(c => Number.isFinite(c.mg)), fmt(prova.slice(0, 3)));
  const tq = fine?.tq?.g, lat = fine?.lat?.g, wifi = fine?.wifi?.g, blocco = fine?.blocco?.g, cal = fine?.cal?.g;
  check('partita.fine · tq: frequenza vera dei sensori (mediana e minima) e campioni contati sul telefono', Array.isArray(tq?.hz) && tq.hz[0] > 30 && tq.hz[1] > 0 && tq.n > 500 && tq.iv === 16, fmt(tq));
  check('partita.fine · lat: ritardo p50/p90/p99 all\'arrivo e alla risposta, colpi arrivati, strade', Array.isArray(lat?.arr) && Array.isArray(lat?.ris) && lat.n >= 1 && lat.arr[0] <= lat.arr[1] && lat.arr[1] <= lat.arr[2], fmt(lat));
  check('partita.fine · wifi (app finta): segnale, banda 5 GHz, velocità, batteria, temperatura, «Fissa app»', Array.isArray(wifi?.rssi) && wifi.bd === 5 && Array.isArray(wifi.mbps) && Array.isArray(wifi.bt) && Number.isFinite(wifi.tc) && wifi.fx === 1, fmt(wifi));
  check('partita.fine · blocco: tempo bloccato, tocchi fermati e sblocco dal PC', !lock || (blocco?.durS >= 1 && blocco.tb >= 1 && (blocco.sp >= 1 || !sblocco)), fmt({ lock, sblocco, blocco }));
  check('partita.fine · cal: tipo di profilo, soglie, colpo tipico', !!cal && cal.tipo != null && Array.isArray(cal.soglia), fmt(cal));
  check('partita.fine · pause: «segnale debole» con volte e secondi', Array.isArray(fine?.pause?.['segnale debole']) && fine.pause['segnale debole'][1] > 0, fmt(fine?.pause));
  const nomi = ['Mario Rossi', 'Mario', 'Rossi'];
  const male = rows.map(r => [r.k, controllaRiga(r, { nomi })]).filter(([, b]) => b.length);
  check('tutte le righe pulite: solo campi previsti, nessun nome, nessun indirizzo', !male.length, fmt(male.slice(0, 3)));
  check('del telefono e della rete solo numeri: niente nome della rete, indirizzi, identificativi', !/ssid|bssid|192\.168|Pixel 8|Mozilla/i.test(JSON.stringify(rows)));

  /* ---------- 4. riassunto e peso ---------- */
  const r = await riassumi(path.join(OUT, 'registro.jsonl'), { out: path.join(OUT, 'riassunto') });
  const titoli = r.sezioni.map(x => x.titolo);
  const sei = ['Sensori del telefono', 'Calibrazione: stabilità', 'Precisione dei gesti', 'Collegamento: distribuzione', 'Rete del telefono (app)', 'Telefono bloccato'];
  check('riassunto con le sei sezioni nuove, con i numeri di questa partita', sei.every(t => titoli.includes(t)) && !/Nessuna partita con le misure del B66/.test(r.sezioni.filter(x => sei.includes(x.titolo)).map(x => x.testo.join(' ')).join(' ')), titoli.join(' | '));
  for (const t of sei) log(`${t}: ${r.sezioni.find(x => x.titolo === t)?.testo.slice(0, 2).join(' ').slice(0, 300)}`);
  const via = o => { if (Array.isArray(o)) return o.map(via); if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).filter(([k]) => !CAMPI_B66.includes(k)).map(([k, v]) => [k, via(v)])); return o; };
  const diPartita = rows.filter(x => x.n === partita.n || x === partita), byte = list => list.reduce((a, x) => a + JSON.stringify(x).length + 1, 0);
  const dopo = byte(diPartita), prima = byte(diPartita.map(via));
  log(`peso della partita nel registro: ${(prima/1024).toFixed(2)} kB senza le misure del B66, ${(dopo/1024).toFixed(2)} kB con (righe della partita: ${diPartita.length})`);
  writeFileSync(path.join(OUT, 'peso.json'), JSON.stringify({ prima, dopo, righe: diPartita.length, colpi: colpi.length }));
  check('peso della partita contenuto: al più +2,5 kB in chiaro con le misure', dopo - prima < 2560, `${prima} → ${dopo} byte`);
  check('nessun errore JavaScript', !errs.length && !phErrs.length, [...errs, ...phErrs].join(' | ').slice(0, 400));
} finally {
  await B.close();
  stop();
  summary();
}
