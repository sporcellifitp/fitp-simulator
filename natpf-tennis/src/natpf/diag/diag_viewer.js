// Rapporto di una sessione (rapporto.html nel pacchetto): pagina autonoma che si apre con un doppio clic dalla cartella
// estratta. Metriche, linea del tempo degli eventi, video della webcam e del gioco affiancati e sincronizzati con il
// registro: un clic su un evento porta i due video a quell'istante (1 s prima). Uno spostamento regolabile corregge
// l'allineamento della webcam (si vede il gesto e si fa combaciare con il suo colpo). Nessuna risorsa esterna.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// eventi che vanno nella pagina (gli altri restano in eventi.jsonl): palla solo ogni 4 campioni (~15 al secondo)
const KEEP = new Set(['sessione', 'fase', 'rimbalzo', 'punto', 'tentativo', 'colpo.gioco', 'racchetta', 'piano', 'servizio', 'vuoto', 'input', 'tel.colpo', 'tel.cal', 'tel.stato', 'tel.scartato', 'tel.dispositivo', 'webcam.evento', 'webcam.camera', 'webcam.carico', 'video', 'atteso', 'marca', 'avviso', 'sessione.fine']);
// filtro di un evento alla volta (anche nel worker, mentre legge il registro a righe): l'evento, la palla ridotta o null
export function viewerFilter(){
  let i = 0;
  return e => (KEEP.has(e.k) ? e : e.k === 'palla' && i++ % 4 === 0 ? { t: e.t, k: e.k, p: e.p } : null);
}
export function viewerEvents(events){ const keep = viewerFilter(), out = []; for (const e of events){ const v = keep(e); if (v) out.push(v); } return out; }
// eventsJson: eventi già filtrati e serializzati (dal worker), così il thread del gioco non legge il registro
export function viewerHtml({ meta = {}, metrics = {}, events = [], eventsJson = null, videos = [] } = {}){
  const data = (JSON.stringify({ meta, metrics, videos }).slice(0, -1) + ',"events":' + (eventsJson ?? JSON.stringify(viewerEvents(events))) + '}').replace(/</g, '\\u003c');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sessione diagnostica ${esc(meta.inizio || meta.id || '')}</title>
<style>
:root{color-scheme:light dark;--bg:#f6f7f9;--fg:#1d2330;--mut:#5b6575;--card:#fff;--line:#d9dee6;--acc:#1f6feb;--bad:#c62828;--ok:#2e7d32}
@media (prefers-color-scheme:dark){:root{--bg:#12151b;--fg:#e8ebf0;--mut:#9aa4b2;--card:#1b2029;--line:#2c3440;--acc:#5b9bff;--bad:#ff6b6b;--ok:#7bd88f}}
*{box-sizing:border-box}body{margin:0;font:14px/1.45 system-ui,sans-serif;background:var(--bg);color:var(--fg)}
header,main{max-width:1200px;margin:0 auto;padding:12px 16px}h1{font-size:20px;margin:6px 0}h2{font-size:16px;margin:18px 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:8px 0}
.vids{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:8px}video{width:100%;background:#000;border-radius:6px}
.mut{color:var(--mut)}table{border-collapse:collapse;width:100%}td,th{padding:4px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
#tl{width:100%;height:70px;display:block;cursor:pointer}#list{max-height:420px;overflow:auto}#list tr{cursor:pointer}#list tr:hover{background:rgba(127,127,127,.12)}
.k{font-family:ui-monospace,monospace;font-size:12px}.warn{color:var(--bad)}button,input{font:inherit}pre{white-space:pre-wrap;font-size:12px}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
</style></head><body><header><h1>Sessione diagnostica</h1><div id="head" class="mut"></div></header><main>
<div class="card vids" id="vids"></div>
<div class="card"><div class="row"><b>Linea del tempo</b><span class="mut" id="now"></span>
<label>Allineamento webcam <input id="off" type="range" min="-1000" max="1000" step="10" value="0"> <span id="offv">0 ms</span></label></div><canvas id="tl"></canvas></div>
<div class="card"><div class="row"><b>Eventi</b><label><input type="checkbox" id="onlyShots" checked> solo colpi, punti e avvisi</label></div><div id="list"></div></div>
<h2>Metriche</h2><div class="card"><pre id="metrics"></pre></div>
<p class="mut">I colpi «sbagliati» si giudicano solo con un riferimento: nella prova guidata il colpo richiesto, da controllare comunque nel video. Tempi in ms dall'inizio della sessione, orologio del computer.</p>
</main>
<script type="application/json" id="dati">${data}</script>
<script>
const D = JSON.parse(document.getElementById('dati').textContent), E = D.events, $ = id => document.getElementById(id);
const fmt = ms => { const s = Math.max(0, ms/1000); return Math.floor(s/60) + ':' + (s%60).toFixed(1).padStart(4, '0'); };
const m = D.meta || {};
$('head').textContent = [m.inizio, m.controller && 'controller: ' + m.controller, m.transport && 'collegamento: ' + m.transport, m.label, D.metrics?.durataS != null && 'durata ' + D.metrics.durataS + ' s'].filter(Boolean).join(' · ');
$('metrics').textContent = JSON.stringify(D.metrics, null, 2);
// video: inizio di ciascuno sul registro (evento «video» inizio). Per i file senza durata nota (registrazione del
// browser) si forza il calcolo della durata prima di cercare
const starts = {}; for (const e of E) if (e.k === 'video' && e.stato === 'inizio') starts[e.file] = e.t;
const vids = [];
for (const v of D.videos || []){
  const box = document.createElement('div'), el = document.createElement('video');
  el.src = v.file; el.controls = true; el.preload = 'auto'; el.muted = true;
  box.innerHTML = '<div class="mut">' + (v.file.includes('webcam') ? 'Webcam (chi gioca)' : 'Gioco') + ' · ' + v.file + '</div>'; box.appendChild(el); $('vids').appendChild(box);
  el.addEventListener('loadedmetadata', () => { if (!isFinite(el.duration)){ el.currentTime = 1e7; el.addEventListener('timeupdate', function f(){ el.removeEventListener('timeupdate', f); el.currentTime = 0; }); } });
  vids.push({ el, file: v.file, start: starts[v.file] ?? 0, cam: v.file.includes('webcam') });
}
if (!vids.length) $('vids').innerHTML = '<div class="mut">Nessun video in questa sessione.</div>';
let off = 0; $('off').oninput = e => { off = +e.target.value; $('offv').textContent = off + ' ms'; };
// porta tutti i video all'istante t del registro (ms); il primo video guida gli altri
function seek(t){ for (const v of vids){ const s = (t - v.start + (v.cam ? off : 0))/1000; if (s >= 0) v.el.currentTime = s; } $('now').textContent = fmt(t); draw(t); }
let master = null; for (const v of vids){ v.el.addEventListener('play', () => { master = v; for (const o of vids) if (o !== v) o.el.play().catch(()=>{}); }); v.el.addEventListener('pause', () => { for (const o of vids) if (o !== v) o.el.pause(); }); v.el.addEventListener('timeupdate', () => { if (master === v){ const t = v.el.currentTime*1000 + v.start - (v.cam ? off : 0); $('now').textContent = fmt(t); draw(t); } }); }
const end = E.length ? E[E.length - 1].t : 1, kinds = { 'tel.colpo': '#1f6feb', 'tel.scartato': '#90a4ae', input: '#8e44ad', 'colpo.gioco': '#2e7d32', racchetta: '#00838f', vuoto: '#ad1457', rimbalzo: '#999', punto: '#e67e22', avviso: '#c62828', marca: '#f1c40f', atteso: '#16a085' };
function draw(cur){
  const c = $('tl'), w = c.clientWidth, h = 70; c.width = w*devicePixelRatio; c.height = h*devicePixelRatio; const g = c.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio);
  const ks = Object.keys(kinds), row = h/ks.length;
  ks.forEach((k, i) => { g.fillStyle = kinds[k]; for (const e of E) if (e.k === k){ const x = e.t/end*w; g.fillRect(x, i*row + 1, 2, row - 2); } });
  if (cur != null){ g.fillStyle = 'rgba(127,127,127,.9)'; g.fillRect(cur/end*w - 1, 0, 2, h); }
}
$('tl').onclick = e => { const r = e.target.getBoundingClientRect(); seek((e.clientX - r.left)/r.width*end); };
const desc = e => ({
  'tel.colpo': () => (e.scartato ? 'telefono: scartato (' + e.scartato + ')' : 'telefono: ' + (e.lato || '?') + ' / ' + (e.tipo || '?') + (e.intenzione ? ' · forza ' + e.intenzione.forza + ' · profondità ' + e.intenzione.profondita + ' · piatto ' + e.intenzione.piatto : ' · mira ' + e.mira) + (e.forma ? ' · salita ' + e.forma.salita + ' · piano ' + e.forma.piano : '') + ' · consegna ' + e.consegna + ' ms · rilevamento ' + e.rilevamento + ' ms') + (e.n != null ? ' · #' + e.n : '') + (e.via ? ' · ' + e.via : ''),
  racchetta: () => 'esito ' + (e.chi || '') + ': ' + (e.voluto || '?') + ' → ' + (e.colpo || '?') + ' · ' + (e.voto || '') + ' · tempo ' + e.tempoMs + ' ms · qualità ' + e.qualita + (e.assistito ? ' (assistito)' : '') + (e.fallito ? ' · fallito' + (e.rete ? ' in rete' : ' lungo') : '') + ' · x ' + e.x + ' z ' + e.z + (e.volee ? ' · al volo' : ''),
  piano: () => 'piano ' + (e.chi || '') + ': ' + (e.tipo || '?') + (e.contatto ? ' a z ' + e.contatto[2] + ', alta ' + e.contatto[1] + ' m' : '') + ' fra ' + (e.tc ?? '?') + ' s · corsa ' + e.corsa,
  'tel.scartato': () => 'telefono: gesto non mandato (' + (e.perche || '?') + ')' + (e.pk != null ? ' · ' + e.pk + ' °/s' : '') + (e.ampiezza != null ? ' · ' + e.ampiezza + '°' : ''),
  'tel.dispositivo': () => 'telefono: ' + (e.ua || '?') + (e.version ? ' · pagina ' + e.version : '') + (e.wakeLock === false ? ' · niente blocco dello schermo' : ''),
  servizio: () => 'servizio ' + (e.chi || '') + ': ' + (e.tipo || '?') + ' · ' + (e.voto || '') + ' · qualità ' + e.qualita + ' · dal colmo ' + e.tauMs + ' ms · ' + (e.kmh ?? '?') + ' km/h',
  vuoto: () => 'colpo a vuoto: ' + (e.perche || '?') + (e.anticipoMs != null ? ' · ' + e.anticipoMs + ' ms prima del punto d’impatto' : ''),
  input: () => 'input ' + (e.fonte || '?') + ': ' + e.tipo + ' ' + (e.lato || '') + ' ' + (e.colpo || ''),
  'colpo.gioco': () => e.chi + (e.esito ? ': ' + e.esito : '') + (e.tempo ? ' · ' + e.tempo : '') + (e.qualita ? ' · ' + e.qualita : '') + (e.x != null ? ' · rimbalzo x ' + e.x : '') + (e.direzione ? ' · ' + e.direzione : ''),
  rimbalzo: () => 'rimbalzo x ' + e.x + ' z ' + e.z + ' (' + (e.da || '') + ')', punto: () => 'punto a ' + e.vince + ' · ' + e.motivo,
  avviso: () => 'avviso: ' + e.testo, marca: () => 'segno: ' + e.testo, atteso: () => 'richiesto: ' + [e.lato, e.colpo, e.direzione].filter(Boolean).join(' '),
  fase: () => 'fase ' + e.a, tentativo: () => 'tentativo: dz ' + e.dz + ' m · correzione ' + e.shift + ' m · ' + (e.colpito ? 'colpita' : 'non colpita'),
  'tel.stato': () => 'telefono: ' + e.collegamento + ' / ' + (e.telefono || '') + (e.visibile === false ? ' · pagina nascosta' : '') + (e.schermo ? ' · schermo ' + e.schermo : ''),
  'tel.cal': () => 'calibrazione: ' + e.kind + (e.step ? ' ' + e.step : '') + (e.ok != null ? (e.ok ? ' ok' : ' no') : ''), 'webcam.evento': () => 'webcam: ' + e.tipo + ' ' + (e.side || '') + ' ' + (e.shotType || ''),
  'webcam.camera': () => 'webcam accesa: ' + (e.ottenuto ? e.ottenuto.w + '×' + e.ottenuto.h + ' a ' + (e.ottenuto.fps ?? '?') + ' fps' : '') + ', modello ' + (e.livello || ''), 'webcam.carico': () => 'webcam: modello ' + e.da + ' → ' + e.a + ' (inferenza ' + e.p50 + ' ms)',
  video: () => 'video ' + e.file + ' ' + e.stato, sessione: () => 'inizio sessione', 'sessione.fine': () => 'fine sessione',
}[e.k] || (() => e.k))();
function list(){
  const only = $('onlyShots').checked, rows = [];
  for (const e of E){ if (e.k === 'palla') continue; if (only && !['tel.colpo', 'tel.scartato', 'input', 'colpo.gioco', 'racchetta', 'servizio', 'vuoto', 'punto', 'avviso', 'marca', 'atteso'].includes(e.k)) continue; rows.push('<tr data-t="' + e.t + '"><td class="k">' + fmt(e.t) + '</td><td class="' + (e.k === 'avviso' ? 'warn' : '') + '">' + desc(e).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) + '</td></tr>'); }
  $('list').innerHTML = '<table>' + rows.join('') + '</table>';
}
$('list').onclick = e => { const tr = e.target.closest('tr'); if (tr) seek(+tr.dataset.t - 1000); };
$('onlyShots').onchange = list; list(); draw(0); addEventListener('resize', () => draw());
</script></body></html>`;
}

export function readmeText(meta = {}){
  return `Pacchetto diagnostico NATPF Simulator
Sessione ${meta.id || ''} · inizio ${meta.inizio || ''}${meta.parte > 1 || meta.prossima ? `
Parte ${meta.parte || 1} di una registrazione lunga (stesso orologio: t continua dalla prima parte)${meta.precedente ? ` · precedente ${meta.precedente}` : ''}${meta.prossima ? ` · successiva ${meta.prossima}` : ''}` : ''}

Apri rapporto.html con il browser (doppio clic, dopo aver estratto lo zip): metriche, linea del tempo e video
sincronizzati. Un clic su un evento porta i video a quell'istante.

File:
- sessione.json        dati della sessione (dispositivi, impostazioni, file, durata)
- metriche.json        metriche calcolate (latenze, jitter, frequenze, fps, perdite, prova guidata)
- eventi.jsonl         tutti gli eventi, una riga JSON ciascuno; t = ms dall'inizio, orologio del computer
- telefono-sensori.jsonl  campioni grezzi del telefono (t computer all'arrivo, k istante sul telefono, q numero)
- video-webcam.*, video-gioco.*  video della sessione (se registrati)

Orologi: il telefono ha il suo orologio; gli scambi tel.orologio (d invio e r ricezione sul computer, p ora del
telefono) permettono di ricalcolare scarto e deriva. Gli istanti dei colpi del telefono (picco) sono già portati
sull'orologio del computer.
Confronto tra due sessioni: node scripts/diag/diag.mjs confronta prima.zip dopo.zip (cartella natpf-tennis).
`;
}
