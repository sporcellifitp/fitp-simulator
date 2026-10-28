// Colonna sonora di NATPF Simulator: brani originali generati in tempo reale con Web Audio, senza file audio.
// Ogni brano è scritto qui sotto nota per nota (griglia di sedicesimi, 16 passi per battuta): accordi, linea di
// basso, arpeggio, melodia e batteria. Un sequencer con look-ahead programma le note poco prima che suonino,
// quindi i loop girano senza stacchi e i cambi di brano avvengono con una dissolvenza breve.
//
// Notazione delle parti melodiche: un token per passo, «C5» suona la nota, «-» la tiene, «.» è una pausa.
// Basso: «R» fondamentale, «O» ottava sopra, «F» quinta, «T» terza, «-» tiene, «.» pausa (dall'accordo della battuta).
// Arpeggio: indice della nota dell'accordo (0…3, «+» un'ottava sopra), «.» pausa.
// Batteria: «x» colpo, «o» colpo accentato, «.» niente.

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CHORD_SHAPES = {
  "": [0, 4, 7, 12],
  m: [0, 3, 7, 12],
  7: [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  sus4: [0, 5, 7, 12],
  add9: [0, 4, 7, 14],
};

export function noteToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(String(name));
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}
export const midiToFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// «Bbmaj7» → { root: 10, tones: [0, 4, 7, 11] }
export function parseChord(symbol) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(String(symbol));
  if (!m || !(m[3] in CHORD_SHAPES)) return null;
  const root = (NOTE_INDEX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
  return { root, tones: CHORD_SHAPES[m[3]] };
}

const bars = (...rows) => rows.map((r) => r.trim().split(/\s+/));

// ---------------------------------------------------------------------------------------------------------------
// Brani. bpm, accordi (uno per battuta), parti. loopFrom: battuta da cui riprende il loop (null = non ripete e passa
// al brano «next»). volume: livello del brano prima del volume musica dell'HUD.
export const NATPF_TRACKS = {
  menu_theme: {
    id: "menu_theme",
    title: "Notte a Torino",
    subtitle: "Lobby e menu",
    bpm: 112,
    volume: 0.5,
    loopFrom: 0,
    swing: 0.08,
    chords: ["Fmaj7", "Am7", "Bbmaj7", "C7", "Dm7", "Bbmaj7", "Gm7", "C7"],
    lead: {
      voice: "pluckLead",
      octave: 0,
      bars: bars(
        "A4 - C5 - . F5 - E5 C5 - - . A4 - G4 -",
        "E4 - - . G4 - A4 - C5 - - - . . . .",
        "D5 - C5 - Bb4 - A4 - . F4 - G4 A4 - - .",
        "G4 - - - E4 - G4 - Bb4 - A4 - G4 - - .",
        "F5 - E5 - D5 - A4 - . C5 - D5 - - . .",
        "F5 - - . D5 - F5 - G5 - F5 - D5 - - .",
        "Bb4 - D5 - F5 - - . E5 - D5 - C5 - Bb4 -",
        "A4 - - - G4 - - - E4 - - - . . . .",
      ),
    },
    bass: { octave: 2, pattern: "R - . O . R F . R - . O . T F O" },
    arp: { octave: 4, pattern: ". . 0 . 1 . 2 . . . 1 . 2 . 3 .", voice: "bell" },
    pad: { octave: 3, level: 0.5 },
    drums: {
      kick: "x . . . . . . . x . x . . . . .",
      clap: ". . . . x . . . . . . . x . . .",
      hat: ". . x . . . x . . . x . . . x .",
      shaker: "x x x x x x x x x x x x x x x x",
    },
  },
  court_intro: {
    id: "court_intro",
    title: "Ingresso in campo",
    subtitle: "Presentazione dei giocatori",
    bpm: 128,
    volume: 0.56,
    loopFrom: null,
    next: "match_rally",
    chords: ["D", "G", "A7", "D"],
    lead: {
      voice: "brass",
      octave: 0,
      bars: bars(
        "D5 - - - . . A4 D5 F#5 - - - . . . .",
        "G5 - - - . . F#5 E5 D5 - - - B4 - - -",
        "C#5 - - - E5 - - - A5 - - - G5 - F#5 E5",
        "D5 - - - - - - - - - - - . . . .",
      ),
    },
    bass: { octave: 2, pattern: "R - - - . . . R R - - - . . R O" },
    pad: { octave: 3, level: 0.75 },
    drums: [
      { kick: "o . . . . . . . o . . . . . . .", tom: ". . . . . . x x . . . . . . x x", crash: "x . . . . . . . . . . . . . . ." },
      { kick: "o . . . . . . . o . . . . . . .", tom: ". . . . . . x x . . . . . x x x" },
      { kick: "o . . . o . . . o . . . o . . .", snare: "x . x . x . x . x x x x x x x x" },
      { kick: "o . . . . . . . . . . . . . . .", crash: "x . . . . . . . . . . . . . . ." },
    ],
  },
  match_rally: {
    id: "match_rally",
    title: "Scambio a tutto campo",
    subtitle: "Musica della partita",
    bpm: 134,
    volume: 0.4,
    loopFrom: 0,
    chords: ["Bb", "Gm", "Eb", "F", "Bb", "Dm", "Eb", "F"],
    lead: {
      voice: "squareLead",
      octave: 0,
      bars: bars(
        "F5 - D5 - Bb4 - D5 F5 - . G5 - F5 - D5 -",
        "G5 - - . F5 - D5 - Bb4 - - . C5 - D5 -",
        "Eb5 - G5 - Bb5 - - . G5 - F5 - Eb5 - - .",
        "F5 - - - C5 - - . A4 - C5 - Eb5 - D5 C5",
        "D5 - F5 - Bb5 - A5 - G5 - F5 - D5 - F5 -",
        "A5 - - . F5 - D5 - A4 - D5 - F5 - A5 -",
        "G5 - - - Bb5 - G5 - Eb5 - - . F5 - G5 -",
        "A5 - - - - . G5 - F5 - - - C5 - . .",
      ),
    },
    bass: { octave: 2, pattern: "R - R - O - R - . R F - O - R -" },
    arp: { octave: 4, pattern: "0 1 2 + 0 1 2 + 0 1 2 + 0 1 2 +", voice: "pluck" },
    pad: { octave: 3, level: 0.35 },
    drums: {
      kick: "x . . . x . . . x . . . x . x .",
      clap: ". . . . x . . . . . . . x . . .",
      hat: "x . x . x . x . x . x . x . x .",
      openhat: ". . o . . . o . . . o . . . o .",
    },
  },
  game_point: {
    id: "game_point",
    arrange: false,
    title: "Punto decisivo",
    subtitle: "Palla game, break o match",
    bpm: 134,
    volume: 0.42,
    loopFrom: 0,
    riser: true,
    chords: ["Cm", "Ab", "Eb", "Bb"],
    lead: {
      voice: "squareLead",
      octave: 0,
      bars: bars(
        "G5 - - - - - - - Ab5 - - - G5 - - -",
        "Eb5 - - - - - - - C5 - - - Eb5 - F5 -",
        "G5 - - - Bb5 - - - G5 - - - Eb5 - - -",
        "F5 - - - - - - - D5 - - - Bb4 - D5 -",
      ),
    },
    bass: { octave: 2, pattern: "R R R R R R R R R R R R R R O O" },
    arp: { octave: 5, pattern: "0 . 2 . 0 . 2 . 0 . 2 . 0 . 3 .", voice: "pluck" },
    pad: { octave: 3, level: 0.55 },
    drums: {
      kick: "x . . . x . . . x . . . x . . .",
      clap: ". . . . x . . . . . . . x . . x",
      hat: "x x x x x x x x x x x x x x x x",
      tick: "x . x . x . x . x . x . x . x .",
    },
  },
  victory_fanfare: {
    id: "victory_fanfare",
    arrange: false,
    title: "Gloria al Pala",
    subtitle: "Vittoria",
    bpm: 120,
    volume: 0.52,
    loopFrom: 2,
    chords: ["C", "G", "C", "Am", "F", "G", "C", "Em", "F", "G"],
    lead: {
      voice: "brass",
      octave: 0,
      bars: bars(
        "C5 . C5 . C5 - E5 - G5 - - - E5 - G5 -",
        "C6 - - - - - - - B5 - - - D6 - - -",
        "E5 - G5 - C6 - - . B5 - A5 - G5 - - .",
        "A5 - - . E5 - A5 - C6 - B5 - A5 - - .",
        "F5 - A5 - C6 - - . A5 - G5 - F5 - - .",
        "G5 - - - D5 - G5 - B5 - - - . . . .",
        "C6 - B5 - A5 - G5 - E5 - G5 - C6 - - .",
        "B5 - - . G5 - E5 - G5 - B5 - - . . .",
        "A5 - C6 - F6 - - . E6 - D6 - C6 - A5 -",
        "B5 - - - D6 - - - C6 - - - - - . .",
      ),
    },
    bass: { octave: 2, pattern: "R - . R O - . R R - . R F - O -" },
    arp: { octave: 5, pattern: "0 2 1 + 0 2 1 + 0 2 1 + 0 2 1 +", voice: "bell" },
    pad: { octave: 3, level: 0.5 },
    drums: [
      { kick: "o . . . . . . . o . . . . . . .", snare: ". . . . . . . . x . x . x x x x", crash: "x . . . . . . . . . . . . . . ." },
      { kick: "o . . . . . . . . . . . . . . .", tom: ". . . . . . . . x . x . x x x x", crash: "x . . . . . . . . . . . . . . ." },
      {
        kick: "x . . . x . . . x . . . x . . .",
        clap: ". . . . x . . . . . . . x . . .",
        hat: ". . x . . . x . . . x . . . x .",
        shaker: "x x x x x x x x x x x x x x x x",
      },
    ],
  },
  replay: {
    id: "replay",
    arrange: false,
    title: "Moviola",
    subtitle: "Replay",
    bpm: 92,
    volume: 0.44,
    loopFrom: 0,
    swing: 0.16,
    chords: ["Ebmaj7", "Cm7", "Abmaj7", "Bb7"],
    lead: {
      voice: "softLead",
      octave: 0,
      bars: bars(
        "G5 - - - Bb5 - - - D6 - - - Bb5 - - -",
        "C6 - - - - - Bb5 - G5 - - - Eb5 - - -",
        "Eb5 - - - G5 - C6 - - - Bb5 - - - . .",
        "D5 - - - F5 - - - Ab5 - - - G5 - F5 -",
      ),
    },
    bass: { octave: 2, pattern: "R - - - . . . F R - - - . . T -" },
    arp: { octave: 4, pattern: "0 . . 1 . . 2 . 3 . . 2 . . 1 .", voice: "bell" },
    pad: { octave: 3, level: 0.6 },
    drums: {
      kick: "x . . . . . . . x . x . . . . .",
      snare: ". . . . . . . . x . . . . . . .",
      hat: "x . x . x . x . x . x . x . x .",
    },
  },
  // --- brani aggiunti il 19/10 (prima ogni schermata aveva un solo brano che si ripeteva) ---
  menu_lounge: {
    id: "menu_lounge",
    title: "Luci sul Po",
    subtitle: "Lobby e menu",
    bpm: 98,
    volume: 0.5,
    loopFrom: 0,
    swing: 0.12,
    chords: ["Dm7", "G7", "Cmaj7", "Am7", "Dm7", "G7", "Em7", "A7"],
    lead: {
      voice: "softLead",
      octave: 0,
      bars: bars(
        "F5 - - . E5 - D5 - A4 - - . C5 - D5 -",
        "B4 - - - G4 - - . D5 - - . F5 - E5 -",
        "E5 - - - G5 - - . B5 - A5 - G5 - E5 -",
        "C5 - - . A4 - - - . . E5 - D5 - C5 -",
        "D5 - F5 - A5 - - . G5 - F5 - E5 - D5 -",
        "F5 - - - D5 - B4 - G4 - - . . . B4 -",
        "G5 - - . E5 - - . B4 - D5 - E5 - G5 -",
        "C#5 - - - E5 - - - A4 - - - . . . .",
      ),
    },
    bass: { octave: 2, pattern: "R - - . . . R . F - . . O . . ." },
    arp: { octave: 4, pattern: ". . 0 . . . 2 . . . 1 . . . 3 .", voice: "bell" },
    pad: { octave: 3, level: 0.55 },
    drums: {
      kick: "x . . . . . . . x . . . . . . .",
      clap: ". . . . x . . . . . . . x . . .",
      hat: "x . x . x . x . x . x . x . x .",
    },
  },
  menu_palazzetto: {
    id: "menu_palazzetto",
    title: "Palazzetto di notte",
    subtitle: "Lobby e menu",
    bpm: 118,
    volume: 0.48,
    loopFrom: 0,
    swing: 0.04,
    chords: ["Am", "F", "C", "G", "Am", "F", "Dm7", "E7"],
    lead: {
      voice: "pluckLead",
      octave: 0,
      bars: bars(
        "E5 - A5 - . E5 - C5 - - . B4 - C5 - .",
        "A4 - - - C5 - F5 - - . E5 - C5 - A4 -",
        "G4 - - . C5 - E5 - G5 - - - . . . .",
        "B4 - D5 - G5 - - . F5 - D5 - B4 - - .",
        "C5 - E5 - A5 - - . G5 - E5 - C5 - - .",
        "A5 - - - G5 - F5 - E5 - - . C5 - - .",
        "D5 - F5 - A5 - C6 - - . A5 - F5 - D5 -",
        "G#5 - - - E5 - - - B4 - - - . . . .",
      ),
    },
    bass: { octave: 2, pattern: "R - . R . . O . R - . R . F O ." },
    arp: { octave: 4, pattern: "0 . 1 . 2 . 1 . 0 . 1 . 2 . 3 .", voice: "pluck" },
    pad: { octave: 3, level: 0.45 },
    drums: {
      kick: "x . . . x . . . x . . . x . . .",
      clap: ". . . . x . . . . . . . x . . .",
      hat: ". . x . . . x . . . x . . . x .",
      shaker: "x x x x x x x x x x x x x x x x",
    },
  },
  rally_baseline: {
    id: "rally_baseline",
    title: "Ritmo da fondo campo",
    subtitle: "Musica della partita",
    bpm: 140,
    volume: 0.38,
    loopFrom: 0,
    chords: ["Em", "C", "G", "D", "Em", "C", "Am", "B7"],
    lead: {
      voice: "squareLead",
      octave: 0,
      bars: bars(
        "E5 - G5 - B5 - G5 - E5 - - . D5 - E5 -",
        "G5 - - . E5 - C5 - G4 - C5 - E5 - G5 -",
        "B5 - - . G5 - D5 - B4 - D5 - G5 - - .",
        "A5 - - - F#5 - D5 - A4 - - . D5 - F#5 -",
        "G5 - B5 - E6 - - . D6 - B5 - G5 - E5 -",
        "E5 - G5 - C6 - - . B5 - G5 - E5 - - .",
        "C6 - - . A5 - E5 - C5 - E5 - A5 - - .",
        "D#5 - - - F#5 - - - A5 - - - B5 - . .",
      ),
    },
    bass: { octave: 2, pattern: "R - R . O - R . R - R . O - F -" },
    arp: { octave: 4, pattern: "0 2 1 2 0 2 1 2 0 2 1 2 0 2 3 2", voice: "pluck" },
    pad: { octave: 3, level: 0.3 },
    drums: {
      kick: "x . . x x . . . x . . x x . . .",
      clap: ". . . . x . . . . . . . x . . .",
      hat: "x x x x x x x x x x x x x x x x",
      openhat: ". . o . . . o . . . o . . . o .",
    },
  },
  rally_volley: {
    id: "rally_volley",
    title: "Serve and volley",
    subtitle: "Musica della partita",
    bpm: 128,
    volume: 0.4,
    loopFrom: 0,
    swing: 0.05,
    chords: ["F", "C", "Dm", "Bb", "F", "C", "Bb", "C"],
    lead: {
      voice: "pluckLead",
      octave: 0,
      bars: bars(
        "C5 - F5 - A5 - - . G5 - F5 - C5 - - .",
        "E5 - - . G5 - C6 - - . Bb5 - A5 - G5 -",
        "F5 - - - A5 - D6 - - . C6 - A5 - F5 -",
        "D5 - F5 - Bb5 - - . A5 - G5 - F5 - D5 -",
        "A5 - - . C6 - A5 - F5 - - . G5 - A5 -",
        "G5 - - - E5 - C5 - E5 - G5 - - . . .",
        "F5 - - . D5 - Bb4 - D5 - F5 - Bb5 - - .",
        "A5 - - - G5 - - - E5 - - - C5 - . .",
      ),
    },
    bass: { octave: 2, pattern: "R - . R O - . R R - . R F - O -" },
    arp: { octave: 4, pattern: "0 1 2 + 2 1 0 1 0 1 2 + 2 1 0 1", voice: "pluck" },
    pad: { octave: 3, level: 0.35 },
    drums: {
      kick: "x . . . x . . . x . . . x . . x",
      snare: ". . . . x . . . . . . . x . x .",
      hat: "x . x x x . x x x . x x x . x x",
    },
  },
  game_point_tension: {
    id: "game_point_tension",
    arrange: false,
    title: "Palla break",
    subtitle: "Palla game, break o match",
    bpm: 128,
    volume: 0.42,
    loopFrom: 0,
    riser: true,
    chords: ["Am", "F", "Dm", "E7"],
    lead: {
      voice: "squareLead",
      octave: 0,
      bars: bars(
        "A5 - - - - - - - G5 - - - E5 - - -",
        "F5 - - - - - - - E5 - - - C5 - D5 -",
        "D5 - - - F5 - - - A5 - - - F5 - - -",
        "E5 - - - G#5 - - - B5 - - - - - . .",
      ),
    },
    bass: { octave: 2, pattern: "R R R R R R R R R R R R O O O O" },
    arp: { octave: 5, pattern: "0 . 1 . 2 . 1 . 0 . 1 . 2 . 3 .", voice: "pluck" },
    pad: { octave: 3, level: 0.55 },
    drums: {
      kick: "x . . . x . . . x . . . x . x .",
      clap: ". . . . x . . . . . . . x . . x",
      hat: "x x x x x x x x x x x x x x x x",
      tick: "x . x . x . x . x . x . x . x .",
    },
  },
  victory_parade: {
    id: "victory_parade",
    arrange: false,
    title: "Festa sul Po",
    subtitle: "Vittoria",
    bpm: 126,
    volume: 0.5,
    loopFrom: 0,
    chords: ["G", "D", "Em", "C", "G", "D", "C", "D"],
    lead: {
      voice: "brass",
      octave: 0,
      bars: bars(
        "G5 - - . B5 - D6 - - . B5 - G5 - - .",
        "F#5 - - . A5 - D6 - - . A5 - F#5 - - .",
        "E5 - G5 - B5 - - . G5 - E5 - G5 - B5 -",
        "C6 - - - B5 - A5 - G5 - - - . . . .",
        "D6 - - . B5 - G5 - B5 - D6 - G6 - - .",
        "F#5 - - . A5 - D6 - A5 - F#5 - D5 - - .",
        "E5 - G5 - C6 - - . B5 - A5 - G5 - E5 -",
        "F#5 - - - A5 - - - D6 - - - . . . .",
      ),
    },
    bass: { octave: 2, pattern: "R - . R O - . R R - . R F - O -" },
    arp: { octave: 5, pattern: "0 2 1 + 0 2 1 + 0 2 1 + 0 2 1 +", voice: "bell" },
    pad: { octave: 3, level: 0.5 },
    drums: {
      kick: "x . . . x . . . x . . . x . . .",
      clap: ". . . . x . . . . . . . x . . .",
      hat: ". . x . . . x . . . x . . . x .",
      shaker: "x x x x x x x x x x x x x x x x",
    },
  },
  // ---------- brani del 28/10/2026 ----------
  // Tutorial: house leggera e luminosa, mai invadente (si ascoltano le istruzioni)
  tutorial_flow: {
    id: "tutorial_flow",
    title: "Campo d'allenamento",
    subtitle: "Tutorial",
    bpm: 102,
    volume: 0.42,
    loopFrom: 0,
    swing: 0.1,
    chords: ["Dmaj7", "Bm7", "Gmaj7", "A", "Dmaj7", "F#m7", "Gmaj7", "Asus4"],
    lead: {
      voice: "softLead",
      octave: 0,
      bars: bars(
        "F#5 - - . A5 - F#5 - E5 - - . D5 - - .",
        "D5 - - . F#5 - D5 - C#5 - B4 - - . . .",
        "B4 - D5 - F#5 - - . E5 - D5 - B4 - - .",
        "C#5 - - - E5 - - . A4 - - - . . . .",
        "F#5 - A5 - D6 - - . C#6 - A5 - F#5 - - .",
        "E5 - F#5 - A5 - - . C#6 - - . A5 - - .",
        "B5 - A5 - F#5 - D5 - E5 - F#5 - G5 - - .",
        "A5 - - - - - . . E5 - - - D5 - - .",
      ),
    },
    bass: { octave: 2, pattern: "R - . . . . R . R - . . . O . ." },
    arp: { octave: 4, pattern: "0 . 2 . 1 . 3 . 0 . 2 . + . 3 .", voice: "bell" },
    pad: { octave: 3, level: 0.55 },
    drums: {
      kick: "x . . . x . . . x . . . x . . .",
      clap: ". . . . x . . . . . . . x . . .",
      hat: ". . x . . . x . . . x . . . x .",
      shaker: "x x x x x x x x x x x x x x x x",
    },
  },
  // Tutorial: seconda variante, più morbida e in minore, alternata a «Campo d'allenamento»
  tutorial_drift: {
    id: "tutorial_drift",
    title: "Palleggio lento",
    subtitle: "Tutorial",
    bpm: 96,
    volume: 0.42,
    loopFrom: 0,
    swing: 0.12,
    chords: ["Am7", "Fmaj7", "Cmaj7", "G", "Am7", "Dm7", "Fmaj7", "Esus4"],
    lead: {
      voice: "softLead",
      octave: 0,
      bars: bars(
        "E5 - - . C5 - E5 - G5 - - . E5 - - .",
        "A5 - - . F5 - C5 - E5 - - . . . . .",
        "G5 - E5 - C5 - - . D5 - E5 - G5 - - .",
        "B4 - - - D5 - - . G5 - - - . . . .",
        "C6 - - . A5 - E5 - G5 - - . E5 - - .",
        "F5 - - . A5 - D5 - F5 - - . A5 - - .",
        "C6 - A5 - F5 - C5 - E5 - F5 - A5 - - .",
        "B5 - - - A5 - - . E5 - - - . . . .",
      ),
    },
    bass: { octave: 2, pattern: "R - - . . . F . R - . . O . . ." },
    arp: { octave: 4, pattern: ". 0 . 2 . 1 . 3 . 0 . 2 . + . 1", voice: "bell" },
    pad: { octave: 3, level: 0.6 },
    drums: {
      kick: "x . . . . . . . x . . x . . . .",
      clap: ". . . . x . . . . . . . x . . .",
      shaker: "x . x x x . x x x . x x x . x x",
    },
  },
  // Minigiochi: arcade a 150 bpm, cassa dritta, arpeggio in sedicesimi e melodia squadrata
  arcade_rush: {
    id: "arcade_rush",
    title: "Corsa ai bersagli",
    subtitle: "Minigiochi",
    bpm: 150,
    volume: 0.38,
    loopFrom: 0,
    chords: ["Am", "F", "C", "G", "Am", "F", "G", "E"],
    lead: {
      voice: "squareLead",
      octave: 0,
      bars: bars(
        "A5 - E5 - A5 - C6 - B5 - A5 - E5 - - .",
        "F5 - A5 - C6 - - . A5 - F5 - A5 - - .",
        "G5 - E5 - C5 - E5 - G5 - - . C6 - B5 -",
        "B5 - - - G5 - D5 - G5 - B5 - D6 - - .",
        "C6 - B5 - A5 - E5 - A5 - C6 - E6 - - .",
        "F6 - E6 - C6 - A5 - F5 - A5 - C6 - - .",
        "D6 - - . B5 - G5 - D6 - - . G6 - - .",
        "G#5 - - - B5 - - - E6 - - - . . . .",
      ),
    },
    bass: { octave: 2, pattern: "R . O . R . O . R . O . R . O F" },
    arp: { octave: 4, pattern: "0 1 2 + 2 1 0 1 2 + 2 1 0 1 2 +", voice: "pluck" },
    pad: { octave: 3, level: 0.35 },
    drums: {
      kick: "o . . . x . . . o . . . x . . .",
      clap: ". . . . x . . . . . . . x . . .",
      hat: ". . x . . . x . . . x . . . x x",
      tick: "x . x . x . x . x . x . x . x .",
    },
  },
  // Minigiochi: break più funky con fiati, alternato a «Corsa ai bersagli»
  arcade_combo: {
    id: "arcade_combo",
    title: "Combo Torino",
    subtitle: "Minigiochi",
    bpm: 140,
    volume: 0.4,
    loopFrom: 0,
    swing: 0.05,
    chords: ["Em", "C", "G", "D", "Em", "C", "Am", "B7"],
    lead: {
      voice: "brass",
      octave: 0,
      bars: bars(
        "E5 - . E5 . G5 - . B5 - - . A5 - G5 .",
        "E5 - - . . . C5 - E5 - G5 - E5 - - .",
        "D5 - . D5 . G5 - . B5 - D6 - B5 - - .",
        "A5 - - - F#5 - - . D5 - F#5 - A5 - - .",
        "B5 - . B5 . A5 - . G5 - E5 - G5 - B5 -",
        "C6 - - . B5 - - . G5 - - . E5 - - .",
        "A5 - . A5 . C6 - . E6 - - . C6 - A5 .",
        "B5 - - - D#6 - - - F#6 - - - . . . .",
      ),
    },
    bass: { octave: 2, pattern: "R . . R . . O . R . F . O . R ." },
    arp: { octave: 4, pattern: ". . 0 . . . 2 . . . 1 . . . 3 .", voice: "pluck" },
    pad: { octave: 3, level: 0.4 },
    drums: {
      kick: "o . . x . . x . . . x . . . . .",
      snare: ". . . . x . . . . . . . x . . x",
      hat: "x . x x x . x . x . x x x . x .",
      openhat: ". . . . . . . x . . . . . . . .",
    },
  },
  // Partita: nuovo brano notturno e incalzante, entra nella rotazione dello scambio
  match_night: {
    id: "match_night",
    title: "Finale al Pala",
    subtitle: "Musica della partita",
    bpm: 138,
    volume: 0.38,
    loopFrom: 0,
    chords: ["C#m", "A", "E", "B", "C#m", "A", "F#m", "G#7"],
    lead: {
      voice: "pluckLead",
      octave: 0,
      bars: bars(
        "G#5 - E5 - C#5 - E5 - G#5 - - . F#5 - E5 -",
        "E5 - C#5 - A4 - C#5 - E5 - - . A5 - - .",
        "G#5 - - . B5 - G#5 - E5 - - . F#5 - G#5 -",
        "F#5 - - - D#5 - - . B4 - D#5 - F#5 - - .",
        "C#6 - - . B5 - G#5 - E5 - G#5 - C#6 - E6 -",
        "C#6 - - . A5 - E5 - C#5 - E5 - A5 - - .",
        "A5 - G#5 - F#5 - C#5 - F#5 - A5 - C#6 - - .",
        "C6 - - - B5 - - - G#5 - - - . . . .",
      ),
    },
    bass: { octave: 2, pattern: "R . R . O . R . R . R . O . F ." },
    arp: { octave: 4, pattern: "0 . 1 . 2 . 1 . 0 . 1 . 2 . 3 .", voice: "pluck" },
    pad: { octave: 3, level: 0.45 },
    drums: {
      kick: "o . . . x . . . o . x . x . . .",
      snare: ". . . . x . . . . . . . x . . .",
      hat: "x . x . x . x . x . x . x . x x",
      tom: ". . . . . . . . . . . . . . . .",
    },
  },
};

// Stato del gioco → brano (stessi nomi di stato che usa il motore base)
const STATE_TO_TRACK = {
  training: "tutorial_flow",
  tutorial: "tutorial_flow",
  minigame: "arcade_rush",
  arcade: "arcade_rush",
  title: "menu_theme",
  menu: "menu_theme",
  lobby: "menu_theme",
  select: "menu_theme",
  intro: "court_intro",
  court_intro: "court_intro",
  flyover: "court_intro",
  start: "court_intro",
  serve: "match_rally",
  serve_wait: "match_rally",
  serve_toss: "match_rally",
  rally: "match_rally",
  playing: "match_rally",
  match: "match_rally",
  point: "match_rally",
  gamepoint: "game_point",
  game_point: "game_point",
  breakpoint: "game_point",
  matchpoint: "game_point",
  replay: "replay",
  victory: "victory_fanfare",
  win: "victory_fanfare",
  game_won: "victory_fanfare",
  match_over: "victory_fanfare",
  celebration: "victory_fanfare",
};
for (const id of Object.keys(NATPF_TRACKS)) STATE_TO_TRACK[id] = id;
export const trackForState = (state) => STATE_TO_TRACK[String(state || "rally").toLowerCase().trim()] || "match_rally";

// Gruppi di brani per schermata: entrando in una schermata si prende il brano successivo del gruppo (mai quello appena
// suonato) e durante il menu e lo scambio si passa al successivo dopo `rotate` giri, alla fine del giro e in
// dissolvenza. Prima ogni schermata aveva un solo brano che si ripeteva per tutta la sessione.
export const TRACK_GROUPS = {
  menu_theme: { tracks: ["menu_theme", "menu_lounge", "menu_palazzetto"], rotate: 4 },
  match_rally: { tracks: ["match_night", "match_rally", "rally_baseline", "rally_volley"], rotate: 4 },
  tutorial_flow: { tracks: ["tutorial_flow", "tutorial_drift"], rotate: 4 },
  arcade_rush: { tracks: ["arcade_rush", "arcade_combo"], rotate: 4 },
  game_point: { tracks: ["game_point", "game_point_tension"], rotate: 0 },
  victory_fanfare: { tracks: ["victory_fanfare", "victory_parade"], rotate: 0 },
};
const GROUP_OF = {};
for (const [head, g] of Object.entries(TRACK_GROUPS)) for (const id of g.tracks) GROUP_OF[id] = head;
export const groupOf = (id) => GROUP_OF[id] || id;

// Arrangiamento a ogni giro dei brani in loop (28/10): prima un brano di 8 battute si ripeteva identico, ora ogni
// giro cambia strumentazione come una canzone vera. intro: senza melodia né battimani; full: tutto; break: senza
// cassa né basso, con la salita di rumore alla fine; lift: tutto, piatti aperti e crash. Ogni passaggio ha il
// rullante di raccordo nell'ultima mezza battuta. arrange: false per i brani brevi (ingresso, punti decisivi, vittoria).
export const ARRANGEMENT = Object.freeze([
  { name: "intro", lead: false, kick: true, bass: true, clap: false, lift: false, riser: false },
  { name: "full", lead: true, kick: true, bass: true, clap: true, lift: false, riser: false },
  { name: "break", lead: true, kick: false, bass: false, clap: false, lift: false, riser: true },
  { name: "lift", lead: true, kick: true, bass: true, clap: true, lift: true, riser: false },
]);
export const arrangementFor = (track, pass) =>
  !track || track.arrange === false || track.loopFrom === null ? ARRANGEMENT[1] : ARRANGEMENT[pass % ARRANGEMENT.length];
const ROTATE_FADE_S = 1.6;   // dissolvenza incrociata tra un brano e l'altro della stessa schermata
const LAST_KEY = "natpf.music.last";

// Brani della partita: se arrivano mentre suona l'ingresso in campo, aspettano che finisca.
const MATCH_TRACKS = new Set(["match_rally", "game_point"]);

const STEPS = 16;
const LOOKAHEAD_S = 0.14;
const LOOKAHEAD_HIDDEN_S = 1.3; // a scheda nascosta i timer rallentano: si programma più avanti
const FADE_S = 0.45;

export class NatpfMusic {
  constructor(ctx, destination, { noise = null } = {}) {
    this.ctx = ctx;
    this.noise = noise;
    this.out = ctx.createGain();
    this.out.gain.value = 1;
    this.out.connect(destination);
    // eco a tempo per melodia e campanelli
    this.echo = ctx.createDelay(1.5);
    this.echoFb = ctx.createGain();
    this.echoFb.gain.value = 0.28;
    this.echoTone = ctx.createBiquadFilter();
    this.echoTone.type = "lowpass";
    this.echoTone.frequency.value = 2600;
    this.echoOut = ctx.createGain();
    this.echoOut.gain.value = 0.32;
    this.echo.connect(this.echoTone).connect(this.echoFb).connect(this.echo);
    this.echoTone.connect(this.echoOut).connect(this.out);
    this.track = null;
    this.bus = null;
    this.step = 0;
    this.nextTime = 0;
    this.pendingNext = null;
    this.timer = null;
    this.volume = 1;
    this.scheduledNotes = 0;
    this.onSwitch = null; // chiamato quando un brano passa da solo al successivo (ingresso in campo → scambio, rotazione)
    this.rotation = {}; // per gruppo: indice del prossimo brano
    this.lastInGroup = {}; // per gruppo: ultimo brano suonato
    this.loops = 0; // giri completi del brano corrente (anche l'arrangiamento dipende da questo)
    // ordine diverso a ogni sessione, e mai lo stesso brano dell'ultima volta in apertura
    try {
      Object.assign(this.lastInGroup, JSON.parse(localStorage.getItem(LAST_KEY) || "{}"));
    } catch {}
    for (const [head, g] of Object.entries(TRACK_GROUPS)) this.rotation[head] = Math.floor(Math.random() * g.tracks.length);
  }

  // Prossimo brano del gruppo di «id» (un brano del gruppo chiesto per nome vale così com'è, se non è la testa):
  // a rotazione, mai lo stesso appena suonato. La prima volta parte dalla testa del gruppo.
  _pick(id) {
    const head = groupOf(id),
      g = TRACK_GROUPS[head];
    if (!g || id !== head) return NATPF_TRACKS[id];
    const n = g.tracks.length;
    let i = this.rotation[head] ?? 0;
    if (n > 1 && g.tracks[i % n] === this.lastInGroup[head]) i += 1;
    this.rotation[head] = (i + 1) % n;
    return NATPF_TRACKS[g.tracks[i % n]];
  }

  get playing() {
    return !!this.timer;
  }
  get currentId() {
    return this.track ? this.track.id : null;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, Number(v)));
    if (this.bus && this.track) this.bus.gain.setTargetAtTime(this.track.volume * this.volume, this.ctx.currentTime, 0.05);
  }

  // Avvia (o cambia) brano. Un brano della partita richiesto durante l'ingresso in campo parte quando questo finisce.
  play(id, { restart = false } = {}) {
    if (!NATPF_TRACKS[id]) return;
    if (!restart && this.track && this.track.loopFrom === null && this.playing && MATCH_TRACKS.has(groupOf(id))) {
      this.pendingNext = id;
      return;
    }
    // stessa schermata (stesso gruppo): il brano che suona continua
    if (!restart && this.track && this.playing && (this.track.id === id || (id === groupOf(id) && groupOf(this.track.id) === id))) return;
    const track = this._pick(id);
    this._switch(track, { fade: true });
    this.pendingNext = null;
    this._startTimer();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.bus) this._fadeOutBus(this.bus, this.ctx.currentTime);
    this.bus = null;
  }

  // Riprende il brano corrente dall'inizio della sua parte in loop (dopo un mute).
  resume() {
    if (!this.track || this.playing) return;
    this._switch(this.track, { fade: true, fromLoop: true });
    this._startTimer();
  }

  _startTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => this._tick(), 25);
    this._tick();
  }

  _switch(track, { fade = true, fromLoop = false, at = null, fadeS = FADE_S } = {}) {
    const ctx = this.ctx,
      t0 = at ?? ctx.currentTime + 0.04;
    if (this.bus) this._fadeOutBus(this.bus, fade ? t0 : t0 + 1.2, fadeS);
    const bus = ctx.createGain();
    const target = track.volume * this.volume;
    if (fade) {
      bus.gain.setValueAtTime(0.0001, t0);
      bus.gain.exponentialRampToValueAtTime(Math.max(0.0002, target), t0 + fadeS);
    } else bus.gain.setValueAtTime(target, t0);
    bus.connect(this.out);
    this.bus = bus;
    this.track = track;
    this.loops = 0;
    this.lastInGroup[groupOf(track.id)] = track.id;
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(this.lastInGroup));
    } catch {}
    this.step = fromLoop && track.loopFrom ? track.loopFrom * STEPS : 0;
    this.nextTime = t0;
    this.echo.delayTime.setValueAtTime((60 / track.bpm) * 0.75, t0); // ottavo puntato
  }

  _fadeOutBus(bus, t, fadeS = FADE_S) {
    try {
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(Math.max(0.0002, bus.gain.value), t);
      bus.gain.exponentialRampToValueAtTime(0.0001, t + fadeS);
    } catch {}
    setTimeout(() => {
      try {
        bus.disconnect();
      } catch {}
    }, (t - this.ctx.currentTime + fadeS + 2.5) * 1000);
  }

  _tick() {
    if (!this.track) return;
    const ctx = this.ctx;
    if (this.nextTime < ctx.currentTime - 0.25) this.nextTime = ctx.currentTime + 0.02; // la scheda era ferma
    const ahead = typeof document !== "undefined" && document.hidden ? LOOKAHEAD_HIDDEN_S : LOOKAHEAD_S;
    while (this.nextTime < ctx.currentTime + ahead) {
      const track = this.track,
        total = track.chords.length * STEPS;
      if (this.step >= total) {
        if (track.loopFrom === null) {
          // fine dell'ingresso in campo: il brano successivo attacca a tempo, senza buchi
          this._switch(this._pick(this.pendingNext || track.next || "match_rally"), { fade: false, at: this.nextTime });
          this.pendingNext = null;
          if (typeof this.onSwitch === "function") this.onSwitch(this.track.id);
          continue;
        }
        // rotazione nel gruppo dopo qualche giro: il brano successivo entra alla fine del giro, in dissolvenza
        const g = TRACK_GROUPS[groupOf(track.id)];
        this.loops += 1;
        if (g && g.rotate && g.tracks.length > 1 && this.loops >= g.rotate) {
          this._switch(this._pick(groupOf(track.id)), { fade: true, at: this.nextTime, fadeS: ROTATE_FADE_S });
          if (typeof this.onSwitch === "function") this.onSwitch(this.track.id);
          continue;
        }
        this.step = track.loopFrom * STEPS;
      }
      this._scheduleStep(track, this.step, this.nextTime);
      const sixteenth = 60 / track.bpm / 4,
        swing = track.swing || 0;
      this.nextTime += sixteenth * (this.step % 2 === 0 ? 1 + swing : 1 - swing);
      this.step += 1;
    }
  }

  _scheduleStep(track, absStep, t) {
    const bar = Math.floor(absStep / STEPS),
      s = absStep % STEPS,
      sixteenth = 60 / track.bpm / 4,
      chord = parseChord(track.chords[bar]) || parseChord("C"),
      bus = this.bus,
      arr = arrangementFor(track, this.loops),
      next = arrangementFor(track, this.loops + 1),
      lastBar = bar === track.chords.length - 1;
    const holdLength = (row, i) => {
      let n = 1;
      while (i + n < row.length && row[i + n] === "-") n++;
      return n;
    };
    // pad: accordo tenuto per la battuta (attacco al passo 0, ripreso a metà battuta per tenerlo vivo)
    if (track.pad && (s === 0 || s === 8)) {
      const base = 12 * (track.pad.octave + 1) + chord.root;
      chord.tones.slice(0, 4).forEach((iv, k) => this._pad(bus, t, midiToFreq(base + iv), sixteenth * 8.4, track.pad.level / (k === 0 ? 1 : 1.25)));
    }
    // melodia
    if (track.lead && arr.lead) {
      const row = track.lead.bars[bar % track.lead.bars.length],
        tok = row[s];
      if (tok && tok !== "-" && tok !== ".") {
        const midi = noteToMidi(tok);
        if (midi !== null) this._voice(track.lead.voice, bus, t, midiToFreq(midi + 12 * (track.lead.octave || 0)), sixteenth * holdLength(row, s));
      }
    }
    // basso
    if (track.bass && arr.bass) {
      const row = track.bass.pattern.split(/\s+/),
        tok = row[s];
      const iv = { R: 0, O: 12, F: 7, T: chord.tones[1] }[tok];
      if (iv !== undefined) this._bass(bus, t, midiToFreq(12 * (track.bass.octave + 1) + chord.root + iv), sixteenth * holdLength(row, s));
    }
    // arpeggio
    if (track.arp) {
      const tok = track.arp.pattern.split(/\s+/)[s];
      if (tok && tok !== ".") {
        const iv = tok === "+" ? 12 : chord.tones[Number(tok)] ?? 0;
        this._voice(track.arp.voice || "pluck", bus, t, midiToFreq(12 * (track.arp.octave + 1) + chord.root + iv), sixteenth * 0.9);
      }
    }
    // batteria (un pattern per tutte le battute o uno per battuta; l'ultimo si ripete)
    const kit = Array.isArray(track.drums) ? track.drums[Math.min(bar, track.drums.length - 1)] : track.drums;
    for (const [piece, pattern] of Object.entries(kit || {})) {
      if ((piece === "kick" && !arr.kick) || ((piece === "clap" || piece === "snare") && !arr.clap && track.arrange !== false && track.loopFrom !== null)) continue;
      const tok = pattern.split(/\s+/)[s];
      if (tok === "x" || tok === "o") this._drum(piece, bus, t, tok === "o" ? 1.25 : 1, s);
    }
    // lift: piatto aperto in levare e crash in apertura del giro
    if (arr.lift && s % 4 === 2) this._drum("openhat", bus, t, 0.8, s);
    if ((arr.lift || (arr.name === "full" && this.loops > 0)) && s === 0 && bar === 0) this._drum("crash", bus, t, 0.8, s);
    // rullante di raccordo quando il giro dopo cambia arrangiamento
    if (lastBar && s >= 12 && next.name !== arr.name && track.loopFrom !== null && track.arrange !== false) this._drum("snare", bus, t, 0.5 + (s - 12) * 0.18, s);
    // salita di rumore nelle ultime due battute del giro (tensione dei punti decisivi, fine del break)
    if ((track.riser || arr.riser) && s === 0 && bar === track.chords.length - 2) this._riser(bus, t, sixteenth * STEPS * 2);
  }

  // ---------- strumenti ----------
  _env(g, t, peak, attack, dur, release = 0.08) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setTargetAtTime(peak * 0.62, t + attack, Math.max(0.02, dur * 0.35));
    g.gain.setTargetAtTime(0.0001, t + Math.max(attack, dur), release / 3);
  }

  _osc(type, freq, t, end, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (detune) o.detune.setValueAtTime(detune, t);
    o.start(t);
    o.stop(end);
    this.scheduledNotes++;
    return o;
  }

  _voice(kind, bus, t, freq, dur) {
    const ctx = this.ctx,
      g = ctx.createGain(),
      f = ctx.createBiquadFilter();
    f.type = "lowpass";
    const end = t + dur + 0.35;
    let oscs;
    if (kind === "brass") {
      oscs = [this._osc("sawtooth", freq, t, end, -6), this._osc("sawtooth", freq, t, end, 7), this._osc("square", freq / 2, t, end)];
      f.Q.value = 2;
      f.frequency.setValueAtTime(500, t);
      f.frequency.exponentialRampToValueAtTime(3200, t + 0.06);
      f.frequency.setTargetAtTime(1500, t + 0.07, 0.12);
      this._env(g, t, 0.12, 0.025, dur, 0.12);
    } else if (kind === "squareLead") {
      oscs = [this._osc("square", freq, t, end, -5), this._osc("sawtooth", freq, t, end, 6)];
      f.frequency.setValueAtTime(2800, t);
      f.frequency.setTargetAtTime(1700, t + 0.02, 0.15);
      this._env(g, t, 0.085, 0.008, dur, 0.06);
    } else if (kind === "pluckLead") {
      oscs = [this._osc("square", freq, t, end), this._osc("triangle", freq * 2, t, end, 4)];
      f.frequency.setValueAtTime(3600, t);
      f.frequency.exponentialRampToValueAtTime(900, t + Math.min(0.6, dur + 0.1));
      this._env(g, t, 0.09, 0.005, Math.min(dur, 0.22), 0.18);
    } else if (kind === "softLead") {
      oscs = [this._osc("triangle", freq, t, end), this._osc("sine", freq * 2, t, end, -3)];
      f.frequency.value = 2200;
      this._env(g, t, 0.11, 0.03, dur, 0.2);
    } else if (kind === "bell") {
      oscs = [this._osc("sine", freq, t, end), this._osc("sine", freq * 2.76, t, end), this._osc("triangle", freq * 2, t, end)];
      f.frequency.value = 6000;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0002, t + 0.5);
    } else {
      // pluck
      oscs = [this._osc("triangle", freq, t, end), this._osc("square", freq, t, end, 8)];
      f.frequency.setValueAtTime(3000, t);
      f.frequency.exponentialRampToValueAtTime(600, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.04, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0002, t + 0.17);
    }
    oscs.forEach((o, i) => {
      if (kind === "brass" && i === 2) {
        const sub = ctx.createGain();
        sub.gain.value = 0.35;
        o.connect(sub).connect(f);
      } else if (kind === "bell" && i === 1) {
        const p = ctx.createGain();
        p.gain.value = 0.25;
        o.connect(p).connect(f);
      } else o.connect(f);
    });
    f.connect(g).connect(bus);
    if (kind !== "pluck") {
      const send = ctx.createGain();
      send.gain.value = kind === "bell" ? 0.5 : 0.3;
      g.connect(send).connect(this.echo);
    }
  }

  _pad(bus, t, freq, dur, level) {
    const ctx = this.ctx,
      end = t + dur + 0.5,
      g = ctx.createGain(),
      f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1100;
    [this._osc("sawtooth", freq, t, end, -9), this._osc("triangle", freq, t, end, 9)].forEach((o) => o.connect(f));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.03 * level, t + 0.09);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.12);
    f.connect(g).connect(bus);
  }

  _bass(bus, t, freq, dur) {
    const ctx = this.ctx,
      end = t + dur + 0.2,
      g = ctx.createGain(),
      f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = 4;
    f.frequency.setValueAtTime(1300, t);
    f.frequency.exponentialRampToValueAtTime(320, t + 0.12);
    this._osc("square", freq, t, end).connect(f);
    const sub = this._osc("sine", freq / 2, t, end),
      sg = ctx.createGain();
    sg.gain.value = 0.9;
    sub.connect(sg).connect(g);
    f.connect(g).connect(bus);
    this._env(g, t, 0.13, 0.006, Math.max(0.06, dur * 0.92), 0.05);
  }

  _noise(bus, t, dur, { type = "highpass", freq = 7000, q = 0.8, peak = 0.05, decay = dur } = {}) {
    if (!this.noise) return;
    const ctx = this.ctx,
      src = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    src.buffer = this.noise;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0002, t + decay);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 1.2, dur + 0.05);
    this.scheduledNotes++;
    return f;
  }

  _drum(piece, bus, t, accent = 1, s = 0) {
    const ctx = this.ctx;
    if (piece === "kick") {
      const o = this._osc("sine", 160, t, t + 0.32),
        g = ctx.createGain();
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.42 * accent, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0002, t + 0.3);
      o.connect(g).connect(bus);
    } else if (piece === "snare") {
      this._noise(bus, t, 0.16, { type: "bandpass", freq: 2400, q: 0.7, peak: 0.1 * accent, decay: 0.15 });
      const o = this._osc("triangle", 210, t, t + 0.1),
        g = ctx.createGain();
      o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      g.gain.setValueAtTime(0.06 * accent, t);
      g.gain.exponentialRampToValueAtTime(0.0002, t + 0.09);
      o.connect(g).connect(bus);
    } else if (piece === "clap") {
      [0, 0.011, 0.023].forEach((d, i) => this._noise(bus, t + d, i === 2 ? 0.16 : 0.03, { type: "bandpass", freq: 1500, q: 1.1, peak: 0.085 * accent, decay: i === 2 ? 0.15 : 0.025 }));
    } else if (piece === "hat") {
      this._noise(bus, t, 0.05, { freq: 8000, peak: (s % 4 === 0 ? 0.032 : 0.022) * accent, decay: 0.04 });
    } else if (piece === "openhat") {
      this._noise(bus, t, 0.24, { freq: 7200, peak: 0.028 * accent, decay: 0.22 });
    } else if (piece === "shaker") {
      this._noise(bus, t, 0.04, { type: "bandpass", freq: 6200, q: 1.4, peak: s % 2 ? 0.012 : 0.02, decay: 0.035 });
    } else if (piece === "crash") {
      this._noise(bus, t, 1.6, { freq: 5200, q: 0.5, peak: 0.07 * accent, decay: 1.5 });
    } else if (piece === "tick") {
      const o = this._osc("square", 1800, t, t + 0.03),
        g = ctx.createGain();
      g.gain.setValueAtTime(s % 4 === 0 ? 0.018 : 0.01, t);
      g.gain.exponentialRampToValueAtTime(0.0002, t + 0.025);
      o.connect(g).connect(bus);
    } else if (piece === "tom") {
      const o = this._osc("sine", 190 - (s % 4) * 18, t, t + 0.25),
        g = ctx.createGain();
      o.frequency.exponentialRampToValueAtTime(90, t + 0.2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.22 * accent, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0002, t + 0.22);
      o.connect(g).connect(bus);
    }
  }

  _riser(bus, t, dur) {
    const f = this._noise(bus, t, dur, { type: "bandpass", freq: 400, q: 3, peak: 0.0001, decay: dur });
    if (!f) return;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(5200, t + dur);
    // il guadagno del rumore sale invece di scendere
    const g = f.context.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.97);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.disconnect();
    f.connect(g).connect(bus);
  }
}
