// B49 · nel doppio (prototipo), da dove vengono i punti persi «in rete» di chi gioca: colpo della CPU principale o del
// compagno della CPU prima del colpo di chi gioca; quota dei colpi del compagno della CPU. Variante --cpupf=<volo a Pro>
// per provare il compagno della CPU più lento a Pro (oggi 0,76 s, game_engine.js:2761) e --cpun=<portata a Pro> (oggi 1,3 m,
// game_engine.js:3301).
// Uso (da natpf-tennis): node --import ./test/register.mjs <questo file> [--levels=pro] [--profiles=umano,amatore]
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? d;
const WT = arg('wt', process.cwd());
const { simulate } = await import(WT + '/scripts/audit/rally-balance.mjs');
const pct = (a, n) => +(100*a/Math.max(1, n)).toFixed(1);
for (const difficulty of arg('levels', 'casual,evento,pro').split(',')) for (const profile of arg('profiles', 'umano,amatore').split(',')){
  const C = { opp: 0, mate: 0, pts: 0, won: 0, netAfterMate: 0, netAfterOpp: 0, outAfterMate: 0, outAfterOpp: 0 };
  for (const seed of arg('seeds', '101,202,303').split(',').map(Number)){
    let hooked = false, lastCpu = null;
    const out = simulate({ profile, difficulty, points: +arg('points', 150), seed, onStep: e => {
      if (hooked) return; hooked = true; e.setMatchFormat('doubles');
      const ex = e._executeOpponentReturn.bind(e);
      e._executeOpponentReturn = (a = e.opponent) => { lastCpu = a === e.opponentPartner ? 'mate' : 'opp'; C[lastCpu]++; return ex(a); };
      const aw = e._awardPoint.bind(e);
      e._awardPoint = (who, why) => {
        if (who === 'opponent' && e.ball.lastHitter === 'player' && e.natpfTeamHit !== 'partner'){
          if (why === 'Net') C[lastCpu === 'mate' ? 'netAfterMate' : 'netAfterOpp']++;
          if (why === 'Out') C[lastCpu === 'mate' ? 'outAfterMate' : 'outAfterOpp']++;
        }
        lastCpu = null; return aw(who, why);
      };
    } });
    C.pts += out.points; C.won += out.won;
  }
  console.log(`${difficulty} ${profile}: vinti ${pct(C.won, C.pts)}% · colpi della CPU ${C.opp} e del suo compagno ${C.mate} (${pct(C.mate, C.opp + C.mate)}%) · tuoi in rete dopo il compagno della CPU ${C.netAfterMate}, dopo la CPU ${C.netAfterOpp} · fuori dopo il compagno della CPU ${C.outAfterMate}, dopo la CPU ${C.outAfterOpp}`);
}
