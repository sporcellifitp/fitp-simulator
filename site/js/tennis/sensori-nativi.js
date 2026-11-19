// B71 (19/11, registri della fiera del 18 e 19/11, docs/b71/sensori.md) · sensori presi dall'app «NATPF Racchetta» 1.0.5
// invece che da devicemotion. Senza DOM: lo provano i test (tools/test/sensori-nativi.test.mjs); racchetta.js lo collega.
//
// Perché: devicemotion di Chrome legge l'ultimo valore dei sensori con un timer a 60 Hz sul thread della pagina; se la
// pagina si ferma (tocchi sul blocco del B51: buchi da ~200 ms in 137 partite-telefono su 437, correlazione con i tocchi
// 0,87) quei campioni si perdono. L'app li tiene in un buffer con l'istante vero (natpf-android CampioniNativi.java) e la
// pagina li prende a lotti: un thread fermo li riceve in ritardo, ma tutti e con l'istante giusto (il rilevatore lavora
// sul tempo dei campioni).
//
// Prudenza, nell'ordine:
//  1. solo con il ponte dell'app della versione giusta (sensoriVersione() === NATIVI.protocollo), altrimenti niente:
//     senza l'app (Chrome) il percorso dei sensori è quello di sempre, identico;
//  2. PROVA: browser e app insieme; i colpi li guida ancora il browser. Blocchi di 1 s confrontati: gravità media uguale
//     entro 0,5 m/s² a telefono quasi fermo (stesso segno e stesse unità dell'accelerazione), rotazione dello stesso segno
//     e della stessa misura sugli assi che si muovono (correlazione dei tratti da 50 ms ≥ 0,8, rapporto 0,8–1,25). Solo
//     con la gravità e almeno un blocco di rotazione giusti si passa all'app; se qualcosa non torna, resta il browser
//     (motivo 'g' gravità, 'r' rotazione). Senza movimento la prova aspetta (i colpi intanto vanno come prima);
//  3. con l'app: nessun campione per FERMI_MS a pagina visibile → di nuovo il browser (motivo 'f'); ponte che dà errore →
//     browser (motivo 'p').
// Unità e assi uguali a Chrome su Android (accelerationIncludingGravity, acceleration in m/s², rotationRate in °/s con
// alpha = x, beta = y, gamma = z: device_motion_event_pump.cc di Chromium): il segno salvato del telefono dello stand
// (motion-sign.js) non cambia.

export const NATIVI = Object.freeze({
  protocollo: 1,
  ogniMs: 16,            // ogni quanto la pagina chiede i campioni all'app
  intervallo: 16.7,      // intervallo dichiarato dei campioni dell'app (ms): come «interval» di devicemotion
  bloccoMs: 1000,        // blocco della prova
  trattoMs: 50,          // tratti della prova sulla rotazione (un ritardo di 10–20 ms tra i due flussi non conta)
  tolG: .5,              // gravità media: scarto massimo per asse (m/s²)
  fermoStd: 1.5,         // gravità giudicata solo a telefono quasi fermo (deviazione per asse sotto questa, m/s²)
  g: [7, 12.5],          // gravità credibile (m/s²)
  minRot: 15,            // un asse si giudica se si muove almeno così (°/s, media quadratica dei tratti)
  minCorr: .8,           // correlazione minima dei tratti (con il segno: un segno opposto dà −1)
  rapporto: [.8, 1.25],  // misura della rotazione app/browser
  maxNo: 2,              // blocchi di rotazione sbagliati: al secondo resta il browser
  fermiMs: 500,          // con l'app: nessun campione per tanto a pagina visibile → browser
  graziaMs: 1500,        // dopo l'avvio o il ritorno in primo piano i sensori hanno tempo per ripartire
  orologioMs: 5000,      // ogni quanto si riallinea l'orologio dell'app con quello della pagina
});

const fin = Number.isFinite;
const MAX_BLOCCO = 400;

// Il ponte dell'app, se c'è ed è della versione giusta; altrimenti null (Chrome, app di prima della 1.0.5)
export function nativeBridge(win){
  const b = win?.NATPFApp;
  if (!b) return null;
  for (const f of ['sensoriVersione', 'sensoriAvvia', 'sensoriFerma', 'campioni', 'orologio']) if (typeof b[f] !== 'function') return null;
  try { return Number(b.sensoriVersione()) === NATIVI.protocollo ? b : null; } catch { return null; }
}

// Testo dell'app (CampioniNativi.svuota): «persi;t,ax,ay,az,lx,ly,lz,ra,rb,rg;…» in interi (µs, decimi). Campioni come
// sampleFromMotion (swing-detect.js): { t (ms sull'orologio dell'app), rot [alpha, beta, gamma], acc, accG }
export function parseBatch(text){
  if (typeof text !== 'string' || !text) return { persi: 0, campioni: [] };
  const parti = text.split(';'), persi = Number(parti[0]), campioni = [];
  const n = s => (s === '' || s == null ? NaN : Number(s));
  for (let i = 1; i < parti.length; i++){
    const c = parti[i].split(',');
    if (c.length !== 10) continue;
    const v = c.map(n), t = v[0]/1000;
    if (!fin(t)) continue;
    const tre = (a, k = 10) => (fin(v[a]) && fin(v[a + 1]) && fin(v[a + 2]) ? [v[a]/k, v[a + 1]/k, v[a + 2]/k] : null);
    campioni.push({ t, rot: tre(7), acc: tre(4), accG: tre(1) });
  }
  return { persi: fin(persi) && persi > 0 ? persi : 0, campioni };
}

// Orologio dell'app (elapsedRealtime, ms) → orologio della pagina (performance.now): la lettura con l'andata e ritorno più
// breve tra alcune. Si rifà ogni orologioMs e al ritorno in primo piano (con il telefono addormentato i due orologi si
// staccano: elapsedRealtime corre anche nel sonno profondo, performance.now no)
export function createClock(bridge, now){
  let off = null, at = -Infinity;
  const sync = (n = 5) => {
    let best = null;
    for (let i = 0; i < n; i++){
      const a = now(), c = Number(bridge.orologio()), z = now();
      if (!fin(c)) continue;
      if (!best || z - a < best.rtt) best = { rtt: z - a, off: (a + z)/2 - c };
    }
    if (best){ off = best.off; at = now(); }
    return best;
  };
  return {
    sync,
    get offset(){ return off; },
    maybe(t){ if (t - at >= NATIVI.orologioMs) sync(3); },
    // (al microsecondo, come gli istanti dell'app: niente decimali spuri dalla somma)
    toPage(tApp){ return off == null ? null : Math.round((tApp + off)*1000)/1000; },
  };
}

// Prova all'avvio: i campioni del browser e dell'app degli stessi istanti. tick(now) chiude un blocco ogni bloccoMs e dà
// il verdetto: null (si continua), { ok: true } (si passa all'app) o { ok: false, why: 'g' | 'r' }
export function createCrossCheck(o = {}){
  const P = { ...NATIVI, ...o };
  let B = [], N = [], t0 = null, gOk = 0, rOk = 0, rNo = 0, verdict = null;
  const blocks = [];
  const inside = (L, a, z) => L.filter(k => k.t >= a && k.t <= z);
  function evaluate(){
    if (B.length < 10 || N.length < 10) return;
    const a = Math.max(B[0].t, N[0].t), z = Math.min(B[B.length - 1].t, N[N.length - 1].t);
    if (z - a < P.bloccoMs/2) return;
    const b = inside(B, a, z), n = inside(N, a, z), out = { g: null, r: null };
    // gravità: medie per asse a telefono quasi fermo
    const gb = b.filter(k => k.accG), gn = n.filter(k => k.accG);
    if (gb.length >= 10 && gn.length >= 10){
      const mean = (L, i) => L.reduce((s, k) => s + k.accG[i], 0)/L.length;
      const mb = [0, 1, 2].map(i => mean(gb, i)), mn = [0, 1, 2].map(i => mean(gn, i));
      const sd = [0, 1, 2].map(i => Math.sqrt(gb.reduce((s, k) => s + (k.accG[i] - mb[i])**2, 0)/gb.length));
      const g = Math.hypot(...mb);
      if (Math.max(...sd) < P.fermoStd && g >= P.g[0] && g <= P.g[1]) out.g = mb.every((v, i) => Math.abs(v - mn[i]) <= P.tolG);
    }
    // rotazione: tratti da trattoMs, media per asse in ogni tratto, correlazione con il segno e rapporto delle misure
    const bins = Math.floor((z - a)/P.trattoMs), xb = [[], [], []], xn = [[], [], []];
    for (let j = 0; j < bins; j++){
      const lo = a + j*P.trattoMs, hi = lo + P.trattoMs;
      const sb = b.filter(k => k.rot && k.t >= lo && k.t < hi), sn = n.filter(k => k.rot && k.t >= lo && k.t < hi);
      if (!sb.length || !sn.length) continue;
      for (let i = 0; i < 3; i++){ xb[i].push(sb.reduce((s, k) => s + k.rot[i], 0)/sb.length); xn[i].push(sn.reduce((s, k) => s + k.rot[i], 0)/sn.length); }
    }
    const judged = [];
    for (let i = 0; i < 3; i++){
      const m = xb[i].length;
      if (m < 5) continue;
      const bb = xb[i].reduce((s, v) => s + v*v, 0), nn = xn[i].reduce((s, v) => s + v*v, 0), bn = xb[i].reduce((s, v, j) => s + v*xn[i][j], 0);
      const rmsB = Math.sqrt(bb/m);
      if (rmsB < P.minRot) continue;
      const corr = bb && nn ? bn/Math.sqrt(bb*nn) : 0, ratio = Math.sqrt(nn/m)/rmsB;
      judged.push(corr >= P.minCorr && ratio >= P.rapporto[0] && ratio <= P.rapporto[1]);
    }
    if (judged.length) out.r = judged.every(Boolean);
    blocks.push(out);
    if (out.g === true) gOk++;
    if (out.r === true) rOk++;
    if (out.r === false) rNo++;
    if (out.g === false) verdict = { ok: false, why: 'g' };
    else if (rNo >= P.maxNo) verdict = { ok: false, why: 'r' };
    else if (gOk >= 1 && rOk >= 1 && rOk > 2*rNo) verdict = { ok: true };
  }
  return {
    // (al più MAX_BLOCCO campioni per flusso in un blocco: se il browser tace, quelli dell'app non si accumulano)
    browser(k){ if (!verdict && k && fin(k.t) && B.length < MAX_BLOCCO){ if (t0 == null) t0 = k.t; B.push(k); } },
    native(k){ if (!verdict && k && fin(k.t) && N.length < MAX_BLOCCO) N.push(k); },
    tick(now){
      if (verdict || t0 == null || now - t0 < P.bloccoMs) return verdict;
      evaluate(); B = []; N = []; t0 = null;
      return verdict;
    },
    get verdict(){ return verdict; },
    get blocks(){ return blocks.slice(); },
  };
}

// Sorgente dei sensori per racchetta.js. Stati: 'off' (niente app o non avviato), 'prova' (browser e app insieme: i colpi
// li guida il browser), 'nativi' (li guida l'app), 'browser' (l'app non va: di nuovo devicemotion, motivo in why).
//   bridge: nativeBridge(window) (null = sempre 'off'); onSample(k): un campione dell'app per il rilevatore (solo in
//   'nativi'); onState(state, why): cambio di stato; every/stopEvery: setInterval/clearInterval (le prove li fingono)
export function createNativeMotion({ bridge = null, now = () => performance.now(), every = (f, ms) => setInterval(f, ms), stopEvery = id => clearInterval(id), onSample = () => {}, onState = () => {}, check = {} } = {}){
  let state = 'off', why = null, timer = null, clock = null, cross = null, lastNative = -Infinity, lastFed = -Infinity, lastArrival = -Infinity, graceUntil = 0, hidden = false, persi = 0, info = null;
  const set = (s, w = null) => { if (s === state && w === why) return; state = s; why = w; onState(s, w); };
  const halt = () => { if (timer != null){ stopEvery(timer); timer = null; } try { bridge?.sensoriFerma(); } catch {} };
  const fail = w => { halt(); set('browser', w); };
  function poll(){
    if (state !== 'prova' && state !== 'nativi') return;
    const t = now();
    let text;
    try { clock.maybe(t); text = bridge.campioni(); } catch { fail('p'); return; }
    const { persi: p, campioni } = parseBatch(text);
    persi += p;
    for (const k0 of campioni){
      const tp = clock.toPage(k0.t);
      if (tp == null || tp <= lastNative) continue;
      const k = { ...k0, t: tp };
      lastNative = tp; lastArrival = t;
      if (state === 'prova'){ cross.native(k); continue; }
      // (al rilevatore sempre in avanti: dopo il passaggio dal browser i campioni dell'app hanno l'istante vero, un po'
      // prima di quello dell'evento del browser, e i primi possono essere già coperti)
      if (tp <= lastFed) continue;
      lastFed = tp; onSample(k);
    }
    if (state === 'prova'){
      const v = cross.tick(t);
      if (v?.ok) set('nativi');
      else if (v) fail(v.why);
    } else if (!hidden && t > graceUntil && t - lastArrival > NATIVI.fermiMs) fail('f');
  }
  return {
    get state(){ return state; },
    get why(){ return why; },
    // 'n' se i colpi li guidano i sensori dell'app, 'b' se li guida il browser
    get source(){ return state === 'nativi' ? 'n' : 'b'; },
    // il browser serve ancora (prova in corso): racchetta.js gli passa i suoi campioni
    get wantsBrowser(){ return state === 'prova'; },
    get feeds(){ return state === 'nativi'; },
    get persi(){ return persi; },
    get interval(){ return NATIVI.intervallo; },
    // fondo scala dichiarato dall'app [accelerazione m/s², rotazione °/s] (infoSensori), null se non c'è
    get fullScale(){
      if (info === null && bridge && typeof bridge.infoSensori === 'function'){
        try { const j = JSON.parse(bridge.infoSensori()); const a = j?.acc?.[0], g = j?.gir?.[0]; info = fin(a) && fin(g) ? [a, g] : false; } catch { info = false; }
      }
      return info || null;
    },
    start(){
      if (!bridge || state === 'prova' || state === 'nativi' || state === 'browser') return state;
      let ok = false;
      try { clock = createClock(bridge, now); ok = !!bridge.sensoriAvvia() && !!clock.sync(); } catch { ok = false; }
      if (!ok){ fail('p'); return state; }
      cross = createCrossCheck(check); lastNative = -Infinity; lastFed = -Infinity; graceUntil = now() + NATIVI.graziaMs; hidden = false;
      set('prova');
      timer = every(poll, NATIVI.ogniMs);
      return state;
    },
    // campione del browser durante la prova (il rilevatore lo usa comunque, come sempre)
    browser(k){ if (state === 'prova'){ cross.browser(k); if (fin(k?.t) && k.t > lastFed) lastFed = k.t; } },
    poll,
    hidden(){ hidden = true; },
    visible(){ hidden = false; graceUntil = now() + NATIVI.graziaMs; try { clock?.sync(3); } catch {} },
    // «Riattiva i sensori»: con l'app si riaccendono anche i suoi
    revive(){ if (state === 'prova' || state === 'nativi'){ try { bridge.sensoriAvvia(); } catch {} graceUntil = now() + NATIVI.graziaMs; } },
    stop(){ halt(); if (state !== 'browser') set('off'); },
  };
}
