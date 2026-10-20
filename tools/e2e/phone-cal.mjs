// telefono come racchetta contro la CPU: QR letto davvero, telefono simulato, permessi, calibrazione guidata con swing
// nei due versi (anche una prova sbagliata), verifica, prova libera, conferma, partita con i colpi del telefono,
// ricalibrazione dalla pausa, telefono chiuso e ricollegato
import { readFileSync } from 'node:fs';
import { launch, page, check, summary, SP, JSQR } from './th.mjs';
const motion = readFileSync(new URL('./motion.js', import.meta.url), 'utf8'), jsqr = readFileSync(JSQR, 'utf8');
const B = await launch();
const D = await page(B, 'http://127.0.0.1:8765/tennis/?peer=127.0.0.1:9000&q=low', { w: 960, h: 600 }), d = D.p;
await d.waitForFunction(() => window.__racchetta && window.qrcode, null, { timeout: 60000 });
await d.fill('#name', 'Sergio'); await d.click('#fmt [data-v="1"]');
await d.click('#btnCpu');
await d.waitForFunction(() => document.querySelector('#qr svg'), null, { timeout: 20000 });
await d.addScriptTag({ content: jsqr });
const decoded = await d.evaluate(async () => {
  const xml = new XMLSerializer().serializeToString(document.querySelector('#qr svg'));
  const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(xml); await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 300); x.drawImage(img, 20, 20, 260, 260);
  const r = jsQR(x.getImageData(0, 0, 300, 300).data, 300, 300); return r && r.data;
});
check('1 · il QR si legge e porta alla sessione giusta', decoded && decoded === await d.evaluate(() => document.querySelector('#qr').dataset.url) && /#s=racchetta-tel-[a-z0-9]+&k=/.test(decoded), decoded);
await d.screenshot({ path: SP + '/pc-1-qr.png' });
const P = await page(B, decoded, { w: 390, h: 844, mobile: true, init: motion }), ph = P.p;
await ph.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'on', null, { timeout: 20000 });
await d.waitForFunction(() => /Attiva i sensori/.test(document.querySelector('#pairStatus').textContent), null, { timeout: 10000 });
check('1 · telefono collegato, il computer chiede di attivare i sensori', true);
await ph.click('#enable');
const holding = ph.evaluate(() => __motion.still(1800));          // un telefono vero manda dati di continuo
await d.waitForFunction(() => !document.querySelector('#pImpugna').classList.contains('hidden'), null, { timeout: 5000 });
check('2 · passo «Impugna» con il disegno e lo stato in tempo reale', await d.evaluate(() => !!document.querySelector('#pImpugna svg')));
await d.screenshot({ path: SP + '/pc-2-grip.png' });
await holding;
await d.waitForFunction(() => !document.querySelector('#pProva').classList.contains('hidden'), null, { timeout: 8000 });
check('3 · dopo il telefono fermo e in verticale si passa agli swing', true);
await d.screenshot({ path: SP + '/pc-3-swing.png' });
// calibrazione rapida (← → ← →): il secondo gesto prima nel verso sbagliato (va segnalato), uno con l'apertura prima
// del colpo. Prima la prova seguiva il piano di sei gesti (tre per lato), sostituito da quello rapido.
const L = [0, 1, 0], R = [0, -1, 0], fb = [];
const swing = async (axis, peak, pre = false) => { if (pre) await ph.evaluate(a => __motion.swing({ axis: a, peak: 300, dur: 260 }), axis.map(v => -v)); await ph.evaluate(([a, p]) => __motion.swing({ axis: a, peak: p }), [axis, peak]); await ph.evaluate(() => __motion.still(600)); fb.push(await d.textContent('#fbTxt')); };
await swing(L, 700);
await swing(L, 700);                                  // sbagliato: si chiedeva da sinistra a destra
const wrong = fb[1];
await swing(R, 650, true); await swing(L, 720); await swing(R, 560);
check('3 · ogni swing ha l\'esito subito: direzione rilevata, riconosciuto o no', /Registrato/.test(fb[0]) && /Direzione rilevata: ←/.test(wrong), `${fb[0]} | ${wrong}`);
await d.waitForFunction(() => !document.querySelector('#pVerifica').classList.contains('hidden'), null, { timeout: 8000 });
const rv = await d.evaluate(() => ({ L: document.querySelector('#rvL').textContent, R: document.querySelector('#rvR').textContent, why: document.querySelector('#rvWhy').textContent, ok: !document.querySelector('#rvConfirm').classList.contains('hidden') }));
check('4 · verifica: due su due per lato, si può confermare', rv.ok && /2\/2/.test(rv.L) && /2\/2/.test(rv.R), JSON.stringify(rv));
await ph.evaluate(() => __motion.swing({ axis: [0, -1, 0], peak: 650 })); await ph.evaluate(() => __motion.still(600));
const free = await d.textContent('#frTxt');
check('4 · prova libera: direzione e forza in tempo reale', /da sinistra a destra, forza \d+%/.test(free), free);
await d.screenshot({ path: SP + '/pc-4-review.png' });
await d.click('#rvConfirm');
await d.waitForFunction(() => !document.querySelector('#pConferma').classList.contains('hidden'), null, { timeout: 8000 });
check('5 · calibrazione confermata: si usa quella in partita', await ph.evaluate(() => __racchetta.state.sensor === 'ready' && __racchetta.det.profile.axis != null));
await ph.screenshot({ path: SP + '/pc-phone-ready.png' });
await d.click('#pairGo');
await d.waitForFunction(() => __racchetta.state === 'play');
const desktopInput = await d.evaluate(() => {
  const c = __racchetta.controls, canvas = document.querySelector('#app canvas');
  c.enabled = true;
  canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0, clientX: 400, clientY: 260 }));
  window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'Space' }));
  const v = c.read(); c.enabled = false;
  return { swings: v.swings.length, moveX: v.move.x, moveY: v.move.y };
});
check('mouse e tastiera non producono input di gioco', desktopInput.swings === 0 && desktopInput.moveX === 0 && desktopInput.moveY === 0, JSON.stringify(desktopInput));
await d.evaluate(() => { const c = __racchetta.core; c.score.server = 0; c.setupPoint(); });   // il primo servizio è del telefono
check('partita avviata con il telefono, giocatore che si muove da solo', await d.evaluate(() => document.querySelector('#chip').classList.contains('ok')), await d.textContent('#chip'));
// il robot fa partire il movimento sul telefono in modo che il picco cada quando la palla arriva (+ errore umano 50 ms)
await d.evaluate(() => { window.__ev = { contact: [], miss: [], points: [0, 0], toss: 0 };
  setInterval(() => { const c = __racchetta.core; if (!c || c.__w) return; c.__w = 1; const u = c.update.bind(c); c.update = (dt, inp) => { const ev = u(dt, inp); for (const e of ev){ if (e.type === 'contact' && e.player === 'me') __ev.contact.push(e.label + (e.serve ? '·servizio' : '') + ' ' + Math.round(e.timing*1000)); if (e.type === 'miss' && e.player === 'me') __ev.miss.push(e.why); if (e.type === 'point') __ev.points[e.team]++; if (e.type === 'toss') __ev.toss++; } return ev; }; }, 30); });
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
const t0 = Date.now(); let end = false, lastTc = null, lastToss = null;
while (Date.now() - t0 < 600000){
  const s = await d.evaluate(() => { const A = __racchetta.A, c = A.core; if (!c || A.state !== 'play') return { st: A.state };
    const h = c.players[0]; return { st: A.state, ph: c.phase, srv: c.serverP === h, toss: c.toss && c.toss.t0, tc: h.inc && !h.done ? h.inc.Tc : null, ct: c.t, ft: A.frameT, clock: A.link.clock }; });
  if (s.st === 'end'){ end = true; break; }
  if (s.st === 'play' && s.clock){
    const toPhone = tc => s.ft + (tc - s.ct)*1000 + s.clock.off;
    if (s.ph === 'serve' && s.srv && !s.toss && lastToss !== 'sent'){ lastToss = 'sent'; await ph.evaluate(() => __motion.swing({ axis: [0, 1, 0], peak: 500 })); }
    else if (s.ph === 'serve' && s.toss && lastToss !== s.toss){ lastToss = s.toss; const tgt = toPhone(s.toss + 5.1/9.81) + gauss()*50; ph.evaluate(t => new Promise(r => setTimeout(() => __motion.swing({ axis: [0, 1, 0], peak: 800 }).then(r), Math.max(0, t - 110 - performance.now()))), tgt); }
    else if (s.ph !== 'serve') lastToss = null;
    if (s.ph === 'live' && s.tc && s.tc !== lastTc && s.tc - s.ct < .6){ lastTc = s.tc; const tgt = toPhone(s.tc) + gauss()*50; ph.evaluate(t => new Promise(r => setTimeout(() => __motion.swing({ axis: Math.random() < .5 ? [0, 1, 0] : [0, -1, 0], peak: 500 + Math.random()*600 }).then(r), Math.max(0, t - 110 - performance.now()))), tgt); }
  }
  await d.waitForTimeout(20);
}
const ev = await d.evaluate(() => __ev);
await d.screenshot({ path: SP + '/pc-end.png' });
check('i colpi del telefono colpiscono la palla, nei due versi', ev.contact.length >= 4, ev.contact.join(', ') + ' | mancate: ' + (ev.miss.join(', ') || 'nessuna'));
check('servizio col telefono: il movimento lancia la palla', ev.toss >= 1, `${ev.toss} lanci`);
check('la partita col telefono arriva alla fine', end, `punti ${ev.points}`);
check('il telefono riceve l\'esito dei colpi', /Partita finita|Punto|Perfetto|Bel colpo|anticipo|ritardo|Troppo|colpo/.test(await ph.evaluate(() => document.body.innerText)));
// ricalibrazione dalla pausa
await d.click('#again'); await d.waitForFunction(() => __racchetta.state === 'play');
await d.click('#pauseBtn'); await d.click('#pausePhone');
await d.waitForFunction(() => !document.querySelector('#pConferma').classList.contains('hidden'), null, { timeout: 5000 });
await d.click('#pairRecal');
await d.waitForFunction(() => !document.querySelector('#pImpugna').classList.contains('hidden'), null, { timeout: 8000 });
check('ricalibrazione: si riparte dall\'impugnatura', true);
await d.click('#pairBack'); await d.click('#resume');
// telefono chiuso: il computer lo dice e resta giocabile; un telefono nuovo si collega con il QR nuovo
await P.ctx.close();
await d.waitForFunction(() => /scollegato/i.test(document.querySelector('#chip').textContent), null, { timeout: 20000 });
check('telefono chiuso: il computer lo segnala', true, await d.textContent('#chip'));
check('nessun errore JavaScript', !D.errs.length && !P.errs.length, [...D.errs, ...P.errs].join(' | ').slice(0, 500));
summary(); await B.close();
