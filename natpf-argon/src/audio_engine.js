// Audio di NATPF Simulator. Tutto è sintetizzato con Web Audio, senza file esterni né licenze:
// - musica: brani originali generati in tempo reale dal sequencer di src/natpf/natpf_music.js;
// - effetti di colpo, rimbalzo, rete, lancio, pubblico e interfaccia: sintesi del motore base, invariata;
// - voce del punteggio in italiano con speechSynthesis (src/natpf/natpf_voice.js).
// API pubblica invariata per il motore di gioco: playMusicForState, announceScore, playVoiceCallout, play*.
import { NATPF_TRACKS, NatpfMusic, trackForState } from "./natpf/natpf_music.js";
import { NatpfVoice, italianCallout } from "./natpf/natpf_voice.js";
export { NATPF_TRACKS };
// Annunci che fanno passare la musica al brano dei punti decisivi (e ritorno allo scambio sugli altri punteggi)
const HIGH_STAKES = /^(game point|break point|match point|palla (game|break|match))$/i;
export class AudioEngine {
  constructor(s = {}) {
    (this.ctx = null),
      (this.masterGain = null),
      (this.sfxGain = null),
      (this.musicGain = null),
      (this.reverbSend = null),
      (this.music = null),
      (this.voice = new NatpfVoice()),
      (this.muted = !!(s.muted ?? !1)),
      (this.musicVolume = Number(s.musicVolume ?? 0.65)),
      (this.sfxVolume = Number(s.sfxVolume ?? 0.85)),
      (this._voiceTimers = []),
      (this.currentTrackId = null),
      (this.desiredTrackId = "menu_theme"),
      (this.unlocked = !1),
      (this.onTrackChange = typeof s.onTrackChange == "function" ? s.onTrackChange : null),
      (this._noiseBuffer = null),
      (this._pinkNoiseBuffer = null),
      (this.voice.volume = Math.min(1, this.sfxVolume)),
      this._attachAutoplayUnlock(),
      this._bindVoiceToggle();
  }
  _attachAutoplayUnlock() {
    const s = () => {
      this.unlock();
    };
    // in cattura: la lobby ferma la propagazione dei clic e dei tasti, ma il primo gesto deve sbloccare l'audio
    window.addEventListener("pointerdown", s, { passive: !0, capture: !0 }),
      window.addEventListener("keydown", s, { passive: !0, capture: !0 }),
      window.addEventListener("touchstart", s, { passive: !0, capture: !0 }),
      // la lobby riaperta (anche dal «Menu» della vittoria) riporta il suo brano
      window.addEventListener("natpf:lobby", () => this.playMusicForState("title"));
  }
  // Pulsante «Voce» dell'HUD: accende e spegne gli annunci del punteggio
  _bindVoiceToggle() {
    const b = typeof document < "u" && document.getElementById("btn-voice-toggle");
    b &&
      (b.addEventListener("click", (e) => {
        e.stopPropagation(), this.setVoiceEnabled(!this.voice.enabled);
      }),
      this._updateVoiceButton());
  }
  _updateVoiceButton() {
    const b = typeof document < "u" && document.getElementById("btn-voice-toggle");
    if (!b) return;
    const on = this.voice.enabled,
      label = b.querySelector("[data-voice-label]"),
      dot = b.querySelector(".btn-dot");
    label && (label.textContent = on ? "sì" : "no"),
      dot && dot.classList.toggle("music-on", on),
      b.setAttribute("aria-pressed", String(on)),
      (b.title = on
        ? this.voice.available || !this.voice.synth
          ? "Voce del punteggio accesa (clic per spegnerla)"
          : "Voce accesa, ma il browser non ha una voce italiana: gli annunci restano in silenzio"
        : "Voce del punteggio spenta (clic per accenderla)");
  }
  setVoiceEnabled(on) {
    const r = this.voice.setEnabled(on);
    return this._updateVoiceButton(), r;
  }
  _ensureContext() {
    if (!this.ctx) {
      const s = window.AudioContext || window.webkitAudioContext;
      if (!s) return null;
      (this.ctx = new s()),
        (this.masterGain = this.ctx.createGain()),
        (this.masterGain.gain.value = this.muted ? 0 : 1),
        this.masterGain.connect(this.ctx.destination),
        (this.sfxGain = this.ctx.createGain()),
        (this.sfxGain.gain.value = this.sfxVolume),
        this.sfxGain.connect(this.masterGain),
        (this.musicGain = this.ctx.createGain()),
        (this.musicGain.gain.value = this.musicVolume),
        this.musicGain.connect(this.masterGain);
      const t = this.ctx.createDelay(0.5);
      t.delayTime.value = 0.095;
      const e = this.ctx.createGain();
      e.gain.value = 0.24;
      const a = this.ctx.createBiquadFilter();
      (a.type = "lowpass"),
        (a.frequency.value = 3200),
        (this.reverbSend = this.ctx.createGain()),
        (this.reverbSend.gain.value = 0.22),
        this.reverbSend.connect(t),
        t.connect(a),
        a.connect(e),
        e.connect(t),
        a.connect(this.masterGain),
        this._buildNoiseBuffers(),
        (this.music = new NatpfMusic(this.ctx, this.musicGain, { noise: this._noiseBuffer })),
        (this.music.onSwitch = () => this._syncTrackFromSequencer());
    }
    return this.ctx.state === "suspended" && this.ctx.resume().catch(() => {}), this.ctx;
  }
  _buildNoiseBuffers() {
    if (!this.ctx) return;
    const s = this.ctx.sampleRate,
      t = s * 2;
    this._noiseBuffer = this.ctx.createBuffer(1, t, s);
    const e = this._noiseBuffer.getChannelData(0);
    for (let l = 0; l < t; l++) e[l] = Math.random() * 2 - 1;
    this._pinkNoiseBuffer = this.ctx.createBuffer(1, t, s);
    const a = this._pinkNoiseBuffer.getChannelData(0);
    let i = 0,
      o = 0,
      n = 0,
      r = 0,
      m = 0,
      p = 0,
      u = 0;
    for (let l = 0; l < t; l++) {
      const c = Math.random() * 2 - 1;
      (i = 0.99886 * i + c * 0.0555179),
        (o = 0.99332 * o + c * 0.0750759),
        (n = 0.969 * n + c * 0.153852),
        (r = 0.8665 * r + c * 0.3104856),
        (m = 0.55 * m + c * 0.5329522),
        (p = -0.7616 * p - c * 0.016898),
        (a[l] = (i + o + n + r + m + p + u + c * 0.5362) * 0.045),
        (u = c * 0.115926);
    }
  }
  unlock() {
    this._ensureContext(),
      (this.unlocked = !0),
      this.music && !this.muted && !this.music.playing && this._startTrack(this.desiredTrackId);
  }
  playMusicForState(s) {
    const e = trackForState(s);
    return (
      (this.desiredTrackId = e),
      this.music && this.unlocked && !this.muted
        ? this._startTrack(e, { restart: e === "court_intro" && this.currentTrackId !== "court_intro" })
        : this._notifyTrack(),
      this.getCurrentTrackInfo()
    );
  }
  _startTrack(s, { restart: t = !1 } = {}) {
    this.music && (this.music.play(s, { restart: t }), (this.currentTrackId = this.music.currentId || s)),
      this._notifyTrack();
  }
  _notifyTrack() {
    const s = this.getCurrentTrackInfo();
    (s.id !== this._lastNotifiedTrack || s.muted !== this._lastNotifiedMuted) &&
      ((this._lastNotifiedTrack = s.id),
      (this._lastNotifiedMuted = s.muted),
      this._updateHudMusicBadge(s),
      typeof this.onTrackChange == "function" && this.onTrackChange(s));
  }
  // Brano in esecuzione (l'ingresso in campo passa da solo allo scambio)
  _syncTrackFromSequencer() {
    this.music &&
      this.music.currentId &&
      this.music.currentId !== this.desiredTrackId &&
      this.music.playing &&
      !this.music.pendingNext &&
      ((this.currentTrackId = this.desiredTrackId = this.music.currentId), this._notifyTrack());
  }
  getCurrentTrackInfo() {
    this.music && this.music.currentId && (this.currentTrackId = this.music.currentId);
    const s = this.currentTrackId || this.desiredTrackId || "menu_theme",
      t = NATPF_TRACKS[s] || NATPF_TRACKS.menu_theme;
    return {
      id: t.id,
      title: t.title,
      subtitle: t.subtitle,
      loop: t.loopFrom !== null,
      baseVolume: t.volume,
      muted: this.muted,
      musicVolume: this.musicVolume,
      voiceEnabled: this.voice.enabled,
    };
  }
  setMuted(s) {
    return (
      (this.muted = !!s),
      this.masterGain &&
        this.ctx &&
        this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.03),
      this.music &&
        (this.muted
          ? this.music.stop()
          : this.unlocked &&
            (this.music.currentId === this.desiredTrackId
              ? this.music.resume()
              : this._startTrack(this.desiredTrackId))),
      this.muted && this.voice.cancel(),
      this._notifyTrack(),
      this.muted
    );
  }
  toggleMute() {
    return this.setMuted(!this.muted);
  }
  setMusicVolume(s) {
    (this.musicVolume = Math.max(0, Math.min(1, Number(s)))),
      this.musicGain && this.ctx && this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
  }
  setSfxVolume(s) {
    (this.sfxVolume = Math.max(0, Math.min(1, Number(s)))),
      (this.voice.volume = this.sfxVolume),
      this.sfxGain && this.ctx && this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
  }
  _updateHudMusicBadge(s) {
    const t = document.getElementById("hud-music-title") || document.getElementById("music-track-label");
    t && s && (t.textContent = s.muted ? `\u{1F507} ${s.title}` : `♪ ${s.title}`);
  }
  playSwingWhoosh(s = 1) {
    if (this.muted) return;
    const t = this._ensureContext();
    if (!t || !this._pinkNoiseBuffer) return;
    const e = t.currentTime,
      a = Math.max(0.6, Math.min(1.8, Number(s || 1))),
      i = 0.16,
      o = t.createBufferSource();
    o.buffer = this._pinkNoiseBuffer;
    const n = t.createBiquadFilter();
    (n.type = "bandpass"),
      n.Q.setValueAtTime(1.6, e),
      n.frequency.setValueAtTime(320 * a, e),
      n.frequency.exponentialRampToValueAtTime(1380 * a, e + i * 0.55),
      n.frequency.exponentialRampToValueAtTime(420, e + i);
    const r = t.createGain();
    r.gain.setValueAtTime(0.001, e),
      r.gain.linearRampToValueAtTime(0.11 * Math.min(1.2, a), e + 0.025),
      r.gain.exponentialRampToValueAtTime(0.001, e + i),
      o.connect(n).connect(r).connect(this.sfxGain),
      o.start(e, Math.random() * 0.5, i + 0.02);
    const m = t.createOscillator(),
      p = t.createGain();
    (m.type = "sine"),
      m.frequency.setValueAtTime(175 * a, e),
      m.frequency.exponentialRampToValueAtTime(92, e + i),
      p.gain.setValueAtTime(0.001, e),
      p.gain.linearRampToValueAtTime(0.055, e + 0.02),
      p.gain.exponentialRampToValueAtTime(0.001, e + i),
      m.connect(p).connect(this.sfxGain),
      m.start(e),
      m.stop(e + i + 0.01);
  }
  playRacketHit(s = "topspin", t = "good") {
    if (this.muted) return;
    const e = this._ensureContext();
    if (!e || !this._noiseBuffer) return;
    const a = e.currentTime,
      i = String(s || "topspin").toLowerCase(),
      o = i === "smash" || i === "power_smash",
      n = t === "perfect" || t === "sweet_spot" || o,
      r = e.createBufferSource();
    r.buffer = this._noiseBuffer;
    const m = e.createBiquadFilter();
    (m.type = "bandpass"),
      m.frequency.setValueAtTime(i === "slice" ? 3600 : 2450, a),
      m.Q.setValueAtTime(1.75, a);
    const p = e.createGain();
    p.gain.setValueAtTime(0.001, a),
      p.gain.linearRampToValueAtTime(o ? 0.14 : 0.1, a + 0.004),
      p.gain.exponentialRampToValueAtTime(0.001, a + 0.028),
      r.connect(m).connect(p).connect(this.sfxGain),
      r.start(a, Math.random() * 0.5, 0.035);
    let u = 320,
      l = 132,
      c = 0.14;
    i === "slice"
      ? ((u = 460), (l = 185), (c = 0.16))
      : i === "lob"
        ? ((u = 250), (l = 165), (c = 0.19))
        : o && ((u = 395), (l = 98), (c = 0.21));
    const h = e.createOscillator(),
      f = e.createOscillator();
    (h.type = "triangle"),
      (f.type = "sine"),
      f.detune.setValueAtTime(12, a),
      h.frequency.setValueAtTime(u, a),
      h.frequency.exponentialRampToValueAtTime(l, a + c),
      f.frequency.setValueAtTime(u * 1.5, a),
      f.frequency.exponentialRampToValueAtTime(l, a + c * 0.85);
    const T = e.createGain();
    T.gain.setValueAtTime(0.001, a),
      T.gain.linearRampToValueAtTime(o ? 0.13 : 0.095, a + 0.006),
      T.gain.exponentialRampToValueAtTime(0.001, a + c),
      h.connect(T),
      f.connect(T),
      T.connect(this.sfxGain),
      this.reverbSend && T.connect(this.reverbSend),
      h.start(a),
      f.start(a),
      h.stop(a + c + 0.01),
      f.stop(a + c + 0.01),
      n &&
        [523.25, 659.25, 783.99, 1046.5].forEach((A, V) => {
          const d = a + V * 0.026,
            g = e.createOscillator(),
            y = e.createOscillator();
          (g.type = "sine"),
            (y.type = "triangle"),
            y.detune.setValueAtTime(10, d),
            g.frequency.setValueAtTime(A, d),
            y.frequency.setValueAtTime(A, d);
          const _ = e.createGain();
          _.gain.setValueAtTime(0.001, d),
            _.gain.linearRampToValueAtTime(0.048, d + 0.006),
            _.gain.exponentialRampToValueAtTime(8e-4, d + 0.24),
            g.connect(_),
            y.connect(_),
            _.connect(this.sfxGain),
            this.reverbSend && _.connect(this.reverbSend),
            g.start(d),
            y.start(d),
            g.stop(d + 0.25),
            y.stop(d + 0.25);
        });
  }
  playBallBounce(s = 1) {
    if (this.muted) return;
    const t = this._ensureContext();
    if (!t) return;
    const e = t.currentTime,
      a = Math.max(0.4, Math.min(1.2, Number(s || 1))),
      i = t.createOscillator(),
      o = t.createGain();
    if (
      ((i.type = "sine"),
      i.frequency.setValueAtTime(140, e),
      i.frequency.exponentialRampToValueAtTime(55, e + 0.095),
      o.gain.setValueAtTime(0.001, e),
      o.gain.linearRampToValueAtTime(0.11 * a, e + 0.005),
      o.gain.exponentialRampToValueAtTime(0.001, e + 0.1),
      i.connect(o).connect(this.sfxGain),
      i.start(e),
      i.stop(e + 0.11),
      this._pinkNoiseBuffer)
    ) {
      const n = t.createBufferSource();
      n.buffer = this._pinkNoiseBuffer;
      const r = t.createBiquadFilter();
      (r.type = "lowpass"), r.frequency.setValueAtTime(950, e);
      const m = t.createGain();
      m.gain.setValueAtTime(0.001, e),
        m.gain.linearRampToValueAtTime(0.045 * a, e + 0.004),
        m.gain.exponentialRampToValueAtTime(0.001, e + 0.04),
        n.connect(r).connect(m).connect(this.sfxGain),
        n.start(e, Math.random() * 0.4, 0.05);
    }
  }
  playNetCord() {
    if (this.muted) return;
    const s = this._ensureContext();
    if (!s) return;
    const t = s.currentTime,
      e = s.createOscillator(),
      a = s.createGain();
    (e.type = "triangle"),
      e.frequency.setValueAtTime(98, t),
      e.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const i = s.createBiquadFilter();
    if (
      ((i.type = "lowpass"),
      i.frequency.setValueAtTime(360, t),
      a.gain.setValueAtTime(0.001, t),
      a.gain.linearRampToValueAtTime(0.11, t + 0.006),
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.14),
      e.connect(i).connect(a).connect(this.sfxGain),
      e.start(t),
      e.stop(t + 0.15),
      this._noiseBuffer)
    ) {
      const o = s.createBufferSource();
      o.buffer = this._noiseBuffer;
      const n = s.createBiquadFilter();
      (n.type = "bandpass"), n.frequency.setValueAtTime(620, t), n.Q.setValueAtTime(2.2, t);
      const r = s.createGain();
      r.gain.setValueAtTime(0.001, t),
        r.gain.linearRampToValueAtTime(0.065, t + 0.005),
        r.gain.exponentialRampToValueAtTime(0.001, t + 0.075),
        o.connect(n).connect(r).connect(this.sfxGain),
        o.start(t, 0.1, 0.085);
    }
  }
  playServeToss() {
    if (this.muted) return;
    const s = this._ensureContext();
    if (!s) return;
    const t = s.currentTime,
      e = 0.22,
      a = s.createOscillator(),
      i = s.createOscillator();
    (a.type = "sine"),
      (i.type = "sine"),
      i.detune.setValueAtTime(9, t),
      a.frequency.setValueAtTime(290, t),
      a.frequency.exponentialRampToValueAtTime(680, t + e),
      i.frequency.setValueAtTime(290, t),
      i.frequency.exponentialRampToValueAtTime(680, t + e);
    const o = s.createGain();
    o.gain.setValueAtTime(0.001, t),
      o.gain.linearRampToValueAtTime(0.075, t + 0.025),
      o.gain.exponentialRampToValueAtTime(0.001, t + e),
      a.connect(o),
      i.connect(o),
      o.connect(this.sfxGain),
      a.start(t),
      i.start(t),
      a.stop(t + e + 0.01),
      i.stop(t + e + 0.01);
  }
  playCrowdReaction(s = "cheer") {
    if (this.muted) return;
    const t = this._ensureContext();
    if (!t || !this._pinkNoiseBuffer) return;
    const e = t.currentTime,
      a = String(s || "cheer").toLowerCase();
    if (a === "gasp" || a === "ooh") {
      const u = t.createBufferSource();
      u.buffer = this._pinkNoiseBuffer;
      const l = t.createBiquadFilter();
      (l.type = "bandpass"),
        l.Q.setValueAtTime(2.4, e),
        l.frequency.setValueAtTime(720, e),
        l.frequency.exponentialRampToValueAtTime(410, e + 0.55);
      const c = t.createGain();
      c.gain.setValueAtTime(0.001, e),
        c.gain.linearRampToValueAtTime(0.09, e + 0.08),
        c.gain.exponentialRampToValueAtTime(0.001, e + 0.55),
        u.connect(l).connect(c).connect(this.sfxGain),
        this.reverbSend && c.connect(this.reverbSend),
        u.start(e, 0, 0.55 + 0.05);
      return;
    }
    const i = a === "polite_clap" ? 0.85 : 1.35,
      o = t.createBufferSource();
    o.buffer = this._pinkNoiseBuffer;
    const n = t.createBiquadFilter();
    (n.type = "bandpass"),
      n.Q.setValueAtTime(1.1, e),
      n.frequency.setValueAtTime(650, e),
      n.frequency.exponentialRampToValueAtTime(1250, e + i * 0.35),
      n.frequency.exponentialRampToValueAtTime(780, e + i);
    const r = t.createGain();
    r.gain.setValueAtTime(0.001, e),
      r.gain.linearRampToValueAtTime(a === "polite_clap" ? 0.075 : 0.115, e + 0.14),
      r.gain.exponentialRampToValueAtTime(0.001, e + i),
      o.connect(n).connect(r).connect(this.sfxGain),
      this.reverbSend && r.connect(this.reverbSend),
      o.start(e, 0, i + 0.05);
    const m = a === "polite_clap" ? 10 : 18;
    for (let p = 0; p < m; p++) {
      const u = e + 0.03 + (p / m) * (i * 0.78) + Math.random() * 0.035,
        l = t.createBufferSource();
      l.buffer = this._noiseBuffer;
      const c = t.createBiquadFilter();
      (c.type = "bandpass"),
        c.frequency.setValueAtTime(1400 + Math.random() * 900, u),
        c.Q.setValueAtTime(1.9, u);
      const h = t.createGain();
      h.gain.setValueAtTime(0.001, u),
        h.gain.linearRampToValueAtTime(0.038, u + 0.003),
        h.gain.exponentialRampToValueAtTime(0.001, u + 0.026),
        l.connect(c).connect(h).connect(this.sfxGain),
        l.start(u, Math.random() * 0.8, 0.03);
    }
    a === "cheer" &&
      [261.63, 329.63, 392].forEach((u, l) => {
        const c = t.createOscillator();
        (c.type = "triangle"), c.detune.setValueAtTime((l - 1) * 11, e), c.frequency.setValueAtTime(u, e);
        const h = t.createGain();
        h.gain.setValueAtTime(0.001, e),
          h.gain.linearRampToValueAtTime(0.025, e + 0.12),
          h.gain.exponentialRampToValueAtTime(8e-4, e + 0.75),
          c.connect(h).connect(this.sfxGain),
          this.reverbSend && h.connect(this.reverbSend),
          c.start(e),
          c.stop(e + 0.78);
      });
  }
  announceScore(s, { delayMs: t = 0, playChime: e = !0 } = {}) {
    if (this.muted || !s) return;
    const a = String(s).trim(),
      i = this._ensureContext();
    // musica: i punti decisivi hanno il loro brano, gli altri punteggi riportano allo scambio
    this._syncTrackFromSequencer(),
      ["match_rally", "game_point"].includes(this.desiredTrackId) &&
        (HIGH_STAKES.test(a)
          ? this.playMusicForState("gamepoint")
          : (/^game!?$|deuce|parit/i.test(a) || (/\d/.test(a) && !/40/.test(a))) &&
            this.desiredTrackId === "game_point" &&
            this.playMusicForState("rally"));
    if (i && e) {
      const o = i.currentTime + t / 1e3;
      // gong a due o tre toni del giudice di sedia NATPF
      (/game|match|deuce|parit|vantaggio|win|nice|bel colpo|power|smash|ace/i.test(a)
        ? [659.25, 830.61, 987.77]
        : [783.99, 587.33]
      ).forEach((m, p) => {
        const u = o + p * 0.085,
          l = i.createOscillator(),
          c = i.createOscillator();
        (l.type = "sine"), (c.type = "sine"), l.frequency.setValueAtTime(m, u), c.frequency.setValueAtTime(m * 2.01, u);
        const h = i.createGain(),
          k = i.createGain();
        (k.gain.value = 0.18),
          h.gain.setValueAtTime(0.001, u),
          h.gain.linearRampToValueAtTime(0.06, u + 0.006),
          h.gain.exponentialRampToValueAtTime(8e-4, u + 0.42),
          l.connect(h),
          c.connect(k).connect(h),
          h.connect(this.sfxGain),
          this.reverbSend && h.connect(this.reverbSend),
          l.start(u),
          c.start(u),
          l.stop(u + 0.44),
          c.stop(u + 0.44);
      });
    }
    this.playVoiceCallout(a, { delayMs: t + (e ? 160 : 0), clearQueue: t === 0 });
  }
  playVoiceCallout(s, { delayMs: t = 0, clearQueue: e = !1 } = {}) {
    if (this.muted || !s) return;
    const a = String(s).trim();
    // replay: brano della moviola finché il gioco non torna allo scambio
    /^(replay|call_replay)$/i.test(a) &&
      ["match_rally", "game_point"].includes(this.desiredTrackId) &&
      this.playMusicForState("replay"),
      e &&
        this._voiceTimers.length > 0 &&
        (this._voiceTimers.forEach((n) => clearTimeout(n)), (this._voiceTimers = []));
    if (!italianCallout(a)) return;
    const o = () => {
      this.muted || this.voice.say(a);
    };
    if (t > 0) {
      const n = setTimeout(o, t);
      this._voiceTimers.push(n);
    } else o();
  }
  // Nuovo punto dopo un replay: torna la musica della partita
  resumeMatchMusic() {
    this.desiredTrackId === "replay" && this.playMusicForState("rally");
  }
  playUiClick() {
    if (this.muted) return;
    const s = this._ensureContext();
    if (!s) return;
    const t = s.currentTime,
      e = s.createOscillator(),
      a = s.createGain();
    (e.type = "sine"),
      e.frequency.setValueAtTime(660, t),
      e.frequency.exponentialRampToValueAtTime(880, t + 0.045),
      a.gain.setValueAtTime(0.001, t),
      a.gain.linearRampToValueAtTime(0.05, t + 0.004),
      a.gain.exponentialRampToValueAtTime(0.001, t + 0.05),
      e.connect(a).connect(this.sfxGain),
      e.start(t),
      e.stop(t + 0.055);
  }
}
export default AudioEngine;
