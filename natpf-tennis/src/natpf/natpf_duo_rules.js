// B25 · Stesso schermo, partita tra due persone (decisioni dell'utente dell'11/11 sull'audit `docs/b19/audit-1v1-utenti.md`;
// documento `docs/b25/stesso-schermo-equilibrio.md`). Cinque regole, tutte e solo per la partita tra due persone nello stesso
// schermo (contro la CPU e nella sfida tra due computer non cambia niente: `duoFor` restituisce null):
//   1. LANCIO AUTOMATICO (opzione dello staff, spenta di base): chi deve battere e resta fermo `AUTO_TOSS.after` secondi
//      si vede lanciare la palla dal gioco. Se non colpisce vale il lancio a vuoto di sempre. Dopo due lanci automatici a
//      vuoto di fila il gioco batte per lui un servizio morbido in campo, così la fila non aspetta.
//   2. CAMPO APERTO (opzione dello staff, spenta di base): i personaggi corrono come persone e non più a 9,8 m/s; la
//      palla lontana si prende in allungo (risposta più corta e più lenta, o sbagliata) o non si prende.
//   3. COLPO SUPER sulla forza relativa: «gesto fortissimo» vuol dire più forte del PROPRIO colpo abituale
//      (`SUPER_REL.ratio` volte), non una soglia uguale per tutti. Le altre condizioni del super restano quelle del 29/10.
//   4. PREPARAZIONE: tra due persone non conta più (dava un vantaggio che nessuna scritta spiegava).
//   5. FASCE «Bambino · Ragazzo · Adulto» per giocatore e AIUTO AL PIÙ GIOVANE quando le fasce sono diverse (`HELP`).
// Dove si accendono: pannello dello stand (Ctrl+Maiusc+K, o 3 s sul marchio NATPF del menu) → «Lancio automatico» e
// «Stesso schermo: campo aperto»; restano salvate (localStorage). Le fasce: pagina dei telefoni dello stesso schermo,
// sulla scheda di ciascun giocatore. Tutto vale dalla partita dopo.
// Funzioni pure (le provano i test); le usano game_engine.js, natpf_impact.js, natpf_skill.js e l'interfaccia.

const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/* ---------- opzioni dello staff ---------- */
export const AUTO_TOSS_KEY = 'natpf-tennis.lancioAuto';
export const OPEN_COURT_KEY = 'natpf-tennis.campoAperto';
const readFlag = (key, storage) => { try { return storage?.getItem(key) === '1'; } catch { return false; } };
const writeFlag = (key, on, storage) => { try { storage?.setItem(key, on ? '1' : '0'); } catch {} return !!on; };
export const readAutoToss = ({ storage = globalThis.localStorage } = {}) => readFlag(AUTO_TOSS_KEY, storage);
export const writeAutoToss = (on, { storage = globalThis.localStorage } = {}) => writeFlag(AUTO_TOSS_KEY, on, storage);
export const readOpenCourt = ({ storage = globalThis.localStorage } = {}) => readFlag(OPEN_COURT_KEY, storage);
export const writeOpenCourt = (on, { storage = globalThis.localStorage } = {}) => writeFlag(OPEN_COURT_KEY, on, storage);

/* ---------- 1 · lancio automatico ---------- */
export const AUTO_TOSS = Object.freeze({
  after: 30,     // s fermi al servizio: il gioco lancia la palla (decisione dell'utente dell'11/11)
  again: 15,     // s dopo un lancio automatico a vuoto: secondo lancio automatico
  misses: 2,     // lanci automatici a vuoto di fila dopo i quali batte il gioco
  serveWait: 5,  // s dopo il secondo lancio automatico a vuoto: lancio e servizio automatico
  power: .3,     // forza del servizio automatico (morbido: 4,8 m dalla rete, al centro del quadrato, 0,88 s di volo)
  warn: 10,      // s prima del lancio automatico in cui lo schermo lo annuncia
});
// cosa fa il gioco per chi deve battere ed è fermo da `idle` secondi, dopo `misses` lanci automatici a vuoto di fila:
// null (aspetta), 'toss' (lancia), 'serve' (lancia e batte lui)
export function autoTossAction({ idle = 0, misses = 0 } = {}){
  const t = finite(idle), m = Math.max(0, misses | 0);
  if (m >= AUTO_TOSS.misses) return t >= AUTO_TOSS.serveWait ? 'serve' : null;
  return t >= (m ? AUTO_TOSS.again : AUTO_TOSS.after) ? 'toss' : null;
}
// secondi che mancano e cosa succede allora (per la scritta): { left, what }
export function autoTossNext({ idle = 0, misses = 0 } = {}){
  const m = Math.max(0, misses | 0), serve = m >= AUTO_TOSS.misses;
  const at = serve ? AUTO_TOSS.serveWait : m ? AUTO_TOSS.again : AUTO_TOSS.after;
  return { left: Math.max(0, at - finite(idle)), what: serve ? 'serve' : 'toss' };
}
// il servizio che il gioco batte per chi non si muove: piatto, morbido, al centro del quadrato, a tempo. Stesso percorso
// del servizio dal gesto (natpf_stroke_outcome.serveOutcome); non insegna niente al «servizio abituale» di chi batte
export function autoServeEvent(hand = 'right'){
  const p = AUTO_TOSS.power;
  return { source: 'natpf-auto', natpfAuto: true, natpfServeTau: 0, side: 'forehand', hand, shotType: 'flat', speed: 1, dirX: 0,
    natpf: { aim: 'swing', shot: 'flat', power: p, hand, latency: 0, intent: { shot: 'flat', power: p, depth: p, plane: 0, rise: -.08, face: 0, conf: 1 } } };
}
export const autoTossButton = on => (on ? `Sì · ${AUTO_TOSS.after} s` : 'No');
export const autoTossToast = on => `${on
  ? `Lancio automatico acceso: nello stesso schermo, se chi deve battere resta fermo ${AUTO_TOSS.after} secondi il gioco lancia la palla; dopo due lanci a vuoto batte il gioco`
  : 'Lancio automatico spento: il gioco aspetta chi deve battere'}. Vale dalla prossima partita; resta salvata`;

/* ---------- 2 · campo aperto ---------- */
// Oggi tra due persone il personaggio corre a 9,8 m/s, parte dopo 0,12 s e rientra al centro alla stessa velocità: arriva
// su ogni palla (vincenti sotto 1 punto su 100) e chi piazza perde più spesso di chi rimanda al centro, perché rischia la
// riga e non guadagna niente (audit B19, punto 2). In più la palla angolata ha meno velocità lungo il campo, e chi la
// riceve ha più margine sul tempo di chi riceve una palla dritta: nel motore di oggi l'angolo aiuta chi lo riceve.
// Con l'opzione accesa, uguale per i due lati (valori misurati con scripts/audit/b25/misure.mjs campo e campo-prove):
//   · corsa verso la palla: velocità × `speed` (5,9 m/s) e partenza `react` secondi più tardi;
//   · rientro dopo il proprio colpo: velocità × `recover` (2 m/s, un passo svelto): chi è stato portato fuori non è già
//     al centro quando l'altro colpisce, e la palla dall'altra parte lo trova lontano («aprire il campo»);
//   · in corsa o in allungo (misura 0…1 del piano d'intercetto, natpf_impact.planPlayerIntercept: poco margine all'arrivo
//     o corsa lunga) la finestra del tempo si stringe fino a (1 − `tight`): più palle fuori e più colpi a vuoto per chi
//     arriva tardi; e l'allungo costa più qualità (`stretchCost` al posto di PLAN.stretchCost .4): risposta più corta e
//     più lenta, al limite sbagliata (colpo fallito per regola);
//   · palla non raggiunta (piano «stretch»): la racchetta arriva solo fino a `reach` m di lato (prima 2,4 m);
//   · la risposta al servizio resta con la corsa di sempre (`serveFull`): il servizio largo non chiude il punto da solo.
export const OPEN_COURT = Object.freeze({ speed: .6, recover: .2, react: .1, tight: .8, stretchCost: .6, reach: 1.7, serveFull: true });
// solo per le misure (scripts/audit/b25): valori che sostituiscono quelli sopra. Vuoto nel gioco
export const openTuning = {};
export const openCourt = () => ({ ...OPEN_COURT, ...openTuning });
export const openCourtButton = on => (on ? 'Sì · il piazzamento conta' : 'No');
export const openCourtToast = on => `${on
  ? 'Campo aperto acceso: nello stesso schermo i personaggi corrono come persone; la palla angolata e lontana si prende in allungo o non si prende'
  : 'Campo aperto spento: i personaggi arrivano su ogni palla, come sempre'}. Vale dalla prossima partita; resta salvata`;

/* ---------- 3 · colpo super sulla forza relativa ---------- */
// «Gesto fortissimo» tra due persone: picco del gesto almeno `ratio` volte il proprio colpo abituale (il colpo tipico che
// il telefono impara giocando, natpf_phone_racket.createTypicalModel: arriva con ogni colpo, natpf.typical). Con la soglia
// uguale per tutti (natpf_stroke_outcome.SUPER.power: circa 1.045 °/s) a un bambino servivano 2,75 volte il suo colpo e a
// un adulto medio 1,3: bambino 0 super su 10.057 colpi, adulto medio 3 su 18.719 (audit B19, punti 14–15).
// `min`: sotto questo picco (°/s) non è mai un super (un gesto piccolissimo non è «fortissimo» nemmeno se il resto è più
// piccolo ancora). Senza colpo tipico (webcam, telefono non aggiornato) o con il colpo tipico ancora della calibrazione
// (primi tre colpi di chi ha appena calibrato) vale la regola di sempre.
export const SUPER_REL = Object.freeze({ ratio: 1.3, min: 260 });
// true/false se il gesto è fortissimo rispetto al proprio solito; null se non si può dire (vale la regola di sempre)
// solo per le misure (scripts/audit/b25): { ratio } che sostituisce quello sopra. Vuoto nel gioco
export const superTuning = {};
export function relStrong(e = {}, ratio = superTuning.ratio ?? SUPER_REL.ratio){
  const peak = finite(e?.natpf?.peak, NaN), typ = finite(e?.natpf?.typical, NaN);
  // typicalOwn false: il colpo tipico è ancora quello della calibrazione (primi colpi della partita), spesso un colpetto:
  // ogni colpo normale sarebbe «fortissimo»
  if (!Number.isFinite(peak) || !Number.isFinite(typ) || typ <= 60 || e.natpf.typicalOwn === false) return null;
  return peak >= SUPER_REL.min && peak >= ratio*typ;
}

/* ---------- 5 · fasce e aiuto al più giovane ---------- */
export const BANDS = Object.freeze(['bambino', 'ragazzo', 'adulto']);
export const BAND_LABEL = Object.freeze({ bambino: 'Bambino', ragazzo: 'Ragazzo', adulto: 'Adulto' });
export const BAND_DEFAULT = 'adulto';
export const bandOf = v => (BANDS.includes(v) ? v : BAND_DEFAULT);
// Aiuto per coppia di fasce (il più giovane : il più grande). Parametri, tutti e solo per il più giovane:
//   span   × finestra del tempo: lo stesso errore di tempo (soprattutto in anticipo) sposta meno la palla verso le righe;
//   late   s in più per colpire in ritardo: meno palle fuori per il ritardo e meno colpi a vuoto. Oltre 0,1 s non serve
//          (misurato): la palla è ormai passata oltre il punto in cui si può ancora colpire (natpf_impact.IMPACT.lateBehind);
//   head   punti di vantaggio a ogni game (1 = parte da 15-0, 2 = da 30-0), visibili sul tabellone;
//   superRatio  colpo super da questo multiplo del proprio colpo abituale (più facile di SUPER_REL.ratio; non usato nelle
//          varianti di oggi: il super relativo vale già per tutti).
// Varianti misurate con il banco dei due umani (scripts/audit/b25/misure.mjs aiuto, tabella nel documento):
//   A solo tolleranza sul tempo · B solo vantaggio di punti · C combinazione leggera · 0 nessun aiuto.
// HELP_DEFAULT è la variante in gioco; le altre si scelgono cambiando questa costante (o engine.natpfHelpVariant nelle
// prove e nelle misure). L'utente sceglie dalla tabella del documento.
export const HELP = Object.freeze({
  0: Object.freeze({}),
  A: Object.freeze({
    'bambino:adulto': Object.freeze({ span: 2, late: .1 }),
    'ragazzo:adulto': Object.freeze({ span: 1.3, late: .03 }),
    'bambino:ragazzo': Object.freeze({ late: .03 }),
  }),
  B: Object.freeze({
    'bambino:adulto': Object.freeze({ head: 2 }),
    'ragazzo:adulto': Object.freeze({ head: 1 }),
    'bambino:ragazzo': Object.freeze({ head: 1 }),
  }),
  // C: per il bambino contro l'adulto 15-0 e un po' di margine sul tempo; tra fasce vicine basta il margine (già 0,03 s
  // spostano molto: con 0,06 s il ragazzo batteva l'adulto medio 55 volte su 100)
  C: Object.freeze({
    'bambino:adulto': Object.freeze({ head: 1, span: 1.5, late: .06 }),
    'ragazzo:adulto': Object.freeze({ span: 1.3, late: .03 }),
    'bambino:ragazzo': Object.freeze({ late: .03 }),
  }),
});
export const HELP_DEFAULT = 'C';
// solo per le misure: coppia → parametri che sostituiscono quelli della variante. Vuoto nel gioco
export const helpTuning = {};
// aiuto per i due giocatori dalle loro fasce: { p1, p2 } con i parametri (e band, vs) per chi è aiutato, null per l'altro.
// Fasce uguali (o sconosciute: Adulto): nessun aiuto
export function helpFor(bands = {}, variant = HELP_DEFAULT){
  const b1 = bandOf(bands?.p1), b2 = bandOf(bands?.p2), i1 = BANDS.indexOf(b1), i2 = BANDS.indexOf(b2);
  const out = { p1: null, p2: null };
  if (i1 === i2) return out;
  const young = i1 < i2 ? 'p1' : 'p2', pair = i1 < i2 ? `${b1}:${b2}` : `${b2}:${b1}`;
  const P = helpTuning[pair] || (HELP[variant] || HELP[HELP_DEFAULT])[pair];
  if (!P || !Object.keys(P).length) return out;
  out[young] = { ...P, band: young === 'p1' ? b1 : b2, vs: young === 'p1' ? b2 : b1 };
  return out;
}
// scritta sobria sotto il nome di chi è aiutato («Aiuto: Bambino»), '' per l'altro
export const helpLabel = h => (h ? `Aiuto: ${BAND_LABEL[h.band] || 'Sì'}` : '');
// spiegazione in una riga per la pagina dei telefoni (cosa cambia per chi è aiutato)
export function helpText(h){
  if (!h) return '';
  const parts = [];
  if (h.head) parts.push(`parte da ${h.head >= 2 ? '30' : '15'}-0 a ogni game`);
  if (finite(h.span, 1) > 1 || h.late) parts.push('ha più margine sul tempo del colpo');
  if (h.superRatio) parts.push('colpo super più facile');
  return parts.length ? `${helpLabel(h)} · ${parts.join(', ')}` : helpLabel(h);
}

/* ---------- regole della partita ---------- */
// Regole per questa partita (game_engine.startNewMatch → engine.natpfDuo), o null se non è una partita tra due persone
// nello stesso schermo. `forced`: valori a mano del motore (test e simulazioni), che comandano sulle scelte salvate:
//   autoToss, openCourt (true/false), superRel, noPrep (false le spegne: solo per mostrare che il resto non cambia),
//   helpVariant ('0' | 'A' | 'B' | 'C').
// Le due opzioni e l'aiuto valgono con i due telefoni; con la webcam per due (non sviluppata) restano spente.
export function duoFor({ split = false, webcam = false, bands = null, forced = {}, storage = globalThis.localStorage } = {}){
  if (!split) return null;
  const pick = (v, read) => (typeof v === 'boolean' ? v : !webcam && read({ storage }));
  const help = webcam ? { p1: null, p2: null } : helpFor(bands || {}, forced.helpVariant ?? HELP_DEFAULT);
  return {
    autoToss: pick(forced.autoToss, readAutoToss), open: pick(forced.openCourt, readOpenCourt),
    superRel: forced.superRel !== false, noPrep: forced.noPrep !== false,
    help, helped: !!(help.p1 || help.p2),
  };
}
const duoOf = engine => (engine?.natpfSplit?.active ? engine.natpfDuo || null : null);
// aiuto di questo personaggio (o null): engine.player è il Player 1, engine.opponent il Player 2
export const helpOf = (engine, actor) => { const D = duoOf(engine); return D?.helped ? (actor && actor === engine.opponent ? D.help.p2 : D.help.p1) : null; };
// campo aperto acceso per questa partita?
export const openOn = engine => !!duoOf(engine)?.open;
// corsa di questo personaggio verso la palla di adesso (fattore sulla velocità) e ritardo in più alla partenza
export function openRun(engine){
  if (!openOn(engine)) return null;
  const O = openCourt();
  // risposta al servizio a velocità piena (la palla in gioco è il servizio: un colpo solo nello scambio)
  if (O.serveFull && finite(engine.ball?.rallyStrokeCount) <= 1) return null;
  return O;
}
// punti di vantaggio a inizio game: { player, opponent } (0 e 0 senza aiuto)
export function headStart(engine){
  const D = duoOf(engine);
  return { player: Math.max(0, Math.min(3, D?.help?.p1?.head | 0)), opponent: Math.max(0, Math.min(3, D?.help?.p2?.head | 0)) };
}
// livello (natpf_skill.skillLevel) con la finestra del tempo allargata per chi è aiutato; lo stesso oggetto per gli altri
export function helpLevel(level, h){
  const k = finite(h?.span, 1);
  return h && k !== 1 ? { ...level, timingSpan: finite(level?.timingSpan, .17)*k } : level;
}
