// Telecomando dello staff (B27), pagina del telefono: frecce, OK, Indietro e i pulsanti diretti mandati al gioco; in alto
// lo stato del gioco (pagina, punteggio, telefono del giocatore). Abbinamento una volta per tutte (remote-pairing.js,
// remote-client.js): il QR dello staff (#tc=…&k=…) o il codice scritto a mano chiedono l'abbinamento, che vale solo
// dopo «Conferma» sul computer (lo stesso numero di tre cifre qui e sul gioco); indirizzo e chiave restano in
// localStorage e a ogni apertura della pagina, dopo il riavvio del gioco o del PC, dopo un calo del Wi-Fi o con lo
// schermo che si riaccende il telefono si ricollega da solo, senza fine, provando la chiave senza mandarla.
// Non manda mai sensori né colpi: non è una racchetta.
import { LanPeer, isLanMode } from './lan-transport.js';
import { peerConfig, loadPeer, iceReady } from './link.js';
import { REMOTE, parseRemotePairing, normalizeCode, showCode, denyText } from './remote-pairing.js';
import { createRemoteClient } from './remote-client.js';
import { NATPF_BUILD } from './version.js';

const $ = s => document.querySelector(s);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const store = {
  load(){ try { return JSON.parse(localStorage.getItem(REMOTE.phoneKey) || 'null'); } catch { return null; } },
  save(v){ try { localStorage.setItem(REMOTE.phoneKey, JSON.stringify(v)); localStorage.setItem(NET_KEY, netSearch(location.search)); } catch {} },
  clear(){ try { localStorage.removeItem(REMOTE.phoneKey); } catch {} },
};
const NET_KEY = REMOTE.phoneKey + '.rete';
// parametri della rete (?lan=1 nel programma Windows, ?peer=… nelle prove) dell'indirizzo con cui il telefono è arrivato
const netSearch = search => { const q = new URLSearchParams(search || ''); const out = new URLSearchParams(); if (q.get('lan') === '1') out.set('lan', '1'); if (q.get('peer')) out.set('peer', q.get('peer')); const s = out.toString(); return s ? `?${s}` : ''; };

// i dati del QR si leggono e si tolgono subito dalla barra degli indirizzi
const fromQr = parseRemotePairing(location.hash);
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
// pagina riaperta dall'icona della schermata Home (senza parametri): quelli salvati con l'abbinamento
{ let net = ''; try { net = localStorage.getItem(NET_KEY) || ''; } catch {} if (net && !location.search) history.replaceState(null, '', location.pathname + net); }

// la rete: LAN se l'indirizzo lo dice; senza parametri (icona aperta su un iPhone non ancora abbinato) si chiede al
// computer se è il server del programma (/lan/status c'è solo lì)
async function ensureNet(){
  if (location.search) return;
  try {
    const r = await fetch('/lan/status', { cache: 'no-store' });
    if (r.ok && /json/.test(r.headers.get('content-type') || '')) history.replaceState(null, '', location.pathname + '?lan=1');
  } catch {}
}
const makePeer = async () => {
  await ensureNet();
  const Peer = isLanMode() ? LanPeer : (await Promise.all([loadPeer(), iceReady().catch(() => null)]))[0];
  return new Peer(peerConfig());
};
let confirmCmd = null, lastAck = null, forceSetup = false;
const acks = [];
const C = createRemoteClient({ store, makePeer, onChange: () => paintLink(), onStatus: st => paint(st), onAck: a => { lastAck = a; acks.push(a); if (acks.length > 20) acks.shift(); onAck(a); } });
// per le prove nel browser: stato, ultimo stato del gioco, esiti dei comandi
window.__telecomando = { get state(){ return C.state; }, get why(){ return C.why; }, get number(){ return C.number; }, get status(){ return C.status; }, get sent(){ return C.sent; },
  get ackCount(){ return C.acks; }, acks, get tries(){ return C.tries; }, get saved(){ return C.saved; }, get paired(){ return C.paired; }, send: (c, extra) => C.send(c, extra), client: C };
const ver = $('#ver'); if (ver) ver.textContent = `v ${NATPF_BUILD}`;

const LINK_TEXT = { connecting: 'Collegamento al gioco…', on: 'Collegato al gioco', unpaired: 'Non abbinato', waiting: 'Conferma sul computer', parked: 'Aperto in un’altra pagina', insecure: 'Serve https' };
function paintLink(){
  const s = C.state;
  $('#bar').className = s === 'on' ? 'ok' : s === 'unpaired' || s === 'insecure' ? 'bad' : '';
  $('#link').textContent = s === 'lost' ? (C.why ? `Scollegato: ${C.why}. Riprovo…` : 'Scollegato. Riprovo…') : s === 'connecting' && C.tries ? 'Mi ricollego al gioco…' : LINK_TEXT[s] || s;
  show($('#wait'), s === 'waiting');
  if (s === 'waiting') $('#wait-num').textContent = String(C.number);
  show($('#parked'), s === 'parked');
  if (s === 'on' || s === 'waiting') forceSetup = false;
  const setup = s === 'unpaired' || s === 'insecure' || (!C.paired && s !== 'waiting') || (forceSetup && s !== 'waiting' && s !== 'parked');
  show($('#setup'), setup);
  show($('#remote'), C.paired && !setup && s !== 'waiting' && s !== 'parked');
  show($('#unpair'), C.paired);
  if ((s === 'unpaired' || forceSetup) && ['bye', 'code', 'closed', 'refused', 'busy', 'expired', 'denied', 'unpaired', 'role'].includes(C.why)) $('#setup-why').textContent = C.why === 'bye' ? 'Il gioco ha scollegato questo telecomando (pannello dello stand, o un altro telefono abbinato al suo posto).'
    : C.why === 'code' ? 'Codice non trovato: controlla di averlo scritto bene, con il foglio «Telecomando dello staff» aperto sul gioco.' : denyText(C.why);
  if (s === 'insecure') $('#setup-why').textContent = 'Questa pagina non è aperta in https: il telecomando non può riprendere il collegamento in sicurezza. Inquadra di nuovo il QR dello staff.';
  // il gioco non si trova da un po': forse è spento, forse questo telefono è stato sostituito (l'indirizzo è cambiato)
  show($('#stale'), C.paired && s !== 'on' && s !== 'waiting' && C.tries >= 5 && !forceSetup);
  $('#where').textContent = location.host;
  if (s === 'on') offerHome(); else show($('#home'), false);
}
function send(c, extra = {}){
  if (!C.send(c, extra)){ msg('Non collegato al gioco: aspetta che si ricolleghi.', true); return false; }
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
  const c = b.dataset.c, v = C.status?.cmds?.[c];
  show($('#confirm'), false); confirmCmd = null;
  // spento: si dice perché (e non si manda niente)
  if (C.status && v !== 1 && v !== true){ msg(typeof v === 'string' ? v : 'Non adesso.', true); navigator.vibrate?.([10, 40, 10]); return; }
  send(c);
});
$('#confirmYes').addEventListener('click', () => { const c = confirmCmd; confirmCmd = null; show($('#confirm'), false); if (c) send(c, { y: 1 }); });
$('#confirmNo').addEventListener('click', () => { confirmCmd = null; show($('#confirm'), false); msg('Annullato.'); });
$('#codeGo').addEventListener('click', () => {
  const code = normalizeCode($('#code').value);
  if (!code){ $('#setup-why').textContent = 'Il codice ha 8 lettere e cifre, come ABCD-EFGH.'; return; }
  $('#code').value = showCode(code);
  C.pairCode(code);
});
$('#code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#codeGo').click(); });
// «Non usare più questo telefono»: due tocchi (niente finestre del browser)
let unpairT = null;
$('#unpair').addEventListener('click', e => {
  const b = e.currentTarget;
  if (b.dataset.armed !== '1'){ b.dataset.armed = '1'; b.textContent = 'Tocca ancora per togliere il telecomando da questo telefono'; clearTimeout(unpairT); unpairT = setTimeout(() => { b.dataset.armed = ''; b.textContent = 'Non usare più questo telefono'; }, 4000); return; }
  clearTimeout(unpairT); b.dataset.armed = ''; b.textContent = 'Non usare più questo telefono';
  C.forget();
});
// la stessa chiave aperta in un'altra pagina: si riprende qui con un tocco (l'altra si ferma)
$('#parked').addEventListener('click', () => C.start());
// telefono forse sostituito: si mostra l'abbinamento (QR o codice). La chiave di prima resta finché un abbinamento nuovo
// non è confermato: se il gioco era solo spento, alla riaccensione il telefono rientra da solo
$('#staleGo').addEventListener('click', () => { forceSetup = true; $('#setup-why').textContent = 'Inquadra il QR dello staff, oppure scrivi qui il codice sotto il QR. Vale dopo «Conferma» sul computer.'; paintLink(); });
// iPhone in Safari con il QR: conviene abbinare l'icona della schermata Home (ha una memoria sua), non questa scheda
$('#iosHere').addEventListener('click', () => { show($('#ios'), false); if (fromQr) C.pair(fromQr); });

// «Aggiungi a schermata Home»: su Android il browser offre l'installazione (beforeinstallprompt), su iPhone si spiega come
let installEvent = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; if (C.state === 'on') offerHome(); });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
function offerHome(){
  let dismissed = false; try { dismissed = localStorage.getItem(REMOTE.phoneKey + '.home') === '1'; } catch {}
  if (standalone() || dismissed || C.state !== 'on') return show($('#home'), false);
  $('#home-text').textContent = installEvent ? 'Metti il telecomando sulla schermata Home: si apre con un tocco e si ricollega da solo.'
    : ios() ? 'Su iPhone l’icona della schermata Home ha una memoria sua: Condividi ⬆︎ → «Aggiungi alla schermata Home», poi apri l’icona e abbinala con il codice dello staff (sul computer: «Abbina un altro telefono»).'
    : 'Per l’icona: menu ⋮ del browser → «Aggiungi a schermata Home» (o «Installa app»).';
  show($('#homeGo'), !!installEvent);
  show($('#home'));
}
$('#homeGo').addEventListener('click', async () => { const e = installEvent; installEvent = null; if (!e) return; try { await e.prompt(); } catch {} show($('#home'), false); });
$('#homeX').addEventListener('click', () => { try { localStorage.setItem(REMOTE.phoneKey + '.home', '1'); } catch {} show($('#home'), false); });

// schermo che si riaccende, pagina che torna in primo piano, rete che torna: subito un tentativo (niente attese)
const kick = () => { if (!document.hidden) C.kick(); };
document.addEventListener('visibilitychange', kick);
addEventListener('online', kick);
addEventListener('pageshow', e => { if (e.persisted) kick(); });
addEventListener('pagehide', () => C.close());

// QR inquadrato con la pagina già aperta: il browser cambia solo la parte dopo il «#», senza ricaricare la pagina
addEventListener('hashchange', () => {
  const q = parseRemotePairing(location.hash);
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (q){ show($('#ios'), false); C.pair(q); }
});

paintLink();
if (fromQr && ios() && !standalone()) show($('#ios'));      // su iPhone si sceglie: icona (consigliato) o questa scheda
else if (fromQr) C.pair(fromQr);
else C.start();
