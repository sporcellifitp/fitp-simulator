// B49 · quali palle sarebbero del compagno con regole diverse (stima sul doppio di oggi, banco rally-balance).
// A ogni colpo della CPU nello scambio (non il servizio) si prende la traiettoria prevista (natpf_impact.predictBall, la
// stessa fisica del motore) e la posizione d'attesa del compagno (targetPos, dove sta andando: z ≈ 5,1 m, x ≈ ±1,35 m) e
// si guarda se la palla passa alla sua portata ad altezza da volée prima del rimbalzo. Varianti:
//   R  portata (m) dalla posizione d'attesa, H altezza della volée comoda, «corsia»: solo dal suo lato del campo (x con lo
//   stesso segno della sua posizione d'attesa), «vicino»: il compagno è più vicino al punto della volée di quanto chi gioca
//   sia vicino al suo punto d'impatto dopo il rimbalzo (2 m dietro il rimbalzo, come _predictBallIntercept).
// Uso (da natpf-tennis): node --import ./test/register.mjs <questo file> [--levels=casual,evento,pro] [--profiles=umano,amatore] [--seeds=101,202,303] [--points=150]
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? d;
const WT = arg('wt', process.cwd());
const { simulate } = await import(WT + '/scripts/audit/rally-balance.mjs');
const NI = await import(WT + '/src/natpf/natpf_impact.js');
const VARS = [];
for (const fixed of [false, true]) for (const R of (fixed ? [.4, .6, .8, 1.0, 1.2] : [.6, .8, 1.0])) for (const H of [[.6, 1.7]]) VARS.push({ R, H, lane: false, near: false, fixed });
const name = v => `${v.fixed ? 'fisso ' : 'segue '}R${v.R}`;
const pct = (a, n) => +(100*a/Math.max(1, n)).toFixed(1);
for (const difficulty of arg('levels', 'casual,evento,pro').split(',')) for (const profile of arg('profiles', 'umano,amatore').split(',')){
  let shots = 0, teamShots = 0; const cnt = new Map(VARS.map(v => [name(v), 0])); let shortLane = 0;
  for (const seed of arg('seeds', '101,202,303').split(',').map(Number)){
    let hooked = false;
    simulate({ profile, difficulty, points: +arg('points', 150), seed, onStep: e => {
      if (hooked) return; hooked = true; e.setMatchFormat('doubles');
      const ex = e._executeOpponentReturn.bind(e);
      e._executeOpponentReturn = (...a) => {
        const r = ex(...a);
        if (e.ball.lastHitter !== 'opponent') return r;
        teamShots++;
        if (e.ball.rallyStrokeCount < 2) return r;
        shots++;
        const tp0 = e.playerPartner.targetPos, pl = e.player.pos, path = NI.predictBall(e.ball);
        // posizione d'attesa fissa del doppio: dal suo lato (lo stesso segno di game_engine.js:2340), 5,1 m dalla rete
        const fx = { x: e.score.deuceSide ? -1.4 : 1.4, z: 5.1 };
        const before = path.filter(p => p.bounces === 0 && p.z > 0), bounce = path.find(p => p.bounces === 1);
        const dPlayer = bounce ? Math.hypot(bounce.x - pl.x, bounce.z + 2 - pl.z) : 9;
        if (bounce && bounce.z > 0 && bounce.z < 6.4 && Math.sign(bounce.x || 1) === Math.sign(fx.x || 1)) shortLane++;
        for (const v of VARS){
          const tp = v.fixed ? fx : tp0;
          const hit = before.find(p => p.z >= 2.2 && p.z <= tp.z + .8 && p.y >= v.H[0] && p.y <= v.H[1] && Math.hypot(p.x - tp.x, p.z - tp.z) <= v.R
            && (!v.lane || Math.sign(p.x || 1) === Math.sign(tp.x || 1)) && (!v.near || Math.hypot(p.x - tp.x, p.z - tp.z) < dPlayer));
          if (hit) cnt.set(name(v), cnt.get(name(v)) + 1);
        }
        return r;
      };
    } });
  }
  console.log(`${difficulty} ${profile}: colpi della CPU nello scambio ${shots} (su ${teamShots} con i servizi) · palla corta nella sua corsia ${pct(shortLane, shots)}%`);
  console.log('   ' + [...cnt].map(([k, v]) => `${k} ${pct(v, shots)}%`).join(' · '));
}
