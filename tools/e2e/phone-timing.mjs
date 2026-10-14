// misura dello scarto di tempo del telefono, senza l'errore del robot: giocatore fermo, arrivo della palla previsto con la fisica
import { readFileSync } from 'node:fs';
import { launch, page, SP } from './th.mjs';
const motion = readFileSync(new URL('./motion.js', import.meta.url), 'utf8');
const B = await launch();
const D = await page(B, 'http://127.0.0.1:8765/tennis/?peer=127.0.0.1:9000'), d = D.p;
await d.waitForFunction(() => window.__tennis && window.qrcode, null, { timeout: 60000 });
await d.click('#playPhone'); await d.waitForFunction(() => document.querySelector('#qr').dataset.url, null, { timeout: 20000 });
const url = await d.evaluate(() => document.querySelector('#qr').dataset.url);
const P = await page(B, url, { w: 390, h: 844, mobile: true, init: motion }), ph = P.p;
await ph.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'on', null, { timeout: 20000 });
await ph.click('#enable'); await ph.evaluate(() => __motion.still(1200)); await ph.evaluate(() => __motion.swing({ peak: 900 }));
await d.waitForFunction(() => !document.querySelector('#pairGo').disabled, null, { timeout: 8000 });
await d.click('#autoMove'); await d.click('#pairGo'); await d.waitForFunction(() => __tennis.state === 'play');
await d.evaluate(async () => {
  const { predict } = await import('/js/match/physics.js');
  window.__pred = predict; window.__res = [];
  setInterval(() => { const c = __tennis.core; if (!c || c.__w) return; c.__w = 1; const u = c.update.bind(c); c.update = (dt, inp) => { const ev = u(dt, inp); for (const e of ev) if ((e.type === 'contact' || e.type === 'whiff') && e.player === 'me' && !e.serve) __res.push(e.type === 'whiff' ? 'mancata' : +(e.timing*.11*1000).toFixed(0)); return ev; }; }, 50);
});
const t0 = Date.now(); let busy = false;
while (Date.now() - t0 < 240000 && (await d.evaluate(() => __res.length)) < 25){
  const s = await d.evaluate(() => {
    const T = __tennis, c = T.core; if (!c || T.state !== 'play') return null;
    if (T.state === 'end') return { end: true };
    const h = c.players[0];
    // il giocatore resta fermo dove la palla passerà: la previsione resta esatta
    if (c.phase !== 'live' || c.rally.lastHitter === 0 || !c.rally.canHit(0)) return { idle: true, ph: c.phase, srv: c.serverP === h, toss: !!c.toss };
    const pr = __pred(c.ball, c.court, 2.5, 1/240);
    const k = pr.find(k => k.z > 0 && h.z - k.z <= .45 && k.y > .15 && !(c.rally.isServe && k.bounces === 0));
    if (!k) return { idle: true };
    if (!h.__fixed){ h.__fixed = 1; }
    if (k.t > .25){ h.x = h.tx = k.x - .6; h.tz = h.z; }   // di lato, sul dritto (spostato subito: la misura riguarda il tempo, non la corsa)
    return { eta: k.t, now: T.frameT, clock: T.link.clock };
  });
  if (!s){ await d.waitForTimeout(100); continue; }
  if (s.ph === 'serve' && s.srv && !busy){ busy = true; await ph.evaluate(() => __motion.swing({ peak: 600 })); await d.waitForTimeout(650); await ph.evaluate(() => __motion.swing({ peak: 1000 })); await d.waitForTimeout(500); busy = false; continue; }
  if (s.eta && s.eta < .45 && s.eta > .2 && s.clock && !busy){
    busy = true; const tgt = s.now + s.eta*1000 + s.clock.off;
    await ph.evaluate(tgt => new Promise(r => setTimeout(() => __motion.swing({ peak: 1100 }).then(r), Math.max(0, tgt - 110 - performance.now()))), tgt);
    busy = false; await d.waitForTimeout(400);
  }
  if ((await d.evaluate(() => __tennis.state)) === 'end') await d.click('#again');
  await d.waitForTimeout(10);
}
const res = await d.evaluate(() => __res), ms = res.filter(v => typeof v === 'number');
const avg = ms.reduce((a, b) => a + b, 0)/ms.length, sd = Math.sqrt(ms.reduce((a, b) => a + (b - avg)**2, 0)/ms.length);
console.log('scarti (ms, + anticipo / − ritardo):', res.join(' '));
console.log(`media ${avg.toFixed(0)} ms, deviazione ${sd.toFixed(0)} ms, ${ms.filter(v => Math.abs(v) < .35*110).length}/${ms.length} perfetti; orologio ${JSON.stringify(await d.evaluate(() => __tennis.link.clock))}`);
await B.close();
