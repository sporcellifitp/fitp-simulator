// B49 · misure del doppio (2v2) contro il singolo con il banco vero (scripts/audit/rally-balance.mjs), per prima e dopo.
// Uso (da natpf-tennis): node --import ./test/register.mjs <questo file> [--wt=<cartella natpf-tennis>] [--levels=casual,evento,pro]
//   [--profiles=umano,amatore,bambino] [--fmts=singles,doubles,doubles-noswing] [--seeds=101,202,303] [--points=150] [--json]
// fmts: singles · doubles (chi gioca fa il gesto su ogni palla, anche su quelle del compagno, come il banco di sempre) ·
//       doubles-noswing (chi gioca NON fa il gesto sulle palle del compagno: le lascia a lui)
// Misure per riga: punti vinti, vincenti sui punti vinti, colpi del compagno sul totale della squadra, lunghezza degli
// scambi (media, mediana, p90, chiusi d'ufficio a 60 colpi), punti persi senza toccare la palla, distanza laterale della
// palla dal corpo ai colpi di chi gioca, colpi con l'esito della racchetta virtuale (B15), colpi a vuoto.
// Compagno: dal flag partner della scritta del motore (colpo del compagno con il gesto, oggi) oppure, dopo il B49, da
// engine.natpfTeamHit === 'partner' (campo proposto dal piano: chi della squadra ha colpito l'ultima palla).
// Regole candidate (solo nel doppio, prima del B49): a ogni colpo della CPU (non il servizio) si guarda la traiettoria
// prevista e si conta quante palle sarebbero del compagno con la regola «portata a rete» (reach 1,0/1,4/1,8 m) e con la
// regola «palla corta nella sua corsia».
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? d;
const WT = arg('wt', process.cwd());
const { simulate } = await import(WT + '/scripts/audit/rally-balance.mjs');
const { NatpfTennisEngine } = await import(WT + '/src/game_engine.js');
const NI = await import(WT + '/src/natpf/natpf_impact.js');
const P = NatpfTennisEngine.prototype;
// solo col prototipo/B49: posizione d'attesa e portata del compagno da riga di comando (--homeX=2.05 --reach=0.6)
try { const NDB = await import(WT + '/src/natpf/natpf_doubles.js'); if (arg('homeX', '')) NDB.partnerTuning.homeX = +arg('homeX'); if (arg('reach', '')) NDB.partnerTuning.own = { reach: +arg('reach') }; } catch {}
const origA = P._attemptPlayerRallyStrike, origR = P._natpfRacketShot, origOpp = P._executeOpponentReturn;
let S = null;   // stato della corsa in misura
P._attemptPlayerRallyStrike = function(ev, t){
  const b = this.ball, pl = this.player, pa = this.playerPartner, lh = b.lastHitter;
  const snap = { lat: Math.abs(b.pos.x - pl.pos.x), y: b.pos.y, dP: Math.hypot(b.pos.x - pl.pos.x, b.pos.z - pl.pos.z), dM: Math.hypot(b.pos.x - pa.pos.x, b.pos.z - pa.pos.z) };
  const r0 = S?.racketCalls || 0, pp0 = S?.popPartner || 0;
  const ok = origA.call(this, ev, t);
  if (S && ok && lh !== 'player' && b.lastHitter === 'player'){
    // chi ha colpito: la scritta del motore con partner = true (p === playerPartner, game_engine.js:2314). (Nel banco senza
    // disegno swingTimer non scende mai: non dice chi ha colpito)
    const byPartner = this.isDoubles && (S.popPartner || 0) > pp0;
    if (byPartner) S.partnerGesture++;
    else S.hits.push({ ...snap, racket: (S.racketCalls || 0) > r0 });
  }
  return ok;
};
P._natpfRacketShot = function(...a){ if (S) S.racketCalls = (S.racketCalls || 0) + 1; return origR.apply(this, a); };
// regole candidate: a ogni colpo della CPU (dopo il lancio), sulla traiettoria prevista
const REACH = [1.0, 1.4, 1.8];
P._executeOpponentReturn = function(...a){
  const r = origOpp.apply(this, a);
  if (S && this.isDoubles && this.ball.lastHitter === 'opponent' && this.ball.rallyStrokeCount >= 2){
    const pa = this.playerPartner, tp = pa.targetPos, path = NI.predictBall(this.ball);
    const before = path.filter(p => p.bounces === 0 && p.z > 0), bounce = path.find(p => p.bounces === 1);
    S.cpuShots++;
    for (const R of REACH){
      // portata a rete: un punto prima del rimbalzo, tra 2,2 m dalla rete e 1 m dietro il compagno, ad altezza da volée,
      // entro R m dalla posizione d'attesa del compagno (targetPos: dove sta andando)
      const hit = before.find(p => p.z >= 2.2 && p.z <= tp.z + 1 && p.y >= .5 && p.y <= 1.95 && Math.hypot(p.x - tp.x, p.z - tp.z) <= R);
      if (hit) S.rule[R] = (S.rule[R] || 0) + 1;
    }
    // palla corta nella sua corsia: rimbalzo prima della riga del servizio (6,4 m), dal lato del compagno
    if (bounce && bounce.z > 0 && bounce.z < 6.4 && Math.sign(bounce.x || 1) === Math.sign(tp.x || 1)) S.short++;
    // pallonetto sopra il compagno (passa sopra 1,95 m vicino a lui): resta di chi gioca
    if (before.some(p => Math.abs(p.z - tp.z) < 1 && p.y > 1.95 && Math.abs(p.x - tp.x) < 1.8)) S.lobOver++;
  }
  return r;
};
const q = (a, f) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(f*s.length))].toFixed(2) : null; };
const pct = (a, n) => +(100*a/Math.max(1, n)).toFixed(1);
const rows = [];
for (const difficulty of arg('levels', 'casual,evento,pro').split(',')) for (const profile of arg('profiles', 'umano,amatore,bambino').split(',')) for (const fmt of arg('fmts', 'singles,doubles,doubles-noswing').split(',')){
  const A = { pts: 0, won: 0, reasons: {}, rallies: [], hits: [], partner: 0, noTouch: 0, whiffs: 0, gestures: 0, skipped: 0, cpuShots: 0, rule: {}, short: 0, lobOver: 0, simSec: 0, partnerWon: 0, partnerLost: 0 };
  for (const seed of arg('seeds', '101,202,303').split(',').map(Number)){
    S = { hits: [], racketCalls: 0, partnerGesture: 0, partnerAuto: 0, cpuShots: 0, rule: {}, short: 0, lobOver: 0, noTouch: 0, gestures: 0, skipped: 0, partnerWon: 0, partnerLost: 0 };
    let hooked = false, lastTeam = null;
    const out = simulate({ profile, difficulty, points: +arg('points', 150), seed, onStep: e => {
      // dopo il B49: chi della squadra ha colpito (campo proposto); conta il compagno che colpisce da solo
      if (e.natpfTeamHit && e.ball.lastHitter === 'player' && e.natpfTeamHitAt !== lastTeam){ lastTeam = e.natpfTeamHitAt; if (e.natpfTeamHit === 'partner' && !e.natpfTeamHitGesture) S.partnerAuto++; }
      // --gestoCompagno=<sd>: in «Con il tuo gesto» chi gioca fa il gesto per il compagno quando la palla arriva a lui (0,05 s
      // prima del punto previsto, ± sd), invece che con il tempo del proprio punto d'impatto
      const gsd = arg('gestoCompagno', '');
      if (gsd && e.isDoubles && e.natpfPartnerBall && e.ball.lastHitter === 'opponent'){
        const pb = e.natpfPartnerBall;
        if (pb.stroke === e.ball.rallyStrokeCount && pb.sentFor !== pb.at){
          pb.when ??= pb.at + pb.t - .05 + Math.max(-.2, Math.min(.2, (Math.random() + Math.random() + Math.random() - 1.5)*2*Number(gsd)));
          if (e.elapsedTime >= pb.when){ pb.sentFor = pb.at; S.gestures++; e.__sw0({ source: 'audit', side: 'forehand', shotType: 'topspin', speed: 1.3, dirX: 0, natpf: { aim: 'swing', shot: 'topspin', intent: { shot: 'topspin', power: .6, depth: .55, rise: .3, face: 0 }, power: .6, peak: 700, latency: 0, hand: 'right' } }); }
        }
      }
      if (hooked) return; hooked = true;
      if (fmt !== 'singles') e.setMatchFormat('doubles');
      if (arg('compagno', '')) e.natpfPartnerMode = arg('compagno', '');
      const prev = e.hud;
      e.hud = new Proxy({}, { get: (t, k) => k === 'showTimingPopup' ? (o = {}) => { if (o.partner && !/^P2|CPU/.test(String(o.grade || ''))) S.popPartner = (S.popPartner || 0) + 1; return prev.showTimingPopup(o); } : prev[k] });
      const sw = e._handleUserSwingInput.bind(e); e.__sw0 = sw;
      e._handleUserSwingInput = (ev = {}) => {
        const b = e.ball, pa = e.playerPartner;
        if (e.phase === 'RALLY' && b.lastHitter === 'opponent'){
          // palla del compagno: dopo il B49 la dice il motore (natpfPartnerBall); prima la regola del motore di oggi (1616-1621)
          const mate = e.isDoubles && (e.natpfPartnerBall !== undefined ? !!e.natpfPartnerBall && e.natpfPartnerBall.stroke === b.rallyStrokeCount : b.pos.z > .3 && b.pos.z <= 7.5 && Math.abs(b.pos.x - pa.pos.x) < 3.4);
          if (fmt === 'doubles-noswing' && mate){ S.skipped++; return; }
          S.gestures++;
        }
        return sw(ev);
      };
      const aw = e._awardPoint.bind(e);
      e._awardPoint = (who, why) => {
        if (e.phase === 'RALLY' && who === 'opponent' && e.ball.lastHitter === 'opponent' && e.ball.rallyStrokeCount > 0) S.noTouch++;
        // punto chiuso dal colpo del compagno (ultimo colpo della squadra suo): vinto (vincente o errore della CPU) o perso (suo errore)
        if (e.phase === 'RALLY' && e.ball.lastHitter === 'player' && e.natpfTeamHit === 'partner'){ if (who === 'player') S.partnerWon++; else S.partnerLost++; }
        return aw(who, why);
      };
    } });
    A.pts += out.points; A.won += out.won; A.rallies.push(...out.rallies); A.whiffs += out.whiffs; A.hits.push(...S.hits);
    for (const [k, v] of Object.entries(out.reasons)) A.reasons[k] = (A.reasons[k] || 0) + v;
    A.partner += S.partnerGesture + S.partnerAuto; A.noTouch += S.noTouch; A.partnerWon += S.partnerWon; A.partnerLost += S.partnerLost; A.gestures += S.gestures; A.skipped += S.skipped;
    A.cpuShots += S.cpuShots; A.short += S.short; A.lobOver += S.lobOver; for (const [k, v] of Object.entries(S.rule)) A.rule[k] = (A.rule[k] || 0) + v;
  }
  const winners = A.reasons['vinto: Nice Shot!'] || 0, capped = A.reasons['perso: scambio infinito'] || 0, team = A.hits.length + A.partner;
  const row = { difficulty, profile, fmt, pts: A.pts, wonPct: pct(A.won, A.pts), winnersPctOfWon: pct(winners, A.won), cpuErrPctOfWon: pct((A.reasons['vinto: Out'] || 0) + (A.reasons['vinto: Net'] || 0), A.won),
    partnerPct: pct(A.partner, team), playerHits: A.hits.length, partnerHits: A.partner,
    rallyAvg: +(A.rallies.reduce((s, v) => s + v, 0)/Math.max(1, A.rallies.length)).toFixed(1), rallyP50: q(A.rallies, .5), rallyP90: q(A.rallies, .9), cappedPct: pct(capped, A.pts),
    noTouchPct: pct(A.noTouch, A.pts), latP50: q(A.hits.map(h => h.lat), .5), latUnder045Pct: pct(A.hits.filter(h => h.lat < .45).length, A.hits.length), racketPct: pct(A.hits.filter(h => h.racket).length, A.hits.length),
    whiffsPer100: +(100*A.whiffs/Math.max(1, A.gestures)).toFixed(1), skipped: A.skipped, partnerWonPct: pct(A.partnerWon, A.pts), partnerLostPct: pct(A.partnerLost, A.pts), partnerErrPctOfHits: pct(A.partnerLost, A.partner),
    rule: fmt === 'singles' ? null : { cpuShots: A.cpuShots, ...Object.fromEntries(REACH.map(R => [`reach${R}`, pct(A.rule[R] || 0, A.cpuShots)])), shortLane: pct(A.short, A.cpuShots), lobOver: pct(A.lobOver, A.cpuShots) },
    reasons: Object.entries(A.reasons).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => `${k} ${v}`).join(' · ') };
  rows.push(row);
  if (!process.argv.includes('--json')){
    console.log(`${difficulty.padEnd(7)} ${profile.padEnd(8)} ${fmt.padEnd(15)} vinti ${row.wonPct}% (n ${row.pts}) · vincenti ${row.winnersPctOfWon}% dei vinti · compagno ${row.partnerPct}% (${row.partnerHits}/${team}) · scambio media ${row.rallyAvg} p50 ${row.rallyP50} p90 ${row.rallyP90} · ≥60 colpi ${row.cappedPct}% · persi senza toccare ${row.noTouchPct}% · laterale p50 ${row.latP50} m (<0,45 m ${row.latUnder045Pct}%) · esito B15 ${row.racketPct}% · a vuoto ${row.whiffsPer100}/100 gesti${row.skipped ? ` · gesti non fatti ${row.skipped}` : ''}${fmt !== 'singles' ? ` · punti chiusi dal compagno: vinti ${row.partnerWonPct}% persi ${row.partnerLostPct}% dei punti (errori ${row.partnerErrPctOfHits}% dei suoi colpi)` : ''}`);
    if (row.rule) console.log(`      regole candidate su ${row.rule.cpuShots} colpi della CPU: portata 1,0 m ${row.rule['reach1']}% · 1,4 m ${row.rule['reach1.4']}% · 1,8 m ${row.rule['reach1.8']}% · corta nella sua corsia ${row.rule.shortLane}% · pallonetto sopra di lui ${row.rule.lobOver}%`);
    console.log('      ' + row.reasons);
  }
}
if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
