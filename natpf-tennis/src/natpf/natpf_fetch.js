// Richieste «spara e dimentica» del gioco (B73, docs/b73/prove-rotte-2.md §2): POST al relay di cui non serve la
// risposta (conferma del colpo al telefono di prima a ogni colpo, /api/racket/feedback; snapshot della sfida tra due
// computer 22 volte al secondo, /api/match/sync; corpo del Player 2, /api/body).
// Il corpo della risposta va letto comunque. In Chromium (e quindi nel programma Windows, Electron) una risposta mai letta
// tiene aperta la sua richiesta per sempre, anche dopo la raccolta della memoria: misurato nel gioco vero servito dal
// server LAN, dopo 250 colpi 201 richieste aperte, e da circa 180 in su ogni richiesta della pagina (relay, registro,
// voce, /lan/status) fallisce con net::ERR_INSUFFICIENT_RESOURCES finché la pagina non si ricarica. Letta, si chiude.
// drain(r): legge e scarta il corpo (le risposte qui sono di poche decine di byte); restituisce r
export function drain(r){
  try { if (r && typeof r.arrayBuffer === 'function' && !r.bodyUsed) return r.arrayBuffer().then(() => r, () => r); } catch {}
  return Promise.resolve(r ?? null);
}
// fetch che non aspetta niente e non lascia niente aperto: mai un errore (rete giù, relay assente), risponde con la
// risposta già letta o null. Il fetch si cerca a ogni chiamata (natpf_p2p.js sostituisce window.fetch nella sfida senza
// server)
export function sendAndForget(url, init, fetchImpl = null){
  try {
    if (!fetchImpl && typeof globalThis.fetch !== 'function') return Promise.resolve(null);
    return Promise.resolve(fetchImpl ? fetchImpl(url, init) : globalThis.fetch(url, init)).then(drain, () => null).catch(() => null);
  } catch { return Promise.resolve(null); }
}
