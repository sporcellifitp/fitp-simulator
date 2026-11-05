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
    '#enableTouch': (S('enable') || S('error')) && !touch,
    // mano e movimento: prima di attivare i sensori e alla verifica della calibrazione (non nel tutorial né in «Pronto»)
    '#profileOptions': S('enable') || S('error') || (S('cal') && calStep === 'review'),
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

// testi della schermata del tutorial sul telefono
export function tutorialTexts(gate, { sensor = 'idle' } = {}){
  const then = sensor === 'ready' ? 'poi si gioca' : 'poi si calibra';
  if (!gate) return null;
  const where = gate.n ? `Scheda ${gate.i + 1} di ${gate.n}${gate.name ? ` · ${gate.name}` : ''}` : '';
  if (gate.v < 2) return { big: 'Guarda lo schermo', sub: `Sul computer ci sono la presa e i colpi. Quando hai capito tocca «Tutto chiaro, ho capito», qui in alto: ${then}.`, where, hint: '' };
  if (!gate.all) return { big: 'Guarda lo schermo', sub: 'Sul computer ci sono la presa e i colpi: sfoglia le schede con ‹ ›, qui o sul computer.', where, hint: gate.n ? `Viste ${gate.s} di ${gate.n}: «Tutto chiaro» si accende dopo l’ultima.` : '' };
  return { big: 'Hai visto tutto', sub: `Tocca «Tutto chiaro, ho capito», qui in alto: ${then}. Puoi ancora rivedere le schede con ‹ ›.`, where, hint: '' };
}
