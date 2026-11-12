// NATPF B30: registro dello stand (docs/b30/registro-dello-stand.md). Gioco vero con vite; lo spazio Cloudflare è finto
// e in locale: il Worker vero (natpf-tennis/cloudflare/registro-worker.js) con uno spazio R2 finto in memoria dietro un
// server http su 127.0.0.1. Nessuna chiave vera: quella della prova è scritta qui e non apre niente. Percorso:
//   1. niente di salvato: il registro è ACCESO da solo (decisione dell'utente del 12/11) e trova l'indirizzo dello
//      spazio in /natpf/registro.json (qui servito dalla prova);
//   2. una partita contro la CPU (chi gioca batte davvero, la CPU risponde, il nome scritto è «Mario Rossi») e una nello
//      stesso schermo («Giulia Bianchi» contro «Luca Verdi», comincia a battere il Player 2; con il formato in fiera battono tutti e due; il Player 2 batte con mouse e tastiera, cioè senza il tempo del gesto: riga «servizio» con fonte «senza gesto»): nello spazio arrivano le
//      righe attese (avvio, partita, punto, servizio, partita.fine), nessuna con un nome o un campo non previsto, e sul
//      computer non resta niente in coda;
//   3. pannello dello stand (Ctrl+Maiusc+K): «Registro di gioco: Sì», partite di oggi, ora dell'ultimo invio, coda
//      vuota; il foglio sta nello schermo a 1280 × 720 e 1024 × 600 con «Chiudi» in vista;
//   4. rete assente: le righe restano in coda, il pannello lo dice, «Scarica la coda» dà uno zip con quei blocchi;
//      tornata la rete «Invia adesso» svuota la coda e nello spazio ogni partita c'è una volta sola;
//   5. pagina ricaricata: il conto delle partite di oggi continua, la riga di avvio dice «reload»;
//   6. registro spento dal pannello: resta salvato, una partita non lascia nessuna riga né in coda né nello spazio;
//      ricaricando resta spento; riacceso riparte;
//   7. costo: millisecondi spesi dal registro per partita (misurati dal registro stesso, con gli agganci che scattano
//      davvero), divisi per i fotogrammi della partita, e costo di una riga (filtro e testo) misurato su 2.000 righe.
//      (Prima: un passo della fisica con il registro acceso e spento a partita finita, dove gli agganci non scattano: la
//      revisione ha fatto notare che non provava niente.)
// I punti si chiudono con la regola del motore (_awardPoint) dopo il servizio vero: la prova guarda il registro, non il
// gioco. Chromium senza scheda grafica: i tempi del disegno non valgono per un PC vero.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-registro.mjs      (OUT=cartella delle schermate)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';
import worker from '../../natpf-tennis/cloudflare/registro-worker.js';
import { r2Finto } from '../../natpf-tennis/scripts/registro/r2-finto.mjs';
import { controllaRiga } from '../../natpf-tennis/src/natpf/registro/registro_formato.js';
import { readZip } from '../../natpf-tennis/src/natpf/diag/diag_zip.js';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3196), SPAZIO_PORT = +(process.env.SPAZIO_PORT || 8796);
const OUT = path.join(SP, 'registro'); mkdirSync(OUT, { recursive: true });
const ORIGINE = `http://127.0.0.1:${GAME_PORT}`, SPAZIO = `http://127.0.0.1:${SPAZIO_PORT}/`;
const NOMI = ['Mario Rossi', 'Giulia Bianchi', 'Luca Verdi', 'Mario', 'Rossi', 'Giulia', 'Bianchi', 'Luca', 'Verdi'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = v => JSON.stringify(v);

/* ---------- spazio Cloudflare finto: il Worker vero con R2 finto ---------- */
const env = { REGISTRO: r2Finto(), CHIAVE_LETTURA: 'chiave-solo-di-questa-prova', ALLOWED_ORIGINS: ORIGINE };
const rete = { giu: false, post: 0 };
const spazio = http.createServer((req, res) => {
  const parti = [];
  req.on('data', c => parti.push(c)).on('end', async () => {
    if (rete.giu){ req.socket.destroy(); return; }                        // rete assente: la richiesta cade
    if (req.method === 'POST') rete.post++;
    try {
      const headers = {}; for (const k of ['origin', 'content-type', 'authorization', 'accept']) if (req.headers[k]) headers[k] = req.headers[k];
      const r = await worker.fetch(new Request(`http://127.0.0.1:${SPAZIO_PORT}${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(parti) }), env);
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e){ res.writeHead(500); res.end(String(e)); }
  });
});
await new Promise(r => spazio.listen(SPAZIO_PORT, '127.0.0.1', r));
// righe arrivate nello spazio, in ordine (senza le righe «blocco» che mette il Worker)
const nelloSpazio = () => [...env.REGISTRO.oggetti.keys()].filter(k => k.startsWith('registro/')).sort().flatMap(k => env.REGISTRO.oggetti.get(k).testo.trim().split('\n').map(l => JSON.parse(l))).filter(r => r.k !== 'blocco');

const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} try { spazio.close(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`${ORIGINE}/`));

/* ---------- aiuti ---------- */
const until = async (p, fn, arg = null, ms = 15000) => { try { await p.waitForFunction(fn, arg, { timeout: ms, polling: 50 }); return true; } catch { return false; } };
// passi della fisica a mano finché la condizione è vera (il Chromium senza GPU avanza piano), al più `sec` secondi di gioco
const run = (p, cond, sec = 8) => p.evaluate(({ cond, sec }) => { const E = __natpfTennis, f = new Function('E', `return (${cond})`); for (let i = 0; i < sec*120; i++){ if (f(E)) return true; E._stepPhysics(1/120); } return f(E); }, { cond, sec });
const award = (p, who, why = 'Out') => p.evaluate(({ who, why }) => { __natpfTennis._awardPoint(who, why); }, { who, why });
const pronto = async p => { await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 }); await p.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.()); await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('menu')); await p.waitForTimeout(300); };
// righe in memoria → blocco → invio; poi lo stato del registro
// (il blocco di fine partita può essere ancora in scrittura nella coda: si riprova finché la coda è vuota, al più 4 volte)
const scarica = p => p.evaluate(async () => { const R = __natpfTennis.natpfUi.registro; let s = null;
  for (let i = 0; i < 4; i++){ await R.rec.blocco(); await new Promise(r => setTimeout(r, 200)); await R.invio.invia({ forza: true }); s = await R.stato(); if (!s.coda.blocchi && !s.inMemoria) break; }
  return s; });
const stato = p => p.evaluate(() => __natpfTennis.natpfUi.registro.stato());
// servizio vero di chi gioca (lancio, colpo vicino al punto più alto) o del Player 2 nello stesso schermo
async function batti(p, chi){
  const [toss, swing, hitter] = chi === 'player' ? ['_handleUserTossInput', '_handleUserSwingInput', 'player'] : ['_handleP2TossInput', '_handleP2SwingInput', 'opponent'];
  await p.evaluate(f => __natpfTennis[f]({ source: 'prova' }), toss);
  const tossed = await run(p, "E.phase === 'SERVE_TOSS' && E.ball.vel.y < 1.2", 3);
  await p.evaluate(f => __natpfTennis[f]({ source: 'prova', speed: 1.3 }), swing);
  const hit = await run(p, `E.phase === 'RALLY' && E.ball.lastHitter === '${hitter}'`, 2);
  return tossed && hit;
}
// una partita a 1 game: chi batte fa il servizio vero (la CPU il suo), poi il punto va a `vince(i)`. Ritorna i servizi riusciti
async function partita(p, { vince, split = false, punti = 99 } = {}){
  const fatti = { servizi: 0, punti: 0, cpu: 0 };
  for (let i = 0; i < punti; i++){
    if (await p.evaluate(() => __natpfTennis.phase === 'MATCH_OVER')) break;
    await run(p, "E.phase === 'SERVE_STANCE'");
    const server = await p.evaluate(() => __natpfTennis.score.server);
    if (server === 'player' || split){ if (await batti(p, server)) fatti.servizi++; }
    else if (await run(p, "E.phase === 'RALLY' && E.ball.lastHitter === 'opponent'")) fatti.cpu++;
    await run(p, 'false', .4);                                           // la palla viaggia un poco
    await award(p, vince(i), i % 2 ? 'Out' : 'Nice Shot!'); fatti.punti++;
  }
  return fatti;
}
const avviaCpu = async p => {
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; if (!ui.testInput) ui.toggleTestInput(); ui.selectController('mouse', { open: false }); ui.lobby.setMode('cpu'); ui.lobby.setFormat('singles'); ui.lobby.go('match'); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { document.querySelector('#match-length-group [data-games="1"]').click(); });
  await p.evaluate(() => document.getElementById('btn-start-match').click());
  return until(p, () => !__natpfTennis.autoPlayMode && __natpfTennis.phase === 'SERVE_STANCE', null, 20000);
};
const alMenu = async p => { await p.evaluate(() => { const E = __natpfTennis; E.hud.hideVictoryModal?.(); if (E.natpfSplit?.active) E.endSplit(); E.natpfUi.backToMenu(); }); await p.waitForTimeout(1300); };
const apriPannello = async p => { await p.keyboard.press('Control+Shift+KeyK'); await p.waitForSelector('#natpf-staff:not(.hidden) [data-staff="registro"]', { state: 'visible', timeout: 10000 }); await p.waitForTimeout(400); };
const pannello = p => p.evaluate(() => { const s = document.querySelector('#natpf-staff .natpf-sheet'), r = s.getBoundingClientRect(), c = s.querySelector('[data-staff="close"]').getBoundingClientRect(), g = document.getElementById('staff-registro').getBoundingClientRect();
  return { acceso: document.querySelector('[data-staff="registro"] b').textContent, on: document.querySelector('[data-staff="registro"]').classList.contains('on'), testo: document.getElementById('staff-registro-stato').textContent,
    scroll: s.scrollHeight - s.clientHeight, chiudi: c.bottom <= Math.min(r.bottom, innerHeight) + .5 && c.top >= r.top, riga: g.width > 0 && g.bottom <= c.top + 1 && g.left >= r.left && g.right <= r.right + .5, alto: Math.round(g.height),
    scarica: !document.querySelector('[data-staff="registro-scarica"]').disabled }; });
const avviso = p => p.evaluate(() => [...document.querySelectorAll('.natpf-toast, [class*="toast"]')].map(e => e.textContent).filter(Boolean).join(' | '));

const B = await launch();
try {
  const ctx = await B.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  await ctx.route('**/natpf/registro.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: SPAZIO }) }));
  let { p, errs } = await page(B, `${ORIGINE}/?intro=0`, { context: ctx });
  await pronto(p);

  // 1. acceso di base, indirizzo trovato
  await until(p, () => __natpfTennis.natpfUi.registro && !__natpfTennis.natpfUi.registro.cerca, null, 10000);
  const base = await p.evaluate(() => { const R = __natpfTennis.natpfUi.registro; return { ce: !!R, acceso: R?.acceso, scelta: JSON.parse(localStorage.getItem('natpf-tennis.registro') || '{}').acceso ?? null, url: R?.url, coda: R?.coda.tipo }; });
  check('niente di salvato: il registro è acceso da solo, con la coda nello spazio del browser e l\'indirizzo dello spazio dal pacchetto', base.ce && base.acceso === true && base.scelta === null && base.url === SPAZIO && base.coda === 'browser', fmt(base));

  // 2a. partita contro la CPU, con un nome scritto
  await p.evaluate(() => { __natpfTennis.natpfUi.events.nickname = 'Mario Rossi'; });
  check('partita contro la CPU avviata da «Gioca»', await avviaCpu(p));
  await p.waitForTimeout(4000);                                            // qualche secondo di gioco a tempo vero: fotogrammi contati
  // fotogrammi veri della pagina in 2 s (requestAnimationFrame), per confronto: con fotogrammi più lunghi di 1 s il registro non li conta (pausa)
  const raf = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); let last = t0, max = 0; const f = t => { n++; max = Math.max(max, t - last); last = t; if (t - t0 < 2000) requestAnimationFrame(f); else r({ n, maxMs: Math.round(max) }); }; requestAnimationFrame(f); }));
  const fotogrammi = await p.evaluate(() => { const f = __natpfTennis.natpfUi.registro.rec.partita?.f; return f ? { n: f.n, ms: Math.round(f.ms) } : null; });
  check('in partita il registro conta i fotogrammi (per i fotogrammi al secondo di fine partita)', fotogrammi?.n > 0 || (raf.n < 4 && raf.maxMs >= 1000), fmt({ registro: fotogrammi, pagina: raf }));
  const cpu = await partita(p, { vince: i => (i % 3 === 1 ? 'opponent' : 'player') });
  const finita = await p.evaluate(() => ({ phase: __natpfTennis.phase, g: [__natpfTennis.score.playerGames, __natpfTennis.score.opponentGames] }));
  check('partita contro la CPU giocata fino alla fine (1 game), con i servizi veri di chi gioca', finita.phase === 'MATCH_OVER' && cpu.servizi >= 1, fmt({ finita, cpu }));
  await p.waitForTimeout(1500);
  const s1 = await scarica(p);
  let righe = nelloSpazio(); const di = (k, rows = righe) => rows.filter(r => r.k === k);
  const tipi = [...new Set(righe.map(r => r.k))].sort();
  check('nello spazio: avvio, partita, punti, servizi e fine partita', ['avvio', 'partita', 'partita.fine', 'punto', 'servizio'].every(k => tipi.includes(k)), tipi.join(' · '));
  const P1 = di('partita')[0] || {}, F1 = di('partita.fine')[0] || {}, A1 = di('avvio')[0] || {};
  check('riga di avvio: versione, giornata casuale, schermo, niente altro del computer', /^\d{4}-\d{2}-\d{2}\.\d+$/.test(A1.versione || '') && /^[a-z0-9]{8}$/.test(A1.g || '') && Array.isArray(A1.schermo) && A1.dove === 'browser' && typeof A1.fuso === 'number', fmt(A1));
  check('riga della partita: modo CPU, livello, formato, controller, del nome solo «inserito: sì»', P1.n === 1 && P1.modo === 'cpu' && !!P1.livello && P1.ctrl === 'mouse' && P1.nomeInserito === true && P1.g === A1.g && typeof P1.stand === 'object', fmt(P1));
  check('una riga per punto, con chi batte, chi vince, come finisce e il punteggio', di('punto').length === cpu.punti && di('punto').every(r => ['g', 'a'].includes(r.batte) && ['g', 'a'].includes(r.vince) && typeof r.fine === 'string' && Array.isArray(r.pt) && r.n === 1), fmt(di('punto').slice(0, 2)));
  check('i servizi di chi gioca: tipo, tempo, velocità, voto', di('servizio').length === cpu.servizi && di('servizio').every(r => Number.isFinite(r.kmh) && Number.isFinite(r.ms)), fmt(di('servizio').slice(0, 2)));
  check('fine partita: esito, game, punti, durata, costo del registro (fotogrammi al secondo se ce ne sono più di 30: qui il Chromium senza scheda grafica ne fa pochi)', F1.esito === 'finita' && F1.vince === 'g' && fmt(F1.game) === fmt(finita.g) && F1.punti === cpu.punti && F1.durS >= 0 && Number.isFinite(F1.costoMs) && (F1.fps ? F1.fps.medi > 0 : fotogrammi.n <= 30), fmt(F1));
  check('dopo l\'invio sul computer non resta niente in coda', s1.coda.blocchi === 0 && s1.inMemoria === 0 && s1.invio.ultimoOk > 0 && !s1.invio.ultimoErrore, fmt({ coda: s1.coda, invio: s1.invio }));
  const byteCpu = Buffer.byteLength(righe.filter(r => r.n === 1).map(r => JSON.stringify(r)).join('\n')), r2Cpu = env.REGISTRO.byteBlocchi();

  // 2b. stesso schermo, due nomi scritti
  await alMenu(p);
  await p.evaluate(() => { const E = __natpfTennis; E.natpfSplitNames = { p1: 'Giulia Bianchi', p2: 'Luca Verdi' }; E.startSplit(); E.matchConfig.gamesToWin = 1; E.autoPlayMode = false; E.userHasInteracted = true; E.natpfServeFirst = 'opponent'; E.startNewMatch({ showStartBanner: false }); });
  const duo = await partita(p, { split: true, vince: i => (i % 2 ? 'opponent' : 'player') });
  const finita2 = await p.evaluate(() => ({ phase: __natpfTennis.phase, g: [__natpfTennis.score.playerGames, __natpfTennis.score.opponentGames] }));
  await p.waitForTimeout(1500);
  await scarica(p);
  righe = nelloSpazio();
  const P2 = di('partita')[1] || {}, F2 = di('partita.fine')[1] || {};
  check('stesso schermo: partita giocata fino alla fine, battono tutti e due', finita2.phase === 'MATCH_OVER' && duo.servizi === duo.punti && duo.punti >= 4, fmt({ finita2, duo }));
  check('stesso schermo: riga della partita con le fasce, l\'aiuto e le opzioni dello stand; dei due nomi solo «inserito: sì»', P2.n === 2 && P2.modo === 'stesso-schermo' && Array.isArray(P2.fasce) && P2.fasce.length === 2 && P2.nomeInserito === true && P2.nomeInserito2 === true && 'campoAperto' in (P2.stand || {}) && 'lancioAuto' in P2.stand, fmt(P2));
  check('stesso schermo: i servizi del secondo giocatore sono segnati (chi: a), la fine partita ha il vincitore', di('servizio').filter(r => r.n === 2 && r.chi === 'a').length >= 1 && F2.esito === 'finita' && ['g', 'a'].includes(F2.vince), fmt({ servizi: di('servizio').filter(r => r.n === 2), F2 }));
  // riservatezza: nessun nome, nessun campo vietato o non previsto, in tutto quello che è arrivato nello spazio
  const tutto = [...env.REGISTRO.oggetti.entries()].map(([k, o]) => `${k}\n${o.testo}`).join('\n');
  const nomiTrovati = NOMI.filter(n => tutto.includes(n)), male = righe.flatMap(r => controllaRiga(r, { nomi: NOMI }).map(m => `${r.k}: ${m}`));
  check('niente nomi nello spazio (né nelle righe né nei nomi dei file)', nomiTrovati.length === 0, nomiTrovati.join(', '));
  check(`tutte le ${righe.length} righe passano il controllo (solo campi previsti, niente indirizzi, niente e-mail)`, male.length === 0, male.slice(0, 4).join(' | '));
  check('niente indirizzi di rete né identificativi del browser nello spazio', !/127\.0\.0\.1|Mozilla|HeadlessChrome|localhost/.test(tutto), (tutto.match(/127\.0\.0\.1|Mozilla|HeadlessChrome|localhost/) || [])[0]);
  const byteDuo = Buffer.byteLength(righe.filter(r => r.n === 2).map(r => JSON.stringify(r)).join('\n')), r2Duo = env.REGISTRO.byteBlocchi() - r2Cpu;

  // 3. pannello dello stand
  await alMenu(p);
  for (const [w, h] of [[1280, 720], [1024, 600]]){
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400);
    await apriPannello(p);
    const st = await pannello(p);
    if (w === 1280) check('pannello dello stand: «Registro di gioco: Sì», 2 partite oggi, ora dell\'ultimo invio, niente in coda', st.acceso === 'Sì' && st.on && /^Oggi 2 partite registrate · ultimo invio riuscito alle \d\d:\d\d · niente in coda\.$/.test(st.testo) && !st.scarica, st.testo);
    check(`pannello dello stand a ${w} × ${h}: la riga del registro sta nel foglio, niente scorrimento, «Chiudi» in vista`, st.scroll <= 0 && st.chiudi && st.riga, fmt({ scroll: st.scroll, chiudi: st.chiudi, riga: st.riga, alto: st.alto }));
    await p.screenshot({ path: `${OUT}/pannello-${w}x${h}.png` });
    await p.click('#natpf-staff [data-staff="close"]');
  }
  await p.setViewportSize({ width: 1280, height: 720 });

  // 4. rete assente: coda sul computer, pannello che lo dice, zip della coda; poi la rete torna
  rete.giu = true;
  check('terza partita avviata (rete assente)', await avviaCpu(p));
  await partita(p, { vince: () => 'player', punti: 2 });
  await alMenu(p);                                                         // abbandonata a metà
  const s4 = await scarica(p);
  check('rete assente: le righe restano in coda sul computer, niente perso, il gioco va avanti', s4.coda.blocchi >= 1 && s4.coda.righe >= 4 && /rete assente/.test(s4.invio.ultimoErrore || '') && s4.perse === 0 && !errs.length, fmt({ coda: s4.coda, errore: s4.invio.ultimoErrore, errs: errs.slice(0, 2) }));
  await apriPannello(p);
  const st4 = await pannello(p);
  check('pannello: dice che l\'invio non è riuscito e quante righe sono in coda', /Oggi 3 partite registrate/.test(st4.testo) && /\d+ righe ancora in coda/.test(st4.testo) && /invio non riuscito: rete assente.*si riprova da solo/.test(st4.testo) && st4.scarica, st4.testo);
  await p.screenshot({ path: `${OUT}/pannello-rete-assente.png` });
  // revisione: con il testo lungo dell'errore, nel quadrato 720 × 720 il foglio scorreva di 8 px
  await p.setViewportSize({ width: 720, height: 720 }); await p.waitForTimeout(400);
  await p.evaluate(() => __natpfTennis.natpfUi.registro.dipingi()); await p.waitForTimeout(300);   // (da solo ogni 2 s)
  const st4q = await pannello(p);
  check('pannello a 720 × 720 con la rete assente: testo corto con il problema, niente scorrimento, «Chiudi» in vista', /invio non riuscito: rete assente/.test(st4q.testo) && st4q.scroll <= 0 && st4q.chiudi && st4q.riga, fmt({ testo: st4q.testo, scroll: st4q.scroll, chiudi: st4q.chiudi, riga: st4q.riga }));
  await p.screenshot({ path: `${OUT}/pannello-rete-assente-720x720.png` });
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(400);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('#natpf-staff [data-staff="registro-scarica"]')]);
  const zipFile = path.join(OUT, dl.suggestedFilename()); await dl.saveAs(zipFile);
  const zip = [...readZip(new Uint8Array(readFileSync(zipFile)))].map(([name, data]) => ({ name, data })), nelloZip = zip.flatMap(e => new TextDecoder().decode(e.data).trim().split('\n').map(l => JSON.parse(l)));
  check('«Scarica la coda»: uno zip con i blocchi non ancora partiti (registro/<giorno>/<postazione>/<parte>.jsonl), senza nomi', /^natpf-registro-coda-\d{8}-\d{4}\.zip$/.test(dl.suggestedFilename()) && zip.length === s4.coda.blocchi && zip.every(e => /^registro\/\d{4}-\d{2}-\d{2}\/[a-z0-9]{8}\/\d{5}-[a-z0-9]{4}\.jsonl$/.test(e.name)) && nelloZip.some(r => r.k === 'partita' && r.n === 3) && !NOMI.some(n => JSON.stringify(nelloZip).includes(n)), fmt({ nome: dl.suggestedFilename(), file: zip.map(e => e.name) }));
  const F3z = nelloZip.find(r => r.k === 'partita.fine');
  check('partita lasciata a metà: «abbandonata», con dove', F3z?.esito === 'abbandonata' && F3z.dove === 'a metà partita' && F3z.punti === 2, fmt(F3z));
  rete.giu = false;
  const prima = nelloSpazio().length;
  await p.click('#natpf-staff [data-staff="registro-invia"]');
  await until(p, async () => (await __natpfTennis.natpfUi.registro.stato()).coda.blocchi === 0, null, 15000);
  await p.waitForTimeout(2300);
  const st5 = await pannello(p), dopo = nelloSpazio();
  check('rete tornata, «Invia adesso»: la coda si svuota, il pannello lo dice', /niente in coda\.$/.test(st5.testo) && !/non riuscito/.test(st5.testo) && dopo.length - prima === s4.coda.righe, `${st5.testo} · righe nuove nello spazio ${dopo.length - prima}`);
  check('nello spazio ogni partita c\'è una volta sola (niente doppioni dopo la riprova)', fmt(di('partita', dopo).map(r => r.n)) === '[1,2,3]' && di('partita.fine', dopo).length === 3, fmt(di('partita', dopo).map(r => r.n)));
  await p.click('#natpf-staff [data-staff="close"]');

  // 5. pagina ricaricata: stesso giorno, il conto continua
  await p.reload({ waitUntil: 'domcontentloaded' }); await pronto(p);
  await until(p, () => __natpfTennis.natpfUi.registro && !__natpfTennis.natpfUi.registro.cerca, null, 10000);
  const s6 = await scarica(p), avvii = di('avvio', nelloSpazio());
  check('pagina ricaricata: il registro è ancora acceso, le partite di oggi restano 3, la riga di avvio dice che è un ricaricamento e che la volta prima si era chiusa bene', s6.acceso && s6.partite === 3 && avvii.length === 2 && avvii[1].pagina === 'reload' && avvii[1].prima === 'pulita' && avvii[1].g === avvii[0].g, fmt({ partite: s6.partite, avvio: avvii[1] }));

  // 6. spento dal pannello: nessuna riga; resta salvato
  await apriPannello(p);
  await p.click('#natpf-staff [data-staff="registro"]'); await p.waitForTimeout(500);
  const st6 = await pannello(p);
  check('pannello: un clic lo spegne («No»), resta salvato', st6.acceso === 'No' && !st6.on && /^Registro spento/.test(st6.testo) && await p.evaluate(() => JSON.parse(localStorage.getItem('natpf-tennis.registro')).acceso === false), st6.testo);
  await p.screenshot({ path: `${OUT}/pannello-spento.png` });
  await p.click('#natpf-staff [data-staff="close"]');
  await scarica(p);
  const fermo = nelloSpazio().length, postFermi = rete.post;
  check('quarta partita avviata (registro spento)', await avviaCpu(p));
  const spenta = await partita(p, { vince: () => 'player' });
  await p.waitForTimeout(1200);
  const s7 = await scarica(p);
  check('registro spento = nessuna riga: né in memoria, né in coda, né nello spazio, nessuna richiesta di invio; il gioco è andato avanti uguale', spenta.punti >= 4 && s7.acceso === false && s7.inMemoria === 0 && s7.coda.blocchi === 0 && nelloSpazio().length === fermo && rete.post === postFermi, fmt({ spenta, s7: { inMemoria: s7.inMemoria, coda: s7.coda }, righe: nelloSpazio().length - fermo, post: rete.post - postFermi }));
  await p.reload({ waitUntil: 'domcontentloaded' }); await pronto(p);
  check('ricaricando resta spento', await p.evaluate(() => __natpfTennis.natpfUi.registro.acceso === false));
  await apriPannello(p); await p.click('#natpf-staff [data-staff="registro"]'); await p.waitForTimeout(500);
  const st8 = await pannello(p);
  await p.click('#natpf-staff [data-staff="close"]');
  await scarica(p);
  check('riacceso dal pannello: «Sì», e nello spazio arriva la riga di avvio «acceso»', st8.acceso === 'Sì' && di('avvio', nelloSpazio()).at(-1)?.motivo === 'acceso', st8.testo);

  // 7. costo: ms del registro per partita (misurati dal registro, agganci compresi), per fotogramma; costo di una riga
  const costo = await p.evaluate(() => {
    const R = __natpfTennis.natpfUi.registro.rec, n = 2000, prima = R.buf.length, righe0 = R.conti.righe;
    const riga = { gesto: 'forehand', ms: -30, voto: 'perfetto', f: .5, d: .2, x: 1.5, z: -8.2, in: [null, 72, .9] };
    const t = performance.now(); for (let i = 0; i < n; i++) R._riga('colpo', riga); const ms = (performance.now() - t)/n;
    R.buf.splice(prima); R.conti.righe = righe0;                               // righe della misura: via
    return { riga: ms, costo: R.costo };
  });
  const fini = di('partita.fine', nelloSpazio()).filter(r => r.esito === 'finita');
  const msPartita = fini.map(r => r.costoMs), durate = fini.map(r => r.durS), perSec = msPartita.map((v, i) => v/Math.max(1, durate[i]));
  // fotogrammi della partita: quelli contati dal registro, o (Chromium senza scheda grafica ne fa pochi) 60 al secondo
  // (solo le partite giocate a tempo vero: quella dello stesso schermo qui è chiusa in un attimo dalla prova)
  const perFotogramma = fini.filter(r => r.durS >= 20).map(r => r.costoMs/Math.max(1, r.fps?.n || 60*r.durS));
  check('costo del registro: meno di 20 ms di lavoro per partita in tutto (agganci e righe), meno di 0,25 ms per secondo di gioco (partite di almeno 20 s), nessuna volta oltre 2 ms', msPartita.every(v => v < 20) && perSec.every((v, i) => durate[i] < 20 || v < .25) && costo.costo.max < 2, fmt({ msPerPartita: msPartita, durateS: durate, piuLungo: +costo.costo.max.toFixed(3) }));
  check('costo del registro per fotogramma: meno di 0,02 ms (su 16,7 ms di un fotogramma a 60 al secondo); una riga meno di 0,05 ms', perFotogramma.length >= 1 && perFotogramma.every(v => v < .02) && costo.riga < .05, fmt({ perFotogramma: perFotogramma.map(v => +v.toFixed(5)), riga: +costo.riga.toFixed(4) }));
  console.log(`MISURE  partita contro la CPU: ${byteCpu} byte di righe, ${r2Cpu} byte compressi nello spazio (con l'avvio) · stesso schermo: ${byteDuo} byte, ${r2Duo} compressi · costo per partita ${msPartita.map(v => v.toFixed(1)).join(', ')} ms (durate ${durate.join(', ')} s) · per fotogramma ${perFotogramma.map(v => v.toFixed(5)).join(', ')} ms · una riga ${costo.riga.toFixed(4)} ms`);
  check('peso: una partita occupa pochi kB di righe (meno di 6 kB ognuna in questa prova)', byteCpu > 300 && byteCpu < 6000 && byteDuo > 300 && byteDuo < 6000, `${byteCpu} e ${byteDuo} byte`);
  check('nessun errore nella pagina in tutta la prova', !errs.length, errs.slice(0, 3).join(' | '));
} finally { await B.close(); stop(); }
summary();
