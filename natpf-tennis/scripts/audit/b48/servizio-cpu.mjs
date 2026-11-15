import { fileURLToPath } from 'node:url';
const third = c => { const x = Math.abs(c.bx ?? c.tx); return x < 4.115/3 ? 'T' : x < 2*4.115/3 ? 'corpo' : 'largo'; };
// B48 · servizio della CPU per livello (punto 17 e miglioramento 10 del rapporto B16): direzione (dove rimbalza davvero:
// «T» il terzo del quadrato vicino alla riga centrale, «corpo» il terzo di mezzo, «largo» il terzo verso il corridoio),
// velocità vera (km/h della palla appena battuta, quella del tabellone), effetto (top spin e laterale), tremolio della
// telecamera, servizi della CPU più veloci della media dei servizi di chi gioca nella stessa partita, punti di chi gioca
// quando batte la CPU. Partite simulate senza grafica (rally-balance.simulate, battuta alternata).
//   (da natpf-tennis) node --import ./test/register.mjs scripts/audit/b48/servizio-cpu.mjs [--points=300] [--seeds=7,11,23] [--profile=medio]
//        [--servizio=insegnato|piano|tardi|forte]  servizio di chi gioca dal telefono (modelli di audit/servizio.mjs)
//        [--difficulty=bambini,casual,evento,pro,leggenda]
// B48.1: in più il massimo di fila nello stesso terzo (rimbalzi veri, seme per seme), la quota dei servizi profondi (rimbalzo
// oltre 5,4 m dalla rete) e i servizi della CPU colpiti da chi risponde prima del rimbalzo (al volo: nel tennis vero il punto
// va a chi batte). [--cpu-prima] la CPU batte per prima nei semi pari (come la revisione del B48)
const ROOT = process.env.ROOT || fileURLToPath(new URL('../../../', import.meta.url));   // natpf-tennis (ROOT=… per misurare un altro albero)
const { simulate } = await import(`${ROOT}/scripts/audit/rally-balance.mjs`);
const { phoneServeOf } = await import(`${ROOT}/scripts/audit/servizio.mjs`);
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const points = +(arg('points') || 300), seeds = (arg('seeds') || '7,11,23').split(',').map(Number), profile = arg('profile') || 'medio';
const model = arg('servizio') || null;
const levels = (arg('difficulty') || 'bambini,casual,evento,pro,leggenda').split(',');
const q = (a, p) => { a = [...a].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p*(a.length - 1)))] : null; };
for (const difficulty of levels){
  const cpu = [], mine = [], runs = [];
  for (const [si, seed] of seeds.entries()){
    const seq = [];
    let pend = null, matchPlayer = [];
    const setup = e => {
      if (process.argv.includes('--cpu-prima') && si % 2 === 0){ e.natpfFair = false; e.natpfServeFirst = 'opponent'; }
      const hit = e._executeServeHit.bind(e);
      e._executeServeHit = (actor, evt) => {
        const was = e.ball.inPlay, trauma0 = e.cameraTrauma;
        hit(actor, evt);
        if (was || !e.ball.inPlay) return;
        const raw = e.ball.vel.length()*3.6, kmh = Math.round(raw);
        if (actor === e.player){ mine.push(kmh); matchPlayer.push(kmh); return; }
        const mean = matchPlayer.length ? matchPlayer.reduce((s, v) => s + v, 0)/matchPlayer.length : null;
        cpu.push(pend = { kmh, raw, box: Math.sign(e.ball.targetLanding.x) || 1, tx: e.ball.targetLanding.x, tz: e.ball.targetLanding.z, top: +e.ball.spin.x.toFixed(1), side: +e.ball.spin.y.toFixed(1),
          trauma: e.cameraTrauma - trauma0, power: !!e.ball.isPowerShot, playerMean: mean, playerMin: matchPlayer.length ? Math.min(...matchPlayer) : null, first: !matchPlayer.length, bx: null, bz: null, won: null });
      };
      const award = e._awardPoint.bind(e);
      e._awardPoint = (who, why) => { if (pend && pend.won == null) pend.won = who === 'player'; pend = null; return award(who, why); };
    };
    const onStep = e => {
      if (pend && pend.bx == null && e.ball.bounceCountOnCurrentSide >= 1 && e.ball.lastHitter === 'opponent'){ pend.bx = e.ball.pos.x; pend.bz = e.ball.pos.z; seq.push(third(pend)); }
      if (pend && pend.bx == null && pend.volley == null && e.ball.lastHitter === 'player') pend.volley = true;
    };
    simulate({ profile, difficulty, points, seed, setup, onStep, ...(model ? { serve: (e, rng) => phoneServeOf(model, e, rng) } : {}) });
    let run = 0, best = 0; seq.forEach((k, i) => { run = i && k === seq[i - 1] ? run + 1 : 1; best = Math.max(best, run); }); runs.push(best);
  }
  const dir = { T: 0, corpo: 0, largo: 0 }; for (const c of cpu) dir[third(c)]++;
  const n = cpu.length || 1, pc = v => +(100*v/n).toFixed(1);
  const effects = {}; for (const c of cpu){ const k = `${c.top}/${c.side === 0 ? 0 : c.side > 0 ? '+' : '-'}`; effects[k] = (effects[k] || 0) + 1; }
  const kmh = cpu.map(c => c.kmh), faster = cpu.filter(c => c.playerMean != null && c.raw > c.playerMean + 1e-6).length, ratio = Math.max(0, ...cpu.filter(c => c.playerMean != null).map(c => c.raw/c.playerMean)), withMean = cpu.filter(c => c.playerMean != null).length;
  const firsts = cpu.filter(c => c.first).map(c => c.kmh);
  const depth = cpu.map(c => Math.abs(c.bz ?? c.tz));
  console.log(JSON.stringify({ difficulty, profile, servizio: model || 'profilo', servCPU: cpu.length, T: pc(dir.T), corpo: pc(dir.corpo), largo: pc(dir.largo),
    kmh: { min: Math.min(...kmh), p10: q(kmh, .1), p50: q(kmh, .5), p90: q(kmh, .9), max: Math.max(...kmh) },
    kmhGiocatore: mine.length ? { n: mine.length, p10: q(mine, .1), p50: q(mine, .5), p90: q(mine, .9) } : null,
    piuVeloceDellaMedia: withMean ? +(100*faster/withMean).toFixed(1) : null, rapportoMax: +ratio.toFixed(3), primiServiziKmh: firsts.length ? { n: firsts.length, max: Math.max(...firsts), p50: q(firsts, .5) } : null,
    profondita: { p10: +q(depth, .1).toFixed(2), p50: +q(depth, .5).toFixed(2), p90: +q(depth, .9).toFixed(2) },
    effetti: Object.fromEntries(Object.entries(effects).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, pc(v)])),
    tremolio: cpu.filter(c => c.trauma > 0).length, puntiGiocatoreSulServizioCPU: pc(cpu.filter(c => c.won).length),
    maxDiFilaStessoTerzo: Math.max(0, ...runs), profondi: pc(depth.filter(z => z > 5.4).length), colpitiAlVolo: cpu.filter(c => c.volley).length }));
}
