// Zip deterministico scritto solo con Node (niente programma zip esterno, niente dipendenze): lo stesso contenuto con
// la stessa versione di Node dà gli stessi byte, quindi lo stesso sha256. Con un'altra versione i byte possono cambiare:
// i dati compressi vengono dallo zlib dentro Node (process.versions.zlib; Node 22.22 ha «1.3.1-470d3a2», la variante di
// Chromium, che a livello 9 comprime in modo diverso dallo zlib 1.3 «classico»). Il peso cambia di poco (0,5% su un
// file js), ma lo sha256 di una consegna va annotato con le versioni di Node e zlib (pacchetto-cloudflare.mjs le
// stampa). B8 (04/11): serve al pacchetto Cloudflare (pacchetto-cloudflare.mjs --zip), che deve restare sotto i 25 MB.
// - percorsi in ordine di byte, separati da «/», niente voci per le cartelle;
// - data fissa: 1/1/1980 00:00, la prima che il formato DOS dello zip conosce (le date dei file su disco non contano);
// - nomi in UTF-8 (bit 11 dei flag), permessi 0644 (zip «fatto su Unix», 0o100644 negli attributi esterni);
// - deflate livello 9, oppure i byte così come sono («store») quando deflate non riduce (png, mp4, tflite già compressi);
// - niente ZIP64: oltre 65 535 file o 4 GB si ferma (il pacchetto Cloudflare ha circa 130 file e 23 MB).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// CRC-32 dello zip (polinomio 0xEDB88320): zlib.crc32 c'è da Node 22.2, altrimenti la tabella
let TABLE = null;
function tableCrc32(buf){
  if (!TABLE){
    TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TABLE[n] = c >>> 0; }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
export { tableCrc32 };
export const crc32 = typeof zlib.crc32 === 'function' ? buf => zlib.crc32(buf) >>> 0 : tableCrc32;

export const DOS_TIME = 0;                                   // 00:00:00
export const DOS_DATE = (0 << 9) | (1 << 5) | 1;             // 1980-01-01
export const FLAG_UTF8 = 0x0800;
const MADE_BY_UNIX = (3 << 8) | 20;
const FILE_0644 = (0o100644 << 16) >>> 0;
const MAX32 = 0xFFFFFFFF;
const header = (size, sig) => { const b = Buffer.alloc(size); b.writeUInt32LE(sig, 0); return b; };

// confronto per byte (non dipende dalla lingua del sistema): «A» prima di «a», «é» dopo «z»
export const byteOrder = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

// tutti i file sotto dir, come percorsi relativi con «/», in ordine di byte; i collegamenti simbolici non si seguono
export function zipFileList(dir){
  const out = [];
  const walk = (abs, rel) => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })){
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(abs, e.name), r);
      else if (e.isFile()) out.push(r);
      else throw new Error(`zip: non è un file normale: ${r}`);
    }
  };
  walk(path.resolve(dir), '');
  return out.sort(byteOrder);
}

// Scrive in «file» (che non deve esistere) lo zip di tutti i file di «dir». Restituisce dimensione e voci
// (nome, byte originali, byte nello zip, metodo 0 = store / 8 = deflate, crc). Se qualcosa va storto non lascia file.
export function writeZip(file, dir, { level = 9 } = {}){
  const names = zipFileList(dir);
  if (names.length > 0xFFFF) throw new Error(`zip: ${names.length} file, oltre 65 535 servirebbe ZIP64`);
  const fd = fs.openSync(file, 'wx');
  const entries = [], central = [];
  let offset = 0;
  const put = buf => { fs.writeSync(fd, buf); offset += buf.length; };
  try {
    for (const name of names){
      const data = fs.readFileSync(path.join(dir, ...name.split('/')));
      const crc = crc32(data);
      const deflated = zlib.deflateRawSync(data, { level });
      const method = deflated.length < data.length ? 8 : 0;
      const body = method === 8 ? deflated : data;
      const nameBuf = Buffer.from(name, 'utf8');
      if (data.length >= MAX32 || offset + 30 + nameBuf.length + body.length >= MAX32) throw new Error('zip: oltre 4 GB servirebbe ZIP64');
      const local = header(30, 0x04034b50);
      local.writeUInt16LE(method === 8 ? 20 : 10, 4);          // versione minima per estrarre: 2.0 deflate, 1.0 store
      local.writeUInt16LE(FLAG_UTF8, 6);
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(DOS_TIME, 10);
      local.writeUInt16LE(DOS_DATE, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(body.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(nameBuf.length, 26);
      local.writeUInt16LE(0, 28);                               // niente campi extra (né date Unix né uid/gid)
      const at = offset;
      put(local); put(nameBuf); put(body);
      const cen = header(46, 0x02014b50);
      cen.writeUInt16LE(MADE_BY_UNIX, 4);
      cen.writeUInt16LE(method === 8 ? 20 : 10, 6);
      cen.writeUInt16LE(FLAG_UTF8, 8);
      cen.writeUInt16LE(method, 10);
      cen.writeUInt16LE(DOS_TIME, 12);
      cen.writeUInt16LE(DOS_DATE, 14);
      cen.writeUInt32LE(crc, 16);
      cen.writeUInt32LE(body.length, 20);
      cen.writeUInt32LE(data.length, 24);
      cen.writeUInt16LE(nameBuf.length, 28);
      // 30 extra, 32 commento, 34 disco, 36 attributi interni: 0
      cen.writeUInt32LE(FILE_0644, 38);
      cen.writeUInt32LE(at, 42);
      central.push(cen, nameBuf);
      entries.push({ name, size: data.length, compressed: body.length, method, crc });
    }
    const cdStart = offset;
    for (const b of central) put(b);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(offset - cdStart, 12);
    end.writeUInt32LE(cdStart, 16);
    put(end);
  } catch (error){
    fs.closeSync(fd); fs.rmSync(file, { force: true });
    throw error;
  }
  fs.closeSync(fd);
  return { file, bytes: offset, entries };
}
