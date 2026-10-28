// Suoni: colpi, rimbalzi e musica dal gioco Swipe Smash originale (assets/audio); pubblico e applausi
// sintetizzati con rumore filtrato (nessun file esterno).
export class Audio {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.muted = false;
    this.musicOn = true;
    try { this.muted = localStorage.getItem('sta-muted') === '1'; } catch { /* archivio non disponibile */ }
  }

  async unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    const names = ['hit', 'hit_2', 'hit_3', 'bounce', 'swing', 'music'];
    await Promise.all(names.map(async (n) => {
      try {
        const r = await fetch(`assets/audio/${n}.mp3`);
        this.buffers[n] = await this.ctx.decodeAudioData(await r.arrayBuffer());
      } catch { /* suono mancante: si gioca lo stesso */ }
    }));
    this.noise = this.makeNoise();
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('sta-muted', m ? '1' : '0'); } catch { /* ignorato */ }
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 8; }
    return b;
  }

  play(name, vol = 0.6, rate = 1) {
    if (!this.ctx) return;
    if (name === 'net') return this.thump(0.35 * vol * 2, 140);
    if (name === 'fault') return this.thump(0.2, 320);
    const buf = this.buffers[name];
    if (!buf) return;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    s.connect(g).connect(this.master);
    s.start();
  }

  hit(strength = 0.6) {
    const n = ['hit', 'hit_2', 'hit_3'][(Math.random() * 3) | 0];
    this.play(n, 0.45 + strength * 0.45, 0.92 + strength * 0.2);
  }

  bounce(v = 0.55) { this.play('bounce', v, 0.95 + Math.random() * 0.1); }

  thump(vol, freq) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 0.4, this.ctx.currentTime + 0.15);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + 0.2);
  }

  // Brusio del pubblico in sottofondo.
  crowd(on) {
    if (!this.ctx || !this.noise) return;
    if (on && !this.crowdSrc) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.6;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      s.connect(f).connect(g).connect(this.master);
      s.start();
      this.crowdSrc = s; this.crowdGain = g;
    } else if (!on && this.crowdSrc) {
      this.crowdSrc.stop(); this.crowdSrc = null;
    }
  }

  // Applauso: tante piccole raffiche di rumore.
  applause(intensity = 1) {
    if (!this.ctx || !this.noise) return;
    const t0 = this.ctx.currentTime;
    const n = Math.round(40 * intensity);
    for (let i = 0; i < n; i++) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noise;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1200 + Math.random() * 2400; f.Q.value = 1.5;
      const g = this.ctx.createGain();
      const t = t0 + Math.random() * 1.6 * intensity;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.05, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      s.connect(f).connect(g).connect(this.master);
      s.start(t, Math.random() * 1.5, 0.1);
    }
  }

  point(mine) { this.applause(mine ? 1.2 : 0.6); }

  music(on) {
    if (!this.ctx) return;
    if (on && !this.musicSrc && this.buffers.music && this.musicOn) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.buffers.music;
      s.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = 0.22;
      s.connect(g).connect(this.master);
      s.start();
      this.musicSrc = s;
    } else if (!on && this.musicSrc) {
      this.musicSrc.stop();
      this.musicSrc = null;
    }
  }
}
