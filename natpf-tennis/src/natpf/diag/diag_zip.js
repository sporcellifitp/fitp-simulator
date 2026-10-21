// Zip senza compressione (metodo «stored») per il pacchetto diagnostico: i file già su disco (video, eventi) entrano
// per riferimento in un Blob, senza copiarli in memoria; il CRC arriva già calcolato dal worker. Limite 4 GB (niente
// zip64): non si raggiunge, perché le registrazioni lunghe passano a una parte nuova a 1 GB. readZip legge gli zip
// «stored» (script di confronto, test).
import { crc32 } from './diag_crc.js';
const enc = new TextEncoder();
const LIMIT = 0xffffffff;

function dos(date){
  const d = date instanceof Date ? date : new Date();
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), day: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}
// entries: [{ name, data: string | Uint8Array | Blob, crc?, size? }] (per i Blob servono crc e size)
export function zipBlob(entries, { date = new Date() } = {}){
  const { time, day } = dos(date), parts = [], central = [];
  let offset = 0;
  for (const e of entries){
    let data = e.data, size, crc;
    if (typeof data === 'string') data = enc.encode(data);
    if (data instanceof Uint8Array){ size = data.length; crc = e.crc ?? crc32(data); }
    else { size = data.size; crc = e.crc; if (!Number.isInteger(crc)) throw new Error(`CRC mancante per ${e.name}`); }
    if (size > LIMIT || offset > LIMIT) throw new Error('pacchetto oltre 4 GB');
    const name = enc.encode(e.name), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, day, true); h.setUint32(14, crc >>> 0, true); h.setUint32(18, size, true); h.setUint32(22, size, true);
    h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(h.buffer, name, data);
    central.push({ name, crc, size, offset });
    offset += 30 + name.length + size;
  }
  const start = offset;
  for (const c of central){
    const h = new DataView(new ArrayBuffer(46));
    h.setUint32(0, 0x02014b50, true); h.setUint16(4, 20, true); h.setUint16(6, 20, true); h.setUint16(8, 0x0800, true); h.setUint16(10, 0, true);
    h.setUint16(12, time, true); h.setUint16(14, day, true); h.setUint32(16, c.crc >>> 0, true); h.setUint32(20, c.size, true); h.setUint32(24, c.size, true);
    h.setUint16(28, c.name.length, true); h.setUint32(42, c.offset, true);
    parts.push(h.buffer, c.name); offset += 46 + c.name.length;
  }
  if (offset > LIMIT) throw new Error('pacchetto oltre 4 GB');
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true); eocd.setUint16(8, central.length, true); eocd.setUint16(10, central.length, true);
  eocd.setUint32(12, offset - start, true); eocd.setUint32(16, start, true);
  parts.push(eocd.buffer);
  return new Blob(parts, { type: 'application/zip' });
}

// Lettura (solo «stored»): Map nome → Uint8Array, con verifica del CRC
export function readZip(bytes, { check = true } = {}){
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), dec = new TextDecoder();
  let e = bytes.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip non valido');
  const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  const out = new Map();
  for (let i = 0; i < n; i++){
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('directory dello zip non valida');
    const method = v.getUint16(p + 10, true), crc = v.getUint32(p + 16, true), size = v.getUint32(p + 20, true);
    const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nl));
    if (method !== 0) throw new Error(`${name}: compressione non supportata`);
    const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true), data = bytes.subarray(start, start + size);
    if (check && crc32(data) !== crc) throw new Error(`${name}: CRC errato`);
    out.set(name, data);
    p += 46 + nl + xl + cl;
  }
  return out;
}
