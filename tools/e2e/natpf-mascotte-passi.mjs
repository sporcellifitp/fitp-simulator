// NATPF B73 · passi delle mascotte 3D nella card di fine partita (richiesta dell'utente del 16/11 ripresa il 20/11: «migliorare
// le movenze con i piedi: avanti, indietro, destra e sinistra», «falli»; docs/b73/passi-mascotte.md). Gioco vero nel browser
// (server di sviluppo, Lob & Drop, stesso schermo: Drop sulla card del Player 1, Lob su quella del Player 2), partite vinte
// dal Player 1 e dal Player 2. Per ogni giro un movimento scelto di vittoria e uno di sconfitta (Math.random fisso durante la
// scelta, come natpf-mascotte-3d-anteprima.mjs), poi:
//   · finestra del personaggio: in ogni fotogramma del foglio, ritagliato come lo mostra la card (copertura), la figura
//     (pixel diversi dal fondo) resta dentro la finestra; quanto si sposta (centro a destra e a sinistra, piedi in su e in
//     giù, altezza: avanti e indietro); la finestra non tocca nome, numeri e trofei della card;
//   · piedi (sui modelli caricati nella pagina, 96 campioni per giro come la cattura): il piede che sta a terra non scivola
//     mentre il corpo si sposta, e i movimenti con i passi si spostano davvero avanti, indietro, a destra e a sinistra;
//   · strisce di fotogrammi: una schermata delle due finestre ogni 120 ms per un giro (2,05 s), in OUT/striscia-*.png;
//   · tempo della cattura (somma delle fette di 6 ms; SwiftShader, macchina condivisa: da rifare da sola prima di dirla lenta).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-mascotte-passi.mjs        (GAME_PORT, OUT, W, H; PRIMA=1 misura
//   soltanto, senza le verifiche dei passi: serve a confrontare con il codice di prima)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PORT = +(process.env.GAME_PORT || 3197), OUT = process.env.OUT || path.join(SP, 'mascotte-passi'); mkdirSync(OUT, { recursive: true });
const W = +(process.env.W || 1280), H = +(process.env.H || 720), PRIMA = process.env.PRIMA === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(`http://127.0.0.1:${PORT}/`, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) break; await sleep(500); }
const png = (file, buf) => writeFileSync(file, typeof buf === 'string' ? Buffer.from(buf.split(',')[1], 'base64') : buf);

// movimenti da guardare: prima quelli che spostano il personaggio; quelli che non ci sono (codice di prima) si saltano
const ROUNDS = [
  ['win-passi', 'lose-indietro'], ['win-salti', 'lose-trascina'], ['win-incrocio', 'lose-sasso'], ['win-aura', 'lose-capriccio'], ['win-robot', 'lose-lacrima'],
];
// passi veri: chi si sposta e in che direzioni (metri, di chi guarda: destra, verso chi guarda), almeno quanto
const TRAVEL = {
  'win-passi': { r: 0.2, f: 0.2 }, 'lose-indietro': { f: 0.15 }, 'win-salti': { r: 0.2 }, 'lose-trascina': { r: 0.15 },
};

async function open(B){
  const { p: g, errs } = await page(B, `http://127.0.0.1:${PORT}/?intro=0&personaggi=lobdrop`, { w: W, h: H });
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
  E.natpfStats.shot(E, { role: 'p1', grade: 'PERFECT', kmh: 118 });
  for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++){ E.ball.rallyStrokeCount = 9; E._awardPoint(winner, 'Out'); }
  return E.phase;
}, winner);
// valore fisso di Math.random che sceglie il movimento di vittoria voluto (e, se si può, quello di sconfitta)
const pickR = (g, win, lose) => g.evaluate(async ({ win, lose }) => {
  const { CARD_MOVES } = await import('/src/natpf/natpf_card_moves.js');
  const iw = CARD_MOVES.win.findIndex(m => m.id === win), il = CARD_MOVES.lose.findIndex(m => m.id === lose), nw = CARD_MOVES.win.length, nl = CARD_MOVES.lose.length;
  if (iw < 0) return null;
  const a = Math.max(iw/nw, il >= 0 ? il/nl : 0), b = Math.min((iw + 1)/nw, il >= 0 ? (il + 1)/nl : 1);
  return a < b ? (a + b)/2 : (iw + 0.5)/nw;
}, { win, lose });
async function round(g, r){
  await g.evaluate(r => { localStorage.removeItem('natpf-tennis.mosse3d'); window.__rnd ||= Math.random; Math.random = () => r; const R = __natpfTennis.natpfUi.ritratti; R.last = null; R.job = null; R.state = 'idle'; }, r);
  const info = await g.waitForFunction(() => { const r = __natpfTennis.natpfUi.ritratti.info(); return r.ready || r.state === 'svg' ? r : null; }, null, { timeout: 300000, polling: 300 }).then(h => h.jsonValue(), () => null);
  await g.evaluate(() => { Math.random = window.__rnd; });
  await g.evaluate(() => __natpfTennis.natpfUi.ritratti._attach());
  await g.waitForFunction(() => [...document.querySelectorAll('#victory-cards .card-art')].every(a => a.dataset.ritratto === '3d' && a.querySelector('canvas.card-portrait')?.dataset.k), null, { timeout: 30000 }).catch(() => {});
  return info;
}
// figura nella finestra: per ogni fotogramma del foglio, riquadro dei pixel diversi dal fondo, nelle coordinate della finestra
// come la card lo mostra (natpf_ritratti._play: copertura); posizione della finestra rispetto a nome, numeri e trofei
const windowCheck = g => g.evaluate(() => {
  const R = __natpfTennis.natpfUi.ritratti, L = R.last, out = [];
  for (const it of L.items){
    const art = document.querySelector(`#victory-cards .card-art[data-portrait="${it.side}"]`), card = art.closest('.end-card'), A = art.getBoundingClientRect();
    const Wn = art.clientWidth, Hn = art.clientHeight, fr = L.w/L.h, cr = Wn/Hn;
    let sw = L.w, sh = L.h; if (cr > fr) sh = L.w/cr; else sw = L.h*cr;
    const ox = (L.w - sw)/2, oy = (L.h - sh)/2, k = Wn/sw;
    const c = it.sheet.getContext('2d'), frames = [];
    for (let f = 0; f < L.K; f++){
      const d = c.getImageData(f*L.w, 0, L.w, L.h).data, bg = [d[0], d[1], d[2]];
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++){ const i = 4*(y*L.w + x); if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 40){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      frames.push({ x0: (x0 - ox)*k, x1: (x1 + 1 - ox)*k, y0: (y0 - oy)*k, y1: (y1 + 1 - oy)*k });
    }
    const rect = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const touch = [...card.querySelectorAll('.card-name, .card-trophies, .end-tiles, .card-record, .card-next')].filter(el => el.offsetParent).map(el => ({ cls: el.className, ...rect(el) }))
      .filter(q => q.l < A.right && q.r > A.left && q.t < A.bottom && q.b > A.top);
    const cx = frames.map(f => (f.x0 + f.x1)/2), foot = frames.map(f => f.y1), tall = frames.map(f => f.y1 - f.y0);
    const rng = a => Math.max(...a) - Math.min(...a);
    out.push({ side: it.side, move: it.move, w: Wn, h: Hn, frame: [L.w, L.h],
      inside: frames.every(f => f.x0 >= 0 && f.y0 >= 0 && f.x1 <= Wn && f.y1 <= Hn),
      margin: +Math.min(...frames.map(f => Math.min(f.x0/Wn, f.y0/Hn, 1 - f.x1/Wn, 1 - f.y1/Hn)*100)).toFixed(1),
      cx: +(100*rng(cx)/Wn).toFixed(1), feet: +(100*rng(foot)/Hn).toFixed(1), tall: +(100*rng(tall)/Math.max(...tall)).toFixed(1), touch });
  }
  return out;
});
// piedi sui modelli della pagina, 96 campioni per giro (come la cattura: giro di prova, poi il giro misurato)
const feetCheck = (g, side, id) => g.evaluate(async ({ side, id }) => {
  const E = __natpfTennis, R = E.natpfUi.ritratti, { cardMove, CARD_LOOP } = await import('/src/natpf/natpf_card_moves.js');
  const actor = side === 'opponent' ? E.opponent : E.player, move = cardMove(id), N = 96;
  const it = { side, actor, color: '#123456', k: 0, warm: 0, box: null, move, t: 0 };
  R._prepareMoves([it]); R._hold(it);
  const dir = (actor.sideSign || 1) > 0 ? -1 : 1, b = it.base.pos, S = [];
  for (let i = 0; i < N; i++) R._advance(it, CARD_LOOP/N);
  for (let i = 0; i < N; i++){
    R._advance(it, CARD_LOOP/N);
    const p = actor.natpfMascot3d.probe(actor, {}), v = q => ({ r: dir*(q.x - b.x), f: dir*(q.z - b.z), y: q.y - b.y });
    S.push({ root: v(actor.root.position), A: v(p.soleA), B: v(p.soleB) });
  }
  R._release(it);
  const res = { rootR: 0, rootF: 0 };
  for (const k of ['r', 'f']){ const xs = S.map(s => s.root[k]); res[k === 'r' ? 'rootR' : 'rootF'] = Math.max(...xs) - Math.min(...xs); }
  for (const F of ['A', 'B']){
    const low = Math.min(...S.map(s => s[F].y)); let slip = 0, slipMax = 0, steps = 0, liftFrom = null;
    for (let i = 0; i < N; i++){
      const s = S[i][F], q = S[(i + N - 1) % N][F], down = s.y < low + 0.012, prev = q.y < low + 0.012;
      if (down && prev){ const d = Math.hypot(s.r - q.r, s.f - q.f); slip += d; slipMax = Math.max(slipMax, d); }
      if (!down && prev) liftFrom = q;
      if (down && !prev && liftFrom && Math.hypot(s.r - liftFrom.r, s.f - liftFrom.f) > 0.03) steps++;
    }
    res[F] = { slip: +(slip*100).toFixed(1), slipMax: +(slipMax*1000).toFixed(1), steps };
  }
  return res;
}, { side, id });

const B = await launch();
const t0 = Date.now(), ms = [];
try {
  const { g, errs } = await open(B);
  for (const winner of ['player', 'opponent']){
    check(`vince ${winner}: partita dello stesso schermo finita`, await finish(g, winner) === 'MATCH_OVER');
    for (const [win, lose] of ROUNDS){
      const r = await pickR(g, win, lose); if (r == null){ console.log(`   (${win}: non c'è in questo codice, saltato)`); continue; }
      const info = await round(g, r);
      const moves = await g.evaluate(() => __natpfTennis.natpfUi.ritratti.last?.items.map(i => `${i.side}:${i.move}`));
      ms.push(info?.log?.ms);
      check(`vince ${winner}, ${moves?.join(' ')}: due fogli pronti (${info?.K} fotogrammi ${info?.size}, cattura ${info?.log?.ms} ms, programmi nuovi ${info?.log?.programmi})`, info?.ready && moves?.length === 2 && info.log?.programmi === 0, JSON.stringify(info?.log));
      // finestra del personaggio
      for (const w of await windowCheck(g)){
        const who = w.side === 'player' ? 'Drop' : 'Lob';
        console.log(`   ${who} ${w.move}: finestra ${w.w}×${w.h} (fotogramma ${w.frame.join('×')}); centro della figura che va da una parte all'altra ${w.cx} % della larghezza, piedi su e giù ${w.feet} %, altezza che cambia ${w.tall} %; margine minimo ${w.margin} %`);
        check(`   ${who} ${w.move}: figura sempre dentro la finestra della card`, w.inside, JSON.stringify(w));
        check(`   ${who} ${w.move}: la finestra non tocca nome, numeri e trofei`, !w.touch.length, JSON.stringify(w.touch));
        const T = TRAVEL[w.move];
        if (!PRIMA && T?.r) check(`   ${who} ${w.move}: si vede spostarsi di lato nella finestra (centro ≥ 8 % della larghezza)`, w.cx >= 8, `${w.cx} %`);
        if (!PRIMA && T?.f) check(`   ${who} ${w.move}: si vede venire avanti e tornare indietro (piedi ≥ 3 % dell'altezza o altezza ≥ 3 %)`, w.feet >= 3 || w.tall >= 3, `${w.feet} %, ${w.tall} %`);
      }
      // strisce: le due finestre come le mostra la card (il canvas del personaggio), ogni 120 ms per un giro, prese nella
      // pagina (una schermata di Playwright qui costa 150–200 ms con SwiftShader: non starebbe nei 120 ms); una riga per card
      const { strip, ts } = await g.evaluate(async () => {
        const arts = [...document.querySelectorAll('#victory-cards .card-art')], cvs = arts.map(a => a.querySelector('canvas.card-portrait'));
        const n = 18, w = cvs[0].width, h = cvs[0].height, lab = 16, c = document.createElement('canvas');
        c.width = n*(w + 4); c.height = arts.length*(h + lab + 4); const x = c.getContext('2d');
        x.fillStyle = '#0b1230'; x.fillRect(0, 0, c.width, c.height);
        const ts = [], t0 = performance.now();
        for (let i = 0; i < n; i++){
          const due = t0 + i*120; await new Promise(r => setTimeout(r, Math.max(0, due - performance.now())));
          ts.push(Math.round(performance.now() - t0));
          cvs.forEach((cv, j) => { const Y = j*(h + lab + 4); x.drawImage(cv, i*(w + 4), Y + lab, w, h); x.fillStyle = '#fff'; x.font = '11px sans-serif'; x.fillText(`${ts[i]} ms · k ${cv.dataset.k}`, i*(w + 4) + 3, Y + 12); });
        }
        return { strip: c.toDataURL('image/png'), ts };
      });
      const name = `striscia-${winner === 'player' ? 'p1' : 'p2'}-${moves.map(m => m.split(':')[1]).join('-')}${PRIMA ? '-prima' : ''}.png`;
      png(path.join(OUT, name), strip);
      console.log(`   striscia: ${path.join(OUT, name)} (${ts.length} schermate, ogni ${Math.round(ts[ts.length - 1]/(ts.length - 1))} ms)`);
      // piedi
      for (const m of moves){
        const [side, id] = m.split(':'), who = side === 'player' ? 'Drop' : 'Lob', f = await feetCheck(g, side, id), T = TRAVEL[id];
        console.log(`   ${who} ${id}: corpo ${(f.rootR*100).toFixed(1)} cm di lato, ${(f.rootF*100).toFixed(1)} cm avanti-indietro; piede A scivola ${f.A.slip} cm per giro (al più ${f.A.slipMax} mm per campione), passi ${f.A.steps}; piede B ${f.B.slip} cm (${f.B.slipMax} mm), passi ${f.B.steps}`);
        if (PRIMA) continue;
        check(`   ${who} ${id}: il piede che sta a terra non scivola (≤ 3 mm per campione)`, f.A.slipMax <= 3 && f.B.slipMax <= 3, JSON.stringify(f));
        if (T) check(`   ${who} ${id}: passi veri (piedi che si posano in un punto nuovo) e corpo che si sposta ${T.r ? `di lato ≥ ${T.r*100} cm` : ''}${T.f ? ` avanti-indietro ≥ ${T.f*100} cm` : ''}`,
          f.A.steps + f.B.steps >= 2 && (!T.r || f.rootR >= T.r) && (!T.f || f.rootF >= T.f), JSON.stringify(f));
      }
    }
  }
  await g.screenshot({ path: path.join(OUT, `card-${W}x${H}${PRIMA ? '-prima' : ''}.png`) });
  // i 24 fotogrammi del giro, grandi (300 × 375, stessa camera della card), per guardare i piedi: fotogrammi-<movimento>-<lato>.png
  for (const [id, side] of [['win-passi', 'player'], ['win-passi', 'opponent'], ['lose-indietro', 'player'], ['win-salti', 'player'], ['lose-trascina', 'opponent'], ['win-salti', 'opponent'], ['lose-trascina', 'player']]){
    const url = await g.evaluate(async ({ id, side }) => {
      const E = __natpfTennis, R = E.natpfUi.ritratti, { cardMove, CARD_LOOP, CARD_K } = await import('/src/natpf/natpf_card_moves.js');
      const move = cardMove(id); if (!move) return null;
      const K = CARD_K, fw = 300, fh = 375, actor = side === 'opponent' ? E.opponent : E.player;
      const it = { side, actor, color: side === 'opponent' ? '#7a2e5b' : '#1d5e2a', k: 0, warm: 0, box: null, move, t: 0 };
      const s = document.createElement('canvas'); s.width = K*fw; s.height = fh; it.sheet = s; it.ctx = s.getContext('2d');
      R._prepareMoves([it]); R._hold(it);
      for (let i = 0; i < K; i++){ R._advance(it, CARD_LOOP/K); R._measure(it); }
      R._padFx(it);
      for (let k = 0; k < K; k++){ R._advance(it, CARD_LOOP/K); it.k = k; R._shoot(it, { w: fw, h: fh, programs: 0, K, period: CARD_LOOP }); }
      R._release(it);
      const cols = 8, c = document.createElement('canvas'); c.width = cols*fw; c.height = Math.ceil(K/cols)*(fh + 18); const x = c.getContext('2d');
      x.fillStyle = '#0b1230'; x.fillRect(0, 0, c.width, c.height);
      for (let k = 0; k < K; k++){ const X = (k % cols)*fw, Y = Math.floor(k/cols)*(fh + 18); x.drawImage(s, k*fw, 0, fw, fh, X, Y + 18, fw, fh); x.fillStyle = '#fff'; x.font = '13px sans-serif'; x.fillText(`${move.name} · ${k + 1}/${K} · ${Math.round((k + 1)*CARD_LOOP*1000/K)} ms`, X + 4, Y + 14); }
      return c.toDataURL('image/png');
    }, { id, side });
    if (url) png(path.join(OUT, `fotogrammi-${id}-${side === 'player' ? 'drop' : 'lob'}.png`), url);
  }
  check('nessun errore nella pagina', !errs.length, errs.slice(0, 3).join(' | '));
  console.log(`   cattura (ms): ${ms.join(', ')}; tempo totale ${Math.round((Date.now() - t0)/1000)} s; uscita in ${OUT}`);
} finally { await B.close(); vite.kill(); summary(); }
