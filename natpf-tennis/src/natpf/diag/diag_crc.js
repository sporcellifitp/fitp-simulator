// CRC-32 dello zip (polinomio 0xEDB88320), calcolabile a pezzi: crc32(b, crc32(a)) = crc32(a + b). Lo usano il worker
// che scrive le sessioni (CRC dei flussi mentre arrivano) e lo zip del pacchetto diagnostico.
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(bytes, crc = 0){
  let c = (crc ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
