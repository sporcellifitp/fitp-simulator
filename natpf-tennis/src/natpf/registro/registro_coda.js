// Registro dello stand (B30): la coda dei blocchi non ancora inviati. Il PC dello stand non è dell'utente: sul PC resta
// SOLO quello che non è ancora arrivato allo spazio Cloudflare (registro_invio.js); a invio confermato il blocco si
// cancella. Tre code con le stesse funzioni e lo stesso tetto (registro_formato.REGISTRO.maxCoda, 200 MB: oltre, si
// scartano i blocchi più vecchi):
//   - programma Windows: file nella cartella «registro» accanto a programma.log, scritti dal processo principale
//     (natpf-desktop/src/registro.mjs) attraverso window.natpfDesktop.registro;
//   - browser: IndexedDB di questa pagina;
//   - memoria: prove e browser senza IndexedDB (si perde alla chiusura: il pannello lo dice).
// Nessuna funzione lancia errori: se la coda non si può scrivere (disco pieno, permesso negato, spazio del browser
// finito) la risposta è { ok: false } e il gioco continua identico.
//   metti(id, testo) → { ok, perche?, scartati? }   id: registro_formato.idBlocco; testo: righe JSON con l'a capo
//   elenco() → [{ id, byte, righe }]                 in ordine (i più vecchi prima)
//   leggi(id) → testo | null        togli(id) → { ok }
//   stato() → { tipo, blocchi, byte, righe, scartati, cartella? }      apri() → { ok } (solo programma: apre la cartella)
import { REGISTRO, BLOCCO_RE } from './registro_formato.js';

const enc = new TextEncoder();
const ordina = list => [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const contaRighe = testo => { let n = 0; for (let i = 0; i < testo.length; i++) if (testo.charCodeAt(i) === 10) n++; return n; };
// controllo comune: identificativo giusto, testo di righe (ogni riga comincia con {"k":" e finisce con l'a capo), misura
export function controllaBlocco(id, testo, L = REGISTRO){
  if (!BLOCCO_RE.test(String(id || ''))) return { ok: false, perche: 'identificativo non valido' };
  if (typeof testo !== 'string' || !testo.endsWith('\n')) return { ok: false, perche: 'blocco non valido' };
  const byte = enc.encode(testo).length;
  if (byte > L.maxBlocco) return { ok: false, perche: 'blocco troppo grande' };
  for (const riga of testo.split('\n')) if (riga && !riga.startsWith('{"k":"')) return { ok: false, perche: 'riga non del registro' };
  return { ok: true, byte, righe: contaRighe(testo) };
}
// blocchi da scartare (i più vecchi) perché, aggiunti `byte`, la coda resti sotto il tetto. Funzione pura: la usa anche
// il programma Windows (stessa regola, provata nei due posti)
export function daScartare(elenco, byte, L = REGISTRO){
  let tot = elenco.reduce((a, b) => a + (b.byte || 0), 0) + byte; const via = [];
  for (const b of ordina(elenco)){ if (tot <= L.maxCoda) break; via.push(b.id); tot -= b.byte || 0; }
  return via;
}
const riassunto = (tipo, indice, scartati, extra = {}) => ({ tipo, blocchi: indice.size, byte: [...indice.values()].reduce((a, b) => a + b.byte, 0), righe: [...indice.values()].reduce((a, b) => a + b.righe, 0), scartati, ...extra });

/* ---------- memoria ---------- */
export function codaMemoria({ limiti = REGISTRO } = {}){
  const indice = new Map(), testi = new Map(); let scartati = 0;
  return {
    tipo: 'memoria',
    async metti(id, testo){
      const c = controllaBlocco(id, testo, limiti); if (!c.ok) return c;
      if (indice.has(id)) return { ok: true, doppione: true };
      for (const v of daScartare([...indice.values()], c.byte, limiti)){ indice.delete(v); testi.delete(v); scartati++; }
      indice.set(id, { id, byte: c.byte, righe: c.righe }); testi.set(id, testo);
      return { ok: true };
    },
    async elenco(){ return ordina([...indice.values()]).map(b => ({ ...b })); },
    async leggi(id){ return testi.get(id) ?? null; },
    async togli(id){ indice.delete(id); testi.delete(id); return { ok: true }; },
    async stato(){ return riassunto('memoria', indice, scartati); },
  };
}

/* ---------- browser (IndexedDB) ---------- */
// due magazzini: «indice» (id, byte, righe: si legge tutto all'apertura, è piccolo) e «testi» (id, testo)
const DB = 'natpf-registro';
const richiesta = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error || new Error('IndexedDB')); });
const finita = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onabort = tx.onerror = () => rej(tx.error || new Error('scrittura annullata')); });
export function codaBrowser({ idb = globalThis.indexedDB, limiti = REGISTRO } = {}){
  let dbP = null, indice = null, scartati = 0;
  const apri = () => dbP || (dbP = new Promise((res, rej) => {
    const req = idb.open(DB, 2);
    req.onupgradeneeded = () => { const db = req.result; for (const n of [...db.objectStoreNames]) db.deleteObjectStore(n); db.createObjectStore('indice', { keyPath: 'id' }); db.createObjectStore('testi', { keyPath: 'id' }); };
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error || new Error('IndexedDB')); req.onblocked = () => rej(new Error('IndexedDB occupato'));
  }).catch(e => { dbP = null; throw e; }));
  const carica = async () => {
    const db = await apri();
    if (!indice) indice = new Map((await richiesta(db.transaction('indice').objectStore('indice').getAll())).map(b => [b.id, b]));
    return db;
  };
  const errore = e => ({ ok: false, perche: String(e?.name || e?.message || e).slice(0, 60) });
  return {
    tipo: 'browser',
    async metti(id, testo){
      try {
        const c = controllaBlocco(id, testo, limiti); if (!c.ok) return c;
        const db = await carica(); if (indice.has(id)) return { ok: true, doppione: true };
        const via = daScartare([...indice.values()], c.byte, limiti), tx = db.transaction(['indice', 'testi'], 'readwrite'), done = finita(tx);
        for (const v of via){ tx.objectStore('indice').delete(v); tx.objectStore('testi').delete(v); }
        tx.objectStore('indice').put({ id, byte: c.byte, righe: c.righe }); tx.objectStore('testi').put({ id, testo });
        await done;
        for (const v of via){ indice.delete(v); scartati++; }
        indice.set(id, { id, byte: c.byte, righe: c.righe });
        return { ok: true };
      } catch (e){ return errore(e); }
    },
    async elenco(){ try { await carica(); return ordina([...indice.values()]).map(b => ({ ...b })); } catch { return []; } },
    async leggi(id){ try { const db = await carica(); return (await richiesta(db.transaction('testi').objectStore('testi').get(id)))?.testo ?? null; } catch { return null; } },
    async togli(id){
      try { const db = await carica(), tx = db.transaction(['indice', 'testi'], 'readwrite'), done = finita(tx); tx.objectStore('indice').delete(id); tx.objectStore('testi').delete(id); await done; indice.delete(id); return { ok: true }; }
      catch (e){ return errore(e); }
    },
    async stato(){ try { await carica(); return riassunto('browser', indice, scartati); } catch { return { tipo: 'browser', blocchi: 0, byte: 0, righe: 0, scartati, errore: true }; } },
  };
}

/* ---------- programma Windows ---------- */
// ponte: window.natpfDesktop.registro = { put(id, testo), list(), read(id), remove(id), state(), open() }
// (natpf-desktop/src/preload.cjs; il processo principale rifà i controlli: accetta solo blocchi del registro)
export function codaProgramma(ponte, { limiti = REGISTRO } = {}){
  const prova = async (fn, no) => { try { return await fn(); } catch (e){ return typeof no === 'function' ? no(e) : no; } };
  const errore = e => ({ ok: false, perche: String(e?.message || e).slice(0, 60) });
  return {
    tipo: 'programma',
    metti: (id, testo) => prova(async () => { const c = controllaBlocco(id, testo, limiti); if (!c.ok) return c; return (await ponte.put(id, testo)) || { ok: false }; }, errore),
    elenco: () => prova(async () => ordina(((await ponte.list()) || []).filter(b => BLOCCO_RE.test(b?.id || '')).map(b => ({ id: b.id, byte: b.byte | 0, righe: b.righe | 0 }))), []),
    leggi: id => prova(async () => { const t = await ponte.read(id); return typeof t === 'string' ? t : null; }, null),
    togli: id => prova(async () => (await ponte.remove(id)) || { ok: true }, errore),
    stato: () => prova(async () => ({ tipo: 'programma', blocchi: 0, byte: 0, righe: 0, scartati: 0, ...((await ponte.state()) || {}) }), { tipo: 'programma', blocchi: 0, byte: 0, righe: 0, scartati: 0, errore: true }),
    apri: () => prova(async () => (await ponte.open()) || { ok: true }, { ok: false }),
  };
}

// la coda giusta per questa pagina: programma Windows, altrimenti IndexedDB, altrimenti memoria
export function creaCoda({ win = globalThis.window, idb = globalThis.indexedDB } = {}){
  const ponte = win?.natpfDesktop?.registro;
  if (ponte && typeof ponte.put === 'function') return codaProgramma(ponte);
  if (idb && typeof idb.open === 'function') return codaBrowser({ idb });
  return codaMemoria();
}
