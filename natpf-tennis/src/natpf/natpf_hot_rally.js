// «Scambio che si scalda» (B20; audit B19 `docs/b19/audit-1v1-utenti.md`, punto 3 e miglioramento 2; decisione
// dell'utente del 10/11: «sì, ma come opzione»). Opzione dello staff, SPENTA di base.
// Accesa, nella partita tra due persone nello stesso schermo (due telefoni): dal 10° colpo dello scambio la palla va via
// via più veloce a ogni colpo, per tutti e due allo stesso modo, finché uno sbaglia. Si vede: la scritta «Scambio caldo»
// con il numero del colpo e la scia del colpo potente. Serve a non avere scambi senza fine tra due persone che hanno
// preso il tempo (nel 1v1 la palla accelerava solo fino all'8° colpo e la qualità del colpo non faceva mai sbagliare).
// Spenta: il fattore è esattamente 1, la partita è identica a prima punto per punto (scripts/audit/b20/scambio-caldo.mjs).
// Non vale contro la CPU, nella sfida tra due computer né con la webcam per due (lì il Player 2 ha regole diverse).
// Dove si accende: pannello dello stand (Ctrl+Maiusc+K, o 3 s sul marchio NATPF del menu) → «Scambio che si scalda»:
// No · Sì; resta salvata (localStorage, chiave natpf-tennis.scambioCaldo: '1' accesa). Vale dalla partita dopo.
// Come: i colpi normali (dritto, rovescio, tagliato; non pallonetto, palla corta, schiacciata, che hanno il loro volo)
// da `from` in poi passano ogni volta più bassi sulla rete e più carichi (il tagliato solo più basso: resta un tagliato),
// fino al massimo dell'altezza al colpo `from + full − lead − 1` (il 16°); il 10° colpo parte già da `lead + 1` passi su
// `full`, così la palla accelera davvero da quando compare la scritta (revisione: prima al 10° colpo era +1%). Sono le due
// cose che nel motore decidono la velocità della palla (il tempo di volo è quello che serve per passare la rete
// all'altezza voluta, natpf_skill.flightForClear; accorciare solo il tempo non cambiava niente, misurato). In più il
// tempo di volo di base si accorcia di `step` a colpo, fino a `min`. Chi riceve ha meno tempo e la finestra del colpo in
// ritardo si stringe con la velocità della palla (lateSpanOf): prima o poi uno sbaglia il tempo.
// Funzioni pure (le provano i test); le usa game_engine.js (startNewMatch, _natpfRacketShot) e l'etichetta qui sotto.

export const HOT_KEY = 'natpf-tennis.scambioCaldo';
export const HOT_RALLY = Object.freeze({
  from: 10,     // dal 10° colpo dello scambio (il servizio è il 1°)
  step: .035,   // tempo di volo di base −3,5% a ogni colpo da lì in poi
  min: .58,     // al più −42%
  full: 10,     // passi per arrivare al massimo dell'altezza sulla rete
  lead: 3,      // passi già fatti al 10° colpo (4 su 10: la palla è subito più veloce di circa il 10%; massimo al 16° colpo)
  netGap: .16,  // al massimo la palla passa a 16 cm dal nastro (come il colpo super, natpf_stroke_outcome.SUPER.netGap)
  spin: 10,     // … e con 10 di effetto in più (scende prima: può andare più forte e restare in campo)
  maxHeat: 2,   // dopo il massimo dell'altezza l'effetto continua a salire fino al doppio (26° colpo)
});

export function readHotRally({ storage = globalThis.localStorage } = {}){
  try { return storage?.getItem(HOT_KEY) === '1'; } catch { return false; }
}
export function writeHotRally(on, { storage = globalThis.localStorage } = {}){
  try { storage?.setItem(HOT_KEY, on ? '1' : '0'); } catch {}
  return !!on;
}

// quanti colpi «caldi» ha lo scambio al colpo numero n (1 = servizio): 0 prima del 10°, 1 al 10°, 2 all'11°…
export const hotSteps = (n, on = false) => (on ? Math.max(0, (n | 0) - HOT_RALLY.from + 1) : 0);
// fattore sul tempo di volo del colpo numero n. Spenta: 1 esatto
export function hotFlight(n, on = false){
  const k = hotSteps(n, on);
  return k ? Math.max(HOT_RALLY.min, 1 - HOT_RALLY.step*k) : 1;
}
// quanto è caldo lo scambio al colpo n: 0 (freddo) … 1 (massimo, dal colpo from + full − 1)
export const hotHeat = (n, on = false) => { const k = hotSteps(n, on); return k ? Math.min(HOT_RALLY.maxHeat, (k + HOT_RALLY.lead)/HOT_RALLY.full) : 0; };
// Esito del colpo numero n con lo scambio caldo: più basso sulla rete e più carico. out: esito di
// natpf_stroke_outcome.strokeOutcome ({ shot, clear, topspin, … }); netY: altezza della rete al centro. Spenta, prima del
// 10° colpo, o per pallonetto, palla corta, schiacciata e colpi falliti: l'esito resta lo stesso oggetto
export function hotOutcome(out, n, on = false, netY = .914){
  const h = hotHeat(n, on);
  if (!h || !out || out.netFault || out.failed || ['LOB', 'DROP', 'SMASH'].includes(out.shot)) return out;
  const low = netY + HOT_RALLY.netGap;
  // il tagliato resta un tagliato (revisione): solo più basso sulla rete, l'effetto all'indietro non cambia
  return { ...out, clear: out.clear > low ? out.clear + (low - out.clear)*Math.min(1, h) : out.clear, topspin: out.shot === 'SLICE' ? out.topspin : out.topspin + HOT_RALLY.spin*h, hot: h };
}

// l'opzione vale per questa partita? Solo tra due persone nello stesso schermo con i due telefoni; `forced` a mano
// (engine.natpfHotRally, test e simulazioni) comanda sulla scelta salvata
export function hotRallyFor({ split = false, webcam = false, forced = null, storage = globalThis.localStorage } = {}){
  if (!split || webcam) return false;
  return typeof forced === 'boolean' ? forced : readHotRally({ storage });
}

// pannello dello stand: scritta del pulsante e avviso dopo il clic
export const hotButton = on => (on ? 'Sì · dal 10° colpo' : 'No');
export const hotToast = on => `${on
  ? 'Scambio che si scalda acceso: nello stesso schermo dal 10° colpo la palla va sempre più veloce per tutti e due'
  : 'Scambio che si scalda spento: scambi come sempre'}. Vale dalla prossima partita; resta salvata`;

// Scritta sul grande schermo (funzione pura): null se non c'è niente da mostrare.
// g: { on (l'opzione vale per questa partita), phase, inPlay, strokes (colpi giocati nello scambio) }
export function hotRallyView(g = {}){
  if (!g.on || g.phase !== 'RALLY' || !g.inPlay) return null;
  const n = g.strokes | 0, k = hotSteps(n, true);
  if (!k) return null;
  return { big: 'Scambio caldo', sub: `Colpo ${n} · palla sempre più veloce`, level: Math.min(3, 1 + Math.floor((k - 1)/4)) };
}

// etichetta in campo (#natpf-hot-rally), ridisegnata a ogni fotogramma da natpf_ui.tick
export class NatpfHotRallyHud {
  constructor(engine){
    this.engine = engine; this.shown = '';
    this.el = typeof document !== 'undefined' ? document.getElementById('natpf-hot-rally') : null;
  }
  // partita in pausa: la scritta si toglie (tick la rimette alla ripresa)
  hide(){ if (this.el && this.shown){ this.shown = ''; this.el.classList.add('hidden'); } }
  tick(){
    const E = this.engine, el = this.el; if (!el) return;
    const v = hotRallyView({ on: !!E.natpfHot && !E.autoPlayMode, phase: E.phase, inPlay: !!E.ball?.inPlay, strokes: E.ball?.rallyStrokeCount });
    const key = v ? `${v.sub}|${v.level}` : '';
    if (key === this.shown) return;
    this.shown = key;
    el.classList.toggle('hidden', !v);
    if (!v) return;
    el.dataset.level = String(v.level);
    const big = el.querySelector('[data-h="big"]'), sub = el.querySelector('[data-h="sub"]');
    if (big) big.textContent = v.big;
    if (sub) sub.textContent = v.sub;
    // a ogni colpo la scritta «batte» (classe rimessa da capo)
    el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
  }
}
