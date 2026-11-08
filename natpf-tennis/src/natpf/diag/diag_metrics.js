// Metriche di una sessione diagnostica, calcolate dagli eventi registrati (stesso codice nel browser, nel rapporto e
// nello script di confronto). Nessuna metrica dichiara un errore di riconoscimento senza un riferimento: precisione di
// lato, tipo e direzione solo per i colpi della prova guidata (evento «atteso»), che restano da verificare nel video.
// Tempi in ms dall'inizio della sessione (orologio del computer), salvo dove indicato.

export const pct = (a, p) => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p*s.length))] : null; };
const r1 = v => (Number.isFinite(v) ? Math.round(v*10)/10 : null);
// massimo e minimo senza spargere l'array negli argomenti (sessioni lunghe: centinaia di migliaia di valori)
const maxOf = a => { let m = -Infinity; for (const x of a) if (Number.isFinite(x) && x > m) m = x; return m === -Infinity ? null : m; };
const minOf = a => { let m = Infinity; for (const x of a) if (Number.isFinite(x) && x < m) m = x; return m === Infinity ? null : m; };
// distribuzione: quanti, media, mediana, p90, p99, massimo e jitter (p90 − p10)
export function dist(a){
  const v = a.filter(Number.isFinite);
  if (!v.length) return { n: 0 };
  const m = v.reduce((s, x) => s + x, 0)/v.length;
  return { n: v.length, media: r1(m), p50: r1(pct(v, .5)), p90: r1(pct(v, .9)), p99: r1(pct(v, .99)), max: r1(maxOf(v)), jitter: r1(pct(v, .9) - pct(v, .1)) };
}
const count = (a, f) => a.reduce((n, x) => n + (f(x) ? 1 : 0), 0);
const tally = (a, f) => { const o = {}; for (const x of a){ const k = f(x); if (k != null) o[k] = (o[k] || 0) + 1; } return o; };
const groupBy = (a, f) => { const o = {}; for (const x of a){ const k = f(x); if (k != null) (o[k] ||= []).push(x); } return o; };
const r2 = v => (Number.isFinite(v) ? Math.round(v*100)/100 : null);
// mediana e scarto interquartile (da 3 valori): quanto sono ripetibili gesti ed esiti
const spread = a => { const v = a.filter(Number.isFinite); return v.length ? { p50: r2(pct(v, .5)), iqr: v.length >= 3 ? r2(pct(v, .75) - pct(v, .25)) : null } : null; };

// numeri dei colpi del telefono: quelli mancanti. Una pagina ricaricata riparte da 1 (nuovo tratto); sul percorso
// veloce l'ordine d'arrivo può cambiare, quindi si contano i numeri che mancano tra il minimo e il massimo di ogni tratto
export function missingInSequence(ns){
  let missing = 0, seg = new Set(), min = Infinity, max = -Infinity;
  const close = () => { if (seg.size) missing += (max - min + 1) - seg.size; seg = new Set(); min = Infinity; max = -Infinity; };
  for (const n of ns){
    if (!Number.isInteger(n)) continue;
    if (seg.size && (n < max - 20 || (n === 1 && max > 1))) close();
    seg.add(n); min = Math.min(min, n); max = Math.max(max, n);
  }
  close();
  return missing;
}
// orologio del telefono rispetto al computer dagli scambi {d invio PC, p telefono, r ricezione PC}: per ogni finestra di
// 10 s lo scambio con il viaggio più breve (come NTP), poi una retta: scarto, deriva in ppm e residuo
export function clockFit(samples){
  const s = samples.filter(x => [x.d, x.p, x.r].every(Number.isFinite) && x.r >= x.d).map(x => ({ t: (x.d + x.r)/2, rtt: x.r - x.d, off: x.p - (x.d + x.r)/2 }));
  if (s.length < 3) return { campioni: s.length };
  const win = new Map();
  for (const x of s){ const k = Math.floor(x.t/10000), b = win.get(k); if (!b || x.rtt < b.rtt) win.set(k, x); }
  const best = [...win.values()];
  const mt = best.reduce((a, x) => a + x.t, 0)/best.length, mo = best.reduce((a, x) => a + x.off, 0)/best.length;
  let num = 0, den = 0; for (const x of best){ num += (x.t - mt)*(x.off - mo); den += (x.t - mt)**2; }
  const slope = den > 0 ? num/den : 0;
  const resid = best.map(x => Math.abs(x.off - (mo + slope*(x.t - mt))));
  return { campioni: s.length, finestre: best.length, rtt: dist(s.map(x => x.rtt)), derivaPpm: best.length > 2 ? r1(slope*1e6) : null, residuoMs: r1(pct(resid, .9)), spanS: r1((s.at(-1).t - s[0].t)/1000) };
}
// direzione di un colpo dal punto di rimbalzo e dal lato del contatto (+1 alla destra di chi gioca, guardando la rete):
// incrociato se la palla va dall'altra parte oltre 1 m dal centro, lungolinea se resta dalla stessa parte oltre 1 m
export function shotDirection(landingX, contactSide){
  if (!Number.isFinite(landingX) || !contactSide) return null;
  const v = landingX*contactSide;
  return v <= -1 ? 'incrociato' : v >= 1 ? 'lungolinea' : 'centro';
}

// direzione voluta con il tempo del colpo (racchetta virtuale, natpf_stroke_outcome.js): oltre il 15% della finestra in
// anticipo incrociato, in ritardo lungolinea; null senza esito della racchetta
export function timingDirection(t){
  if (!Number.isFinite(t)) return null;
  return t >= .15 ? 'incrociato' : t <= -.15 ? 'lungolinea' : 'centro';
}

// colpo richiesto nella prova guidata: «normale» vale per dritto e rovescio piatti o arrotati
const NORMAL = new Set(['topspin', 'flat', 'drive', 'normale']);
export const sameShot = (want, got) => (want === 'normale' ? NORMAL.has(String(got || '').toLowerCase()) : String(want) === String(got || '').toLowerCase());
// Webcam: camera chiesta e ottenuta, ritmo misurato al secondo (camera, inferenza, età del dato, thread occupato) e
// livelli del modello delle mani, anche separati per livello (confronto sullo stesso computer)
function webcamRhythm(cams, secs, changes){
  const out = {};
  const cam = cams.at(-1);
  if (cam) out.camera = { chiesto: cam.chiesto ?? null, ottenuto: cam.ottenuto ?? null, nome: cam.nome ?? null, richiamiFotogrammi: cam.richiamiFotogrammi ?? null };
  const live = secs.filter(s => (s.fps || 0) > 0 || (s.inferenze || 0) > 0);
  if (live.length){
    const sum = k => live.reduce((a, s) => a + (Number.isFinite(s[k]) ? s[k] : 0), 0);
    const part = list => ({
      secondi: list.length, worker: list.every(s => s.worker === true),
      fpsCamera: { p5: r1(pct(list.map(s => s.fps), .05)), p50: r1(pct(list.map(s => s.fps), .5)) },
      inferenzeAlSecondo: r1(pct(list.map(s => s.inferenzeAlSecondo), .5)),
      inferenzaMs: { p50: r1(pct(list.map(s => s.inferenzaP50), .5)), p95: r1(pct(list.map(s => s.inferenzaP95), .95)), max: r1(maxOf(list.map(s => s.inferenzaMax))) },
      caricoPercento: { p50: r1(pct(list.map(s => s.caricoPercento), .5)), max: r1(maxOf(list.map(s => s.caricoPercento))) },
      etaDatoMs: { p50: r1(pct(list.map(s => s.etaP50), .5)), max: r1(maxOf(list.map(s => s.etaMax))) },
    });
    Object.assign(out, part(live), {
      intervalloCameraMsP95: r1(pct(live.map(s => s.intervalloP95), .5)), bucoCameraMs: r1(maxOf(live.map(s => s.buco))),
      fotogrammiSenzaInferenza: sum('senzaInferenza'), richiamiPersiDalBrowser: sum('persiDalBrowser'),
    });
    const levels = [...new Set(live.map(s => s.livello).filter(Boolean))];
    if (levels.length) out.perLivello = Object.fromEntries(levels.map(l => [l, part(live.filter(s => s.livello === l))]));
  }
  // cambi decisi dalla misura, con l'istante in cui il modello nuovo è stato caricato (fuori dai punti)
  const decided = changes.filter(c => !c.applicato), applied = changes.filter(c => c.applicato);
  if (decided.length || cam) out.livello = { iniziale: decided[0]?.da ?? cam?.livello ?? null, finale: decided.at(-1)?.a ?? cam?.livello ?? null,
    cambi: decided.map(c => ({ t: c.t, da: c.da, a: c.a, p50: c.p50, caricatoT: applied.find(x => x.a === c.a && x.t >= c.t)?.t ?? null })) };
  return out;
}
// Stati della mano (webcam.stato: durata dello stato finito): secondi per stato, perdite (stato «persa») con la loro
// durata, riprese, pause della partita per la mano persa o la camera ferma
function webcamStates(changes, pauses){
  if (!changes.length && !pauses.length) return {};
  const secs = {}, lost = [];
  for (const c of changes){
    if (!c.da || !Number.isFinite(c.ms)) continue;
    secs[c.da] = r1((secs[c.da] || 0) + c.ms/1000);
    if (c.da === 'persa') lost.push(c.ms);
  }
  return { statiMano: { secondi: secs, perse: count(changes, c => c.a === 'persa'), persaMs: dist(lost), riprese: count(changes, c => c.a === 'ripresa') }, pause: pauses.length ? tally(pauses, p => p.motivo || '?') : null };
}
// tipi di evento che le metriche leggono: l'analisi a righe (diag_analysis.js) tiene in memoria solo questi
export const METRIC_KINDS = new Set(['tel.colpo', 'tel.orologio', 'tel.stato', 'tel.link', 'tel.scartato', 'tel.prep', 'tel.dispositivo', 'webcam.frame', 'webcam.evento', 'webcam.camera', 'webcam.ritmo', 'webcam.carico', 'webcam.stato', 'webcam.modello', 'webcam.riapertura', 'webcam.pausa', 'tel.pausa', 'tel.ripresa', 'tel.ricollega', 'tel2.link', 'tel2.colpo', 'prestazioni',
  'colpo.gioco', 'racchetta', 'piano', 'servizio', 'vuoto', 'input', 'punto', 'rimbalzo', 'tentativo', 'atteso', 'avviso', 'video', 'marca', 'sfida.colpo', 'sfida.colpo_vecchio', 'popup', 'partita']);
// ms dal rimbalzo della palla dell'avversario al colpo di chi gioca qui (evento racchetta entro 1,5 s, prima di un altro
// rimbalzo o di un punto)
function bounceToContact(events){
  const out = [];
  let b = null;
  for (const e of events){
    if (e.k === 'rimbalzo'){ b = e.da === 'opponent' || e.da === 'p2' ? e : null; continue; }
    if (e.k === 'punto'){ b = null; continue; }
    if (b && e.k === 'racchetta' && e.chi === 'player'){ if (e.t - b.t <= 1500) out.push(e.t - b.t); b = null; }
  }
  return out;
}
// events: tutti gli eventi, oppure solo quelli di METRIC_KINDS con eventi (quanti erano in tutto) e spanMs (dal primo
// all'ultimo); raw: campioni del telefono (bastano k e q), t per i buchi negli arrivi
// scarto (m) tra la caduta calcolata di un colpo della racchetta e il primo rimbalzo vero della sua palla, prima del colpo
// dopo (null se la palla non rimbalza: in rete, al volo dell'avversario, fine del punto)
function landingGap(k, events){
  if (!Number.isFinite(k?.x) || !Number.isFinite(k?.z)) return null;
  const who = k.chi === 'p2' ? 'opponent' : 'player';
  for (const e of events){
    if (e.t <= k.t) continue;
    if (e.k === 'racchetta' || e.k === 'punto') return null;
    if (e.k === 'rimbalzo' && e.da === who) return +Math.hypot(e.x - k.x, e.z - k.z).toFixed(2);
  }
  return null;
}
// Contatori cumulativi del collegamento (tel.link.copie: link.js li tiene per tutta la vita del collegamento) ridotti alla
// sessione: somma degli aumenti tra un riassunto e il successivo, quindi senza quanto contato prima che la registrazione
// partisse (diagnostiche del 30/10, C8: il primo tel.link aveva già {58, 41, 297}). Un valore che scende è un collegamento
// nuovo, che riparte da zero: vale il valore intero.
export function sessionCounters(samples){
  const list = samples.filter(x => x && typeof x === 'object');
  if (!list.length) return null;
  const out = {};
  for (const k of Object.keys(list.at(-1))) out[k] = 0;
  for (let i = 1; i < list.length; i++) for (const [k, v] of Object.entries(list[i])){
    if (!Number.isFinite(v)) continue;
    const p = list[i - 1][k];
    out[k] = (out[k] || 0) + (Number.isFinite(p) && v >= p ? v - p : v);
  }
  return out;
}
// Buchi negli arrivi dei campioni del telefono sul computer (raw.t, ms dall'inizio della sessione): solo la sessione,
// non la finestra del collegamento che comincia prima (C8: un buco di 2941 ms nato prima della registrazione)
function arrivalGaps(raw){
  const ts = raw.map(x => x.t).filter(Number.isFinite), d = ts.slice(1).map((t, i) => t - ts[i]).filter(x => x >= 0);
  return d.length ? { maxMs: r1(maxOf(d)), oltre100ms: count(d, x => x > 100), p99Ms: r1(pct(d, .99)) } : null;
}
function phoneTiming(events){
  const rk = events.filter(e => e.k === 'racchetta' && e.chi === 'player' && Number.isFinite(e.tempoMs));
  if (rk.length) return { tempoTelefonoMs: dist(rk.map(x => x.tempoMs)), tempoTelefonoFonte: 'racchetta' };
  const tt = events.filter(e => e.k === 'tentativo' && Number.isFinite(e.tauMs));
  return { tempoTelefonoMs: dist(tt.map(x => x.tauMs)), ...(tt.length ? { tempoTelefonoFonte: 'tentativo' } : {}) };
}
// ---- lato delle palle per partita (B16 · decisione (d) dell'utente sulla mira più sensibile: «ok ma come lo misuro?») ----
// Per chi gioca con il telefono (P1 e, nel 1v1, P2), partita per partita: dove vanno le sue palle nel suo riferimento
// (x del punto di caduta del colpo, evento «racchetta»: + alla destra di chi colpisce guardando la rete; per il P2 la x del
// campo cambia segno). Il punto di caduta è quello calcolato dal colpo (la direzione scelta), non il rimbalzo vero: lo
// scarto tra i due è in racchetta.cadutaScartoM. Si contano tutti i colpi dello scambio, anche quelli finiti in rete o
// fuori; non i servizi, l'allenamento (riscaldamento compreso), i minigiochi e i colpi della webcam (che non ha la mira
// del piatto). Misure: quota a sinistra · al centro (entro SIDE.center m dal centro) · a destra; |mediana x| per blocchi
// di SIDE.block colpi (come il banco del B15, scripts/audit/colpi.mjs «partite»; l'ultimo blocco solo se ha almeno
// SIDE.minBlock colpi); verdetto con la soglia SIDE.share sulle metà del campo (x > 0 contro x < 0: «palle da una
// parte», come nel banco del B15, docs/b15/audit-colpi.md §8) e almeno SIDE.min colpi. Il mancino è a specchio: la
// parte è quella vista da chi gioca, e il testo dice anche se è la parte del dritto o del rovescio (come per il destro).
export const SIDE = Object.freeze({ center: 1, share: .7, min: 20, block: 20, minBlock: 10, alert: .2 });
const fmtN = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '–');
const median = a => { const v = a.filter(Number.isFinite).sort((x, y) => x - y), m = v.length >> 1; return v.length ? (v.length % 2 ? v[m] : (v[m - 1] + v[m])/2) : null; };
const modeOf = a => { const c = tally(a, x => x); const top = Object.entries(c).sort((p, q) => q[1] - p[1])[0]; return top ? top[0] : null; };
const AIM_NAMES = { 17: 'alta', 20: 'media', 23: 'bassa' };
export const aimName = deg => (Number.isFinite(+deg) && AIM_NAMES[+deg] ? AIM_NAMES[+deg] : null);
const isPhoneShot = e => !e.fonte || /phone/.test(String(e.fonte));
export function sideJudge(xs, { hand = null } = {}){
  const v = xs.filter(Number.isFinite), n = v.length, pc = k => (n ? Math.round(100*k/n) : null);
  const left = count(v, x => x < -SIDE.center), right = count(v, x => x > SIDE.center), halfL = count(v, x => x < 0), halfR = count(v, x => x > 0);
  const blocks = [];
  for (let i = 0; i < n; i += SIDE.block){
    const b = v.slice(i, i + SIDE.block);
    if (b.length >= SIDE.minBlock) blocks.push({ colpi: `${i + 1}–${i + b.length}`, mediana: r2(Math.abs(median(b))) });   // solo l'ultimo può essere corto
  }
  const side = halfR >= halfL ? 'destra' : 'sinistra', share = n ? Math.max(halfL, halfR)/n : 0;
  const verdetto = n < SIDE.min ? 'pochi colpi' : share >= SIDE.share ? 'sbilanciata' : 'equilibrata';
  // parte del dritto: per il destro la sua destra, per il mancino la sua sinistra
  const fh = hand === 'left' ? 'sinistra' : hand === 'right' ? 'destra' : null;
  const colpo = fh ? (side === fh ? 'dritto' : 'rovescio') : null;
  const testo = verdetto === 'pochi colpi' ? `troppo pochi colpi per giudicare (${n}, ne servono ${SIDE.min})`
    : verdetto === 'sbilanciata' ? `sbilanciata a ${side}${colpo ? ` (dalla parte del ${colpo})` : ''}: ${pc(Math.max(halfL, halfR))} % dei colpi da quella parte`
    : `equilibrata: ${pc(halfL)} % dei colpi nella metà sinistra del campo, ${pc(halfR)} % nella destra`;
  return { colpi: n, sinistraPercento: pc(left), centroPercento: pc(n - left - right), destraPercento: pc(right), metaSinistraPercento: pc(halfL), metaDestraPercento: pc(halfR),
    medianaX: r2(median(v)), blocchi: blocks, verdetto, lato: verdetto === 'sbilanciata' ? side : null, latoColpo: verdetto === 'sbilanciata' ? colpo : null, quotaPercento: n ? pc(Math.max(halfL, halfR)) : null, testo };
}
export function sideBalance(events, { meta = {} } = {}){
  const partite = [];
  let cur = null;
  const open = (p, t) => { cur = { n: p?.n ?? null, inizioS: Number.isFinite(t) ? r1(t/1000) : null, modo: p?.modo ?? null, '1v1': !!p?.['1v1'], ...(p ? {} : { senzaInizio: true }), p: p || null, shots: { player: [], p2: [] } }; partite.push(cur); };
  for (const e of events){
    if (e.k === 'partita'){ if (!(e.continua && cur && cur.n === e.n)) open(e, e.t); continue; }
    if (e.k !== 'racchetta' || (e.chi !== 'player' && e.chi !== 'p2') || e.allenamento || e.minigioco || !isPhoneShot(e) || !Number.isFinite(e.x)) continue;
    if (!cur) open(null, e.t);         // partita già iniziata quando è partita la registrazione, o pacchetto di prima del B16
    cur.shots[e.chi].push(e);
  }
  const out = [], tot = { giudicate: 0, sbilanciate: 0 }, perMira = {};
  for (const m of partite){
    const giocatori = {};
    for (const [chi, label] of [['player', 'P1'], ['p2', 'P2']]){
      const L = m.shots[chi];
      if (!L.length) continue;
      const hand = modeOf(L.map(e => e.mano).filter(Boolean)) || (chi === 'p2' ? m.p?.mano2 : m.p?.mano ?? meta?.gioco?.mano) || null;
      const deg = +(modeOf(L.map(e => e.miraPiena).filter(Number.isFinite)) ?? m.p?.miraPiena ?? meta?.gioco?.miraPiena ?? NaN);
      const j = sideJudge(L.map(e => (chi === 'p2' ? -e.x : e.x)), { hand });
      giocatori[label] = { mano: hand, miraPiena: Number.isFinite(deg) ? deg : null, mira: aimName(deg), ...j };
      if (j.verdetto !== 'pochi colpi'){
        const k = Number.isFinite(deg) ? String(deg) : 'non registrata', g = (perMira[k] ||= { giudicate: 0, sbilanciate: 0 });
        tot.giudicate++; g.giudicate++; if (j.verdetto === 'sbilanciata'){ tot.sbilanciate++; g.sbilanciate++; }
      }
    }
    if (Object.keys(giocatori).length) out.push({ n: m.n, inizioS: m.inizioS, modo: m.modo, '1v1': m['1v1'], ...(m.senzaInizio ? { senzaInizio: true } : {}), giocatori });
  }
  return { nota: `x del punto di caduta dei colpi del telefono nel riferimento di chi gioca (+ alla sua destra); centro entro ${SIDE.center} m; sbilanciata con almeno il ${100*SIDE.share} % dei colpi in una metà del campo su almeno ${SIDE.min} colpi`,
    soglia: { quotaPercento: 100*SIDE.share, colpiMinimi: SIDE.min, centroM: SIDE.center, bloccoColpi: SIDE.block },
    partite: out, riepilogo: { ...tot, sbilanciatePercento: tot.giudicate ? Math.round(100*tot.sbilanciate/tot.giudicate) : null, perMiraPiena: perMira } };
}
// righe in parole (pannello della diagnostica, rapporto, LEGGIMI, scripts/audit/lato-palle.mjs)
export function sideLines(lp, { prefix = 'Lato delle palle' } = {}){
  if (!lp?.partite?.length) return [];
  const L = [], hands = { right: 'destro', left: 'mancino' };
  for (const m of lp.partite){
    const what = m.senzaInizio ? 'colpi prima dell\'inizio di una partita registrato' : `partita ${m.n ?? '?'}`;
    for (const [who, g] of Object.entries(m.giocatori)){
      const mira = g.miraPiena ? `mira ${g.mira || ''}${g.mira ? ' ' : ''}${g.miraPiena}°` : 'mira non registrata';
      const bl = g.blocchi.length ? ` · |mediana x| per ${SIDE.block} colpi ${g.blocchi.map(b => fmtN(b.mediana)).join(' / ')} m` : '';
      L.push(`${prefix}${prefix ? ' · ' : ''}${what} · ${who} (${hands[g.mano] || 'mano ?'}, ${mira}): ${g.colpi} colpi · sinistra ${g.sinistraPercento} % · centro ${g.centroPercento} % · destra ${g.destraPercento} %${bl} → ${g.testo}`);
    }
  }
  const R = lp.riepilogo;
  if (R?.giudicate){
    const per = Object.entries(R.perMiraPiena || {}).map(([k, g]) => `${aimName(k) ? `mira ${aimName(k)} (${k}°)` : k === 'non registrata' ? 'mira non registrata' : `mira ${k}°`}: ${g.sbilanciate} su ${g.giudicate}`).join(' · ');
    L.push(`${prefix ? `${prefix}, in tutto` : 'In tutto'}: ${R.sbilanciate} partite sbilanciate su ${R.giudicate} giudicate (per giocatore)${per ? ` · ${per}` : ''}${R.giudicate >= 5 && R.sbilanciate/R.giudicate > SIDE.alert ? ' · più di una su cinque: controlla la calibrazione, poi prova una mira meno sensibile (docs/GUIDA_MISURA_MIRA.md §6)' : ''}`);
  }
  return L;
}

export function computeMetrics(events, { raw = [], meta = {}, eventi = null, spanMs = null } = {}){
  const by = k => events.filter(e => e.k === k);
  const durata = Number.isFinite(spanMs) ? spanMs/1000 : events.length ? (events.at(-1).t - events[0].t)/1000 : 0;
  const out = { versione: 1, durataS: r1(meta.durationS ?? durata), controller: meta.controller ?? null, trasporto: meta.transport ?? null, build: meta.build ?? by('sessione')[0]?.build ?? null };

  // ---- telefono ----
  const colpi = by('tel.colpo');
  // anche senza colpi arrivati (il telefono li ha scartati tutti, o non ne sono partiti): conta cosa è successo là
  if (colpi.length || raw.length || by('tel.orologio').length || by('tel.scartato').length || by('tel.link').length || by('tel.dispositivo').length){
    const ok = colpi.filter(c => !c.scartato), ns = colpi.map(c => c.n);
    const tipi = {}; for (const c of ok){ const k = `${c.lato || '?'}/${c.tipo || '?'}`; tipi[k] = (tipi[k] || 0) + 1; }
    const ts = raw.map(k => k.k).filter(Number.isFinite), dts = ts.slice(1).map((t, i) => t - ts[i]).filter(d => d > 0);
    const gaps = dts.filter(d => d > 50);
    const qs = raw.map(k => k.q).filter(Number.isInteger);
    const lostRaw = qs.length > 1 ? Math.max(0, (maxOf(qs) - minOf(qs) + 1) - new Set(qs).size) : null;
    const stati = by('tel.stato');
    let cadute = 0, prev = null, giuMs = 0, giuDa = null;
    for (const s of stati){
      const up = s.collegamento === 'connected';
      if (prev === true && !up){ cadute++; giuDa = s.t; }
      if (up && giuDa != null){ giuMs += s.t - giuDa; giuDa = null; }
      prev = up;
    }
    // percorso della prima copia dei colpi, contato nella sola sessione (sessionCounters)
    const percorsi = sessionCounters(by('tel.link').map(l => l.copie));
    // buco più lungo tra due messaggi dei sensori (ms) e arrivi a grappolo, dai riassunti al secondo del collegamento;
    // senza il primo riassunto (se ce ne sono altri), la cui finestra comincia prima della registrazione (C8)
    const allLinks = by('tel.link'), links = allLinks.length > 1 ? allLinks.slice(1) : allLinks, gapOf = l => maxOf([l.gap?.rs, l.gap?.fo, l.gap?.bin].filter(Number.isFinite));
    const arrivi = arrivalGaps(raw);
    const scartatiTel = by('tel.scartato'), disp = by('tel.dispositivo').at(-1) || null;
    out.telefono = {
      sensori: { campioni: raw.length, hzMediana: dts.length ? r1(1000/pct(dts, .5)) : null, intervalloP95Ms: r1(pct(dts, .95)), buchiOltre50ms: gaps.length, buchiTotaleS: r1(gaps.reduce((a, d) => a + d, 0)/1000), persiInRete: lostRaw },
      colpi: { ricevuti: colpi.length, usati: ok.length, scartati: tally(colpi.filter(c => c.scartato), c => c.scartato), mancantiNellaNumerazione: missingInSequence(ns), primoPercorso: percorsi },
      tempiMs: { rilevamento: dist(ok.map(c => c.rilevamento)), attesaPreparazione: dist(ok.map(c => c.attesa)), consegna: dist(ok.map(c => c.consegna)), totale: dist(ok.map(c => c.totale)) },
      orologio: clockFit(by('tel.orologio')),
      collegamento: { cadute, fuoriLineaS: r1(giuMs/1000), paginaNascosta: count(stati, s => s.visibile === false), bloccoSchermo: tally(stati.filter(s => s.schermo != null), s => s.schermo),
        ...(links.some(l => l.gap) ? { sensoriBuco: dist(links.map(gapOf)), secondiConBuchiOltre100ms: count(links, l => gapOf(l) > 100), grappoli: links.reduce((a, l) => a + Object.values(l.grappoli || {}).reduce((x, y) => x + y, 0), 0) } : {}),
        ...(arrivi ? { sensoriArrivi: arrivi } : {}) },
      // gesti valutati sul telefono e non mandati come colpo, con il motivo (telefoni aggiornati, solo con la diagnostica)
      ...(scartatiTel.length ? { scartatiSulTelefono: tally(scartatiTel, x => x.perche || '?') } : {}),
      ...(by('tel.prep').length ? { preparazioni: by('tel.prep').length } : {}),
      ...(disp ? { dispositivo: { browser: disp.ua || null, versione: disp.version || null, bloccoSchermo: disp.wakeLock ?? null, sensori: disp.motion ?? null } } : {}),
      tipi,
      // racchetta virtuale: quanti colpi portano la forma del gesto (telefono aggiornato) e come è fatta (salita della
      // testa −1…+1, |piano| 1 = orizzontale, 0 = verticale); intenzione letta dal computer
      forma: { colpi: count(ok, c => c.forma), salita: dist(ok.map(c => c.forma?.salita)), piano: dist(ok.map(c => Number.isFinite(c.forma?.piano) ? Math.abs(c.forma.piano) : null)) },
      intenzione: tally(ok.filter(c => c.intenzione), c => c.intenzione.tipo),
    };
  }

  // ---- webcam ----
  const frames = by('webcam.frame'), wev = by('webcam.evento'), wcam = by('webcam.camera'), writ = by('webcam.ritmo'), wcar = by('webcam.carico'), wst = by('webcam.stato');
  if (frames.length || wev.length || writ.length || wst.length){
    let perse = 0, persaDa = null, persaMs = 0, prima = null;
    // colpo anticipato (event, quello che il gioco usa) e conferma alla fine del gesto (confirm, solo per la diagnostica):
    // quanto spesso coincidono. È coerenza, non precisione: la precisione si misura solo con la prova guidata
    const coppie = [];
    for (const e of wev){
      if (e.tipo === 'lost'){ perse++; persaDa = e.t; }
      if (e.tipo === 'found' && persaDa != null){ persaMs += e.t - persaDa; persaDa = null; }
      if (e.tipo === 'event') prima = e;
      else if (e.tipo === 'confirm' && prima && e.t - prima.t < 1500){ coppie.push([prima, e]); prima = null; }
    }
    out.webcam = {
      fotogrammi: frames.length, fpsElaborazione: durata > 0 ? r1(frames.length/durata) : null,
      inferenzaMs: dist(frames.map(f => f.inferMs)), fonte: tally(frames, f => f.source || 'nessuna'),
      piuManiPercento: frames.length ? r1(100*count(frames, f => (f.hands || 0) > 1)/frames.length) : null,
      perdite: perse, perditeS: r1(persaMs/1000), eventi: count(wev, e => e.tipo === 'event'),
      conferme: coppie.length ? { n: coppie.length, latoUgualePercento: r1(100*count(coppie, ([a, b]) => a.side === b.side)/coppie.length), tipoUgualePercento: r1(100*count(coppie, ([a, b]) => a.shotType === b.shotType)/coppie.length) } : null,
      // passaggi al flusso ottico (mano non tornata dopo l'attesa, mano uscita dal bordo), mani di altri scartate, recupero
      // automatico (webcam_argon_track.js)
      alFlusso: { manoNonTornata: count(frames, f => f.reason === 'mano non tornata'), manoUscita: count(frames, f => f.reason === 'mano uscita dal bordo') },
      maniScartate: count(frames, f => f.reason === 'mano diversa da quella seguita'),
      recupero: { modelloSbloccato: count(by('webcam.modello'), m => m.stato === 'sbloccato'), modelloRicaricato: count(by('webcam.modello'), m => m.stato === 'ricaricato'),
        cameraRiaperta: count(by('webcam.riapertura'), m => m.stato === 'riuscita'), cameraNonRiaperta: count(by('webcam.riapertura'), m => m.stato === 'fallita') },
      ...webcamRhythm(wcam, writ, wcar),
      ...webcamStates(wst, by('webcam.pausa')),
    };
  }

  // ---- gioco ----
  const perf = by('prestazioni');
  if (perf.length){
    out.gioco = {
      fps: { p5: r1(pct(perf.map(p => p.fps), .05)), p50: r1(pct(perf.map(p => p.fps), .5)) },
      fotogrammaMs: { p95: r1(pct(perf.map(p => p.p95), .5)), p99: r1(pct(perf.map(p => p.p95), .99)), max: r1(maxOf(perf.map(p => p.max))) },
      fotogrammiLunghi: perf.reduce((a, p) => a + (p.lunghi || 0), 0),
      // fotogrammi oltre 25 ms (uno saltato a 60 Hz: scatto visibile), in percentuale dei fotogrammi
      ...(perf.some(p => Number.isFinite(p.doppi)) ? { fotogrammiDoppiPercento: r1(100*perf.reduce((a, p) => a + (p.doppi || 0), 0)/Math.max(1, perf.reduce((a, p) => a + (Number.isFinite(p.n) ? p.n : p.fps || 0), 0))) } : {}),
      aggiornamentoMsP95: r1(pct(perf.map(p => p.upd95), .5)), disegnoMsP95: r1(pct(perf.map(p => p.ren95), .5)),
      memoriaMB: r1(maxOf(perf.map(p => p.heapMB))),
      compitiLunghi: perf.reduce((a, p) => a + (p.compiti || 0), 0),
      // costo del registratore sul thread del gioco: ms al secondo (mediana, massimo) e scrittura più lunga
      registratoreMsAlSecondo: { p50: r1(pct(perf.map(p => p.regMs), .5)), max: r1(maxOf(perf.map(p => p.regMs))) }, registratoreScritturaMaxMs: r1(maxOf(perf.map(p => p.regMax))),
    };
  }
  const esiti = by('colpo.gioco').filter(c => c.chi === 'giocatore');
  const input = by('input');
  if (esiti.length || input.length || by('punto').length){
    const grade = g => /VERY EARLY/i.test(g) ? 'molto in anticipo' : /EARLY/i.test(g) ? 'anticipo' : /VERY LATE|TOO LATE/i.test(g) ? 'molto in ritardo' : /LATE/i.test(g) ? 'ritardo' : /PERFECT|POWER/i.test(g) ? 'perfetto' : /GOOD|NICE/i.test(g) ? 'buono' : 'altro';
    out.colpi = {
      input: tally(input, i => `${i.fonte || '?'}:${i.tipo || '?'}`),
      esiti: tally(esiti, c => c.esito), tempo: tally(esiti.filter(c => c.esito === 'hit'), c => grade(c.tempo || '')),
      direzione: tally(esiti.filter(c => c.esito === 'hit'), c => c.direzione), rimbalzi: by('rimbalzo').length, punti: by('punto').length,
      // tempo dei colpi del telefono rispetto all'impatto ideale (ms; positivo = anticipo, negativo = ritardo): una
      // mediana lontana da zero dice un ritardo sistematico (per esempio lo schermo). Dal tempo con cui il motore ha
      // giocato il colpo (racchetta.tempoMs di chi gioca qui); tentativo.tauMs è il tempo al primo tentativo, prima della
      // finestra d'impatto, e non è quello di chi gioca (C8: 43,8 contro 233 ms). Registrazioni vecchie senza «racchetta»:
      // come prima, con la fonte dichiarata
      ...phoneTiming(events),
    };
  }

  // ---- racchetta virtuale: intenzione dal gesto, esito senza caso, ripetibilità (docs/NATPF_RACCHETTA_VIRTUALE.md) ----
  const rk = by('racchetta').filter(x => x.chi === 'player'), vuoti = by('vuoto').filter(v => v.chi !== 'p2'), piani = by('piano').filter(p => p.chi === 'giocatore');
  const serv = by('servizio').filter(x => x.chi === 'giocatore'), forme = by('tel.colpo').filter(c => !c.scartato && c.forma);
  if (rk.length || vuoti.length || piani.length || serv.length || forme.length){
    // esito di ogni colpo della racchetta (evento «racchetta»); la variazione tra colpi uguali è in «ripetibilita»
    out.racchetta = {
      nota: 'esiti dei colpi di chi gioca: il motore non aggiunge caso, gesti simili danno esiti simili (variazione in ripetibilita)',
      colpi: rk.length, voluti: tally(rk, x => x.voluto), esiti: tally(rk, x => x.colpo), falliti: tally(rk.filter(x => x.fallito), x => (x.rete ? 'rete' : 'lungo')),
      assistiti: count(rk, x => x.assistito), alVolo: count(rk, x => x.volee), tempoMs: dist(rk.map(x => x.tempoMs)), qualitaPercento: dist(rk.map(x => (Number.isFinite(x.qualita) ? 100*x.qualita : null))),
      // tempo nella finestra della direzione (% della finestra, + anticipo) e colpi oltre la finestra (tempo sbagliato)
      tempoInFinestraPercento: dist(rk.map(x => (Number.isFinite(x.tempo) ? 100*x.tempo : null))), oltreLaFinestraPercento: rk.length ? r1(100*count(rk, x => x.oltre > 0)/rk.length) : null,
      // direzione calcolata (mira tra le righe, + a destra di chi colpisce) e scarto tra la caduta calcolata e il primo
      // rimbalzo vero dopo il colpo (m): dice se la fisica porta la palla dove il modello dice
      mira: dist(rk.map(x => x.mira)), cadutaScartoM: dist(rk.map(x => landingGap(x, events))),
      piani: tally(piani, p => p.tipo), vuoti: tally(vuoti, v => v.perche),
      // altezza della palla nel punto d'impatto previsto dopo il rimbalzo (m) e tempo dal rimbalzo della palla
      // dell'avversario al proprio colpo (ms): con l'impatto appena dopo il rimbalzo chi gioca non vede la palla salire
      contattoAltezzaCm: dist(piani.filter(p => p.tipo === 'ground' && Array.isArray(p.contatto)).map(p => 100*p.contatto[1])),
      rimbalzoContattoMs: dist(bounceToContact(events)),
      servizi: serv.length ? { n: serv.length, tipi: tally(serv, x => x.tipo), voti: tally(serv, x => x.voto), qualitaPercento: dist(serv.map(x => (Number.isFinite(x.qualita) ? 100*x.qualita : null))), dalColmoMs: dist(serv.map(x => x.tauMs)) } : null,
    };
  }

  // ---- Player 2 del 1v1 (tra due computer o sullo stesso schermo): colpi ricevuti dall'host e che cosa ne è stato,
  // esiti della racchetta, colpi a vuoto, servizi dal gesto (diagnostica 142438, C11: prima il P2 non aveva una sezione)
  const rk2 = by('racchetta').filter(x => x.chi === 'p2'), vuoti2 = by('vuoto').filter(v => v.chi === 'p2'), serv2 = by('servizio').filter(x => x.chi === 'p2');
  const ric2 = by('sfida.colpo'), vecchi2 = by('sfida.colpo_vecchio'), piani2 = by('piano').filter(p => p.chi === 'p2');
  if (rk2.length || vuoti2.length || serv2.length || ric2.length || vecchi2.length){
    out.p2 = {
      ricevuti: ric2.length, esitiRicevuti: tally(ric2, x => x.esito || '?'), etaMs: dist(ric2.map(x => x.eta)), vecchi: vecchi2.length,
      colpi: rk2.length, voluti: tally(rk2, x => x.voluto), esiti: tally(rk2, x => x.colpo), falliti: tally(rk2.filter(x => x.fallito), x => (x.rete ? 'rete' : 'lungo')),
      tempoMs: dist(rk2.map(x => x.tempoMs)), oltreLaFinestraPercento: rk2.length ? r1(100*count(rk2, x => x.oltre > 0)/rk2.length) : null,
      vuoti: tally(vuoti2, v => v.perche), piani: tally(piani2, p => p.tipo),
      servizi: serv2.length ? { n: serv2.length, tipi: tally(serv2, x => x.tipo), voti: tally(serv2, x => x.voto), dalColmoMs: dist(serv2.map(x => x.tauMs)) } : null,
    };
  }

  // ---- riferimento: solo prova guidata (colpo richiesto; da verificare nel video) ----
  const attesi = by('atteso');
  if (attesi.length){
    // ogni colpo del telefono o della webcam usa l'ultima richiesta prima di lui
    const rows = [];
    let a = null, j = 0;
    const tagged = [...events.filter(e => e.k === 'tel.colpo' || e.k === 'input' || e.k === 'colpo.gioco' || e.k === 'racchetta' || e.k === 'atteso')].sort((x, y) => x.t - y.t);
    for (const e of tagged){
      if (e.k === 'atteso'){ a = e; continue; }
      if (!a || e.t - a.t > (a.finestraMs || 6000)) continue;
      if (e.k === 'tel.colpo' && !e.scartato) rows.push({ kind: 'tel', a, lato: e.lato, tipo: e.tipo });
      else if (e.k === 'input' && e.fonte === 'webcam') rows.push({ kind: 'cam', a, lato: e.lato, tipo: e.colpo });
      else if (e.k === 'colpo.gioco' && e.chi === 'giocatore' && e.esito === 'hit') rows.push({ kind: 'esito', a, direzione: e.direzione });
      else if (e.k === 'racchetta' && e.chi === 'player') rows.push({ kind: 'tempo', a, dalTempo: timingDirection(e.tempo) });
      j++;
    }
    const gest = rows.filter(r => r.kind === 'tel' || r.kind === 'cam'), dir = rows.filter(r => r.kind === 'esito' && r.a.direzione), dirT = rows.filter(r => r.kind === 'tempo' && r.a.direzione && r.dalTempo);
    const lato = gest.filter(r => r.a.lato), tipo = gest.filter(r => r.a.colpo);
    const matrice = {}; for (const r of tipo){ const k = `${r.a.colpo}→${r.tipo || '?'}`; matrice[k] = (matrice[k] || 0) + 1; }
    const matriceDir = {}; for (const r of dir){ const k = `${r.a.direzione}→${r.direzione || '?'}`; matriceDir[k] = (matriceDir[k] || 0) + 1; }
    out.riferimento = {
      nota: 'riferimento = colpo richiesto dalla prova guidata; un errore va confermato nel video (chi gioca può aver fatto un altro gesto)',
      richieste: attesi.length, gestiConRiferimento: gest.length,
      latoGiustoPercento: lato.length ? r1(100*count(lato, r => r.lato === r.a.lato)/lato.length) : null,
      tipoGiustoPercento: tipo.length ? r1(100*count(tipo, r => sameShot(r.a.colpo, r.tipo))/tipo.length) : null,
      direzioneGiustaPercento: dir.length ? r1(100*count(dir, r => r.direzione === r.a.direzione)/dir.length) : null,
      // direzione voluta con il tempo del colpo (racchetta virtuale: in anticipo incrociato, in ritardo lungolinea),
      // prima del piatto e dell'esecuzione: dice se chi gioca ha colpito nel momento giusto per la direzione chiesta
      direzioneDalTempoPercento: dirT.length ? r1(100*count(dirT, r => r.dalTempo === r.a.direzione)/dirT.length) : null,
      matriceTipo: matrice, matriceDirezione: matriceDir,
    };
  }

  // ---- ripetibilità (racchetta virtuale) ----
  // stesso colpo, stesso gesto, stesso esito? Con i gesti del telefono (tel.colpo con forma o intenzione) si parte dai
  // gesti, e l'esito (evento racchetta) si lega con il numero del colpo; senza (webcam, colpi d'altro tipo) si parte
  // dagli esiti. Gruppi: il colpo richiesto nella prova guidata, altrimenti lato e tipo letti (dai gesti) o il tipo
  // voluto (dagli esiti). Per ogni gruppo: quanto spesso il tipo è lo stesso e quanto variano (p90 − p10) forma, forza,
  // tempo e punto di caduta. Il modello non ha caso: la variazione è di chi gioca e delle palle
  const gesti = by('tel.colpo').filter(c => !c.scartato && (c.forma || c.intenzione)), esitiR = by('racchetta').filter(x => x.chi === 'player');
  if (gesti.length || esitiR.length){
    const esitoDi = new Map(); for (const x of esitiR) if (Number.isInteger(x.n)) esitoDi.set(x.n, x);
    const base = gesti.length ? gesti.map(g => ({ t: g.t, g, e: Number.isInteger(g.n) ? esitoDi.get(g.n) || null : null, key: `${g.lato || '?'}/${g.tipo || '?'}`, tipo: g.tipo }))
      : esitiR.map(e => ({ t: e.t, g: null, e, key: e.voluto || '?', tipo: e.colpo ? String(e.colpo).toLowerCase() : null }));
    const richieste = by('atteso'), gruppi = {};
    let ai = -1;
    for (const x of base){
      while (ai + 1 < richieste.length && richieste[ai + 1].t <= x.t) ai++;
      const a = ai >= 0 && x.t - richieste[ai].t <= (richieste[ai].finestraMs || 6000) ? richieste[ai] : null;
      (gruppi[a ? a.prova || `${a.lato || '?'}/${a.colpo || '?'}` : x.key] ||= []).push(x);
    }
    const spread = a => { const v = a.filter(Number.isFinite); return v.length >= 2 ? +(pct(v, .9) - pct(v, .1)).toFixed(3) : null; };
    out.ripetibilita = { nota: 'variazione = p90 − p10 tra i colpi dello stesso gruppo (gruppi da almeno 3 colpi)', gruppi: {} };
    for (const [key, L] of Object.entries(gruppi)){
      if (L.length < 3) continue;
      const tipi = tally(L, x => x.tipo), top = Object.entries(tipi).sort((p, q) => q[1] - p[1])[0];
      out.ripetibilita.gruppi[key] = { colpi: L.length, conEsito: count(L, x => x.e), tipo: top ? top[0] : null, tipoUgualePercento: top ? r1(100*top[1]/L.length) : null,
        salita: spread(L.map(x => x.g?.forma?.salita)), forza: spread(L.map(x => x.g?.intenzione?.forza ?? x.e?.forza)), tempo: spread(L.map(x => x.e?.tempo)),
        x: spread(L.map(x => x.e?.x)), profondita: spread(L.map(x => (Number.isFinite(x.e?.z) ? Math.abs(x.e.z) : null))) };
    }
  }

  // ---- lato delle palle per partita (B16): dove vanno le palle di chi gioca con il telefono, partita per partita ----
  const lato = sideBalance(events, { meta });
  if (lato.partite.length) out.latoPalle = lato;

  // ---- pause della partita per il telefono (pagina nascosta, sensori fermi, scollegato) ----
  const telPause = by('tel.pausa');
  if (telPause.length) out.pauseTelefono = tally(telPause, p => (p.chi === 'p2' ? 'P2 ' : '') + (p.motivo || '?'));
  const ricolleghi = by('tel.ricollega');
  if (ricolleghi.length) out.ricollegamenti = tally(ricolleghi, x => (x.chi === 'p2' ? 'P2' : 'P1') + (x.auto ? ' automatico' : ''));

  // ---- segni «qui è successo un problema» (tastiera, pannello o telefono) ----
  const segni = by('marca');
  if (segni.length) out.segni = segni.slice(0, 50).map(x => ({ t: r1(x.t), testo: x.testo || '' }));

  // ---- registrazione ----
  out.registrazione = {
    eventi: eventi ?? events.length, campioniTelefono: raw.length, avvisi: tally(by('avviso'), a => a.codice || a.testo),
    perditeRegistratore: by('avviso').filter(a => a.codice === 'coda').reduce((s, a) => s + (a.persi || 0), 0),
    video: by('video').filter(v => v.stato === 'fine').map(v => ({ file: v.file, durataS: r1(v.durataS), MB: r1(v.byte/1048576) })),
  };
  return out;
}

// Due sessioni con video diversi non si confrontano alla pari: il video del gioco pesa su fotogrammi e consegna dei
// colpi (prova del 21/10, 4 core e codifica software: fotogrammi al 5° percentile da 59 a 48, consegna mediana +13 ms;
// la sola webcam non cambia nulla di misurabile). Testo dell'avviso, o null se i video sono gli stessi
export function compareNote(a, b){
  const vids = m => (m?.registrazione?.video || []).map(v => String(v.file || '').replace(/^video-/, '').replace(/\..*$/, '')).sort().join(' + ') || 'nessuno';
  const va = vids(a), vb = vids(b);
  return va === vb ? null : `Video registrati diversi (prima: ${va}; dopo: ${vb}): il video del gioco pesa su fotogrammi e consegna dei colpi, le prestazioni non si confrontano alla pari.`;
}
// Confronto tra due sessioni: per ogni metrica il verso «migliore» (+1 più alto, −1 più basso, 0 più vicino a zero) e
// la variazione. Le soglie dicono quando una differenza conta (sotto: rumore); «peggio» solo oltre soglia.
export const COMPARE = [
  ['telefono.sensori.hzMediana', 'Frequenza dei sensori (Hz)', +1, 2],
  ['telefono.sensori.buchiOltre50ms', 'Buchi nei sensori > 50 ms', -1, 2],
  ['telefono.colpi.mancantiNellaNumerazione', 'Colpi persi in rete', -1, 0],
  ['telefono.tempiMs.rilevamento.p50', 'Riconoscimento p50 (ms)', -1, 3],
  ['telefono.tempiMs.consegna.p50', 'Consegna p50 (ms)', -1, 3],
  ['telefono.tempiMs.consegna.p99', 'Consegna p99 (ms)', -1, 10],
  ['telefono.tempiMs.consegna.jitter', 'Jitter della consegna (ms)', -1, 5],
  ['telefono.collegamento.cadute', 'Cadute del collegamento', -1, 0],
  ['telefono.orologio.rtt.p50', 'Andata e ritorno p50 (ms)', -1, 3],
  ['webcam.fpsElaborazione', 'Webcam: fotogrammi elaborati al secondo', +1, 2],
  ['webcam.inferenzaMs.p50', 'Webcam: riconoscimento p50 (ms)', -1, 3],
  ['webcam.perdite', 'Webcam: perdite del tracciamento', -1, 0],
  ['webcam.fpsCamera.p50', 'Webcam: fotogrammi della camera al secondo', +1, 2],
  ['webcam.inferenzeAlSecondo', 'Webcam: inferenze al secondo', +1, 2],
  ['webcam.caricoPercento.p50', 'Webcam: tempo occupato dal modello (%)', -1, 5],
  ['webcam.etaDatoMs.p50', 'Webcam: età del dato della mano p50 (ms)', -1, 5],
  ['gioco.fps.p5', 'Gioco: fps (5° percentile)', +1, 2],
  ['gioco.fotogrammaMs.p95', 'Gioco: fotogramma p95 (ms)', -1, 2],
  ['gioco.fotogrammiLunghi', 'Gioco: fotogrammi oltre 50 ms', -1, 2],
  ['colpi.tempoTelefonoMs.p50', 'Tempo dei colpi del telefono, mediana (ms, 0 = ideale)', 0, 10],
  ['riferimento.latoGiustoPercento', 'Prova guidata: lato giusto (%)', +1, 3],
  ['riferimento.tipoGiustoPercento', 'Prova guidata: tipo giusto (%)', +1, 3],
  ['riferimento.direzioneGiustaPercento', 'Prova guidata: direzione giusta (%)', +1, 5],
  ['riferimento.direzioneDalTempoPercento', 'Prova guidata: direzione voluta con il tempo (%)', +1, 5],
  ['racchetta.oltreLaFinestraPercento', 'Colpi oltre la finestra d\'impatto (%)', -1, 3],
];
const get = (o, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
export function compareMetrics(a, b){
  return COMPARE.map(([path, label, better, noise]) => {
    const va = get(a, path), vb = get(b, path);
    if (!Number.isFinite(va) || !Number.isFinite(vb)) return { path, label, prima: va ?? null, dopo: vb ?? null, esito: 'n.d.' };
    const d = vb - va, gain = better === 0 ? Math.abs(va) - Math.abs(vb) : d*better;
    return { path, label, prima: va, dopo: vb, delta: r1(d), esito: Math.abs(better === 0 ? gain : d) <= noise ? 'uguale' : gain > 0 ? 'meglio' : 'peggio' };
  });
}

// riassunto in parole delle metriche (per chi non legge i JSON)
export function summaryLines(m = {}){
  const L = [], T = m.telefono, W = m.webcam, G = m.gioco, R = m.riferimento, C = m.colpi;
  L.push(`Durata ${m.durataS ?? '–'} s${m.controller ? ' · controller ' + m.controller : ''}${m.trasporto ? ' · ' + m.trasporto : ''}${m.build ? ' · build ' + m.build : ''}`);
  if (T){
    const c = T.colpi || {}, d = T.tempiMs?.consegna || {};
    L.push(`Telefono: ${c.usati ?? 0} colpi usati su ${c.ricevuti ?? 0} ricevuti · persi in rete ${c.mancantiNellaNumerazione ?? 0}${Object.keys(c.scartati || {}).length ? ' · scartati: ' + Object.entries(c.scartati).map(([k, v]) => `${k} ${v}`).join(', ') : ''}`);
    if (d.n) L.push(`Consegna dei colpi: mediana ${d.p50} ms · 99% entro ${d.p99} ms · massimo ${d.max} ms · jitter ${d.jitter} ms`);
    if (T.sensori?.campioni) L.push(`Sensori del telefono: ${T.sensori.hzMediana ?? '–'} Hz · buchi oltre 50 ms: ${T.sensori.buchiOltre50ms}${T.sensori.persiInRete ? ' · campioni persi ' + T.sensori.persiInRete : ''}`);
    const k = T.collegamento || {};
    L.push(`Collegamento: ${k.cadute ?? 0} cadute${k.fuoriLineaS ? ` (${k.fuoriLineaS} s)` : ''} · pagina del telefono nascosta ${k.paginaNascosta ?? 0} volte${k.bloccoSchermo && Object.keys(k.bloccoSchermo).length ? ' · schermo: ' + Object.keys(k.bloccoSchermo).join(', ') : ''}`);
    if (k.sensoriBuco?.n) L.push(`Messaggi dei sensori: buco più lungo al secondo mediana ${k.sensoriBuco.p50} ms, massimo ${k.sensoriBuco.max} ms · secondi con buchi oltre 100 ms: ${k.secondiConBuchiOltre100ms} · arrivi a grappolo ${k.grappoli}`);
    if (T.scartatiSulTelefono) L.push(`Gesti scartati sul telefono: ${Object.entries(T.scartatiSulTelefono).map(([x, v]) => `${x} ${v}`).join(', ')}${T.preparazioni ? ` · preparazioni ${T.preparazioni}` : ''}`);
    if (T.dispositivo?.browser) L.push(`Telefono: ${T.dispositivo.browser}${T.dispositivo.versione ? ' · pagina ' + T.dispositivo.versione : ''}`);
  }
  if (W) L.push(`Webcam: ${W.fpsElaborazione ?? '–'} fotogrammi elaborati/s · riconoscimento mediana ${W.inferenzaMs?.p50 ?? '–'} ms · perdite ${W.perdite} (${W.perditeS} s) · più mani ${W.piuManiPercento ?? 0}% del tempo`);
  if (W?.fpsCamera) L.push(`Webcam: camera ${W.fpsCamera.p50} fotogrammi/s (5° percentile ${W.fpsCamera.p5}, buco più lungo ${W.bucoCameraMs ?? '–'} ms)${W.camera?.ottenuto ? `, ${W.camera.ottenuto.w}×${W.camera.ottenuto.h} a ${W.camera.ottenuto.fps ?? '?'} fps ottenuti` : ''} · inferenze ${W.inferenzeAlSecondo}/s, mediana ${W.inferenzaMs.p50} ms (p95 ${W.inferenzaMs.p95}) · ${W.worker ? "worker" : "thread del gioco"} occupato ${W.caricoPercento.p50}% · età del dato ${W.etaDatoMs.p50 ?? '–'} ms`);
  if (W?.statiMano) L.push(`Webcam: mano valida ${W.statiMano.secondi.valida ?? 0} s, degradata ${W.statiMano.secondi.degradata ?? 0} s, persa ${W.statiMano.secondi.persa ?? 0} s (${W.statiMano.perse} volte, la più lunga ${W.statiMano.persaMs?.max ?? '–'} ms), riprese ${W.statiMano.riprese}${W.pause ? ` · partita in pausa: ${Object.entries(W.pause).map(([k, n]) => `${k} ${n}`).join(', ')}` : ''}`);
  if (W?.livello) L.push(`Webcam: modello delle mani ${W.livello.finale}${W.livello.cambi.length ? ` (da ${W.livello.iniziale}: ${W.livello.cambi.map(c => `${c.da}→${c.a} con l'inferenza a ${c.p50} ms`).join(', ')})` : ''}`);
  if (W?.conferme) L.push(`Webcam: il colpo anticipato coincide con la conferma a fine gesto nel ${W.conferme.latoUgualePercento}% dei casi per il lato e nel ${W.conferme.tipoUgualePercento}% per il tipo (${W.conferme.n} colpi; coerenza, non precisione)`);
  if (G) L.push(`Gioco: ${G.fps?.p50 ?? '–'} fps (il 5% peggiore ${G.fps?.p5 ?? '–'}) · fotogrammi oltre 50 ms: ${G.fotogrammiLunghi}${G.fotogrammiDoppiPercento != null ? ` · fotogrammi oltre 25 ms: ${G.fotogrammiDoppiPercento}%` : ''}`);
  if (C?.tempo && Object.keys(C.tempo).length) L.push(`Tempo dei colpi: ${Object.entries(C.tempo).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (C?.tempoTelefonoMs?.n) L.push(`Tempo dei colpi del telefono rispetto all'impatto ideale: mediana ${C.tempoTelefonoMs.p50 > 0 ? '+' : ''}${C.tempoTelefonoMs.p50} ms (${C.tempoTelefonoMs.p50 > 0 ? 'anticipo' : 'ritardo'}) su ${C.tempoTelefonoMs.n} colpi`);
  if (C?.tempoTelefonoMs?.n >= 20 && C.tempoTelefonoMs.p50 < -40) L.push(`Ipotesi da verificare: i colpi del telefono arrivano in media ${-C.tempoTelefonoMs.p50} ms in ritardo. Se succede in ogni sessione, misura il ritardo dello schermo (video a 240 fps) prima di cambiare altro.`);
  if (R) L.push(`Prova guidata: lato giusto ${R.latoGiustoPercento ?? '–'}% · tipo giusto ${R.tipoGiustoPercento ?? '–'}% · direzione giusta ${R.direzioneGiustaPercento ?? '–'}%${R.direzioneDalTempoPercento != null ? ` (voluta con il tempo ${R.direzioneDalTempoPercento}%)` : ''} (da verificare nel video)`);
  for (const [k, g] of Object.entries(m.ripetibilita?.gruppi || {})) L.push(`Ripetibilità ${k}: ${g.colpi} colpi, tipo «${g.tipo}» nel ${g.tipoUgualePercento}% · variazione salita ${g.salita ?? '–'}, forza ${g.forza ?? '–'}, tempo ${g.tempo ?? '–'}, caduta x ${g.x ?? '–'} m, profondità ${g.profondita ?? '–'} m`);
  // eventi «racchetta», «vuoto» e «servizio»: colpi voluti ed esiti, colpi a vuoto con il motivo, servizi dal gesto
  const KR = m.racchetta, list = o => Object.entries(o || {}).map(([k, v]) => `${k} ${v}`).join(', ');
  if (KR?.colpi) L.push(`Esiti della racchetta: ${KR.colpi} colpi · voluti ${list(KR.voluti)} · tempo nella finestra mediana ${KR.tempoInFinestraPercento?.p50 > 0 ? '+' : ''}${KR.tempoInFinestraPercento?.p50 ?? '–'}% (+ anticipo) · oltre la finestra ${KR.oltreLaFinestraPercento ?? 0}% · falliti ${list(KR.falliti) || '0'} · al volo ${KR.alVolo} · tempo mediana ${KR.tempoMs?.p50 ?? '–'} ms`);
  if (KR?.colpi && (KR.mira?.n || KR.cadutaScartoM?.n)) L.push(`Direzione della racchetta: mira mediana ${KR.mira?.p50 ?? '–'}, variazione ${KR.mira?.jitter ?? '–'} (−1 e +1 le righe) · scarto tra caduta calcolata e rimbalzo vero mediana ${KR.cadutaScartoM?.p50 ?? '–'} m, p90 ${KR.cadutaScartoM?.p90 ?? '–'} m`);
  if (KR && Object.keys(KR.vuoti || {}).length) L.push(`Colpi a vuoto: ${list(KR.vuoti)}`);
  if (KR?.contattoAltezzaCm?.n || KR?.rimbalzoContattoMs?.n) L.push(`Impatto dopo il rimbalzo: altezza della palla mediana ${KR.contattoAltezzaCm?.p50 ?? '–'} cm · dal rimbalzo al colpo mediana ${KR.rimbalzoContattoMs?.p50 ?? '–'} ms`);
  if (KR?.servizi) L.push(`Servizi dal gesto: ${KR.servizi.n} · ${list(KR.servizi.voti)}`);
  const P2 = m.p2;
  if (P2) L.push(`Player 2: ${P2.ricevuti} colpi ricevuti${Object.keys(P2.esitiRicevuti || {}).length ? ' (' + list(P2.esitiRicevuti) + ')' : ''}${P2.etaMs?.n ? ` · età mediana ${P2.etaMs.p50} ms` : ''}${P2.vecchi ? ` · troppo vecchi ${P2.vecchi}` : ''} · ${P2.colpi} colpi della racchetta${P2.tempoMs?.n ? `, tempo mediana ${P2.tempoMs.p50} ms` : ''}${Object.keys(P2.vuoti || {}).length ? ' · a vuoto: ' + list(P2.vuoti) : ''}${P2.servizi ? ` · servizi dal gesto ${P2.servizi.n} (${list(P2.servizi.voti)})` : ''}`);
  L.push(...sideLines(m.latoPalle));
  if (m.pauseTelefono) L.push(`Partita in pausa per il telefono: ${Object.entries(m.pauseTelefono).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  if (m.segni?.length) L.push(`Segni «qui è successo un problema»: ${m.segni.length} (${m.segni.slice(0, 8).map(x => `${(x.t/1000).toFixed(1)} s`).join(', ')}${m.segni.length > 8 ? ', …' : ''})`);
  const av = m.registrazione?.avvisi || {};
  if (Object.keys(av).length) L.push(`Avvisi: ${Object.entries(av).map(([k, v]) => `${k} ×${v}`).join(', ')}`);
  return L;
}
