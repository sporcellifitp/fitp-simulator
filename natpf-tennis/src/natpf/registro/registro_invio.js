// Registro dello stand (B30): l'invio. Prende i blocchi dalla coda sul disco (registro_coda.js), in ordine, e li manda
// al Worker dell'utente (cloudflare/registro-worker.js) che li scrive nel suo spazio Cloudflare R2. A invio confermato
// il blocco si cancella dal PC. Senza rete, o senza indirizzo configurato, i blocchi restano in coda e si rimandano
// dopo (30 s, poi il doppio, fino a 10 minuti), senza doppioni: l'identificativo del blocco è il nome del file nello
// spazio, e il Worker un blocco già scritto non lo riscrive.
//   - Mai nel ciclo di gioco: tutto asincrono, un blocco alla volta, con un tempo massimo; nessun errore esce di qui.
//   - Un blocco che il Worker rifiuta perché non valido (400, 413, 422) si toglie dalla coda (non passerà mai) e si
//     conta (il pannello lo dice); «giorno o spazio pieno» (507) e «giorno fuori dalla finestra» (409: orologio del
//     computer sbagliato, blocco in coda da più di una settimana) restano in coda; tutto il resto (rete, 403, 429, 5xx)
//     ferma il giro e si riprova dopo.
//   - Un blocco che non si riesce a leggere dalla coda (errore passeggero) resta: si toglie solo se manca davvero
//     (tre letture di fila senza testo).
//   - Nel corpo solo le righe, COMPRESSE con gzip (lo spazio dell'utente non è infinito: un blocco pesa circa un
//     quinto); dove il browser non sa comprimere, e alla chiusura della pagina, partono in chiaro e le comprime il
//     Worker. Tipo text/plain: una richiesta semplice, senza la domanda preliminare CORS; niente cookie né credenziali.
//     La chiave segreta dell'utente serve solo per leggere e cancellare, e qui non c'è.
import { REGISTRO, indirizzoBlocco } from './registro_formato.js';

// testo → gzip (Uint8Array), o null se questo browser non ha CompressionStream
export async function comprimi(testo){
  try {
    if (typeof CompressionStream !== 'function') return null;
    const s = new Blob([testo]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  } catch { return null; }
}

// perché l'invio non è riuscito, in parole semplici (pannello dello stand)
export function percheNo(status){
  if (!status) return 'rete assente o Worker non raggiungibile';
  if (status === 403) return 'origine non permessa (ALLOWED_ORIGINS)';
  if (status === 404 || status === 405) return `indirizzo del registro sbagliato (risposta ${status})`;
  if (status === 429) return 'troppi invii in poco tempo: si riprova tra poco';
  if (status === 507) return 'spazio Cloudflare pieno';
  if (status === 409) return 'giorno non accettato (orologio del computer?)';
  if (status >= 500) return `lo spazio Cloudflare non risponde (errore ${status})`;
  return `invio rifiutato (risposta ${status})`;
}

export class InvioRegistro {
  // indirizzo: funzione → indirizzo del Worker (o null se non configurato); wallNow: orologio del computer
  constructor({ coda, indirizzo = () => null, fetch = globalThis.fetch ? (...a) => globalThis.fetch(...a) : null, wallNow = () => Date.now(), limiti = REGISTRO, beacon = null } = {}){
    this.coda = coda; this.indirizzo = indirizzo; this.fetch = fetch; this.wallNow = wallNow; this.L = limiti; this.beacon = beacon;
    this.daInviare = true;                     // all'avvio non si sa: la coda può avere blocchi di ieri
    this.s = { ultimoOk: null, ultimoErrore: null, inviati: 0, righe: 0, byte: 0, rifiutati: 0, fuoriGiorno: 0, falliti: 0, riprovaAlle: 0, inCorso: false, pieno: false };
    this._giro = null; this._nonLetti = new Map();
  }
  get configurato(){ return !!this.indirizzo(); }
  stato(){ return { ...this.s, configurato: this.configurato }; }
  // da chiamare ogni tanto (una volta al secondo va bene): se c'è da inviare ed è ora, parte un giro
  tic(){ if (this.daInviare && !this._giro && this.configurato && this.wallNow() >= this.s.riprovaAlle) this.invia(); }
  // un giro: tutti i blocchi in coda, in ordine. forza: anche se si stava aspettando («Invia adesso»)
  invia({ forza = false } = {}){
    if (this._giro) return this._giro;
    if (!this.configurato) return Promise.resolve({ ok: false, perche: 'indirizzo del registro non configurato', inviati: 0 });
    if (!forza && this.wallNow() < this.s.riprovaAlle) return Promise.resolve({ ok: false, perche: 'in attesa di riprovare', inviati: 0 });
    this.s.inCorso = true;
    this._giro = this._invia().catch(() => ({ ok: false, perche: 'invio non riuscito', inviati: 0 })).then(r => { this._giro = null; this.s.inCorso = false; return r; });
    return this._giro;
  }
  async _manda(url, testo){
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), this.L.attesaMs) : null;
    try {
      const gz = await comprimi(testo);
      const res = await this.fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: gz || testo, mode: 'cors', credentials: 'omit', cache: 'no-store', ...(ctl ? { signal: ctl.signal } : {}) });
      return { status: res.status, ok: res.ok, dopo: +res.headers?.get?.('Retry-After') || 0, byte: gz ? gz.length : testo.length };
    } catch { return { status: 0, ok: false, dopo: 0 }; }
    finally { if (timer) clearTimeout(timer); }
  }
  async _invia(){
    const base = this.indirizzo(), elenco = await this.coda.elenco(); let inviati = 0, saltati = 0, fuori = 0;
    for (const b of elenco){
      const url = indirizzoBlocco(base, b.id), testo = url ? await this.coda.leggi(b.id) : null;
      if (!url || testo === ''){ await this.coda.togli(b.id); continue; }
      // testo che non arriva: forse un errore passeggero di lettura. Si toglie solo alla terza volta di fila
      if (testo == null){ const k = (this._nonLetti.get(b.id) || 0) + 1; if (k >= 3){ this._nonLetti.delete(b.id); await this.coda.togli(b.id); } else { this._nonLetti.set(b.id, k); saltati++; } continue; }
      this._nonLetti.delete(b.id);
      const r = await this._manda(url, testo);
      if (r.ok){ await this.coda.togli(b.id); inviati++; this.s.inviati++; this.s.righe += b.righe || 0; this.s.byte += r.byte || 0; this.s.ultimoOk = this.wallNow(); this.s.falliti = 0; this.s.ultimoErrore = null; continue; }
      if (r.status === 400 || r.status === 413 || r.status === 422){ await this.coda.togli(b.id); this.s.rifiutati++; continue; }
      if (r.status === 507){ saltati++; this.s.pieno = true; this.s.ultimoErrore = percheNo(507); continue; }
      if (r.status === 409){ saltati++; fuori++; this.s.ultimoErrore = percheNo(409); continue; }
      // rete assente, origine non permessa, troppi invii, errore del servizio: ci si ferma e si riprova più tardi
      this.s.falliti++; this.s.ultimoErrore = percheNo(r.status);
      const attesa = Math.max(r.dopo*1000, Math.min(this.L.riprovaMaxMs, this.L.riprovaMs*2**Math.min(10, this.s.falliti - 1)));
      this.s.riprovaAlle = this.wallNow() + attesa;
      return { ok: false, perche: this.s.ultimoErrore, inviati };
    }
    this.s.riprovaAlle = saltati ? this.wallNow() + this.L.riprovaMaxMs : 0;
    this.daInviare = saltati > 0 || (await this.coda.elenco()).length > saltati;
    this.s.fuoriGiorno = fuori;
    if (!saltati) this.s.pieno = false;
    return { ok: !saltati, inviati, ...(saltati ? { perche: this.s.ultimoErrore || 'blocchi in attesa: si riprova da solo' } : {}) };
  }
  // pagina che si chiude: l'ultimo blocco parte subito con sendBeacon (non si aspetta la risposta). Resta anche in
  // coda: alla riapertura si rimanda e il Worker, che lo ha già, risponde «doppione» senza riscriverlo
  allaChiusura(id, testo){
    try { const url = indirizzoBlocco(this.indirizzo(), id); if (url && this.beacon) return !!this.beacon(url, testo); } catch {}
    return false;
  }
}
