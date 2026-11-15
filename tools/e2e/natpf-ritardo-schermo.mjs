// NATPF B50-9 · prova del ritardo dello schermo (diagnostica → «Ritardo dello schermo» → «▶ Prova del ritardo (20 s)») nel
// browser, con il gioco vero (vite) e un telefono finto «pronto» che consegna i colpi come farebbe una persona che vede il
// rimbalzo con un ritardo noto dello schermo (colpo = contatto disegnato + ritardo, ±5 ms). Prova:
//   • senza telefono pronto il pulsante è spento e c'è la frase d'aiuto; con il telefono pronto è acceso e la frase sparisce;
//   • ritardo finto 80 ms → misurato 80 ± 20 ms; 160 ms → 160 ± 20 ms; nessun colpo arriva al motore durante la prova;
//   • colpi anche sui rimbalzi nascosti → «Ripeti la misura» (ritmo);
//   • riferimento: monitor 30 ms («Questa era sul monitor»), poi ledwall 130 ms → proposta 100 ± 20 ms; «Salva» scrive
//     natpf.displayLagMs e il ritardo di tutti e due i telefoni del computer;
//   • nessun errore in console; schermate della prova e della scheda.
// Porta GAME_PORT (di base 4390). Schermate in OUT. Scritta nella ripresa del 15/11/2026 (piano B50 §3, B50-9).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-ritardo-schermo.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const GAME = fileURLToPath(new URL('../../natpf-tennis', import.meta.url));
const PORT = +(process.env.GAME_PORT || 4390);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const up = async url => { for (let i = 0; i < 160; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${PORT}/`));

const B = await launch();
try {
  const { p, errs } = await page(B, `http://127.0.0.1:${PORT}/?intro=0`, { w: 1280, h: 720 });
  await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.diag && __natpfTennis.natpfPhone && __natpfTennis.player?.model, null, { timeout: 150000 });
  await p.evaluate(() => {
    const E = __natpfTennis; E.render = () => {}; E.natpfUi.intro?.skip?.();
    try { localStorage.removeItem('natpf.displayLagRef'); localStorage.removeItem('natpf.displayLagTests'); localStorage.setItem('natpf.displayLagMs', '0'); } catch {}
    window.__engineSwings = 0;
    const mc = E.motionController, emit = mc._emitSwing.bind(mc);
    mc._emitSwing = (...a) => { window.__engineSwings++; return emit(...a); };
    E.natpfUi.diag.open();
  });
  // il riquadro «Ritardo dello schermo» si disegna quando la diagnostica ha letto le sessioni salvate (_paintRec)
  const openLag = () => p.evaluate(() => { const d = __natpfTennis.natpfUi.diag.el.querySelector('.diag-lag'); if (d) d.open = true; return !!d; });
  await p.waitForFunction(() => !!__natpfTennis.natpfUi.diag.el?.querySelector('.diag-lag'), null, { timeout: 20000 });
  await openLag();
  await sleep(600);
  const off = await p.evaluate(() => { const d = __natpfTennis.natpfUi.diag.el; return { disabled: d.querySelector('[data-diag="lagtest"]').disabled, help: !d.querySelector('[data-lag-help]').hidden }; });
  check('senza telefono pronto: pulsante spento e frase d\'aiuto visibile', off.disabled && off.help, JSON.stringify(off));

  // telefono finto pronto (il colpo passa da _onSwing, la strada vera della sonda) e un secondo telefono del computer
  await p.evaluate(() => {
    const E = __natpfTennis;
    Object.defineProperty(E.natpfPhone, 'ready', { get: () => true, configurable: true });
    E.natpfPhone.displayLagMs = 0;
    // secondo telefono finto, spento, con quello che il gioco gli chiede a ogni fotogramma (update, link, feedback…)
    if (!E.natpfPhone2) E.natpfPhone2 = { displayLagMs: 0, ready: false, connected: false, link: null, touchLocked: false, hand: 'right',
      update(){}, feedback(){}, setHand(){}, unlockTouch(){} };
  });
  await sleep(600);
  const on = await p.evaluate(() => { const d = __natpfTennis.natpfUi.diag.el; return { disabled: d.querySelector('[data-diag="lagtest"]').disabled, help: !d.querySelector('[data-lag-help]').hidden }; });
  check('con il telefono pronto: pulsante acceso e frase d\'aiuto nascosta', !on.disabled && !on.help, JSON.stringify(on));

  // una prova: clic sul pulsante come lo staff, poi i colpi della «persona» al contatto disegnato + ritardo
  const run = async (lagMs, { catches = false, seed = 7, shot = '' } = {}) => {
    await p.evaluate(s => { const L = __natpfTennis.natpfUi.diag.lagTest; L.__seed = s; const start = L.start.bind(L); L.start = (o = {}) => start({ seed: L.__seed, ...o }); }, seed);
    await openLag();
    await p.waitForFunction(() => { const b = __natpfTennis.natpfUi.diag.el.querySelector('[data-diag="lagtest"]'); return b && !b.disabled; }, null, { timeout: 5000 });
    await p.click('[data-diag="lagtest"]');
    await p.waitForFunction(() => !!__natpfTennis.natpfUi.diag.lagTest.layer, null, { timeout: 5000 });
    await p.evaluate(({ lagMs, catches }) => {
      const L = __natpfTennis.natpfUi.diag.lagTest, phone = __natpfTennis.natpfPhone;
      L.plan.cycles.forEach((c, i) => {
        if (c.kind === 'catch' && !catches) return;
        const at = L.t0 + c.touch * 1000 + lagMs + 5 * Math.sin(i * 1.7);
        setTimeout(() => phone._onSwing({ at: at / 1000 }), Math.max(0, at - performance.now() + 30));
      });
    }, { lagMs, catches });
    if (shot){ await sleep(6000); await p.screenshot({ path: `${SP}/${shot}-prova.png` }); }
    await p.waitForFunction(() => !!__natpfTennis.natpfUi.diag.lagTest.result, null, { timeout: 40000 });
    await sleep(200);
    if (shot) await p.screenshot({ path: `${SP}/${shot}-scheda.png` });
    return p.evaluate(() => { const L = __natpfTennis.natpfUi.diag.lagTest; return { ...L.result, proposed: L.proposed, card: L.layer?.innerText || '' }; });
  };

  const a = await run(80, { shot: 'b50-ritardo-80' });
  check('ritardo finto 80 ms → 80 ± 20 ms', a.ok && Math.abs(a.lagMs - 80) <= 20, `${a.lagMs} ms, ${a.hits} colpi`);
  check('la scheda dice il ritardo misurato e «Salva»', /Ritardo misurato: \d+ ms/.test(a.card) && /Salva \d+ ms/.test(a.card), a.card.slice(0, 160));
  await p.click('[data-lag-action="close"]');

  const b = await run(160, { seed: 21 });
  check('ritardo finto 160 ms → 160 ± 20 ms', b.ok && Math.abs(b.lagMs - 160) <= 20, `${b.lagMs} ms, ${b.hits} colpi`);
  await p.click('[data-lag-action="close"]');
  check('nessun colpo della prova arriva al motore', await p.evaluate(() => window.__engineSwings === 0), String(await p.evaluate(() => window.__engineSwings)));

  const c = await run(100, { catches: true, seed: 33 });
  check('colpi anche sui rimbalzi nascosti → «Ripeti la misura» (ritmo)', !c.ok && c.why === 'ritmo' && /Ripeti la misura/.test(c.card), `${c.why}`);
  await p.click('[data-lag-action="close"]');

  // riferimento sul monitor (30 ms), poi ledwall (130 ms): proposta ledwall − riferimento
  const m = await run(30, { seed: 45 });
  check('monitor: misura valida', m.ok, `${m.lagMs} ms`);
  await p.click('[data-lag-action="reference"]');
  const ref = await p.evaluate(() => JSON.parse(localStorage.getItem('natpf.displayLagRef') || 'null'));
  check('«Questa era sul monitor» salva il riferimento', ref && Math.abs(ref.ms - 30) <= 20, JSON.stringify(ref));
  const w = await run(130, { seed: 57, shot: 'b50-ritardo-ledwall' });
  check('ledwall con riferimento → proposta 100 ± 20 ms', w.ok && Math.abs(w.proposed - 100) <= 20 && /Riferimento del monitor/.test(w.card), `misurato ${w.lagMs}, proposto ${w.proposed}`);
  await p.click('[data-lag-action="save"]');
  await sleep(300);
  const saved = await p.evaluate(() => ({ ls: +localStorage.getItem('natpf.displayLagMs'), p1: __natpfTennis.natpfPhone.displayLagMs, p2: __natpfTennis.natpfPhone2.displayLagMs, layer: !!__natpfTennis.natpfUi.diag.lagTest.layer }));
  check('«Salva» scrive il valore per tutti e due i telefoni e chiude la prova', saved.ls === w.proposed && saved.p1 === w.proposed && saved.p2 === w.proposed && !saved.layer, JSON.stringify(saved));
  check('nessun errore nella pagina', !errs.length, errs.slice(0, 3).join(' | '));
} catch (e){ check('prova del ritardo dello schermo', false, String(e.stack || e)); }
finally { await B.close(); stop(); }
summary();
process.exit(process.exitCode || 0);
