// Unione B71+B72, sistemazione dopo la verifica (F1, docs/b72/unione.md §6): la card della fine partita con il telefono
// in inglese. I nomi inglesi dei trofei sono più lunghi di quelli italiani: «Sharpshooter» (Cecchino) andava a capo a metà
// parola («Sharpshoote» / «r») e, con «Marathoner» e la riga del prossimo trofeo, il nome del giocatore usciva sopra il bordo
// della card e la riga del prossimo trofeo sotto (5 px a 1280×720, 8 px a 1920×1080). Ora «Sniper».
// Gioco vero con vite; la schermata finale si apre con le viste di una partita vera della fiera (doppio perso con il
// telefono in EN, 19/11) e di tre varianti (Maratoneta d'argento come prossimo trofeo, singolare, stesso schermo con due
// card), in IT e in EN, a 1280×720, 1366×768, 1920×1080 e 1024×768. Per ogni card:
//   1. niente esce dalla card (scrollHeight = clientHeight; nome, trofei, record e prossimo trofeo dentro il bordo);
//   2. nelle card larghe (a una vista, e quella di chi vince nello stesso schermo) ogni nome di trofeo sta su una riga;
//   3. il nome di un trofeo non copre il testo del trofeo vicino.
// La card stretta di chi perde nello stesso schermo spezza i nomi anche in italiano («Cecchin o», da prima del B72): lì si
// guarda solo che niente esca e niente si sovrapponga.
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/e2e/natpf-fine-partita-en.mjs     (porte 3175 e 9175)
// Schermate in SP/fine-partita-en (deviceScaleFactor 1). Nessun telefono: la lingua dello schermo è messa dalla prova.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ExpressPeerServer } from 'peer';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PEER_PORT = +(process.env.PEER_PORT || 9175), GAME_PORT = +(process.env.GAME_PORT || 3175);
const OUT = path.join(SP, 'fine-partita-en'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const app = express(), peerServer = http.createServer(app);
app.use('/fiw', ExpressPeerServer(peerServer, { path: '/' }));
await new Promise(r => peerServer.listen(PEER_PORT, '127.0.0.1', r));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} peerServer.close(); };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// vista della fine partita presa da una partita vera della fiera (doppio contro gli avversari, perso, telefono in EN): 20
// colpi Perfetti (Cecchino), scambio più lungo 27, muro 32, 128 km/h
const clone = o => JSON.parse(JSON.stringify(o));
const SUM = { points: 2, lost: 4, pct: 33, aces: 0, winners: 2, errors: { net: 0, out: 4, whiff: 0 }, hits: 36, serves: 3, shots: 33, fastest: 128, supers: 0, superOk: 0,
  timing: { perfetto: 20, anticipo: 0, ritardo: 13, buono: 0 }, rated: 33, longest: 27, games: 0, won: false, streak: 2, love: 0, comeback: 0, mpSaved: 0, gameComeback: 0, missed: 0, unreturned: 0, wall: 32, gamesPlayed: 1 };
const REAL = { title: 'Vincono gli avversari', won: false, rows: [{ name: 'Jack + compagno', games: 0, win: false }, { name: 'Avversari', games: 1, win: true }], score: '0-1', voice: 'Game Set and Match',
  stats: { mode: 'cpu', guest: false, level: 'evento', doubles: true, games: [{ mine: 2, theirs: 4, win: false }],
    cols: [{ side: 'player', name: '', sum: SUM, tips: { good: 'Gran tempo: 20 colpi perfetti su 33.', fix: 'Colpisci un po’ prima: tanti colpi in ritardo.' } }],
    rank: null, nick: 'Jack', first: { player: true, opponent: false }, record: { kmh: { value: 128, mine: true, tie: false, prev: 0, side: 'player' }, scambio: { value: 27, mine: true, tie: false, prev: 0 } }, bands: null } };
// scambio più lungo 25 (Maratoneta di bronzo, prossimo trofeo Maratoneta d'argento), muro 10, 115 km/h: la card più piena
const MARA = clone(REAL); Object.assign(MARA.stats.cols[0].sum, { longest: 25, wall: 10, fastest: 115 }); MARA.stats.record.scambio.value = 25; MARA.stats.record.kmh.value = 115;
const SINGLE = clone(MARA); SINGLE.stats.doubles = false; SINGLE.title = "Vince l'avversario"; SINGLE.rows = [{ name: 'Jack', games: 0, win: false }, { name: 'Avversario', games: 1, win: true }];
// stesso schermo: Jack vince, Giulia perde (Cecchino, Maratoneta e Prima volta tutti e due)
const sumW = { ...SUM, won: true, games: 1, points: 4, lost: 2, longest: 34, wall: 33, fastest: 133, timing: { perfetto: 49, anticipo: 0, ritardo: 10, buono: 0 }, rated: 59 };
const sumL = { ...SUM, won: false, games: 0, longest: 34, wall: 20, fastest: 132, timing: { perfetto: 54, anticipo: 0, ritardo: 10, buono: 0 }, rated: 64 };
const SPLIT = { title: 'Vince Jack!', won: true, rows: [{ name: 'Jack', games: 1, win: true }, { name: 'Giulia', games: 0, win: false }], score: '1-0',
  stats: { mode: 'split', guest: false, level: 'evento', doubles: false, games: [{ mine: 4, theirs: 2, win: true }],
    cols: [{ side: 'player', name: 'Jack', sum: sumW }, { side: 'opponent', name: 'Giulia', sum: sumL }], rank: null, nick: '', first: { player: true, opponent: true },
    record: { kmh: { value: 133, mine: true, tie: false, prev: 0, side: 'player' }, scambio: { value: 34, mine: true, tie: false, prev: 0 } }, bands: { p1: 'adulto', p2: 'adulto' } } };
const VIEWS = { doppio: REAL, maratoneta: MARA, singolare: SINGLE, stesso: SPLIT };

// misure di ogni card: margini dei figli di .card-info rispetto al bordo, scorrimento, righe e sporgenze dei nomi dei trofei
const measure = g => g.evaluate(() => [...document.querySelectorAll('#victory-cards .end-card')].map(card => {
  const r = card.getBoundingClientRect(), kids = [...card.querySelector('.card-info').children].filter(e => e.getClientRects().length);
  const top = Math.min(...kids.map(k => k.getBoundingClientRect().top)) - r.top, bottom = r.bottom - Math.max(...kids.map(k => k.getBoundingClientRect().bottom));
  const textBox = el => { const rg = document.createRange(); rg.selectNodeContents(el); return rg; };
  const lis = [...card.querySelectorAll('.card-trophies .trophy')];
  const trophies = lis.map((li, i) => {
    const rg = textBox(li.querySelector('.trophy-txt b')), tr = rg.getBoundingClientRect();
    const next = lis[i + 1] ? textBox(lis[i + 1].querySelector('.trophy-txt')).getBoundingClientRect() : null;
    return { name: li.querySelector('.trophy-txt b').textContent, lines: new Set([...rg.getClientRects()].map(x => Math.round(x.top))).size, hitsNext: next ? +(tr.right - next.left).toFixed(1) : null };
  });
  return { side: card.dataset.side, narrow: card.classList.contains('end-player') && card.dataset.won === '0', name: card.querySelector('.card-name')?.textContent,
    top: +top.toFixed(1), bottom: +bottom.toFixed(1), scroll: card.scrollHeight - card.clientHeight, trophies, next: card.querySelector('.card-next')?.textContent || '' };
}));

const B = await launch();
try {
  for (const [w, h] of [[1280, 720], [1366, 768], [1920, 1080], [1024, 768]]){
    const { p: g, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0&peer=127.0.0.1:${PEER_PORT}`, { w, h });
    await g.waitForFunction(() => window.__natpfTennis?.hud && window.__natpfTennis.natpfUi?.lang && window.__natpfTennis.player?.model, null, { timeout: 180000 });
    // (disegno 3D fermo: si misura solo la schermata finale)
    await g.evaluate(() => { const E = __natpfTennis; E.render = () => {}; E.natpfUi.lobby.visible = false; E.hud.hideTitleModal?.(); document.getElementById('title-modal')?.classList.add('hidden'); });
    await g.evaluate(() => document.fonts.ready);
    for (const [vn, view] of Object.entries(VIEWS)){
      for (const lang of ['it', 'en']){
        // lingua comune dello schermo (a una vista quella del telefono di chi gioca; nello stesso schermo EN solo se tutti e due)
        await g.evaluate(({ view, lang }) => {
          const E = __natpfTennis; E.natpfPhone?.setLang?.(lang); E.hud._lang = () => lang;
          E.hud.hideVictoryModal?.();
          E.hud.showVictoryModal({ playerWon: !!view.won, playerGames: view.won ? 1 : 0, opponentGames: view.won ? 0 : 1, view });
        }, { view, lang });
        await sleep(700);
        const cards = await measure(g), tag = `${vn} ${lang} ${w}×${h}`;
        if (lang === 'en' && (w === 1280 || w === 1920)) await g.screenshot({ path: path.join(OUT, `${vn}-${lang}-${w}x${h}.png`) });
        const out = cards.filter(c => c.scroll > 0 || c.top < -0.5 || c.bottom < -0.5);
        check(`${tag}: niente esce dalla card`, cards.length > 0 && !out.length, JSON.stringify(out.map(c => ({ nome: c.name, sopra: c.top, sotto: c.bottom, scroll: c.scroll }))));
        const split2 = cards.flatMap(c => (c.narrow ? [] : c.trophies.filter(t => t.lines > 1)).map(t => t.name));
        check(`${tag}: nelle card larghe ogni nome di trofeo su una riga`, !split2.length, split2.join(', '));
        const over = cards.flatMap(c => c.trophies.filter(t => t.hitsNext > 0.5).map(t => `${t.name} (+${t.hitsNext} px)`));
        check(`${tag}: nessun nome di trofeo sopra il trofeo vicino`, !over.length, over.join(', '));
        if (lang === 'en' && vn === 'maratoneta') console.log(`     ${tag}: ${cards.map(c => `${c.trophies.map(t => t.name).join(' / ')} · «${c.next}» · margini ${c.top}/${c.bottom}`).join(' | ')}`);
      }
    }
    check(`${w}×${h}: nessun errore nella pagina`, !errs.length, errs.slice(0, 3).join(' | '));
    await g.context().close();
  }
} catch (e){ check('prova senza eccezioni', false, e.stack || String(e)); }
finally { await B.close(); stop(); summary(); setTimeout(() => process.exit(process.exitCode || 0), 300); }
