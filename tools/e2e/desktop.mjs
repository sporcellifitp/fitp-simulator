// desktop: mouse e tastiera, partita completa a 1 game, rivincita, pausa
import { launch, page, check, summary, SP, JSQR } from './th.mjs';
const B = await launch();
const { p, errs } = await page(B, 'http://127.0.0.1:8765/tennis/');
await p.waitForFunction(() => window.__tennis && window.qrcode, null, { timeout: 60000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: SP + '/t1-menu.png' });
check('menu con partita dimostrativa dietro', await p.evaluate(() => __tennis.state === 'menu'));
await p.click('#fmt [data-f="1"]');
await p.click('#playMouse');
await p.waitForFunction(() => __tennis.state === 'play');
check('partita avviata con un clic', await p.evaluate(() => !document.querySelector('#hud').classList.contains('hidden') && /Tu/.test(document.querySelector('#score').textContent)));
// tastiera: D sposta a destra
const x0 = await p.evaluate(() => __tennis.core.players[0].x);
await p.keyboard.down('KeyD'); await p.waitForTimeout(500); await p.keyboard.up('KeyD');
const x1 = await p.evaluate(() => __tennis.core.players[0].x);
check('tastiera: D muove il giocatore', x1 > x0 + .5, `${x0.toFixed(2)} → ${x1.toFixed(2)}`);
// mouse vero: il puntatore sul campo avversario sposta il mirino
await p.mouse.move(700, 300);
const aim = await p.evaluate(() => __tennis.controls.aim);
check('mouse: mirino sul campo avversario', aim && aim.z < 0, JSON.stringify(aim));
await p.screenshot({ path: SP + '/t1-play.png' });
// robot nella pagina: eventi del puntatore sul canvas (il percorso vero del mouse), movimento automatico
await p.evaluate(() => {
  const T = __tennis, cv = document.querySelector('#app canvas'), log = window.__log = { contacts: 0, labels: {}, serves: 0, points: [0, 0] };
  T.controls.phoneAuto = true;
  const ev = (type, x, y, button = 0) => cv.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y, button, bubbles: true }));
  let down = false, wait = false, last = performance.now();
  const tick = now => {
    const dt = (now - last)/1000; last = now;
    const c = T.core; if (!c || T.state !== 'play'){ requestAnimationFrame(tick); return; }
    T.controls.phoneAuto = true;
    const h = c.players[0], b = c.ball;
    const x = 640 + (Math.random() - .5)*300, y = 390 + Math.random()*60;
    if (c.phase === 'serve' && c.serverP === h){
      if (!c.toss && !down){ ev('pointermove', x, y); ev('pointerdown', x, y); down = performance.now(); }
      else if (c.toss && down && performance.now() - down > 560){ ev('pointerup', x, y); down = false; log.serves++; }
    } else if (c.phase === 'live' && c.rally.lastHitter !== h.team && !wait){
      const s = h.z - b.p.z, vin = b.v.z;
      if (s > .45 && vin > 2 && Math.abs(b.p.x - h.x) < 1.4 && c.rally.canHit(0) && !(c.rally.isServe && c.rally.bouncesSinceHit === 0)){
        const eta = (s - .45)/vin;
        if (!down && eta < .45){ ev('pointermove', x, y); ev('pointerdown', x, y); down = performance.now(); }
        if (down && eta < .09 + dt/2){ ev('pointerup', x, y); down = false; wait = true; }
      }
    }
    if (c.rally.lastHitter === h.team || c.phase !== 'live') wait = false;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // eventi dal gioco
  const orig = T.core.update.bind(T.core);
});
// conta i contatti guardando il giudizio del tempo sullo schermo
const t0 = Date.now(); let seen = new Set(), end = false, n = 0;
while (Date.now() - t0 < 420000){
  const st = await p.evaluate(() => ({ s: __tennis.state, tim: document.querySelector('#timing').style.opacity === '1' ? document.querySelector('#timing').textContent : '', sc: document.querySelector('#score').textContent, hits: __tennis.core && __tennis.core.rally.hits }));
  if (st.tim) seen.add(st.tim);
  if (st.s === 'end'){ end = true; break; }
  if (++n % 30 === 0) console.log('  ', Math.round((Date.now() - t0)/1000) + 's', st.sc, [...seen].join(','));
  await p.waitForTimeout(250);
}
await p.screenshot({ path: SP + '/t1-end.png' });
check('la partita arriva alla fine (1 game)', end);
check('giudizio del tempo mostrato sui colpi', seen.size >= 1, [...seen].join(', '));
const endTxt = await p.evaluate(() => ({ t: document.querySelector('#endTitle').textContent, s: document.querySelector('#endScore').textContent, st: document.querySelector('#endStats').textContent }));
check('schermata finale con risultato', /Vittoria|Sconfitta/.test(endTxt.t) && /1–0|0–1/.test(endTxt.s), JSON.stringify(endTxt));
await p.click('#again');
const again = await p.evaluate(() => ({ s: __tennis.state, g: __tennis.core.score.games, p: __tennis.core.score.points }));
check('rivincita senza ricaricare: punteggio azzerato', again.s === 'play' && again.g.join() === '0,0' && again.p.join() === '0,0');
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
check('Esc mette in pausa', await p.evaluate(() => __tennis.state === 'paused' && !document.querySelector('#pause').classList.contains('hidden')));
await p.screenshot({ path: SP + '/t1-pause.png' });
await p.click('#resume');
check('riprendi', await p.evaluate(() => __tennis.state === 'play'));
await p.click('#pauseBtn'); await p.click('#toMenu');
check('torna al menu', await p.evaluate(() => __tennis.state === 'menu'));
check('nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 500));
summary(); await B.close();
