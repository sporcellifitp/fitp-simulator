// telefono senza sensori, permesso negato, «Scollega»: si gioca lo stesso
import { readFileSync } from 'node:fs';
import { launch, page, check, summary, SP, JSQR } from './th.mjs';
const B = await launch();
async function desk(){
  const D = await page(B, 'http://127.0.0.1:8765/tennis/?peer=127.0.0.1:9000');
  await D.p.waitForFunction(() => window.__tennis && window.qrcode, null, { timeout: 60000 });
  await D.p.click('#playPhone'); await D.p.waitForFunction(() => document.querySelector('#qr').dataset.url, null, { timeout: 20000 });
  return { ...D, url: await D.p.evaluate(() => document.querySelector('#qr').dataset.url) };
}
// 1. browser senza DeviceMotionEvent
{
  const D = await desk();
  const P = await page(B, D.url, { w: 390, h: 844, mobile: true, init: 'delete window.DeviceMotionEvent' });
  await P.p.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'on', null, { timeout: 20000 });
  await P.p.click('#enable');
  await P.p.waitForFunction(() => __racchetta.state.sensor === 'tap');
  check('senza sensori: il telefono diventa un pulsante', await P.p.evaluate(() => !document.querySelector('#tap').classList.contains('hidden')), await P.p.evaluate(() => document.querySelector('#sub').textContent));
  await D.p.waitForFunction(() => !document.querySelector('#pairGo').disabled, null, { timeout: 8000 });
  check('… e il computer lo accetta come comando', true, await D.p.evaluate(() => document.querySelector('#pairStatus').textContent));
  await P.p.screenshot({ path: SP + '/t3-tap.png' });
  await D.p.click('#pairGo'); await D.p.waitForFunction(() => __tennis.state === 'play');
  await D.p.evaluate(() => { window.__sw = 0; __tennis.link.on('swing', () => __sw++); });
  await P.p.tap('#tap'); await P.p.waitForTimeout(400);
  check('il pulsante «Colpisci» arriva in partita', await D.p.evaluate(() => __sw >= 1 || !!__tennis.core.toss));
  // «Scollega» dal telefono
  await P.p.click('#bye');
  await D.p.waitForFunction(() => /scollegato|attesa/i.test(document.querySelector('#chip').textContent), null, { timeout: 15000 });
  check('«Scollega» dal telefono: il computer torna a mouse e tastiera', true, await D.p.evaluate(() => document.querySelector('#chip').textContent));
  check('nessun errore JavaScript', !D.errs.length && !P.errs.length, [...D.errs, ...P.errs].join(' | ').slice(0, 300));
  await D.ctx.close(); await P.ctx.close();
}
// 2. permesso negato (come su iPhone quando si tocca «Non consentire»)
{
  const D = await desk();
  const P = await page(B, D.url, { w: 390, h: 844, mobile: true, init: 'DeviceMotionEvent.requestPermission = async () => "denied"' });
  await P.p.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'on', null, { timeout: 20000 });
  await P.p.click('#enable');
  await P.p.waitForFunction(() => __racchetta.state.sensor === 'tap');
  const txt = await P.p.evaluate(() => document.querySelector('#big').textContent + ' · ' + document.querySelector('#sub').textContent);
  check('permesso negato: spiegazione e pulsante di riserva', /negati/.test(txt), txt);
  await P.p.screenshot({ path: SP + '/t3-denied.png' });
  // permesso concesso (iPhone): la calibrazione parte
  await D.ctx.close(); await P.ctx.close();
  const D2 = await desk();
  const P2 = await page(B, D2.url, { w: 390, h: 844, mobile: true, init: readFileSync(new URL('./motion.js', import.meta.url), 'utf8') + ';DeviceMotionEvent.requestPermission = async () => "granted"' });
  await P2.p.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'on', null, { timeout: 20000 });
  await P2.p.click('#enable'); await P2.p.evaluate(() => __motion.still(1200));
  check('permesso concesso (iPhone): parte la calibrazione', await P2.p.evaluate(() => __racchetta.state.sensor === 'practice'));
  await P2.p.click('#skip');
  check('«Salta il dritto di prova» porta a «pronto»', await P2.p.evaluate(() => __racchetta.state.sensor === 'ready'));
  // il computer «Scollega il telefono»: il telefono lo sa e non si ricollega da solo
  await D2.p.waitForFunction(() => !document.querySelector('#pairForget').classList.contains('hidden'));
  await D2.p.click('#pairForget');
  await P2.p.waitForFunction(() => __racchetta.state.linkState === 'denied', null, { timeout: 10000 });
  check('«Scollega il telefono» dal computer: il telefono chiede un QR nuovo', true, await P2.p.evaluate(() => document.querySelector('#sub').textContent));
  check('… e il computer mostra un QR nuovo', await D2.p.evaluate(() => !!document.querySelector('#qr svg')));
  check('nessun errore JavaScript', ![...D.errs, ...P.errs, ...D2.errs, ...P2.errs].length, [...D.errs, ...P.errs, ...D2.errs, ...P2.errs].join(' | ').slice(0, 300));
}
// 3. server di segnalazione irraggiungibile: il gioco resta giocabile
{
  const D = await page(B, 'http://127.0.0.1:8765/tennis/?peer=127.0.0.1:9999');
  await D.p.waitForFunction(() => window.__tennis && window.qrcode, null, { timeout: 60000 });
  await D.p.click('#playPhone');
  await D.p.waitForFunction(() => /non disponibile/.test(document.querySelector('#pairStatus').textContent), null, { timeout: 30000 });
  check('server non raggiungibile: messaggio chiaro', true, await D.p.evaluate(() => document.querySelector('#pairStatus').textContent));
  await D.p.click('#pairBack'); await D.p.click('#playMouse');
  check('… e si gioca con mouse e tastiera', await D.p.evaluate(() => __tennis.state === 'play'));
  await D.ctx.close();
}
summary(); await B.close();
