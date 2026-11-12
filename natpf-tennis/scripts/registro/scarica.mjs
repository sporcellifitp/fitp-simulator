// Scarica il registro dello stand dal Worker dell'utente (cloudflare/registro-worker.js), per chi sviluppa.
// Chi non è pratico usa la pagina del Worker nel browser (pulsanti «Scarica»): questo fa le stesse richieste.
//   REGISTRO_CHIAVE=<la chiave> node natpf-tennis/scripts/registro/scarica.mjs --url=https://<worker>.workers.dev/ --out=cartella
//        [--giorno=AAAA-MM-GG]   solo quel giorno (senza: tutti)
//        [--stato]               solo lo spazio occupato e l'elenco dei giorni, senza scaricare
//        [--cancella=AAAA-MM-GG] cancella quel giorno dallo spazio (dopo averlo scaricato!)
// La chiave si passa SOLO con la variabile d'ambiente REGISTRO_CHIAVE (o --chiave-file=percorso di un file che la
// contiene): mai come argomento, mai in un file del repository. Qui non si stampa e non si scrive da nessuna parte.
// Ogni giorno diventa cartella/registro-AAAA-MM-GG.jsonl.gz: lo legge riassunto.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const peso = b => (b >= 1024*1024*1024 ? `${(b/1024/1024/1024).toFixed(2)} GB` : b >= 1024*1024 ? `${(b/1024/1024).toFixed(1)} MB` : `${Math.round((b || 0)/1024)} kB`);
async function chiedi(base, percorso, chiave, { method = 'GET', fetch: get = fetch } = {}){
  const res = await get(new URL(percorso, base), { method, headers: { Authorization: `Bearer ${chiave}` } });
  if (!res.ok){ let e = `errore ${res.status}`; try { e = (await res.json()).error || e; } catch {} throw new Error(e); }
  return res;
}
export async function stato(base, chiave, opts){ return (await chiedi(base, 'giorni', chiave, opts)).json(); }
// un giorno, a pezzi (X-Registro-Continua), in un file solo. Risponde con { file, byte, blocchi }
export async function scaricaGiorno(base, chiave, giorno, out, opts){
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, `registro-${giorno}.jsonl.gz`), parziale = `${file}.part`, fd = fs.openSync(parziale, 'w'); let da = '', byte = 0, blocchi = 0;
  try {
    do {
      const r = await chiedi(base, `scarica?a-pezzi=1&giorno=${giorno}${da ? `&da=${encodeURIComponent(da)}` : ''}`, chiave, opts), b = Buffer.from(await r.arrayBuffer());
      fs.writeSync(fd, b); byte += b.length; blocchi += +r.headers.get('X-Registro-Blocchi') || 0; da = r.headers.get('X-Registro-Continua') || '';
    } while (da);
  } catch (e){ fs.closeSync(fd); fs.rmSync(parziale, { force: true }); throw e; }
  fs.closeSync(fd); fs.renameSync(parziale, file);
  return { file, byte, blocchi };
}
// cancella un giorno (a pezzi: finito: false → si richiama)
export async function cancellaGiorno(base, chiave, giorno, opts){
  for (let i = 0; i < 500; i++){ const j = await (await chiedi(base, `giorni?giorno=${giorno}`, chiave, { ...opts, method: 'DELETE' })).json(); if (j.finito !== false) return j; }
  throw new Error('cancellazione non finita');
}
export async function main(argv, { env = process.env, log = console.log, error = console.error, fetch: get = fetch } = {}){
  try {
    const o = {};
    for (const a of argv){ const m = /^--([\w-]+)(?:=([\s\S]*))?$/.exec(a); if (!m || !['url', 'out', 'giorno', 'stato', 'cancella', 'chiave-file'].includes(m[1])) throw new Error(`argomento non valido: «${a}»`); o[m[1]] = m[2] ?? true; }
    if (!o.url) throw new Error('manca --url=indirizzo del Worker del registro');
    const chiave = (o['chiave-file'] ? fs.readFileSync(o['chiave-file'], 'utf8') : env.REGISTRO_CHIAVE || '').trim();
    if (!chiave) throw new Error('manca la chiave: variabile d’ambiente REGISTRO_CHIAVE (non scriverla come argomento)');
    const base = new URL(o.url).href, opts = { fetch: get };
    if (o.cancella){ const j = await cancellaGiorno(base, chiave, o.cancella, opts); log(`Cancellato ${o.cancella}. Spazio occupato adesso: ${peso(j.byte)} su ${peso(j.maxByte)}.`); return 0; }
    const s = await stato(base, chiave, opts);
    log(`Spazio occupato dal registro: ${peso(s.byte)} su ${peso(s.maxByte)}; giorni: ${s.giorni.length}.`);
    for (const g of s.giorni) log(`  ${g.giorno}  ${String(g.partite ?? '—').padStart(6)} partite  ${String(g.righe ?? '—').padStart(8)} righe  ${peso(g.byte).padStart(9)}`);
    if (s.cancellati?.length) log(`Cancellati: ${s.cancellati.map(c => `${c.giorno} (${c.perche === 'tetto' ? 'spazio pieno' : 'a mano'})`).join(', ')}.`);
    if (o.stato) return 0;
    if (!o.out) throw new Error('manca --out=cartella (oppure --stato)');
    const giorni = o.giorno ? [o.giorno] : s.giorni.map(g => g.giorno);
    for (const g of giorni){ const r = await scaricaGiorno(base, chiave, g, o.out, opts); log(`Scaricato ${r.file}: ${r.blocchi} blocchi, ${peso(r.byte)}.`); }
    log(`Riassunto: node natpf-tennis/scripts/registro/riassunto.mjs ${o.out}`);
    return 0;
  } catch (e){ error(`Errore: ${e.message}`); return 1; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
