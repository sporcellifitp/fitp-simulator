// NATPF B39 · Stand con il solo mouse (docs/b39/stand-solo-mouse.md): il percorso dello stand fatto SOLO con il mouse
// (page.mouse: move, down, up, click; mai la tastiera), come il controllo «solo mouse» del 13/11
// (docs/b39/controllo-solo-mouse/prova-vera-solo-mouse.md, R4). Ogni punto «BLOCCATO» di quel controllo che tocca al B39
// qui deve risultare OK:
//   • intro con due clic, poi il menu;
//   • pannello dello stand dalla pagina principale del menu (titolo grande tenuto 3 s, con l'anello che si riempie e la
//     mano che trema un poco) e da un'altra pagina (marchio piccolo);
//   • «Diagnostica» dal pannello e ritorno al pannello; «Azzera oggi» con il secondo clic, nessuna finestra di Windows;
//   • classifica a schermo intero e uscita con «× Chiudi» (compare muovendo il mouse);
//   • doppio clic (B39.2, secondo clic a 110, 250 e 300 ms come nel controllo) che non sceglie niente nella pagina dopo:
//     «Gioca», «Allenamento», «Minigiochi», «Contro la CPU», «‹ Indietro», «Alla partita ›» (stesso punto di «Gioca ›»),
//     voci a giro del pannello, «Avanti ›» della guida; un clic singolo 100 ms dopo il passaggio automatico di pagina non
//     conta, uno dopo 700 ms sì (con ?guardia=1: nelle prove automatiche la regola del clic in ritardo vale solo così);
//   • partita con la racchetta mouse della modalità prova: ❚❚ breve = pausa, ❚❚ tenuto 3 s = pannello dello stand con la
//     partita ferma e senza la pausa; riquadro «Telefono in pausa» sotto la pausa (non copre «Riprendi ›»);
//   • puntatore (B39.5): Opzioni → «Puntatore: Grande», nascosto dopo 10 s fermo nel menu e di nuovo visibile con un
//     anello, mai nascosto con la racchetta mouse, freccia sul bordo di un'area calibrata quando il puntatore è fuori
//     (schermate composte: il cursore vero non compare nelle schermate, lì c'è la sua immagine);
//   • calibrazione dello schermo (B39.6) a 1920 × 1080 con la parte visibile di 1000 × 1000 in alto a sinistra: si
//     cliccano i due angoli, «Salva» è nella parte visibile, una freccia si trascina, salvata in meno di 8 azioni.
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
  await g.goto(`http://127.0.0.1:${GAME_PORT}/?guardia=1&peer=127.0.0.1:${PEER_PORT}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
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

  /* ---------- 7. doppio clic (B39.2): il secondo clic non sceglie niente nella pagina dopo ---------- */
  // secondo clic dopo gap ms nello stesso punto, con clickCount 2 come lo manda il sistema in un doppio clic (premuto e
  // rilasciato una volta: mouse.click con clickCount 2 farebbe da solo due clic, 1 e 2)
  const dbl = async (sel, gap = 110) => {
    const r = await where(sel); if (!r.found) return r;
    await g.mouse.move(r.x, r.y, { steps: 3 });
    await g.mouse.click(r.x, r.y); await g.waitForTimeout(gap); await g.mouse.down({ clickCount: 2 }); await g.mouse.up({ clickCount: 2 });
    await g.waitForTimeout(900);
    return r;
  };
  const dropped = () => g.evaluate(() => __natpfTennis.natpfUi.mouse.guard.dropped.map(d => d.v));
  const toMenu = () => g.evaluate(() => { const u = __natpfTennis.natpfUi; u.onboarding.isOpen && u.onboarding.close(); u.lobby.go('menu'); });
  await toMenu(); await g.waitForTimeout(600);
  const ctrl0 = await g.evaluate(() => __natpfTennis.natpfUi.controller);
  const d1 = [];
  for (const gap of [110, 250, 300]){
    await toMenu(); await g.waitForTimeout(600);
    await dbl('[data-page="menu"] [data-menu="play"]', gap);
    d1.push((await st()).step + ':' + (await g.evaluate(() => __natpfTennis.natpfUi.lobby.mode)));
  }
  check('doppio clic su «Gioca» (110, 250, 300 ms): resta «Con chi giochi?» (prima finiva in «Stesso schermo» o «Sfida un amico»)', d1.every(x => x.startsWith('mode:')) && !d1.some(x => /split|friend/.test(x)), d1.join(' '));
  await toMenu(); await g.waitForTimeout(600);
  await dbl('[data-page="menu"] [data-menu="training"]', 110);
  const d2 = await g.evaluate(() => ({ step: __natpfTennis.natpfUi.lobby.step, controller: __natpfTennis.natpfUi.controller, webcam: !!__natpfTennis.motionController?.webcamActive }));
  check('doppio clic su «Allenamento»: pagina della racchetta, racchetta invariata, webcam spenta', d2.step === 'controller' && d2.controller === ctrl0 && !d2.webcam, JSON.stringify(d2));
  await toMenu(); await g.waitForTimeout(600);
  await dbl('[data-page="menu"] [data-menu="challenges"]', 110);
  const d3 = await g.evaluate(() => ({ step: __natpfTennis.natpfUi.lobby.step, nick: !document.getElementById('natpf-nick').classList.contains('hidden') }));
  check('doppio clic su «Minigiochi»: pagina dei minigiochi, nessun foglio del nickname aperto', d3.step === 'challenges' && !d3.nick, JSON.stringify(d3));
  const d4 = [];
  for (const gap of [250, 300]){
    await toMenu(); await g.waitForTimeout(600);
    await clickAt('[data-page="menu"] [data-menu="play"]', { wait: 900 });
    await dbl('[data-page="mode"] [data-mode="cpu"]', gap);
    d4.push((await st()).step);
  }
  check('doppio clic su «Contro la CPU» a 250 e 300 ms: pagina della racchetta (prima la saltava)', d4.every(x => x === 'controller'), d4.join(' '));
  await dbl('#lobby-back', 110);
  check('doppio clic su «‹ Indietro» dalla racchetta: una pagina sola («Con chi giochi?»)', (await st()).step === 'mode', (await st()).step);
  await clickAt('[data-page="mode"] [data-mode="cpu"]', { wait: 1100 });
  await clickAt('[data-page="controller"] [data-natpf-controller="mouse"]', { wait: 1100 });
  s = await st();
  check('«Mouse e tastiera»: pagina «Collega»', s.step === 'connect', s.step);
  const nextR = await where('#lobby-next'), playR0 = await g.evaluate(() => { const b = document.getElementById('btn-start-match'); return b.getBoundingClientRect().toJSON?.() || null; });
  await dbl('#lobby-next', 110);
  s = await st();
  check('doppio clic su «Alla partita ›»: «Pronto per la partita» e la partita NON parte (prima partiva senza scegliere)', s.step === 'match' && s.lobby && !s.inGame, JSON.stringify({ s, prossimo: nextR.top }));
  // pannello: voce a giro con il doppio clic → un passo solo
  const idle0 = await g.evaluate(() => __natpfTennis.natpfUi.kiosk.limit);
  await g.evaluate(() => __natpfTennis.natpfUi.kiosk.open()); await g.waitForTimeout(500);
  await dbl('#natpf-staff [data-staff="idle"]', 110);
  const idle1 = await g.evaluate(() => __natpfTennis.natpfUi.kiosk.limit);
  const steps = [30, 45, 60, 90], one = steps[(steps.indexOf(idle0) + 1) % 4];
  check('doppio clic su una voce a giro del pannello («Ritorno al menu dopo»): un passo solo', idle1 === one, JSON.stringify({ prima: idle0, dopo: idle1, atteso: one }));
  await g.evaluate(l => { const k = __natpfTennis.natpfUi.kiosk; k.limit = l; k._save(); k.paint(); k.close(); }, idle0);
  await g.waitForTimeout(500);
  // guida: «Avanti ›» con il doppio clic → una scheda sola
  await clickAt('#lobby-help', { wait: 900 });
  await dbl('#onb-next', 110);
  const card = await g.evaluate(() => __natpfTennis.natpfUi.onboarding.index);
  check('doppio clic su «Avanti ›» della guida: una scheda sola (prima saltava la seconda)', card === 1, String(card));
  await clickAt('#onb-close', { wait: 700 });
  const dd = await dropped();
  check('la guardia ha scartato i secondi clic come «doppio»', dd.filter(v => v === 'doppio').length >= 10, dd.join(','));

  /* ---------- 8. partita con la racchetta mouse: ❚❚ breve = pausa, ❚❚ tenuto 3 s = pannello ---------- */
  // clic singolo 100 ms dopo il passaggio automatico alla pagina «Pronto per la partita» (qui fatto dal codice, come il
  // telefono pronto): non conta; 700 ms dopo sì
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.go('connect')); await g.waitForTimeout(800);
  const playR = await where('#btn-start-match'), nxt = await where('#lobby-next');
  await g.mouse.move(nxt.x, nxt.y, { steps: 3 });
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.go('match'));
  await g.waitForTimeout(100);
  const pr = await where('#btn-start-match');
  await g.mouse.click(pr.x, pr.y);
  await g.waitForTimeout(800);
  s = await st();
  const late = (await dropped()).at(-1);
  check('clic singolo 100 ms dopo il passaggio automatico di pagina: non conta (la partita non parte)', s.step === 'match' && s.lobby && !s.inGame && late === 'tardi', JSON.stringify({ s, ultimo: late, stessoPunto: Math.abs(nxt.x - pr.x) < 2 && Math.abs(nxt.y - pr.y) < 2 }));
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

  /* ---------- 9. riquadro «Telefono in pausa» sotto la pausa (B39.3, n. 13) ---------- */
  await g.evaluate(() => __natpfTennis.natpfUi._paintHold('Telefono in pausa', 'Riaccendi lo schermo del telefono: si riparte da soli.', { label: 'Ricollega il telefono', run(){} }));
  await clickAt('#natpf-pause-btn', { wait: 500 });
  const resume = await where('#natpf-pause [data-pause="resume"]'), menuBtn = await where('#natpf-pause [data-pause="menu"]');
  const zHold = await g.evaluate(() => getComputedStyle(document.getElementById('natpf-phone-hold')).zIndex);
  await snap('b39-pausa-con-riquadro-telefono-1280x720.png');
  check('pausa aperta con il riquadro del telefono: il riquadro sta sotto, «Riprendi ›» e «Torna al menu» si cliccano', resume.onTop && menuBtn.onTop && +zHold < 60, JSON.stringify({ resume: resume.top, menu: menuBtn.top, zHold }));
  await clickAt('#natpf-pause [data-pause="resume"]', { wait: 400 });
  await g.evaluate(() => __natpfTennis.natpfUi._paintHold(null));

  /* ---------- 10. puntatore per il ledwall (B39.5) ---------- */
  // con la racchetta mouse il puntatore in campo resta (è la racchetta)
  await g.mouse.move(600, 500, { steps: 4 }); await g.waitForTimeout(3600);
  const keep = await g.evaluate(() => document.documentElement.classList.contains('cursor-hidden'));
  check('in campo con la racchetta «Mouse e tastiera» il puntatore non sparisce', !keep);
  await g.evaluate(() => __natpfTennis.natpfUi.backToMenu()); await g.waitForTimeout(800);
  await clickAt('[data-page="menu"] [data-menu="options"]', { wait: 900 });
  const optRow = await where('[data-natpf-pointer="grande"]');
  await clickAt('[data-natpf-pointer="grande"]', { wait: 600 });
  const big = await g.evaluate(() => ({ cls: document.documentElement.classList.contains('cursor-big'), cur: getComputedStyle(document.querySelector('#title-modal')).cursor.slice(0, 40), saved: localStorage.getItem('natpf-tennis.puntatore'), sel: document.querySelector('[data-natpf-pointer="grande"]').classList.contains('selected') }));
  check('Opzioni → «Puntatore: Grande»: freccia gialla al posto di quella di sistema, scelta salvata', optRow.onTop && big.cls && /^url\("data:image\/svg\+xml/.test(big.cur) && big.saved === 'grande' && big.sel, JSON.stringify(big));
  // fermo 10 s nel menu: sparisce; al primo movimento ricompare con l'anello
  await g.waitForTimeout(10500);
  const hid = await g.evaluate(() => document.documentElement.classList.contains('cursor-hidden'));
  await g.mouse.move(640, 300, { steps: 3 });
  const back = await g.evaluate(() => ({ hidden: document.documentElement.classList.contains('cursor-hidden'), ring: document.querySelector('.natpf-pointer-ring')?.classList.contains('run') }));
  check('nel menu fermo 10 s il puntatore sparisce; muovendo il mouse ricompare con un anello', hid && !back.hidden && back.ring, JSON.stringify({ hid, back }));
  // schermata composta: il cursore vero non compare nelle schermate, qui l'immagine dello stesso cursore dove sta il mouse
  const composite = async (name, x, y) => {
    await g.evaluate(([x, y]) => { const css = getComputedStyle(document.documentElement).getPropertyValue('--natpf-cursor'); const m = /url\("([^"]+)"\)/.exec(css); if (!m) return; const img = document.createElement('img'); img.id = '__cursore'; img.src = m[1]; img.style.cssText = `position:fixed;left:${x - 3}px;top:${y - 3}px;z-index:9999;pointer-events:none`; document.documentElement.appendChild(img); }, [x, y]);
    await g.waitForTimeout(200); await snap(name);
    await g.evaluate(() => document.getElementById('__cursore')?.remove());
  };
  await g.mouse.move(700, 330, { steps: 3 }); await g.waitForTimeout(300);
  await composite('b39-puntatore-grande-1280x720.png', 700, 330);
  // area calibrata più piccola della finestra (1000 × 1000 in alto a sinistra di 1920 × 1080, qui in scala: bordo destro
  // 40 %): puntatore fuori dall'area → freccia sul bordo destro dell'area
  await g.evaluate(() => __natpfTennis.natpfUi.screen.preview({ preset: 'full', margins: { t: 0, r: 40, b: 0, l: 0 } }));
  await g.waitForTimeout(500);
  await g.mouse.move(1100, 360, { steps: 6 }); await g.waitForTimeout(400);
  const arr = await g.evaluate(() => { const a = document.querySelector('.natpf-edge-arrow'), b = a.getBoundingClientRect(); return { shown: !a.classList.contains('hidden'), x: Math.round(b.left + b.width/2), y: Math.round(b.top + b.height/2), right: Math.round(b.right), angle: a.style.getPropertyValue('--angle'), areaW: Math.round(document.body.getBoundingClientRect().width) }; });
  await composite('b39-freccia-bordo-area-1280x720.png', 1100, 360);
  check('area calibrata: con il puntatore fuori dall\'area una freccia sul bordo destro dell\'area indica dove sta', arr.shown && arr.right <= arr.areaW && arr.x > arr.areaW - 80 && Math.abs(arr.y - 360) < 4 && arr.angle === '0deg', JSON.stringify(arr));
  await g.mouse.move(400, 360, { steps: 6 }); await g.waitForTimeout(300);
  check('… e sparisce quando il puntatore torna dentro', await g.evaluate(() => document.querySelector('.natpf-edge-arrow').classList.contains('hidden')));
  await g.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.screen.save({ preset: 'full', margins: { t: 0, r: 0, b: 0, l: 0 } }); });
  await g.waitForTimeout(600);
  const nb = await clickAt('[data-natpf-pointer="normale"]', { wait: 500 });
  const nres = await g.evaluate(() => ({ big: document.documentElement.classList.contains('cursor-big'), saved: localStorage.getItem('natpf-tennis.puntatore') }));
  check('«Puntatore: Normale»: di nuovo la freccia di sistema', !nres.big && nres.saved === 'normale', JSON.stringify({ nb, nres, scartati: (await dropped()).slice(-3) }));

  check('nessuna finestra di Windows (confirm, alert) in tutto il percorso', !dialogs.length, dialogs.join(' | '));
  check('nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 400));
  await ctx.close();

  /* ---------- 11. calibrazione dello schermo con il mouse (B39.6): 1000 × 1000 in alto a sinistra di 1920 × 1080 ---------- */
  {
    const ctx2 = await B.newContext({ viewport: { width: 1920, height: 1080 } }), c = await ctx2.newPage(), errs2 = [];
    c.on('pageerror', e => errs2.push(e.message));
    await c.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
    await c.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0&guardia=1&peer=127.0.0.1:${PEER_PORT}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await c.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby?.visible && window.__natpfTennis.player?.model, null, { timeout: 180000 });
    await c.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
    await c.waitForTimeout(800);
    const at = sel => c.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(), x = b.left + b.width/2, y = b.top + b.height/2, t = document.elementFromPoint(x, y); return { x, y, l: b.left, r: b.right, t: b.top, b: b.bottom, onTop: !!t && (t === el || el.contains(t)) }; }, sel);
    let clicks = 0;
    const click = async (x, y) => { await c.mouse.move(x, y, { steps: 4 }); await c.mouse.click(x, y); clicks++; await c.waitForTimeout(700); };
    const o = await at('[data-page="menu"] [data-menu="options"]'); await click(o.x, o.y);
    const k = await at('[data-option="calibra"]'); await click(k.x, k.y);
    await c.mouse.move(300, 260, { steps: 5 }); await c.waitForTimeout(300);
    const hint = await c.evaluate(() => { const h = document.querySelector('.natpf-cal-hint'); const b = h?.getBoundingClientRect(); return h && !h.classList.contains('hidden') ? { text: h.textContent, l: Math.round(b.left), t: Math.round(b.top) } : null; });
    await c.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await c.screenshot({ path: `${SP}/b39-calibra-due-angoli-1920x1080.png` }); console.log(`     schermata: ${SP}/b39-calibra-due-angoli-1920x1080.png`);
    check('calibrazione aperta: si comincia dai due angoli, la scritta segue il puntatore', !!hint && /alto a sinistra/.test(hint.text) && Math.abs(hint.l - 322) < 30 && Math.abs(hint.t - 282) < 30, JSON.stringify(hint));
    await click(0, 0);
    const hint2 = await c.evaluate(() => document.querySelector('.natpf-cal-hint')?.textContent || '');
    await click(999, 999);
    await c.waitForTimeout(400);
    const area = await c.evaluate(() => { const b = document.body.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; });
    const save = await at('[data-cal="save"]'), cancel = await at('[data-cal="cancel"]');
    await c.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await c.screenshot({ path: `${SP}/b39-calibra-dopo-due-angoli-1920x1080.png` }); console.log(`     schermata: ${SP}/b39-calibra-dopo-due-angoli-1920x1080.png`);
    check('due clic (angolo in alto a sinistra, angolo in basso a destra): area 1000 × 1000 in alto a sinistra, «Salva» e «Annulla» dentro la parte che si vede', /basso a destra/.test(hint2) && Math.abs(area.w - 998) <= 12 && Math.abs(area.h - 998) <= 12 && area.x === 0 && area.y === 0 && save.onTop && save.r <= 1000 && save.b <= 1000 && cancel.onTop, JSON.stringify({ area, save, hint2 }));
    // freccia del bordo destro trascinata verso sinistra di 40 px
    const mr = await at('.cal-mark-r');
    await c.mouse.move(mr.x, mr.y, { steps: 3 }); await c.mouse.down(); await c.mouse.move(mr.x - 20, mr.y, { steps: 3 }); await c.mouse.move(mr.x - 40, mr.y, { steps: 3 }); await c.mouse.up(); clicks++;
    await c.waitForTimeout(400);
    const area2 = await c.evaluate(() => Math.round(document.body.getBoundingClientRect().width));
    check('freccia del bordo destro trascinata: l\'area si stringe con il mouse', area2 < area.w - 25 && area2 > area.w - 60, JSON.stringify({ prima: area.w, dopo: area2 }));
    const sv = await at('[data-cal="save"]'); await click(sv.x, sv.y);
    const saved = await c.evaluate(() => ({ open: __natpfTennis.natpfUi.calibra.isOpen, cal: JSON.parse(localStorage.getItem('natpf-tennis.screen.cal') || 'null') }));
    check(`«Salva»: calibrazione salvata, ${clicks} azioni del mouse in tutto (prima circa 110 clic)`, !saved.open && saved.cal && saved.cal.margins.r > 47 && saved.cal.margins.b >= 7 && clicks <= 7, JSON.stringify({ ...saved, clicks }));
    await c.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.screen.save({ preset: 'full', margins: { t: 0, r: 0, b: 0, l: 0 } }); });
    check('calibrazione con il mouse: nessun errore JavaScript', !errs2.length, errs2.join(' | ').slice(0, 300));
    await ctx2.close();
  }
} finally {
  await B.close();
}
summary();
setTimeout(() => process.exit(), 300);
