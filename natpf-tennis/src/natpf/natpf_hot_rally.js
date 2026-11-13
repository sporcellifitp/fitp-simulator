// «Scambio che si scalda».
// B20 (audit B19, decisione dell'utente del 10/11): opzione dello staff, spenta di base, solo nello stesso schermo, dal 10°
// colpo la palla via via più veloce per tutti e due.
// B42 (richiesta dell'utente del 13/11, dopo la partita della 2026-11-13.9: «per scambi prolungati dopo 20 colpi
// consecutivi la probabilità di usare colpi speciali o forti aumenti progressivamente…, in modo tale che la partita
// diventi più spettacolare o veloce e la serie di colpi porti a un risultato»): ACCESO DI BASE e in tutti i modi, contro
// la CPU, nello stesso schermo, nella sfida tra due computer (l'esito lo decide l'host, che manda la scelta al Player 2
// per la scritta) e con la webcam di chi gioca da solo. Non con la webcam per due: lì il Player 2 gioca con le regole
// vecchie, senza l'esito del colpo (audit B19, punto 16), e lo scambio caldo varrebbe per uno solo dei due.
// Dal 20° colpo dello scambio (il servizio è il 1°) cresce a ogni colpo il «calore» (hotHeat), uguale per i due lati:
//   • i colpi normali di tutti (dritto, rovescio, tagliato; non pallonetto, palla corta, schiacciata, che hanno il loro
//     volo) passano più bassi sulla rete, più carichi e con il tempo di volo più corto, cioè più veloci: chi gioca con il
//     telefono o la webcam (game_engine._natpfRacketShot: hotOutcome, hotFlight) e la CPU (_executeOpponentReturn: gli
//     stessi hotOutcome e hotFlight sulla traiettoria del suo colpo);
//   • il colpo super di chi gioca è via via più facile (hotSuper → natpf_stroke_outcome.superShot): basta un gesto un po'
//     meno forte, il tempo può essere meno preciso, la pressione dello scambio lungo non lo toglie più e, a metà del
//     calore, va bene anche la palla veloce e bassa (prima serviva alta, lenta o corta);
//   • la CPU attacca più spesso e sotto pressione sbaglia di più (hotCpu → natpf_skill.cpuReturnPlan); la Leggenda, che
//     sceglie i colpi da sé, entra prima nella pressione e nella chiusura degli scambi lunghi (natpf_legend.legendDecide).
// Nessun punto regalato e nessuna regola diversa per un lato (decisione dell'utente del B25): il vantaggio è solo nel
// gioco. Prima del 20° colpo, e con l'opzione spenta, tutto resta identico punto per punto (impronte delle partite a
// sorteggi fissi: scripts/audit/b42/scambi-lunghi.mjs, docs/b42/scambi-lunghi.md).
// Dove si spegne: pannello dello stand (Ctrl+Maiusc+K, F9 nel programma Windows, o 3 s sul marchio NATPF del menu) →
// «Scambio che si scalda»: Sì · No; resta salvata (localStorage, chiave natpf-tennis.scambioCaldo: '0' spenta,
// '1' accesa; senza chiave accesa). Chi l'aveva già scelta resta con la sua scelta. Vale dalla partita dopo.
// Funzioni pure (le provano i test); le usano game_engine.js, natpf_skill.js, natpf_legend.js e l'etichetta qui sotto.

export const HOT_KEY = 'natpf-tennis.scambioCaldo';
export const HOT_RALLY = Object.freeze({
  from: 20,     // dal 20° colpo dello scambio (il servizio è il 1°; B20: dal 10°)
  step: .035,   // tempo di volo di base −3,5% a ogni colpo da lì in poi
  min: .58,     // al più −42%
  full: 10,     // passi per arrivare al massimo dell'altezza sulla rete
  lead: 1,      // passi già fatti al 20° colpo: calore 0,2 al 20°, 1 al 28°, 2 (il massimo) dal 38°
  netGap: .16,  // al massimo la palla passa a 16 cm dal nastro (come il colpo super, natpf_stroke_outcome.SUPER.netGap)
  spin: 10,     // … e con 10 di effetto in più (scende prima: può andare più forte e restare in campo)
  maxHeat: 2,   // dopo il massimo dell'altezza l'effetto continua a salire fino al doppio
  // colpo super (hotSuper), a calore pieno: soglia della forza del gesto più bassa di superPower, tempo largo superTiming
  // unità in più, qualità chiesta più bassa di superQuality e senza la pressione degli scambi lunghi; dal calore superBall
  // va bene ogni palla. Tra due persone nello stesso schermo il «gesto fortissimo» è rispetto al proprio colpo abituale
  // (natpf_duo_rules.relStrong, 1,3 volte): il margine sopra il proprio colpo si riduce di superRel (1,15 volte)
  superPower: .14, superTiming: .3, superQuality: .1, superBall: .5, superRel: .5,
  // CPU (hotCpu): probabilità in più di un colpo d'attacco (a calore pieno) e di un errore sotto pressione (cresce con il
  // calore fino al doppio)
  cpuAttack: .25, cpuErr: .02,
  // pressione in più per chi gioca con il telefono o la webcam (hotPressure: qualità × (1 − press × calore), al minimo
  // pressMin), come la CPU che sbaglia di più: la palla sempre più veloce si controlla peggio. Con la pressione degli scambi
  // lunghi di sempre (natpf_stroke_outcome.rallyPressure, dal 16° colpo) anche chi non sbaglia mai il tempo (i profili più
  // precisi del banco) arriva sotto la qualità del colpo fallito verso il 34° colpo: lo scambio finisce
  press: .35, pressMin: .4,
  // Leggenda (hotLegend): pressione degli scambi lunghi e chiusura da legendFrom (di base dal 26° e dal 24° colpo), solo
  // colpi per chiudere da legendHard (di base dal 28°), qualità × (1 − legendQ × calore)
  legendFrom: 20, legendHard: 24, legendQ: .1,
});
// Solo per i banchi (scripts/audit/b42): valori che sostituiscono HOT_RALLY in memoria. Vuoto nel gioco
export const hotTuning = {};
const H = () => (Object.keys(hotTuning).length ? { ...HOT_RALLY, ...hotTuning } : HOT_RALLY);

// accesa di base (B42); spenta solo se lo staff l'ha spenta ('0')
export function readHotRally({ storage = globalThis.localStorage } = {}){
  try { return storage?.getItem(HOT_KEY) !== '0'; } catch { return true; }
}
export function writeHotRally(on, { storage = globalThis.localStorage } = {}){
  try { storage?.setItem(HOT_KEY, on ? '1' : '0'); } catch {}
  return !!on;
}

// quanti colpi «caldi» ha lo scambio al colpo numero n (1 = servizio): 0 prima del 20°, 1 al 20°, 2 al 21°…
export const hotSteps = (n, on = false) => (on ? Math.max(0, (n | 0) - H().from + 1) : 0);
// fattore sul tempo di volo del colpo numero n. Spenta o prima del 20° colpo: 1 esatto
export function hotFlight(n, on = false){
  const k = hotSteps(n, on), P = H();
  return k ? Math.max(P.min, 1 - P.step*k) : 1;
}
// quanto è caldo lo scambio al colpo n: 0 (freddo) … 1 (massimo dell'altezza sulla rete) … maxHeat
export const hotHeat = (n, on = false) => { const k = hotSteps(n, on), P = H(); return k ? Math.min(P.maxHeat, (k + P.lead)/P.full) : 0; };
// Esito del colpo numero n con lo scambio caldo: più basso sulla rete e più carico. out: esito di
// natpf_stroke_outcome.strokeOutcome ({ shot, clear, topspin, … }) o traiettoria del colpo della CPU
// (natpf_skill.shotArc: { shot, clear, topspin }); netY: altezza della rete al centro. Spenta, prima del 20° colpo, o
// per pallonetto, palla corta, schiacciata e colpi falliti: l'esito resta lo stesso oggetto
export function hotOutcome(out, n, on = false, netY = .914){
  const h = hotHeat(n, on), P = H();
  if (!h || !out || out.netFault || out.failed || ['LOB', 'DROP', 'SMASH', 'MOON'].includes(out.shot)) return out;
  const low = netY + P.netGap;
  // il tagliato resta un tagliato (B20, revisione): solo più basso sulla rete, l'effetto all'indietro non cambia
  return { ...out, clear: out.clear > low ? out.clear + (low - out.clear)*Math.min(1, h) : out.clear, topspin: out.shot === 'SLICE' ? out.topspin : out.topspin + P.spin*h, hot: h };
}
// Pressione in più dello scambio caldo per chi gioca con il telefono o la webcam (fattore sulla pressione degli scambi
// lunghi, natpf_stroke_outcome.rallyPressure): 1 esatto prima del 20° colpo e con l'opzione spenta
export const hotPressure = (n, on = false) => { const h = hotHeat(n, on), P = H(); return h ? Math.max(P.pressMin, 1 - P.press*h) : 1; };
// Colpo super più facile (natpf_stroke_outcome.superShot, campo `ease`): null se lo scambio non è caldo. pressure: la
// pressione degli scambi lunghi del colpo (natpf_stroke_outcome.rallyPressure): con lo scambio caldo non toglie il super
export function hotSuper(n, on = false, pressure = 1){
  const h = hotHeat(n, on), P = H();
  if (!h) return null;
  const c = Math.min(1, h);
  return { power: P.superPower*c, timing: P.superTiming*c, quality: P.superQuality*c, anyBall: h >= P.superBall, rel: P.superRel*c, pressure: Number.isFinite(pressure) && pressure > 0 ? pressure : 1 };
}
// … e la soglia relativa al proprio colpo abituale (natpf_duo_rules.relStrong: ratio volte il colpo abituale), più bassa
// con lo scambio caldo; fuori dallo scambio caldo (ease null) la stessa
export const hotRatio = (ratio, ease) => (ease ? 1 + (ratio - 1)*(1 - ease.rel) : ratio);
// CPU con lo scambio caldo (natpf_skill.cpuReturnPlan): probabilità in più di un colpo d'attacco e di un errore. Fredda: 0
export function hotCpu(n, on = false){
  const h = hotHeat(n, on), P = H();
  return h ? { attack: P.cpuAttack*Math.min(1, h), err: P.cpuErr*h } : { attack: 0, err: 0 };
}

// Leggenda con lo scambio caldo (natpf_legend.legendDecide). L: i valori della Leggenda ({ pressureFrom, closeFrom,
// closeHard }); n: il numero del colpo della CPU. Spenta, o prima del 20° colpo: quelli di L e qualità × 1, identici
export function hotLegend(n, on = false, L = {}){
  const P = H(), h = hotHeat(n, on), base = { pressureFrom: L.pressureFrom, closeFrom: L.closeFrom, closeHard: L.closeHard, q: 1 };
  if (!on) return base;
  // la soglia vale già quando lo scambio non è ancora caldo (rallyPressure e la chiusura guardano i colpi giocati): prima
  // del 20° colpo non cambia niente perché i valori di prima (26, 24, 28) sono più alti di legendFrom e legendHard
  return { pressureFrom: Math.min(L.pressureFrom ?? Infinity, P.legendFrom), closeFrom: Math.min(L.closeFrom ?? Infinity, P.legendFrom), closeHard: Math.min(L.closeHard ?? Infinity, P.legendHard), q: 1 - P.legendQ*h };
}

// l'opzione vale per questa partita? Sempre (accesa di base), tranne con la webcam per due; `forced` a mano
// (engine.natpfHotRally: test e simulazioni) comanda sulla scelta salvata
export function hotRallyFor({ split = false, webcam = false, forced = null, storage = globalThis.localStorage } = {}){
  if (split && webcam) return false;
  return typeof forced === 'boolean' ? forced : readHotRally({ storage });
}

// pannello dello stand: scritta del pulsante e avviso dopo il clic
export const hotButton = on => (on ? `Sì · dal ${HOT_RALLY.from}° colpo` : 'No');
export const hotToast = on => `${on
  ? `Scambio che si scalda acceso: dal ${HOT_RALLY.from}° colpo dello scambio colpi sempre più forti per tutti e due`
  : 'Scambio che si scalda spento: scambi come sempre'}. Vale dalla prossima partita; resta salvata`;

// Scritta sul grande schermo (funzione pura): null se non c'è niente da mostrare. Piccola, senza frasi (B42: l'utente ha
// chiesto meno testi durante la partita): «Scambio caldo · colpo 23».
// g: { on (l'opzione vale per questa partita), phase, inPlay, strokes (colpi giocati nello scambio) }
export function hotRallyView(g = {}){
  if (!g.on || g.phase !== 'RALLY' || !g.inPlay) return null;
  const n = g.strokes | 0, k = hotSteps(n, true);
  if (!k) return null;
  return { big: 'Scambio caldo', sub: `colpo ${n}`, level: Math.min(3, 1 + Math.floor((k - 1)/4)) };
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
