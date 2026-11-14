// NATPF B39 · Stand con il solo mouse (docs/b39/stand-solo-mouse.md): il percorso dello stand fatto SOLO con il mouse
// (page.mouse: move, down, up, click; mai la tastiera), come il controllo «solo mouse» del 13/11
// (docs/b39/controllo-solo-mouse/prova-vera-solo-mouse.md, R4). Ogni punto «BLOCCATO» di quel controllo che tocca al B39
// qui deve risultare OK:
//   • intro con due clic, poi il menu;
//   • pannello dello stand dalla pagina principale del menu (titolo grande tenuto 3 s, con l'anello che si riempie e la
//     mano che trema un poco) e da un'altra pagina (marchio piccolo);
//   • «Diagnostica» dal pannello e ritorno al pannello; «Azzera oggi» con il secondo clic, nessuna finestra di Windows;
//   • classifica a schermo intero e uscita con «× Chiudi» (compare muovendo il mouse);
//   • partita con la racchetta mouse della modalità prova: ❚❚ breve = pausa, ❚❚ tenuto 3 s = pannello dello stand con la
//     partita ferma e senza la pausa; riquadro «Telefono in pausa» sotto la pausa (non copre «Riprendi ›»).
//   (Il nome dei minigiochi, i due nomi dello stesso schermo e il codice della sfida sono del B38: tastiera a schermo e
//   «Gioca come Ospite»; uscire e ricaricare il programma si provano nel programma: natpf-desktop/scripts/prova-linux.mjs,
//   scenario solo-mouse.)
// Schermate in OUT (o nella cartella temporanea): b39-*.png.
// Porte: GAME_PORT (4150) per il gioco, PEER_PORT (4151) per PeerJS.
//   CHROMIUM_PATH=/opt/pw-browsers/chromium OUT=/tmp/solo-mouse node tools/e2e/natpf-solo-mouse.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const GAME = process.env.GAME_DIR ? path.resolve(process.env.GAME_DIR) : path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 4150), PEER_PORT = +(process.env.PEER_PORT || 4151);
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`), GAME);

const B = await launch();
try {
  const ctx = await B.newContext({ viewport: { width: 1280, height: 720 } }), g = await ctx.newPage(), errs = [], dialogs = [];
  g.on('pageerror', e => errs.push(e.message));
  g.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource|peer|PeerJS|WebSocket|ERR_|video/i.test(m.text())) errs.push('console: ' + m.text()); });
  // finestre di Windows (confirm, alert): allo stand non devono comparire
  g.on('dialog', d => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
  await g.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  // racchetta mouse della modalità prova (per giocare una partita senza telefono), niente scambi di prova, batte la CPU
  await g.addInitScript(() => { try { if (!sessionStorage.getItem('b39-init')){ sessionStorage.setItem('b39-init', '1'); localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.setItem('natpf-tennis.calibrazione', 'none'); localStorage.setItem('natpf-tennis.serve', 'opponent'); } } catch {} });
  await g.goto(`http://127.0.0.1:${GAME_PORT}/?peer=127.0.0.1:${PEER_PORT}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 180000 });
  // grafica in software lenta: si disegna solo per le schermate (come natpf-pannello-partita)
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
  const snap = async name => { await g.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await g.screenshot({ path: `${SP}/${name}` }); console.log(`     schermata: ${SP}/${name}`); };
  const st = () => g.evaluate(() => { const E = __natpfTennis, ui = E.natpfUi; return { t: +E.elapsedTime.toFixed(3), phase: E.phase, paused: !!E.natpfPaused, staff: ui.kiosk.isOpen, diag: !!ui.diag.isOpen, pause: ui.pause.isOpen,
    lobby: ui.lobby.visible, step: ui.lobby.step, inGame: ui.pause.inGame, full: document.documentElement.classList.contains('ranking-full'), intro: !!ui.intro?.active }; });
  // dove sta un elemento e cosa c'è davvero sopra il suo centro (elementFromPoint): il mouse clicca quello
  const where = sel => g.evaluate(sel => {
    const el = document.querySelector(sel); if (!el) return { found: false };
    const b = el.getBoundingClientRect(), x = b.left + b.width/2, y = b.top + b.height/2, top = document.elementFromPoint(x, y);
    return { found: b.width > 0 && b.height > 0, x, y, w: b.width, h: b.height, onTop: !!top && (top === el || el.contains(top)), top: top ? `${top.tagName.toLowerCase()}${top.id ? '#' + top.id : ''}.${[...top.classList].join('.')}` : 'niente', inView: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth };
  }, sel);
  const clickAt = async (sel, { wait = 650 } = {}) => {
    const r = await where(sel);
    if (r.found){ await g.mouse.move(r.x, r.y, { steps: 4 }); await g.mouse.click(r.x, r.y); }
    await g.waitForTimeout(wait);
    return r;
  };
  // tasto sinistro tenuto ms millisecondi su un elemento; tremito: piccolo spostamento a metà (la pressione deve tenere)
  const hold = async (sel, ms, { jitter = 0, shotAt = 0, shot = '' } = {}) => {
    const r = await where(sel); if (!r.found) return { r, ring: null };
    await g.mouse.move(r.x, r.y, { steps: 4 }); await g.mouse.down();
    let ring = null, t = 0;
    // (schermata senza ridisegnare il campo: con la grafica in software un disegno dura più della pressione)
    if (shotAt){ await g.waitForTimeout(shotAt); t = shotAt; ring = await g.evaluate(() => { const e = document.querySelector('.natpf-hold'); return e && !e.classList.contains('hidden') ? { p: +parseFloat(e.style.getPropertyValue('--hold')).toFixed(2), label: e.querySelector('b')?.textContent } : null; }); if (shot){ const t1 = Date.now(); await g.screenshot({ path: `${SP}/${shot}` }); t += Date.now() - t1; console.log(`     schermata: ${SP}/${shot}`); } }
    if (jitter){ await g.mouse.move(r.x + jitter, r.y + jitter/2, { steps: 3 }); }
    await g.waitForTimeout(Math.max(0, ms - t));
    await g.mouse.up();
    await g.waitForTimeout(400);
    return { r, ring };
  };
  const text = sel => g.evaluate(sel => document.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() || '', sel);
  const toast = () => g.evaluate(() => { const t = document.getElementById('natpf-toast'); return t && !t.classList.contains('hidden') ? t.textContent : ''; });

  /* ---------- 1. intro: due clic ---------- */
  await g.waitForTimeout(1500);
  await g.mouse.click(640, 420); await g.waitForTimeout(1300);
  await g.mouse.click(640, 520); await g.waitForTimeout(1500);
  let s = await st();
  check('intro con due clic: si è nel menu principale', !s.intro && s.lobby && s.step === 'menu', JSON.stringify(s));

  /* ---------- 2. pannello dalla pagina principale (B39.3, prima BLOCCATO) ---------- */
  const h1 = await hold('#title-modal [data-page="menu"] .menu-brand b', 3300, { jitter: 9, shotAt: 1200, shot: 'b39-marchio-anello-1280x720.png' });
  s = await st();
  check('pagina principale: titolo grande tenuto 3 s → pannello dello stand (anello a metà mentre si tiene, la mano che trema non annulla)', s.staff && h1.ring && h1.ring.p > 0.25 && h1.ring.p < 0.7 && /Pannello dello stand/.test(h1.ring.label || ''), JSON.stringify({ ring: h1.ring, staff: s.staff }));
  await g.waitForTimeout(400);
  await snap('b39-pannello-1280x720.png');
  const diagBtn = await where('#natpf-staff [data-staff="diag"]'), closeBtn = await where('#natpf-staff [data-staff="close"]');
  check('pannello: «Diagnostica» in alto a destra e «Chiudi» in vista, cliccabili', diagBtn.found && diagBtn.onTop && diagBtn.inView && closeBtn.onTop && closeBtn.inView, JSON.stringify({ diagBtn, closeBtn }));

  /* ---------- 3. diagnostica dal pannello (prima BLOCCATO dal menu) ---------- */
  await clickAt('#natpf-staff [data-staff="diag"]');
  s = await st();
  check('«Diagnostica» dal pannello: diagnostica aperta, pannello chiuso', s.diag && !s.staff, JSON.stringify(s));
  await clickAt('.natpf-diag [data-diag="close"]');
  s = await st();
  check('× della diagnostica: di nuovo il pannello dello stand', !s.diag && s.staff, JSON.stringify(s));

  /* ---------- 4. «Azzera oggi»: secondo clic, niente finestra di Windows ---------- */
  await clickAt('#natpf-staff [data-staff="reset"]', { wait: 200 });
  const armed = await text('#natpf-staff [data-staff="reset"] b');
  await g.waitForTimeout(600);
  await clickAt('#natpf-staff [data-staff="reset"]', { wait: 300 });
  const t4 = await toast();
  check('«Azzera oggi»: il primo clic chiede «Sicuro? Clicca ancora», il secondo azzera; nessuna finestra di Windows', armed === 'Sicuro? Clicca ancora' && /azzerata/.test(t4) && !dialogs.length, JSON.stringify({ armed, toast: t4, dialogs }));

  /* ---------- 5. classifica a schermo intero e uscita (prima BLOCCATO) ---------- */
  await clickAt('#natpf-staff [data-staff="ranking"]');
  s = await st();
  check('«Classifica · A schermo intero»: classifica in grande', s.full && s.step === 'ranking' && !s.staff, JSON.stringify(s));
  await g.mouse.move(700, 400, { steps: 5 }); await g.mouse.move(760, 430, { steps: 5 }); await g.waitForTimeout(450);
  const exitBtn = await where('#title-modal .ranking-exit');
  const exitOpacity = await g.evaluate(() => getComputedStyle(document.querySelector('#title-modal .ranking-exit')).opacity);
  await snap('b39-classifica-chiudi-1280x720.png');
  const emptyRow = await g.evaluate(() => { const li = document.querySelector('#title-modal .ranking-list li.empty'); return li ? Math.round(li.getBoundingClientRect().height) : null; });
  check('muovendo il mouse compare «× Chiudi» in alto a destra; la riga «Ancora nessuna partita oggi» su una riga', exitBtn.found && exitBtn.onTop && exitBtn.inView && +exitOpacity > 0.9 && (emptyRow === null || emptyRow < 80), JSON.stringify({ exitBtn, exitOpacity, emptyRow }));
  await clickAt('#title-modal .ranking-exit');
  s = await st();
  check('«× Chiudi»: di nuovo il menu principale', !s.full && s.step === 'menu', JSON.stringify(s));

  /* ---------- 6. marchio piccolo di un'altra pagina (Opzioni) ---------- */
  await clickAt('[data-page="menu"] [data-menu="options"]');
  const h6 = await hold('#title-modal .lobby-brand', 3300);
  s = await st();
  check('Opzioni: marchio piccolo tenuto 3 s → pannello dello stand', s.step === 'options' && s.staff, JSON.stringify(s));
  await clickAt('#natpf-staff [data-staff="close"]');
  await clickAt('#lobby-back');

  /* ---------- 7. partita con la racchetta mouse: ❚❚ breve = pausa, ❚❚ tenuto 3 s = pannello ---------- */
  await clickAt('[data-page="menu"] [data-menu="play"]', { wait: 900 });
  await clickAt('[data-page="mode"] [data-mode="cpu"]', { wait: 1100 });
  await clickAt('[data-page="controller"] [data-natpf-controller="mouse"]', { wait: 1100 });
  s = await st();
  if (s.step === 'connect') await clickAt('#lobby-next', { wait: 1100 });
  s = await st();
  check('Gioca → Contro la CPU → Mouse e tastiera → «Pronto per la partita», un clic alla volta', s.step === 'match', JSON.stringify(s));
  await clickAt('#btn-start-match', { wait: 300 });
  await g.waitForFunction(() => !__natpfTennis.natpfUi.lobby.visible && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(__natpfTennis.phase), null, { timeout: 20000 }).catch(() => {});
  await g.waitForTimeout(1500);
  s = await st();
  check('«Gioca ›»: la partita parte', s.inGame && !s.lobby, JSON.stringify(s));
  await clickAt('#natpf-pause-btn', { wait: 500 });
  s = await st();
  check('❚❚ con un clic breve: la pausa (come prima)', s.pause && !s.staff, JSON.stringify(s));
  await clickAt('#natpf-pause [data-pause="resume"]', { wait: 600 });
  const t0 = (await st()).t;
  const h7 = await hold('#natpf-pause-btn', 3300, { shotAt: 1200, shot: 'b39-pausa-tenuta-1280x720.png' });
  s = await st();
  check('❚❚ tenuto 3 s in partita: pannello dello stand, partita ferma, niente pausa sotto (prima BLOCCATO)', s.staff && !s.pause && s.paused && h7.ring?.p > 0.25, JSON.stringify({ s, ring: h7.ring }));
  await g.waitForTimeout(1500);
  const t1 = (await st()).t;
  check('… e con il pannello aperto il tempo del gioco non va avanti', Math.abs(t1 - s.t) < 0.05, JSON.stringify({ prima: s.t, dopo: t1, inizio: t0 }));
  await snap('b39-pannello-in-partita-1280x720.png');
  await clickAt('#natpf-staff [data-staff="close"]', { wait: 1200 });
  s = await st();
  check('«Chiudi»: la partita riparte', !s.staff && !s.paused && !s.pause, JSON.stringify(s));

  /* ---------- 8. riquadro «Telefono in pausa» sotto la pausa (B39.3, n. 13) ---------- */
  await g.evaluate(() => __natpfTennis.natpfUi._paintHold('Telefono in pausa', 'Riaccendi lo schermo del telefono: si riparte da soli.', { label: 'Ricollega il telefono', run(){} }));
  await clickAt('#natpf-pause-btn', { wait: 500 });
  const resume = await where('#natpf-pause [data-pause="resume"]'), menuBtn = await where('#natpf-pause [data-pause="menu"]');
  const zHold = await g.evaluate(() => getComputedStyle(document.getElementById('natpf-phone-hold')).zIndex);
  await snap('b39-pausa-con-riquadro-telefono-1280x720.png');
  check('pausa aperta con il riquadro del telefono: il riquadro sta sotto, «Riprendi ›» e «Torna al menu» si cliccano', resume.onTop && menuBtn.onTop && +zHold < 60, JSON.stringify({ resume: resume.top, menu: menuBtn.top, zHold }));
  await clickAt('#natpf-pause [data-pause="resume"]', { wait: 400 });
  await g.evaluate(() => __natpfTennis.natpfUi._paintHold(null));

  check('nessuna finestra di Windows (confirm, alert) in tutto il percorso', !dialogs.length, dialogs.join(' | '));
  check('nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 400));
  await ctx.close();
} finally {
  await B.close();
}
summary();
setTimeout(() => process.exit(), 300);
