// NATPF motore base: collegamento telefono↔computer che cade e torna (audit del 20/10). Il canale WebRTC resta aperto ma
// i messaggi non passano (si bloccano gli invii nella pagina, come una rete che si ferma senza chiudere il canale):
//   A. solo computer → telefono: il telefono deve accorgersene da solo e ricollegarsi (prima restava «collegato» per
//      sempre: il computer riceveva ancora i suoi ping e nessuno chiudeva);
//   B. tutte e due le direzioni mentre chi gioca finisce i gesti della calibrazione sul telefono: alla ripresa il
//      computer torna allo stesso passo del telefono e passa agli esercizi (prima restava al gesto di prima);
//   C. durante gli esercizi: pausa con il riquadro «segnale debole» (B45.1: niente pannello con il QR), poi si riprende da
//      solo quando il telefono torna.
//   D. B45.1 «telefono che non si scollega» (urgenza della fiera del 14/11): in partita contro la CPU bui di 3, 7 e 12 s
//      (la rete trattiene i messaggi e li consegna al ritorno, come le ritrasmissioni di una Wi-Fi vera; il canale dei
//      sensori li perde). 3 e 7 s: nessuna caduta né «Ricollega», «segnale debole, aspetto che torni…», la partita
//      riprende da sola. 12 s: caduta dopo 10 s, «scollegato · si ricollega da solo», il telefono torna da solo senza QR
//      né calibrazione, la partita riprende.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-phone-blackout.mjs   (BUI=3,7,12 per scegliere i bui di D)
// Eventi devicemotion sintetici e rete simulata nelle pagine: non sostituiscono la prova con un telefono e un Wi-Fi veri.
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, finishLesson, SP } from './th.mjs';
import { GESTI, phoneReadyNoGestures } from './prova.mjs';
import { QUICK_PLAN } from '../../site/js/tennis/calibration.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9117), GAME_PORT = +(process.env.GAME_PORT || 3117);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} peerServer.close(); });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// telefono in verticale (come natpf-training-flow.mjs) e rete che si può fermare: window.__drop blocca ogni invio sui canali
const PHONE_INIT = () => {
  const G = 9.81;
  window.__up = {
    emit(rot, acc = [0, 0, 0]){ window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: rot[0], beta: rot[1], gamma: rot[2] }, acceleration: { x: acc[0], y: acc[1], z: acc[2] }, accelerationIncludingGravity: { x: acc[0], y: G + acc[1], z: acc[2] }, interval: 10 })); },
    run(fn, ms){ return new Promise(r => { const t0 = performance.now(); const id = setInterval(() => { const u = (performance.now() - t0)/ms; const v = fn(Math.min(1, u)); this.emit(v.rot || v, v.acc); if (u >= 1){ clearInterval(id); r(); } }, 10); }); },
    swing(sign, { peak = 750, dur = 240 } = {}){ return this.run(u => ({ rot: [0, 0, sign*peak*Math.sin(Math.PI*u)**2], acc: [0, 0, -4*Math.sin(Math.PI*u)] }), dur); },
    back(sign, peak = 750, dur = 240){ const deg = peak*dur/2000, rate = 20; return this.run(() => [0, 0, -sign*rate], deg/rate*1000); },
  };
  window.__hold = setInterval(() => { if (!window.__busy) window.__up.emit([0.4*Math.sin(performance.now()), -0.4, 0.3]); }, 16);
};
// __netHold (B45.1, parte D): la rete trattiene i messaggi dei canali e della segnalazione e li consegna al ritorno (come le
// ritrasmissioni del canale affidabile e del TCP su una Wi-Fi vera); quelli verso un canale ormai chiuso si perdono
const DROP = () => {
  const send = RTCDataChannel.prototype.send, wsSend = WebSocket.prototype.send, held = [];
  window.__drop = false; window.__netHold = false;
  RTCDataChannel.prototype.send = function(d){ if (window.__drop) return; if (window.__netHold && this.ordered !== false){ held.push([this, send, d]); return; } if (window.__netHold) return; return send.call(this, d); };
  WebSocket.prototype.send = function(d){ if (window.__netHold){ held.push([this, wsSend, d]); return; } return wsSend.call(this, d); };
  // (verso un canale o una segnalazione ormai chiusi i messaggi si perdono, come in rete: niente invio, niente errore)
  window.__netRelease = () => { window.__netHold = false; for (const [o, f, d] of held.splice(0)){ if (o.readyState !== 'open' && o.readyState !== 1) continue; try { f.call(o, d); } catch {} } };
};
const setDrop = (pages, on) => Promise.all(pages.map(p => p.evaluate(v => { window.__drop = v; }, on)));
const setHold = (pages, on) => Promise.all(pages.map(p => p.evaluate(v => { if (v) window.__netHold = true; else window.__netRelease(); }, on)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BUI = (process.env.BUI || '3,7,12').split(',').map(Number).filter(n => n > 0);

const B = await launch();
try {
  const { p: game, errs: gameErrs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfPhone && window.__natpfTennis.natpfUi && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await game.evaluate(() => { const E = __natpfTennis; E.render = () => {}; });   // grafica software lenta: niente disegno
  await game.evaluate(DROP);
  await game.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible && __natpfTennis.natpfUi.lobby.step === 'menu', null, { timeout: 20000 });
  await game.click('[data-menu="training"]');
  await game.waitForFunction(() => __natpfTennis.natpfUi.lobby.step === 'controller', null, { timeout: 5000 });
  await game.click('[data-page="controller"] [data-natpf-controller="phone"]');
  await game.waitForFunction(() => __natpfTennis.natpfPhone.link?.L.state === 'waiting' && __natpfTennis.natpfPhone.pairingUrl, null, { timeout: 30000 });
  const url = await game.evaluate(() => __natpfTennis.natpfPhone.pairingUrl);
  const { p: phone, errs: phoneErrs } = await page(B, url, { w: 390, h: 844, mobile: true, init: PHONE_INIT });
  await phone.evaluate(DROP);
  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  await phone.click('#enable');
  await game.waitForFunction(() => __natpfTennis.natpfUi.training.active, null, { timeout: 8000 });
  await finishLesson(game, 8, phone);   // prima la modale del tutorial: «Tutto chiaro, ho capito» sul telefono
  if (GESTI){
    await phone.waitForFunction(() => __racchetta.state.step === 'swings', null, { timeout: 8000 });
    // gesto quando il computer dice «Ora» (o, a rete ferma, quando il telefono è pronto), poi il rientro lento della mano
    const gesture = async (sign, fromPhone = false) => {
      if (fromPhone) await phone.waitForFunction(() => __racchetta.cal.state.ready, null, { timeout: 10000, polling: 50 });
      else await game.waitForFunction(() => document.getElementById('coach-main').dataset.state === 'go', null, { timeout: 12000, polling: 50 });
      await phone.evaluate(s => { window.__busy = true; return __up.swing(s).then(() => __up.back(s)).then(() => { window.__busy = false; }); }, sign);
      await phone.waitForTimeout(600);
    };
    await gesture(1);
    check('primo gesto della calibrazione letto dal computer', await game.evaluate(() => __natpfTennis.natpfUi.training.view.idx === 1));

    // A. rete ferma solo dal computer al telefono (il computer riceve ancora i ping del telefono)
    await setDrop([game], true);
    const tA = Date.now();
    const lostAt = await phone.waitForFunction(() => __racchetta.state.linkState === 'lost', null, { timeout: 15000, polling: 100 }).then(() => Date.now() - tA, () => null);
    await setDrop([game], false);
    const backAt = await phone.waitForFunction(() => __racchetta.state.linkState === 'on', null, { timeout: 30000, polling: 100 }).then(() => Date.now() - tA, () => null);
    // (B45.1: il controllo di vita aspetta 10 s di silenzio vero, prima 5)
    check('A · il computer non arriva più al telefono: il telefono se ne accorge da solo (dopo 10 s) e si ricollega', lostAt != null && lostAt >= 9500 && lostAt <= 14000 && backAt != null, `perso dopo ${lostAt} ms, di nuovo collegato dopo ${backAt} ms`);

    // B. rete ferma nei due sensi mentre chi gioca finisce i gesti sul telefono
    await phone.waitForFunction(() => __racchetta.cal.state.step === 'swings' && __racchetta.cal.state.idx === 1, null, { timeout: 10000 });
    await setDrop([game, phone], true);
    for (const w of QUICK_PLAN.slice(1)) await gesture(w === 'L' ? 1 : -1, true);
    const phoneStep = await phone.evaluate(() => __racchetta.cal.state.step);
    const pcBefore = await game.evaluate(() => ({ stage: __natpfTennis.natpfUi.training.view.stage, idx: __natpfTennis.natpfUi.training.view.idx }));
    // (B45.1: il controllo di vita aspetta 10 s di silenzio vero. Qui la rete butta i messaggi, non li consegna dopo: si
    // lascia ferma finché il telefono non si accorge della caduta, così si prova il riallineamento dopo il ricollegamento,
    // lo scopo di questa parte. Una rete vera ritrasmette i messaggi del canale affidabile: parte D)
    await phone.waitForFunction(() => __racchetta.state.linkState !== 'on', null, { timeout: 20000, polling: 100 }).catch(() => {});
    await setDrop([game, phone], false);
    const drills = await game.waitForFunction(() => { const T = __natpfTennis.natpfUi.training; return T.active && !T.cal && __natpfTennis.natpfPhone.ready ? T.drill?.id : null; }, null, { timeout: 40000, polling: 100 }).then(h => h.jsonValue(), () => null);
    check('B · gesti finiti sul telefono a rete ferma: alla ripresa il computer si riallinea e passa agli esercizi', /review|free/.test(phoneStep) && drills === 'forehand', `telefono ${phoneStep}, computer prima della ripresa ${JSON.stringify(pcBefore)}, poi ${drills}`);
  } else {
    // B28, calibrazione di base («Giocando»): dopo il tutorial niente gesti di calibrazione, il telefono è pronto da solo e
    // si va agli esercizi (dritto e rovescio insegnano il colpo). La parte B (gesti della calibrazione finiti a rete
    // ferma) riguarda solo la calibrazione con i gesti: qui non c'è niente da riallineare
    check('(calibrazione di base) dopo il tutorial il telefono è pronto senza gesti e partono gli esercizi', await phoneReadyNoGestures(game) && await game.waitForFunction(() => { const T = __natpfTennis.natpfUi.training; return T.active && !T.cal && !T.tutorialOpen && T.drill?.id === 'forehand'; }, null, { timeout: 15000, polling: 100 }).then(() => true, () => false),
      JSON.stringify(await game.evaluate(() => { const T = __natpfTennis.natpfUi.training; return { cal: !!T.cal, drill: T.drill?.id, learn: !!T.learn, ready: __natpfTennis.natpfPhone.ready }; })));
    // A. rete ferma solo dal computer al telefono, durante gli esercizi
    await setDrop([game], true);
    const tA = Date.now();
    const lostAt = await phone.waitForFunction(() => __racchetta.state.linkState === 'lost', null, { timeout: 15000, polling: 100 }).then(() => Date.now() - tA, () => null);
    await setDrop([game], false);
    const backAt = await phone.waitForFunction(() => __racchetta.state.linkState === 'on', null, { timeout: 30000, polling: 100 }).then(() => Date.now() - tA, () => null);
    check('A · il computer non arriva più al telefono: il telefono se ne accorge da solo (dopo 10 s) e si ricollega', lostAt != null && lostAt >= 9500 && lostAt <= 14000 && backAt != null, `perso dopo ${lostAt} ms, di nuovo collegato dopo ${backAt} ms`);
    const again = await game.waitForFunction(() => { const T = __natpfTennis.natpfUi.training; return T.active && !T.cal && __natpfTennis.natpfPhone.ready && !__natpfTennis.natpfPaused; }, null, { timeout: 40000, polling: 100 }).then(() => true, () => false);
    check('A · (calibrazione di base) dopo il ricollegamento il telefono è di nuovo pronto senza gesti e gli esercizi continuano', again, JSON.stringify(await game.evaluate(() => ({ ready: __natpfTennis.natpfPhone.ready, phone: __natpfTennis.natpfPhone.state.phone, paused: !!__natpfTennis.natpfPaused, cal: !!__natpfTennis.natpfUi.training.cal }))));
    console.log('     B · non si applica alla calibrazione di base (riguarda i gesti della calibrazione finiti a rete ferma)');
  }

  // C. rete ferma durante gli esercizi (B45.1: pausa con il riquadro «segnale debole», niente pannello con il QR)
  await setDrop([game, phone], true);
  const paused = await game.waitForFunction(() => { const h = document.getElementById('natpf-phone-hold'); return __natpfTennis.natpfPaused && !!h && !h.classList.contains('hidden') && /segnale debole/.test(h.querySelector('b').textContent); }, null, { timeout: 15000, polling: 100 }).then(() => true, () => false);
  const panelC = await game.evaluate(() => !document.getElementById('natpf-phone-modal').classList.contains('hidden'));
  await setDrop([game, phone], false);
  const resumed = await game.waitForFunction(() => document.getElementById('natpf-phone-modal').classList.contains('hidden') && !__natpfTennis.natpfPaused && __natpfTennis.natpfPhone.ready, null, { timeout: 40000, polling: 100 }).then(() => true, () => false);
  check('C · telefono che tace durante gli esercizi: pausa con «segnale debole» (niente pannello con il QR), poi si riprende da solo', paused && !panelC && resumed, JSON.stringify({ paused, panelC, resumed }));

  // D. B45.1: partita contro la CPU con bui di 3, 7 e 12 s (la rete trattiene i messaggi e li consegna al ritorno)
  await game.evaluate(() => __natpfTennis.natpfUi.backToMenu('match'));
  await game.waitForFunction(() => { const L = __natpfTennis.natpfUi.lobby; return L.visible && L.step === 'match'; }, null, { timeout: 10000 });
  await game.click('#btn-start-match');
  const FIELD = ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'];
  const inMatch = await game.waitForFunction(f => (__natpfTennis.natpfMatchSeq || 0) >= 1 && !__natpfTennis.natpfUi.trial.active && !__natpfTennis.natpfUi.lobby.visible && f.includes(__natpfTennis.phase), FIELD, { timeout: 20000, polling: 100 }).then(() => true, () => false);
  check('D · partita contro la CPU partita con il telefono', inMatch, JSON.stringify(await game.evaluate(() => ({ seq: __natpfTennis.natpfMatchSeq, phase: __natpfTennis.phase, lobby: __natpfTennis.natpfUi.lobby.visible, step: __natpfTennis.natpfUi.lobby.step }))));
  // registro di ogni 100 ms: stato del collegamento sul computer, pausa, titolo del riquadro, pannello del telefono; «Ricollega»
  // chiesti dal gioco; stato del collegamento sul telefono
  await game.evaluate(() => {
    const E = __natpfTennis, P = E.natpfPhone, link = P.link, r = link.relink.bind(link);
    window.__relinks = 0; link.relink = () => { window.__relinks++; return r(); };
    window.__mon = [];
    setInterval(() => { const h = document.getElementById('natpf-phone-hold'); window.__mon.push({ t: Math.round(performance.now() - (window.__t0 || 0)), st: link.L.state, ph: link.L.phone, paused: !!E.natpfPaused, title: h && !h.classList.contains('hidden') ? h.querySelector('b').textContent : '', text: h && !h.classList.contains('hidden') ? h.querySelector('p').textContent : '', modal: !document.getElementById('natpf-phone-modal').classList.contains('hidden'), seq: E.natpfMatchSeq || 0 }); if (window.__mon.length > 900) window.__mon.shift(); }, 100);
  });
  await phone.evaluate(() => { window.__ph = []; setInterval(() => { window.__ph.push(__racchetta.state.linkState); if (window.__ph.length > 900) window.__ph.shift(); }, 100); });
  // (fase B: righe «tel» del registro dello stand scritte da qui in poi, per il motivo della caduta)
  await game.evaluate(() => { const rec = __natpfTennis.natpfUi.registro?.rec; window.__tel = []; if (!rec) return; const o = rec._scrivi.bind(rec); rec._scrivi = raw => { const n = rec.buf.length; o(raw); if (rec.buf.length > n){ try { const r = JSON.parse(rec.buf[rec.buf.length - 1]); if (r.k === 'tel') window.__tel.push(r); } catch {} } }; });
  for (const secs of BUI){
    const steady = await game.waitForFunction(f => { const E = __natpfTennis; return E.natpfPhone.ready && E.natpfPhone.connected && !E.natpfPaused && !E.natpfUi.phoneHold && f.includes(E.phase) && !E.natpfUi.lobby.visible; }, FIELD, { timeout: 40000, polling: 100 }).then(() => true, () => false);
    if (!steady){ check(`D · buio di ${secs} s: partita in corso prima del buio`, false, JSON.stringify(await game.evaluate(() => ({ phase: __natpfTennis.phase, paused: __natpfTennis.natpfPaused, ready: __natpfTennis.natpfPhone.ready })))); continue; }
    await sleep(1500);
    await game.evaluate(() => { window.__t0 = performance.now(); window.__mon.length = 0; window.__relinks = 0; });
    await phone.evaluate(() => { window.__ph.length = 0; });
    await setHold([game, phone], true);
    await sleep(secs*1000);
    await setHold([game, phone], false);
    const tBack = Date.now();
    const back = await game.waitForFunction(f => { const E = __natpfTennis; return E.natpfPhone.ready && E.natpfPhone.connected && !E.natpfPaused && !E.natpfUi.phoneHold && f.includes(E.phase); }, FIELD, { timeout: 40000, polling: 100 }).then(() => Date.now() - tBack, () => null);
    const mon = await game.evaluate(() => window.__mon.slice()), relinks = await game.evaluate(() => window.__relinks);
    const ph = await phone.evaluate(() => ({ seen: [...new Set(window.__ph)], sensor: __racchetta.state.sensor, linkState: __racchetta.state.linkState }));
    const lostAt = mon.find(m => m.st !== 'connected')?.t ?? null, titles = [...new Set(mon.map(m => m.title).filter(Boolean))];
    const info = JSON.stringify({ back, lostAt, relinks, titles, phone: ph, modal: mon.some(m => m.modal), phases: [...new Set(mon.map(m => m.ph))], seq: [...new Set(mon.map(m => m.seq))], last: mon.at(-1) });
    const common = back != null && relinks === 0 && !mon.some(m => m.modal) && !mon.some(m => m.ph === 'cal') && ph.sensor === 'ready' && new Set(mon.map(m => m.seq)).size === 1;
    if (secs < 10){
      const calm = !titles.some(t => /scollegat/i.test(t)) && !mon.some(m => /Riattiva i sensori|QR/.test(m.text));
      const pausedSeen = mon.some(m => m.paused) && titles.some(t => /segnale debole, aspetto che torni/.test(t));
      check(`D · buio di ${secs} s in partita: nessuna caduta né «Ricollega», niente «scollegato»${secs >= 5 ? ', pausa con «segnale debole, aspetto che torni…»' : ''}, la partita riprende da sola (${back} ms dopo)`,
        common && lostAt == null && ph.seen.every(s => s === 'on') && calm && (secs < 5 || pausedSeen), info);
    } else {
      const order = titles.findIndex(t => /segnale debole/.test(t)) >= 0 && titles.some(t => /scollegato · si ricollega da solo/.test(t));
      const timed = mon.some(m => /Senza segnale da \d+ s/.test(m.text));
      check(`D · buio di ${secs} s in partita: caduta dopo 10 s (non prima), «scollegato · si ricollega da solo» con il tempo, il telefono torna da solo senza QR né calibrazione e la partita riprende (${back} ms dopo)`,
        common && lostAt != null && lostAt >= 9500 && order && timed && ph.seen.includes('lost') && !ph.seen.includes('denied') && ph.linkState === 'on', info);
      // fase B: perché è caduto. Riga «tel» del registro alla caduta (motivo, chi se n'è accorto, dove) e al ritorno (con il
      // racconto del telefono), cadute di oggi nella memoria del gioco e riga del pannello dello stand
      await sleep(1500);
      const why = await game.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.kiosk.open(); const c = document.getElementById('staff-cadute'), out = { tel: window.__tel.filter(r => r.stato === 'caduto' || r.stato === 'ricollegato'), cadute: JSON.parse(localStorage.getItem('natpf-tennis.cadute') || 'null'), riga: c && !c.classList.contains('hidden') ? c.textContent : null }; return out; });
      await game.screenshot({ path: `${SP}/blackout-pannello-cadute.png` });
      await game.evaluate(() => __natpfTennis.natpfUi.kiosk.close());
      const down = why.tel.find(r => r.stato === 'caduto'), up = why.tel.find(r => r.stato === 'ricollegato');
      // (le cadute di oggi contano anche quelle delle parti A e B, tutte per silenzio)
      check('D · fase B: riga «tel» della caduta con motivo «silenzio» (visto prima dal computer o dal telefono), da quanto taceva e dove si era; al ritorno il motivo e i tentativi del telefono; nel pannello «Telefono 1: N cadute oggi · motivo più frequente: Wi-Fi ferma…»',
        !!down && down.motivo === 'silenzio' && ['computer', 'telefono'].includes(down.causa) && down.dove === 'partita' && Number.isFinite(down.ms) && down.ms >= 9500 && !!up && Number.isFinite(up.dopoS) && !!up.motivo && up.prove >= 1 && why.cadute?.p1?.n >= 1 && why.cadute.p1.m?.silenzio === why.cadute.p1.n && /^Telefono 1: \d+ cadut[ae] oggi · motivo più frequente: Wi-Fi ferma/.test(why.riga || ''), JSON.stringify(why));
    }
  }
  check('nessun errore JavaScript', !gameErrs.length && !phoneErrs.length, [...gameErrs, ...phoneErrs].join(' | ').slice(0, 400));
} finally {
  await B.close();
}
summary();
setTimeout(() => process.exit(), 300);
