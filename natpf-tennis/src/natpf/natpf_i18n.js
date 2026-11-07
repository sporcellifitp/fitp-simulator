// Testi dell'HUD in italiano. Il motore di gioco continua a usare le sue etichette inglesi come chiavi interne
// (confronti di stato, feedback al telefono, messaggi della partita in rete); l'HUD le traduce solo quando le
// mostra, con un'unica sostituzione per frase (prima le frasi più lunghe, niente traduzioni a catena).

const PHRASES = [
  // tempo del colpo e del servizio
  ["SERVE APEX TIMING", "Tempo del servizio"],
  ["SERVE IMPACT", "Impatto del servizio"],
  ["SERVE TOSS", "Lancio di palla"],
  ["NET VOLLEY TIMING", "Tempo della volée"],
  ["NET TIMING", "Tempo della volée"],
  ["SWING TIMING", "Tempo del colpo"],
  ["SWING WHIFF", "Colpo a vuoto"],
  ["WHIFF", "A vuoto"],
  ["UPWARD FLICK / SPACE", "Polso in alto / Spazio"],
  ["SWEET SPOT APEX", "Impatto al vertice"],
  ["SWEET SPOT", "Centro piatto"],
  ["SUPER SHOT", "Super colpo"],
  ["VERY EARLY", "Molto in anticipo"],
  ["VERY LATE", "Molto in ritardo"],
  ["TOO LATE", "Troppo tardi"],
  ["EARLY SERVE", "Servizio anticipato"],
  ["GOOD SERVE", "Buon servizio"],
  ["POWER SERVE", "Gran servizio"],
  ["LOW CONTACT", "Impatto basso"],
  ["SERVICE BOX", "In campo"],
  ["BALL PASSED", "Palla passata"],
  ["CROSS-COURT", "Incrociato"],
  ["DOWN THE LINE", "Lungolinea"],
  ["NET VOLLEY", "Volée"],
  ["DEFENSIVE", "Difesa"],
  ["FOREHAND", "Dritto"],
  ["BACKHAND", "Rovescio"],
  ["PERFECT", "Perfetto"],
  ["EARLY", "Anticipo"],
  ["LATE", "Ritardo"],
  ["GOOD", "Buono"],
  ["CROSS", "Incrociato"],
  ["LINE", "Lungolinea"],
  ["RISING", "In salita"],
  ["READY", "Pronto"],
  ["LOB", "Pallonetto"],
  ["DROP SHOT", "Palla corta"],
  ["SMASH", "Schiacciata"],
  ["SLICE", "Tagliato"],
  ["FLAT", "Piatto"],
  // punti, game e partita
  ["POINT WON", "Punto vinto"],
  ["POINT LOST", "Punto perso"],
  ["YOU WIN", "Hai vinto"],
  ["TRY AGAIN", "Riprova"],
  ["P1 WINS", "Vince P1"],
  ["P2 WINS", "Vince P2"],
  ["Final Games", "Game finali"],
  ["Games", "Game"],
  ["Game Set and Match", "Game, set e partita"],
  ["Game Point", "Palla game"],
  ["Break Point", "Palla break"],
  ["Match Point", "Palla match"],
  ["Deuce", "Parità"],
  ["Ad In", "Vantaggio"],
  ["Ad Out", "Vantaggio"],
  ["Nice Shot", "Bel colpo"],
  ["Start", "Si gioca"],
  ["Out", "Fuori"],
  ["Net", "Rete"],
  ["Point", "Punto"],
  // inquadrature
  ["Net Close", "Rete"],
  ["Aerial", "Aerea"],
  ["Rally", "Scambio"],
  ["Serve", "Servizio"],
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LOOKUP = new Map(PHRASES.map(([en, it]) => [en.toLowerCase(), it]));
const PATTERN = new RegExp(
  `(?<![\\p{L}])(${PHRASES.map(([en]) => en)
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join("|")})(?![\\p{L}])`,
  "giu",
);
const isUpper = (s) => s === s.toUpperCase() && s !== s.toLowerCase();

// «PERFECT • FOREHAND TOPSPIN!» → «PERFETTO • DRITTO TOPSPIN!»; il maiuscolo dell'originale resta maiuscolo.
export function t(text) {
  if (text === null || text === undefined) return text;
  return String(text)
    .replace(PATTERN, (m) => {
      const it = LOOKUP.get(m.toLowerCase());
      if (!it) return m;
      return isUpper(m) && m.length > 1 ? it.toUpperCase() : it;
    })
    .replace(/\.\.\./g, "…");
}

// Punteggio del game: «00» → «0» come nei tabelloni italiani; parità e vantaggio per esteso o abbreviati.
export function scoreText(value, { short = false } = {}) {
  const v = String(value ?? "");
  if (v === "00") return "0";
  if (/^ad (in|out)$/i.test(v)) return short ? "VANT." : "Vantaggio";
  if (/^ad$/i.test(v)) return "AD";
  if (/^deuce$/i.test(v)) return short ? "PARITÀ" : "Parità";
  return v.replace(/\b00\b/g, "0");
}
