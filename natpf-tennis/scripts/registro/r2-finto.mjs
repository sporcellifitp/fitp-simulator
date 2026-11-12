// Spazio R2 finto per le prove del Worker del registro (cloudflare/registro-worker.js): le stesse funzioni del binding
// di Cloudflare che il Worker usa (put con onlyIf.etagMatches, get, head, delete di una chiave o di un elenco, list
// con prefix, delimiter, limit, cursor e include), in memoria. Conta le operazioni (ops) per controllare che una
// richiesta resti sotto il limite di Cloudflare. Non è R2 vero.
// oggetti: Map chiave → { bytes, size, etag, customMetadata, httpMetadata, testo }; «testo» è il contenuto leggibile
// (i blocchi .gz si aprono da soli: comodo per le prove).
import zlib from 'node:zlib';

export function r2Finto(){
  const oggetti = new Map(), ops = { put: 0, get: 0, head: 0, list: 0, delete: 0 }; let seq = 0;
  const inByte = async v => (typeof v === 'string' ? new TextEncoder().encode(v) : v instanceof Uint8Array ? new Uint8Array(v) : new Uint8Array(await new Response(v).arrayBuffer()));
  const leggibile = bytes => { try { return (bytes[0] === 0x1f && bytes[1] === 0x8b ? zlib.gunzipSync(bytes) : Buffer.from(bytes)).toString('utf8'); } catch { return ''; } };
  const voce = (key, o) => ({ key, size: o.size, etag: o.etag, customMetadata: o.customMetadata });
  return {
    oggetti, ops,
    async put(key, value, opts = {}){
      ops.put++;
      const { onlyIf, ...resto } = opts;
      if (onlyIf?.etagMatches && oggetti.get(key)?.etag !== onlyIf.etagMatches) return null;       // qualcun altro ha scritto nel frattempo
      const bytes = await inByte(value);
      oggetti.set(key, { bytes, size: bytes.length, etag: `etag-${++seq}`, ...resto, get testo(){ return leggibile(bytes); } });
      return voce(key, oggetti.get(key));
    },
    async get(key){
      ops.get++; const o = oggetti.get(key); if (!o) return null;
      return { ...voce(key, o), text: async () => new TextDecoder().decode(o.bytes), arrayBuffer: async () => o.bytes.buffer.slice(o.bytes.byteOffset, o.bytes.byteOffset + o.bytes.byteLength) };
    },
    async head(key){ ops.head++; const o = oggetti.get(key); return o ? voce(key, o) : null; },
    async delete(keys){ ops.delete++; for (const k of Array.isArray(keys) ? keys : [keys]) oggetti.delete(k); },
    async list({ prefix = '', delimiter = null, limit = 1000, cursor = null } = {}){
      ops.list++;
      const keys = [...oggetti.keys()].filter(k => k.startsWith(prefix)).sort();
      if (delimiter){
        const pre = new Set(), objects = [];
        for (const k of keys){ const i = k.indexOf(delimiter, prefix.length); if (i >= 0) pre.add(k.slice(0, i + 1)); else objects.push(voce(k, oggetti.get(k))); }
        return { objects, delimitedPrefixes: [...pre], truncated: false };
      }
      const start = cursor ? keys.findIndex(k => k > cursor) : 0, from = start < 0 ? keys.length : start, page = keys.slice(from, from + limit);
      const truncated = from + limit < keys.length;
      return { objects: page.map(k => voce(k, oggetti.get(k))), delimitedPrefixes: [], truncated, ...(truncated ? { cursor: page[page.length - 1] } : {}) };
    },
    // byte dei blocchi del registro (senza l'indice): lo spazio vero, da confrontare con il conto del Worker
    byteBlocchi(){ let n = 0; for (const [k, o] of oggetti) if (k.startsWith('registro/')) n += o.size; return n; },
  };
}
