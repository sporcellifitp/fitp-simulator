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
export const WATCH = Object.freeze({ sensorGapMs: 400, steadyMs: 700, countdownMs: 2400, graceMs: 300 });
// stream dei sensori che arrivano a ritmo regolare dal telefono pronto: orientamento (fo), pacchetti binari della LAN
// (bin), giroscopio in JSON via internet (sm), campioni della diagnostica (rs)
const STREAMS = ['fo', 'bin', 'sm', 'rs'];

// salute del telefono: { ok, why } con why 'scollegato' | 'non pronto' | 'pagina nascosta' | 'sensori fermi'.
// touch: si gioca con i tocchi, senza sensori (non si giudicano)
export function phoneHealth({ connected = false, phone = null, vis = null, rates = null, touch = false, gapMs = WATCH.sensorGapMs } = {}){
  if (!connected) return { ok: false, why: 'scollegato' };
  if (phone !== 'ready') return { ok: false, why: 'non pronto' };
  if (vis === false) return { ok: false, why: 'pagina nascosta' };
  const ages = touch ? [] : STREAMS.map(k => rates?.[k]?.ageMs).filter(Number.isFinite);
  // nessuno stream visto (telefono di prima): non si giudica
  if (ages.length && Math.min(...ages) > gapMs) return { ok: false, why: 'sensori fermi', gapMs: Math.round(Math.min(...ages)) };
  return { ok: true, why: null };
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

// testo per chi gioca, dal motivo della pausa
export function holdText(why){
  return {
    scollegato: 'Telefono scollegato: riapri la pagina sul telefono, si ricollega da solo.',
    'non pronto': 'Il telefono non è pronto: guarda il telefono e finisci la calibrazione.',
    'pagina nascosta': 'La pagina del telefono non è in primo piano (schermo spento o un’altra app): riaccendi lo schermo e torna alla pagina.',
    'sensori fermi': 'Il telefono è collegato ma non manda il movimento: sul telefono tocca «Riattiva i sensori» (o riaccendi lo schermo e torna alla pagina del gioco).',
  }[why] || 'Telefono in pausa.';
}
