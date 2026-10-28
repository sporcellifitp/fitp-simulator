// Voce del gioco, solo in inglese (richiesta dell'utente del 28/10/2026: un'unica lingua, timbro cartoon, niente voce
// maschile cupa). Le frasi sono clip registrate (public/voce/, ElevenLabs Eleven v4 tramite Higgsfield con la voce
// preimpostata «Pixie», vedi public/voce/LEGGIMI.txt) suonate con Web Audio sul bus delle voci; se una clip manca o
// non si carica si usa la sintesi vocale inglese del browser (speechSynthesis). Il motore annuncia con le sue etichette
// («15 - 00», «Deuce», «Game Point», «Out»…) o con quelle italiane dell'HUD («Parità», «Palla game»…): callout() le
// trasforma nella frase inglese da dire. La voce si spegne dal pulsante «Voce»; la scelta resta salvata.
// Oltre all'arbitro: annunci dei minigiochi (cue) e versi del giocatore (effort, cheer, groan), con la stessa voce.

const NUMBERS = { "00": "love", 0: "love", 15: "fifteen", 30: "thirty", 40: "forty" };

const PHRASES = [
  [/^(start|match[ _]start|inizio partita|si gioca)$/, "Ready? Play!"],
  [/^(deuce|parit[aà])$/, "Deuce"],
  [/^(ad in|ad out|advantage.*|vantaggio.*)$/, "Advantage"],
  [/^(game[ _]point|palla game)$/, "Game point"],
  [/^(break[ _]point|palla break)$/, "Break point"],
  [/^(match[ _]point|palla match)$/, "Match point"],
  [/^(game[ _]set[ _]and[ _]match|game[ _]set[ _]match|game, set and match|game, set e partita)$/, "Game, set and match"],
  [/^(game|game[ _]won)$/, "Game"],
  [/^(out|call[ _]out|fuori)$/, "Out"],
  [/^(net|call[ _]net|rete)$/, "Net"],
  [/^(ace)$/, "Ace"],
  [/^(nice shot|call[ _]nice[ _]shot|bel colpo)$/, "Nice shot"],
  [/^(power serve|big serve|call[ _]power[ _]serve|gran servizio|servizio potente)$/, "Big serve"],
  [/^(smash|call[ _]power[ _]smash|schiacciata)$/, "Smash"],
  [/^(replay|call[ _]replay|moviola)$/, "Replay"],
];

// Etichetta del motore o dell'HUD → frase inglese da pronunciare (null se non è un annuncio noto).
export function callout(text) {
  const raw = String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[!¡]/g, "")
    .replace(/\s+/g, " ");
  if (!raw) return null;
  const score = /^(00|0|15|30|40|ad)\s*[-–]\s*(00|0|15|30|40|ad)$/.exec(raw);
  if (score) {
    const [a, b] = [score[1], score[2]];
    if (a === "ad" || b === "ad") return "Advantage";
    if (NUMBERS[a] === NUMBERS[b]) return a === "40" ? "Deuce" : `${cap(NUMBERS[a])} all`;
    return `${cap(NUMBERS[a])} ${NUMBERS[b]}`;
  }
  for (const [re, phrase] of PHRASES) if (re.test(raw)) return phrase;
  return null;
}
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

// nome del file della clip per una frase: minuscole, parole separate da «-» («Ready? Play!» → ready-play)
export const clipName = (phrase) =>
  String(phrase || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
// clip disponibili (stessi nomi dei file in public/voce/)
export const UMPIRE_CLIPS = Object.freeze([
  "fifteen-love", "thirty-love", "forty-love", "love-fifteen", "love-thirty", "love-forty", "fifteen-thirty",
  "thirty-fifteen", "fifteen-forty", "forty-fifteen", "thirty-forty", "forty-thirty", "love-all", "fifteen-all",
  "thirty-all", "deuce", "advantage", "ready-play", "game-point", "break-point", "match-point", "game",
  "game-set-and-match", "out", "net", "ace", "nice-shot", "big-serve", "smash", "replay",
]);
export const CUE_CLIPS = Object.freeze({
  go: "cue-go", time: "cue-time-up", combo: "cue-combo", superCombo: "cue-super-combo", bullseye: "cue-bullseye",
  record: "cue-new-record", gold: "cue-gold-medal", silver: "cue-silver-medal", bronze: "cue-bronze-medal",
  last: "cue-last-ball", level: "cue-next-level", perfect: "cue-perfect",
});
export const PLAYER_CLIPS = Object.freeze({ effort: ["effort-1", "effort-2", "effort-3"], cheer: ["cheer"], groan: ["groan"] });

const STORAGE_KEY = "natpf.voice";
const readPref = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
};

// Sceglie la voce inglese migliore tra quelle del sistema (ripiego quando manca una clip): prima en-GB/en-US, poi le
// voci «naturali»/online.
export function pickEnglishVoice(voices = []) {
  const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang || ""));
  if (!en.length) return null;
  const score = (v) =>
    (/^en[-_](gb|us)$/i.test(v.lang) ? 4 : 0) + (/natural|neural|online|google/i.test(v.name) ? 2 : 0) + (v.default ? 1 : 0);
  return en.slice().sort((a, b) => score(b) - score(a))[0];
}

export class NatpfVoice {
  constructor({ synth = typeof window !== "undefined" ? window.speechSynthesis : null } = {}) {
    this.synth = synth || null;
    this.enabled = readPref();
    this.voice = null;
    this.volume = 0.9;
    this.lastSpoken = null;
    this.spokenCount = 0;
    this.clips = new Map(); // nome → AudioBuffer
    this.ctx = null;
    this.dest = null;
    this.base = "./voce/";
    this._current = null;
    this._loadVoices();
    if (this.synth && typeof this.synth.addEventListener === "function")
      this.synth.addEventListener("voiceschanged", () => this._loadVoices());
  }
  _loadVoices() {
    try {
      this.voice = pickEnglishVoice(this.synth ? this.synth.getVoices() : []);
    } catch {
      this.voice = null;
    }
  }
  get available() {
    return !!(this.synth && this.voice);
  }
  setEnabled(on) {
    this.enabled = !!on;
    try {
      localStorage.setItem(STORAGE_KEY, this.enabled ? "on" : "off");
    } catch {}
    if (!this.enabled) this.cancel();
    return this.enabled;
  }
  cancel() {
    try {
      this.synth && this.synth.cancel();
    } catch {}
    this._stopClip();
  }
  // Collega le clip registrate al contesto audio (bus delle voci) e le carica in sottofondo (≈410 kB in tutto).
  attach(ctx, dest, { base = this.base } = {}) {
    if (!ctx || this.ctx === ctx) return;
    this.ctx = ctx; this.dest = dest; this.base = base;
    if (typeof fetch !== "function") return;
    const names = [...UMPIRE_CLIPS, ...Object.values(CUE_CLIPS), ...Object.values(PLAYER_CLIPS).flat()];
    let i = 0;
    // pochi alla volta: non deve rallentare l'avvio del gioco
    const next = () => {
      const name = names[i++];
      if (!name) return;
      fetch(this.base + name + ".mp3")
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => this.clips.set(name, buf))
        .catch(() => {})
        .finally(next);
    };
    for (let k = 0; k < 4; k++) next();
  }
  _stopClip() {
    try {
      this._current && this._current.stop();
    } catch {}
    this._current = null;
  }
  // suona una clip; rate: velocità (cambia anche l'altezza), gain: livello relativo. true se suonata
  playClip(name, { interrupt = false, rate = 1, gain = 1 } = {}) {
    const buf = this.clips.get(name);
    if (!buf || !this.ctx || !this.dest) return false;
    try {
      if (interrupt) this._stopClip();
      const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
      src.buffer = buf; src.playbackRate.value = rate; g.gain.value = gain;
      src.connect(g).connect(this.dest);
      src.start();
      if (interrupt || !this._current) { this._current = src; src.onended = () => { if (this._current === src) this._current = null; }; }
      return true;
    } catch {
      return false;
    }
  }
  // annuncio dei minigiochi (CUE_CLIPS): solo con la clip, niente sintesi
  cue(id) {
    if (!this.enabled) return false;
    return this.playClip(CUE_CLIPS[id] || id, { interrupt: true });
  }
  // vocalizzazione del giocatore (sforzo, esultanza): pitch diverso per l'avversario, mai due insieme
  player(kind = "effort", { opponent = false } = {}) {
    if (!this.enabled) return false;
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (now - (this._lastPlayer || -9) < 0.35) return false;
    const list = PLAYER_CLIPS[kind] || [];
    const name = list[Math.floor(Math.random() * list.length)];
    const ok = !!name && this.playClip(name, { rate: (opponent ? 0.88 : 1) * (0.96 + Math.random() * 0.1), gain: 0.8 });
    if (ok) this._lastPlayer = now;
    return ok;
  }
  // Pronuncia l'annuncio; restituisce la frase detta, o null (voce spenta, annuncio sconosciuto, nessuna voce inglese).
  say(text, { interrupt = true } = {}) {
    const phrase = callout(text);
    if (!phrase || !this.enabled) return null;
    // clip registrata, se c'è
    if (this.playClip(clipName(phrase), { interrupt })) {
      this.lastSpoken = phrase;
      this.spokenCount += 1;
      return phrase;
    }
    if (!this.synth || typeof SpeechSynthesisUtterance === "undefined") return null;
    if (!this.voice) this._loadVoices();
    if (!this.voice) return null; // ripiego silenzioso
    try {
      if (interrupt) this.synth.cancel();
      const u = new SpeechSynthesisUtterance(phrase);
      u.voice = this.voice;
      u.lang = this.voice.lang || "en-GB";
      u.rate = 1.04;
      u.pitch = 1;
      u.volume = Math.max(0, Math.min(1, this.volume));
      this.synth.speak(u);
      this.lastSpoken = phrase;
      this.spokenCount += 1;
      return phrase;
    } catch {
      return null;
    }
  }
}
