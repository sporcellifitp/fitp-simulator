// Voce del giudice di sedia in italiano con la sintesi vocale del browser (speechSynthesis), senza file audio.
// Il motore annuncia con le sue etichette («15 - 00», «Deuce», «Game Point», «Out»…) o con quelle italiane
// dell'HUD: italianCallout() le trasforma nella frase da dire. Se il browser non ha una voce italiana resta in
// silenzio (niente voce inglese di ripiego). La voce si spegne dal pulsante «Voce» dell'HUD; la scelta resta salvata.

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
  }
  // Pronuncia l'annuncio; restituisce la frase detta, o null (voce spenta, annuncio sconosciuto, nessuna voce italiana).
  say(text, { interrupt = true } = {}) {
    const phrase = italianCallout(text);
    if (!phrase || !this.enabled || !this.synth || typeof SpeechSynthesisUtterance === "undefined") return null;
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
