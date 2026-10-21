// Banco completo dei colpi della webcam (test/webcam-sim.mjs) con i criteri d'accettazione: swing secchi in 2D per
// pendenza, colpi completi in 3D (preparazione, colpo, ritorno) su camere, distanze, ampiezze, tempi e frequenze
// diverse, folla (una seconda mano che entra ed esce) e lancio del servizio. Codice d'uscita 1 se un criterio manca.
// Informativi, senza criterio: swing secco seguito dal ritorno, mano persa per il mosso (flusso ottico di riserva) e
// passante sullo sfondo senza mani viste.
//   node --import ./test/register.mjs scripts/audit/webcam-sweep.mjs                 codice attuale
//   node --import ./test/register.mjs scripts/audit/webcam-sweep.mjs --prima=<file>  un motion_controls.js di prima
//   RAPIDO=1 riduce le griglie (circa un decimo delle prove)
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runTrial, runSweep, runCrowd, runDropout, sweep, engineView, STROKES } from '../../test/webcam-sim.mjs';
import { createStrokeTracker } from '../../src/natpf/webcam_strokes.js';

const arg = process.argv.find(a => a.startsWith('--prima='));
const file = arg ? path.resolve(arg.slice(8)) : new URL('../../src/motion_controls.js', import.meta.url).pathname;
const { MotionController: MC } = await import(pathToFileURL(file).href);
const nuovo = typeof MC.prototype._onHandResults === 'function';
const tracker = () => (nuovo ? createStrokeTracker() : null);
const fast = !!process.env.RAPIDO, pick = (a, every) => (fast ? a.filter((_, i) => i % every === 0) : a);
const pct = (n, d) => (d ? `${(100*n/d).toFixed(0)}%` : '-');
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(p*(b.length - 1))] : NaN; };
const crit = [];
const check = (name, value, ok, info = '') => { crit.push(ok); console.log(`${ok ? 'OK ' : 'KO '} ${name}: ${value}${info ? ` (${info})` : ''}`); };
console.log(`motion_controls: ${file} (${nuovo ? 'nuovo riconoscimento' : 'codice di prima'})${fast ? ' · griglie ridotte' : ''}`);

/* ---------- 1. swing secchi da fermo (2D), per pendenza ---------- */
const RATES2 = { '30Hz': { fps: 30, lat: 22 }, '15Hz': { fps: 30, lat: 45 }, 'cam15fps': { fps: 15, lat: 30 } };
const sw = [];
let seed = 100;
for (const hand of ['right', 'left']) for (const side of ['FH', 'BH']) for (const ratio of [-.8, -.5, -.3, -.08, 0, .08, .3, .5, .8, 1.2])
  for (const dS of pick([.2, .3, .45, .6], 2)) for (const T of [.18, .25, .35, .5]) for (const curve of [1, 2]) for (const aspect of [3/4, 9/16]) for (const [rate, R] of Object.entries(RATES2)) for (const yMid of [.45, .55]){
    const dir = (side === 'FH' ? -1 : 1)*(hand === 'left' ? -1 : 1);
    const ev = runSweep(MC, { pathFn: sweep({ dir, dS, ratio, aspect, T, curve, yMid }), T, aspect, ...R, seed: seed++, hand, tracker: tracker() });
    const inSw = ev.filter(e => e.ts >= -.02 && e.ts <= T + .6);
    sw.push({ hand, side, ratio, aspect, rate, v: engineView(inSw[0], hand), n: ev.length });
  }
console.log('\n=== Swing secchi da fermo: primo evento (vista del motore nello scambio) ===');
for (const ratio of [-.8, -.5, -.3, 0, .3, .5, .8, 1.2]){
  const L = sw.filter(r => (ratio === 0 ? Math.abs(r.ratio) < .1 : r.ratio === ratio));
  const side = L.filter(r => r.v.label.startsWith(r.side + '·')).length, lob = L.filter(r => /lob/.test(r.v.label)).length, none = L.filter(r => !r.v.shot).length, multi = L.filter(r => r.n >= 2).length;
  const tally = {}; for (const r of L){ const k = r.v.label.replace(/^(FH|BH)·/, 'lato·'); tally[k] = (tally[k] || 0) + 1; }
  console.log(`pendenza ${String(ratio).padStart(5)} n=${L.length} | lato ok ${pct(side, L.length).padStart(4)} | pallonetti ${pct(lob, L.length).padStart(4)} | niente ${pct(none, L.length).padStart(4)} | ≥2 eventi ${pct(multi, L.length).padStart(4)} | ${Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${pct(v, L.length)}`).join(', ')}`);
}
const nat = sw.filter(r => r.ratio <= .8);
for (const [label, aspect] of [['4:3', 3/4], ['16:9', 9/16]]){
  const L = nat.filter(r => r.aspect === aspect), M = sw.filter(r => r.aspect === aspect && r.ratio >= .3 && r.ratio <= .8);
  console.log(`immagine ${label.padEnd(4)} fino a pendenza 0,8: lato ok ${pct(L.filter(r => r.v.label.startsWith(r.side + '·')).length, L.length).padStart(4)} | pallonetti e lanci (pendenza 0,3–0,8) ${pct(M.filter(r => /lob/.test(r.v.label)).length, M.length).padStart(4)} | ≥2 eventi ${pct(L.filter(r => r.n >= 2).length, L.length).padStart(4)}`);
}
for (const hand of ['right', 'left']){
  const L = nat.filter(r => r.hand === hand);
  check(`swing secchi fino a pendenza 0,8, ${hand === 'right' ? 'destro' : 'mancino'}: lato giusto`, pct(L.filter(r => r.v.label.startsWith(r.side + '·')).length, L.length), L.filter(r => r.v.label.startsWith(r.side + '·')).length >= .95*L.length, '≥95%');
}
for (const ratio of [.3, .5, .8]){
  const L = sw.filter(r => r.ratio === ratio);
  check(`swing secchi pendenza ${ratio}: pallonetti e lanci`, pct(L.filter(r => /lob/.test(r.v.label)).length, L.length), L.filter(r => /lob/.test(r.v.label)).length <= .05*L.length, '≤5%');
}
check('swing secchi: un solo evento', pct(nat.filter(r => r.n <= 1).length, nat.length), nat.filter(r => r.n <= 1).length >= .98*nat.length, '≥98%');

/* ---------- 2. colpi completi in 3D ---------- */
const CAMS = { 'portatile-4:3': { Hc: 1.1, tiltDeg: 0, aspect: 4/3 }, 'sopra-tv-4:3': { Hc: 1.9, tiltDeg: 20, aspect: 4/3 }, 'portatile-16:9': { Hc: 1.1, tiltDeg: 0, aspect: 16/9 }, 'sopra-tv-16:9': { Hc: 1.9, tiltDeg: 20, aspect: 16/9 } };
const RATES3 = { '30Hz': { fps: 30, lat: 22 }, '15Hz': { fps: 30, lat: 45 }, '10Hz': { fps: 30, lat: 75 }, 'cam15': { fps: 15, lat: 30 } };
const rows = [];
seed = 1;
for (const stroke of Object.keys(STROKES)) for (const hand of ['right', 'left']) for (const D of [1.5, 2, 2.5]) for (const amp of pick([.7, 1, 1.2], 2)) for (const tempo of [.7, 1, 1.4])
  for (const [camName, cam] of Object.entries(CAMS)) for (const [rateName, rate] of Object.entries(RATES3)) for (const dropK of [.3, 1]) for (const prepK of pick([1, 1.6], 2)){
    const r = runTrial(MC, { stroke, hand, amp, tempo, D, cam, ...rate, seed: seed++, dropK, prepK, tracker: tracker() });
    const { tFwd, tContact } = r.path, ev = r.events.filter(e => e.ts >= -.05);
    const prep = ev.filter(e => e.ts < tFwd - .05), fwd = ev.find(e => e.ts >= tFwd - .05 && e.ts <= tContact + .35);
    rows.push({ stroke, hand, camName, rateName, tempo, n: ev.length, prep: prep.length, fwd, v: engineView(fwd, hand), dt: fwd ? 1000*(fwd.ts - tContact) : null });
  }
const WANT = { FH_TOP: ['forehand', 'topspin'], FH_FLAT: ['forehand', 'topspin'], FH_SLICE: ['forehand', 'slice'], BH_TOP: ['backhand', 'topspin'], BH_FLAT: ['backhand', 'topspin'], BH_SLICE: ['backhand', 'slice'], FH_LOB: ['forehand', 'lob'], SMASH: [null, 'smash'] };
const GROUND = ['FH_TOP', 'FH_FLAT', 'FH_SLICE', 'BH_TOP', 'BH_FLAT', 'BH_SLICE'];
function summary(L, label){
  const n = L.length, sideOk = L.filter(r => WANT[r.stroke][0] == null || r.v.side === WANT[r.stroke][0]).length, sideWrong = L.filter(r => r.v.side && WANT[r.stroke][0] && r.v.side !== WANT[r.stroke][0]).length;
  const typeOk = L.filter(r => r.v.shot === WANT[r.stroke][1] || (WANT[r.stroke][1] === 'lob' && r.v.shot === 'lob(lancio)')).length;
  const dts = L.map(r => r.dt).filter(v => v != null);
  console.log(`${label.padEnd(24)} n=${String(n).padStart(5)} | niente ${pct(L.filter(r => !r.fwd).length, n).padStart(4)} | lato ok ${pct(sideOk, n).padStart(4)} (sbagliato ${pct(sideWrong, n)}) | tipo ok ${pct(typeOk, n).padStart(4)} | pallonetti ${pct(L.filter(r => /lob/.test(r.v.shot || '')).length, n).padStart(4)} | evento in preparazione ${pct(L.filter(r => r.prep).length, n).padStart(4)} | ≥2 eventi ${pct(L.filter(r => r.n >= 2).length, n).padStart(4)} | evento−impatto ms p10/50/90 ${q(dts, .1).toFixed(0)}/${q(dts, .5).toFixed(0)}/${q(dts, .9).toFixed(0)}`);
  return { n, sideOk, typeOk };
}
console.log('\n=== Colpi completi (preparazione, colpo, finale, ritorno): evento nella finestra del colpo ===');
for (const s of Object.keys(STROKES)) for (const h of ['right', 'left']) summary(rows.filter(r => r.stroke === s && r.hand === h), `${s} ${h === 'right' ? 'destro' : 'mancino'}`);
const G = rows.filter(r => GROUND.includes(r.stroke));
summary(G, 'COLPI A RIMBALZO');
console.log('\n=== Colpi a rimbalzo per camera e frequenza ===');
for (const c of Object.keys(CAMS)) summary(G.filter(r => r.camName === c), c);
for (const c of Object.keys(RATES3)) summary(G.filter(r => r.rateName === c), c);
for (const t of [.7, 1, 1.4]) summary(G.filter(r => r.tempo === t), `tempo ${t}`);
// criteri con inferenza ad almeno 15 Hz: a 10 Hz (100 ms per fotogramma) il PC è oltre il limite di T-W4 (40 ms)
const ok15 = r => r.rateName !== '10Hz';
console.log('(i criteri qui sotto valgono con inferenza ad almeno 15 Hz; 10 Hz è riportato sopra come caso degradato)');
for (const c of Object.keys(CAMS)){
  const L = G.filter(r => r.camName === c && ok15(r));
  console.log(`${c} (≥15 Hz): lato giusto ${pct(L.filter(r => r.v.side === WANT[r.stroke][0]).length, L.length)} | evento in preparazione ${pct(L.filter(r => r.prep).length, L.length)} | ≥2 eventi ${pct(L.filter(r => r.n >= 2).length, L.length)}`);
}
for (const hand of ['right', 'left']){
  const L = G.filter(r => r.hand === hand && ok15(r)), ok = L.filter(r => r.v.side === WANT[r.stroke][0]).length;
  check(`colpi completi, ${hand === 'right' ? 'destro' : 'mancino'}: lato giusto`, pct(ok, L.length), ok >= .95*L.length, '≥95%');
}
check('colpi completi: pallonetti e lanci nei colpi a rimbalzo', pct(G.filter(r => /lob/.test(r.v.shot || '')).length, G.length), G.filter(r => /lob/.test(r.v.shot || '')).length <= .05*G.length, '≤5%');
const all = rows.filter(ok15);
check('colpi completi: un solo evento per colpo (nessun doppione)', pct(all.filter(r => r.n <= 1).length, all.length), all.filter(r => r.n <= 1).length >= .98*all.length, '≥98%');
check('colpi completi: nessun evento nella preparazione', pct(all.filter(r => !r.prep).length, all.length), all.filter(r => !r.prep).length >= .95*all.length, '≥95%');
const lobs = rows.filter(r => r.stroke === 'FH_LOB' && ok15(r)), smash = rows.filter(r => r.stroke === 'SMASH' && ok15(r));
check('pallonetto voluto riconosciuto', pct(lobs.filter(r => /lob/.test(r.v.shot || '')).length, lobs.length), lobs.filter(r => /lob/.test(r.v.shot || '')).length >= .9*lobs.length, '≥90%');
check('schiacciata da sopra la spalla riconosciuta', pct(smash.filter(r => r.v.shot === 'smash').length, smash.length), smash.filter(r => r.v.shot === 'smash').length >= .8*smash.length, '≥80%');

/* ---------- 3. folla: una seconda mano entra ed esce ---------- */
console.log('\n=== Folla: seconda mano visibile da 1,0 a 2,6 s, rovesci del giocatore a 1,6 e 3,2 s ===');
let crowdOk = 0, crowdN = 0;
for (const label of ['Left', 'Right']) for (const size of [.03, .036, .045]) for (let s = 0; s < 3; s++){
  const ev = runCrowd(MC, { seed: 10 + s, label, size, tracker: tracker() });
  const good = ev.length === 2 && ev.every(e => e.kind === 'swing' && e.side === 'backhand') && Math.abs(ev[0].ts - 1.7) < .35 && Math.abs(ev[1].ts - 3.3) < .35;
  crowdN++; crowdOk += good ? 1 : 0;
  if (s === 0) console.log(`  mano ${label}, taglia ${size}: ${ev.map(e => `${e.ts.toFixed(2)}s ${engineView(e, 'right').label}`).join(' | ') || 'nessun evento'}`);
}
check('folla: solo i due rovesci del giocatore, nessun colpo falso', `${crowdOk}/${crowdN}`, crowdOk === crowdN);

/* ---------- 4. lancio del servizio ---------- */
let tossOk = 0, tossN = 0, hitOk = 0, rallyLob = 0;
for (const hand of ['right', 'left']) for (const T of [.25, .35]) for (const dS of [.25, .35]) for (const yMid of [.45, .55]){
  // mano che sale di scatto (lancio) al proprio servizio: il gioco accetta il lancio
  const tossPath = sweep({ dir: hand === 'left' ? -1 : 1, dS: dS/4, ratio: 4, aspect: .75, T, curve: 1, yMid });
  const ev = runSweep(MC, { pathFn: tossPath, T, seed: 700 + tossN, hand, canToss: () => true, tracker: tracker() });
  tossN++; if (ev[0]?.kind === 'toss') tossOk++;
  // lo stesso gesto nello scambio (il gioco rifiuta il lancio): prima diventava un pallonetto
  const evR = runSweep(MC, { pathFn: tossPath, T, seed: 700 + tossN, hand, canToss: () => false, tracker: tracker() });
  if (evR.some(e => /lob/.test(engineView(e, hand).label))) rallyLob++;
  // poi, dalla cima del lancio, lo swing in giù da sopra la spalla colpisce
  const up = sweep({ dir: 1, dS: dS/4, ratio: 4, aspect: .75, T, curve: 1, yMid }), down = sweep({ dir: -1, dS: dS/2, ratio: -2, aspect: .75, T: .25, curve: 1 });
  const top = up(T), d0 = down(0), serve = t => { if (t < .9) return up(t); const d = down(t - .9); return { S: top.S + d.S - d0.S, y: top.y + d.y - d0.y }; };
  const ev2 = runSweep(MC, { pathFn: serve, T: 1.2, seed: 800 + tossN, hand, canToss: () => true, tracker: tracker() });
  if (ev2.map(e => e.kind).join() === 'toss,swing' && ev2[1].ts > .9) hitOk++;
}
check('servizio: lancio riconosciuto', `${tossOk}/${tossN}`, tossOk === tossN);
console.log(`servizio: colpo dopo il lancio ${hitOk}/${tossN}`);
check('scambio: il gesto del lancio non diventa un pallonetto', `${rallyLob}/${tossN}`, rallyLob === 0);

/* ---------- 5. swing secco e ritorno al punto di partenza (informativo) ---------- */
// il ritorno subito dopo lo swing, più lento (1,5 volte) o con una pausa, non è un secondo colpo; se è veloce quanto
// lo swing non si distingue da preparazione + colpo
console.log('\n=== Swing secco e ritorno al punto di partenza: un solo evento, col lato dello swing ===');
const RATESR = { '30Hz': { fps: 30, lat: 22 }, '15Hz': { fps: 30, lat: 45 }, 'cam15': { fps: 15, lat: 30 } };
for (const back of [1, 1.5, 2.5]){
  let n = 0, ok = 0, two = 0; seed = 900;
  for (const side of ['FH', 'BH']) for (const dS of [.2, .3, .45]) for (const T of pick([.18, .25, .35], 2)) for (const hold of [0, .1, .3]) for (const ratio of [0, .3]) for (const R of Object.values(RATESR)){
    const dir = side === 'FH' ? -1 : 1, go = sweep({ dir, dS, ratio, aspect: .75, T, curve: 1, yMid: .5 }), B = go(T), Tb = T*back;
    const ret = sweep({ dir: -dir, dS, ratio: -ratio, aspect: .75, T: Tb, curve: 1, yMid: .5 }), r0 = ret(0);
    const path = t => (t <= T ? go(t) : t <= T + hold ? B : { S: B.S + ret(t - T - hold).S - r0.S, y: B.y + ret(t - T - hold).y - r0.y });
    const ev = runSweep(MC, { pathFn: path, T: T + hold + Tb + .2, ...R, seed: seed++, tracker: tracker() });
    n++; if (ev.length === 1 && engineView(ev[0], 'right').label.startsWith(side + '·')) ok++; if (ev.length >= 2) two++;
  }
  console.log(`ritorno ${back} volte più lento dello swing: un evento col lato giusto ${pct(ok, n).padStart(4)} | ≥2 eventi ${pct(two, n).padStart(4)} (n=${n})`);
}

/* ---------- 6. mano persa per il mosso: flusso ottico di riserva (informativo) ---------- */
console.log('\n=== Mano persa dal modello per il mosso, flusso ottico di riserva (swing secchi, fotogrammi sintetici) ===');
// l'ultima riga: il modello non vede mai la mano (non caricato, luce scarsa), resta solo il flusso ottico
for (const [label, exposure, blurLo, blurHi] of [['esposizione 1/120 s', 1/120, 8, 20], ['esposizione 1/60 s', 1/60, 8, 20], ['esposizione 1/30 s', 1/30, 8, 20], ['solo flusso ottico', 1/60, -2, -1]]){
  const out = []; let lost = 0, seen = 0; seed = 5000;
  for (const side of ['FH', 'BH']) for (const ratio of [0, .3, .8]) for (const dS of pick([.3, .45, .6], 2)) for (const T of [.18, .25, .35]){
    const r = runDropout(MC, { pathFn: sweep({ dir: side === 'FH' ? -1 : 1, dS, ratio, aspect: .75, T, curve: 1, yMid: .5 }), T, seed: seed++, exposure, blurLo, blurHi, tracker: tracker() });
    lost += r.lost; seen += r.seen;
    const ev = r.events.filter(e => e.ts >= -.02 && e.ts <= T + .6);
    out.push({ side, v: engineView(ev[0], 'right'), n: r.events.length, src: ev[0]?.src });
  }
  const n = out.length;
  console.log(`${label.padEnd(20)} n=${n} | mano persa ${pct(lost, lost + seen).padStart(4)} dei risultati | lato ok ${pct(out.filter(r => r.v.label.startsWith(r.side + '·')).length, n).padStart(4)} | niente ${pct(out.filter(r => !r.v.shot).length, n).padStart(4)} | pallonetti ${pct(out.filter(r => /lob/.test(r.v.label)).length, n).padStart(4)} | ≥2 eventi ${pct(out.filter(r => r.n >= 2).length, n).padStart(4)} | deciso dal flusso ${pct(out.filter(r => r.src === 'flow').length, n).padStart(4)}`);
}

/* ---------- 7. passante sullo sfondo, nessuna mano vista (informativo) ---------- */
console.log('\n=== Passante che attraversa lo sfondo, giocatore fermo e nessuna mano vista: colpi falsi dal flusso ottico ===');
for (const speed of [.35, .6, 1]){
  let ev = 0, secs = 0; seed = 9000;
  for (let k = 0; k < (fast ? 6 : 20); k++){
    const r = runDropout(MC, { pathFn: () => ({ S: .55, y: .55 }), T: 2.5, seed: seed++, exposure: 1/60, blurLo: -2, blurHi: -1, passante: t => ({ S: .05 + speed*t, y: .45 }), tracker: tracker() });
    ev += r.events.length; secs += 3.9;
  }
  console.log(`passante a ${speed} larghezze/s: ${ev} colpi falsi in ${secs.toFixed(0)} s (${(ev/secs*60).toFixed(1)} al minuto)`);
}

console.log(`\n${crit.filter(Boolean).length}/${crit.length} criteri soddisfatti`);
process.exitCode = crit.every(Boolean) ? 0 : 1;
