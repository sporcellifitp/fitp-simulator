// B20 · «Scambio che si scalda» (opzione del pannello dello stand, spenta di base; natpf_hot_rally.js): misura con il
// banco dei due umani dell'audit B19 (../b19/due-umani.mjs: motore vero senza grafica, due persone simulate nello stesso
// schermo) di durata e colpi per punto, con l'opzione spenta e accesa. Formato in fiera, 1 game (il formato di base dello
// stesso schermo dal B20); batte per primo a turno.
// Uso, da natpf-tennis:
//   node --import ./test/register.mjs scripts/audit/b20/scambio-caldo.mjs [--partite=1] [--semi=7001,7103,7207] [--coppie=bambino,medio,amatore,tennista] [--modi=spenta,accesa] [--formato=fiera|classico]
// «impronta»: riassunto (sha1) di tutti i punti giocati (chi vince, colpi, come finisce). Con l'opzione spenta deve
// essere identica a quella della versione senza l'opzione: vuol dire che spenta non cambia niente, punto per punto.
import { createHash } from 'node:crypto';
import { many, sum, pc, qt } from '../b19/due-umani.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const K = +(arg('partite') || 1), SEEDS = (arg('semi') || '7001,7103,7207').split(',').map(Number);
const PAIRS = (arg('coppie') || 'bambino,medio,amatore,tennista').split(','), MODES = (arg('modi') || 'spenta,accesa').split(',');
const fair = (arg('formato') || 'fiera') !== 'classico';
const N = { bambino: 60, medio: 60, amatore: 60, tennista: 20 };

console.log(`== Scambio che si scalda · 1 game, formato ${fair ? 'in fiera' : 'classico'}, stesso schermo · semi ${SEEDS.join(', ')} ==`);
for (const a of PAIRS) for (const mode of MODES){
  const on = mode === 'accesa';
  const r = many({ a, b: a, fair, matches: Math.max(4, Math.round((N[a] || 40)*K)), tweak: e => { e.natpfHotRally = on; } }, SEEDS), s = sum(r);
  const st = r.pts.map(p => p.n), dur = r.pts.map(p => p.dur);
  const print = createHash('sha1').update(JSON.stringify(r.pts.map(p => [p.win, p.n, p.kind, p.srv]))).digest('hex').slice(0, 12);
  console.log(`${(a + ' · ' + mode).padEnd(20)} | ${s.matches} partite, ${s.pts} punti · colpi a punto: media ${s.colpi.media}, metà entro ${s.colpi.p50}, 9 su 10 entro ${s.colpi.p90}, massimo ${s.colpi.max}`
    + ` · punti oltre 30 colpi ${pc(st.filter(x => x > 30).length, st.length)}% · punto più lungo ${Math.round(Math.max(0, ...dur))} s (9 su 10 entro ${Math.round(qt(dur, .9) || 0)} s)`
    + ` · partita: metà entro ${s.sec.p50} s, 9 su 10 entro ${s.sec.p90} s, la più lunga ${s.sec.max} s · punti del P1 ${s.p1Pts}%, partite del P1 ${s.p1Match}% · interrotti a 150 colpi ${s.kinds.interrotto || 0}%`
    + ` · impronta ${print}`);
}
