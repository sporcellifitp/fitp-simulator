// B54 (16/11/2026): nome del giocatore sulla pagina vera del telefono, prima di «Sono pronto». Chromium con tocco, tastiera
// e sensori emulati; il gioco è finto (Peer finto, come natpf-telefono-bloccato.mjs): qui si prova la pagina, il gioco vero
// con i telefoni veri è in natpf-fiera-telefoni.mjs.
//   mkdir -p /tmp/radice && ln -sfn "$PWD/site" /tmp/radice/natpf
//   CHROMIUM_PATH=/opt/pw-browsers/chromium NATPF_SITE_ROOT=/tmp/radice node tools/e2e/run-local.mjs natpf-nome-telefono.mjs
import { check, launch, SP, summary } from './th.mjs';
import { mkdirSync } from 'node:fs';

const browser = await launch();
try {
  mkdirSync(SP, { recursive: true });
  // telefono vero a misura (Pixel 8), anche più basso (tastiera aperta: 390 × 480 resta)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
  await ctx.addInitScript(() => {
    window.sent = [];
    class Emitter { constructor(){ this.h = new Map(); } on(t, f){ this.h.set(t, f); } emit(t, d){ this.h.get(t)?.(d); } }
    window.Peer = class extends Emitter {
      constructor(){ super(); setTimeout(() => this.emit('open'), 0); }
      connect(){
        const conn = new Emitter(); conn.open = true;
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
      destroy(){}
    };
    // (telefono tenuto dritto, come per leggere: ogni tocco sulla pagina vota il verso dei sensori, motion-sign.js; con la
    // gravità al contrario dopo qualche tocco la pagina rifarebbe la calibrazione)
    // (solo dove la pagina ha i sensori: lo script gira anche nella pagina vuota prima di quella vera)
    if (typeof DeviceMotionEvent !== 'undefined') setInterval(() => dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: 0, y: 9.81, z: 0 }, rotationRate: { alpha: .4, beta: 0, gamma: 0 }, interval: 16 })), 16);
    if (screen.orientation) screen.orientation.lock = () => Promise.resolve();
  });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/natpf/tennis/racchetta.html#s=racchetta-tel-prova123456789&k=provanome1234567');
  const wait = async (label, fn, arg) => check(label, await p.waitForFunction(fn, arg, { timeout: 5000 }).then(() => true, () => false));
  const msg = d => p.evaluate(x => window.fromGame(x), d);
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.closest('.hidden') && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }, sel);
  const nm = () => p.evaluate(() => sent.filter(m => m.t === 'nm' && m.y === 1));

  await p.locator('#enable').tap();
  await p.waitForFunction(() => __racchetta.state.sensor === 'cal');
  await msg({ t: 'cmd', c: 'skip' });
  await p.waitForFunction(() => __racchetta.state.sensor === 'ready');
  await wait('la pagina dice al computer che sa chiedere il nome (dev nm 1)', () => sent.some(m => m.t === 'dev' && m.nm === 1));

  // pagina «Pronto per la partita»: il computer chiede il nome (giocatore nuovo: campo vuoto)
  await msg({ t: 'nm', on: 1, v: '', id: 5 });
  await wait('«Come ti chiami?» al posto di «Sono pronto»', () => !document.getElementById('nameBox').classList.contains('hidden') && document.body.classList.contains('naming'));
  check('niente «Sono pronto», niente anello, campo vuoto', !(await vis('#next')) && !(await vis('#ring')) && (await p.inputValue('#nameInput')) === '');
  const g = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); return { box: r('nameBox'), skip: r('nameSkip'), input: r('nameInput'), ok: r('nameOk'), vw: innerWidth, vh: innerHeight }; });
  check('«Salta» in alto a destra del riquadro, sopra il campo', g.skip.right > g.box.right - 30 && g.skip.top < g.box.top + 30 && g.skip.bottom <= g.input.top, JSON.stringify(g.skip));
  check('campo e «Conferma» nella metà alta dello schermo (sopra la tastiera) e dentro lo schermo', g.ok.bottom < g.vh*.6 && g.box.left >= 0 && g.box.right <= g.vw, `Conferma fino a ${Math.round(g.ok.bottom)} px su ${g.vh}`);
  check('pulsanti grandi da toccare', g.skip.height >= 44 && g.ok.height >= 56 && g.input.height >= 52);
  await p.screenshot({ path: `${SP}/b54-nome-telefono.png` });

  // nome volgare: rifiutato subito sul telefono, niente al computer
  await p.locator('#nameInput').tap(); await p.keyboard.type('merda');
  await p.locator('#nameOk').tap();
  await wait('nome volgare: «Scegli un altro nome» subito, sul telefono', () => document.getElementById('nameWarn').textContent === 'Scegli un altro nome');
  check('… e niente al computer', (await nm()).length === 0);
  // campo vuoto
  await p.fill('#nameInput', ''); await p.locator('#nameOk').tap();
  await wait('campo vuoto: «Scrivi il tuo nome, oppure tocca «Salta»»', () => /Salta/.test(document.getElementById('nameWarn').textContent));
  // nome vero con il tasto «Fatto» della tastiera
  await p.fill('#nameInput', ''); await p.locator('#nameInput').tap(); await p.keyboard.type('  Marco ');
  await wait('scrivendo, l\'avviso sparisce', () => document.getElementById('nameWarn').textContent === '');
  await p.keyboard.press('Enter');
  await wait('il nome va al computer con il numero della richiesta', () => sent.some(m => m.t === 'nm' && m.y === 1 && m.v === 'Marco' && m.id === 5));
  check('dopo l\'invio: pulsanti spenti e tastiera chiusa (campo non più attivo)', await p.evaluate(() => document.getElementById('nameOk').disabled && document.getElementById('nameSkip').disabled && document.activeElement?.id !== 'nameInput'));
  // il computer lo rifiuta (parola che il telefono di prima non conosceva): richiesta nuova con il perché
  await msg({ t: 'nm', on: 1, v: 'Marco', er: 'Scegli un altro nome', id: 6 });
  await wait('rifiuto dal computer: il perché e i pulsanti di nuovo accesi', () => document.getElementById('nameWarn').textContent === 'Scegli un altro nome' && !document.getElementById('nameOk').disabled);
  // «Salta»
  await p.locator('#nameSkip').tap();
  await wait('«Salta» va al computer', () => sent.some(m => m.t === 'nm' && m.y === 1 && m.skip === 1 && m.id === 6));
  // il computer toglie la richiesta e offre «Sono pronto»
  await msg({ t: 'nm', on: 0 });
  await msg({ t: 'nx', on: 1, lb: 'Sono pronto', rd: 1, me: 0, id: 9 });
  await wait('poi «Sono pronto», grande', () => document.getElementById('nameBox').classList.contains('hidden') && !document.body.classList.contains('naming') && document.getElementById('next').textContent === 'Sono pronto' && document.getElementById('next').classList.contains('big'));
  await p.screenshot({ path: `${SP}/b54-sono-pronto-dopo.png` });

  // rivincita: il computer propone il nome di prima; il blocco dei tocchi non copre il campo
  await msg({ t: 'nx', on: 0 });
  await msg({ t: 'nm', on: 1, v: 'Giulia', id: 10 });
  await msg({ t: 'tl', on: 1, slot: 'p1' });
  await wait('rivincita: nel campo il nome di prima', () => document.getElementById('nameInput').value === 'Giulia');
  check('con la richiesta del nome il telefono non si blocca', await p.evaluate(() => !__racchetta.state.touchLocked && document.getElementById('phoneTouchLock').classList.contains('hidden')));
  await p.locator('#nameOk').tap();
  await wait('«Conferma» con il nome proposto', () => sent.some(m => m.t === 'nm' && m.y === 1 && m.v === 'Giulia' && m.id === 10));
  // schermo basso (tastiera aperta): il campo resta in vista
  await p.setViewportSize({ width: 390, height: 470 });
  await msg({ t: 'nm', on: 1, v: '', id: 11 });
  await p.waitForTimeout(200);
  const low = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); return { input: r('nameInput'), ok: r('nameOk'), skip: r('nameSkip'), vh: innerHeight }; });
  check('con la tastiera aperta (schermo alto 470 px) campo, «Conferma» e «Salta» in vista', low.input.bottom <= low.vh && low.ok.bottom <= low.vh && low.skip.top >= 0, JSON.stringify({ ok: Math.round(low.ok.bottom), vh: low.vh }));
  await p.screenshot({ path: `${SP}/b54-nome-tastiera.png` });
  check('nessun errore nella pagina', errs.length === 0, errs.join(' | '));
} finally {
  await browser.close();
  summary();
}
