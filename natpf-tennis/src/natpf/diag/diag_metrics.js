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

// colpo richiesto nella prova guidata: «normale» vale per dritto e rovescio piatti o arrotati
const NORMAL = new Set(['topspin', 'flat', 'drive', 'normale']);
export const sameShot = (want, got) => (want === 'normale' ? NORMAL.has(String(got || '').toLowerCase()) : String(want) === String(got || '').toLowerCase());
export function computeMetrics(events, { raw = [], meta = {} } = {}){
  const by = k => events.filter(e => e.k === k);
  const durata = events.length ? (events.at(-1).t - events[0].t)/1000 : 0;
  const out = { versione: 1, durataS: r1(meta.durationS ?? durata), controller: meta.controller ?? null, trasporto: meta.transport ?? null };

  // ---- telefono ----
  const colpi = by('tel.colpo');
  if (colpi.length || raw.length || by('tel.orologio').length){
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
    const percorsi = by('tel.link').at(-1)?.copie || null;
    out.telefono = {
      sensori: { campioni: raw.length, hzMediana: dts.length ? r1(1000/pct(dts, .5)) : null, intervalloP95Ms: r1(pct(dts, .95)), buchiOltre50ms: gaps.length, buchiTotaleS: r1(gaps.reduce((a, d) => a + d, 0)/1000), persiInRete: lostRaw },
      colpi: { ricevuti: colpi.length, usati: ok.length, scartati: tally(colpi.filter(c => c.scartato), c => c.scartato), mancantiNellaNumerazione: missingInSequence(ns), primoPercorso: percorsi },
      tempiMs: { rilevamento: dist(ok.map(c => c.rilevamento)), attesaPreparazione: dist(ok.map(c => c.attesa)), consegna: dist(ok.map(c => c.consegna)), totale: dist(ok.map(c => c.totale)) },
      orologio: clockFit(by('tel.orologio')),
      collegamento: { cadute, fuoriLineaS: r1(giuMs/1000), paginaNascosta: count(stati, s => s.visibile === false), bloccoSchermo: tally(stati.filter(s => s.schermo != null), s => s.schermo) },
      tipi,
    };
  }

  // ---- webcam ----
  const frames = by('webcam.frame'), wev = by('webcam.evento');
  if (frames.length || wev.length){
    let perse = 0, persaDa = null, persaMs = 0;
    for (const e of wev){ if (e.tipo === 'lost'){ perse++; persaDa = e.t; } if (e.tipo === 'found' && persaDa != null){ persaMs += e.t - persaDa; persaDa = null; } }
    out.webcam = {
      fotogrammi: frames.length, fpsElaborazione: durata > 0 ? r1(frames.length/durata) : null,
      inferenzaMs: dist(frames.map(f => f.inferMs)), fonte: tally(frames, f => f.source || 'nessuna'),
      piuManiPercento: frames.length ? r1(100*count(frames, f => (f.hands || 0) > 1)/frames.length) : null,
      perdite: perse, perditeS: r1(persaMs/1000), eventi: count(wev, e => e.tipo === 'event'),
    };
  }

  // ---- gioco ----
  const perf = by('prestazioni');
  if (perf.length){
    out.gioco = {
      fps: { p5: r1(pct(perf.map(p => p.fps), .05)), p50: r1(pct(perf.map(p => p.fps), .5)) },
      fotogrammaMs: { p95: r1(pct(perf.map(p => p.p95), .5)), p99: r1(pct(perf.map(p => p.p95), .99)), max: r1(maxOf(perf.map(p => p.max))) },
      fotogrammiLunghi: perf.reduce((a, p) => a + (p.lunghi || 0), 0),
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
      // mediana lontana da zero dice un ritardo sistematico (per esempio lo schermo)
      tempoTelefonoMs: dist(by('tentativo').filter(x => Number.isFinite(x.tauMs)).map(x => x.tauMs)),
    };
  }

  // ---- riferimento: solo prova guidata (colpo richiesto; da verificare nel video) ----
  const attesi = by('atteso');
  if (attesi.length){
    // ogni colpo del telefono o della webcam usa l'ultima richiesta prima di lui
    const rows = [];
    let a = null, j = 0;
    const tagged = [...events.filter(e => e.k === 'tel.colpo' || e.k === 'input' || e.k === 'colpo.gioco' || e.k === 'atteso')].sort((x, y) => x.t - y.t);
    for (const e of tagged){
      if (e.k === 'atteso'){ a = e; continue; }
      if (!a || e.t - a.t > (a.finestraMs || 6000)) continue;
      if (e.k === 'tel.colpo' && !e.scartato) rows.push({ kind: 'tel', a, lato: e.lato, tipo: e.tipo });
      else if (e.k === 'input' && e.fonte === 'webcam') rows.push({ kind: 'cam', a, lato: e.lato, tipo: e.colpo });
      else if (e.k === 'colpo.gioco' && e.chi === 'giocatore' && e.esito === 'hit') rows.push({ kind: 'esito', a, direzione: e.direzione });
      j++;
    }
    const gest = rows.filter(r => r.kind !== 'esito'), dir = rows.filter(r => r.kind === 'esito' && r.a.direzione);
    const lato = gest.filter(r => r.a.lato), tipo = gest.filter(r => r.a.colpo);
    const matrice = {}; for (const r of tipo){ const k = `${r.a.colpo}→${r.tipo || '?'}`; matrice[k] = (matrice[k] || 0) + 1; }
    const matriceDir = {}; for (const r of dir){ const k = `${r.a.direzione}→${r.direzione || '?'}`; matriceDir[k] = (matriceDir[k] || 0) + 1; }
    out.riferimento = {
      nota: 'riferimento = colpo richiesto dalla prova guidata; un errore va confermato nel video (chi gioca può aver fatto un altro gesto)',
      richieste: attesi.length, gestiConRiferimento: gest.length,
      latoGiustoPercento: lato.length ? r1(100*count(lato, r => r.lato === r.a.lato)/lato.length) : null,
      tipoGiustoPercento: tipo.length ? r1(100*count(tipo, r => sameShot(r.a.colpo, r.tipo))/tipo.length) : null,
      direzioneGiustaPercento: dir.length ? r1(100*count(dir, r => r.direzione === r.a.direzione)/dir.length) : null,
      matriceTipo: matrice, matriceDirezione: matriceDir,
    };
  }

  // ---- registrazione ----
  out.registrazione = {
    eventi: events.length, campioniTelefono: raw.length, avvisi: tally(by('avviso'), a => a.codice || a.testo),
    perditeRegistratore: by('avviso').filter(a => a.codice === 'coda').reduce((s, a) => s + (a.persi || 0), 0),
    video: by('video').filter(v => v.stato === 'fine').map(v => ({ file: v.file, durataS: r1(v.durataS), MB: r1(v.byte/1048576) })),
  };
  return out;
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
  ['gioco.fps.p5', 'Gioco: fps (5° percentile)', +1, 2],
  ['gioco.fotogrammaMs.p95', 'Gioco: fotogramma p95 (ms)', -1, 2],
  ['gioco.fotogrammiLunghi', 'Gioco: fotogrammi oltre 50 ms', -1, 2],
  ['colpi.tempoTelefonoMs.p50', 'Tempo dei colpi del telefono, mediana (ms, 0 = ideale)', 0, 10],
  ['riferimento.latoGiustoPercento', 'Prova guidata: lato giusto (%)', +1, 3],
  ['riferimento.tipoGiustoPercento', 'Prova guidata: tipo giusto (%)', +1, 3],
  ['riferimento.direzioneGiustaPercento', 'Prova guidata: direzione giusta (%)', +1, 5],
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
  L.push(`Durata ${m.durataS ?? '–'} s${m.controller ? ' · controller ' + m.controller : ''}${m.trasporto ? ' · ' + m.trasporto : ''}`);
  if (T){
    const c = T.colpi || {}, d = T.tempiMs?.consegna || {};
    L.push(`Telefono: ${c.usati ?? 0} colpi usati su ${c.ricevuti ?? 0} ricevuti · persi in rete ${c.mancantiNellaNumerazione ?? 0}${Object.keys(c.scartati || {}).length ? ' · scartati: ' + Object.entries(c.scartati).map(([k, v]) => `${k} ${v}`).join(', ') : ''}`);
    if (d.n) L.push(`Consegna dei colpi: mediana ${d.p50} ms · 99% entro ${d.p99} ms · massimo ${d.max} ms · jitter ${d.jitter} ms`);
    if (T.sensori?.campioni) L.push(`Sensori del telefono: ${T.sensori.hzMediana ?? '–'} Hz · buchi oltre 50 ms: ${T.sensori.buchiOltre50ms}${T.sensori.persiInRete ? ' · campioni persi ' + T.sensori.persiInRete : ''}`);
    const k = T.collegamento || {};
    L.push(`Collegamento: ${k.cadute ?? 0} cadute${k.fuoriLineaS ? ` (${k.fuoriLineaS} s)` : ''} · pagina del telefono nascosta ${k.paginaNascosta ?? 0} volte${k.bloccoSchermo && Object.keys(k.bloccoSchermo).length ? ' · schermo: ' + Object.keys(k.bloccoSchermo).join(', ') : ''}`);
  }
  if (W) L.push(`Webcam: ${W.fpsElaborazione ?? '–'} fotogrammi elaborati/s · riconoscimento mediana ${W.inferenzaMs?.p50 ?? '–'} ms · perdite ${W.perdite} (${W.perditeS} s) · più mani ${W.piuManiPercento ?? 0}% del tempo`);
  if (G) L.push(`Gioco: ${G.fps?.p50 ?? '–'} fps (il 5% peggiore ${G.fps?.p5 ?? '–'}) · fotogrammi oltre 50 ms: ${G.fotogrammiLunghi}`);
  if (C?.tempo && Object.keys(C.tempo).length) L.push(`Tempo dei colpi: ${Object.entries(C.tempo).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (C?.tempoTelefonoMs?.n) L.push(`Tempo dei colpi del telefono rispetto all'impatto ideale: mediana ${C.tempoTelefonoMs.p50 > 0 ? '+' : ''}${C.tempoTelefonoMs.p50} ms (${C.tempoTelefonoMs.p50 > 0 ? 'anticipo' : 'ritardo'}) su ${C.tempoTelefonoMs.n} colpi`);
  if (C?.tempoTelefonoMs?.n >= 20 && C.tempoTelefonoMs.p50 < -40) L.push(`Ipotesi da verificare: i colpi del telefono arrivano in media ${-C.tempoTelefonoMs.p50} ms in ritardo. Se succede in ogni sessione, misura il ritardo dello schermo (video a 240 fps) prima di cambiare altro.`);
  if (R) L.push(`Prova guidata: lato giusto ${R.latoGiustoPercento ?? '–'}% · tipo giusto ${R.tipoGiustoPercento ?? '–'}% · direzione giusta ${R.direzioneGiustaPercento ?? '–'}% (da verificare nel video)`);
  const av = m.registrazione?.avvisi || {};
  if (Object.keys(av).length) L.push(`Avvisi: ${Object.entries(av).map(([k, v]) => `${k} ×${v}`).join(', ')}`);
  return L;
}
