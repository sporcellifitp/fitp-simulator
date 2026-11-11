// Banco degli errori della CPU (B18.2, tappa 2 passo 2; difetti 1 e 9 / D1 e D9 di docs/b16/rapporto-gameplay.md):
// come finiscono i punti contro la CPU, quanto sbaglia la CPU sulle palle facili e quanto vale il campo aperto.
// Motore vero senza disegno (headless-engine.mjs), stesso ciclo di rally-balance.mjs: è una misura del gioco simulato
// con i profili di giocatore simulati, non di persone vere.
//   npm run audit:cpu                       (= node --import ./test/register.mjs scripts/audit/cpu-pressione.mjs)
//   npm run audit:cpu -- --difficulty=casual,pro --profiles=umano,medio --points=300 --nsemi=8
//        [--servizio=insegnato]   chi gioca batte il servizio del telefono «con la forma» (servizio.mjs PHONE_SERVES) al
//                                 posto del kick lento dei profili
//        [--prova=pro.cpuSpeed=4.9,pro.cpuErr.run=.2]   valori di prova per natpf_skill.SKILL_LEVELS (cpuTuning)
//        [--obiettivi]            alla fine la tabella degli obiettivi del passo (raggiunto / no); esce con 1 se uno manca.
//                                 Con 8 semi i game oscillano di ±3 punti: per decidere usare --nsemi=16 o più
//        [--json]
// Cosa misura, per livello × profilo:
//   • punti e game vinti da chi gioca (game: primo a 4 con 2 di scarto sulla sequenza dei punti);
//   • come finiscono i punti: CPU in rete, CPU fuori, vincente di chi gioca (la CPU non tocca la palla; a parte quelli
//     al servizio), errore di chi gioca (rete o fuori), palla non presa da chi gioca (punto della CPU);
//   • colpi per punto (media, mediana, p90);
//   • errori della CPU per colpo: tutti, sulle PALLE FACILI (anche per numero del colpo: non devono crescere con lo
//     scambio), per numero del colpo nello scambio, per difficoltà, con la CPU stanca (solo Pro: natpf_skill.cpuTired);
//   • campo aperto: per distanza laterale tra dove cade la palla di chi gioca e dov'era la CPU quando è partita
//     (<2, 2–4, 4–6, >6 m): vincenti, errori della CPU, riprese.
// PALLA FACILE (definizione fisica, non usa il modello d'errore del motore): colpo dello scambio (non la risposta al
// servizio), colpo normale di chi gioca (non palla corta, pallonetto, schiacciata o super), che cade a meno di 2 m di
// lato da dov'era la CPU e a meno di 9,5 m dalla rete (non profonda), e che la CPU colpisce comoda: palla entro metà
// della sua portata e CPU sotto il 30% della sua velocità massima.
import { pathToFileURL } from 'node:url';
import { simulate, openCourtStats } from './rally-balance.mjs';
import * as NS from '../../src/natpf/natpf_skill.js';

const pct = (a, n, d = 1) => +(100*a/Math.max(1, n)).toFixed(d);
const q = (a, p) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p*(s.length - 1)))] : null; };
// game dalla sequenza dei punti (primo a 4 con 2 di scarto), dal punto di vista di chi gioca
export function gamesOf(points){
  let a = 0, b = 0, gw = 0, gl = 0;
  for (const p of points){ if (p.who === 'player') a++; else b++; if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2){ a > b ? gw++ : gl++; a = b = 0; } }
  return { gw, gl };
}
export const SEMI = n => Array.from({ length: n }, (_, i) => 2001 + i*37);
const SPECIAL = new Set(['DROP', 'LOB', 'SMASH']);
// la palla è facile per la CPU? (c: colpo della CPU registrato da watch)
export const easyBall = c => !c.serve && !c.special && c.lat < 2 && c.depth < 9.5 && c.stretch <= .5 && c.running <= .3;
// difficoltà fisica della palla per la CPU, in tre classi (per le tabelle): comoda / media / dura
export const hardBall = c => c.stretch > .8 || c.running > .6 || c.lat >= 4;

// «pro.cpuSpeed=4.9,pro.cpuErr.run=.2» → { pro: { cpuSpeed: 4.9, cpuErr: { run: .2 } } }. Una voce non letta è un errore
export function trialValues(text){
  const out = {};
  for (const kv of String(text || '').split(',').filter(Boolean)){
    const i = kv.indexOf('='), path = kv.slice(0, i).split('.'), n = Number(kv.slice(i + 1));
    if (i < 0 || path.length < 2 || path.some(p => !p) || kv.slice(i + 1) === '' || !Number.isFinite(n)) throw new Error(`--prova: «${kv}» non è livello.nome=numero`);
    let o = out; for (const p of path.slice(0, -1)) o = o[p] || (o[p] = {});
    o[path.at(-1)] = n;
  }
  return out;
}
// applica i valori di prova a NS.cpuTuning (sostituisce quelli di prima); cpuErr e simili si fondono con quelli del livello
export function applyTrial(values){
  if (!NS.cpuTuning) throw new Error('questo motore non ha cpuTuning (prima del B18.2 passo 2): --prova non si può usare');
  for (const k of Object.keys(NS.cpuTuning)) delete NS.cpuTuning[k];
  for (const [lv, v] of Object.entries(values || {})){
    const base = NS.SKILL_LEVELS[lv]; if (!base) throw new Error(`--prova: livello «${lv}» sconosciuto`);
    const t = {};
    for (const [k, val] of Object.entries(v)){
      if (val && typeof val === 'object'){ if (base[k] != null && typeof base[k] !== 'object') throw new Error(`--prova: «${lv}.${k}» non è un gruppo del livello`); t[k] = { ...(base[k] || {}), ...val }; }
      else t[k] = val;
    }
    NS.cpuTuning[lv] = t;
  }
  return NS.cpuTuning;
}

// Una partita simulata con il registro dei colpi della CPU e della fine dei punti
export function watch({ profile = 'medio', difficulty = 'casual', points = 300, seed = 7, serve = null } = {}){
  const cpu = [], ends = [];
  let hit = null, lastCpuShot = null, touched = false;
  const setup = e => {
    const exec = e._executeOpponentReturn, strike = e._attemptPlayerRallyStrike, award = e._awardPoint, serveHit = e._executeServeHit;
    // colpo di chi gioca andato a segno: dov'era la CPU e dove va la palla
    e._attemptPlayerRallyStrike = function(evt, auto){
      const before = this.ball.lastHitter, ok = strike.call(this, evt, auto);
      if (ok && before !== 'player' && this.ball.lastHitter === 'player'){
        const o = this.opponent, t = this.ball.targetLanding;
        hit = { cpuX: o.pos.x, cpuZ: o.pos.z, x: t.x, z: t.z, t: this.elapsedTime, shot: String(this.natpfSkill?.lastShot?.shot || this.ball.shotType || '').toUpperCase(), power: this.natpfSkill?.lastShot?.power ?? null, sup: !!this.ball.natpfSuper };
      }
      return ok;
    };
    e._executeServeHit = function(actor, evt){
      serveHit.call(this, actor, evt); touched = false; lastCpuShot = null;
      const o = this.opponent, t = this.ball.targetLanding;
      hit = actor === this.player ? { cpuX: o.pos.x, cpuZ: o.pos.z, x: t.x, z: t.z, t: this.elapsedTime, shot: 'SERVE', power: null, sup: false, serve: true } : null;
    };
    e._executeOpponentReturn = function(actor = this.opponent){
      const b = this.ball, o = actor, lv = NS.skillLevel(this.matchConfig.difficulty), reach = lv.cpuReach || 1.5;
      const rec = { rally: b.rallyStrokeCount, serve: !!hit?.serve, special: !hit || SPECIAL.has(hit.shot) || hit.sup, shot: hit?.shot || null,
        stretch: Math.abs(b.pos.x - o.pos.x)/reach, running: o.vel.length()/Math.max(1, o.maxSpeed), speed: b.vel.length(),
        lat: hit ? Math.abs(hit.x - hit.cpuX) : 0, depth: hit ? -hit.z : 0, run: hit ? Math.abs(o.pos.x - hit.cpuX) : 0, time: hit ? this.elapsedTime - hit.t : 0,
        tired: NS.cpuTired ? NS.cpuTired(this) : 0, chance: null, kind: null, out: null };
      exec.call(this, actor);
      const lc = this.natpfSkill?.lastCpu;
      if (actor === this.opponent && lc){ rec.chance = lc.chance; rec.kind = lc.kind ?? null; }
      rec.defense = this.natpfCpuDefense?.at === this.elapsedTime;
      rec.lob = b.shotType === 'LOB';
      if (actor === this.opponent){ cpu.push(rec); lastCpuShot = rec; }
      touched = true; hit = null;
    };
    e._awardPoint = function(who, why = ''){
      const b = this.ball, last = b.lastHitter, serveOnly = b.rallyStrokeCount <= 1;
      let end;
      if (why === 'scambio infinito') end = 'infinito';
      else if (who === 'player') end = last === 'opponent' ? (why === 'Net' ? 'cpuRete' : 'cpuFuori') : (serveOnly && !touched ? 'vincenteServizio' : 'vincente');
      else end = last === 'player' ? (why === 'Net' ? 'gRete' : why === 'Out' ? 'gFuori' : 'gAltro') : 'nonPresa';
      ends.push({ who, why, end, hits: b.rallyStrokeCount });
      if (lastCpuShot && last === 'opponent' && who === 'player') lastCpuShot.out = why === 'Net' ? 'rete' : 'fuori';
      lastCpuShot = null; hit = null; touched = false;
      return award.call(this, who, why);
    };
  };
  const sim = simulate({ profile, difficulty, points, seed, setup, serve });
  return { sim, cpu, ends };
}

// Riassunto di più partite (semi) di una casella livello × profilo
export function summary(runs){
  const ends = runs.flatMap(r => r.ends), cpu = runs.flatMap(r => r.cpu), n = ends.length;
  const cnt = k => ends.filter(e => e.end === k).length;
  let gw = 0, gl = 0; for (const r of runs){ const g = gamesOf(r.ends); gw += g.gw; gl += g.gl; }
  const hits = ends.map(e => e.hits), won = ends.filter(e => e.who === 'player').length;
  const err = a => pct(a.filter(c => c.out).length, a.length), net = a => pct(a.filter(c => c.out === 'rete').length, a.length);
  const rally = cpu.filter(c => !c.serve), easy = cpu.filter(easyBall), hard = rally.filter(hardBall), mid = rally.filter(c => !easyBall(c) && !hardBall(c));
  const strokes = set => [[1, 6], [7, 16], [17, 99]].map(([a, b]) => { const s = set.filter(c => c.rally >= a && c.rally <= b); return { colpi: `${a}–${b === 99 ? '…' : b}`, n: s.length, errori: err(s) }; });
  const byStroke = strokes(rally), tired = rally.filter(c => c.tired > 0), fresh = rally.filter(c => !(c.tired > 0));
  const open = openCourtStats(runs.map(r => r.sim));
  const perSeed = runs.map(r => 100*r.ends.filter(e => e.who === 'player').length/Math.max(1, r.ends.length)), mean = perSeed.reduce((s, v) => s + v, 0)/perSeed.length;
  const sd = perSeed.length > 1 ? Math.sqrt(perSeed.reduce((s, v) => s + (v - mean)**2, 0)/(perSeed.length - 1)) : 0;
  return {
    punti: n, puntiG: pct(won, n), puntiGErr: +(sd/Math.sqrt(perSeed.length)).toFixed(2), game: gw + gl, gameG: pct(gw, gw + gl),
    fine: { cpuRete: pct(cnt('cpuRete'), n), cpuFuori: pct(cnt('cpuFuori'), n), vincente: pct(cnt('vincente'), n), vincenteServizio: pct(cnt('vincenteServizio'), n),
      gRete: pct(cnt('gRete'), n), gFuori: pct(cnt('gFuori') + cnt('gAltro'), n), nonPresa: pct(cnt('nonPresa'), n) },
    erroriCpuPunti: pct(cnt('cpuRete') + cnt('cpuFuori'), n), vincentiPunti: pct(cnt('vincente') + cnt('vincenteServizio'), n),
    vincentiSuVinti: pct(cnt('vincente') + cnt('vincenteServizio'), won),
    colpi: { media: +(hits.reduce((s, v) => s + v, 0)/Math.max(1, hits.length)).toFixed(2), mediana: q(hits, .5), p90: q(hits, .9), max: Math.max(0, ...hits) },
    cpuColpi: cpu.length, erroriPerColpo: err(cpu), retePerColpo: net(cpu),
    facili: { n: easy.length, quota: pct(easy.length, rally.length), errori: err(easy), rete: net(easy), perColpo: strokes(easy) },
    stanca: { n: tired.length, quota: pct(tired.length, rally.length), errori: err(tired), erroriFresca: err(fresh), erroriFacili: err(tired.filter(easyBall)) },
    medie: { n: mid.length, errori: err(mid) }, dure: { n: hard.length, quota: pct(hard.length, rally.length), errori: err(hard) },
    risposta: { n: cpu.length - rally.length, errori: err(cpu.filter(c => c.serve)) },
    perColpo: byStroke, difensive: pct(cpu.filter(c => c.defense).length, cpu.length), pallonetti: pct(cpu.filter(c => c.lob).length, cpu.length),
    campo: Object.fromEntries(['lato <2 m', 'lato 2-4 m', 'lato 4-6 m', 'lato >6 m'].map(k => [k.slice(5), open[k] ? { n: open[k].n, vincenti: open[k].vincenti, erroriCPU: open[k].erroriCPU, riprese: open[k].riprese } : null])),
  };
}
export function measure({ difficulty = 'pro', profile = 'medio', points = 300, seeds = SEMI(8), serve = null } = {}){
  return summary(seeds.map(seed => watch({ profile, difficulty, points, seed, serve })));
}

// Obiettivi del passo (docs/b18/t2-2-cpu-pressione.md). rows: { 'livello/profilo': summary }
export function goals(rows){
  const g = [], R = k => rows[k], has = (...ks) => ks.every(k => rows[k]);
  const each = (ks, f) => ks.filter(k => rows[k]).map(k => [k, f(rows[k])]);
  const add = (name, list, ok) => { if (list.length) g.push({ name, ok: list.every(([, v]) => ok(v)), values: Object.fromEntries(list) }); };
  const CP = Object.keys(rows).filter(k => /^(casual|pro)\//.test(k));
  add('CPU in rete al massimo in 1 punto su 8 (12,5%), Casual e Pro', each(CP, r => r.fine.cpuRete), v => v <= 12.5);
  // decide solo la casella con almeno 300 palle facili (sotto, l'errore della misura supera un punto: «tennista» ne riceve
  // circa 160 con 8 semi); le altre si leggono tra parentesi
  const few = CP.filter(k => rows[k].facili.n < 300);
  add(`errori della CPU sulle palle facili non oltre il 3%, Casual e Pro${few.length ? ` (non decidono, meno di 300 palle facili: ${few.map(k => `${k} ${rows[k].facili.errori}% su ${rows[k].facili.n}`).join(', ')})` : ''}`,
    each(CP.filter(k => !few.includes(k)), r => r.facili.errori), v => v <= 3);
  add('palle facili: l\'errore non cresce con lo scambio (dal 17° colpo non oltre il 3%)', each(CP.filter(k => rows[k].facili.perColpo[2].n >= 100), r => r.facili.perColpo[2].errori), v => v <= 3);
  if (has('pro/umano')) add('Pro, palla a 4–6 m dalla CPU: almeno il 15% di vincenti («umano»)', [['pro/umano', R('pro/umano').campo['4-6 m']?.vincenti ?? 0]], v => v >= 15);
  if (has('pro/medio')) add('Pro, palla a 4–6 m dalla CPU: almeno il 15% di vincenti («medio»)', [['pro/medio', R('pro/medio').campo['4-6 m']?.vincenti ?? 0]], v => v >= 15);
  if (has('pro/medio')) add('Pro contro «medio»: 70–85% dei game', [['pro/medio', R('pro/medio').gameG]], v => v >= 70 && v <= 85);
  add('Casual: adulto medio almeno il 90% dei game', each(['casual/medio', 'casual/umano', 'casual/amatore'], r => r.gameG), v => v >= 90);
  if (has('casual/bambino')) add('Casual: «bambino» non peggio di oggi (almeno il 31% dei game)', [['casual/bambino', R('casual/bambino').gameG]], v => v >= 31);
  return g;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : undefined; };
  const has = k => process.argv.includes(`--${k}`), json = has('json');
  const difficulties = (arg('difficulty') || 'casual,pro').split(','), profiles = (arg('profiles') || 'umano,medio,amatore,tennista,bambino').split(',');
  const points = +(arg('points') || 300), seeds = SEMI(+(arg('nsemi') || 8));
  if (arg('prova')){ const t = applyTrial(trialValues(arg('prova'))); if (!json) console.log(`valori di prova: ${JSON.stringify(t)}`); }
  let serveOf = null;
  if (arg('servizio')){ const { phoneServeOf, PHONE_SERVES } = await import('./servizio.mjs'); const m = arg('servizio'); if (!PHONE_SERVES[m]) throw new Error(`--servizio: «${m}» sconosciuto`); serveOf = (e, rng) => phoneServeOf(m, e, rng); }
  const rows = {};
  for (const difficulty of difficulties) for (const profile of profiles){
    const s = rows[`${difficulty}/${profile}`] = measure({ difficulty, profile, points, seeds, serve: serveOf });
    if (json) continue;
    const f = s.fine, c = s.campo, o = k => (c[k] ? `${c[k].vincenti}% (n ${c[k].n}; errori CPU ${c[k].erroriCPU}%, riprese ${c[k].riprese}%)` : '–');
    console.log(`\n${difficulty} / ${profile}: ${s.punti} punti · punti vinti ${s.puntiG}% ± ${s.puntiGErr} · game vinti ${s.gameG}% (${s.game})`);
    console.log(`  fine dei punti: CPU in rete ${f.cpuRete}% · CPU fuori ${f.cpuFuori}% · vincente ${f.vincente}% (+ al servizio ${f.vincenteServizio}%) · errore di chi gioca: rete ${f.gRete}% fuori ${f.gFuori}% · palla non presa ${f.nonPresa}%`);
    console.log(`  errori della CPU ${s.erroriCpuPunti}% dei punti · vincenti ${s.vincentiPunti}% dei punti (${s.vincentiSuVinti}% dei punti vinti) · colpi per punto ${s.colpi.media} (mediana ${s.colpi.mediana}, p90 ${s.colpi.p90})`);
    console.log(`  errori della CPU per colpo ${s.erroriPerColpo}% (in rete ${s.retePerColpo}%) · palle facili ${s.facili.errori}% (n ${s.facili.n}, ${s.facili.quota}% dei colpi) · medie ${s.medie.errori}% · dure ${s.dure.errori}% (n ${s.dure.n}) · risposta al servizio ${s.risposta.errori}%`);
    console.log(`  per numero del colpo: ${s.perColpo.map(b => `${b.colpi} ${b.errori}% (n ${b.n})`).join(' · ')} · sulle palle facili: ${s.facili.perColpo.map(b => `${b.colpi} ${b.errori}% (n ${b.n})`).join(' · ')}`);
    console.log(`  CPU stanca nel ${s.stanca.quota}% dei colpi dello scambio: errori ${s.stanca.errori}% (fresca ${s.stanca.erroriFresca}%; stanca sulle palle facili ${s.stanca.erroriFacili}%) · risposte difensive ${s.difensive}% · pallonetti ${s.pallonetti}%`);
    console.log(`  vincenti per distanza della palla dalla CPU: <2 m ${o('<2 m')} · 2–4 m ${o('2-4 m')} · 4–6 m ${o('4-6 m')} · >6 m ${o('>6 m')}`);
  }
  const G = goals(rows);
  if (json) console.log(JSON.stringify({ rows, goals: G }, null, 1));
  else if (has('obiettivi')){
    console.log('\nObiettivi');
    for (const x of G) console.log(`  ${x.ok ? 'OK' : 'NO'}  ${x.name}: ${Object.entries(x.values).map(([k, v]) => `${k} ${v}%`).join(' · ')}`);
  }
  if (has('obiettivi') && G.some(x => !x.ok)) process.exitCode = 1;
}
