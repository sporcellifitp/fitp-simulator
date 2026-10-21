// Worker della modalità diagnostica: scrive le sessioni nel file system privato del browser un pezzo alla volta, fuori
// dal thread del gioco. Ogni sessione è una cartella natpf-diag/<id>/ con i flussi (eventi, campioni del telefono,
// video) e meta.json, riscritto ogni pochi secondi: se la pagina si chiude o il browser si blocca resta tutto fino
// all'ultimo pezzo scritto e la sessione si recupera al riavvio (stato «interrotta»).
// Messaggi: { rid, op, … } → { rid, ok, … }. Le operazioni di una sessione passano in coda, una alla volta.
import { crc32 } from './diag_crc.js';
import { computeMetrics } from './diag_metrics.js';
const ROOT_DIR = 'natpf-diag';
const live = new Map();             // id → { dir, files: Map(nome → { h, size, crc }), meta, queue, lastMeta }
let rootP = null;

const enc = new TextEncoder(), dec = new TextDecoder();
const root = () => rootP || (rootP = navigator.storage.getDirectory().then(r => r.getDirectoryHandle(ROOT_DIR, { create: true })));
async function writeWhole(dir, name, text){
  const fh = await dir.getFileHandle(name, { create: true }), h = await fh.createSyncAccessHandle();
  try { const b = enc.encode(text); h.truncate(0); h.write(b, { at: 0 }); h.flush(); } finally { h.close(); }
}
async function readText(dir, name){
  const fh = await dir.getFileHandle(name), f = await fh.getFile();
  return dec.decode(await f.arrayBuffer());
}
// righe JSON (l'ultima può essere troncata da una chiusura improvvisa: si salta)
export function parseLines(text){ const out = []; for (const l of text.split('\n')){ if (!l) continue; try { out.push(JSON.parse(l)); } catch {} } return out; }
async function handleOf(s, name){
  let f = s.files.get(name);
  if (!f){
    const fh = await s.dir.getFileHandle(name, { create: true }), h = await fh.createSyncAccessHandle();
    const size = h.getSize();
    f = { h, size, crc: size ? null : 0 };                     // file già iniziato (ripresa): CRC da rifare alla chiusura
    s.files.set(name, f);
  }
  return f;
}
function filesInfo(s){ const out = {}; for (const [n, f] of s.files) out[n] = { size: f.size, crc: f.crc }; return out; }
async function saveMeta(s, extra = {}){
  s.meta = { ...s.meta, ...extra, files: { ...(s.meta.files || {}), ...filesInfo(s) }, savedAt: Date.now() };
  for (const f of s.files.values()) f.h.flush();
  await writeWhole(s.dir, 'meta.json', JSON.stringify(s.meta));
  s.lastMeta = Date.now();
}
// CRC di un file intero (sessione ripresa o recuperata), a blocchi da 1 MB
function crcOfHandle(h){
  const size = h.getSize(), buf = new Uint8Array(1 << 20); let crc = 0;
  for (let at = 0; at < size; at += buf.length){ const n = h.read(buf, { at }); crc = crc32(n === buf.length ? buf : buf.subarray(0, n), crc); }
  return crc;
}
const ops = {
  async probe(){
    const dir = await root(), fh = await dir.getFileHandle('.probe', { create: true });
    if (typeof fh.createSyncAccessHandle !== 'function') throw new Error('file system privato senza scrittura sincrona');
    const h = await fh.createSyncAccessHandle(); h.close(); await dir.removeEntry('.probe');
    return {};
  },
  async open({ id, meta }){
    const dir = await (await root()).getDirectoryHandle(id, { create: true });
    const s = { dir, files: new Map(), meta: { ...meta, id, ended: false }, lastMeta: 0 };
    live.set(id, s); await saveMeta(s);
    return {};
  },
  async append({ id, name, buf }){
    const s = live.get(id); if (!s) throw new Error('sessione non aperta: ' + id);
    const f = await handleOf(s, name), bytes = new Uint8Array(buf);
    f.h.write(bytes, { at: f.size }); f.size += bytes.length;
    if (f.crc != null) f.crc = crc32(bytes, f.crc);
    if (Date.now() - s.lastMeta > 3000) await saveMeta(s);
    return { size: f.size };
  },
  async meta({ id, patch }){ const s = live.get(id); if (!s) throw new Error('sessione non aperta: ' + id); await saveMeta(s, patch); return {}; },
  async close({ id, patch = {} }){
    const s = live.get(id); if (!s) return {};
    for (const f of s.files.values()) if (f.crc == null) f.crc = crcOfHandle(f.h);
    await saveMeta(s, { ...patch, ended: true });
    for (const f of s.files.values()) f.h.close();
    live.delete(id);
    return { meta: s.meta };
  },
  async list(){
    const dir = await root(), out = [];
    for await (const [name, h] of dir.entries()){
      if (h.kind !== 'directory') continue;
      try { const m = JSON.parse(await readText(h, 'meta.json')); out.push({ ...m, live: live.has(name) }); }
      catch { out.push({ id: name, broken: true }); }
    }
    return { sessions: out.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)) };
  },
  // sessione interrotta (pagina chiusa, browser bloccato): dimensioni e CRC dai file come sono, poi «chiusa»
  async recover({ id }){
    if (live.has(id)) throw new Error('sessione ancora in registrazione');
    const dir = await (await root()).getDirectoryHandle(id);
    let meta = {}; try { meta = JSON.parse(await readText(dir, 'meta.json')); } catch {}
    const files = {};
    for await (const [name, h] of dir.entries()){
      if (h.kind !== 'file' || name === 'meta.json') continue;
      const sh = await h.createSyncAccessHandle();
      try { files[name] = { size: sh.getSize(), crc: crcOfHandle(sh) }; } finally { sh.close(); }
    }
    meta = { ...meta, id, files, ended: true, recovered: true, savedAt: Date.now() };
    await writeWhole(dir, 'meta.json', JSON.stringify(meta));
    return { meta };
  },
  // metriche di una sessione chiusa, calcolate qui (niente lavoro sul thread del gioco) e salvate in metriche.json
  async metrics({ id }){
    const dir = await (await root()).getDirectoryHandle(id);
    let meta = {}; try { meta = JSON.parse(await readText(dir, 'meta.json')); } catch {}
    const lines = async name => { try { return parseLines(await readText(dir, name)); } catch { return []; } };
    const m = computeMetrics(await lines('eventi.jsonl'), { raw: await lines('telefono-sensori.jsonl'), meta });
    await writeWhole(dir, 'metriche.json', JSON.stringify(m, null, 1));
    return { metrics: m };
  },
  async remove({ id }){
    const s = live.get(id); if (s){ for (const f of s.files.values()) try { f.h.close(); } catch {} live.delete(id); }
    await (await root()).removeEntry(id, { recursive: true });
    return {};
  },
};
// in coda per sessione: le scritture di una sessione non si sovrappongono mai (una sola maniglia per file)
const queues = new Map();
self.onmessage = e => {
  const { rid, op, id } = e.data || {};
  const run = async () => {
    try { postMessage({ rid, ok: true, ...(await ops[op](e.data)) }); }
    catch (err){ postMessage({ rid, ok: false, error: String(err?.message || err) }); }
  };
  const key = id || '_', next = (queues.get(key) || Promise.resolve()).then(run, run);
  queues.set(key, next);
  next.then(() => { if (queues.get(key) === next) queues.delete(key); });
};
