// Webcam «argon» (predefinita) da 1 a 4 m, con le webcam dei portatili e quelle esterne (test/webcam-sim.mjs): il
// modello delle mani è IPOTIZZATO (ARGON_MODEL: perde il palmo quando è troppo piccolo nell'immagine data al modello,
// e la mano seguita quando ha troppo pochi pixel veri), le regole del colpo sono quelle vere del gioco.
//  - swing della guida (runArgonSwing): la mano attraversa davanti al corpo verso sinistra o verso destra, poi torna
//    piano; si conta il primo evento dello swing (lato giusto per il gioco, niente, doppioni) e i colpi nel ritorno;
//  - colpi completi in 3D (runArgonTrial, informativo): preparazione, colpo, finale e ritorno; le regole dello zip danno
//    un evento a ogni movimento veloce e dritto, il gioco usa quello che arriva con la palla: conta il più vicino
//    all'impatto;
//  - chi gioca fermo in attesa (runArgonIdle): colpi falsi.
// Confronta il codice attuale con uno di prima (--prima=<cartella src di prima>, con la camera di allora a 640×480 4:3).
//   node --import ./test/register.mjs scripts/audit/webcam-distanza.mjs [--prima=<cartella src>] [--criteri] [--3d]
//   RAPIDO=1 riduce le griglie. Con --criteri: codice d'uscita 1 se un criterio manca (anche in webcam-sweep.mjs, sez. 9;
//   i criteri sul tipo di colpo con la camera 16:9, shotMixCriteria, solo qui)
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runArgonTrial, runArgonSwing, runArgonIdle, ARGON_CAMS, ARGON_MODEL, engineView } from '../../test/webcam-sim.mjs';
// --pessimista: modello delle mani più esigente (palmo da 0,018–0,04 dell'immagine data, mano seguita da 8–18 pixel, punti
// che tremano il doppio): le conclusioni devono reggere anche così
const MODEL = process.argv.includes('--pessimista') ? { ...ARGON_MODEL, detMin: .018, detFull: .04, trkPxMin: 8, trkPxFull: 18, noisePx: 2, noiseRel: .05 } : ARGON_MODEL;

const opt = name => { const a = process.argv.find(x => x.startsWith(`--${name}=`)); return a ? path.resolve(a.slice(name.length + 3)) : null; };
const pct = (n, d) => (d ? `${(100*n/d).toFixed(0)}%` : '-');
const GROUND = ['FH_TOP', 'FH_FLAT', 'FH_SLICE', 'BH_TOP', 'BH_FLAT', 'BH_SLICE'];
const WANT = { FH_TOP: 'forehand', FH_FLAT: 'forehand', FH_SLICE: 'forehand', BH_TOP: 'backhand', BH_FLAT: 'backhand', BH_SLICE: 'backhand' };
export const DISTANCES = [1, 2, 3, 4];
export const RATES = { '30Hz': { fps: 30, lat: 30 }, 'cam15': { fps: 15, lat: 40 } };
const stat0 = () => ({ sent: 0, seen: 0, inImage: 0, crop: 0, px: 0 });
const addStat = (a, s) => { a.sent += s.sent; a.seen += s.seen; a.inImage += s.inImage; a.crop += s.crop; a.px += s.inputPx; return a; };

// una passata su un MotionController (after: la camera nuova, fino a 1280×720)
export function measure(MC, { after, fast = !!process.env.RAPIDO, full3d = false } = {}){
  const swings = [], strokes = [], idle = [];
  let seed = 1;
  for (const [camName, cam] of Object.entries(ARGON_CAMS)) for (const D of DISTANCES){
    for (const hand of ['right', 'left']) for (const dir of [-1, 1]) for (const width of (fast ? [.5, .9] : [.5, .7, .9, 1.1])) for (const T of (fast ? [.25] : [.2, .28, .36])) for (const [rateName, R] of Object.entries(RATES)){
      const r = runArgonSwing(MC, { dir, width, T, hand, D, cam, after, ...R, seed: seed++, M: MODEL });
      const want = (dir < 0) === (hand === 'right') ? 'forehand' : 'backhand';
      const inSw = r.events.filter(e => e.ts >= -.05 && e.ts <= T + .25), ret = r.events.filter(e => e.ts > T + .25);
      const v = engineView(inSw[0], hand);
      swings.push({ camName, D, hand, width, T, rateName, inFrame: r.inFrame, ok: v.side === want, none: !inSw.length, multi: inSw.length >= 2, ret: ret.length, pre: r.events.filter(e => e.ts < -.05).length, src: inSw[0]?.src, stats: r.stats });
    }
    if (full3d || !fast) for (const stroke of GROUND) for (const hand of ['right', 'left']) for (const tempo of (fast ? [1] : [.8, 1.25])) for (const [rateName, R] of Object.entries(RATES)){
      const r = runArgonTrial(MC, { stroke, hand, D, cam, after, tempo, ...R, seed: seed++, M: MODEL });
      const { tContact } = r.path, ev = r.events.filter(e => e.ts >= -.05);
      const hit = ev.filter(e => e.ts >= tContact - .25 && e.ts <= tContact + .3).sort((a, b) => Math.abs(a.ts - tContact) - Math.abs(b.ts - tContact))[0];
      strokes.push({ camName, D, ok: engineView(hit, hand).side === WANT[stroke], none: !hit, n: ev.length, src: hit?.src });
    }
    for (const hand of ['right', 'left']) for (let s = 0; s < (fast ? 2 : 5); s++){
      const r = runArgonIdle(MC, { hand, D, cam, after, seed: 500 + seed++, total: 8, M: MODEL });
      idle.push({ camName, D, n: r.events.length, secs: 8 });
    }
  }
  return { swings, strokes, idle };
}

export function report({ swings, strokes, idle }, label){
  console.log(`\n=== Webcam argon da 1 a 4 m: ${label} ===`);
  console.log('camera                 dist | swing: lato giusto (nell\'inquadratura · tutti) | niente | doppi | dal flusso | colpi nel ritorno | mano vista | ritagli | px dati al modello | colpi 3D all\'impatto: lato giusto | falsi da fermo');
  for (const camName of Object.keys(ARGON_CAMS)) for (const D of DISTANCES){
    const L = swings.filter(r => r.camName === camName && r.D === D), S3 = strokes.filter(r => r.camName === camName && r.D === D), I = idle.filter(r => r.camName === camName && r.D === D);
    const st = L.reduce((a, r) => addStat(a, r.stats), stat0());
    const fp = I.reduce((a, r) => a + r.n, 0), secs = I.reduce((a, r) => a + r.secs, 0);
    const IF = L.filter(r => r.inFrame);
    console.log(`${camName.padEnd(22)} ${D} m | ${`${pct(IF.filter(r => r.ok).length, IF.length)} · ${pct(L.filter(r => r.ok).length, L.length)}`.padStart(40)} | ${pct(L.filter(r => r.none).length, L.length).padStart(6)} | ${pct(L.filter(r => r.multi).length, L.length).padStart(5)} | ${pct(L.filter(r => r.src === 'flow').length, L.length).padStart(10)} | ${pct(L.filter(r => r.ret).length, L.length).padStart(17)} | ${pct(st.seen, st.inImage).padStart(10)} | ${pct(st.crop, st.sent).padStart(7)} | ${(st.px/Math.max(1, st.sent)/1000).toFixed(0).padStart(10)} k | ${pct(S3.filter(r => r.ok).length, S3.length).padStart(33)} | ${fp} in ${secs} s`);
  }
  for (const D of DISTANCES){
    const by = w => { const L = swings.filter(r => r.D === D && r.width === w); return pct(L.filter(r => r.ok).length, L.length); };
    const out = swings.filter(r => r.D === D && !r.inFrame).length, n = swings.filter(r => r.D === D).length;
    console.log(`${D} m, swing per ampiezza: ${[...new Set(swings.map(r => r.width))].map(w => `${w} m ${by(w)}`).join(' · ')} | swing che escono dall'inquadratura ${pct(out, n)}`);
  }
}

// criteri d'accettazione (1–4 m, tutte le camere): swing della guida che restano nell'inquadratura (vicino alla camera
// uno swing largo esce dall'immagine: lì nessun riconoscimento può vederlo, lo dice la guida) col lato giusto ≥ 90% a
// ogni distanza nella camera peggiore, nessun colpo falso da fermo
export function criteria({ swings, idle }, check){
  for (const D of DISTANCES){
    const L = swings.filter(r => r.D === D && r.inFrame), worst = Object.keys(ARGON_CAMS).map(c => { const M = L.filter(r => r.camName === c); return { c, k: M.filter(r => r.ok).length/M.length }; }).sort((a, b) => a.k - b.k)[0];
    check(`webcam argon a ${D} m: swing della guida nell'inquadratura col lato giusto, camera peggiore (${worst.c})`, `${(100*worst.k).toFixed(0)}%`, worst.k >= .9, '≥90%');
  }
  const fp = idle.reduce((a, r) => a + r.n, 0);
  check('webcam argon 1–4 m: colpi falsi da fermo', `${fp} in ${idle.reduce((a, r) => a + r.secs, 0)} s`, fp === 0, 'nessuno');
}

// Tipo di colpo con la camera larga (revisione del 31/10): le soglie dello zip sono tarate su 640×480 4:3, e con la
// camera 16:9 la parte verticale del colpo pesava il 33% in più (a 2 m smash all'impatto dal 33% al 51%, lanci da 79 a
// 120). Stesso codice, stessi colpi 3D e stessi semi con la camera a 640×480 (after false) e a 1280×720 (after true):
// quota di smash, lanci e pallonetti del colpo più vicino all'impatto, e lanci in tutto il colpo, da 1 a 3 m
export const MIX_DISTANCES = [1, 2, 3];
export function shotMix(MC, { after, D }){
  let seed = 1;
  const out = { n: 0, smash: 0, toss: 0, lob: 0, tossAll: 0 };
  for (const cam of Object.values(ARGON_CAMS)) for (const stroke of GROUND) for (const hand of ['right', 'left']) for (const tempo of [.8, 1.25]){
    const r = runArgonTrial(MC, { stroke, hand, D, cam, after, tempo, seed: seed++, M: MODEL }), tc = r.path.tContact;
    const hit = r.events.filter(e => e.ts >= tc - .25 && e.ts <= tc + .3).sort((a, b) => Math.abs(a.ts - tc) - Math.abs(b.ts - tc))[0];
    out.n++; out.tossAll += r.events.filter(e => e.kind === 'toss').length;
    if (hit?.kind === 'toss') out.toss++; else if (hit?.shotType === 'smash') out.smash++; else if (hit?.shotType === 'lob') out.lob++;
  }
  return out;
}
// criteri: quote all'impatto entro 10 punti e lanci in tutto entro il 25% di quelli a 640×480, a ogni distanza
export function shotMixCriteria(MC, check){
  for (const D of MIX_DISTANCES){
    const a = shotMix(MC, { after: false, D }), b = shotMix(MC, { after: true, D });
    const q = (o, k) => o[k]/o.n, worst = ['smash', 'toss', 'lob'].map(k => ({ k, d: Math.abs(q(b, k) - q(a, k)) })).sort((x, y) => y.d - x.d)[0];
    const fmt = o => `smash ${pct(o.smash, o.n)}, lanci ${pct(o.toss, o.n)}, pallonetti ${pct(o.lob, o.n)}, lanci in tutto ${o.tossAll}`;
    check(`webcam argon a ${D} m: tipo di colpo all'impatto con la camera 16:9 come a 640×480 (${fmt(b)}; a 640×480 ${fmt(a)})`, `scarto massimo ${(100*worst.d).toFixed(0)} punti (${worst.k})`, worst.d <= .1, '≤10 punti');
    const r = b.tossAll/Math.max(1, a.tossAll);
    check(`webcam argon a ${D} m: lanci in tutto con la camera 16:9 rispetto a 640×480`, `${b.tossAll} contro ${a.tossAll} (×${r.toFixed(2)})`, Math.abs(r - 1) <= .25, 'entro ±25%');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const crit = [];
  const check = (name, value, ok, info = '') => { crit.push(ok); console.log(`${ok ? 'OK ' : 'KO '} ${name}: ${value}${info ? ` (${info})` : ''}`); };
  const full3d = process.argv.includes('--3d'), prima = opt('prima');
  if (prima){
    const { MotionController: P } = await import(pathToFileURL(path.join(prima, 'motion_controls.js')).href);
    report(measure(P, { after: typeof P.prototype._argonModelImage === 'function', full3d }), `codice di prima (${prima})`);
  }
  const { MotionController: MC } = await import('../../src/motion_controls.js');
  const now = measure(MC, { after: true, full3d });
  report(now, 'codice attuale (camera fino a 1280×720, ritaglio attorno alla mano lontana)');
  if (process.argv.includes('--criteri')){
    criteria(now, check);
    shotMixCriteria(MC, check);
    console.log(`\n${crit.filter(Boolean).length}/${crit.length} criteri soddisfatti`);
    process.exitCode = crit.every(Boolean) ? 0 : 1;
  }
}
