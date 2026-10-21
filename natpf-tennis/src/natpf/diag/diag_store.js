// Magazzino delle sessioni diagnostiche. Di norma un worker (diag_worker.js) scrive nel file system privato del browser:
// niente memoria che cresce con la durata, niente lavoro sul thread del gioco, sessioni che sopravvivono a una chiusura
// improvvisa. Senza quel supporto (browser vecchi) si ripiega sulla memoria, con un limite e senza recupero.
const ROOT_DIR = 'natpf-diag';
export const MEMORY_LIMIT = 300*1024*1024;

function workerStore(){
  const w = new Worker(new URL('./diag_worker.js', import.meta.url), { type: 'module' });
  const pending = new Map(); let rid = 0, inflight = 0;
  w.onmessage = e => { const p = pending.get(e.data?.rid); if (!p) return; pending.delete(e.data.rid); e.data.ok ? p.res(e.data) : p.rej(new Error(e.data.error)); };
  w.onerror = e => { for (const p of pending.values()) p.rej(new Error(e.message || 'worker')); pending.clear(); };
  const call = (msg, transfer = []) => new Promise((res, rej) => { const r = ++rid; pending.set(r, { res, rej }); w.postMessage({ ...msg, rid: r }, transfer); });
  const dir = async id => (await (await navigator.storage.getDirectory()).getDirectoryHandle(ROOT_DIR)).getDirectoryHandle(id);
  return {
    kind: 'disk',
    probe: () => call({ op: 'probe' }),
    open: (id, meta) => call({ op: 'open', id, meta }),
    // buf: ArrayBuffer, ceduto al worker (niente copia). inflight: byte non ancora scritti (per il controllo del ritardo)
    append(id, name, buf){ const n = buf.byteLength; inflight += n; return call({ op: 'append', id, name, buf }, [buf]).finally(() => { inflight -= n; }); },
    get backlog(){ return inflight; },
    meta: (id, patch) => call({ op: 'meta', id, patch }),
    close: (id, patch) => call({ op: 'close', id, patch }).then(r => r.meta),
    list: () => call({ op: 'list' }).then(r => r.sessions),
    recover: id => call({ op: 'recover', id }).then(r => r.meta),
    metrics: id => call({ op: 'metrics', id }).then(r => r.metrics),
    // metriche ed eventi del rapporto già serializzati (letti a righe nel worker)
    report: id => call({ op: 'report', id }).then(r => ({ metrics: r.metrics, eventsJson: r.eventsJson })),
    remove: id => call({ op: 'remove', id }),
    // file di una sessione chiusa (su disco: nessuna copia in memoria anche per video lunghi)
    async file(id, name){ return (await (await dir(id)).getFileHandle(name)).getFile(); },
  };
}

export function memoryStore(){
  const sessions = new Map(); let total = 0;
  // stessa analisi a righe del worker
  const report = async (id, viewer = true) => {
    const s = sessions.get(id); if (!s) return null;
    const { createAnalysis, lineSplitter } = await import('./diag_analysis.js');
    const a = createAnalysis({ viewer });
    const feed = (name, fn) => { const split = lineSplitter(fn), dec = new TextDecoder(); for (const p of s.parts.get(name) || []) split.push(dec.decode(p, { stream: true })); split.push(dec.decode()); split.end(); };
    feed('eventi.jsonl', e => a.event(e)); feed('telefono-sensori.jsonl', k => a.raw(k));
    const out = a.result(s.meta); s.meta.metrics = out.metrics;
    return out;
  };
  return {
    kind: 'memory',
    probe: async () => ({}),
    async open(id, meta){ sessions.set(id, { meta: { ...meta, id, ended: false }, parts: new Map(), sizes: new Map() }); },
    async append(id, name, buf){
      const s = sessions.get(id); if (!s) throw new Error('sessione non aperta: ' + id);
      if (total + buf.byteLength > MEMORY_LIMIT) throw new Error('memoria della diagnostica piena');
      if (!s.parts.has(name)){ s.parts.set(name, []); s.sizes.set(name, 0); }
      s.parts.get(name).push(new Uint8Array(buf)); s.sizes.set(name, s.sizes.get(name) + buf.byteLength); total += buf.byteLength;
      return { size: s.sizes.get(name) };
    },
    backlog: 0,
    async meta(id, patch){ const s = sessions.get(id); if (s) s.meta = { ...s.meta, ...patch }; },
    async close(id, patch = {}){
      const s = sessions.get(id); if (!s) return null;
      const { crc32 } = await import('./diag_crc.js');
      const files = {};
      for (const [name, parts] of s.parts){ let crc = 0; for (const p of parts) crc = crc32(p, crc); files[name] = { size: s.sizes.get(name), crc }; }
      s.meta = { ...s.meta, ...patch, files, ended: true };
      return s.meta;
    },
    async list(){ return [...sessions.values()].map(s => ({ ...s.meta })).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)); },
    async recover(id){ return sessions.get(id)?.meta || null; },
    async metrics(id){ return (await report(id, false))?.metrics ?? null; },
    report,
    async remove(id){ const s = sessions.get(id); if (s){ for (const n of s.sizes.values()) total -= n; sessions.delete(id); } },
    async file(id, name){ const s = sessions.get(id); return new Blob(s?.parts.get(name) || []); },
  };
}

// Il migliore disponibile: prova il worker con il file system privato, altrimenti la memoria.
export async function createDiagStore(){
  try {
    if (typeof Worker === 'undefined' || !navigator.storage?.getDirectory) throw new Error('nessun file system privato');
    const s = workerStore(); await s.probe(); return s;
  } catch (e){ const m = memoryStore(); m.reason = String(e?.message || e); return m; }
}
