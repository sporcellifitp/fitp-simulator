// Telefono in partita: salute del collegamento e dei sensori, pausa subito e ripresa controllata (richiesta del 23/10,
// docs/NATPF_DIAGNOSI_2026-10-23.md §6, A1–A4). Senza DOM: lo usa natpf_ui.js a ogni fotogramma, i test lo provano da soli.
//
// Prima: il gioco andava avanti finché il collegamento non era dichiarato perso (5 s di silenzio), anche con la pagina
// del telefono nascosta (schermo spento, altra app) o con i sensori fermi a collegamento vivo: fino a 5 s di gioco senza
// racchetta, cioè un punto perso. Alla ripresa si ripartiva subito, con chi gioca magari non ancora in posizione.
// Ora:
//   • si mette in pausa appena il telefono non è utilizzabile: collegamento caduto, telefono non pronto (calibrazione),
//     pagina nascosta (il telefono lo dice subito), oppure nessun dato dei sensori da sensorGapMs (connesso ma muto);
//   • si riprende solo dopo steadyMs di telefono di nuovo regolare, con un conto alla rovescia (countdownMs);
//   • se la pausa è arrivata durante lo scambio o il lancio del servizio, il punto si rigioca (stesso punteggio): un
//     telefono che si ferma non regala punti a nessuno. I colpi arrivati durante la pausa non contano (il gioco è fermo e
//     il motore scarta quelli più vecchi di 0,6 s).
// graceMs: un problema deve durare almeno così prima della pausa (un ricollegamento lampo non ferma la partita), tranne
// la pagina nascosta, che il telefono dice da sé: lì la pausa è subito
export const WATCH = Object.freeze({ sensorGapMs: 400, steadyMs: 700, countdownMs: 2400, graceMs: 300,
  // canale veloce bloccato: il flusso dei sensori non arriva da sensorGapMs, ma il segnale del telefono (ogni secondo, sul
  // canale affidabile) è di meno di beatMs fa e dice che i sensori sul telefono vanno (ultimo campione da meno di
  // phoneSensorMs), con il collegamento rapido (rtt sotto rttMax): i colpi arrivano lo stesso (anche sul canale
  // affidabile) e la partita non si ferma. Diagnostica del 29/10 (stesso schermo): partita ferma 16 s per il Player 2,
  // il cui telefono era su «Pronto»
  beatMs: 2500, phoneSensorMs: 700, rttMax: 150 });
// stream dei sensori che arrivano a ritmo regolare dal telefono pronto: orientamento (fo), pacchetti binari della LAN
// (bin), giroscopio in JSON via internet (sm), campioni della diagnostica (rs)
const STREAMS = ['fo', 'bin', 'sm', 'rs'];

// salute del telefono: { ok, why } con why 'scollegato' | 'non pronto' | 'pagina nascosta' | 'sensori fermi'; ok con
// degraded 'canale' se il flusso dei sensori non arriva ma il telefono dice di averli (vedi WATCH.beatMs).
// touch: si gioca con i tocchi, senza sensori (non si giudicano). sensorAge: ms dall'ultimo campione sul telefono, nel suo
// ultimo segnale; beatAgeMs: ms da quel segnale (telefoni di prima: null, si giudica solo il flusso)
export function phoneHealth({ connected = false, phone = null, vis = null, rates = null, touch = false, gapMs = WATCH.sensorGapMs, sensorAge = null, beatAgeMs = null, rtt = null } = {}){
  if (!connected) return { ok: false, why: 'scollegato' };
  if (phone !== 'ready') return { ok: false, why: 'non pronto' };
  if (vis === false) return { ok: false, why: 'pagina nascosta' };
  const ages = touch ? [] : STREAMS.map(k => rates?.[k]?.ageMs).filter(Number.isFinite);
  // nessuno stream visto (telefono di prima): non si giudica
  if (ages.length && Math.min(...ages) > gapMs){
    const gap = Math.round(Math.min(...ages));
    if (Number.isFinite(sensorAge) && sensorAge <= WATCH.phoneSensorMs && Number.isFinite(beatAgeMs) && beatAgeMs <= WATCH.beatMs && !(Number.isFinite(rtt) && rtt > WATCH.rttMax))
      return { ok: true, why: null, degraded: 'canale', gapMs: gap };
    return { ok: false, why: 'sensori fermi', gapMs: gap };
  }
  return { ok: true, why: null };
}
// ingressi di phoneHealth dal telefono (NatpfPhoneRacket) adesso
export function phoneHealthOf(p, now = globalThis.performance?.now?.() ?? 0){
  const L = p?.state || {}, st = p?.link?.stats?.();
  return phoneHealth({ connected: !!p?.connected, phone: L.phone, vis: L.vis, rates: st?.rates, touch: !!L.touch, sensorAge: L.sensorAge ?? null, beatAgeMs: Number.isFinite(L.beatAt) ? now - L.beatAt : null, rtt: st?.rtt ?? L.rtt ?? null });
}

// Ricollegamento automatico («resync») nei casi estremi: il telefono è collegato ma il movimento non arriva (pausa per
// «sensori fermi», o partita che va avanti con il canale veloce bloccato) da afterMs. Si chiede al telefono di rifare il
// collegamento (link.relink) al massimo ogni everyMs; con la partita che va avanti, solo tra un punto e l'altro (rifare
// il collegamento lo interrompe per un attimo). update(h, { paused, busy, now }) → true quando chiederlo.
export const RESYNC = Object.freeze({ afterMs: 2500, everyMs: 12000 });
export function createResync({ afterMs = RESYNC.afterMs, everyMs = RESYNC.everyMs } = {}){
  let since = null, last = -Infinity;
  return {
    reset(){ since = null; },
    update(h, { paused = false, busy = false, now = 0 } = {}){
      const stuck = !!h && ((h.ok && h.degraded === 'canale') || (!h.ok && h.why === 'sensori fermi'));
      if (!stuck){ since = null; return false; }
      if (since == null) since = now;
      if (now - since < afterMs || now - last < everyMs) return false;
      if (h.ok && busy && !paused) return false;     // partita in corso, canale lento ma colpi che arrivano: tra i punti
      last = now; since = null;
      return true;
    },
  };
}

// macchina a stati: update(health, { inField, rally }) a ogni fotogramma restituisce un'azione o null
//   { kind: 'pause', why }            → mettere in pausa e dire perché
//   { kind: 'wait', why }             → in pausa, il motivo è cambiato
//   { kind: 'countdown', left }       → telefono di nuovo regolare: secondi che mancano alla ripresa (3, 2, 1)
//   { kind: 'resume', replay }        → si riprende; replay: rigiocare il punto
export function createPhoneWatch({ steadyMs = WATCH.steadyMs, countdownMs = WATCH.countdownMs, graceMs = WATCH.graceMs } = {}){
  let state = 'ok', why = null, okSince = null, until = null, replay = false, shown = null, badSince = null, badRally = false;
  return {
    get state(){ return state; },
    get why(){ return why; },
    get replay(){ return replay; },
    reset(){ state = 'ok'; why = null; okSince = null; until = null; replay = false; shown = null; badSince = null; badRally = false; },
    update(h, { inField = true, rally = false, now = 0 } = {}){
      if (state === 'ok'){
        if (h.ok || !inField){ badSince = null; return null; }
        // si ricorda se lo scambio era in corso quando il problema è iniziato (nella tolleranza il punto può finire)
        if (badSince == null){ badSince = now; badRally = !!rally; }
        if (h.why !== 'pagina nascosta' && now - badSince < graceMs) return null;
        state = 'paused'; why = h.why; okSince = null; replay = badRally; badSince = null;
        return { kind: 'pause', why };
      }
      // fuori dal campo (menu, fine partita): la pausa del telefono non serve più
      if (!inField){ this.reset(); return { kind: 'resume', replay: false }; }
      if (!h.ok){
        const changed = state === 'countdown' || h.why !== why;
        state = 'paused'; okSince = null; until = null; why = h.why; shown = null;
        return changed ? { kind: 'wait', why } : null;
      }
      if (state === 'paused'){
        if (okSince == null) okSince = now;
        if (now - okSince < steadyMs) return null;
        state = 'countdown'; until = now + countdownMs; shown = null;
      }
      // conto alla rovescia
      if (now >= until){ const r = replay; this.reset(); return { kind: 'resume', replay: r }; }
      const left = Math.ceil((until - now)/(countdownMs/3));
      if (left !== shown){ shown = left; return { kind: 'countdown', left }; }
      return null;
    },
  };
}

// testo per chi gioca, dal motivo della pausa. hiddenMs: da quanto la pagina del telefono è nascosta (B9: lo si dice, e si
// aggiorna ogni secondo); wasHidden: il telefono si è scollegato con la pagina nascosta (schermo spento): si ricollega
// da solo quando torna, il QR serve solo se la pagina è stata chiusa
export function holdText(why, { hiddenMs = null, wasHidden = false } = {}){
  const since = Number.isFinite(hiddenMs) && hiddenMs >= 1000 ? ` da ${Math.round(hiddenMs/1000)} s` : '';
  if (why === 'pagina nascosta') return `Schermo del telefono spento${since}: riaccendi lo schermo e tocca la pagina del gioco, si riprende da solo.`;
  if (why === 'scollegato' && wasHidden) return `Telefono scollegato con lo schermo spento${since}: riaccendilo e torna alla pagina, si ricollega da solo. Pagina chiusa? Inquadra di nuovo il QR.`;
  return {
    scollegato: 'Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo.',
    'non pronto': 'Telefono non pronto: finisci la calibrazione sul telefono.',
    'sensori fermi': 'Il telefono non manda più il movimento: sul telefono tocca «Riattiva i sensori».',
  }[why] || 'Telefono in pausa.';
}
// testo della pausa per questo telefono adesso (da quanto è nascosto, se si è scollegato con lo schermo spento)
export function phoneHoldText(p, why, now = globalThis.performance?.now?.() ?? 0){
  const L = p?.state || {}, hidden = L.vis === false;
  return holdText(why, { hiddenMs: hidden && Number.isFinite(L.hiddenAt) ? now - L.hiddenAt : null, wasHidden: hidden });
}
