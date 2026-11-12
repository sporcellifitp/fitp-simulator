// Telecomando dello staff (B27) nel gioco vero, sul server LAN del programma Windows (stesso codice: natpf-tennis/lan
// con il certificato creato come fa il programma, HTTPS, segnalazione /lan-signal, WebRTC diretto), con un ponte
// window.natpfDesktop finto (due monitor: portatile 1920×1080 e ledwall 1024×1024) e il gioco a 1024 × 1024.
//   • abbinamento dal pannello dello stand («Telecomando dello staff»): il QR (letto con jsQR) apre la pagina del
//     telecomando, che si collega; il gioco dice «Collegato ✓»;
//   • percorso guidato solo dal telefono: menu → Gioca → racchetta → collega → «Pronto per la partita» → Gioca! → in
//     partita frecce e OK spenti (il giocatore non si muove) → Pausa → frecce nella pausa → Riprendi → Pausa → Torna al
//     menu (con conferma) → «Pronto per la partita» → Nuovo giocatore → Salta il nome → di nuovo «Pronto»;
//   • ripresa da sola: gioco ricaricato, pagina del telefono ricaricata (senza QR), server LAN riavviato (PC riavviato);
//   • rifiuti: secondo telefono con il QR già usato, codice sbagliato, racchetta che si presenta al telecomando, telecomando
//     che si presenta alla racchetta, pagina del telecomando con il QR dei giocatori;
//   • schermate della matrice (docs/b27/telecomando.md): intro (Salta), opzioni, pannello dello stand e del telecomando,
//     guida, calibrazione dello schermo, rivedi i gesti, finestra del certificato, diagnostica, pannello del telefono, fine
//     partita (Gioca ancora, Menu), minigioco (Indietro = pausa, Menu), chiosco che azzera lo stand; schermo del gioco e
//     schermo intero dal telefono (ponte finto), livello della CPU;
//   • «Scollega il telecomando» e abbinamento con il codice scritto a mano.
// Schermate in OUT (telecomando-*.png). Porte: 4902 (HTTPS del gioco), 4903 (guida LAN, solo 127.0.0.1).
//   npm ci --prefix tools/e2e; (cd natpf-tennis && npm run build)
//   CHROMIUM_PATH=/opt/pw-browsers/chromium OUT=/tmp/telecomando node tools/e2e/natpf-telecomando.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = +(process.env.GAME_PORT || 4902), SETUP = PORT + 1;

// --- figlio: il server LAN come lo avvia il programma Windows (natpf-desktop/src/main.mjs, startServers) -------------
if (process.argv[2] === '--server'){
  const { ensureCertificate } = await import('../lan/certificato.mjs');
  ensureCertificate();
  const { startNatpfLan } = await import('../../natpf-tennis/lan/server.mjs');
  const lan = await startNatpfLan({ open: false, upstream: false, port: PORT, setupPort: SETUP });
  if (!lan.game) { console.error('server non avviato', JSON.stringify(lan.status())); process.exit(2); }
  console.log('PRONTO', JSON.stringify(lan.status().urls));
  process.on('SIGTERM', () => { setTimeout(() => process.exit(0), 500); lan.close().finally(() => process.exit(0)); });
  await new Promise(() => {});
}

const { launch, check, summary, SP, JSQR } = await import('./th.mjs');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-telecomando-'));
let server = null;
async function startServer(){
  server = spawn(process.execPath, [fileURLToPath(import.meta.url), '--server'], { env: { ...process.env, NATPF_DATA_DIR: DATA, GAME_PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server LAN: tempo scaduto')), 60000);
    server.stdout.on('data', d => { if (/PRONTO/.test(String(d))){ clearTimeout(t); resolve(); } });
    server.once('exit', c => { clearTimeout(t); reject(new Error(`server LAN uscito: ${c}`)); });
  });
}
async function stopServer(){
  if (!server) return;
  const s = server; server = null;
  const gone = new Promise(r => s.once('exit', r));
  s.kill('SIGTERM');
  if (await Promise.race([gone.then(() => true), sleep(3000).then(() => false)])) return;
  s.kill('SIGKILL'); await gone;
}
process.on('exit', () => { try { server?.kill(); } catch {} });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GAME = `https://127.0.0.1:${PORT}/?lan=1`;
// programma Windows finto: schermo intero della finestra e due monitor (come il preload, natpf-desktop/src/preload.cjs)
const fakeDesktop = () => {
  const list = [{ id: 1, index: 0, width: 1920, height: 1080, primary: true, ledwall: false, label: 'Monitor 1 · 1920×1080 (principale)' },
    { id: 2, index: 1, width: 1024, height: 1024, primary: false, ledwall: true, label: 'Monitor 2 · 1024×1024 · probabile ledwall' }];
  let cur = 2, fs = true; const fsCbs = [], dCbs = [];
  const state = () => { const l = list.map(d => ({ ...d, current: d.id === cur, wanted: d.id === cur })); return { list: l, current: l.find(d => d.current), wanted: cur }; };
  window.__desk = { moves: [] };
  window.natpfDesktop = { shell: 'electron', version: 3,
    isFullScreen: async () => fs, setFullScreen: async on => { fs = !!on; fsCbs.forEach(f => f(fs)); return fs; }, toggleFullScreen: async () => { fs = !fs; fsCbs.forEach(f => f(fs)); return fs; },
    onFullScreenChange: cb => fsCbs.push(cb),
    updates: { state: async () => ({ status: 'off', current: 'prova' }), check: async () => ({ status: 'off' }), download: async () => ({ status: 'off' }), install: async () => ({ ok: false }), onChange: () => () => {} },
    displays: { list: async () => state(), next: async () => { cur = cur === 1 ? 2 : 1; window.__desk.moves.push(cur); dCbs.forEach(f => f(state())); return state(); }, choose: async id => { cur = id; return state(); }, onChange: cb => { dCbs.push(cb); return () => {}; } } };
};

let B;
try {
  await startServer();
  check('server LAN del programma avviato (certificato creato come nel programma)', true, DATA);
  B = await launch();
  const gctx = await B.newContext({ viewport: { width: 1024, height: 1024 }, ignoreHTTPSErrors: true });
  // mouse e tastiera (modalità prova): la partita parte senza il telefono del giocatore
  await gctx.addInitScript(() => { try { if (!localStorage.getItem('natpf-tennis.testInput')){ localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.setItem('natpf-tennis.controller', 'mouse'); } } catch {} });
  await gctx.addInitScript(fakeDesktop);
  const game = await gctx.newPage(), gameErr = [];
  game.on('pageerror', e => gameErr.push(e.message));
  game.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404|net::ERR/.test(m.text())) gameErr.push('console: ' + m.text()); });
  const ui = (fn, arg) => game.evaluate(fn, arg);
  const ready = async () => { await game.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && __natpfTennis.player?.model, null, { timeout: 120000 }); await sleep(500); };

  // 1) avvio con l'intro (come il programma): il telecomando non è ancora abbinato, il gioco non registra niente
  await game.goto(GAME, { waitUntil: 'domcontentloaded' }); await ready();
  check('gioco avviato con l\'intro, telecomando non abbinato: nessun collegamento aperto', await ui(() => __natpfTennis.natpfUi.intro.active && !__natpfTennis.natpfUi.remote.link.paired && __natpfTennis.natpfUi.remote.link.S.state === 'off'));
  // pannello dello stand con i tasti veri (l'intro li prende: si salta con un tasto, poi Ctrl+Maiusc+K)
  await game.keyboard.press('Enter'); await sleep(300); await game.keyboard.press('Enter'); await sleep(900);
  await ui(() => __natpfTennis.natpfUi.intro.active && (__natpfTennis.natpfUi.intro.finishAnimation(), __natpfTennis.natpfUi.intro.start()));
  await sleep(800);
  await game.keyboard.press('Control+Shift+KeyK');
  await game.waitForSelector('#natpf-staff:not(.hidden) [data-staff="remote"]', { state: 'visible' });
  await sleep(400);
  const staff = await ui(() => { const s = document.querySelector('#natpf-staff .natpf-sheet'), r = s.getBoundingClientRect(), c = s.querySelector('[data-staff="close"]').getBoundingClientRect(), d = s.querySelector('[data-staff="display"]'); return { scroll: s.scrollHeight - s.clientHeight, close: c.bottom <= Math.min(r.bottom, innerHeight), display: !d.classList.contains('hidden') && d.textContent }; });
  check('1024 × 1024: pannello dello stand senza scorrere, «Chiudi» in vista, «Schermo del gioco» con il ledwall', staff.scroll <= 0 && staff.close && /1024×1024/.test(staff.display), JSON.stringify(staff));
  await game.screenshot({ path: `${SP}/telecomando-stand-1024x1024.png` });
  await game.click('[data-staff="remote"]');
  await game.waitForFunction(() => document.querySelector('#remote-qr svg') && !document.getElementById('natpf-remote').classList.contains('hidden'));
  await sleep(300);
  await game.screenshot({ path: `${SP}/telecomando-qr-1024x1024.png` });
  // il QR letto come lo legge la fotocamera
  await game.addScriptTag({ path: JSQR });
  const qr = await game.evaluate(async () => {
    const svg = document.querySelector('#remote-qr svg'), xml = new XMLSerializer().serializeToString(svg);
    const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml))); await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = 400; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 400); g.drawImage(img, 0, 0, 400, 400);
    return { text: window.jsQR(g.getImageData(0, 0, 400, 400).data, 400, 400)?.data || null, href: document.getElementById('remote-link').href, code: document.getElementById('remote-code').textContent, session: __natpfTennis.natpfUi.remote.link.session };
  });
  check('QR dello staff: pagina /natpf/tennis/telecomando.html?lan=1 con la sessione «telecomando-…», diverso da quello dei giocatori', qr.text === qr.href && /\/natpf\/tennis\/telecomando\.html\?lan=1#tc=telecomando-[a-z0-9]{26}&k=/.test(qr.text || '') && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(qr.code), JSON.stringify(qr));
  const qrUrl = qr.text.replace(/^https:\/\/[^/]+/, `https://127.0.0.1:${PORT}`);

  // 2) telefono dello staff
  const pctx = await B.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
  const phone = await pctx.newPage(), phoneErr = [];
  phone.on('pageerror', e => phoneErr.push(e.message));
  await phone.goto(qrUrl, { waitUntil: 'domcontentloaded' });
  await phone.waitForFunction(() => window.__telecomando?.state === 'on', null, { timeout: 30000 });
  const paired = await phone.evaluate(() => ({ hash: location.hash, search: location.search, saved: JSON.parse(localStorage.getItem('natpf-telecomando')) }));
  check('telefono abbinato: chiave salvata sul telefono, QR tolto dalla barra degli indirizzi', !paired.hash && paired.search === '?lan=1' && paired.saved?.session === qr.session && /^[a-z0-9]{26}$/.test(paired.saved?.resume || ''), JSON.stringify(paired));
  await game.waitForFunction(() => /collegato ✓/i.test(document.getElementById('remote-state').textContent));
  check('gioco: «Telecomando collegato ✓» e chiave salvata nel gioco', await ui(() => { const v = JSON.parse(localStorage.getItem('natpf-tennis.telecomando')); return __natpfTennis.natpfUi.remote.link.connected && !!v.resume && v.session.startsWith('telecomando-'); }));
  const acks = () => phone.evaluate(() => __telecomando.ackCount || 0);
  const tap = async (c, { confirm = false } = {}) => {
    const n = await acks();
    await phone.click(`[data-c="${c}"]`);
    await phone.waitForFunction(n => (__telecomando.ackCount || 0) > n, n, { timeout: 15000 });
    let a = await phone.evaluate(() => __telecomando.acks.at(-1));
    if (a.ask && confirm){ const m = await acks(); await phone.click('#confirmYes'); await phone.waitForFunction(m => (__telecomando.ackCount || 0) > m, m, { timeout: 15000 }); a = { ...(await phone.evaluate(() => __telecomando.acks.at(-1))), asked: a.ask }; }
    await sleep(350);
    return a;
  };
  const pg = () => phone.evaluate(() => __telecomando.status?.pg);
  const waitPg = (want, ms = 15000) => phone.waitForFunction(w => (Array.isArray(w) ? w : [w]).includes(__telecomando.status?.pg), want, { timeout: ms }).then(() => true, () => false);
  await waitPg('remote');
  check('stato sul telefono: «Telecomando dello staff», con i comandi accesi e spenti con il motivo', await phone.evaluate(() => { const s = __telecomando.status; return s.label === 'Telecomando dello staff' && s.cmds.back === 1 && typeof s.cmds.pause === 'string'; }));
  await phone.screenshot({ path: `${SP}/telecomando-telefono-pannello.png` });
  // Indietro → pannello dello stand; Indietro → menu
  await tap('back'); check('Indietro: dal foglio del telecomando al pannello dello stand', await waitPg('staff'));
  await tap('back'); check('Indietro: pannello chiuso, menu principale', await waitPg('lobby:menu'));
  await phone.screenshot({ path: `${SP}/telecomando-telefono-menu.png` });
  check('menu: «Torna al menu» e «Pausa» spenti con il motivo, «Gioca» acceso', await phone.evaluate(() => { const s = __telecomando.status, b = document.querySelector('[data-c="menu"]'); return s.cmds.menu === 'Sei già al menu principale' && b.classList.contains('off') && /già al menu/.test(b.textContent) && s.cmds.play === 1; }));

  // 3) frecce del menu come la tastiera
  const focus = () => ui(() => document.activeElement?.dataset?.menu || document.activeElement?.dataset?.option || document.activeElement?.id || document.activeElement?.tagName);
  await ui(() => document.querySelector('[data-menu="play"]').focus());
  const seq = [];
  for (const c of ['down', 'down', 'up']){ await tap(c); seq.push(await focus()); }
  check('frecce del telefono = frecce della tastiera nel menu', seq.join() === 'training,challenges,training', seq.join());
  // Opzioni con frecce e OK, poi Indietro
  for (let i = 0; i < 6 && await focus() !== 'options'; i++) await tap(['down', 'right'][i % 2]);
  await tap('ok'); check('OK apre la voce scelta (Opzioni)', await waitPg('lobby:options'));
  await tap('back'); check('Indietro torna al menu', await waitPg('lobby:menu'));

  // 4) percorso fino alla partita
  await tap('play'); check('Gioca dal menu → scelta della racchetta', await waitPg('lobby:controller'));
  await tap('play'); check('Avanti → Collega', await waitPg('lobby:connect'));
  await tap('play'); check('Avanti → «Pronto per la partita»', await waitPg('lobby:match'));
  check('«Pronto per la partita»: il pulsante dice «Gioca!»', await phone.evaluate(() => __telecomando.status.labels.play === 'Gioca!' && document.querySelector('[data-c="play"] b').textContent === 'Gioca!'));
  await game.screenshot({ path: `${SP}/telecomando-pronto-1024x1024.png` });
  // livello della CPU dal telefono
  const cpu0 = await ui(() => document.querySelector('#difficulty-mode-group [data-difficulty].selected')?.dataset.difficulty);
  await tap('cpu'); const cpu1 = await ui(() => document.querySelector('#difficulty-mode-group [data-difficulty].selected')?.dataset.difficulty);
  await tap('cpu'); await tap('cpu'); const cpu3 = await ui(() => document.querySelector('#difficulty-mode-group [data-difficulty].selected')?.dataset.difficulty);
  check('Livello CPU: Facile → Esperta → Leggenda → Facile', cpu0 === 'casual' && cpu1 === 'pro' && cpu3 === 'casual', [cpu0, cpu1, cpu3].join());
  await tap('play');
  check('Gioca! → in partita', await waitPg('match', 25000));
  await sleep(2500);
  const st = await phone.evaluate(() => __telecomando.status);
  check('in partita: pagina «Partita contro la CPU» con il punteggio; frecce e OK spenti', st.label === 'Partita contro la CPU' && /Tu 0 · CPU 0/.test(st.detail) && typeof st.cmds.left === 'string' && typeof st.cmds.ok === 'string' && st.cmds.pause === 1, JSON.stringify({ label: st.label, detail: st.detail, left: st.cmds.left }));
  // (il giocatore aspetta il servizio: senza comandi resta fermo; con le frecce della tastiera si muoverebbe)
  const x0 = await ui(() => __natpfTennis.player.pos.x), n0 = await acks();
  await phone.evaluate(() => { for (let i = 0; i < 8; i++) __telecomando.send('left'); });
  await phone.waitForFunction(n => (__telecomando.ackCount || 0) >= n + 8, n0, { timeout: 30000 }).catch(() => {});
  const left = await phone.evaluate(() => __telecomando.acks.at(-1)), x1 = await ui(() => __natpfTennis.player.pos.x);
  check('in partita le frecce non muovono il giocatore (il telefono dice perché)', left.ok === false && /Pausa/.test(left.msg) && Math.abs(x1 - x0) < 0.05, JSON.stringify({ left, x0, x1 }));
  await phone.screenshot({ path: `${SP}/telecomando-telefono-partita.png` });
  await game.screenshot({ path: `${SP}/telecomando-partita-1024x1024.png` });
  void x0;
  await tap('pause'); check('Pausa', await waitPg('pause'));
  const p0 = await ui(() => document.activeElement?.dataset?.pause);
  await tap('up'); const p1 = await ui(() => document.activeElement?.dataset?.pause);
  check('nella pausa le frecce spostano il fuoco tra i pulsanti', p0 === 'resume' && p1 && p1 !== p0, `${p0} → ${p1}`);
  await tap('back'); check('Indietro nella pausa = Riprendi', await waitPg('match'));
  await tap('back'); check('Indietro in campo = Pausa', await waitPg('pause'));
  await game.screenshot({ path: `${SP}/telecomando-pausa-1024x1024.png` });
  const menu = await tap('menu', { confirm: true });
  check('Torna al menu chiede conferma sul telefono, poi menu principale', !!menu.asked && await waitPg('lobby:menu'), JSON.stringify(menu));

  // 5) Nuovo giocatore dalla pagina «Pronto per la partita»: nome (Salta) e di nuovo «Pronto»
  await tap('play'); await tap('play'); await tap('play'); await waitPg('lobby:match');
  await tap('newplayer'); check('Nuovo giocatore → «Come ti chiami?»', await waitPg('nick'));
  check('«Salta il nome» acceso', await phone.evaluate(() => __telecomando.status.cmds.skip === 1 && /nome/.test(__telecomando.status.labels.skip)));
  await game.screenshot({ path: `${SP}/telecomando-nome-1024x1024.png` });
  await tap('skip'); check('Salta → di nuovo «Pronto per la partita»', await waitPg('lobby:match'));

  // 6) schermo del gioco e schermo intero (ponte del programma Windows finto)
  const s1 = await phone.evaluate(() => __telecomando.status.hints.screen);
  await tap('screen'); await sleep(500);
  const s2 = await phone.evaluate(() => ({ hint: __telecomando.status.hints.screen, ack: __telecomando.acks.at(-1).msg }));
  check('Schermo del gioco dal telefono: monitor successivo (e il telefono dice quale)', /1024×1024/.test(s1) && /Monitor 1/.test(s2.ack) && await ui(() => window.__desk.moves.join() === '1'), JSON.stringify({ s1, s2 }));
  await tap('screen');
  const f0 = await ui(() => __natpfTennis.natpfUi.screen.fullscreen.frameless);
  await tap('fullscreen'); const f1 = await ui(() => __natpfTennis.natpfUi.screen.fullscreen.frameless);
  await tap('fullscreen'); const f2 = await ui(() => __natpfTennis.natpfUi.screen.fullscreen.frameless);
  check('Schermo intero sì/no dal telefono (programma Windows)', f0 && !f1 && f2, [f0, f1, f2].join());

  // 7) ripresa da sola: gioco ricaricato, pagina del telefono ricaricata, server riavviato
  await game.reload({ waitUntil: 'domcontentloaded' }); await ready();
  await ui(() => { const I = __natpfTennis.natpfUi.intro; if (I.active){ I.finishAnimation(); I.start(); } });
  const back1 = await phone.waitForFunction(() => __telecomando.state === 'on' && __telecomando.status?.pg?.startsWith('lobby:'), null, { timeout: 40000 }).then(() => true, () => false);
  check('gioco ricaricato: il telefono si ricollega da solo, stesso id di sessione', back1 && await ui(s => __natpfTennis.natpfUi.remote.link.session === s && __natpfTennis.natpfUi.remote.link.connected, qr.session));
  await phone.reload({ waitUntil: 'domcontentloaded' });
  check('pagina del telefono ricaricata (senza QR): si ricollega da sola', await phone.waitForFunction(() => __telecomando.state === 'on', null, { timeout: 30000 }).then(() => true, () => false));
  // PC spento: server e gioco chiusi (il canale WebRTC è diretto tra i due: con il solo server spento il telecomando
  // resta collegato e comanda ancora il gioco aperto)
  await stopServer(); await game.goto('about:blank');
  check('PC spento: il telefono lo dice e riprova da solo', await phone.waitForFunction(() => __telecomando.state !== 'on', null, { timeout: 20000 }).then(() => true, () => false));
  await sleep(3000);
  await startServer();
  await game.goto(GAME, { waitUntil: 'domcontentloaded' }); await ready();
  await ui(() => { const I = __natpfTennis.natpfUi.intro; if (I.active){ I.finishAnimation(); I.start(); } });
  check('PC riavviato (server e gioco di nuovo su): il telefono si ricollega da solo', await phone.waitForFunction(() => __telecomando.state === 'on', null, { timeout: 60000 }).then(() => true, () => false));
  await waitPg('lobby:menu');

  // 8) rifiuti
  const p2ctx = await B.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
  const other = await p2ctx.newPage();
  await other.goto(qrUrl, { waitUntil: 'domcontentloaded' });
  await other.waitForFunction(() => __telecomando.state === 'unpaired', null, { timeout: 20000 });
  check('secondo telefono con il QR già usato: rifiutato, il telecomando vero resta collegato', await other.evaluate(() => !document.getElementById('setup').classList.contains('hidden') && /Codice/.test(document.getElementById('setup-why').textContent)) && await phone.evaluate(() => __telecomando.state === 'on'));
  await other.fill('#code', 'ABCD-EFGH'); await other.click('#codeGo');
  check('codice sbagliato: «Codice non trovato»', await other.waitForFunction(() => /non trovato/.test(document.getElementById('msg').textContent), null, { timeout: 20000 }).then(() => true, () => false));
  // racchetta: QR dei giocatori aperto nella pagina del telecomando, e hello della racchetta all'indirizzo del telecomando
  const playerQr = await ui(async () => { await __natpfTennis.natpfPhone.start(); return __natpfTennis.natpfPhone.pairingUrl; });
  const hashOnly = playerQr.slice(playerQr.indexOf('#'));
  await other.goto(`https://127.0.0.1:${PORT}/natpf/tennis/telecomando.html?lan=1${hashOnly}`, { waitUntil: 'domcontentloaded' }); await sleep(800);
  check('pagina del telecomando con il QR dei giocatori: non abbinata', await other.evaluate(() => __telecomando.state === 'unpaired' && !localStorage.getItem('natpf-telecomando')));
  const roles = await other.evaluate(async ({ remote, racket }) => {
    const { LanPeer } = await import('/natpf/js/tennis/lan-transport.js');
    const ask = (to, hello) => new Promise(res => { const p = new LanPeer(); const t = setTimeout(() => { p.destroy(); res('nessuna risposta'); }, 8000); p.on('open', () => { const c = p.connect(to); c.on('open', () => c.send(hello)); c.on('data', d => { clearTimeout(t); p.destroy(); res(d); }); }); });
    return { asRacket: await ask(remote.session, { t: 'hello', v: 2, k: remote.token }), asRemote: await ask(racket.session, { t: 'hello', role: 'remote', v: 1, k: racket.token }) };
  }, { remote: await ui(() => ({ session: __natpfTennis.natpfUi.remote.link.session, token: __natpfTennis.natpfUi.remote.link.token })), racket: await ui(() => ({ session: __natpfTennis.natpfPhone.link.session, token: __natpfTennis.natpfPhone.link.token })) });
  check('la racchetta non diventa telecomando e il telecomando non diventa racchetta (anche con il codice giusto)', roles.asRacket?.why === 'role' && roles.asRemote?.why === 'role' && await ui(() => !__natpfTennis.natpfPhone.connected), JSON.stringify(roles));
  // racchetta vera collegata: lo stato del telefono del giocatore arriva al telecomando
  const rctx = await B.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
  const racket = await rctx.newPage();
  await racket.goto(playerQr.replace(/^https:\/\/[^/]+/, `https://127.0.0.1:${PORT}`), { waitUntil: 'domcontentloaded' });
  await racket.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  check('telefono del giocatore collegato: lo dice anche il telecomando', await phone.waitForFunction(() => __telecomando.status?.phone?.connected === true || /collegato/.test(document.getElementById('player').textContent), null, { timeout: 10000 }).then(() => true, () => false));
  await rctx.close();

  // 9) schermate della matrice
  const layer = async (name, open, pgWant, close = 'back', after = 'lobby:menu') => {
    await ui(open); await sleep(400);
    const seen = await waitPg(pgWant, 6000);
    await tap(close);
    const gone = await waitPg(after, 8000);
    check(`${name}: il telefono la riconosce (${pgWant}) e ${close === 'back' ? 'Indietro' : close} la chiude`, seen && gone, `${await pg()}`);
  };
  await layer('guida «Come si gioca»', () => __natpfTennis.natpfUi.onboarding.open(), 'guide');
  await layer('calibrazione dello schermo', () => __natpfTennis.natpfUi.calibra.open(), 'calibra');
  await layer('diagnostica', () => __natpfTennis.natpfUi.diag.open(), 'diag');
  await layer('pannello del telefono', () => __natpfTennis.natpfUi.openPhone(), 'phonePanel');
  await layer('finestra del certificato', () => document.getElementById('connect-certificate-dialog').showModal(), 'dialog');
  await tap('staff'); check('Pannello dell’addetto dal telefono: si apre', await waitPg('staff'));
  await tap('staff'); check('… e si chiude', await waitPg('lobby:menu'));
  // rivedi i gesti dal menu
  await tap('gestures'); check('Rivedi i gesti: la modale del tutorial', await waitPg('tutorial'));
  const tutKeys = await ui(() => __natpfTennis.natpfUi.training.tutorial.state?.idx ?? null);
  await tap('right'); const tutKeys2 = await ui(() => __natpfTennis.natpfUi.training.tutorial.state?.idx ?? null);
  await game.screenshot({ path: `${SP}/telecomando-gesti-1024x1024.png` });
  await tap('back');
  check('nel tutorial → sfoglia le schede, Indietro chiude', tutKeys2 === tutKeys + 1 && await waitPg('lobby:menu'), `${tutKeys} → ${tutKeys2}`);
  // fine partita
  await ui(() => __natpfTennis.hud.showVictoryModal({ playerWon: true, playerGames: 1, opponentGames: 0 }));
  check('fine partita: riconosciuta, «Gioca ancora» acceso', await waitPg('victory') && await phone.evaluate(() => __telecomando.status.labels.play === 'Gioca ancora'));
  await game.screenshot({ path: `${SP}/telecomando-fine-1024x1024.png` });
  await tap('back'); check('fine partita: Indietro = Menu', await waitPg('lobby:menu'));
  // minigioco: Indietro = pausa, Torna al menu con conferma
  // (dalla pagina «Minigiochi»: il primo minigioco, con il nome già scritto; poi Avanti dal telefono fino al campo)
  await ui(() => { const L = __natpfTennis.natpfUi.lobby; __natpfTennis.natpfUi.events.nickname = 'Prova'; L.go('challenges'); });
  await sleep(600);
  await ui(() => __natpfTennis.natpfUi.lobby.pickChallenge(document.querySelector('[data-challenge]').dataset.challenge));
  for (let i = 0; i < 6 && !['minigame', 'match'].includes(await pg()); i++){ if ((await pg() || '').startsWith('lobby:')) await tap('play'); await sleep(800); }
  const mg = await waitPg('minigame', 15000);
  check('minigioco in corso: pagina «Minigioco: …»', mg, await pg());
  if (mg){
    await tap('back'); check('minigioco: Indietro = pausa', await waitPg('pause'));
    const r = await tap('menu', { confirm: true }); check('minigioco: Torna al menu con conferma', !!r.asked && await waitPg('lobby:menu'));
  }
  // chiosco: lo stand torna libero, il telecomando resta collegato
  await ui(() => __natpfTennis.natpfUi.kiosk.reset()); await sleep(600);
  check('chiosco che azzera lo stand: il telecomando resta collegato e vede il menu', await phone.evaluate(() => __telecomando.state === 'on' && __telecomando.status.pg === 'lobby:menu'));
  // intro dal telefono: Salta
  await ui(() => __natpfTennis.natpfUi.intro.play('short')); await sleep(300);
  check('intro riconosciuta', await waitPg('intro'));
  await tap('skip'); check('Salta l’intro → menu', await waitPg('lobby:menu'));

  // altre pagine del menu: Modalità (OK su «Gioca»), Classifica, Minigiochi, stesso schermo
  await ui(() => { __natpfTennis.natpfUi.lobby.go('menu'); document.querySelector('[data-menu="play"]').focus(); });
  await tap('ok'); check('OK su «Gioca» → Modalità', await waitPg('lobby:mode'));
  await tap('back'); check('Modalità: Indietro → menu', await waitPg('lobby:menu'));
  for (const [step, label] of [['ranking', 'Classifica del giorno'], ['challenges', 'Minigiochi']]){
    await ui(s => __natpfTennis.natpfUi.lobby.go(s), step);
    const seen = await waitPg(`lobby:${step}`) && await phone.evaluate(l => __telecomando.status.label === l, label);
    await tap('back');
    check(`${label}: riconosciuta, Indietro → menu`, seen && await waitPg('lobby:menu'));
  }
  await ui(() => { const L = __natpfTennis.natpfUi.lobby; L.setMode('split'); L.go('connect'); });
  const split = await waitPg('lobby:connect') && await phone.evaluate(() => /Stesso schermo/.test(__telecomando.status.label) && /due telefoni/.test(__telecomando.status.cmds.play) && typeof __telecomando.status.cmds.cpu === 'string');
  await tap('back');
  check('stesso schermo, pagina dei due telefoni: «Avanti» spento con il motivo, niente CPU; Indietro → Modalità', split && await waitPg('lobby:mode'));
  await tap('menu'); await waitPg('lobby:menu');
  // Allenamento dal menu (mouse e tastiera): lezione in campo con frecce e OK, Salta, Indietro = pausa, Menu
  // (lo stesso schermo ha scelto i telefoni: si torna a mouse e tastiera come all'inizio)
  await ui(() => { const ui = __natpfTennis.natpfUi; ui.lobby.setMode('cpu'); ui.selectController('mouse', { open: false }); ui.lobby.menu('training'); });
  await waitPg('lobby:controller'); await tap('play'); await waitPg('lobby:connect'); await tap('play');
  const inTraining = await waitPg(['lesson', 'training'], 20000);
  const where = await pg();
  check('Allenamento: in campo (lezione o esercizi)', inTraining, where);
  if (where === 'lesson'){
    const i0 = await ui(() => __natpfTennis.natpfUi.training.lesson?.idx);
    await tap('right'); const i1 = await ui(() => __natpfTennis.natpfUi.training.lesson?.idx);
    check('lezione: → del telefono = scheda successiva', i1 === i0 + 1, `${i0} → ${i1}`);
  }
  check('in campo: «Salta» acceso', await phone.evaluate(() => __telecomando.status.cmds.skip === 1));
  await tap('back'); check('in campo: Indietro = pausa', await waitPg('pause'));
  const tm = await tap('menu', { confirm: true });
  check('Allenamento: Torna al menu con conferma', !!tm.asked && await waitPg('lobby:menu'));
  await ui(() => __natpfTennis.natpfUi.lobby.setMode('cpu'));

  // 10) «Scollega il telecomando» e abbinamento con il codice
  await ui(() => __natpfTennis.natpfUi.remote.open()); await sleep(500);
  await game.evaluate(() => { window.confirm = () => true; });
  await game.click('[data-remote="forget"]');
  check('«Scollega il telecomando»: il telefono lo sa e chiede di abbinarsi di nuovo', await phone.waitForFunction(() => __telecomando.state === 'unpaired' && !localStorage.getItem('natpf-telecomando'), null, { timeout: 10000 }).then(() => true, () => false));
  await phone.screenshot({ path: `${SP}/telecomando-telefono-non-abbinato.png` });
  const code = await ui(() => document.getElementById('remote-code').textContent);
  await phone.fill('#code', code.toLowerCase()); await phone.click('#codeGo');
  const byCode = await phone.waitForFunction(s => __telecomando.state === 'on' && __telecomando.saved?.session === s, qr.session, { timeout: 30000 }).then(() => true, () => false);
  check('abbinato di nuovo con il codice scritto a mano (indirizzo fisso salvato)', byCode, byCode ? code : JSON.stringify({ code, phone: await phone.evaluate(() => ({ st: __telecomando.state, why: __telecomando.why, msg: document.getElementById('msg').textContent, link: document.getElementById('link').textContent, saved: __telecomando.saved })), game: await ui(() => ({ S: __natpfTennis.natpfUi.remote.link.S, code: __natpfTennis.natpfUi.remote.link.code })) }));
  await tap('back'); await waitPg(['staff', 'lobby:menu']);

  check('nessun errore JavaScript nel gioco e nel telefono', !gameErr.length && !phoneErr.length, [...gameErr, ...phoneErr].join(' | ').slice(0, 400));
  await p2ctx.close(); await pctx.close(); await gctx.close();
} catch (e){
  check('prova del telecomando', false, e.stack?.slice(0, 800));
} finally {
  await B?.close();
  await stopServer();
  fs.rmSync(DATA, { recursive: true, force: true });
  summary();
  setTimeout(() => process.exit(), 300);
}
