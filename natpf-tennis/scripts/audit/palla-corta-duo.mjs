// Palla corta nello stesso schermo tra due persone (B18.2, tappa 2 passo 3; docs/b18/t2-3-leggenda-e-palla-corta.md).
// Banco dei due umani dell'audit B19 (b19/due-umani.mjs: motore vero senza grafica, due persone simulate nello stesso
// schermo; la tattica «corte» del banco gioca ogni colpo dello scambio come palla corta) con le fasce e l'aiuto al più
// giovane del B25 (natpf_duo_rules.HELP, variante G in gioco). Non cambia nessun file del gioco.
// Uso, da natpf-tennis:
//   node --import ./test/register.mjs scripts/audit/palla-corta-duo.mjs [--partite=40] [--semi=7001,7103,7207]
// Ogni riga: il primo giocatore contro il secondo, metà delle partite da P1 e metà da P2 (1 game, formato in fiera).
// Misura: partite e punti vinti dal primo, colpi per punto; palle corte del primo: quante a punto, in rete, troppo lunghe
// (dropLong; «–» se il motore non lo dice, cioè prima del passo 3), quante fanno punto subito (l'altro non la rimanda).
import { many, pc } from './b19/due-umani.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const SEEDS = (arg('semi') || '7001,7103,7207').split(',').map(Number), N = +(arg('partite') || 40);
const bands = (young, old, variant) => side => e => { e.natpfSplitBands = side === 'p1' ? { p1: young, p2: old } : { p1: old, p2: young }; e.natpfHelpVariant = variant; };
const hook = (e, s, rec, L) => { rec.long = L.out.dropLong; rec.net = !!L.out.netFault; };

function duo(a, b, tw = null){
  const o = { fair: true, gamesToWin: 1, matches: N, hook };
  const r1 = many({ ...o, a, b, tweak: tw?.('p1') }, SEEDS), r2 = many({ ...o, a: b, b: a, tweak: tw?.('p2') }, SEEDS);
  const M = [...r1.matches.map(x => x.win === 'p1'), ...r2.matches.map(x => x.win === 'p2')];
  const P = [...r1.pts.map(x => ({ ...x, a: x.win === 'p1' })), ...r2.pts.map(x => ({ ...x, a: x.win === 'p2' }))];
  // colpi del primo (a): in r1 è p1, in r2 è p2; con il punto in cui sono stati giocati
  const mine = [...r1.shots.filter(s => s.k === 'p1').map(s => ({ ...s, P: r1.pts[s.pt], me: 'p1' })), ...r2.shots.filter(s => s.k === 'p2').map(s => ({ ...s, P: r2.pts[s.pt], me: 'p2' }))];
  const drops = mine.filter(s => s.shot === 'DROP'), hasLong = drops.some(s => s.long !== undefined);
  const point = drops.filter(s => s.P && s.P.n === s.n && s.P.win === s.me);   // ultimo colpo del punto, punto suo
  const st = P.map(p => p.n);
  return { winA: pc(M.filter(Boolean).length, M.length), n: M.length, ptsA: pc(P.filter(p => p.a).length, P.length), colpi: +(st.reduce((x, y) => x + y, 0)/Math.max(1, st.length)).toFixed(1),
    corte: drops.length, perPunto: +(drops.length/Math.max(1, P.length)).toFixed(2), inRete: pc(drops.filter(s => s.net).length, drops.length),
    lunghe: hasLong ? pc(drops.filter(s => s.long).length, drops.length) : '–', fanno: pc(point.length, drops.length) };
}
const line = (lab, d) => console.log(`${lab.padEnd(58)} | ${d.n} part.: vince il primo ${d.winA}% · punti ${d.ptsA}% · colpi a punto ${d.colpi} | palle corte del primo ${d.corte} (${d.perPunto} a punto): in rete ${d.inRete}%, troppo lunghe ${d.lunghe}%, fanno punto ${d.fanno}%`);

console.log(`== Palla corta nello stesso schermo · semi ${SEEDS.join(', ')} · ${N} partite per seme e per lato, 1 game in fiera ==`);
for (const base of ['medio', 'amatore', 'bambino']){
  line(`${base} contro ${base}`, duo(base, base));
  line(`${base} solo palle corte contro ${base} normale`, duo({ base, tac: 'corte', name: base + '+corte' }, base));
}
console.log('-- aiuto al più giovane (fasce bambino e adulto) --');
for (const v of ['0', 'G']){
  const lab = v === '0' ? 'nessun aiuto' : 'aiuto G';
  line(`bambino contro medio · ${lab}`, duo('bambino', 'medio', bands('bambino', 'adulto', v)));
  line(`bambino solo palle corte contro medio · ${lab}`, duo({ base: 'bambino', tac: 'corte', name: 'bambino+corte' }, 'medio', bands('bambino', 'adulto', v)));
  line(`medio solo palle corte contro bambino · ${lab}`, duo({ base: 'medio', tac: 'corte', name: 'medio+corte' }, 'bambino', side => bands('bambino', 'adulto', v)(side === 'p1' ? 'p2' : 'p1')));
}
