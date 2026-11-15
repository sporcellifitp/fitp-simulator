// 2v2 con il compagno CPU: chi della squadra colpisce, quanti punti, come finiscono; confronto con il singolare.
const WT = '/tmp/claude-0/-home-user-foro-italico-world/03b77816-cd94-58d3-a4c5-bfdcf33f65d0/scratchpad/prep/b49/wt/natpf-tennis';
const { simulate } = await import(WT + '/scripts/audit/rally-balance.mjs');
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const pct = (a, n) => +(100*a/Math.max(1, n)).toFixed(1);
for (const difficulty of arg('levels', 'casual,pro').split(',')) for (const profile of arg('profiles', 'umano,amatore,bambino').split(',')) for (const fmt of ['singles', 'doubles']){
  let pts = 0, won = 0, me = 0, mate = 0, matePts = 0, mateLost = 0, meLost = 0, noTouch = 0, oppPartnerHits = 0, oppHits = 0; const reasons = {};
  for (const seed of [7, 11, 23]){
    let hooked = false, touched = false, lastTeam = null;
    const out = simulate({ profile, difficulty, points: +arg('points', 150), seed, onStep: e => {
      if (hooked) return; hooked = true;
      if (fmt === 'doubles'){ e.matchFormat = { id: 'doubles', teamSize: 2 }; e.isDoubles = true; }
      const at = e._attemptPlayerRallyStrike.bind(e);
      e._attemptPlayerRallyStrike = (ev = {}, t = false) => {
        const b = e.ball, lh = b.lastHitter, pa = e.playerPartner;
        const dP = Math.hypot(b.pos.x - e.player.pos.x, b.pos.z - e.player.pos.z), dM = Math.hypot(b.pos.x - pa.pos.x, b.pos.z - pa.pos.z);
        const mateHit = e.isDoubles && !t && b.pos.z > .3 && b.pos.z <= 7.6 && dM <= 3.95 && dM < dP;
        const ok = at(ev, t);
        if (ok && lh !== 'player' && b.lastHitter === 'player'){ if (mateHit) mate++; else me++; lastTeam = mateHit ? 'mate' : 'me'; touched ||= !mateHit; }
        return ok;
      };
      const ex = e._executeOpponentReturn?.bind(e);
      if (ex) e._executeOpponentReturn = (...a) => { const r = ex(...a); oppHits++; return r; };
      const aw = e._awardPoint.bind(e);
      e._awardPoint = (who, why) => {
        if (e.ball.rallyStrokeCount > 0 && !touched && e.score.server !== 'player') noTouch++;
        if (who === 'opponent' && e.ball.lastHitter === 'player'){ if (lastTeam === 'mate') mateLost++; else meLost++; }
        if (who === 'player' && lastTeam === 'mate' && e.ball.lastHitter === 'player') matePts++;
        touched = false; lastTeam = null; return aw(who, why);
      };
    } });
    pts += out.points; won += out.won; for (const [k, v] of Object.entries(out.reasons)) reasons[k] = (reasons[k] || 0) + v;
  }
  console.log(`${difficulty.padEnd(7)} ${profile.padEnd(8)} ${fmt.padEnd(8)} punti vinti ${pct(won, pts)}% · colpi tuoi ${me} compagno ${mate} (${pct(mate, me + mate)}%) · punti chiusi dal compagno: vinti ${matePts} persi ${mateLost} · persi sul tuo colpo ${meLost} · colpi CPU avversarie ${oppHits}`);
  console.log('    ', Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => `${k} ${v}`).join(' · '));
}
