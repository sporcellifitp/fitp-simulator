// Voce del giudice di sedia in italiano. Dal 28/10/2026 le frasi sono clip registrate (public/voce/, generate con
// ElevenLabs Eleven v4 tramite Higgsfield, vedi public/voce/LEGGIMI.txt) suonate con Web Audio sul bus delle voci;
// se una clip manca o non si carica si usa la sintesi vocale del browser (speechSynthesis), come prima.
// Il motore annuncia con le sue etichette («15 - 00», «Deuce», «Game Point», «Out»…) o con quelle italiane
// dell'HUD: italianCallout() le trasforma nella frase da dire. Se il browser non ha una voce italiana e manca la clip
// resta in silenzio (niente voce inglese di ripiego). La voce si spegne dal pulsante «Voce»; la scelta resta salvata.
// Oltre all'arbitro: annunci dei minigiochi (cue) e vocalizzazioni dei giocatori (effort, cheer).

const NUMBERS = { "00": "zero", 0: "zero", 15: "quindici", 30: "trenta", 40: "quaranta", ad: "vantaggio" };

const PHRASES = [
  [/^(start|match[ _]start|inizio partita|si gioca)$/, "Inizio partita"],
  [/^(deuce|parit[aà])$/, "Parità"],
  [/^(ad in|ad out|vantaggio.*)$/, "Vantaggio"],
  [/^(game[ _]point|palla game)$/, "Palla game"],
  [/^(break[ _]point|palla break)$/, "Palla break"],
  [/^(match[ _]point|palla match)$/, "Palla match"],
  [/^(game[ _]set[ _]and[ _]match|game[ _]set[ _]match|game, set e partita)$/, "Game, set e partita"],
  [/^(game|game[ _]won)$/, "Game"],
  [/^(out|call[ _]out|fuori)$/, "Fuori"],
  [/^(net|call[ _]net|rete)$/, "Rete"],
  [/^(ace)$/, "Ace"],
  [/^(nice shot|call[ _]nice[ _]shot|bel colpo)$/, "Bel colpo"],
  [/^(power serve|call[ _]power[ _]serve|gran servizio|servizio potente)$/, "Gran servizio"],
  [/^(smash|call[ _]power[ _]smash|schiacciata)$/, "Smash"],
  [/^(replay|call[ _]replay|moviola)$/, "Rivediamolo"],
];

// Etichetta del motore o dell'HUD → frase italiana da pronunciare (null se non è un annuncio noto).
export function italianCallout(text) {
  const raw = String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[!¡]/g, "")
    .replace(/\s+/g, " ");
  if (!raw) return null;
  const score = /^(00|0|15|30|40|ad)\s*[-–]\s*(00|0|15|30|40|ad)$/.exec(raw);
  if (score) {
    const [a, b] = [score[1], score[2]];
    if (a === b) return a === "40" ? "Parità" : `${NUMBERS[a]} pari`;
    if (a === "ad" || b === "ad") return "Vantaggio";
    return `${NUMBERS[a]} ${NUMBERS[b]}`;
  }
  for (const [re, phrase] of PHRASES) if (re.test(raw)) return phrase;
  return null;
}

// nome del file della clip per una frase: minuscole senza accenti, parole separate da «-» («Parità» → parita)
export const clipName = (phrase) =>
  String(phrase || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
// clip disponibili (stessi nomi dei file in public/voce/)
export const UMPIRE_CLIPS = Object.freeze([
  "quindici-zero", "trenta-zero", "quaranta-zero", "zero-quindici", "zero-trenta", "zero-quaranta", "quindici-trenta",
  "trenta-quindici", "quindici-quaranta", "quaranta-quindici", "trenta-quaranta", "quaranta-trenta", "zero-pari",
  "quindici-pari", "trenta-pari", "parita", "vantaggio", "inizio-partita", "palla-game", "palla-break", "palla-match",
  "game", "game-set-e-partita", "fuori", "rete", "ace", "bel-colpo", "gran-servizio", "smash", "rivediamolo",
]);
export const CUE_CLIPS = Object.freeze({
  go: "ann-tre-due-uno-via", time: "ann-tempo-scaduto", combo: "ann-combo", superCombo: "ann-super-combo",
  target: "ann-bersaglio", bullseye: "ann-centro-perfetto", record: "ann-nuovo-record", gold: "ann-medaglia-d-oro",
  silver: "ann-medaglia-d-argento", bronze: "ann-medaglia-di-bronzo", last: "ann-ultima-palla",
  level: "ann-livello-successivo", perfect: "ann-perfetto",
});
export const PLAYER_CLIPS = Object.freeze({ effort: ["sforzo-1", "sforzo-2", "sforzo-3"], cheer: ["esulta"], groan: ["delusione"] });

const STORAGE_KEY = "natpf.voice";
const readPref = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
};

// Sceglie la voce italiana migliore tra quelle del sistema: prima it-IT, poi le voci «naturali»/online.
export function pickItalianVoice(voices = []) {
  const it = voices.filter((v) => /^it([-_]|$)/i.test(v.lang || ""));
  if (!it.length) return null;
  const score = (v) =>
    (/^it[-_]it$/i.test(v.lang) ? 4 : 0) + (/natural|neural|online|google/i.test(v.name) ? 2 : 0) + (v.default ? 1 : 0);
  return it.slice().sort((a, b) => score(b) - score(a))[0];
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
      this.voice = pickItalianVoice(this.synth ? this.synth.getVoices() : []);
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
  // Collega le clip registrate al contesto audio (bus delle voci) e le carica in sottofondo (≈420 kB in tutto).
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
  // Pronuncia l'annuncio; restituisce la frase detta, o null (voce spenta, annuncio sconosciuto, nessuna voce italiana).
  say(text, { interrupt = true } = {}) {
    const phrase = italianCallout(text);
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
      u.lang = this.voice.lang || "it-IT";
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
