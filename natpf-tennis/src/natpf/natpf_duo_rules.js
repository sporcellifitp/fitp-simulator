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
//      Decisione dell'utente del 12/11: l'aiuto è solo di gioco (margine sul tempo, palla verso di lui più lenta, il suo
//      colpo più in fondo). Nessun punto regalato, mai: ogni game parte da 0-0.
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
//   · la risposta al servizio resta con la corsa di sempre (`serveFull`): il servizio largo non chiude il punto da solo;
//   · il servizio passa come nel formato in fiera (`altServe`: A, B B, A A…) anche con il formato classico. Revisione
//     del B25: con la risposta a corsa piena il primo a colpire in allungo è sempre chi ha battuto, che vince solo 44–47
//     punti su 100 (spento 51–52); con un battitore per game, nella partita classica a 1 game chi batteva per primo
//     vinceva 37–44 partite su 100. Con il servizio che passa ogni due punti i due battono lo stesso numero di punti e
//     il sorteggio non decide (misure: scripts/audit/b25/misure.mjs battitore). Parità e vantaggi restano quelli del
//     formato scelto.
export const OPEN_COURT = Object.freeze({ speed: .6, recover: .2, react: .1, tight: .8, stretchCost: .6, reach: 1.7, serveFull: true, altServe: true });
// solo per le misure (scripts/audit/b25): valori che sostituiscono quelli sopra. Vuoto nel gioco
export const openTuning = {};
export const openCourt = () => ({ ...OPEN_COURT, ...openTuning });
export const openCourtButton = on => (on ? 'Sì · il piazzamento conta' : 'No');
export const openCourtToast = on => `${on
  ? 'Campo aperto acceso: nello stesso schermo i personaggi corrono come persone; la palla angolata e lontana si prende in allungo o non si prende. Il servizio passa ogni due punti, come nel formato in fiera'
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

// quanto è forte il gesto rispetto alla soglia del proprio super: 1 = proprio alla soglia (ratio volte il colpo abituale),
// 0,77 = il proprio colpo abituale; null se non si può dire. Per la barra della potenza (natpf_power_hud.powerView): tra due
// persone la tacca del super è la propria, non quella uguale per tutti
export function relLevel(e = {}, ratio = superTuning.ratio ?? SUPER_REL.ratio){
  if (relStrong(e, ratio) === null) return null;
  return Math.max(0, finite(e.natpf.peak)/(ratio*finite(e.natpf.typical, 1)));
}

/* ---------- 5 · fasce e aiuto al più giovane ---------- */
export const BANDS = Object.freeze(['bambino', 'ragazzo', 'adulto']);
export const BAND_LABEL = Object.freeze({ bambino: 'Bambino', ragazzo: 'Ragazzo', adulto: 'Adulto' });
export const BAND_DEFAULT = 'adulto';
export const bandOf = v => (BANDS.includes(v) ? v : BAND_DEFAULT);
// Aiuto per coppia di fasce (il più giovane : il più grande). Decisione dell'utente del 12/11: «non voglio che nessuno
// abbia un vantaggio di punti, voglio solo che il vantaggio si traduca nel gameplay». Quindi NESSUN PUNTO REGALATO, mai
// (il 15-0 e il 30-0 delle varianti B e C dell'11/11 sono tolti dal gioco: il motore non ha più modo di darli) e l'aiuto
// è solo di gioco. Parametri, tutti e solo per il più giovane:
//   span   × finestra del tempo: lo stesso errore di tempo (soprattutto in anticipo) sposta meno la palla verso le righe;
//   late   s in più per colpire in ritardo: meno palle fuori per il ritardo e meno colpi a vuoto. Oltre 0,1 s non serve
//          (misurato): la palla è ormai passata oltre il punto in cui si può ancora colpire (natpf_impact.IMPACT.lateBehind);
//   slow   × tempo di volo della palla che va verso di lui (colpi dello scambio e servizio dell'altro): arriva più lenta e
//          un po' più alta, e lui ha più tempo. Non vale per pallonetto e palla corta, già lenti (`slowFor`). Sopra 1,2 la
//          palla dell'altro diventa un pallonetto (misurato: a 1,25 otto palle su cento si prendono al volo da sopra la
//          testa, a 1,3 una su cinque): il valore resta lontano da lì;
//   deep   m più in fondo per il suo colpo riuscito (mai oltre `HELP_DEEP_MAX` dalla rete: resta in campo), `helpOutcome`:
//          l'altro colpisce da più lontano e ha un po' meno margine;
//   superRatio  colpo super da questo multiplo del proprio colpo abituale (più facile di SUPER_REL.ratio; non usato nelle
//          varianti di oggi: il super relativo vale già per tutti).
// Varianti misurate con il banco dei due umani (scripts/audit/b25/misure.mjs aiuto, tabella nel documento):
//   0 nessun aiuto · A solo margine sul tempo (per confronto) · G aiuto di gioco (in partita).
// HELP_DEFAULT è la variante in gioco; engine.natpfHelpVariant la cambia solo nelle prove e nelle misure.
export const HELP_DEEP_MAX = 11.3;   // m dalla rete: il colpo allungato dall'aiuto cade almeno 0,6 m dentro la riga di fondo
export const HELP = Object.freeze({
  0: Object.freeze({}),
  A: Object.freeze({
    'bambino:adulto': Object.freeze({ span: 2, late: .1 }),
    'ragazzo:adulto': Object.freeze({ span: 1.3, late: .03 }),
    'bambino:ragazzo': Object.freeze({ late: .03 }),
  }),
  // G: per il bambino contro l'adulto tre leve moderate insieme: margine sul tempo (quello della A), palla verso di lui
  // il 10% più lenta, il suo colpo 1 m più in fondo. Banco, 1 game in fiera, tre serie da 900 partite: il bambino vince
  // 38–42 partite su 100 contro l'adulto medio (senza aiuto 10–11, con la sola A 27–29), scambi lunghi come tra due adulti
  // medi (11,6–12 colpi a punto). Tra fasce vicine basta il margine sul tempo (già 0,03 s spostano molto: con 0,06 s il
  // ragazzo batteva l'adulto medio 55 volte su 100).
  // open: con il campo aperto acceso (opzione dello staff) gli scambi sono più corti e il bambino è già più vicino
  // all'adulto (19–23 partite su 100 senza aiuto): con le tre leve farebbe pari (49–50 su 100, misurato), quindi lì resta
  // il solo margine sul tempo (40–41 su 100)
  G: Object.freeze({
    'bambino:adulto': Object.freeze({ span: 2, late: .1, slow: 1.1, deep: 1 }),
    'ragazzo:adulto': Object.freeze({ span: 1.3, late: .03 }),
    'bambino:ragazzo': Object.freeze({ late: .03 }),
    open: Object.freeze({ 'bambino:adulto': Object.freeze({ span: 2, late: .1 }) }),
  }),
});
export const HELP_DEFAULT = 'G';
// solo per le misure: coppia → parametri che sostituiscono quelli della variante. Vuoto nel gioco
export const helpTuning = {};
// aiuto per i due giocatori dalle loro fasce: { p1, p2 } con i parametri (e band, vs) per chi è aiutato, null per l'altro.
// Fasce uguali (o sconosciute: Adulto): nessun aiuto. open: la partita è con il campo aperto acceso (la variante può
// avere valori suoi per quel caso: HELP.G.open)
export function helpFor(bands = {}, variant = HELP_DEFAULT, open = false){
  const b1 = bandOf(bands?.p1), b2 = bandOf(bands?.p2), i1 = BANDS.indexOf(b1), i2 = BANDS.indexOf(b2);
  const out = { p1: null, p2: null };
  if (i1 === i2) return out;
  const young = i1 < i2 ? 'p1' : 'p2', pair = i1 < i2 ? `${b1}:${b2}` : `${b2}:${b1}`;
  const T = HELP[variant] || HELP[HELP_DEFAULT], P = helpTuning[pair] || (open && T.open?.[pair]) || T[pair];
  if (!P || !Object.keys(P).length) return out;
  out[young] = { ...P, band: young === 'p1' ? b1 : b2, vs: young === 'p1' ? b2 : b1 };
  return out;
}
// scritta sobria sotto il nome di chi è aiutato («Aiuto: Bambino»), '' per l'altro
export const helpLabel = h => (h ? `Aiuto: ${BAND_LABEL[h.band] || 'Sì'}` : '');
// cosa cambia per chi è aiutato, a parole semplici e senza genere: ['ha più margine sul tempo', 'riceve palle più lente', …]
export function helpParts(h){
  if (!h) return [];
  const parts = [];
  if (finite(h.span, 1) > 1 || finite(h.late) > 0) parts.push('ha più margine sul tempo');
  if (finite(h.slow, 1) > 1) parts.push('riceve palle più lente');
  if (finite(h.deep) > 0) parts.push('tira più in fondo');
  if (h.superRatio) parts.push('ha il colpo super più facile');
  return parts;
}
// «a, b e c»
const listText = a => (a.length > 1 ? `${a.slice(0, -1).join(', ')} e ${a[a.length - 1]}` : a[0] || '');
// spiegazione in una riga per la pagina dei telefoni (cosa cambia per chi è aiutato)
export function helpText(h){
  if (!h) return '';
  const what = listText(helpParts(h));
  return what ? `${helpLabel(h)} · ${what}` : helpLabel(h);
}

/* ---------- regole della partita ---------- */
// Regole per questa partita (game_engine.startNewMatch → engine.natpfDuo), o null se non è una partita tra due persone
// nello stesso schermo. `forced`: valori a mano del motore (test e simulazioni), che comandano sulle scelte salvate:
//   autoToss, openCourt (true/false), superRel, noPrep (false le spegne: solo per mostrare che il resto non cambia),
//   helpVariant ('0' | 'A' | 'G').
// Le due opzioni e l'aiuto valgono con i due telefoni; con la webcam per due (non sviluppata) restano spente.
export function duoFor({ split = false, webcam = false, bands = null, forced = {}, storage = globalThis.localStorage } = {}){
  if (!split) return null;
  const pick = (v, read) => (typeof v === 'boolean' ? v : !webcam && read({ storage }));
  const open = pick(forced.openCourt, readOpenCourt);
  const help = webcam ? { p1: null, p2: null } : helpFor(bands || {}, forced.helpVariant ?? HELP_DEFAULT, open);
  return {
    autoToss: pick(forced.autoToss, readAutoToss), open,
    superRel: forced.superRel !== false, noPrep: forced.noPrep !== false,
    help, helped: !!(help.p1 || help.p2),
  };
}
const duoOf = engine => (engine?.natpfSplit?.active ? engine.natpfDuo || null : null);
// aiuto di questo personaggio (o null): engine.player è il Player 1, engine.opponent il Player 2
export const helpOf = (engine, actor) => { const D = duoOf(engine); return D?.helped ? (actor && actor === engine.opponent ? D.help.p2 : D.help.p1) : null; };
// campo aperto acceso per questa partita?
export const openOn = engine => !!duoOf(engine)?.open;
// il servizio passa ogni due punti (A, B B, A A…, natpf_fair_format.nextServe)? Con il formato in fiera sempre; con il
// campo aperto acceso anche nel formato classico (OPEN_COURT.altServe: chi batte lì è sfavorito, vedi sopra)
export const altServe = (engine, fair = false) => !!fair || (openOn(engine) && !!openCourt().altServe);
// corsa di questo personaggio verso la palla di adesso (fattore sulla velocità) e ritardo in più alla partenza
export function openRun(engine){
  if (!openOn(engine)) return null;
  const O = openCourt();
  // risposta al servizio a velocità piena (la palla in gioco è il servizio: un colpo solo nello scambio)
  if (O.serveFull && finite(engine.ball?.rallyStrokeCount) <= 1) return null;
  return O;
}
// frase per la barra dell'avvio e il conto alla rovescia della pagina dei telefoni: «Aiuto a Giulia (Bambino): ha più
// margine sul tempo, riceve palle più lente e tira più in fondo.» ('' senza aiuto)
export function helpSentence(h, name = ''){
  if (!h) return '';
  const what = listText(helpParts(h));
  return `Aiuto a ${name || 'chi è più giovane'} (${BAND_LABEL[h.band] || h.band})${what ? ': ' + what : ''}.`;
}
// livello (natpf_skill.skillLevel) con la finestra del tempo allargata per chi è aiutato; lo stesso oggetto per gli altri
export function helpLevel(level, h){
  const k = finite(h?.span, 1);
  return h && k !== 1 ? { ...level, timingSpan: finite(level?.timingSpan, .17)*k } : level;
}
// fattore sul tempo di volo della palla colpita da `hitter` (personaggio del motore): più di 1 se va verso chi è aiutato
// (`slow`); 1 esatto senza aiuto, contro la CPU e per pallonetto e palla corta (già lenti). shot: tipo dell'esito
// ('LOB', 'DROP', …; niente per il servizio)
export function slowFor(engine, hitter, shot = ''){
  const D = duoOf(engine);
  if (!D?.helped || shot === 'LOB' || shot === 'DROP') return 1;
  const h = hitter && hitter === engine.opponent ? D.help.p1 : D.help.p2;
  return Math.max(1, finite(h?.slow, 1));
}
// esito del colpo (natpf_stroke_outcome.strokeOutcome) di chi è aiutato: cade `deep` metri più in fondo, mai oltre
// HELP_DEEP_MAX. Non tocca il colpo fallito, debole o in rete, il pallonetto, la palla corta e la palla già più lunga di
// così (se andava fuori, va fuori lo stesso). Lo stesso oggetto senza aiuto
export function helpOutcome(out, h){
  const d = finite(h?.deep);
  if (!(d > 0) || !out || out.failed || out.weak || out.netFault || out.shot === 'LOB' || out.shot === 'DROP' || !(out.depth < HELP_DEEP_MAX)) return out;
  return { ...out, depth: +Math.min(HELP_DEEP_MAX, out.depth + d).toFixed(3) };
}
