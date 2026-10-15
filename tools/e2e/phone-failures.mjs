// telefono senza sensori, permesso negato, permesso concesso (iPhone), calibrazione con swing troppo piccoli,
// «Scollega» dai due lati e server irraggiungibile: il gioco spiega come recuperare senza controller alternativo
import { readFileSync } from 'node:fs';
import { launch, page, check, summary, SP } from './th.mjs';
const motion = readFileSync(new URL('./motion.js', import.meta.url), 'utf8');
const B = await launch(), size = { w: 800, h: 520 };
async function desk(){
  const D = await page(B, 'http://127.0.0.1:8765/tennis/?peer=127.0.0.1:9000&q=low', size);
  await D.p.waitForFunction(() => window.__racchetta && window.qrcode, null, { timeout: 60000 });
  await D.p.click('#btnCpu');
  await D.p.waitForFunction(() => document.querySelector('#qr').dataset.url, null, { timeout: 30000 });
  return { ...D, url: await D.p.evaluate(() => document.querySelector('#qr').dataset.url) };
}
const phone = async (url, init) => { const P = await page(B, url, { w: 390, h: 844, mobile: true, init }); await P.p.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'on', null, { timeout: 40000 }); return P; };
const errs = [];
// 1. browser senza sensori di movimento
{
  const D = await desk(), P = await phone(D.url, 'delete window.DeviceMotionEvent');
  await P.p.click('#enable');
  await D.p.waitForFunction(() => !document.querySelector('#pErrore').classList.contains('hidden'), null, { timeout: 10000 });
  check('senza sensori: il computer spiega cosa fare e non fa partire il telefono', /Chrome|Safari/.test(await D.p.textContent('#errTxt')), await D.p.textContent('#errTxt'));
  check('… anche sul telefono', /Niente sensori/.test(await P.p.textContent('#big')));
  await D.p.screenshot({ path: SP + '/fail-nomotion.png' });
  check('nessun fallback mouse/tastiera: il gioco resta in attesa del telefono', await D.p.evaluate(() => __racchetta.state === 'pair' && __racchetta.A.ctrl === 'phone'));
  errs.push(...D.errs, ...P.errs); await D.ctx.close(); await P.ctx.close();
}
// 2. permesso negato (iPhone, «Non consentire»)
{
  const D = await desk(), P = await phone(D.url, 'DeviceMotionEvent.requestPermission = async () => "denied"');
  await P.p.click('#enable');
  await D.p.waitForFunction(() => !document.querySelector('#pErrore').classList.contains('hidden'), null, { timeout: 10000 });
  check('permesso negato: istruzioni per riattivarlo (iPhone e Android)', /Consenti/.test(await D.p.textContent('#errTxt')) && /Android/.test(await D.p.textContent('#errTxt')));
  errs.push(...D.errs, ...P.errs); await D.ctx.close(); await P.ctx.close();
}
// 3. permesso concesso (iPhone): calibrazione; swing troppo piccoli → si spiega e non si conferma; poi si rifà bene
{
  const D = await desk(), P = await phone(D.url, motion + ';DeviceMotionEvent.requestPermission = async () => "granted"'), ph = P.p;
  await ph.click('#enable'); await ph.evaluate(() => __motion.still(1800));
  await D.p.waitForFunction(() => !document.querySelector('#pProva').classList.contains('hidden'), null, { timeout: 10000 });
  check('permesso concesso: parte la calibrazione guidata', true);
  for (let i = 0; i < 18 && await D.p.evaluate(() => document.querySelector('#pVerifica').classList.contains('hidden')); i++){
    const want = await ph.evaluate(() => __racchetta.cal.state.idx < 3 ? 1 : -1);
    await ph.evaluate(w => __motion.swing({ axis: [0, w, 0], peak: 175 }), want); await ph.evaluate(() => __motion.still(600));
  }
  await D.p.waitForFunction(() => !document.querySelector('#pVerifica').classList.contains('hidden'), null, { timeout: 10000 });
  const why = await D.p.textContent('#rvWhy');
  check('swing troppo piccoli: niente conferma e il motivo', /troppo piccoli/.test(why) && await D.p.evaluate(() => document.querySelector('#rvConfirm').classList.contains('hidden')), why);
  await D.p.screenshot({ path: SP + '/fail-small.png' });
  await D.p.click('#rvRetry');
  for (const w of [1, 1, 1, -1, -1, -1]){ await ph.evaluate(w => __motion.swing({ axis: [0, w, 0], peak: 650 }), w); await ph.evaluate(() => __motion.still(600)); }
  await D.p.waitForFunction(() => !document.querySelector('#rvConfirm').classList.contains('hidden'), null, { timeout: 10000 });
  check('ripetuti bene: si può confermare', true);
  // «Scollega» dal telefono
  await D.p.click('#rvConfirm'); await D.p.waitForFunction(() => !document.querySelector('#pConferma').classList.contains('hidden'));
  await ph.click('#bye');
  await D.p.waitForFunction(() => !document.querySelector('#pCollega').classList.contains('hidden'), null, { timeout: 15000 });
  check('«Scollega» dal telefono: il computer torna al QR', true);
  errs.push(...D.errs, ...P.errs); await D.ctx.close(); await P.ctx.close();
}
// 4. server di segnalazione irraggiungibile
{
  const D = await page(B, 'http://127.0.0.1:8765/tennis/?peer=127.0.0.1:9999&q=low', size);
  await D.p.waitForFunction(() => window.__racchetta && window.qrcode, null, { timeout: 60000 });
  await D.p.click('#btnCpu'); await D.p.click('#ctrlPhone');
  await D.p.waitForFunction(() => /non disponibile/.test(document.querySelector('#pairStatus').textContent), null, { timeout: 40000 });
  check('server non raggiungibile: messaggio chiaro', true, await D.p.textContent('#pairStatus'));
  check('nessun fallback mouse/tastiera se il signaling fallisce', await D.p.evaluate(() => __racchetta.state === 'pair' && __racchetta.A.ctrl === 'phone'));
  // il browser scrive da solo in console il WebSocket rifiutato: è il guasto voluto, non un errore del gioco
  errs.push(...D.errs.filter(e => !/WebSocket connection to 'ws:\/\/127\.0\.0\.1:9999/.test(e))); await D.ctx.close();
}
check('nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 400));
summary(); await B.close();
