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
// B45.1 «telefono che non si scollega» (14/11): con il movimento che non arriva, answers dice se il telefono risponde ancora
// sul canale affidabile (segnale di meno di WATCH.beatMs) con i sensori che sul telefono vanno (sensorAge entro
// WATCH.phoneSensorMs): è il caso del canale veloce bloccato, l'unico in cui il «Ricollega» automatico serve (createResync).
// Motivo 'segnale debole' (prima 'sensori fermi', con «tocca Riattiva i sensori»): i dati del telefono non arrivano ma i
// suoi sensori vanno, cioè è la rete. silent: il telefono tace del tutto (segnale vecchio): rete ferma, decide il controllo
// di vita (link-life.LIFE, 10 s); la partita è in pausa e riprende da sola quando torna. 'sensori fermi' resta per i
// sensori fermi sul telefono (segnale recente, campioni vecchi) e per le pagine del telefono di prima (niente segnale)
export function phoneHealth({ connected = false, phone = null, vis = null, rates = null, touch = false, gapMs = WATCH.sensorGapMs, sensorAge = null, beatAgeMs = null, rtt = null } = {}){
  if (!connected) return { ok: false, why: 'scollegato' };
  if (phone !== 'ready') return { ok: false, why: 'non pronto' };
  if (vis === false) return { ok: false, why: 'pagina nascosta' };
  const ages = touch ? [] : STREAMS.map(k => rates?.[k]?.ageMs).filter(Number.isFinite);
  // nessuno stream visto (telefono di prima): non si giudica
  if (ages.length && Math.min(...ages) > gapMs){
    const gap = Math.round(Math.min(...ages)), beat = Number.isFinite(beatAgeMs) && beatAgeMs <= WATCH.beatMs;
    const answers = beat && Number.isFinite(sensorAge) && sensorAge <= WATCH.phoneSensorMs;
    if (answers && !(Number.isFinite(rtt) && rtt > WATCH.rttMax))
      return { ok: true, why: null, degraded: 'canale', gapMs: gap, answers };
    const silent = Number.isFinite(beatAgeMs) && !beat;
    if (answers || silent) return { ok: false, why: 'segnale debole', gapMs: gap, answers, ...(silent ? { silent: true } : {}) };
    return { ok: false, why: 'sensori fermi', gapMs: gap, answers };
  }
  return { ok: true, why: null };
}
// ingressi di phoneHealth dal telefono (NatpfPhoneRacket) adesso
export function phoneHealthOf(p, now = globalThis.performance?.now?.() ?? 0){
  const L = p?.state || {}, st = p?.link?.stats?.();
  // (profilo da capo chiesto dal gioco, in viaggio: NatpfPhoneRacket.resetting; per quel tratto il telefono vale «pronto»)
  return phoneHealth({ connected: !!p?.connected, phone: p?.resetting ? 'ready' : L.phone, vis: L.vis, rates: st?.rates, touch: !!L.touch, sensorAge: L.sensorAge ?? null, beatAgeMs: Number.isFinite(L.beatAt) ? now - L.beatAt : null, rtt: st?.rtt ?? L.rtt ?? null });
}

// Ricollegamento automatico («resync») nei casi estremi: il telefono è collegato ma il movimento non arriva (pausa per
// «sensori fermi», o partita che va avanti con il canale veloce bloccato) da afterMs. Si chiede al telefono di rifare il
// collegamento (link.relink) al massimo ogni everyMs; con la partita che va avanti, solo tra un punto e l'altro (rifare
// il collegamento lo interrompe per un attimo). update(h, { paused, busy, now }) → true quando chiederlo.
// B45.1: solo se il telefono risponde ancora sul canale affidabile con i sensori che vanno (h.answers: il caso del canale
// veloce bloccato per cui è nato, diagnostica del 29/10). Prima scattava a ~2,9 s anche quando taceva tutto (un buco della
// Wi-Fi di 3 s in partita, docs/b45/telefono-che-si-scollega.md tab. 4): il comando restava in coda e il telefono, al
// ritorno della rete, rifaceva il collegamento, con una caduta nel registro; e con i sensori fermi sul telefono il
// ricollegamento non li fa ripartire (lì serve «Riattiva i sensori» sul telefono)
export const RESYNC = Object.freeze({ afterMs: 2500, everyMs: 12000 });
export function createResync({ afterMs = RESYNC.afterMs, everyMs = RESYNC.everyMs } = {}){
  let since = null, last = -Infinity;
  return {
    reset(){ since = null; },
    update(h, { paused = false, busy = false, now = 0 } = {}){
      const stuck = !!h && !!h.answers && ((h.ok && h.degraded === 'canale') || (!h.ok && (h.why === 'segnale debole' || h.why === 'sensori fermi')));
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
// B45.1: silentMs, da quanto il telefono tace (il suo ultimo segnale): «scollegato» lo dice, e si aggiorna ogni secondo
export function holdText(why, { hiddenMs = null, wasHidden = false, silentMs = null } = {}){
  const since = Number.isFinite(hiddenMs) && hiddenMs >= 1000 ? ` da ${Math.round(hiddenMs/1000)} s` : '';
  if (why === 'pagina nascosta') return `Schermo del telefono spento${since}: riaccendi lo schermo e tocca la pagina del gioco, si riprende da solo.`;
  if (why === 'scollegato' && wasHidden) return `Telefono scollegato con lo schermo spento${since}: riaccendilo e torna alla pagina, si ricollega da solo. Pagina chiusa? Inquadra di nuovo il QR.`;
  // B45.1: è la rete (tra la folla la Wi-Fi del telefono si ferma per qualche secondo): niente «Scollegato» né «Riattiva i
  // sensori» finché il controllo di vita non chiude (LIFE.silentMs, 10 s); poi il telefono si ricollega da solo con la sua
  // chiave (niente QR né calibrazione da rifare) e la partita riprende da sola
  if (why === 'segnale debole') return 'La partita è in pausa e riprende da sola appena il telefono torna.';
  if (why === 'scollegato'){
    const back = 'si ricollega da solo appena torna la rete. Se non torna, riapri la pagina del gioco sul telefono.';
    return Number.isFinite(silentMs) && silentMs >= 1000 ? `Senza segnale da ${Math.round(silentMs/1000)} s: ${back}` : `Il telefono ${back}`;
  }
  return {
    scollegato: 'Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo.',
    'non pronto': 'Telefono non pronto: finisci la calibrazione sul telefono.',
    'sensori fermi': 'Il telefono non manda più il movimento: sul telefono tocca «Riattiva i sensori».',
  }[why] || 'Telefono in pausa.';
}
// B20 (audit B19, punto 10): nello stesso schermo i testi della pausa dicono il nome scritto nella pagina dei telefoni
// («Telefono di Giulia in pausa»; senza nome resta «Telefono del Player 2 in pausa»)
export const phoneOf = name => { const n = String(name || '').trim(); return !n ? '' : /^player\s*\d+$/i.test(n) ? `del ${n}` : `di ${n}`; };
export const holdTitle = (name = '', kind = 'pause') => `Telefono${name ? ' ' + phoneOf(name) : ''} ${kind === 'ready' ? 'di nuovo pronto' : 'in pausa'}`;
// B45.1: «Telefono 1» (o «Telefono di Giulia» nello stesso schermo con il nome) per i titoli della rete
export const telLabel = (name = '', slot = 'p1') => (String(name || '').trim() ? `Telefono ${phoneOf(name)}` : `Telefono ${slot === 'p2' ? 2 : 1}`);
// B45.1: titolo del riquadro della pausa. Rete: «Telefono 1: segnale debole, aspetto che torni…» finché il collegamento c'è
// (controllo di vita, 10 s), poi «Telefono 1 scollegato · si ricollega da solo» (con il tempo nel testo). Prima, dopo 5 s,
// «Telefono scollegato: riapri la pagina» e il pannello con il QR sopra il campo: in fiera sembrava rotto. Gli altri motivi:
// holdTitle di sempre. wasHidden: scollegato con lo schermo spento (il testo di sempre)
export function holdHead(why, { name = '', slot = 'p1', wasHidden = false } = {}){
  if (why === 'segnale debole') return `${telLabel(name, slot)}: segnale debole, aspetto che torni…`;
  if (why === 'scollegato' && !wasHidden) return `${telLabel(name, slot)} scollegato · si ricollega da solo`;
  return holdTitle(name);
}
// motivi della rete: con due pause insieme la riga è il titolo con il tempo (il titolo dice già tutto)
export const NET_HOLDS = Object.freeze(['segnale debole', 'scollegato']);
// B45.1: il pannello del telefono con il QR si apre da solo (gioco singolo) solo dopo tanto da scollegato: di solito il
// telefono torna da solo prima (prima si apriva subito alla caduta, sopra il campo)
export const PANEL_AFTER_MS = 20000;
// avviso al telefono dell'altro giocatore: la partita è ferma per il telefono di chi (scollegato, schermo spento o
// sensori fermi: il motivo lo dice il grande schermo)
export const otherPhoneNote = name => `Partita in pausa: aspetto il telefono ${phoneOf(name) || 'dell’altro giocatore'}. Si riprende da soli.`;
// testo della pausa per questo telefono adesso (da quanto è nascosto, se si è scollegato con lo schermo spento; B45.1: da
// quanto tace, dal suo ultimo segnale)
export function phoneHoldText(p, why, now = globalThis.performance?.now?.() ?? 0){
  const L = p?.state || {}, hidden = L.vis === false;
  return holdText(why, { hiddenMs: hidden && Number.isFinite(L.hiddenAt) ? now - L.hiddenAt : null, wasHidden: hidden, silentMs: Number.isFinite(L.beatAt) ? now - L.beatAt : null });
}
// B45.1: titolo, testo e riga (due pause insieme) del riquadro per questo telefono adesso. name: nome nello stesso schermo
// ('' fuori: «Telefono 1»), slot: 'p1' | 'p2'
export function phoneHoldView(p, why, { name = '', slot = 'p1', now = globalThis.performance?.now?.() ?? 0 } = {}){
  const L = p?.state || {}, wasHidden = L.vis === false;
  const title = holdHead(why, { name, slot, wasHidden }), text = phoneHoldText(p, why, now);
  const silentS = Number.isFinite(L.beatAt) ? Math.round((now - L.beatAt)/1000) : null;
  const line = NET_HOLDS.includes(why) && !wasHidden ? (why === 'scollegato' && silentS >= 1 ? `${title} (da ${silentS} s)` : title) : null;
  return { title, text, line };
}
