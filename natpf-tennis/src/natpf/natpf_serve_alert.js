// B72 (richiesta dell'utente del 19/11): «rendere lampeggiante il box che dice che devi battere (al servizio) + aggiungi un
// alone pulsante attorno allo schermo (in singolo e in doppio nell'area specifica del player che deve servire) se passano 3
// secondi». In fiera chi deve battere spesso non si accorge che il gioco aspetta lui. Ora, quando batte un giocatore UMANO
// di questo computer:
//   • la casella gialla «Al servizio» sopra chi batte (#server-tag del motore, natpf-hud.css; nello stesso schermo
//     #server-tag-p1/-p2 di natpf_split.js) LAMPEGGIA a 1 Hz (classe serve-blink, natpf-servizio.css: lampo di luce,
//     anello giallo che si allarga e svanisce), dalla posizione di servizio fino al lancio (SERVE_STANCE). Durante il lancio
//     (SERVE_TOSS) è di nuovo ferma; quando batte la CPU o il giocatore dell'altro computer è ferma come prima. Nello
//     stesso schermo lampeggia solo la casella della metà di chi batte (quella dell'altra metà dice «batte lui», ferma);
//   • se resta in posizione di servizio senza lanciare per SERVE_HALO.afterS secondi (il tempo fermo di
//     natpf_serve_coach.js, che riparte da zero a ogni nuova fase e con la pausa), un ALONE giallo che pulsa ai margini
//     interni dell'area di gioco (#natpf-serve-halo, primo figlio di #hud-root: sta nell'area del ledwall, sotto il
//     tabellone e le scritte, senza clic). A una vista (singolo, doppio contro la CPU, computer di chi batte nella sfida tra
//     due computer) attorno a tutta l'area; nello stesso schermo solo attorno alla metà di chi batte. Sparisce subito al
//     lancio, in pausa, a fine punto, nel menu e nella moviola.
// Solo in partita: nell'allenamento (anche l'esercizio «Servizio», che ha la sua scheda e l'icona del lancio), nei minigiochi
// e negli scambi di prova niente lampeggio e niente alone. La decisione è una funzione pura (serveAlertView, provata dai
// test); la pagina cambia solo quando cambia lo stato (NatpfServeAlert.paint confronta una chiave a ogni fotogramma).
export const SERVE_HALO = Object.freeze({
  afterS: 3,          // s fermi in posizione di servizio senza lanciare: compare l'alone
});
export const SERVE_ALERT_OFF = Object.freeze({ blink: false, halo: false, half: null });

// Cosa mostrare. g: fotografia del gioco di NatpfServeCoach.snapshot() (phase, mine, drill, split, server, paused, replay);
// idle: s fermi in posizione di servizio (serveCoachStep). → { blink, halo, half }: blink = la casella di chi batte
// lampeggia; halo = l'alone; half = 'p1' | 'p2' nello stesso schermo (la metà di chi batte: casella e alone), null a una vista
export function serveAlertView(g = {}, idle = 0){
  // mine: chi batte gioca da questo computer (mai la CPU, mai il giocatore dell'altro computer); drill: allenamento
  if (!g || !g.mine || g.drill || g.paused || g.replay || g.phase !== 'SERVE_STANCE') return SERVE_ALERT_OFF;
  const half = g.split ? (g.server === 'opponent' ? 'p2' : 'p1') : null;
  return { blink: true, halo: (Number(idle) || 0) >= SERVE_HALO.afterS, half };
}
export const serveAlertKey = v => `${v?.blink ? 1 : 0}|${v?.halo ? 1 : 0}|${v?.half || ''}`;

export class NatpfServeAlert {
  constructor(doc = typeof document !== 'undefined' ? document : null){
    this.doc = doc; this.key = serveAlertKey(SERVE_ALERT_OFF); this.tag = null; this.halo = null;
  }
  // l'alone: primo figlio di #hud-root (tutti i riquadri dell'HUD dopo di lui gli stanno sopra), creato la prima volta
  _haloEl(){
    if (this.halo) return this.halo;
    const d = this.doc, old = d.getElementById('natpf-serve-halo');
    if (old) return (this.halo = old);
    const root = d.getElementById('hud-root') || d.body; if (!root || !d.createElement) return null;
    const el = d.createElement('div');
    el.id = 'natpf-serve-halo'; el.className = 'natpf-serve-halo hidden'; el.setAttribute?.('aria-hidden', 'true');
    root.insertBefore ? root.insertBefore(el, root.firstChild || null) : root.appendChild(el);
    return (this.halo = el);
  }
  // v: serveAlertView. Lavoro sulla pagina solo quando cambia (true se ha cambiato qualcosa)
  paint(v = SERVE_ALERT_OFF){
    const d = this.doc; if (!d?.getElementById) return false;
    v = v || SERVE_ALERT_OFF;
    const key = serveAlertKey(v);
    if (key === this.key) return false;
    // casella che lampeggia: a una vista quella del motore, nello stesso schermo quella della metà di chi batte
    const want = v.blink ? d.getElementById(v.half ? `server-tag-${v.half}` : 'server-tag') : null;
    if (this.tag && this.tag !== want) this.tag.classList.remove('serve-blink');
    if (want && !want.classList.contains('serve-blink')) want.classList.add('serve-blink');
    this.tag = want;
    // alone (attorno a tutta l'area o alla metà di chi batte)
    const h = v.halo ? this._haloEl() : this.halo;
    if (h){
      if (h.classList.contains('hidden') === !!v.halo) h.classList.toggle('hidden', !v.halo);
      if (v.halo && v.half) h.dataset.half = v.half; else if (h.dataset.half) delete h.dataset.half;
    }
    // le caselle dello stesso schermo nascono al primo disegno diviso (natpf_split.js, dopo questo passo): finché manca
    // la casella si riprova al fotogramma dopo
    this.key = v.blink && !want ? '' : key;
    return true;
  }
}
