// Stato «pronto» dei giocatori nel 1v1 (B9, punto 4 della richiesta del 05/11; analisi in docs/b9/analisi-pronto-1v1.md).
// Prima lo stato stava dentro un pulsante giallo (giallo prima e dopo il clic, «Sono pronto ✓» e «Pronto ✓» con lo
// stesso segno) e nello stesso schermo la lobby saltava da sola a «Partita» dopo 0,7 s senza dire chi era pronto.
// Ora lo stato di ciascun giocatore sta in una SCHEDA (nome, distintivo con colore, icona e parola), uguale nei due
// percorsi:
//   • stesso schermo («Collega i due telefoni», natpf_split_ui.js): le due metà della pagina sono le schede; quando
//     tutti e due sono pronti (e hanno chiuso il tutorial) parte un conto alla rovescia di 3 s, poi si gioca da soli;
//   • sfida un amico tra due computer (natpf_versus_ui.js, percorso sospeso: correzione minima): schede compatte del
//     Player 1 e del Player 2 nel pannello del P2 e nella barra dell'invito dell'host.
// Quattro stati, mai solo il colore (si leggono anche da lontano su un ledwall e da chi non distingue i colori):
//   off   «In attesa»  grigio, bordo tratteggiato, cerchio vuoto      (telefono non collegato, nessuno nella stanza)
//   prep  «Si prepara» ambra, anello che gira                         (tutorial, sensori, calibrazione, racchetta)
//   ready «Pronto»     verde pieno, ✓                                 (si può giocare)
//   ko    «Problema»   rosso, !                                       (telefono scollegato, sensori negati, rete)
// Il colore del giocatore (P1 giallo, P2 rosa) dice solo CHI è (striscia laterale), mai lo stato.
// Funzioni pure (test in test/natpf-ready.test.mjs) più due disegni idempotenti per il DOM.

export const READY_STATES = Object.freeze(['off', 'prep', 'ready', 'ko']);
export const READY_BADGE = Object.freeze({ off: 'In attesa', prep: 'Si prepara', ready: 'Pronto', ko: 'Problema' });
// conto alla rovescia prima della partita (stesso schermo): 3 s, deciso il 05/11 (5 s erano l'alternativa per il ledwall)
export const READY_COUNTDOWN_MS = 3000;
export const defaultName = id => (id === 'p2' ? 'Player 2' : 'Player 1');

// Vista di una scheda: nome (o Player 1/2), «tu» sul proprio computer, stato, parola del distintivo, dettaglio breve
export function slotView({ id = 'p1', name = '', you = false, state = 'off', detail = '', badge = '' } = {}){
  const st = READY_STATES.includes(state) ? state : 'off';
  const who = String(name || '').trim() || defaultName(id);
  const word = badge || READY_BADGE[st];
  const more = String(detail || '');
  return { id, name: who, you: !!you, state: st, cls: `is-${st}`, badge: word, detail: more, aria: `${who}${you ? ' (tu)' : ''}: ${word}${more ? `, ${more}` : ''}` };
}

// Stesso schermo: dallo stato del telefono (natpf_split_ui.splitPlayerStatus: wait · qr · on · go · tut · ok · ko) o
// della webcam per due (splitCamStatus: wait · on · ok · ko) allo stato della scheda. Il dettaglio è la parte breve
// (detail) dello stato; un telefono che era collegato e si è perso (lost) è un problema, non un'attesa
export function splitSlot(st = {}){
  const detail = st.detail || st.title || '';
  switch (st.state){
    case 'ok': return { state: 'ready', detail };
    case 'ko': return { state: 'ko', detail };
    case 'on': case 'go': case 'tut': return { state: 'prep', detail };
    case 'qr': return st.lost ? { state: 'ko', detail, badge: 'Scollegato' } : { state: 'off', detail };
    default: return { state: 'off', detail };
  }
}

// Si parte? Tutti pronti; chi manca, con il suo dettaglio (per la barra dell'avvio)
export function startGate(slots = []){
  const waiting = slots.filter(s => s?.state !== 'ready');
  return { both: slots.length > 0 && !waiting.length, waiting: waiting.map(s => ({ id: s.id, name: s.name, state: s.state, detail: s.detail, badge: s.badge })) };
}

// iniziale minuscola dentro una frase («Inquadra il QR» → «inquadra il QR»; le sigle restano: «QR», «LAN»)
const lc = t => { t = String(t || ''); return /^[A-ZÀ-Þ][a-zà-ÿ]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t; };
// Testo di chi manca: «Aspetto Marco (calibrazione)» / «Aspetto Giulia (tutorial 3/11) e Marco (inquadra il QR)»
export function waitingText(waiting = []){
  if (!waiting.length) return '';
  const one = w => `${w.name}${w.detail ? ` (${lc(w.detail)})` : ''}`;
  return `Aspetto ${waiting.map(one).join(' e ')}`;
}
// «Giulia e Marco»
export const bothNames = slots => slots.map(s => s.name).join(' e ');

// Perché il conto alla rovescia si è fermato: il primo giocatore non più pronto, con il suo stato («Conto annullato ·
// Marco: telefono scollegato»; senza aggettivi da accordare con il nome)
export function cancelText(slots = []){
  const w = slots.find(s => s?.state !== 'ready');
  if (!w) return 'Conto fermato';
  const what = w.detail || (w.badge && w.badge !== READY_BADGE[w.state] ? w.badge : READY_BADGE[w.state]);
  return `Conto annullato · ${w.name}: ${lc(what)}`;
}

// Conto alla rovescia: update(go, now) a ogni giro (natpf_split_ui.tick, ogni 100 ms).
//   • parte quando go diventa vero, con left = secondi che mancano (3, 2, 1);
//   • fire vero una volta sola, quando arriva a zero (poi non riparte finché go non torna falso);
//   • go falso a conto in corso: si annulla (cancelled vero una volta) e riparte da capo la prossima volta.
export function createCountdown({ ms = READY_COUNTDOWN_MS } = {}){
  let start = null, fired = false;
  const idle = (cancelled = false) => ({ left: 0, fire: false, running: false, cancelled });
  return {
    get running(){ return start != null && !fired; },
    update(go, now){
      if (!go){ const was = start != null && !fired; start = null; fired = false; return idle(was); }
      if (fired) return idle();
      if (start == null) start = now;
      const rem = ms - (now - start);
      if (rem <= 0){ fired = true; return { left: 0, fire: true, running: false, cancelled: false }; }
      return { left: Math.ceil(rem/1000), fire: false, running: true, cancelled: false };
    },
    reset(){ start = null; fired = false; },
  };
}

/* ---------- disegno (DOM) ---------- */
const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
// Una scheda: classi is-*, data-ready, nome, «tu», parola del distintivo e dettaglio. Cambia solo quello che è diverso,
// così l'animazione dell'arrivo a «Pronto» (ready-pop, CSS) parte una volta sola e non a ogni giro
export function paintSlot(el, v){
  if (!el || !v) return;
  if (el.dataset && el.dataset.ready !== v.state){
    for (const s of READY_STATES) el.classList.toggle(`is-${s}`, s === v.state);
    el.dataset.ready = v.state;
  }
  setText(el.querySelector('[data-ready-name]'), v.name);
  setText(el.querySelector('[data-ready-word]'), v.badge);
  setText(el.querySelector('[data-ready-detail]'), v.detail);
  const you = el.querySelector('[data-ready-you]'); if (you) you.classList.toggle('hidden', !v.you);
  if (el.title !== v.aria) el.title = v.aria;
}
// Schede compatte (pagina «Partita» dello stesso schermo, pannello del P2 e barra dell'invito della sfida)
export const slotHtml = (id, { compact = true } = {}) => `<div class="ready-slot${compact ? ' compact' : ''} is-off" data-ready="off" data-p="${id === 'p2' ? 'p2' : 'p1'}" data-ready-slot="${id}"><i class="ready-ico" aria-hidden="true"></i><span class="ready-who"><b data-ready-name>${defaultName(id)}</b><small class="ready-you hidden" data-ready-you>tu</small></span><span class="ready-badge"><b data-ready-word>${READY_BADGE.off}</b></span><span class="ready-detail" data-ready-detail></span></div>`;
// Tabellone con una scheda per giocatore: la struttura si scrive una volta, poi solo paintSlot
export function paintBoard(el, views = []){
  if (!el) return;
  const key = views.map(v => v.id).join(',');
  if (el.dataset && el.dataset.board !== key){ el.innerHTML = views.map(v => slotHtml(v.id)).join(''); el.dataset.board = key; }
  for (const v of views) paintSlot(el.querySelector(`[data-ready-slot="${v.id}"]`), v);
}
