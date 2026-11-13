// NATPF B23 · fogli di confronto del «Dritto come nel video» (docs/b23/img): PRIMA / DOPO / VIDEO agli stessi istanti
// del dritto (preparazione, caricamento, impatto, finale, recupero), dalla camera di gioco e da una camera ravvicinata.
//   1) fotogrammi del gioco: FOGLI=cartella node natpf-dritto-video.mjs (parti «fogli», «mascotte» e «interruttore»);
//   2) poi: FOGLI=cartella node natpf-dritto-video-foglio.mjs   (OUT_DOCS=docs/b23/img di base)
// I fotogrammi VIDEO si prendono dal trailer che c'è già nel repository (natpf-desktop/media/trailer-*.mp4, 24 al
// secondo) con ffmpeg, ritagliati attorno al giocatore. Il trailer è il video da cui la prova ha preso le pose.
// Ogni foglio è un webp sotto i 300 kB (la qualità scende finché ci sta).
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const FOGLI = process.env.FOGLI, OUT = path.resolve(process.env.OUT_DOCS || path.join(root, 'docs/b23/img'));
if (!FOGLI || !existsSync(path.join(FOGLI, 'prima-vicina-impatto.png'))) throw new Error('prima: FOGLI=cartella node natpf-dritto-video.mjs');
mkdirSync(OUT, { recursive: true });
const media = path.join(root, 'natpf-desktop/media'), TRAILER = path.join(media, readdirSync(media).find(f => /^trailer.*\.mp4$/.test(f)));

// Istanti del gioco (fotogrammi a 60 al secondo dal colpo, come ISTANTI in natpf-dritto-video.mjs) e del trailer
// (fotogrammi a 24 al secondo dall'inizio; il colpo è tra il 17 e il 18) con il riquadro attorno al giocatore (x, y, lato
// in pixel del trailer 1280×720). Il trailer tiene il finale molto più a lungo del gioco: per «finale» si prende il
// fotogramma 22 (0,2 s dopo il colpo), per «recupero» il 62, quando la racchetta torna davanti.
const ISTANTI = [
  ['preparazione', 'Preparazione', '−0,40 s', { f: 10, x: 420, y: 470 }],
  ['caricamento', 'Caricamento', '−0,03 s', { f: 15, x: 400, y: 470 }],
  ['impatto', 'Impatto', '+0,02 s', { f: 17, x: 370, y: 460 }],
  ['finale', 'Finale', '+0,15 s', { f: 22, x: 380, y: 440 }],
  ['recupero', 'Recupero', '+0,37 s', { f: 62, x: 380, y: 430 }],
];
const SIDE = 420;
const vframe = ({ f, x, y }) => {
  const file = path.join(FOGLI, `video-${f}.png`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', TRAILER, '-vf', `select=eq(n\\,${f}),crop=${SIDE}:${SIDE}:${x - SIDE/2}:${Math.min(720 - SIDE, y - SIDE/2)}`, '-vframes', '1', file]);
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
  return file;
};
const uri = f => `data:image/png;base64,${readFileSync(f).toString('base64')}`;

const B = await launch();
const blank = await (await B.newContext({ viewport: { width: 800, height: 600 } })).newPage();
// foglio: righe (con il nome a sinistra) per colonne (con il titolo in alto)
async function sheet(file, { title, cols, rows, tiles, w, h }){
  const out = await blank.evaluate(async ({ title, cols, rows, tiles, w, h }) => {
    const pad = 8, left = 96, top = 40 + 30, cap = 0;
    const c = document.createElement('canvas'); c.width = left + cols.length*(w + pad) + pad; c.height = top + rows.length*(h + pad) + pad;
    const g = c.getContext('2d'); g.fillStyle = '#10131c'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.font = 'bold 19px Arial, sans-serif'; g.fillText(title, pad, 20);
    g.font = 'bold 15px Arial, sans-serif'; g.fillStyle = '#dfe6f5';
    cols.forEach((t, i) => { const lines = t.split('\n'); lines.forEach((l, k) => g.fillText(l, left + i*(w + pad) + 4, 46 + k*17 - (lines.length - 1)*8)); });
    rows.forEach((t, j) => { const lines = t.split('\n'); lines.forEach((l, k) => g.fillText(l, pad, top + j*(h + pad) + h/2 + k*18 - (lines.length - 1)*9)); });
    for (const t of tiles){
      const img = new Image(); img.src = t.src; await img.decode();
      const x = left + t.c*(w + pad), y = top + t.r*(h + pad), k = Math.max(w/img.width, h/img.height), sw = w/k, sh = h/k;
      g.drawImage(img, (img.width - sw)/2, (img.height - sh)/2, sw, sh, x, y, w, h);
    }
    for (let q = .86; q > .3; q -= .04){ const u = c.toDataURL('image/webp', q); if (u.length*.75 < 290000) return { u, q, W: c.width, H: c.height }; }
    return { u: c.toDataURL('image/webp', .3), q: .3, W: c.width, H: c.height };
  }, { title, cols, rows, tiles, w, h, cap: 0 });
  const buf = Buffer.from(out.u.split(',')[1], 'base64');
  writeFileSync(path.join(OUT, file), buf);
  check(`foglio ${file}: ${out.W}×${out.H}, sotto i 300 kB`, buf.length < 300000, `${buf.length} B, qualità ${out.q.toFixed(2)}`);
}

const video = ISTANTI.map(([, , , v]) => uri(vframe(v)));
const cols = ISTANTI.map(([, n, t]) => `${n}\n${t}`);
const strip = (prefix, cam) => ISTANTI.map(([k]) => uri(path.join(FOGLI, `${prefix}-${cam}-${k}.png`)));
const grid = rowsSrc => rowsSrc.flatMap((row, r) => row.map((src, c) => ({ src, r, c })));
// 1) camera di gioco (ritaglio attorno a chi gioca) e 2) camera ravvicinata dietro chi gioca: PRIMA, DOPO, VIDEO
await sheet('confronto-gioco.webp', { title: 'Dritto, camera di gioco: PRIMA (No) · DOPO (Sì, prova) · VIDEO (trailer)', cols, rows: ['PRIMA', 'DOPO', 'VIDEO'],
  tiles: grid([strip('prima', 'gioco'), strip('dopo', 'gioco'), video]), w: 236, h: 236 });
await sheet('confronto-vicino.webp', { title: 'Dritto, camera ravvicinata: PRIMA (No) · DOPO (Sì, prova) · VIDEO (trailer)', cols, rows: ['PRIMA', 'DOPO', 'VIDEO'],
  tiles: grid([strip('prima', 'vicina'), strip('dopo', 'vicina'), video]), w: 236, h: 236 });
// 3) mancino e 4) Lob & Drop con i modelli 3D (camera ravvicinata)
await sheet('mancino.webp', { title: 'Dritto del mancino, camera ravvicinata: PRIMA · DOPO', cols, rows: ['PRIMA', 'DOPO'],
  tiles: grid([strip('mancino-prima', 'vicina'), strip('mancino-dopo', 'vicina')]), w: 236, h: 236 });
if (existsSync(path.join(FOGLI, 'lobdrop-dopo-vicina-impatto.png')))
  await sheet('lob-drop.webp', { title: 'Dritto di Drop (personaggi «Lob & Drop», modelli 3D): PRIMA · DOPO', cols, rows: ['PRIMA', 'DOPO'],
    tiles: grid([strip('lobdrop-prima', 'vicina'), strip('lobdrop-dopo', 'vicina')]), w: 236, h: 236 });
// 5) la riga nelle Opzioni
if (existsSync(path.join(FOGLI, 'opzioni.png')))
  await sheet('opzioni.webp', { title: 'Opzioni: «Dritto come nel video (prova): Sì · No»', cols: [''], rows: [''], tiles: [{ src: uri(path.join(FOGLI, 'opzioni.png')), r: 0, c: 0 }], w: 1024, h: 576 });
await B.close();
summary();
