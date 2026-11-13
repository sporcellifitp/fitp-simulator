// NATPF B43 punto 2 (controllo «solo mouse» del B39: A1, A2, A3, A5, voci n. 14 e 15): pannello dello stand, telecomando
// dello staff e diagnostica aperti durante una partita vera contro la CPU (batte la CPU: prima faceva punti dietro il
// pannello), nel gioco vero con il motore che gira, con il mouse come lo usa il titolare dello stand:
//   • pannello aperto (Ctrl+Maiusc+K: la stessa funzione di F9 nel programma Windows): partita ferma, nessun punto, il
//     tempo del gioco non va avanti; «Chiudi» con un clic → si riprende;
//   • pannello aperto sopra la pausa: «Chiudi», «Nuovo giocatore» e le voci si cliccano (prima la pausa ci stava sopra,
//     invisibile); chiuso il pannello resta la pausa, partita ancora ferma;
//   • «Torna al menu» della pausa: il primo clic arma il pulsante («Sicuro? Clicca ancora»), un doppio clic non basta,
//     il secondo clic porta al menu;
//   • «Diagnostica» dalla pausa: la partita resta ferma (prima ripartiva dietro la diagnostica, 3,9 s in 4 s), × riporta
//     alla pausa; Maiusc+D con la pausa aperta fa lo stesso;
//   • «Telecomando dello staff» dal pannello in partita: partita ferma anche lì, Esc torna al pannello;
//   • voci distruttive del pannello in partita («Nuovo giocatore», «Classifica a schermo intero»): due clic, il doppio
//     clic non basta; il foglio sta in una schermata con il pulsante armato anche a 1024×600 e 720×720;
//   • schermate: pannello sopra la partita ferma (1280×720 e 1920×1080), pulsanti armati, diagnostica dalla pausa.
// Porte: GAME_PORT (4131) per il gioco, PEER_PORT (4132) per PeerJS (il foglio del telecomando apre l'abbinamento).
//   CHROMIUM_PATH=/opt/pw-browsers/chromium OUT=/tmp/pannello node tools/e2e/natpf-pannello-partita.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const GAME = process.env.GAME_DIR ? path.resolve(process.env.GAME_DIR) : path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 4131), PEER_PORT = +(process.env.PEER_PORT || 4132);
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
  const ctx = await B.newContext({ viewport: { width: 1280, height: 720 } }), g = await ctx.newPage(), errs = [];
  g.on('pageerror', e => errs.push(e.message));
  g.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource|peer|PeerJS|WebSocket|ERR_/i.test(m.text())) errs.push('console: ' + m.text()); });
  await g.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  // racchetta mouse (modalità prova), niente scambi di prova, batte la CPU (senza pausa farebbe punti da sola)
  await g.addInitScript(() => { try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.setItem('natpf-tennis.calibrazione', 'none'); localStorage.setItem('natpf-tennis.serve', 'opponent'); } catch {} });
  await g.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby?.visible && window.__natpfTennis.player?.model, null, { timeout: 180000 });
  await g.waitForTimeout(800);

  const st = () => g.evaluate(() => { const E = __natpfTennis, ui = E.natpfUi; return { t: +E.elapsedTime.toFixed(3), phase: E.phase, paused: !!E.natpfPaused, score: `${E.score.playerPoints}-${E.score.opponentPoints} ${E.score.playerGames}-${E.score.opponentGames}`,
    staff: ui.kiosk.isOpen, remote: ui.remote.isOpen, diag: !!ui.diag.isOpen, pause: ui.pause.isOpen, lobby: ui.lobby.visible, step: ui.lobby.step, inGame: ui.pause.inGame,
    nick: !document.getElementById('natpf-nick')?.classList.contains('hidden') }; });
  // clic del mouse vero al centro di un elemento: prima si guarda cosa c'è davvero in quel punto (elementFromPoint)
  const clickAt = async (sel, { dbl = false } = {}) => {
    const r = await g.evaluate(sel => {
      const el = document.querySelector(sel); if (!el) return { found: false };
      const b = el.getBoundingClientRect(), x = b.left + b.width/2, y = b.top + b.height/2, top = document.elementFromPoint(x, y);
      const name = n => (n ? `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${n.dataset?.staff ? `[staff=${n.dataset.staff}]` : n.dataset?.pause ? `[pause=${n.dataset.pause}]` : ''}` : 'niente');
      return { found: true, x, y, onTop: !!top && (top === el || el.contains(top)), top: name(top), inView: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth };
    }, sel);
    if (r.found){ if (dbl) await g.mouse.dblclick(r.x, r.y); else await g.mouse.click(r.x, r.y); }
    return r;
  };
  const text = sel => g.evaluate(sel => document.querySelector(sel)?.textContent.trim() || '', sel);
  const startMatch = async () => {
    await g.evaluate(() => { const ui = __natpfTennis.natpfUi; if (!ui.lobby.visible) ui.backToMenu(); ui.lobby.setMode('cpu'); ui.lobby.go('match'); });
    await g.waitForSelector('#btn-start-match', { state: 'visible', timeout: 10000 });
    const c = await clickAt('#btn-start-match');
    await g.waitForFunction(() => !__natpfTennis.natpfUi.lobby.visible && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(__natpfTennis.phase), null, { timeout: 20000 });
    await g.waitForTimeout(1200);
    return c;
  };
  const staffKey = () => g.keyboard.press('Control+Shift+KeyK');

  /* ---------- 1. pannello in partita: partita ferma ---------- */
  const go = await startMatch();
  const s0 = await st(); await g.waitForTimeout(1500); const s1 = await st();
  check('partita contro la CPU partita con un clic su «Gioca», motore che gira', go.onTop && s0.inGame && !s0.paused && s1.t > s0.t + 0.5, JSON.stringify({ s0, s1 }));
  await staffKey(); await g.waitForTimeout(300);
  const a = await st(); await g.waitForTimeout(8000); const b = await st();
  check('A1: pannello aperto in partita → partita ferma: in 8 s nessun tempo di gioco e nessun punto della CPU', a.staff && a.paused && b.paused && b.staff && Math.abs(b.t - a.t) < 0.02 && a.score === b.score, JSON.stringify({ a, b }));
  await g.screenshot({ path: `${SP}/b43-pannello-partita-1280x720.png` });
  const close1 = await clickAt('#natpf-staff [data-staff="close"]'); await g.waitForTimeout(1200);
  const c = await st();
  check('«Chiudi» con un clic: pannello chiuso, la partita riprende', close1.onTop && !c.staff && !c.paused && c.t > b.t + 0.5, JSON.stringify({ close1, c }));

  /* ---------- 2. pannello sopra la pausa ---------- */
  const pz = await clickAt('#natpf-pause-btn'); await g.waitForTimeout(300);
  await staffKey(); await g.waitForTimeout(300);
  const tops = await g.evaluate(() => ['close', 'newplayer', 'aim', 'kiosk'].map(k => { const el = document.querySelector(`#natpf-staff [data-staff="${k}"]`), r = el.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return { k, top: !!t && (t === el || el.contains(t)) }; }));
  check('A2: pannello aperto con la pausa aperta: il pannello sta sopra («Chiudi», «Nuovo giocatore», «Mira», «Modalità chiosco» cliccabili)', pz.onTop && tops.every(x => x.top), JSON.stringify({ pz, tops }));
  await g.screenshot({ path: `${SP}/b43-pannello-sopra-pausa-1280x720.png` });
  const t2 = (await st()).t; await g.waitForTimeout(2000);
  await clickAt('#natpf-staff [data-staff="close"]'); await g.waitForTimeout(500);
  const d = await st();
  check('chiuso il pannello resta la pausa: partita ancora ferma', !d.staff && d.pause && d.paused && Math.abs(d.t - t2) < 0.02, JSON.stringify(d));

  /* ---------- 3. «Torna al menu» con due clic ---------- */
  const m1 = await clickAt('#natpf-pause [data-pause="menu"]'); await g.waitForTimeout(300);
  const e1 = await st(), armed = await text('#natpf-pause [data-pause="menu"]');
  await g.screenshot({ path: `${SP}/b43-pausa-torna-al-menu-armato-1280x720.png` });
  check('n. 15: «Torna al menu», primo clic: si resta in pausa e il pulsante dice «Sicuro? Clicca ancora»', m1.onTop && e1.pause && e1.inGame && !e1.lobby && armed === 'Sicuro? Clicca ancora', JSON.stringify({ e1, armed }));
  // «Riprendi ›» disarma; di nuovo in pausa, un doppio clic su «Torna al menu» non basta
  await clickAt('#natpf-pause [data-pause="resume"]'); await g.waitForTimeout(400);
  const f1 = await st(), back = await text('#natpf-pause [data-pause="menu"]');
  await clickAt('#natpf-pause-btn'); await g.waitForTimeout(300);
  await clickAt('#natpf-pause [data-pause="menu"]', { dbl: true }); await g.waitForTimeout(400);
  const f2 = await st();
  check('«Riprendi ›» riprende e disarma; un doppio clic su «Torna al menu» non chiude la partita', !f1.pause && !f1.paused && back === 'Torna al menu' && f2.pause && f2.inGame && !f2.lobby, JSON.stringify({ f1, back, f2 }));
  await g.waitForTimeout(400);
  await clickAt('#natpf-pause [data-pause="menu"]'); await g.waitForTimeout(600);
  const f3 = await st();
  check('secondo clic (dopo mezzo secondo): menu principale', f3.lobby && f3.step === 'menu' && !f3.pause && !f3.inGame, JSON.stringify(f3));

  /* ---------- 4. diagnostica dalla pausa ---------- */
  await startMatch();
  await clickAt('#natpf-pause-btn'); await g.waitForTimeout(300);
  const dg = await clickAt('#natpf-pause [data-pause="diag"]'); await g.waitForTimeout(500);
  const h0 = await st(); await g.waitForTimeout(4000); const h1 = await st();
  const hold = await g.evaluate(() => { const h = document.querySelector('.natpf-diag [data-diag-hold]'); return h && !h.classList.contains('hidden') ? h.textContent : null; });
  check('n. 14: «Diagnostica» dalla pausa: la diagnostica al posto della pausa e la partita resta ferma (in 4 s nessun tempo di gioco)', dg.onTop && h0.diag && !h0.pause && h0.paused && h1.paused && Math.abs(h1.t - h0.t) < 0.02 && h0.score === h1.score, JSON.stringify({ h0, h1 }));
  check('la diagnostica dice che la partita è ferma finché è aperta', /Partita ferma/.test(hold || ''), hold);
  await g.screenshot({ path: `${SP}/b43-diagnostica-dalla-pausa-1280x720.png` });
  const x = await clickAt('.natpf-diag [data-diag="close"]'); await g.waitForTimeout(400);
  const h2 = await st();
  check('× della diagnostica: di nuovo la pausa, partita ancora ferma', x.onTop && !h2.diag && h2.pause && h2.paused, JSON.stringify(h2));
  await g.keyboard.press('Shift+KeyD'); await g.waitForTimeout(400); const h3 = await st();
  const covered = await g.evaluate(() => { const el = document.querySelector('#natpf-pause [data-pause="menu"]'), r = el.getBoundingClientRect(); return r.width > 0 && document.elementFromPoint(r.left + r.width/2, r.top + r.height/2) !== el; });
  await g.keyboard.press('Shift+KeyD'); await g.waitForTimeout(400); const h4 = await st();
  check('A3: Maiusc+D con la pausa aperta: la diagnostica non resta sopra la pausa (la pausa si chiude e torna alla chiusura)', h3.diag && !h3.pause && h3.paused && h4.pause && !h4.diag && h4.paused, JSON.stringify({ h3, h4, covered }));
  await clickAt('#natpf-pause [data-pause="resume"]'); await g.waitForTimeout(1000);
  const h5 = await st(); await g.waitForTimeout(800); const h6 = await st();
  check('«Riprendi ›»: la partita riparte', !h5.paused && h6.t > h5.t + 0.3, JSON.stringify({ h5, h6 }));

  /* ---------- 5. telecomando dello staff in partita ---------- */
  await staffKey(); await g.waitForTimeout(300);
  const rc = await clickAt('#natpf-staff [data-staff="remote"]');
  await g.waitForFunction(() => __natpfTennis.natpfUi.remote.isOpen, null, { timeout: 20000 }).catch(() => {});
  await g.waitForTimeout(500);
  const r0 = await st(); await g.waitForTimeout(3000); const r1 = await st();
  const rtop = await g.evaluate(() => { const el = document.querySelector('#natpf-remote [data-remote="close"]'), r = el.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return !!t && (t === el || el.contains(t)); });
  check('telecomando dello staff aperto dal pannello in partita: foglio in cima, partita ferma (3 s senza tempo di gioco)', rc.onTop && r0.remote && !r0.staff && r0.paused && r1.paused && Math.abs(r1.t - r0.t) < 0.02 && rtop, JSON.stringify({ r0, r1, rtop }));
  await g.screenshot({ path: `${SP}/b43-telecomando-in-partita-1280x720.png` });
  await g.keyboard.press('Escape'); await g.waitForTimeout(400);
  const r2 = await st();
  check('Esc nel foglio del telecomando: di nuovo il pannello dello stand (non la pausa sotto), partita ancora ferma', !r2.remote && r2.staff && !r2.pause && r2.paused, JSON.stringify(r2));
  await g.keyboard.press('Escape'); await g.waitForTimeout(800);
  const r3 = await st();
  check('Esc nel pannello: chiuso, la partita riparte', !r3.staff && !r3.pause && !r3.paused, JSON.stringify(r3));

  /* ---------- 6. voci distruttive del pannello: due clic ---------- */
  await staffKey(); await g.waitForTimeout(300);
  const n1 = await clickAt('#natpf-staff [data-staff="newplayer"]'); await g.waitForTimeout(300);
  const k1 = await st(), npText = await text('#natpf-staff [data-staff="newplayer"]');
  const lay = async () => g.evaluate(() => {
    const s = document.querySelector('#natpf-staff .natpf-sheet'), r = s.getBoundingClientRect(), row = s.querySelector('.staff-actions');
    const out = [...s.querySelectorAll('button')].filter(b => b.offsetParent && !b.classList.contains('hidden')).filter(b => { const q = b.getBoundingClientRect(); return q.right > r.right + 1 || q.left < r.left - 1 || q.bottom > r.bottom + 1 || b.scrollWidth > b.clientWidth + 2; }).map(b => b.dataset.staff || b.textContent.trim());
    const close = s.querySelector('[data-staff="close"]').getBoundingClientRect();
    return { scroll: s.scrollHeight - s.clientHeight, closeInView: close.bottom <= Math.min(r.bottom, innerHeight) && close.top >= 0, out, rowH: Math.round(row.getBoundingClientRect().height), size: `${innerWidth}×${innerHeight}` };
  });
  const l1280 = await lay();
  await g.screenshot({ path: `${SP}/b43-pannello-nuovo-giocatore-armato-1280x720.png` });
  check('A5: «Nuovo giocatore» in partita, primo clic: niente (pannello aperto, partita ferma), il pulsante dice «Sicuro? Clicca ancora»', n1.onTop && k1.staff && k1.paused && k1.inGame && !k1.nick && npText === 'Sicuro? Clicca ancora', JSON.stringify({ k1, npText }));
  check('pulsante armato: il foglio resta in una schermata, «Chiudi» in vista, niente scritte tagliate (1280×720)', l1280.scroll <= 0 && l1280.closeInView && !l1280.out.length, JSON.stringify(l1280));
  // stesso controllo a 1024×600 e 720×720 (lo stesso pulsante armato: il foglio si ridisegna alla nuova misura)
  const sizes = {};
  for (const [w, h] of [[1024, 600], [720, 720]]){
    await g.setViewportSize({ width: w, height: h }); await g.waitForTimeout(600);
    sizes[`${w}x${h}`] = await lay();
    await g.screenshot({ path: `${SP}/b43-pannello-nuovo-giocatore-armato-${w}x${h}.png` });
  }
  check('pulsante armato a 1024×600 e 720×720: foglio senza scorrere, «Chiudi» in vista, niente scritte tagliate', Object.values(sizes).every(l => l.scroll <= 0 && l.closeInView && !l.out.length), JSON.stringify(sizes));
  await g.setViewportSize({ width: 1280, height: 720 }); await g.waitForTimeout(600);
  // doppio clic su «Classifica · A schermo intero»: arma la classifica (e disarma «Nuovo giocatore»), ma non la apre
  const rk = await clickAt('#natpf-staff [data-staff="ranking"]', { dbl: true }); await g.waitForTimeout(400);
  const k2 = await st(), rkText = await text('#natpf-staff [data-staff="ranking"] b'), npBack = await text('#natpf-staff [data-staff="newplayer"]');
  check('doppio clic su «Classifica · A schermo intero» in partita: la classifica non si apre (pulsante armato), «Nuovo giocatore» torna com\'era', rk.onTop && k2.staff && k2.inGame && !k2.lobby && rkText === 'Sicuro? Clicca ancora' && npBack === 'Nuovo giocatore', JSON.stringify({ k2, rkText, npBack }));
  await g.waitForTimeout(600);
  await clickAt('#natpf-staff [data-staff="newplayer"]'); await g.waitForTimeout(600);
  const k3 = await st();
  await clickAt('#natpf-staff [data-staff="newplayer"]'); await g.waitForTimeout(800);
  const k4 = await st();
  check('«Nuovo giocatore» con due clic: la partita si chiude e si riparte da chi gioca', k3.staff && k3.inGame && !k4.staff && !k4.inGame && (k4.lobby || k4.nick), JSON.stringify({ k3, k4 }));

  /* ---------- 7. pausa armata a 720×720 e schermata grande ---------- */
  await g.evaluate(() => { const n = document.getElementById('natpf-nick'); if (n && !n.classList.contains('hidden')) document.getElementById('nick-cancel')?.click(); });
  await g.setViewportSize({ width: 720, height: 720 }); await g.waitForTimeout(400);
  await startMatch();
  await clickAt('#natpf-pause-btn'); await g.waitForTimeout(300);
  await clickAt('#natpf-pause [data-pause="menu"]'); await g.waitForTimeout(300);
  const p720 = await g.evaluate(() => { const s = document.querySelector('#natpf-pause .natpf-sheet'), r = s.getBoundingClientRect(); const bs = ['menu', 'resume'].map(k => { const b = s.querySelector(`[data-pause="${k}"]`), q = b.getBoundingClientRect(); return q.bottom <= Math.min(r.bottom, innerHeight) && q.right <= r.right + 1 && b.scrollWidth <= b.clientWidth + 2; }); return { scroll: s.scrollHeight - s.clientHeight, ok: bs, text: s.querySelector('[data-pause="menu"]').textContent }; });
  await g.screenshot({ path: `${SP}/b43-pausa-torna-al-menu-armato-720x720.png` });
  check('pausa a 720×720 con «Sicuro? Clicca ancora»: in una schermata, i due pulsanti in vista e interi', p720.scroll <= 0 && p720.ok.every(Boolean) && p720.text === 'Sicuro? Clicca ancora', JSON.stringify(p720));
  await clickAt('#natpf-pause [data-pause="resume"]'); await g.waitForTimeout(500);
  await g.setViewportSize({ width: 1920, height: 1080 }); await g.waitForTimeout(800);
  await clickAt('#natpf-pause-btn'); await g.waitForTimeout(300);
  await staffKey(); await g.waitForTimeout(500);
  await g.screenshot({ path: `${SP}/b43-pannello-sopra-pausa-1920x1080.png` });
  const big = await st();
  check('1920×1080: pannello sopra la pausa, partita ferma', big.staff && big.pause && big.paused, JSON.stringify(big));
  await clickAt('#natpf-staff [data-staff="close"]'); await clickAt('#natpf-pause [data-pause="resume"]');
  check('nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 600));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
