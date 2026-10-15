// Regression test: NATPF Simulator accepts phone swing events only; mouse and keyboard cannot control gameplay.
import { launch, page, check, summary } from './th.mjs';

const B = await launch();
const { p, errs } = await page(B, 'http://127.0.0.1:8765/tennis/?q=low');
await p.waitForFunction(() => window.__racchetta, null, { timeout: 60000 });
const perspective = await p.evaluate(() => {
  const S = __racchetta.S;
  S.follow({ team: 0, x: 0, z: 8 }, 0, true);
  const p1 = { cameraZ: S.camera.position.z, targetZ: -10 };
  S.follow({ team: 1, x: 0, z: -8 }, 0, true);
  const p2 = { cameraZ: S.camera.position.z, targetZ: 10 };
  return { p1, p2, cameraUpY: S.camera.up.y };
});
check('prospettiva locale: entrambi i lati guardano verso la rete dal proprio fondo',
  perspective.p1.cameraZ > 0 && perspective.p2.cameraZ < 0 && perspective.p1.targetZ < 0 && perspective.p2.targetZ > 0 && perspective.cameraUpY > .99,
  JSON.stringify(perspective));
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

// Controlla il modello della racchetta: testa sopra la mano e corde a griglia, non un disco pieno.
const racket = await p.evaluate(() => {
  const [c] = __racchetta.S.setPlayers([{ id: 'grip-check', team: 0 }], ['blu']);
  const group = c.racketHead.parent;
  const strings = group.children.find(o => o.isLineSegments);
  const base = { t: 10, dt: 1/60, moving: 0, prep: 0, swing: .43 };
  c.pose({ ...base, side: 'fh', kind: 'drive' });
  const forehand = { x: group.rotation.x, z: group.rotation.z };
  c.pose({ ...base, side: 'bh', kind: 'drive' });
  const backhand = { x: group.rotation.x, z: group.rotation.z };
  c.pose({ ...base, side: 'fh', kind: 'slice' });
  const slice = { x: group.rotation.x, z: group.rotation.z };
  return { headY: c.racketHead.position.y, stringVertices: strings?.geometry.getAttribute('position').count ?? 0, forehand, backhand, slice };
});
check('racchetta impugnata dal manico: testa sopra la mano, corde a griglia e polso articolato',
  racket.headY > .3 && racket.stringVertices >= 40 &&
  Math.abs(racket.forehand.z - racket.backhand.z) > .2 &&
  Math.abs(racket.forehand.x - racket.slice.x) > .1, JSON.stringify(racket));

// La pagina dedicata al telefono deve eseguire davvero il modulo JS: in assenza di QR deve mostrare un errore chiaro,
// non restare bloccata sulla schermata statica iniziale «Collegamento…».
const phonePage = await page(B, 'http://127.0.0.1:8765/tennis/racchetta.html');
await phonePage.p.waitForFunction(() => window.__racchetta, null, { timeout: 30000 });
check('controller telefono avviato: QR mancante segnalato esplicitamente',
  await phonePage.p.locator('#big').textContent() === 'Nessuna partita' &&
  (await phonePage.p.evaluate(() => __racchetta.state.linkState)) === 'denied');
check('controller telefono senza errori JavaScript', !phonePage.errs.length, phonePage.errs.join(' | ').slice(0, 400));
await phonePage.ctx.close();

summary(); await B.close();
