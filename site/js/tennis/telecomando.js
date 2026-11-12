// Telecomando dello staff (B27), pagina del telefono: frecce, OK, Indietro e i pulsanti diretti mandati al gioco; in alto
// lo stato del gioco (pagina, punteggio, telefono del giocatore). Abbinamento una volta per tutte (remote-pairing.js):
// il QR dello staff (#tc=…&k=…) o il codice scritto a mano danno una chiave che resta in localStorage; a ogni apertura
// della pagina, dopo il riavvio del gioco o del PC, dopo un calo del Wi-Fi o con lo schermo che si riaccende il telefono si
// ricollega da solo, senza fine (con attese brevi). Non manda mai sensori né colpi: non è una racchetta.
import { LanPeer, isLanMode } from './lan-transport.js';
import { peerConfig, loadPeer, iceReady } from './link.js';
import { REMOTE, parseRemotePairing, normalizeCode, codePeerId, showCode, denyText } from './remote-pairing.js';
import { NATPF_BUILD } from './version.js';

const $ = s => document.querySelector(s);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const store = {
  load(){ try { return JSON.parse(localStorage.getItem(REMOTE.phoneKey) || 'null'); } catch { return null; } },
  save(v){ try { localStorage.setItem(REMOTE.phoneKey, JSON.stringify(v)); } catch {} },
  clear(){ try { localStorage.removeItem(REMOTE.phoneKey); } catch {} },
};
// parametri della rete (?lan=1 nel programma Windows, ?peer=… nelle prove) dell'indirizzo con cui il telefono è arrivato
const netSearch = search => { const q = new URLSearchParams(search || ''); const out = new URLSearchParams(); if (q.get('lan') === '1') out.set('lan', '1'); if (q.get('peer')) out.set('peer', q.get('peer')); const s = out.toString(); return s ? `?${s}` : ''; };

// abbinamento dal QR: si legge, si salva e si toglie subito dalla barra degli indirizzi
let saved = store.load();
const fromQr = parseRemotePairing(location.hash);
if (fromQr){
  saved = { session: fromQr.session, token: fromQr.token, resume: null, search: netSearch(location.search), at: Date.now() };
  store.save(saved);
  history.replaceState(null, '', location.pathname + location.search);
}
// pagina riaperta dall'icona della schermata Home (senza parametri): quelli salvati con l'abbinamento
if (saved?.search && !location.search) history.replaceState(null, '', location.pathname + saved.search);

const R = window.__telecomando = { state: 'off', why: null, status: null, sent: 0, acks: [], tries: 0, get saved(){ return saved; } };
let peer = null, conn = null, pending = null, epoch = 0, retryT = null, pingT = null, lastRx = 0, seq = 0, codeTry = null, codeTries = 0, confirmCmd = null;
const ver = $('#ver'); if (ver) ver.textContent = `v ${NATPF_BUILD}`;

function setLink(state, text){
  R.state = state;
  const bar = $('#bar'); bar.className = state === 'on' ? 'ok' : state === 'denied' || state === 'unpaired' ? 'bad' : '';
  $('#link').textContent = text;
  const paired = !!(saved?.session && (saved.resume || saved.token)) || !!codeTry;
  show($('#setup'), !paired || state === 'unpaired');
  show($('#remote'), paired && state !== 'unpaired');
  show($('#unpair'), !!saved?.resume);
  $('#where').textContent = location.host;
}
// la rete: LAN se l'indirizzo lo dice; senza parametri (icona aperta su un iPhone non ancora abbinato) si chiede al
// computer se è il server del programma (/lan/status c'è solo lì)
async function ensureNet(){
  if (location.search) return;
  try {
    const r = await fetch('/lan/status', { cache: 'no-store' });
    if (r.ok && /json/.test(r.headers.get('content-type') || '')) history.replaceState(null, '', location.pathname + '?lan=1');
  } catch {}
}

async function connect(){
  clearTimeout(retryT);
  const target = codeTry ? codePeerId(codeTry) : saved?.session;
  if (!target) return setLink('unpaired', 'Non abbinato');
  const my = ++epoch;
  drop();
  setLink('connecting', R.tries ? 'Mi ricollego al gioco…' : 'Collegamento al gioco…');
  try {
    await ensureNet();
    const Peer = isLanMode() ? LanPeer : (await Promise.all([loadPeer(), iceReady().catch(() => null)]))[0];
    if (my !== epoch) return;
    const p = peer = new Peer(peerConfig());
    const current = () => my === epoch && peer === p;
    // senza risposta entro 10 s si riprova da capo
    retryT = setTimeout(() => { if (current() && R.state !== 'on') lost('il gioco non risponde'); }, 10000);
    p.on('open', () => {
      if (!current() || pending) return;
      const c = pending = p.connect(target, { reliable: true, serialization: 'json' });
      c.on('open', () => {
        if (!current() || pending !== c) return;
        const hello = { t: 'hello', role: 'remote', v: 1 };
        if (codeTry) hello.c = codeTry; else if (saved.resume) hello.r = saved.resume; else hello.k = saved.token;
        c.send(hello);
      });
      c.on('data', d => { if (current() && (c === conn || c === pending)) onData(c, d); });
      c.on('close', () => { if (current() && (c === conn || c === pending)) lost(); });
      c.on('error', () => { if (current() && (c === conn || c === pending)) lost(); });
    });
    p.on('error', e => {
      if (!current()) return;
      // indirizzo del gioco che non c'è: gioco chiuso, PC spento o codice sbagliato
      if (e?.type === 'peer-unavailable'){
        // (codice appena cambiato sul gioco: altri due tentativi a 2 s prima di dire che non c'è)
        if (codeTry && (codeTries = (codeTries || 0) + 1) < 3){ drop(); clearTimeout(retryT); retryT = setTimeout(connect, 2000); return; }
        if (codeTry){ codeTry = null; codeTries = 0; R.why = 'code'; setLink('unpaired', 'Codice non trovato'); msg('Codice non trovato: controlla di averlo scritto bene, con il pannello «Telecomando dello staff» aperto sul gioco.', true); return; }
        return lost('gioco non trovato (chiuso o in riavvio)');
      }
      if (!conn?.open) lost();
    });
    p.on('disconnected', () => { if (current() && !conn?.open) lost(); });
  } catch { if (my === epoch) lost(); }
}
function drop(){
  clearInterval(pingT);
  const p = peer; peer = null; pending = null; conn = null;
  try { p?.destroy(); } catch {}
}
// collegamento perso o non riuscito: si riprova sempre (1, 2, 3… fino a 5 s), finché la pagina è aperta
function lost(why = ''){
  if (R.state === 'unpaired') return;
  drop();
  R.tries++;
  setLink('lost', why ? `Scollegato: ${why}. Riprovo…` : 'Scollegato. Riprovo…');
  clearTimeout(retryT);
  retryT = setTimeout(connect, Math.min(5000, 1000*Math.min(R.tries, 5)));
}
function onData(c, d){
  if (!d || typeof d !== 'object') return;
  lastRx = performance.now(); R.rx = (R.rx || 0) + 1;
  switch (d.t){
    case 'welcome': {
      clearTimeout(retryT);
      const viaCode = !!codeTry;
      saved = { session: typeof d.s === 'string' ? d.s : saved?.session, resume: d.r, token: null, search: netSearch(location.search), at: Date.now() };
      store.save(saved);
      codeTry = null;
      // abbinato con il codice: il gioco chiude l'indirizzo del codice, ci si ricollega subito a quello fisso
      if (viaCode){ R.tries = 0; setTimeout(connect, 100); setLink('connecting', 'Abbinato! Collegamento…'); return; }
      pending = null; conn = c; R.tries = 0;
      setLink('on', 'Collegato al gioco');
      clearInterval(pingT);
      pingT = setInterval(() => {
        if (conn !== c) return;
        if (performance.now() - lastRx > REMOTE.lostMs) return lost('nessuna risposta dal gioco');
        try { c.send({ t: 'ping', c: performance.now() }); } catch {}
      }, REMOTE.pingMs);
      offerHome();
      if (R.status) paint(R.status);
      break;
    }
    case 'deny': {
      R.why = d.why;
      // chiave non più valida: si dimentica, serve il QR dello staff
      if (d.why === 'unpaired' || d.why === 'denied' || d.why === 'expired' || d.why === 'role'){ codeTry = null; saved = null; store.clear(); }
      drop();
      setLink('unpaired', 'Non abbinato');
      $('#setup-why').textContent = denyText(d.why);
      break;
    }
    case 'bye': saved = null; store.clear(); drop(); R.why = 'bye'; setLink('unpaired', 'Scollegato dal gioco'); $('#setup-why').textContent = 'Il gioco ha scollegato questo telecomando (pannello dello stand, o un altro telefono abbinato al suo posto).'; break;
    case 'pong': break;
    case 'st': R.status = d; paint(d); break;
    case 'ack': R.ackCount = (R.ackCount || 0) + 1; R.acks.push(d); if (R.acks.length > 20) R.acks.shift(); onAck(d); break;
  }
}
function send(c, extra = {}){
  if (!conn?.open) { msg('Non collegato al gioco: aspetta che si ricolleghi.', true); return false; }
  const n = ++seq; R.sent++;
  try { conn.send({ t: 'cmd', c, n, ...extra }); } catch { return false; }
  navigator.vibrate?.(12);
  return true;
}
let msgT = null;
function msg(text, bad = false){
  const el = $('#msg'); el.textContent = text || ''; el.classList.toggle('bad', !!bad);
  clearTimeout(msgT); if (text) msgT = setTimeout(() => { el.textContent = ''; }, 5000);
}
function onAck(a){
  if (a.ask){
    confirmCmd = a.cmd || null;
    $('#confirm-text').textContent = a.ask;
    show($('#confirm'), !!confirmCmd);
    return;
  }
  if (a.msg) msg(a.msg, a.ok === false);
}
// stato del gioco: pagina, dettaglio, telefono del giocatore e i comandi (1 = si può; testo = perché adesso no)
function paint(st){
  $('#page').textContent = st.label || '—';
  $('#detail').textContent = st.detail || '';
  const ph = st.phone || {};
  const parts = [];
  if (ph.mode === 'phone'){
    parts.push(ph.connected ? `<b class="ok">collegato${ph.ready ? ', pronto' : ''}</b>` : '<b class="bad">non collegato</b>');
    if (Number.isFinite(ph.battery)) parts.push(`batteria ${ph.battery}%${ph.charging ? ' in carica' : ''}`);
    if (ph.p2) parts.push(`P2 ${ph.p2.connected ? '<b class="ok">collegato</b>' : '<b class="bad">non collegato</b>'}${Number.isFinite(ph.p2.battery) ? ` ${ph.p2.battery}%` : ''}`);
  } else parts.push(`<b>${ph.mode === 'webcam' ? 'webcam' : ph.mode === 'mouse' ? 'mouse e tastiera' : '—'}</b>`);
  $('#player').innerHTML = `Telefono del giocatore: ${parts.join(' · ')}`;
  const cmds = st.cmds || {};
  for (const b of document.querySelectorAll('[data-c]')){
    const v = cmds[b.dataset.c], on = v === 1 || v === true;
    b.classList.toggle('off', !on);
    b.setAttribute('aria-disabled', String(!on));
    const small = b.querySelector('small');
    const label = st.labels?.[b.dataset.c];
    if (label){ const t = b.querySelector('b') || b.querySelector('span'); if (t && t.textContent !== label) t.textContent = label; }
    if (small && b.dataset.c !== 'back') small.textContent = on ? (st.hints?.[b.dataset.c] || '') : (typeof v === 'string' ? v : '');
    b.title = on ? '' : (typeof v === 'string' ? v : 'Non adesso');
  }
}
for (const b of document.querySelectorAll('[data-c]')) b.addEventListener('click', () => {
  const c = b.dataset.c, v = R.status?.cmds?.[c];
  show($('#confirm'), false); confirmCmd = null;
  // spento: si dice perché (e non si manda niente)
  if (R.status && v !== 1 && v !== true){ msg(typeof v === 'string' ? v : 'Non adesso.', true); navigator.vibrate?.([10, 40, 10]); return; }
  send(c);
});
$('#confirmYes').addEventListener('click', () => { const c = confirmCmd; confirmCmd = null; show($('#confirm'), false); if (c) send(c, { y: 1 }); });
$('#confirmNo').addEventListener('click', () => { confirmCmd = null; show($('#confirm'), false); msg('Annullato.'); });
$('#codeGo').addEventListener('click', () => {
  const code = normalizeCode($('#code').value);
  if (!code){ msg('Il codice ha 8 lettere e cifre, come ABCD-EFGH.', true); return; }
  codeTry = code; codeTries = 0; R.tries = 0; $('#code').value = showCode(code); connect();
});
$('#code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#codeGo').click(); });
$('#unpair').addEventListener('click', () => {
  if (!confirm('Questo telefono non sarà più il telecomando. Per usarlo di nuovo servirà il QR dello staff. Continuare?')) return;
  saved = null; store.clear(); drop(); setLink('unpaired', 'Non abbinato');
});

// «Aggiungi a schermata Home»: su Android il browser offre l'installazione (beforeinstallprompt), su iPhone si spiega come
let installEvent = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; offerHome(); });
function offerHome(){
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let dismissed = false; try { dismissed = localStorage.getItem(REMOTE.phoneKey + '.home') === '1'; } catch {}
  if (standalone || dismissed || R.state !== 'on') return show($('#home'), false);
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  $('#home-text').textContent = installEvent ? 'Metti il telecomando sulla schermata Home: si apre con un tocco e si ricollega da solo.'
    : ios ? 'Per l’icona: tocca Condividi ⬆︎ → «Aggiungi alla schermata Home». Su iPhone l’icona ha una memoria sua: aprila e scrivi il codice dello staff una volta.'
    : 'Per l’icona: menu ⋮ del browser → «Aggiungi a schermata Home» (o «Installa app»).';
  show($('#homeGo'), !!installEvent);
  show($('#home'));
}
$('#homeGo').addEventListener('click', async () => { const e = installEvent; installEvent = null; if (!e) return; try { await e.prompt(); } catch {} show($('#home'), false); });
$('#homeX').addEventListener('click', () => { try { localStorage.setItem(REMOTE.phoneKey + '.home', '1'); } catch {} show($('#home'), false); });

// schermo che si riaccende, pagina che torna in primo piano, rete che torna: subito un tentativo (niente attese)
const kick = () => { if (document.hidden) return; if (R.state !== 'on' && R.state !== 'unpaired' && (saved?.session || codeTry)){ R.tries = 0; connect(); } };
document.addEventListener('visibilitychange', kick);
addEventListener('online', kick);
addEventListener('pageshow', e => { if (e.persisted) kick(); });
addEventListener('pagehide', () => { try { conn?.close(); } catch {} });

R.send = send; R.connect = connect;
if (saved?.session) connect(); else setLink('unpaired', 'Non abbinato');
