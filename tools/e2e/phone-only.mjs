// Regression test: NATPF Simulator accepts phone swing events only; mouse and keyboard cannot control gameplay.
import { launch, page, check, summary } from './th.mjs';

const B = await launch();
const { p, errs } = await page(B, 'http://127.0.0.1:8765/tennis/?q=low');
await p.waitForFunction(() => window.__racchetta, null, { timeout: 60000 });
check('rebranding NATPF Simulator', /NATPF Simulator/i.test(await p.title()) && /NATPF/.test(await p.textContent('#menu')));
check('nessuna schermata o opzione di scelta controller', await p.locator('#ctrl').count() === 0 && await p.locator('#ctrlMouse').count() === 0 && await p.locator('#pairMouse').count() === 0);

await p.click('#btnCpu');
await p.waitForFunction(() => document.querySelector('#qr').dataset.url, null, { timeout: 30000 });
check('avvio CPU porta al pairing smartphone', await p.evaluate(() => __racchetta.state === 'pair' && __racchetta.A.ctrl === 'phone'));

await p.evaluate(() => { __racchetta.controls.enabled = true; });
await p.keyboard.press('Space');
await p.keyboard.down('KeyD'); await p.waitForTimeout(150); await p.keyboard.up('KeyD');
await p.mouse.click(500, 300);
const rejected = await p.evaluate(() => {
  const input = __racchetta.controls.read();
  return input.swings.length === 0 && input.move.x === 0 && input.move.y === 0;
});
check('mouse e tastiera non generano swing né movimento', rejected);

const accepted = await p.evaluate(() => {
  __racchetta.controls.phoneSwing({ at: performance.now()/1000, power: .6, lift: 0, lob: false, drop: false, slice: false, dir: 1 });
  return __racchetta.controls.read().swings.some(s => s.src === 'phone');
});
check('il controller smartphone resta accettato', accepted);
check('nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 400));
summary(); await B.close();
