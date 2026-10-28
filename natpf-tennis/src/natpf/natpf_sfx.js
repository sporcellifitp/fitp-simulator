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
