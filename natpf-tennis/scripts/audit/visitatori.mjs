// Visitatore dopo visitatore (B18 R1, difetto 5 del B16): chi arriva dopo con lo stesso telefono eredita calibrazione e
// colpo tipico di chi c'era prima? E «Nuovo giocatore» (NatpfPhoneRacket.resetPlayer: profilo, colpo tipico, salita,
// piatto, mira e prototipi azzerati; sul telefono la calibrazione nuova azzera i colpi giocati) lo risolve?
// Banco: lo stesso telefono simulato con il braccio di riscaldamento.mjs (test/phone-sim.mjs, test/arm-sim.mjs, presa della
// foto). Prima persona: calibrazione e 24 colpi alla sua scala; poi la seconda persona gioca 10 colpi (forza 1 ± 0,2 della
// sua scala, 60 % dritti, piatto ± 10°):
//   A (prima, oggi senza «Nuovo giocatore»): stesso telefono, riferimenti della prima persona;
//   B («Nuovo giocatore»): telefono azzerato e calibrato dalla seconda persona (un telefono simulato nuovo: è lo stato che
//     lascia resetPlayer, più la calibrazione rapida che il gioco chiede subito dopo il tutorial).
// Riferimento: lo stesso gesto letto da un telefono della seconda persona assestato (calibrazione e 24 suoi colpi) che non
// impara dal gesto letto. Per colpo: forza letta (intent.power), |forza − forza di riferimento|, tipo e lato diversi,
// colpi persi (gesto non letto). Scale: adulto 1, bambino 0,5 del colpo dell'adulto (picco e polso). È un banco sulle regole
// vere, non una misura di persone vere.
//   node --import ./test/register.mjs scripts/audit/visitatori.mjs [--seeds=12] [--n=10] [--child=.5]
import { simPhone, rng } from '../../test/phone-sim.mjs';
import { armSwing, photoGrip, STROKES } from '../../test/arm-sim.mjs';
import { gesture } from './colpi.mjs';
import { gauss } from './headless-engine.mjs';

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const SEEDS = +(arg('seeds') || 12), N = +(arg('n') || 10), CHILD = +(arg('child') || .5);
// telefono calibrato (calibrazione rapida col braccio) da una persona di scala sc
function phone(seed, sc){
  const p = simPhone({ seed, shape: true, hand: 'right' }); p.hand = 'right';
  photoGrip(p, { hand: 'right' });
  const R = rng(seed*31 + 5);
  p.calibrate({ armGesture: w => { const s = w === 'L' ? STROKES.dritto : STROKES.rovescio; armSwing(p, { ...s, peak: s.peak*sc, wrist: s.wrist*sc, tremor: 4, R }); } });
  return p;
}
const kOf = (R, sc) => sc*Math.max(.6, Math.min(1.5, 1 + gauss(R)*.2));
const play = (p, g, R, opts = {}) => { const m = gesture(p, { ...g, R }); return m.length === 1 ? p.game(m[0], opts) : null; };
const read = r => (r ? { shot: r.ev.natpf.shot, side: r.ev.side, power: r.ev.natpf.intent?.power ?? r.ev.natpf.power } : null);
const settle = (p, sc, seed) => { const R = rng(seed); for (let i = 0; i < 24; i++) play(p, { side: i % 2 ? 'backhand' : 'forehand', k: kOf(R, sc) }, R); return p; };
function shots(seed, sc){
  const R = rng(seed*7 + 1), out = [];
  for (let i = 0; i < N; i++) out.push({ side: R() < .6 ? 'forehand' : 'backhand', k: kOf(R, sc), yaw: Math.max(-25, Math.min(25, gauss(R)*10)), seed: seed*100 + i });
  return out;
}
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0)/a.length : NaN);
const f = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
export function run(first, second){
  const acc = { A: { p: [], p3: [], d: [], d3: [], type: 0, side: 0, lost: 0 }, B: { p: [], p3: [], d: [], d3: [], type: 0, side: 0, lost: 0 }, ref: { p: [], p3: [] } };
  for (let s = 1; s <= SEEDS; s++){
    const list = shots(s, second);
    const C = settle(phone(s, second), second, 900 + s), ref = list.map(g => read(play(C, g, rng(g.seed), { learn: false })));
    const A = settle(phone(s, first), first, 500 + s), B = phone(s + 1000, second);
    list.forEach((g, i) => {
      const x = ref[i]; if (x){ acc.ref.p.push(x.power); if (i < 3) acc.ref.p3.push(x.power); }
      for (const [k, p] of [['A', A], ['B', B]]){
        const r = read(play(p, g, rng(g.seed))), a = acc[k];
        if (!r || !x){ a.lost += r ? 0 : 1; continue; }
        a.p.push(r.power); if (i < 3) a.p3.push(r.power);
        const dp = Math.abs(r.power - x.power); a.d.push(dp); if (i < 3) a.d3.push(dp);
        if (r.shot !== x.shot) a.type++; if (r.side !== x.side) a.side++;
      }
    });
  }
  return acc;
}
const ROWS = [['adulto → bambino', 1, CHILD], ['bambino → adulto', CHILD, 1], ['adulto → adulto', 1, 1]];
console.log(`Visitatore dopo visitatore · ${SEEDS} semi × ${N} colpi della seconda persona · bambino ${CHILD} del colpo dell'adulto`);
console.log('A = stesso telefono (prima di «Nuovo giocatore») · B = «Nuovo giocatore» e calibrazione della seconda persona · rif = suo telefono assestato');
for (const [name, a, b] of ROWS){
  const r = run(a, b);
  console.log(`\n== ${name}`);
  console.log(`forza letta, primi 3 colpi: A ${f(mean(r.A.p3))} · B ${f(mean(r.B.p3))} · rif ${f(mean(r.ref.p3))}   (tutti: A ${f(mean(r.A.p))} · B ${f(mean(r.B.p))} · rif ${f(mean(r.ref.p))})`);
  console.log(`|forza − rif|, primi 3: A ${f(mean(r.A.d3))} · B ${f(mean(r.B.d3))}   (tutti: A ${f(mean(r.A.d))} · B ${f(mean(r.B.d))})`);
  console.log(`tipo ≠ rif: A ${r.A.type} · B ${r.B.type} · lato ≠ rif: A ${r.A.side} · B ${r.B.side} · gesti non letti: A ${r.A.lost} · B ${r.B.lost} (su ${SEEDS*N})`);
}
