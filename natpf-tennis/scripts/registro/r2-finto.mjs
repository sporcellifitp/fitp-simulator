// Spazio R2 finto per le prove del Worker del registro (cloudflare/registro-worker.js): le stesse funzioni del binding
// di Cloudflare che il Worker usa (put, get, head, list con prefix, delimiter, limit e cursor), in memoria. Conta le
// operazioni (ops) per controllare che una richiesta resti sotto il limite di Cloudflare. Non è R2 vero.
export function r2Finto(){
  const oggetti = new Map(), ops = { put: 0, get: 0, head: 0, list: 0 };
  const corpo = v => (typeof v === 'string' ? v : v instanceof Uint8Array ? new TextDecoder().decode(v) : String(v));
  return {
    oggetti, ops,
    async put(key, value, opts = {}){ ops.put++; const testo = corpo(value); oggetti.set(key, { testo, size: new TextEncoder().encode(testo).length, ...opts }); return { key }; },
    async get(key){ ops.get++; const o = oggetti.get(key); return o ? { key, size: o.size, customMetadata: o.customMetadata, text: async () => o.testo } : null; },
    async head(key){ ops.head++; const o = oggetti.get(key); return o ? { key, size: o.size, customMetadata: o.customMetadata } : null; },
    async list({ prefix = '', delimiter = null, limit = 1000, cursor = null } = {}){
      ops.list++;
      const keys = [...oggetti.keys()].filter(k => k.startsWith(prefix)).sort();
      if (delimiter){
        const pre = new Set(), objects = [];
        for (const k of keys){ const i = k.indexOf(delimiter, prefix.length); if (i >= 0) pre.add(k.slice(0, i + 1)); else objects.push({ key: k, size: oggetti.get(k).size }); }
        return { objects, delimitedPrefixes: [...pre], truncated: false };
      }
      const start = cursor ? keys.findIndex(k => k > cursor) : 0, from = start < 0 ? keys.length : start, page = keys.slice(from, from + limit);
      const truncated = from + limit < keys.length;
      return { objects: page.map(k => ({ key: k, size: oggetti.get(k).size })), delimitedPrefixes: [], truncated, ...(truncated ? { cursor: page[page.length - 1] } : {}) };
    },
  };
}
