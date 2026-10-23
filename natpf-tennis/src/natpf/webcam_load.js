// Webcam: misure del ritmo (camera, inferenza, età del dato) e carico del modello delle mani (richiesta del 23/10,
// docs/NATPF_DIAGNOSI_2026-10-23.md §5). Senza DOM: lo usa motion_controls.js, i test lo provano da solo.
//
// Il modello delle mani gira nel thread del gioco: mentre lavora il gioco non disegna. Con la camera a 30 fotogrammi
// al secondo, un'inferenza di 25 ms occupa tre quarti del thread e il gioco salta fotogrammi; e più l'inferenza è lenta,
// più la mano si sposta tra due letture e il modello la perde. Livelli, dal più preciso al più leggero:
//   piena:   modello completo, fino a 2 mani (la scelta della mano di chi gioca vede anche l'altra mano)
//   leggera: modello leggero, fino a 2 mani
//   minima:  modello leggero, 1 mano: la ricerca delle mani nell'immagine gira solo quando la mano si perde (costa circa
//            la metà), ma una mano sbagliata (l'altra di chi gioca, di chi guarda) resta seguita finché non esce
// Si scende di un livello quando la mediana delle ultime inferenze supera il budget, dopo il riscaldamento (le prime
// inferenze di un modello appena caricato sono lente); prima, dopo quick inferenze, se la mediana è oltre far volte il
// budget (un computer molto lento non aspetta una finestra intera). Non si risale nella stessa sessione (niente
// altalena). Ogni cambio va nel registro con la misura che l'ha deciso. Il budget: con la camera a 30 Hz, 16 ms sono
// metà del thread del gioco. Il modello nuovo si carica al primo invio senza un punto in gioco (motion_controls.js).
export const WEBCAM_LEVELS = Object.freeze([
  Object.freeze({ id: 'piena', modelComplexity: 1, maxNumHands: 2 }),
  Object.freeze({ id: 'leggera', modelComplexity: 0, maxNumHands: 2 }),
  Object.freeze({ id: 'minima', modelComplexity: 0, maxNumHands: 1 }),
]);
export const WEBCAM_LOAD = Object.freeze({ budgetMs: 16, window: 30, warmup: 12, quick: 10, far: 3 });

const fin = v => typeof v === 'number' && Number.isFinite(v);
const r1 = v => (fin(v) ? Math.round(v*10)/10 : null);
function pct(a, q){
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q*(s.length - 1))))];
}

export function levelIndex(id){ const i = WEBCAM_LEVELS.findIndex(l => l.id === id); return i < 0 ? 0 : i; }

// start: livello di partenza; fixed: livello imposto (confronto sul dispositivo, ?webcamLivello=...): nessun cambio
export function createLoadGovernor({ start = 'piena', fixed = false, budgetMs = WEBCAM_LOAD.budgetMs, window = WEBCAM_LOAD.window, warmup = WEBCAM_LOAD.warmup, quick = WEBCAM_LOAD.quick, far = WEBCAM_LOAD.far } = {}){
  let idx = levelIndex(start), skip = warmup, recent = [];
  return {
    get level(){ return WEBCAM_LEVELS[idx]; },
    get fixed(){ return fixed; },
    // modello ricaricato da fuori (webcam riaccesa): di nuovo il riscaldamento
    restart(){ skip = warmup; recent = []; },
    // tempo di un'inferenza (ms): { level, from, p50, why } quando si cambia livello, altrimenti null
    push(ms){
      if (!fin(ms) || ms < 0) return null;
      if (skip > 0){ skip--; return null; }
      recent.push(ms); if (recent.length > window) recent.shift();
      if (fixed || recent.length < quick || idx >= WEBCAM_LEVELS.length - 1) return null;
      const p50 = pct(recent, .5);
      if (p50 <= (recent.length < window ? far*budgetMs : budgetMs)) return null;
      const from = WEBCAM_LEVELS[idx];
      idx++; recent = []; skip = warmup;
      return { level: WEBCAM_LEVELS[idx], from, p50: r1(p50), why: `inferenza mediana ${r1(p50)} ms oltre ${budgetMs} ms` };
    },
  };
}

// Misure al secondo. frame(): un richiamo del fotogramma (istante e metadati). I fotogrammi della camera si contano dai
// fotogrammi presentati (presentedFrames): con il thread del gioco occupato il browser salta dei richiami, e quelli
// saltati sono i fotogrammi «persi dal browser» (la pagina non li ha visti);
// infer(): un'inferenza finita (ms); use(): un dato della mano usato dal gioco, con la sua età dalla cattura (ms).
// flush() restituisce il tratto e riparte: camera (fotogrammi al secondo, intervallo p95, buco più lungo, fotogrammi
// persi dal browser), inferenze (quante, p50, p95, massimo), fotogrammi senza inferenza, età del dato (p50, massimo)
export function createWebcamStats(){
  let w = null, lastMedia = null, lastAt = null, lastPresented = null;
  const reset = () => { w = { frames: 0, calls: 0, ints: [], gap: 0, inf: [], ages: [] }; };
  reset();
  return {
    frame(now, md = {}){
      w.calls++;
      const n = fin(md.presentedFrames) && lastPresented != null && md.presentedFrames > lastPresented ? Math.min(100, md.presentedFrames - lastPresented) : 1;
      w.frames += n;
      // intervallo tra i fotogrammi della camera: dal tempo del flusso (ritmo vero della camera), diviso per i fotogrammi
      // passati dall'ultimo richiamo; senza, dall'istante del richiamo
      const media = fin(md.mediaTime) ? md.mediaTime*1000 : null;
      const dt = media != null && lastMedia != null ? media - lastMedia : lastAt != null ? now - lastAt : null;
      if (fin(dt) && dt > 0 && dt < 5000){ w.ints.push(dt/n); if (n === 1 && dt > w.gap) w.gap = dt; }
      if (fin(md.presentedFrames)) lastPresented = md.presentedFrames;
      lastMedia = media; lastAt = now;
    },
    infer(ms){ if (fin(ms) && ms >= 0) w.inf.push(ms); },
    use(ageMs){ if (fin(ageMs) && ageMs >= 0 && ageMs < 5000) w.ages.push(ageMs); },
    get pending(){ return w.frames + w.inf.length; },
    flush(spanMs){
      const s = fin(spanMs) && spanMs > 0 ? spanMs/1000 : 1;
      const out = {
        fps: w.frames ? r1(w.frames/s) : 0,
        intervalloP95: r1(pct(w.ints, .95)), buco: r1(w.gap || null), persiDalBrowser: Math.max(0, w.frames - w.calls),
        inferenze: w.inf.length, inferenzeAlSecondo: r1(w.inf.length/s),
        inferenzaP50: r1(pct(w.inf, .5)), inferenzaP95: r1(pct(w.inf, .95)), inferenzaMax: r1(w.inf.length ? Math.max(...w.inf) : null),
        senzaInferenza: Math.max(0, w.frames - w.inf.length),
        etaP50: r1(pct(w.ages, .5)), etaMax: r1(w.ages.length ? Math.max(...w.ages) : null),
        // thread del gioco occupato dall'inferenza (%)
        caricoPercento: r1(100*w.inf.reduce((a, b) => a + b, 0)/(s*1000)),
      };
      reset();
      return out;
    },
  };
}
