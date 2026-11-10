// Pagina del telefono (racchetta.js): UNA schermata alla volta, ricavata da poche variabili con funzioni pure (B9, richiesta
// del 05/11; docs/b9/analisi-telefono.md §a.4). Prima ogni elemento della pagina aveva la sua condizione e le condizioni si
// sovrapponevano: con il telefono già calibrato «Tutto chiaro, ho capito» compariva sopra «Pronto» con Ricalibra,
// Ricollega e Scollega (difetto riprodotto in Allenamento e nello stesso schermo, a ogni ricollegamento).
//
// Variabili:
//   linkState  off | connecting | on | lost | denied
//   sensor     off | denied | nomotion | insecure | idle | cal | ready
//              (idle: sensori attivi, calibrazione non ancora partita perché il computer mostra il tutorial)
//   gate       null (nessun tutorial) | { v, i, n, s, m, all, name }: il computer mostra il tutorial e aspetta «Tutto
//              chiaro, ho capito». v 2: il computer manda l'avanzamento («tp»: scheda i di n, s viste, m maschera delle
//              viste, all tutte viste) e il pulsante resta spento finché all è falso; v 1 (computer di prima): pulsante
//              acceso subito
//   inputMode  motion | touch
//
// Schermate (la prima condizione vera vince):
//   link      collegamento non attivo        enable    «Attiva i sensori»        error     sensori non disponibili
//   tutorial  il computer mostra il tutorial cal       calibrazione              ready     «Pronto» con Ricalibra,
//                                                                                          Ricollega, Scollega
export const PHONE_SCREENS = Object.freeze(['link', 'error', 'enable', 'tutorial', 'cal', 'ready']);
const ERRORS = new Set(['denied', 'nomotion', 'insecure']);
const int = (v, d = 0) => (Number.isFinite(+v) ? Math.trunc(+v) : d);

export function screenOf({ linkState = 'off', sensor = 'off', gate = null } = {}){
  if (linkState !== 'on') return 'link';
  if (ERRORS.has(sensor)) return 'error';
  if (sensor === 'off') return 'enable';
  if (gate) return 'tutorial';
  if (sensor === 'ready') return 'ready';
  return 'cal';
}
// «Tutto chiaro, ho capito» toccabile: con un computer che manda l'avanzamento solo dopo tutte le schede viste
export const tutConfirmable = gate => !!gate && (gate.v < 2 || !!gate.all);

// cosa mostra la pagina: { screen, show: { selettore: visibile }, tutOk: { on, lit } } (lit: appena acceso)
export function phoneView({ linkState = 'off', sensor = 'off', gate = null, inputMode = 'motion', calStep = null, hasPair = false, diag = false, intentGate = false } = {}){
  const screen = screenOf({ linkState, sensor, gate });
  const S = s => screen === s, touch = inputMode === 'touch';
  const show = {
    '#retry': S('link') && (linkState === 'lost' || linkState === 'denied') && hasPair,
    '#enable': S('enable') || (S('error') && sensor !== 'insecure'),
    // «Gioca con i tocchi»: prima di attivare i sensori e durante la calibrazione (via d'uscita se i sensori non vanno,
    // come prima di B9); non nel tutorial né in «Pronto»
    '#enableTouch': (S('enable') || S('error') || S('cal')) && !touch,
    // mano e movimento: prima di attivare i sensori e alla verifica della calibrazione (non nel tutorial né in «Pronto»)
    '#profileOptions': S('enable') || S('error') || (S('cal') && calStep === 'review'),
    // «Opzioni» (movimento, «solo mentre tengo premuto»): chiuse sotto «Attiva i sensori», quando c'è la riga della mano
    '#moreOpts': S('enable') || S('error') || (S('cal') && calStep === 'review'),
    '#shotPanel': S('ready') || (S('cal') && calStep === 'free'),
    '#manualAim': touch,
    '#touchHit': touch || !!intentGate,
    '#shotChoices': touch,
    // Ricalibra, Ricollega, Scollega: solo sotto «Pronto» (scelta del 05/11: nella calibrazione bloccata decide il computer)
    '#tools': S('ready'),
    '#tutOk': S('tutorial'),
    '#tutBox': S('tutorial'),
    '#mark': linkState === 'on' && !!diag,
  };
  return { screen, show, tutOk: { on: S('tutorial') && tutConfirmable(gate) } };
}

/* ---------- tutorial: il cancello del computer ---------- */
// cfg dal computer: tut 1 apre (tv 2: manderà l'avanzamento), senza tut chiude. Un cfg ripetuto (ricollegamento, cambio
// di mano) non azzera l'avanzamento
export function gateOnCfg(gate, cfg = {}){
  if (!cfg.tut) return null;
  const v = cfg.tv >= 2 ? 2 : 1;
  return gate ? { ...gate, v } : { v, i: 0, n: 0, s: 0, m: 0, all: false, name: '' };
}
// avanzamento dal computer (tp): il computer è la fonte di verità; «all» non torna falso nella stessa apertura
export function gateOnProgress(gate, tp = {}){
  if (!gate) return gate;
  const n = Math.max(0, Math.min(32, int(tp.n))), i = n ? Math.max(0, Math.min(n - 1, int(tp.i))) : 0, s = Math.max(0, Math.min(n, int(tp.s)));
  return { ...gate, v: 2, i, n, s, m: int(tp.m) >>> 0, all: !!gate.all || tp.all === 1 || tp.all === true || (n > 0 && s >= n), name: typeof tp.nm === 'string' ? tp.nm.slice(0, 40) : gate.name || '' };
}
// gate salvato nella scheda (pagina ricaricata): solo se ha la forma giusta
export function gateRestore(saved){
  if (!saved || typeof saved !== 'object' || !(saved.v === 1 || saved.v === 2)) return null;
  const base = { v: saved.v, i: 0, n: 0, s: 0, m: 0, all: !!saved.all, name: '' };
  return saved.n ? { ...gateOnProgress(base, { i: saved.i, n: saved.n, s: saved.s, m: saved.m, nm: saved.name }), v: saved.v } : base;
}
// frecce ‹ › del telefono: si possono usare (computer v2), e quali sono spente agli estremi
export function gateNav(gate){
  if (!gate || gate.v < 2) return { show: false, prev: false, next: false };
  return { show: true, prev: gate.i > 0, next: gate.n > 0 && gate.i < gate.n - 1 };
}

/* ---------- sensori e tutorial ---------- */
// il tutorial si apre: una calibrazione in corso si ferma (ripartirà da capo dopo), un telefono pronto resta pronto
export const sensorOnGateOpen = sensor => (sensor === 'cal' ? 'idle' : sensor);
// il tutorial si chiude («ho capito» o il computer che lo chiude): chi aspettava calibra, gli altri restano dove sono
export const sensorOnGateClose = sensor => (sensor === 'idle' ? 'cal' : sensor);
// il telefono chiede (o deve rifare) la calibrazione: con il tutorial aperto aspetta la sua fine
export const sensorForCal = gate => (gate ? 'idle' : 'cal');
// stato dei sensori per il computer (st.s): «sensors» spenti, «tut» in attesa del tutorial senza calibrazione, gli altri
// come sono (un telefono pronto resta «ready» anche durante il tutorial: niente pausa del computer sopra la modale)
export const reportedSensor = sensor => (sensor === 'off' ? 'sensors' : sensor === 'idle' ? 'tut' : sensor);

// conto alla rovescia dello stesso schermo (messaggio del computer { t:'ev', k:'count' }, natpf_split_ui._announce):
// n = 3, 2, 1 («Si gioca tra» con il numero, anello verde) e 0 («Si gioca!»); stop = conto fermato o annullato, con il
// motivo. Anello rosso solo per un problema (un telefono non più pronto); soft = fermato sul computer («Aspetta», si
// scelgono le impostazioni, pannello aperto): anello neutro, non è un errore (revisione B9 del 06/11, prima sempre rosso)
export function countFlash(d = {}){
  if (d.stop) return { ring: d.soft ? '' : 'miss', big: 'Aspetta', sub: String(d.txt || 'Guarda il computer.').slice(0, 140), ms: 2400, arrow: '', buzz: null };
  const n = Math.round(+d.n || 0);
  return n > 0 ? { ring: 'ready', big: 'Si gioca tra', sub: 'Tieni il telefono come in partita.', ms: 1150, arrow: String(n), buzz: [25] }
    : { ring: 'ready', big: 'Si gioca!', sub: '', ms: 1000, arrow: '', buzz: [70] };
}

// Esito del colpo e del punto dal computer (messaggio ev: contact, miss, point) → avviso del telefono. B18 (difetto 10
// dell'audit B16): il telefono dice la stessa cosa del grande schermo. «Fuori» e «In rete» (out, net) prima erano
// ignorati e il telefono diceva «In anticipo» mentre il computer diceva «Fuori»; il perché (why: «troppo presto»,
// «in ritardo») va nella riga piccola. «Punto avversario» arriva solo a punto finito (il computer non manda più «fault»
// per il colpo difensivo con la palla in gioco), con il motivo già in italiano (txt).
const SHOT_FLASH = { drop: 'Palla corta!', lob: 'Lob!', slice: 'Tagliato!', smash: 'Smash!' };
const LABEL_FLASH = { perfetto: 'Perfetto!', buono: 'Bel colpo', anticipo: 'In anticipo', ritardo: 'In ritardo' };
const MISS_FLASH = { presto: 'Troppo presto', tardi: 'Troppo tardi', nessuno: 'Nessun colpo', portata: 'Troppo lontana', lancio: 'Lancio a vuoto' };
// lancio a vuoto al servizio (B18): come il grande schermo, più a lungo perché c'è da leggere
const MISS_SUB = { nessuno: 'Il movimento non è arrivato: riprova con un colpetto comodo.', lancio: 'Colpisci quando la palla è in alto. Alza il telefono e riprova.' };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
export function eventFlash(d = {}){
  const why = typeof d.why === 'string' ? d.why.slice(0, 40) : '';
  if (d.k === 'contact'){
    const name = SHOT_FLASH[d.shot] || '';
    if (d.net || d.out) return { ring: 'miss', big: d.net ? 'In rete' : 'Fuori', sub: [cap(why), name.replace('!', '')].filter(Boolean).join(' · '), ms: 900, buzz: d.label === 'perfetto' ? [40] : [20] };
    return { ring: 'hit', big: name || LABEL_FLASH[d.label] || 'Colpo!', sub: '', ms: 650, buzz: d.label === 'perfetto' ? [40] : [20] };
  }
  if (d.k === 'miss') return { ring: 'miss', big: MISS_FLASH[d.why] || 'Mancata', sub: MISS_SUB[d.why] || '', ms: d.why === 'lancio' ? 1800 : 650, buzz: [90] };
  if (d.k === 'point') return { ring: d.mine ? 'hit' : 'miss', big: d.mine ? 'Punto tuo' : 'Punto avversario', sub: String(d.txt || '').slice(0, 60), ms: 1300, buzz: null };
  return null;
}

// velo «Tocca lo schermo per riprendere» (schermo riacceso): cosa è rimasto, secondo dov'era il telefono. Prima diceva
// sempre «Il collegamento e la calibrazione sono rimasti», anche durante il tutorial o a calibrazione non finita
// (revisione B9 del 06/11)
export const VEIL_LEAD = 'Bentornato: un tocco tiene acceso lo schermo e riattiva i sensori.';
export function veilText({ linkState = 'on', sensor = 'off', gate = null } = {}){
  let kept;
  if (linkState !== 'on') kept = sensor === 'ready' ? 'La calibrazione è rimasta; il collegamento riparte da solo.' : 'Il collegamento riparte da solo.';
  else if (sensor === 'ready') kept = gate ? 'Il collegamento e la calibrazione sono rimasti; il tutorial è ancora sul computer.' : 'Il collegamento e la calibrazione sono rimasti.';
  else if (gate) kept = 'Il collegamento è rimasto e il tutorial è ancora sul computer: riprendi da dove eri, poi si calibra.';
  else if (sensor === 'cal') kept = 'Il collegamento è rimasto: la calibrazione continua dal passo in cui eri.';
  else kept = 'Il collegamento è rimasto.';
  return `${VEIL_LEAD} ${kept}`;
}

// testi della schermata del tutorial sul telefono
export function tutorialTexts(gate, { sensor = 'idle' } = {}){
  const then = sensor === 'ready' ? 'poi si gioca' : 'poi si calibra';
  if (!gate) return null;
  const where = gate.n ? `Scheda ${gate.i + 1} di ${gate.n}${gate.name ? ` · ${gate.name}` : ''}` : '';
  if (gate.v < 2) return { big: 'Guarda lo schermo', sub: `Presa e colpi sono sul computer. Quando hai capito tocca «Tutto chiaro, ho capito»: ${then}.`, where, hint: '' };
  if (!gate.all) return { big: 'Guarda lo schermo', sub: 'Presa e colpi sono sul computer. Sfoglia le schede con ‹ ›.', where, hint: gate.n ? `Viste ${gate.s} di ${gate.n}: alla fine si accende «Tutto chiaro».` : '' };
  return { big: 'Hai visto tutto', sub: `Tocca «Tutto chiaro, ho capito»: ${then}.`, where, hint: '' };
}
