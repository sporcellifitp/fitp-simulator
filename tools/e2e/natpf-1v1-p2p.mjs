// NATPF motore base (natpf-tennis/): sfida tra due computer sul sito statico, con due sessioni del browser vere.
// Serve la build (natpf-tennis/dist) come farebbe Cloudflare Pages, senza /api/match: l'host tiene il relay in memoria
// e il Player 2 si collega con WebRTC (PeerJS) attraverso un server di segnalazione locale (?peer=…).
// Il percorso è quello di chi gioca, con i comandi veri dell'interfaccia:
//   1. P1: «Sfida un amico» → la stanza nasce e l'invito (codice, link, stato «in attesa») è già in vista nella pagina
//      della racchetta, poi in tutti i passi fino alla partita;
//   2. il link porta stanza, ruolo, rete p2p e server di segnalazione;
//   3. P2 apre il gioco e scrive il codice («Ti hanno invitato?»): entra nella stanza, l'host lo vede entrato, «Gioca»
//      resta bloccato;
//   4. P2 «Sono pronto»: l'host lo vede pronto, «Gioca» si sblocca; (B9) il pulsante del P2 diventa verde pieno
//      «Pronto ✓» con «Annulla» accanto e la sua scheda dice che l'host lo vede; un secondo clic non lo toglie,
//      «Annulla» sì («Gioca» dell'host torna grigio); schede e pulsanti fotografati a 1280×720, 1920×1080 e ledwall;
//   5. «Gioca»: si gioca al meglio di 3, servono tutti e due, punteggio uguale sulle due sessioni;
//      Il P2 colpisce con i dati del telefono (~1,4 KB a colpo, come natpf_phone_racket.js): fino al 30/10 dopo una decina
//      di suoi colpi lo stato della partita superava i 16300 byte, PeerJS lo scartava e il P2 restava su «collegamento
//      perso» (verso la fine del primo game); ora si gioca oltre i 15 colpi del P2 e il P2 resta aggiornato;
//   6. P2 chiude la pagina: l'host si ferma con la spiegazione; P2 rientra con il link: ha subito il punteggio, l'host
//      aspetta che abbia la racchetta pronta (dal 30/10), poi si riprende con il conto alla rovescia;
//   7. P1 sceglie «Contro la CPU»: il P2 vede «stanza chiusa»; un link a una stanza che non esiste lo dice; aperto sul
//      telefono, l'invito dice di aprirlo sul computer;
//   8. rete che blocca il collegamento diretto (candidati ICE riscritti su un indirizzo irraggiungibile, su tutti e due i
//      computer): host e P2 lo dicono con i consigli; rete di nuovo libera → il P2 entra da solo.
//   cd natpf-tennis && node node_modules/vite/bin/vite.js build
//   cd tools/e2e && npm ci && CHROMIUM_PATH=/percorso/chrome node natpf-1v1-p2p.mjs
// Giocatori automatici con gli eventi del mouse: non sostituiscono due persone su due computer e una rete vera.
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), DIST = path.resolve(process.env.DIST || path.resolve(here, '../../natpf-tennis/dist'));   // DIST=cartella: per provare lo zip estratto
if (!fs.existsSync(path.join(DIST, 'index.html'))){ console.log('Manca natpf-tennis/dist: eseguire prima la build'); process.exit(1); }
const PEER_PORT = +(process.env.PEER_PORT || 9117), GAME_PORT = +(process.env.GAME_PORT || 3117);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T0 = Date.now(), log = m => console.log(`[${((Date.now() - T0)/1000).toFixed(0).padStart(3)} s] ${m}`);

const peerApp = express(), peerServer = http.createServer(peerApp);
peerApp.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const site = express();
site.use('/api', (req, res) => res.status(404).send('sito statico'));   // come Cloudflare Pages: nessun relay sul server
site.use(express.static(DIST));
const gameServer = await new Promise(r => { const s = site.listen(GAME_PORT, '127.0.0.1', () => r(s)); });
const stop = () => { peerServer.close(); gameServer.close(); };
const GAME = `http://127.0.0.1:${GAME_PORT}`;

// giocatore automatico (gli stessi eventi del mouse): lancio e colpo al servizio, swing quando la palla arriva vicino
const BOT = () => {
  let last = 0;
  window.__served = { player: 0, opponent: 0 }; window.__maxRally = 0; window.__hits = 0; window.__maxAge = 0;
  // colpo del P2 con i dati del telefono (stessa forma e misura di natpf_phone_racket.js), lancio senza
  const NATPF = { aim: 'face', shot: 'topspin', face: { yaw: 0, pitch: 0, roll: 0 }, head: .12, v: .5, move: 'h', conf: .8, speed: 3.2, power: .81, latency: .06, hand: 'right',
    why: ['dritto', 'salita 0,12 sopra il solito', 'piatto 8° a destra', 'tempo giusto'], prep: { lead: .23, amount: .7 }, prepCapable: true, intent: { shot: 'topspin', conf: .8, power: .7, why: ['gesto orizzontale', 'mano che sale un poco'] }, peak: 612 };
  const hit = mc => { window.__hits++; return __natpfTennis.playerRole === 'p2' ? mc._emitSwing({ source: 'synthetic', speed: 1.18, dirX: 0, dirY: -.45, natpf: NATPF, hand: 'right' }) : mc.triggerSyntheticSwing({}); };
  clearInterval(window.__bot);
  window.__bot = setInterval(() => {
    const e = window.__natpfTennis, mc = e.motionController, me = e.playerRole === 'p2' ? 'opponent' : 'player', a = e[me], b = e.ball, now = performance.now();
    window.__maxRally = Math.max(window.__maxRally || 0, b.rallyStrokeCount || 0);
    const G = e.versusGuest; if (G?.lastSnapshotAt && G.lobby === false) window.__maxAge = Math.max(window.__maxAge, now - G.lastSnapshotAt);
    if (now - last < 380) return;
    if (e.phase === 'SERVE_STANCE' && e.score.server === me){ last = now + 400; mc.triggerSyntheticSwing({ type: 'toss' }); }
    else if (e.phase === 'SERVE_TOSS' && e.score.server === me && b.vel.y < 0){ last = now; window.__served[me]++; hit(mc); }
    // dopo una decina di colpi si lascia passare la palla: due giocatori automatici perfetti non sbagliano mai e uno
    // scambio poteva durare più del tempo della prova (154 colpi in 4 minuti), senza mai arrivare al cambio del servizio
    else if (e.phase === 'RALLY' && b.inPlay && (b.rallyStrokeCount || 0) < 10 && (a.pos.z - b.pos.z)*b.vel.z > 0 && Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 1.7){ last = now; hit(mc); }
  }, 8);
};
// il disegno con WebGL software rallenta i fotogrammi a 1–2 s: si toglie solo il render, la partita resta
const NO_RENDER = () => { const e = window.__natpfTennis; e.render = () => {}; };
// schermata dell'interfaccia sopra l'ultimo fotogramma disegnato: niente fotogramma nuovo, che con WebGL software ferma
// la pagina per secondi (l'host tiene il relay: il P2 risultava «collegamento perso» nelle schermate)
const OUT = path.join(SP, 'versus-ready'); fs.mkdirSync(OUT, { recursive: true });
const shot = async (p, name) => { await sleep(300); await p.screenshot({ path: `${OUT}/${name}.png` }); log('schermata ' + name); };
const GREEN = 'rgb(54, 224, 122)';
// pannello del Player 2: pulsante (scritta, colore calcolato, aria-pressed), «Annulla», schede, riga di stato
const p2View = p => p.evaluate(() => {
  const m = document.getElementById('natpf-guest-modal'), go = document.getElementById('natpf-guest-go'), un = m.querySelector('[data-versus-unready]');
  const slot = id => { const el = m.querySelector(`[data-versus-board] [data-ready-slot="${id}"]`); return el ? `${el.dataset.ready}:${el.querySelector('[data-ready-word]').textContent}:${el.querySelector('[data-ready-detail]').textContent}` : null; };
  const r = go.getBoundingClientRect();
  return { label: go.textContent, bg: getComputedStyle(go).backgroundColor, pressed: go.getAttribute('aria-pressed'), cancel: !!un && !un.classList.contains('hidden'), me: slot('p2'), host: slot('p1'), line: document.querySelector('[data-versus-guest]')?.dataset.state, goInView: r.top >= 0 && r.bottom <= innerHeight };
});
// barra dell'invito dell'host: schede e «Gioca» (spento, classe, colore calcolato)
const hostView = p => p.evaluate(() => {
  const b = document.getElementById('btn-start-match');
  return { slots: [...document.querySelectorAll('#natpf-invite [data-versus-board] [data-ready-slot]')].map(s => `${s.dataset.readySlot}:${s.dataset.ready}`).join(), disabled: b.disabled, wait: b.classList.contains('is-wait'), bg: getComputedStyle(b).backgroundColor, label: b.textContent.trim() };
});
const ready = p => p.waitForFunction(() => window.__natpfTennis?.player?.model && window.__natpfTennis.racketKinematics && window.__natpfTennis.natpfUi?.versus, null, { timeout: 120000 });
// riga di stato della barra dell'invito dell'host: stato (on · ok · error) e testo
const line = p => p.evaluate(() => { const el = document.querySelector('#natpf-invite [data-versus-state]'); return el ? `${el.dataset.state}: ${el.textContent}` : ''; });
const inviteShown = p => p.evaluate(() => { const b = document.getElementById('natpf-invite'); return !!b && !b.classList.contains('hidden') && b.getBoundingClientRect().height > 0; });
// rete che blocca il collegamento diretto: i candidati dell'altro computer finiscono su un indirizzo irraggiungibile
// (TEST-NET-3) finché window.__blockIce è vero; la segnalazione resta libera, come con un firewall o un NAT simmetrico
const BLOCK_ICE = () => {
  window.__blockIce = true;
  const add = RTCPeerConnection.prototype.addIceCandidate;
  RTCPeerConnection.prototype.addIceCandidate = function(c, ...rest){
    if (window.__blockIce && c && typeof c === 'object' && c.candidate){
      const f = String(c.candidate).split(' ');
      if (f.length > 5){ f[4] = '203.0.113.9'; c = { candidate: f.join(' '), sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex, usernameFragment: c.usernameFragment }; }
    }
    return add.call(this, c, ...rest);
  };
};
const guestStatus = p => p.evaluate(() => document.querySelector('[data-versus-guest]')?.dataset.state || '');
const state = p => p.evaluate(() => { const e = __natpfTennis; return { score: ['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => e.score[k]), server: e.score.server, phase: e.phase, rally: window.__maxRally, served: window.__served, gamesToWin: e.matchConfig.gamesToWin, hits: window.__hits, maxAge: Math.round(window.__maxAge || 0), guest: document.querySelector('[data-versus-guest]')?.dataset.state || null }; });
const until = async (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);

const B = await launch();
try {
  /* 1–2: il P1 crea la stanza dal menu */
  const { p: p1, errs: e1 } = await page(B, `${GAME}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1100, h: 680 });
  await ready(p1); await p1.evaluate(NO_RENDER); log('P1 pronto');
  await p1.evaluate(() => {
    const ui = __natpfTennis.natpfUi;
    ui.testInput = true; ui.selectController('mouse', { open: false });       // racchetta di prova: mouse
    ui.lobby.menu('play');
    document.querySelector('[data-mode="friend"]').click();                   // «Sfida un amico»: si va alla racchetta
  });
  await until(p1, () => document.querySelector('#natpf-invite a')?.href && __natpfTennis.natpfP2p?.status === 'waiting');
  const invite = await p1.evaluate(() => document.querySelector('#natpf-invite a').href), u = new URL(invite);
  const code = await p1.evaluate(() => document.querySelector('[data-room-code]')?.textContent);
  log('invito ' + invite);
  check('1. «Sfida un amico»: codice e link già in vista nella pagina della racchetta', /^AT-[A-Z0-9]{4}$/.test(code || '') && u.searchParams.get('room') === code && await inviteShown(p1) && await p1.evaluate(() => __natpfTennis.natpfUi.lobby.step === 'controller'), code);
  await p1.evaluate(() => __natpfTennis.natpfUi.lobby.go('connect'));
  const onConnect = await inviteShown(p1);
  await p1.evaluate(() => { __natpfTennis.natpfUi.lobby.go('match'); document.querySelector('#match-length-group [data-games="3"]')?.click(); }); // al meglio di 3: il servizio passa al P2
  check('   l’invito resta in vista anche in «Collega» e in «Partita»', onConnect && await inviteShown(p1));
  check('2. link: stanza, role=p2, net=p2p e server di segnalazione', u.searchParams.get('role') === 'p2' && u.searchParams.get('net') === 'p2p' && u.searchParams.get('peer') === `127.0.0.1:${PEER_PORT}`, invite);
  check('   riga «in attesa» e «Gioca» bloccato', /^on: In attesa di Player 2: mandagli il link/.test(await line(p1)) && await p1.evaluate(() => document.getElementById('btn-start-match').disabled), await line(p1));

  /* 3–4: il P2 entra con il codice e si dichiara pronto */
  const { ctx: c2, p: p2, errs: e2 } = await page(B, `${GAME}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1100, h: 680 });
  await ready(p2);
  await p2.evaluate(() => __natpfTennis.natpfUi.lobby.go('mode'));
  await p2.fill('#join-code', code.toLowerCase().replace('-', ' '));
  await Promise.all([p2.waitForURL(/role=p2/, { timeout: 30000 }), p2.click('#join-form button[type="submit"]')]);
  const joinedUrl = new URL(p2.url());
  check('3. P2 scrive il codice: pagina del Player 2 con stanza, ruolo, rete p2p e server di segnalazione', joinedUrl.searchParams.get('room') === code && joinedUrl.searchParams.get('role') === 'p2' && joinedUrl.searchParams.get('net') === 'p2p' && joinedUrl.searchParams.get('peer') === `127.0.0.1:${PEER_PORT}`, p2.url());
  await ready(p2); await p2.evaluate(NO_RENDER); log('P2 pronto');
  const p2linked = await until(p2, () => document.querySelector('[data-versus-guest]')?.dataset.state === 'lobby');
  check('   P2 collegato all’host con WebRTC, pannello «Sono pronto»', p2linked && await p2.evaluate(() => __natpfTennis.playerRole === 'p2' && __natpfTennis.natpfP2p.status === 'connected'), await guestStatus(p2));
  const joined = await until(p1, () => /è entrato/.test(document.querySelector('#natpf-invite [data-versus-state]')?.textContent || ''));
  check('   l’host vede il P2 entrato, «Gioca» ancora bloccato', joined && await p1.evaluate(() => document.getElementById('btn-start-match').disabled), await line(p1));
  // B15 (mancini, secondo giro): la mano viaggia nei due sensi appena è scelta, prima di qualunque colpo (il P2 nella
  // lettura dello stato, l'host negli snapshot della lobby). Prima: il P2 solo con il primo colpo, l'host mai
  const hands = async (h1, h2) => {
    await p1.evaluate(h => __natpfTennis.natpfUi.hand.set(h), h1); await p2.evaluate(h => __natpfTennis.natpfUi.hand.set(h), h2);
    const onHost = await until(p1, h => { const e = __natpfTennis; return e.natpfP2Hand === h && Math.sign(e.opponent.root.scale.x) === (h === 'left' ? -1 : 1); }, h2, 15000);
    const onGuest = await until(p2, h => { const e = __natpfTennis; return e.player.natpfHand === h && Math.sign(e.player.root.scale.x) === (h === 'left' ? -1 : 1); }, h1, 15000);
    return { onHost, onGuest, info: JSON.stringify({ host: await p1.evaluate(() => ({ p2: __natpfTennis.natpfP2Hand, sx: __natpfTennis.opponent.root.scale.x, hits: window.__hits || 0 })), guest: await p2.evaluate(() => ({ p1: __natpfTennis.player.natpfHand, sx: __natpfTennis.player.root.scale.x })) }) };
  };
  let hv = await hands('left', 'left');
  check('   mancini: l’host sa la mano del P2 e il P2 quella dell’host prima di qualunque colpo (personaggi specchiati)', hv.onHost && hv.onGuest, hv.info);
  hv = await hands('right', 'right');
  check('   di nuovo destri: tutti e due tornano destri sui due computer', hv.onHost && hv.onGuest, hv.info);
  await p2.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.testInput = true; ui.selectController('mouse', { open: false }); });
  await sleep(400);
  let g2 = await p2View(p2), h1 = await hostView(p1);
  check('   P2 prima del clic: «Sono pronto» giallo senza ✓, niente «Annulla», scheda «si prepara»', g2.label === 'Sono pronto' && g2.bg !== GREEN && !g2.cancel && /^prep:/.test(g2.me) && g2.line === 'lobby', JSON.stringify(g2));
  check('   host: schede «tu» pronto e Player 2 «si prepara», «Gioca» grigio (non giallo spento)', h1.slots === 'p1:ready,p2:prep' && h1.disabled && h1.wait && h1.bg !== 'rgb(227, 255, 54)', JSON.stringify(h1));
  for (const [p, w, h] of [[p2, 1280, 720], [p1, 1280, 720]]) await p.setViewportSize({ width: w, height: h });
  await sleep(300);
  check('   P2 a 1280×720: il pulsante si vede senza scorrere (piede del pannello fisso)', (await p2View(p2)).goInView);
  await shot(p2, 'p2-1-prima-1280'); await shot(p1, 'host-1-p2-si-prepara-1280');
  const tClick = Date.now();
  await p2.evaluate(() => document.getElementById('natpf-guest-go').click());
  const ready2 = await until(p1, () => document.querySelector('#natpf-invite [data-versus-state]')?.dataset.state === 'ok' && !document.getElementById('btn-start-match').disabled);
  log(`dal clic del P2 a «Gioca» acceso sull'host: ${Date.now() - tClick} ms (con il passaggio dallo script)`);
  check('4. P2 «Sono pronto»: l’host lo vede pronto e «Gioca» si sblocca', ready2, await line(p1));
  const seen = await until(p2, () => /lo vede ✓/.test(document.querySelector('#natpf-guest-modal [data-ready-slot="p2"] [data-ready-detail]')?.textContent || ''), null, 8000);
  await sleep(500);   // colori a transizione finita (il fondo di «Gioca» passa dal grigio al giallo in ~0,2 s)
  g2 = await p2View(p2); h1 = await hostView(p1);
  check('   P2: «Pronto ✓» verde pieno, «Annulla» accanto, riga verde, la sua scheda dice che l’host lo vede', seen && g2.label === 'Pronto ✓' && g2.bg === GREEN && g2.pressed === 'true' && g2.cancel && /^ready:Pronto:.* lo vede ✓$/.test(g2.me) && g2.line === 'ready', JSON.stringify(g2));
  check('   P2: la scheda dell’host dice la sua racchetta (snapshot della lobby)', /^ready:Pronto:racchetta pronta$/.test(g2.host || ''), g2.host);
  check('   host: Player 2 «pronto», «Gioca ›» giallo e attivo', h1.slots === 'p1:ready,p2:ready' && !h1.disabled && !h1.wait && h1.bg === 'rgb(227, 255, 54)' && /Gioca/.test(h1.label), JSON.stringify(h1));
  await shot(p2, 'p2-2-pronto-1280'); await shot(p1, 'host-2-p2-pronto-1280');
  // un secondo clic sul pulsante verde non toglie il pronto (prima sì, senza avviso)
  await p2.evaluate(() => document.getElementById('natpf-guest-go').click());
  await sleep(1200);
  check('   P2: un secondo clic su «Pronto ✓» non lo toglie, l’host resta con «Gioca» attivo', (await p2.evaluate(() => __natpfTennis.natpfUi.versus.ready)) && !(await hostView(p1)).disabled);
  // «Annulla»: non pronto, l'host lo vede («Gioca» grigio di nuovo); poi di nuovo pronto
  await p2.evaluate(() => document.querySelector('#natpf-guest-modal [data-versus-unready]').click());
  const unready = await until(p1, () => document.getElementById('btn-start-match').disabled, null, 8000);
  await sleep(500);
  g2 = await p2View(p2); h1 = await hostView(p1);
  check('   «Annulla»: il P2 torna «Sono pronto» giallo, l’host «Gioca» grigio e spento', unready && g2.label === 'Sono pronto' && g2.bg !== GREEN && !g2.cancel && h1.wait && h1.slots === 'p1:ready,p2:prep', JSON.stringify({ g2, h1 }));
  await p2.evaluate(() => document.getElementById('natpf-guest-go').click());
  check('   di nuovo «Sono pronto»: l’host lo rivede pronto', await until(p1, () => !document.getElementById('btn-start-match').disabled, null, 8000));
  // le stesse schede a 1920×1080 e, sull'host, in un'area di ledwall 720×720 (come ?area=0,0,720,720)
  for (const p of [p1, p2]) await p.setViewportSize({ width: 1920, height: 1080 });
  await sleep(500);
  await shot(p2, 'p2-3-pronto-1920'); await shot(p1, 'host-3-pronto-1920');
  for (const p of [p1, p2]){ await p.setViewportSize({ width: 1280, height: 720 }); await p.evaluate(() => __natpfTennis.natpfUi.screen.restore({ preset: 'full', area: { x: 0, y: 0, w: 720, h: 720 }, margins: {} })); }
  await sleep(500);
  check('   P2 nell’area del ledwall: il pulsante si vede', (await p2View(p2)).goInView);
  await shot(p1, 'host-4-pronto-ledwall-720'); await shot(p2, 'p2-4-pronto-ledwall-720');
  for (const p of [p1, p2]) await p.evaluate(() => __natpfTennis.natpfUi.screen.restore({ preset: 'full', area: null, margins: {} }));
  for (const p of [p1, p2]) await p.setViewportSize({ width: 1100, height: 680 });
  await sleep(300);

  /* 5: partita */
  await p1.evaluate(() => document.getElementById('btn-start-match').click());
  const started = await until(p2, () => ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY'].includes(__natpfTennis.phase) && document.getElementById('natpf-guest-modal').classList.contains('hidden'));
  check('5. «Gioca»: la partita parte su tutti e due i computer, il pannello del P2 si chiude', started && await p1.evaluate(() => __natpfTennis._versusInMatch()));
  await p1.evaluate(BOT); await p2.evaluate(BOT);
  let s1, s2;
  for (const t = Date.now(); Date.now() - t < 240000;){
    await sleep(3000);
    [s1, s2] = await Promise.all([state(p1), state(p2)]);
    if (s2.served?.opponent >= 1 && s1.rally >= 3 && s2.hits >= 15) break;
  }
  await sleep(1500);
  [s1, s2] = await Promise.all([state(p1), state(p2)]);
  log('P1 ' + JSON.stringify(s1)); log('P2 ' + JSON.stringify(s2));
  check('   al meglio di 3 (prima sempre un game)', s1.gamesToWin === 2 && s2.gamesToWin === 2, `${s1.gamesToWin}/${s2.gamesToWin}`);
  check('   scambio tra le due sessioni', s1.rally >= 3, `scambio più lungo: ${s1.rally} colpi`);
  check('   servono tutti e due (cambio del servizio dopo il primo game)', s1.served.player >= 1 && s2.served.opponent >= 1, `P1 ${s1.served.player}, P2 ${s2.served.opponent}`);
  check('   oltre 15 colpi del P2 con i dati del telefono: il P2 resta aggiornato (prima stato >16300 byte, scartato)', s2.hits >= 15 && s2.maxAge < 3000 && s2.guest === 'playing', `${s2.hits} colpi, snapshot più vecchio ${s2.maxAge} ms, stato ${s2.guest}`);
  check('   punteggio e servizio uguali sulle due sessioni', JSON.stringify(s1.score) === JSON.stringify(s2.score) && s1.server === s2.server, `P1 ${s1.score} ${s1.server} · P2 ${s2.score} ${s2.server}`);

  /* 6: il P2 esce e rientra */
  await c2.close(); log('P2 ha chiuso la pagina');
  const waited = await until(p1, () => __natpfTennis.natpfVersusWait === true && !document.getElementById('natpf-versus-wait').classList.contains('hidden'), null, 30000);
  check('6. P2 uscito: l’host si ferma e spiega cosa succede', waited && await p1.evaluate(() => __natpfTennis.natpfPaused));
  const { ctx: c3, p: p2b, errs: e3 } = await page(B, invite, { w: 1100, h: 680 });
  await ready(p2b); await p2b.evaluate(NO_RENDER);
  // il punteggio arriva già durante la pausa (snapshot di pausa con il punteggio)
  const scoreEarly = await until(p2b, s => JSON.stringify(['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => __natpfTennis.score[k])) === s, JSON.stringify((await state(p1)).score), 20000);
  // prima «avversario» (computer del P2 assente), poi il motivo che il P2 dice appena rientra: telefono non collegato
  await until(p1, () => /scollegato|non pronto/.test(__natpfTennis.natpfUi.versus.holdWhy || ''), null, 20000);
  const holdWhy = await p1.evaluate(() => __natpfTennis.natpfUi.versus.holdWhy);
  check('   P2 rientrato senza racchetta pronta: l’host resta fermo e dice perché; il P2 ha già il punteggio', /scollegato|non pronto/.test(holdWhy || '') && scoreEarly, `motivo ${holdWhy}`);
  // il P2 sceglie la racchetta (come la prima volta): la partita riprende da sola con il conto alla rovescia
  await p2b.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.testInput = true; ui.selectController('mouse', { open: false }); });
  const resumed = await until(p1, () => __natpfTennis.natpfVersusWait === false && !__natpfTennis.natpfPaused, null, 45000);
  check('   P2 rientra con il link d’invito: la partita riprende da sola', resumed);
  const synced = await until(p2b, s => JSON.stringify(['playerPoints', 'opponentPoints', 'playerGames', 'opponentGames'].map(k => __natpfTennis.score[k])) === s, JSON.stringify(s1.score.length ? (await state(p1)).score : []), 15000);
  check('   dopo il rientro il P2 ha il punteggio dell’host', synced, JSON.stringify((await state(p2b)).score));

  /* 7: l'host chiude la stanza; link a una stanza che non esiste */
  await p1.evaluate(() => { __natpfTennis.natpfUi.backToMenu(); __natpfTennis.natpfUi.lobby.setMode('cpu'); });
  const closed = await until(p2b, () => document.querySelector('[data-versus-guest]')?.dataset.state === 'closed', null, 20000);
  check('7. l’host sceglie «Contro la CPU»: il P2 vede «stanza chiusa»', closed, await guestStatus(p2b));
  check('   l’host non è più in sfida', await p1.evaluate(() => !__natpfTennis.versus.active && !__natpfTennis.isMultiplayer && __natpfTennis.roomId === 'default'));
  const bad = new URL(invite); bad.searchParams.set('room', 'AT-ZZZZ');
  const { p: p2c, errs: e4 } = await page(B, bad.href, { w: 1100, h: 680 });
  await ready(p2c); await p2c.evaluate(NO_RENDER);
  const warned = await until(p2c, () => /chiuso la partita|nuovo link/.test(document.querySelector('[data-versus-guest]')?.textContent || ''), null, 40000);
  check('   link a una stanza inesistente: il P2 legge che deve chiedere un nuovo link', warned, await p2c.evaluate(() => document.querySelector('[data-versus-guest]')?.textContent));
  await p2c.close();
  const { p: pm, errs: e5 } = await page(B, bad.href, { w: 390, h: 844, mobile: true });
  await ready(pm);
  const phoneNote = await pm.evaluate(() => document.querySelector('[data-versus-phone]')?.textContent || '');
  check('   invito aperto sul telefono: dice di aprirlo sul computer', /si gioca dal computer/.test(phoneNote), phoneNote.slice(0, 80));
  await pm.close();

  /* 8: rete che blocca il collegamento diretto, poi libera */
  const { p: h8, errs: e6 } = await page(B, `${GAME}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w: 1100, h: 680, init: BLOCK_ICE });
  await ready(h8); await h8.evaluate(NO_RENDER);
  await h8.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.testInput = true; ui.selectController('mouse', { open: false }); ui.lobby.menu('play'); document.querySelector('[data-mode="friend"]').click(); });
  await until(h8, () => document.querySelector('#natpf-invite a')?.href && __natpfTennis.natpfP2p?.status === 'waiting');
  const invite8 = await h8.evaluate(() => document.querySelector('#natpf-invite a').href);
  const { p: g8, errs: e7 } = await page(B, invite8, { w: 1100, h: 680, init: BLOCK_ICE });
  await ready(g8); await g8.evaluate(NO_RENDER);
  const t8 = Date.now();
  const guestBlocked = await until(g8, () => /rete blocca il collegamento diretto/.test(document.querySelector('[data-versus-guest]')?.textContent || ''), null, 60000);
  const hostBlocked = await until(h8, () => /Il Player 2 ha aperto il link, ma la rete blocca/.test(document.querySelector('#natpf-invite [data-versus-state]')?.textContent || ''), null, 60000);
  const d8 = await Promise.all([g8.evaluate(() => __natpfTennis.natpfP2p.detail), h8.evaluate(() => __natpfTennis.natpfP2p.detail)]);
  log(`rete bloccata: segnalata in ${((Date.now() - t8)/1000).toFixed(0)} s · P2 ${d8[0]} · host ${d8[1]}`);
  check('8. rete che blocca il collegamento diretto: il P2 lo dice con i consigli (stessa Wi-Fi, altra rete, senza VPN)', guestBlocked && /stessa rete Wi-Fi/.test(await g8.evaluate(() => document.querySelector('[data-versus-guest]').textContent)), await g8.evaluate(() => document.querySelector('[data-versus-guest]')?.textContent));
  check('   l’host sa che il P2 ha aperto il link ma la rete lo blocca', hostBlocked, await line(h8));
  check('   dettaglio per la diagnostica: stato ICE e candidati', /checking|failed|disconnected/.test(d8[0] || '') && /host/.test(d8[0] || ''), d8.join(' | '));
  await Promise.all([g8.evaluate(() => { window.__blockIce = false; }), h8.evaluate(() => { window.__blockIce = false; })]);
  const freed = await until(h8, () => /è entrato/.test(document.querySelector('#natpf-invite [data-versus-state]')?.textContent || ''), null, 60000);
  check('   rete di nuovo libera: il P2 entra da solo e gli avvisi spariscono', freed && await g8.evaluate(() => __natpfTennis.natpfP2p.status === 'connected' && !__natpfTennis.natpfP2p.error), await line(h8));

  const errs = [...e1, ...e2, ...e3, ...e4, ...e5, ...e6, ...e7].filter(m => !/WebGL|GPU|swiftshader|peer-unavailable|Could not connect to peer|Negotiation of connection|negotiation-failed/i.test(m));
  check('nessun errore nelle pagine', !errs.length, errs.slice(0, 4).join(' | '));
  await p1.screenshot({ path: SP + '/natpf-1v1-p2p-host.png' }).catch(() => {});
  void c3;
} catch (err){
  check('prova 1v1 p2p', false, String(err?.stack || err).split('\n').slice(0, 3).join(' '));
} finally {
  await B.close(); stop(); summary();
  // il server di segnalazione tiene aperti i socket: si esce con il risultato
  setTimeout(() => process.exit(), 300);
}
