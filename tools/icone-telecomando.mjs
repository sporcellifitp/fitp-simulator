// Icone del telecomando dello staff (B27) per la schermata Home: site/tennis/telecomando-192.png e -512.png.
// Disegnate qui (niente programmi di grafica): fondo nero, quadrato giallo arrotondato, croce delle frecce nera con il
// tasto OK al centro e la pallina rosa. PNG scritto a mano (zlib di Node).   node tools/icone-telecomando.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
export function png(size, pixel){
  const raw = Buffer.alloc((size*4 + 1)*size);
  for (let y = 0; y < size; y++){ raw[y*(size*4 + 1)] = 0; for (let x = 0; x < size; x++){ const [r, g, b, a] = pixel(x/size, y/size); raw.set([r, g, b, a], y*(size*4 + 1) + 1 + x*4); } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const roundRect = (u, v, x0, y0, x1, y1, r) => { const cx = Math.max(x0 + r, Math.min(u, x1 - r)), cy = Math.max(y0 + r, Math.min(v, y1 - r)); return Math.hypot(u - cx, v - cy) <= r; };
// u, v in 0..1: colore del punto (icona «maskable»: il disegno sta nel cerchio centrale dell'80%)
function pixel(u, v){
  const BLACK = [0, 0, 0, 255], YELLOW = [255, 212, 0, 255], PINK = [255, 61, 139, 255];
  if (!roundRect(u, v, .14, .14, .86, .86, .12)) return BLACK;
  const arm = (a, b) => roundRect(u, v, a[0], a[1], b[0], b[1], .03);
  if (Math.hypot(u - .5, v - .5) < .085) return Math.hypot(u - .5, v - .5) < .055 ? PINK : YELLOW;
  if (arm([.41, .24], [.59, .76]) || arm([.24, .41], [.76, .59])) return BLACK;
  return YELLOW;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]){
  for (const size of [192, 512]){
    const file = fileURLToPath(new URL(`../site/tennis/telecomando-${size}.png`, import.meta.url));
    fs.writeFileSync(file, png(size, pixel));
    console.log(file, fs.statSync(file).size, 'byte');
  }
}
