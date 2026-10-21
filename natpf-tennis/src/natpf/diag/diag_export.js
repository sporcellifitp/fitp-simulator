// Pacchetto di una sessione: zip con rapporto.html (metriche, linea del tempo, video sincronizzati), dati e video.
// I file su disco entrano nello zip per riferimento (Blob): anche con video lunghi nessuna copia in memoria.
import { zipBlob } from './diag_zip.js';
import { viewerHtml, readmeText } from './diag_viewer.js';
import { computeMetrics } from './diag_metrics.js';

const parse = text => { const out = []; for (const l of text.split('\n')){ if (!l) continue; try { out.push(JSON.parse(l)); } catch {} } return out; };
const ORDER = ['eventi.jsonl', 'telefono-sensori.jsonl'];
// metriche ed eventi per il rapporto (metriche già calcolate dal worker se ci sono)
export async function sessionReport(store, id){
  const all = await store.list(); let meta = all.find(s => s.id === id);
  if (!meta) throw new Error('sessione non trovata');
  if (!meta.ended) meta = await store.recover(id);
  let metrics = null;
  try { metrics = await store.metrics(id); } catch {}
  const evFile = meta.files?.['eventi.jsonl'] ? await store.file(id, 'eventi.jsonl') : null;
  const events = evFile ? parse(await evFile.text()) : [];
  if (!metrics){
    const rawFile = meta.files?.['telefono-sensori.jsonl'] ? await store.file(id, 'telefono-sensori.jsonl') : null;
    metrics = computeMetrics(events, { raw: rawFile ? parse(await rawFile.text()) : [], meta });
  }
  return { meta, metrics, events };
}
export async function buildPackage(store, id){
  const { meta, metrics, events } = await sessionReport(store, id);
  const names = Object.keys(meta.files || {}).filter(n => n !== 'meta.json' && n !== 'metriche.json');
  const videos = names.filter(n => n.startsWith('video-')).map(file => ({ file }));
  const entries = [
    { name: 'LEGGIMI.txt', data: readmeText(meta) },
    { name: 'rapporto.html', data: viewerHtml({ meta, metrics, events, videos }) },
    { name: 'sessione.json', data: JSON.stringify(meta, null, 1) },
    { name: 'metriche.json', data: JSON.stringify(metrics, null, 1) },
  ];
  for (const n of [...ORDER.filter(n => names.includes(n)), ...names.filter(n => !ORDER.includes(n))]){
    const f = meta.files[n]; if (!f?.size) continue;
    entries.push({ name: n, data: await store.file(id, n), crc: f.crc, size: f.size });
  }
  return { blob: zipBlob(entries, { date: new Date(meta.startedAt || Date.now()) }), name: `natpf-diagnostica-${id}.zip`, meta, metrics };
}
export function download(blob, name){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
}
