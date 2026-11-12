// Registro dello stand (B30) nel programma Windows: la coda dei blocchi non ancora inviati, su disco, nella cartella
// «registro» accanto a programma.log (%LOCALAPPDATA%\NATPF\log\registro). Il PC dello stand non è dell'utente: qui
// resta SOLO quello che non è ancora arrivato allo spazio Cloudflare; la pagina del gioco manda i blocchi al Worker
// (natpf-tennis/src/natpf/registro/registro_invio.js) e a invio confermato chiede di cancellarli. Tetto: 200 MB, oltre
// si scartano i blocchi più vecchi.
// Il canale (window.natpfDesktop.registro, src/preload.cjs) accetta SOLO blocchi del registro: identificativo
// «giorno_postazione_parte», righe JSON con un tipo previsto e il tempo, misura limitata. Niente percorsi: il nome del
// file lo fa questo modulo dall'identificativo controllato. Niente Electron qui: si prova con node:test.
// Limiti ed elenchi uguali a quelli del gioco (natpf-tennis/src/natpf/registro/registro_formato.js): lo controlla
// test/registro.test.mjs.
import fs from 'node:fs';
import path from 'node:path';

const MB = 1024*1024;
export const REGISTRO_PC = Object.freeze({
  cartella: 'registro',
  ipc: 'natpf:registro',
  azioni: Object.freeze(['put', 'list', 'read', 'remove', 'state', 'open']),
  maxBlocco: 256*1024,
  maxRiga: 2000,
  maxCoda: 200*MB,
  postazioneCrash: 'crashwin',          // blocchi scritti dal programma (pagina del gioco chiusa di colpo)
  config: 'registro.json',              // { "url": "https://…workers.dev/" }: indirizzo del Worker dell'utente (pacchetto)
});
export const TIPI = Object.freeze(['avvio', 'chiusura', 'partita', 'partita.fine', 'punto', 'colpo', 'servizio', 'vuoto', 'tutorial', 'calibrazione', 'allenamento',
  'minigioco', 'visita', 'tel', 'errore', 'crash', 'nota']);
export const BLOCCO_RE = /^(\d{4}-\d{2}-\d{2})_([a-z0-9]{8})_(\d{5,7}-[a-z0-9]{4})$/;
const p2 = v => String(v).padStart(2, '0');
const giornoDi = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const ALFABETO = 'abcdefghijkmnpqrstuvwxyz23456789';
const casuale = n => Array.from({ length: n }, () => ALFABETO[Math.floor(Math.random()*ALFABETO.length)]).join('');
const contaRighe = testo => { let n = 0; for (let i = 0; i < testo.length; i++) if (testo.charCodeAt(i) === 10) n++; return n; };

// un blocco buono? identificativo, misura, e ogni riga è una riga del registro (tipo previsto, tempo intero)
export function controllaBlocco(id, testo, L = REGISTRO_PC){
  if (typeof id !== 'string' || !BLOCCO_RE.test(id)) return { ok: false, perche: 'identificativo non valido' };
  if (typeof testo !== 'string' || !testo.endsWith('\n')) return { ok: false, perche: 'blocco non valido' };
  const byte = Buffer.byteLength(testo, 'utf8');
  if (byte > L.maxBlocco) return { ok: false, perche: 'blocco troppo grande' };
  let righe = 0;
  for (const riga of testo.split('\n')){
    if (!riga) continue;
    if (riga.length > L.maxRiga) return { ok: false, perche: 'riga troppo lunga' };
    let row = null; try { row = JSON.parse(riga); } catch {}
    if (!row || typeof row !== 'object' || Array.isArray(row) || !TIPI.includes(row.k) || !Number.isInteger(row.t) || row.t < 0) return { ok: false, perche: 'riga non del registro' };
    righe++;
  }
  if (!righe) return { ok: false, perche: 'blocco vuoto' };
  return { ok: true, byte, righe };
}

// Indirizzo del Worker del registro: solo https (http su localhost per le prove), senza utente né password, senza
// parametri. '' se manca o non va bene: il registro resta nella coda sul disco e il pannello dello stand lo dice
export function indirizzoRegistro(raw){
  let u; try { u = new URL(String(raw || '')); } catch { return ''; }
  const locale = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(u.hostname);
  if (!(u.protocol === 'https:' || (u.protocol === 'http:' && locale)) || u.username || u.password) return '';
  u.search = ''; u.hash = '';
  return u.href;
}
// dal file registro.json del pacchetto (scritto da scripts/prepara.mjs)
export function leggiIndirizzo(file){ try { return indirizzoRegistro(JSON.parse(fs.readFileSync(file, 'utf8')).url); } catch { return ''; } }

export function creaCodaRegistro({ dir, limiti = REGISTRO_PC, log = () => {}, now = () => new Date(), url = '' } = {}){
  let indice = null, scartati = 0;
  const file = id => path.join(dir, `${id}.jsonl`);
  // l'indice si fa una volta, leggendo la cartella (di solito pochi file: quelli non ancora inviati)
  const carica = () => {
    if (indice) return indice;
    indice = new Map();
    try {
      for (const name of fs.readdirSync(dir)){
        const id = name.endsWith('.jsonl') ? name.slice(0, -6) : null;
        if (!id || !BLOCCO_RE.test(id)){ if (name.endsWith('.part')) try { fs.rmSync(path.join(dir, name), { force: true }); } catch {} continue; }
        try { const testo = fs.readFileSync(path.join(dir, name), 'utf8'); indice.set(id, { id, byte: Buffer.byteLength(testo, 'utf8'), righe: contaRighe(testo) }); } catch {}
      }
    } catch {}
    return indice;
  };
  const ordinati = () => [...carica().values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const totale = () => [...carica().values()].reduce((a, b) => a + b.byte, 0);
  const api = {
    dir,
    // nessuna funzione lancia errori: { ok: false, perche } e il gioco continua
    put(id, testo){
      try {
        const c = controllaBlocco(id, testo, limiti); if (!c.ok) return c;
        const I = carica(); if (I.has(id)) return { ok: true, doppione: true };
        fs.mkdirSync(dir, { recursive: true });
        // prima in un file provvisorio: un blocco scritto a metà (PC spento) non resta nella coda; se la scrittura non
        // riesce (disco pieno) il provvisorio si toglie subito e nessun blocco vecchio è stato scartato per niente
        const tmp = `${file(id)}.part`;
        try { fs.writeFileSync(tmp, testo, 'utf8'); fs.renameSync(tmp, file(id)); }
        catch (e){ try { fs.rmSync(tmp, { force: true }); } catch {} throw e; }
        // tetto: solo dopo la scrittura riuscita, via i blocchi più vecchi (mai quello appena scritto) finché ci sta
        let tot = totale() + c.byte;
        for (const b of ordinati()){ if (tot <= limiti.maxCoda) break; if (b.id === id) continue; try { fs.rmSync(file(b.id), { force: true }); } catch {} I.delete(b.id); tot -= b.byte; scartati++; }
        I.set(id, { id, byte: c.byte, righe: c.righe });
        return { ok: true };
      } catch (e){ log('registro: blocco non scritto', e.code || e.message); return { ok: false, perche: String(e.code || e.message || 'errore').slice(0, 60) }; }
    },
    list(){ try { return ordinati().map(b => ({ ...b })); } catch { return []; } },
    read(id){ try { return typeof id === 'string' && BLOCCO_RE.test(id) && carica().has(id) ? fs.readFileSync(file(id), 'utf8') : null; } catch { return null; } },
    remove(id){
      try { if (typeof id !== 'string' || !BLOCCO_RE.test(id)) return { ok: false, perche: 'identificativo non valido' }; fs.rmSync(file(id), { force: true }); carica().delete(id); return { ok: true }; }
      catch (e){ return { ok: false, perche: String(e.code || e.message || 'errore').slice(0, 60) }; }
    },
    state(){ const list = api.list(); return { tipo: 'programma', blocchi: list.length, byte: list.reduce((a, b) => a + b.byte, 0), righe: list.reduce((a, b) => a + b.righe, 0), scartati, cartella: dir, url }; },
    // pagina del gioco chiusa di colpo (render-process-gone): una riga «crash» in un blocco del programma; la pagina,
    // quando riparte, lo manda con gli altri
    crash(motivo){
      const d = now(), sec = d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds();
      const id = `${giornoDi(d)}_${limiti.postazioneCrash}_${String(sec).padStart(5, '0')}-${casuale(4)}`;
      return api.put(id, JSON.stringify({ k: 'crash', t: 0, ora: d.toISOString(), motivo: String(motivo || 'sconosciuto').replace(/[^\w .-]/g, '').slice(0, 40) }) + '\n');
    },
  };
  return api;
}
