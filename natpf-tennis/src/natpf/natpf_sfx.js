// Effetti sonori NATPF sintetizzati con Web Audio (nessun file, nessuna licenza esterna). Ogni funzione riceve il
// contesto audio, il nodo di destinazione (bus degli effetti) e i buffer di rumore dell'AudioEngine, e programma i
// suoni a partire da `at` (default: adesso). Le chiama src/audio_engine.js (play*).
const env = (g, t, peak, attack, release) => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
};
function noise(ctx, buf, dest, t, { type = 'bandpass', freq = 1000, q = 1, peak = .1, attack = .004, release = .05, endFreq = null } = {}){
  if (!buf) return;
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.setValueAtTime(q, t);
  if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + attack + release);
  const g = ctx.createGain(); env(g, t, peak, attack, release);
  s.connect(f).connect(g).connect(dest);
  s.start(t, Math.random()*.5, attack + release + .02);
}
function tone(ctx, dest, t, { type = 'sine', from = 200, to = null, peak = .1, attack = .005, release = .1, detune = 0 } = {}){
  const o = ctx.createOscillator(); o.type = type; o.detune.value = detune;
  o.frequency.setValueAtTime(from, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + release);
  const g = ctx.createGain(); env(g, t, peak, attack, release);
  o.connect(g).connect(dest); o.start(t); o.stop(t + attack + release + .02);
}

// Lancio del lanciapalle: «tump» pneumatico (colpo grave), soffio d'aria e il ronzio delle ruote che riprendono giri.
// Il profilo cambia un poco il suono: palle veloci più secche, palle alte più sorde.
export function machineLaunch(ctx, dest, { noise: white, pink } = {}, profile = 'rally', at = ctx.currentTime){
  const fast = profile === 'fast' || profile === 'heavy', soft = profile === 'lob' || profile === 'soft' || profile === 'short';
  tone(ctx, dest, at, { from: fast ? 150 : 120, to: 48, peak: .22, attack: .003, release: soft ? .16 : .11 });
  noise(ctx, pink || white, dest, at, { type: 'lowpass', freq: 2400, endFreq: 380, peak: fast ? .16 : .11, attack: .002, release: .14 });
  noise(ctx, white, dest, at + .005, { freq: fast ? 3200 : 2200, q: 2.5, peak: .05, attack: .002, release: .03 });
  // ruote che riprendono giri
  tone(ctx, dest, at + .05, { type: 'sawtooth', from: 70, to: 140, peak: .018, attack: .04, release: .3 });
}

// variazione casuale piccola (±amt): ogni colpo suona un po' diverso, mai uguale due volte di fila
const vary = (x, amt = 0.06) => x * (1 + (Math.random() * 2 - 1) * amt);

// Impatto della racchetta per tipo di colpo. Strati: «schiocco» delle corde (rumore filtrato), corpo del telaio (tono
// che scende), coda di aria. topspin: spazzolato e brillante; flat: secco e forte, con un colpo grave; slice: «fit»
// tagliente che scende di frequenza; lob: morbido e vuoto; smash: lo schiocco più forte, con riverbero e sub.
export const HIT_PROFILES = Object.freeze({
  topspin: { crack: [2600, 1.6, 0.11, 0.028], brush: [6500, 0.06, 0.05], body: [330, 140, 0.13, 0.1], thump: 0 },
  flat: { crack: [1900, 0.9, 0.16, 0.024], brush: [5200, 0.03, 0.03], body: [380, 110, 0.12, 0.13], thump: 0.12 },
  slice: { crack: [4200, 2.2, 0.08, 0.05], sweep: 1700, brush: [7200, 0.05, 0.07], body: [460, 190, 0.15, 0.08], thump: 0 },
  lob: { crack: [1500, 0.8, 0.06, 0.035], brush: [4000, 0.02, 0.04], body: [250, 165, 0.2, 0.09], thump: 0 },
  smash: { crack: [2100, 0.8, 0.2, 0.03], brush: [6000, 0.05, 0.05], body: [420, 90, 0.22, 0.15], thump: 0.2 },
});
export function racketHit(ctx, dest, { noise: white, pink, reverb = null } = {}, shot = "topspin", quality = "good", at = ctx.currentTime){
  const P = HIT_PROFILES[shot] || HIT_PROFILES.topspin, perfect = quality === "perfect";
  const [cf, cq, cp, cd] = P.crack;
  noise(ctx, white, dest, at, { freq: vary(cf), q: cq, peak: cp * (perfect ? 1.15 : 1), attack: 0.003, release: cd, endFreq: P.sweep || null });
  const [bf, bq, bp] = P.brush;
  noise(ctx, white, dest, at + 0.004, { type: "highpass", freq: bf, q: 0.7, peak: bp, attack: 0.004, release: bq + 0.02 });
  const [f0, f1, dur, peak] = P.body, body = ctx.createGain();
  body.connect(dest); if (reverb && (shot === "smash" || perfect)) body.connect(reverb);
  tone(ctx, body, at, { type: "triangle", from: vary(f0, 0.04), to: f1, peak, attack: 0.004, release: dur });
  tone(ctx, body, at, { type: "sine", from: vary(f0 * 1.5, 0.04), to: f1, peak: peak * 0.55, attack: 0.004, release: dur * 0.85 });
  if (P.thump) tone(ctx, dest, at, { type: "sine", from: 95, to: 48, peak: P.thump, attack: 0.003, release: 0.12 });
  // colpo perfetto: scintilla breve in maggiore (ricompensa arcade), più discreta di prima
  if (perfect) [1046.5, 1318.5, 1568].forEach((f, i) => tone(ctx, reverb || dest, at + 0.03 + i * 0.03, { from: f, peak: 0.03, attack: 0.004, release: 0.22 }));
}
// Rimbalzo: più forte e più brillante con la palla veloce; un po' diverso ogni volta
export function ballBounce(ctx, dest, { pink, noise: white } = {}, strength = 1, at = ctx.currentTime){
  const a = Math.max(0.35, Math.min(1.25, strength));
  tone(ctx, dest, at, { from: vary(150 + 40 * a), to: 55, peak: 0.1 * a, attack: 0.004, release: 0.09 });
  noise(ctx, pink || white, dest, at, { type: "lowpass", freq: vary(800 + 600 * a), peak: 0.05 * a, attack: 0.003, release: 0.035 });
  noise(ctx, white, dest, at, { freq: 3000, q: 1.2, peak: 0.015 * a, attack: 0.002, release: 0.02 });
}
// Palla nella rete: tonfo sordo del nastro e fruscio delle maglie
export function netHit(ctx, dest, { noise: white, pink } = {}, at = ctx.currentTime){
  tone(ctx, dest, at, { type: "triangle", from: 105, to: 44, peak: 0.12, attack: 0.005, release: 0.14 });
  noise(ctx, pink || white, dest, at, { freq: 650, q: 2, peak: 0.07, attack: 0.004, release: 0.08 });
  noise(ctx, white, dest, at + 0.02, { type: "highpass", freq: 3500, peak: 0.025, attack: 0.01, release: 0.18 });
}
// Effetti dei minigiochi: bersaglio colpito (più alto con la combo), centro perfetto, combo, timer, medaglia
export function targetHit(ctx, dest, { noise: white } = {}, { combo = 0, bull = false } = {}, at = ctx.currentTime){
  const base = 523.25 * Math.pow(2, Math.min(combo, 12) / 12);
  noise(ctx, white, dest, at, { freq: 3000, q: 1, peak: 0.12, attack: 0.002, release: 0.05 });
  tone(ctx, dest, at, { type: "square", from: base, peak: 0.05, attack: 0.003, release: 0.09 });
  tone(ctx, dest, at + 0.06, { type: "square", from: base * 1.5, peak: 0.05, attack: 0.003, release: 0.12 });
  if (bull) [2, 2.5, 3].forEach((m, i) => tone(ctx, dest, at + 0.12 + i * 0.05, { type: "triangle", from: base * m, peak: 0.045, attack: 0.003, release: 0.2 }));
}
export function comboUp(ctx, dest, level = 1, at = ctx.currentTime){
  const f = 660 * Math.pow(2, Math.min(level, 8) / 12);
  tone(ctx, dest, at, { type: "sawtooth", from: f, to: f * 2, peak: 0.04, attack: 0.01, release: 0.18 });
}
export function timerTick(ctx, dest, urgent = false, at = ctx.currentTime){
  tone(ctx, dest, at, { type: "square", from: urgent ? 1320 : 990, peak: urgent ? 0.05 : 0.03, attack: 0.002, release: 0.05 });
}
export function miss(ctx, dest, at = ctx.currentTime){
  tone(ctx, dest, at, { type: "sawtooth", from: 220, to: 110, peak: 0.05, attack: 0.01, release: 0.25 });
}
export function medal(ctx, dest, tier = "gold", at = ctx.currentTime){
  const notes = tier === "gold" ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : tier === "silver" ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
  notes.forEach((f, i) => { tone(ctx, dest, at + i * 0.09, { type: "triangle", from: f, peak: 0.07, attack: 0.005, release: 0.35 }); tone(ctx, dest, at + i * 0.09, { from: f * 2, peak: 0.02, attack: 0.005, release: 0.3 }); });
}
