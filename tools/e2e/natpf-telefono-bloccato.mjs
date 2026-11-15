// B51: pagina della racchetta reale in Chromium con tocco e sensori emulati.
// BASE indica il server Vite o la radice dello zip Cloudflare estratto.
// Il Peer finto permette di provare il protocollo e la pagina separatamente dalla negoziazione WebRTC.
import { check, launch, page, SP, summary } from './th.mjs';

const browser = await launch();
try {
  const { p, errs } = await page(browser, 'http://127.0.0.1:8765/natpf/tennis/racchetta.html#s=racchetta-tel-prova123456789&k=provablocco123456', {
    w: 390, h: 844, mobile: true,
    init: () => {
      window.sent = [];
      class Emitter {
        constructor(){ this.handlers = new Map(); }
        on(type, callback){ this.handlers.set(type, callback); }
        emit(type, data){ this.handlers.get(type)?.(data); }
      }
      window.Peer = class extends Emitter {
        constructor(){ super(); setTimeout(() => this.emit('open'), 0); }
        connect(){
          const conn = new Emitter();
          conn.open = true;
          window.fromGame = msg => conn.emit('data', msg);
          conn.send = data => {
            window.sent.push(data);
            if (data.t === 'hello') setTimeout(() => window.fromGame({ t: 'welcome', r: 'ripresa-prova' }), 0);
            if (data.t === 'ping') setTimeout(() => window.fromGame({ t: 'pong', c: data.c }), 0);
          };
          conn.close = () => { conn.open = false; };
          setTimeout(() => conn.emit('open'), 0);
          return conn;
        }
        destroy(){ this.destroyed = true; }
      };
      window.motionTick = setInterval(() => dispatchEvent(new DeviceMotionEvent('devicemotion', {
        accelerationIncludingGravity: { x: 0, y: -9.81, z: 0 },
        rotationRate: { alpha: 0.4, beta: 0, gamma: 0 }, interval: 16,
      })), 16);
      window.orientationRequests = [];
      if (screen.orientation) screen.orientation.lock = mode => { window.orientationRequests.push(mode); return Promise.resolve(); };
    },
  });
  const expect = async (label, predicate, arg) => {
    const ok = await p.waitForFunction(predicate, arg, { timeout: 4500 }).then(() => true, () => false);
    check(label, ok);
  };
  const msg = d => p.evaluate(data => window.fromGame(data), d);
  await p.locator('#enable').tap();
  await expect('orientamento verticale richiesto dal tocco reale sui sensori', () => orientationRequests.includes('portrait'));
  await expect('dimensioni dello schermo nella diagnostica', () => sent.some(m => m.t === 'dev' && m.sc[0] > 0 && m.sc[1] > 0));
  await p.waitForFunction(() => __racchetta.state.sensor === 'cal');
  await msg({ t: 'cmd', c: 'skip' });
  await p.waitForFunction(() => __racchetta.state.sensor === 'ready');
  await msg({ t: 'nx', on: 1, lb: 'Sono pronto', rd: 1, me: 0, id: 1 });
  await p.locator('#next').tap();
  await expect('«Sono pronto» raggiunge il PC prima del conto', () => sent.some(m => m.t === 'nx' && m.y === 1));
  await msg({ t: 'tl', on: 1, slot: 'p2' });
  await expect('blocco durante il conto, riportato al PC', () =>
    __racchetta.state.touchLocked && sent.some(m => m.t === 'st' && m.lk === 1)
    && document.getElementById('phoneTouchSlot').textContent === 'Telefono 2');
  const samplesBefore = await p.evaluate(() => sent.filter(m => m.t === 'fo' || m.t === 'sm').length);
  await msg({ t: 'cfg', mo: 1 });
  await msg({ t: 'ph', ph: 'play', tr: 1 });
  await msg({ t: 'nx', on: 1, lb: 'Salta ›', id: 2 });
  await p.evaluate(() => {
    document.getElementById('next').click();
    document.getElementById('bye').click();
    document.getElementById('stage').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    history.back();
  });
  await expect('il blocco protegge da Salta e Scollega e riassorbe Indietro', () =>
    history.state.natpfTouchLock === 'guard' && __racchetta.state.linkState === 'on'
    && !sent.some(m => m.t === 'cl' || (m.t === 'nx' && m.id === 2)));
  await expect('i sensori continuano a inviare campioni', n => sent.filter(m => m.t === 'fo' || m.t === 'sm').length > n, samplesBefore);
  await msg({ t: 'ph', ph: 'pause', txt: 'Segnale debole' });
  await expect('blocco mantenuto in pausa', () => __racchetta.state.touchLocked);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
    { x: 95, y: 160, id: 1 }, { x: 235, y: 160, id: 2 },
  ] });
  await p.waitForTimeout(3160);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.locator('#phoneStaffUnlock').tap({ timeout: 4000 });
  await expect('due dita e conferma sbloccano il telefono', () => !__racchetta.state.touchLocked && sent.at(-1)?.lk === 0);
  await msg({ t: 'tl', on: 0, slot: 'p2' });
  await msg({ t: 'tl', on: 1, slot: 'p2' });
  await expect('una nuova attività riattiva il blocco', () => __racchetta.state.touchLocked);
  await msg({ t: 'cmd', c: 'unlockTouch' });
  await expect('il comando dal PC sblocca', () => !__racchetta.state.touchLocked);
  await msg({ t: 'tl', on: 0, slot: 'p2' });
  await msg({ t: 'tl', on: 1, slot: 'p2' });
  await p.screenshot({ path: `${SP}/b51-telefono.png` });
  await msg({ t: 'ph', ph: 'over' });
  await msg({ t: 'tl', on: 0, slot: 'p2' });
  await expect('fine partita ripristina i comandi', () => !__racchetta.state.touchLocked && !document.getElementById('stage').inert);
  check('pagina senza errori JavaScript', !errs.length, errs.join(' | '));
} catch (e){ check('prova browser B51', false, String(e.stack || e)); }
finally { await browser.close(); summary(); }
