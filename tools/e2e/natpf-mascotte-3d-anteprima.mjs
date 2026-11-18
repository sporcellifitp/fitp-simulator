// NATPF B63/B67/B69 · anteprima delle mascotte 3D con le animazioni della card (natpf_card_moves.js e natpf_card_balli.js;
// dal B69 accese di base con Lob & Drop). Serve all'utente per vedere i movimenti. Fa, nella cartella OUT:
//   · i fogli veri della card (foglio-<movimento>-<lato>.png): due partite dello stesso schermo con Lob & Drop, una vinta
//     da Drop (Player 1) e una da Lob, dieci giri ciascuna con un movimento diverso per esito (10 di vittoria, 5 di
//     sconfitta): così ogni mascotte fa tutti e quindici i movimenti;
//   · griglia/NN.png e griglia.webp: la griglia animata (vittorie in alto, sconfitte in basso, una riga per Drop e una per
//     Lob; WebP con ffmpeg se c'è, altrimenti solo i fotogrammi);
//   · grande-<movimento>-<lato>-<k>.png: qualche fotogramma singolo grande (520 × 650) con la stessa camera della card;
//   · card-1920x1080.png e card-area-640x360.png: la schermata finale vera a 1920 × 1080 e in un'area piccola (?area=).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-mascotte-3d-anteprima.mjs     (OUT=cartella, GAME_PORT=porta)
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PORT = +(process.env.GAME_PORT || 3195), OUT = process.env.OUT || path.join(SP, 'mascotte-3d'); mkdirSync(path.join(OUT, 'griglia'), { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(`http://127.0.0.1:${PORT}/`, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) break; await sleep(500); }
const png = (file, url) => writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
const WIN = ['win-salti', 'win-giro', 'win-sei', 'win-aura', 'win-robot', 'win-disco', 'win-corsa', 'win-incrocio', 'win-pendolo', 'win-tetto'];
const LOSE = ['lose-trascina', 'lose-sospiro', 'lose-lacrima', 'lose-sasso', 'lose-capriccio'];
const ROUNDS = WIN.length;

// pagina del gioco con Lob & Drop e l'interruttore acceso, partita dello stesso schermo finita (vince chi si dice)
async function open(B, { w = 1280, h = 720, qs = '' } = {}){
  const { p: g, errs } = await page(B, `http://127.0.0.1:${PORT}/?intro=0&personaggi=lobdrop${qs}`, { w, h });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model && window.__natpfTennis.opponent?.model, null, { timeout: 180000 });
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await g.waitForFunction(() => __natpfTennis.player?.natpfMascot3dOn && __natpfTennis.opponent?.natpfMascot3dOn, null, { timeout: 120000 }).catch(() => {});
  return { g, errs };
}
const finish = (g, winner) => g.evaluate(winner => {
  const E = __natpfTennis, ui = E.natpfUi;
  ui.onboarding?.close?.(); E.hud.hideTitleModal?.(); ui.lobby.visible = false; E.hud.hideVictoryModal();
  ui.testInput = true; ui.selectController('mouse', { open: false });
  E.autoPlayMode = false; E.userHasInteracted = true;
  E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; E.startSplit();
  E.natpfFair = false; E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 1;
  for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++){ E.ball.rallyStrokeCount = 9; E._awardPoint(winner, 'Out'); }
}, winner);
// un giro di fotografie con il movimento k di ciascun esito (Math.random fisso, niente «ultimo» salvato: vittoria k di 10,
// sconfitta k/2 di 5)
async function round(g, k){
  await g.evaluate(({ k, n }) => { localStorage.removeItem('natpf-tennis.mosse3d'); window.__rnd ||= Math.random; Math.random = () => (k + 0.5)/n; const R = __natpfTennis.natpfUi.ritratti; R.last = null; R.job = null; R.state = 'idle'; }, { k, n: ROUNDS });
  const info = await g.waitForFunction(() => { const r = __natpfTennis.natpfUi.ritratti.info(); return r.ready || r.state === 'svg' ? r : null; }, null, { timeout: 300000, polling: 500 }).then(h => h.jsonValue(), () => null);
  await g.evaluate(() => { Math.random = window.__rnd; });
  const sheets = await g.evaluate(() => { const L = __natpfTennis.natpfUi.ritratti.last; return L?.items.map(it => ({ side: it.side, move: it.move, png: it.sheet.toDataURL('image/png') })) || []; });
  return { info, sheets };
}

const B = await launch();
const t0 = Date.now(), seen = {}, logs = [];
try {
  const { g, errs } = await open(B);
  for (const winner of ['player', 'opponent']){
    await finish(g, winner);
    for (let k = 0; k < ROUNDS; k++){
      const { info, sheets } = await round(g, k);
      for (const s of sheets){ png(`${OUT}/foglio-${s.move}-${s.side}.png`, s.png); seen[`${s.move}:${s.side}`] = true; }
      logs.push(info?.log);
      check(`vince ${winner}, giro ${k + 1}: due fogli pronti (${info?.K} fotogrammi, ${info?.size})`, info?.ready && sheets.length === 2 && sheets.every(s => s.move), JSON.stringify({ bytes: info?.sheetBytes, log: info?.log }));
    }
  }
  const want = [...WIN, ...LOSE].flatMap(m => ['player', 'opponent'].map(s => `${m}:${s}`));
  check('ogni mascotte ha fatto i quindici movimenti', want.every(k => seen[k]), want.filter(k => !seen[k]).join(' '));
  const ms = logs.map(l => l?.ms || 0);
  console.log(`   cattura: ${ms.join(', ')} ms (programmi shader nuovi: ${logs.map(l => l?.programmi).join(', ')})`);

  // griglia animata: vittorie (10 colonne) e sotto le sconfitte (5), una riga per Drop (player) e una per Lob (opponent)
  const frames = await g.evaluate(async ({ cols }) => {
    const { cardMove } = await import('/src/natpf/natpf_card_moves.js');
    return { cols: cols.map(id => ({ id, name: cardMove(id).name })) };
  }, { cols: [...WIN, ...LOSE] });
  const { readFileSync } = await import('node:fs');
  const sheetData = {};
  for (const id of [...WIN, ...LOSE]) for (const side of ['player', 'opponent']) sheetData[`${id}:${side}`] = 'data:image/png;base64,' + readFileSync(`${OUT}/foglio-${id}-${side}.png`).toString('base64');
  const grid = await g.evaluate(async ({ cols, sheetData }) => {
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const img = {}; for (const [k, v] of Object.entries(sheetData)) img[k] = await load(v);
    const cw = 168, ch = 210, top = 40, lab = 22, K = 24, fw = 256, fh = 320, N = 10;
    const blocks = [cols.filter(c => c.id.startsWith('win')), cols.filter(c => c.id.startsWith('lose'))];
    const bh = top + 2*(lab + ch);
    const c = document.createElement('canvas'); c.width = N*cw; c.height = 2*bh; const x = c.getContext('2d');
    const out = [];
    for (let k = 0; k < K; k++){
      x.fillStyle = '#0b1230'; x.fillRect(0, 0, c.width, c.height);
      blocks.forEach((list, b) => list.forEach((col, i) => {
        const win = col.id.startsWith('win'), X = i*cw, Y = b*bh;
        x.fillStyle = win ? '#d9f24a' : '#ff7aa8'; x.font = 'bold 13px sans-serif'; x.fillText(win ? 'VITTORIA' : 'SCONFITTA', X + 6, Y + 16);
        x.fillStyle = '#ffffff'; x.font = '12px sans-serif'; x.fillText(col.name.length > 24 ? col.name.slice(0, 23) + '…' : col.name, X + 6, Y + 32);
        ['player', 'opponent'].forEach((side, r) => {
          const y = Y + top + r*(lab + ch);
          x.fillStyle = '#c9d4ff'; x.font = 'bold 12px sans-serif'; x.fillText(side === 'player' ? 'Drop' : 'Lob', X + 6, y + 15);
          x.drawImage(img[`${col.id}:${side}`], k*fw, 0, fw, fh, X + 2, y + lab, cw - 4, ch - 4);
        });
      }));
      out.push(c.toDataURL('image/png'));
    }
    return out;
  }, { cols: frames.cols, sheetData });
  grid.forEach((u, k) => png(`${OUT}/griglia/${String(k).padStart(2, '0')}.png`, u));
  const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(24/2.049), '-i', `${OUT}/griglia/%02d.png`, '-c:v', 'libwebp_anim', '-loop', '0', '-quality', '72', `${OUT}/griglia.webp`]);
  check('griglia animata', grid.length === 24, ff.status === 0 ? `${OUT}/griglia.webp` : 'ffmpeg non disponibile: solo i fotogrammi in griglia/');

  // fotogrammi singoli grandi con la stessa camera della card (520 × 650)
  // (B69: i balletti nuovi, in tre momenti ciascuno: grande-<movimento>-<lato>-<k>.png e un foglio unico grandi-b69.png)
  const BIG = [['win-robot', 'player', 5], ['win-robot', 'opponent', 11], ['win-robot', 'player', 17], ['win-disco', 'player', 2], ['win-disco', 'player', 5], ['win-disco', 'opponent', 20],
    ['win-corsa', 'player', 2], ['win-corsa', 'opponent', 5], ['win-corsa', 'player', 8], ['win-incrocio', 'player', 1], ['win-incrocio', 'opponent', 4], ['win-incrocio', 'player', 13],
    ['win-pendolo', 'opponent', 2], ['win-pendolo', 'player', 5], ['win-pendolo', 'opponent', 8], ['win-tetto', 'player', 2], ['win-tetto', 'opponent', 5], ['win-tetto', 'player', 8],
    ['lose-sasso', 'player', 12], ['lose-sasso', 'opponent', 9], ['lose-capriccio', 'player', 1], ['lose-capriccio', 'opponent', 4]];
  for (const [id, side, k] of BIG){
    const url = await g.evaluate(async ({ id, side, k }) => {
      const E = __natpfTennis, R = E.natpfUi.ritratti, { cardMove, CARD_LOOP } = await import('/src/natpf/natpf_card_moves.js');
      const K = 24, W = 520, H = 650, actor = side === 'opponent' ? E.opponent : E.player;
      const it = { side, actor, color: side === 'opponent' ? '#7a2e5b' : '#1d5e2a', k: 0, warm: 0, box: null, move: cardMove(id), t: 0 };
      const c = document.createElement('canvas'); c.width = W; c.height = H; it.sheet = c; it.ctx = c.getContext('2d');
      R._prepareMoves([it]); R._hold(it);
      for (let i = 0; i < K; i++){ R._advance(it, CARD_LOOP/K); R._measure(it); }
      R._padFx(it);
      for (let i = 0; i <= k; i++) R._advance(it, CARD_LOOP/K);
      it.k = 0; R._shoot(it, { w: W, h: H, programs: 0, K, period: CARD_LOOP });
      R._release(it);
      return c.toDataURL('image/png');
    }, { id, side, k });
    png(`${OUT}/grande-${id}-${side}-${k}.png`, url);
  }
  const big = await g.evaluate(async ({ urls }) => {
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const W = 260, H = 325, cols = 6, c = document.createElement('canvas'); c.width = cols*W; c.height = Math.ceil(urls.length/cols)*H; const x = c.getContext('2d');
    for (let i = 0; i < urls.length; i++) x.drawImage(await load(urls[i]), (i % cols)*W, Math.floor(i/cols)*H, W, H);
    return c.toDataURL('image/png');
  }, { urls: BIG.map(([id, side, k]) => 'data:image/png;base64,' + readFileSync(`${OUT}/grande-${id}-${side}-${k}.png`).toString('base64')) });
  png(`${OUT}/grandi-b69.png`, big);
  check('nessun errore nella pagina', !errs.length, errs.slice(0, 3).join(' | '));

  // la schermata vera: a 1920 × 1080 e in un'area piccola (ledwall), con la card della sconfitta triste
  for (const [name, w, h, qs] of [['card-1920x1080', 1920, 1080, ''], ['card-area-640x360', 1920, 1080, '&area=40,40,640,360']]){
    const { g: p, errs: e2 } = await open(B, { w, h, qs });
    await finish(p, 'player');
    const { info } = await round(p, 5);       // (B69: disco con il dab e la lacrima)
    await sleep(1500);
    await p.waitForFunction(() => document.querySelector('#victory-cards .card-art[data-ritratto="3d"]'), null, { timeout: 30000 }).catch(() => {});
    await p.screenshot({ path: `${OUT}/${name}.png` });
    check(`${name}: card con le mascotte 3D (cattura ${info?.log?.ms} ms, ${info?.K} fotogrammi ${info?.size}, fogli ${(info?.sheetBytes/1048576).toFixed(1)} MB)`, info?.ready, JSON.stringify(info?.log));
    check(`${name}: nessun errore`, !e2.length, e2.slice(0, 3).join(' | '));
    await p.context().close();
  }
  console.log(`   tempo totale ${Math.round((Date.now() - t0)/1000)} s; uscita in ${OUT}`);
} finally { await B.close(); vite.kill(); summary(); }
