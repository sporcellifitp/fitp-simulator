// Verifica indipendente del 2v2: setMatchFormat('doubles') vero, semi diversi; colpi del compagno contati dal flag
// partner del popup del motore; punti con almeno un colpo del compagno; e variante «chi gioca non fa il gesto sulle
// palle del compagno» (si aspetta che giochi lui) per stimare quanto costerebbe.
const WT = '/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b49/wt/natpf-tennis';
const { simulate } = await import(WT + '/scripts/audit/rally-balance.mjs');
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const pct = (a, n) => (100*a/Math.max(1, n)).toFixed(1);
for (const difficulty of arg('levels', 'casual,pro').split(',')) for (const profile of arg('profiles', 'umano,amatore,bambino').split(',')) for (const fmt of arg('fmts', 'singles,doubles,doubles-noswing').split(',')){
  let pts = 0, won = 0, me = 0, mate = 0, ptsWithMate = 0, winners = 0, skipped = 0; const reasons = {};
  for (const seed of arg('seeds', '101,202,303').split(',').map(Number)){
    let hooked = false, mateThisPoint = false;
    const out = simulate({ profile, difficulty, points: +arg('points', 150), seed, onStep: e => {
      if (hooked) return; hooked = true;
      if (fmt !== 'singles') e.setMatchFormat('doubles');
      const prev = e.hud;
      e.hud = new Proxy({}, { get: (t, k) => k === 'showTimingPopup' ? (o = {}) => { if (!/^P2|CPU/.test(String(o.grade || ''))){ if (o.partner){ mate++; mateThisPoint = true; } else me++; } return prev.showTimingPopup(o); } : prev[k] });
      if (fmt === 'doubles-noswing'){
        const sw = e._handleUserSwingInput.bind(e);
        e._handleUserSwingInput = (ev = {}) => {
          const b = e.ball, pa = e.playerPartner;
          // palla nella zona del compagno (stessa regola del motore, 1505-1511): chi gioca guarda il compagno e non fa il gesto
          if (e.phase === 'RALLY' && b.lastHitter === 'opponent' && b.pos.z > .3 && b.pos.z <= 7.5 && Math.abs(b.pos.x - pa.pos.x) < 3.4){ skipped++; return; }
          return sw(ev);
        };
      }
      const aw = e._awardPoint.bind(e);
      e._awardPoint = (who, why) => { if (mateThisPoint) ptsWithMate++; mateThisPoint = false; return aw(who, why); };
    } });
    pts += out.points; won += out.won; for (const [k, v] of Object.entries(out.reasons)) reasons[k] = (reasons[k] || 0) + v;
  }
  const vincenti = reasons['vinto: Nice Shot!'] || 0;
  console.log(`${difficulty.padEnd(7)} ${profile.padEnd(8)} ${fmt.padEnd(15)} punti vinti ${pct(won, pts)}% (n ${pts}) · colpi tuoi ${me} compagno ${mate} (${pct(mate, me + mate)}%) · punti con un colpo del compagno ${pct(ptsWithMate, pts)}% · vincenti tuoi ${vincenti} = ${pct(vincenti, won)}% dei vinti · gesti non fatti ${skipped}`);
  console.log('     ', Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => `${k} ${v}`).join(' · '));
}
