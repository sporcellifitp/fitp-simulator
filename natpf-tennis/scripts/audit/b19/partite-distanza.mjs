// Audit B19 (stesso schermo): partite tra due persone simulate con il secondo banco (due-umani-distanza.mjs).
// Uso, da natpf-tennis:
//   node --import ./test/register.mjs scripts/audit/b19/partite-distanza.mjs [--n=200] [--pairs=amatore:amatore,bambino:bambino]
//     [--fair=0,1] [--first=player|opponent|alt] [--games=1] [--speed=4.5] [--seed=7001] [--delay=1.5]
// Esempi: chi batte tra bambini  → --pairs=bambino:bambino --fair=0 --first=player --n=400 (e poi --first=opponent)
//         chi colpisce dopo il rimbalzo → --pairs=umano:umano --fair=0,1
//         personaggi più lenti   → --pairs=tennista:tennista --fair=0 --speed=4.5
import { match, q, pct } from './due-umani-distanza.mjs';
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const N = +(arg('n') || 200), games = +(arg('games') || 1), fairs = (arg('fair') || '0,1').split(',').map(v => v === '1'), first = arg('first') || 'player', speed = arg('speed') ? +arg('speed') : null, seed0 = +(arg('seed') || 7001), serveDelay = +(arg('delay') || 1.5);
const pairs = (arg('pairs') || 'amatore:amatore,bambino:bambino,tennista:tennista').split(',').map(s => s.split(':'));
for (const fair of fairs) for (const [a, b] of pairs){
  const M = []; for (let i = 0; i < N; i++) M.push(match({ p1: a, p2: b, fair, games, seed: seed0 + i*11, first: first === 'alt' ? (i % 2 ? 'opponent' : 'player') : first, speed, serveDelay }));
  const pts = M.flatMap(m => m.points), secs = M.map(m => m.seconds), hits = pts.map(p => p.hits);
  const cls = p => p.why === 'scambio infinito' ? 'infinito' : /Net/.test(p.why) ? 'rete' : /Out/.test(p.why) ? 'fuori' : /OUT OF REACH/.test(p.loserPopup || '') ? 'non raggiunta (scritta)' : /WHIFF/.test(p.loserPopup || '') ? 'a vuoto per il tempo' : p.minD > 1.6 ? 'non raggiunta (senza gesto, lontana)' : 'non colpita (vicina, senza gesto)';
  const k = {}; for (const p of pts) k[cls(p)] = (k[cls(p)] || 0) + 1;
  const sp1 = pts.filter(p => p.server === 'player'), sp2 = pts.filter(p => p.server === 'opponent');
  const far = pts.filter(p => /Nice/.test(p.why) && p.minD > 1.6).length;
  console.log(`\n== ${fair ? 'FIERA' : 'classico'} · ${games} game · P1 ${a} / P2 ${b} · ${N} partite (non finite ${M.filter(m => !m.over).length}) · velocità ${M[0].speedEnd}`);
  console.log(`  P1 vince ${pct(M.filter(m => m.winner === 'p1').length, N)}% partite, ${pct(pts.filter(p => p.winner === 'player').length, pts.length)}% punti · punti/partita ${(pts.length/N).toFixed(1)} · batte P2 ${pct(sp2.length, pts.length)}% · chi batte vince P1 ${pct(sp1.filter(p => p.winner === 'player').length, sp1.length)}% P2 ${pct(sp2.filter(p => p.winner === 'opponent').length, sp2.length)}%`);
  console.log(`  durata s: p50 ${Math.round(q(secs, .5))} p90 ${Math.round(q(secs, .9))} max ${Math.round(Math.max(...secs))} · colpi/punto: media ${(hits.reduce((x, y) => x + y, 0)/hits.length).toFixed(1)} p50 ${q(hits, .5)} p90 ${q(hits, .9)} · punti a 80 colpi ${pct(pts.filter(p => p.why === 'scambio infinito').length, pts.length)}% · punto s p50 ${q(pts.map(p => p.dur), .5).toFixed(1)} · pausa tra i punti p50 ${(q(M.flatMap(m => m.pauses), .5) ?? 0).toFixed(2)} s`);
  console.log('  fine dei punti: ' + Object.entries(k).sort((x, y) => y[1] - x[1]).map(([n, v]) => `${n} ${pct(v, pts.length)}%`).join(' · ') + ` · [palla mai più vicina di 1,6 m a chi perde: ${pct(far, pts.length)}%]`);
  if (fair){ const dec = pts.filter(p => p.before[0] === 3 && p.before[1] === 3); console.log(`  punto decisivo (3-3): ${dec.length} su ${N} partite (${pct(dec.length, N)}%) · lo batte P1 ${dec.filter(p => p.server === 'player').length}, P2 ${dec.filter(p => p.server === 'opponent').length} · lo vince chi batte ${pct(dec.filter(p => p.server === p.winner).length, dec.length)}%`); }
}
